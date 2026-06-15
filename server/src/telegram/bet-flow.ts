/**
 * Telegram /bet flow — chốt vé qua inline keyboard.
 *
 * State machine 4 bước:
 *   1. match  — chọn trận (từ subscriptions của user)
 *   2. type   — chọn loại kèo (Tài/Xỉu/Đội nhà/Đội khách dựa trên snapshot kèo gần nhất)
 *   3. stake  — chọn stake (50/100/200/500/1000 hoặc nhập tay)
 *   4. confirm — xem card xác nhận → Vào kèo / Hủy
 *
 * Mỗi chat chỉ giữ 1 draft; gọi /bet lại sẽ reset.
 *
 * Drafts auto-expire sau 10 phút. Cleanup interval mỗi 60s.
 *
 * Snapshot kèo được "lock" tại bước chọn trận — confirm sau đó dùng giá cũ
 * để tránh user thấy giá A nhưng lúc bấm confirm lại bị thay bằng giá B.
 */
import { v4 as uuidv4 } from 'uuid';
import type { OddsMonitor } from '../odds-monitor/monitor.js';
import type { TelegramSender, InlineKeyboardMarkup, InlineKeyboardButton } from '../notification-service/telegram-sender.js';
import type { OddsSnapshot, OddsSubscription } from '../ai-assistant-core/types.js';
import { logBetEntry, type BetLogPayload, type BetLogResult } from '../services/bet-logger.js';
import { logger } from '../logger.js';

/** Loại kèo V1 — chỉ full-match. H1 follow-up. */
export type FlowBetType = 'over' | 'under' | 'home' | 'away';

export type BetDraftStep = 'match' | 'type' | 'stake' | 'custom_stake' | 'confirm';

export interface BetDraft {
  chatId: number;
  /** App userId đã bind, hoặc fallback `tg_<chatId>`. */
  userId: string;
  step: BetDraftStep;
  /** UUID lock từ đầu để retry/idempotent ổn định kể cả khi reload. */
  betId: string;
  matchId?: string;
  matchName?: string;
  leagueName?: string;
  /** Snapshot lock tại lúc user chọn trận. */
  snapshot?: OddsSnapshot;
  /** Snapshot stale flag — minute < 5p so với last lúc chọn. */
  snapshotMinute?: number;
  betType?: FlowBetType;
  /** Line chuẩn hoá theo loại kèo (e.g. "2.5", "-0.5"). */
  handicapLabel?: string;
  /** Giá decimal khoá tại lúc chọn type. */
  odds?: number;
  stake?: number;
  createdAt: number;
  updatedAt: number;
}

export const DRAFT_TTL_MS = 10 * 60 * 1000;
const STAKE_PRESETS = [50, 100, 200, 500, 1000];

/**
 * Trùng `cleanupStaleSubscriptions` trong OddsMonitor: phút trận >= này → coi đã kết thúc,
 * không hiển thị trong /bet.
 */
export const LIVE_BET_FINISHED_MINUTE = 120;

/**
 * Push kèo từ web cách đây quá lâu → coi không còn live (tab đóng / trận xong không còn cập nhật).
 */
export const LIVE_BET_MAX_SILENCE_MS = 45 * 60 * 1000;

export type OddsMonitorBetPick = Pick<OddsMonitor, 'getLastOddsSnapshot' | 'getLastOddsPushAt'>;

/**
 * Trận đủ điều kiện vào kèo qua Telegram: có snapshot, phút < FT threshold,
 * và feed vừa được cập nhật (user đang mở trận trên web).
 */
export function isMatchLiveForBet(
  monitor: OddsMonitorBetPick,
  matchId: string,
  nowMs: number = Date.now(),
): boolean {
  const snap = monitor.getLastOddsSnapshot(matchId);
  if (!snap) return false;
  const minute = snap.minute;
  if (typeof minute !== 'number' || !Number.isFinite(minute) || minute >= LIVE_BET_FINISHED_MINUTE) {
    return false;
  }
  const lastPush = monitor.getLastOddsPushAt(matchId);
  if (lastPush === undefined) return false;
  if (nowMs - lastPush > LIVE_BET_MAX_SILENCE_MS) return false;
  return true;
}

const BET_TYPE_LABELS: Record<FlowBetType, string> = {
  over: 'Tài',
  under: 'Xỉu',
  home: 'Đội nhà',
  away: 'Đội khách',
};

/** ---- Pure helpers (testable) ---- */

/**
 * Parse stake input từ text user: "100" / "100k" / "1.5tr" / "1,5tr".
 * `k` = ×1000, `tr` = ×1_000_000. Trả về `null` nếu không hợp lệ hoặc <=0.
 */
export function parseStake(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, '.');
  // Cho phép: "100", "100k", "1.5tr", "1.5m"
  const m = trimmed.match(/^(\d+(?:\.\d+)?)(k|tr|m)?$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  const unit = m[2];
  let multiplier = 1;
  if (unit === 'k') multiplier = 1_000;
  else if (unit === 'tr' || unit === 'm') multiplier = 1_000_000;
  const value = num * multiplier;
  if (value > 1e10) return null; // Sanity cap
  return Math.round(value);
}

/** Định dạng line theo loại kèo, áp dụng đảo dấu cho `away`. */
export function formatHandicapLabel(betType: FlowBetType, snapshot: OddsSnapshot): string {
  if (betType === 'over' || betType === 'under') {
    const h = snapshot.handicap;
    return Number.isFinite(h) ? String(h) : '?';
  }
  // home/away → dùng handicapAH; nếu thiếu thì fallback về handicap.
  const raw = snapshot.handicapAH ?? snapshot.handicap;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return '?';
  if (betType === 'home') {
    return raw === 0 ? '0' : raw > 0 ? `+${raw.toFixed(2)}` : raw.toFixed(2);
  }
  // away — đảo dấu
  if (raw === 0) return '0';
  const inv = -raw;
  return inv > 0 ? `+${inv.toFixed(2)}` : inv.toFixed(2);
}

/** Lấy odds cho loại kèo. Trả về undefined nếu snapshot thiếu giá đó. */
export function pickOdds(betType: FlowBetType, snapshot: OddsSnapshot): number | undefined {
  switch (betType) {
    case 'over': return snapshot.overOdds;
    case 'under': return snapshot.underOdds;
    case 'home': return snapshot.homeOdds;
    case 'away': return snapshot.awayOdds;
  }
}

/**
 * Build inline KB chọn loại kèo. Chỉ render nút khi snapshot có odds tương ứng.
 * Trả về mảng rỗng nếu không có loại kèo nào khả dụng.
 */
export function buildBetTypeKeyboard(snapshot: OddsSnapshot): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [];
  const ouRow: InlineKeyboardButton[] = [];
  const ahRow: InlineKeyboardButton[] = [];

  if (typeof snapshot.overOdds === 'number') {
    ouRow.push({
      text: `📈 Tài ${formatHandicapLabel('over', snapshot)} @${snapshot.overOdds.toFixed(2)}`,
      callback_data: 'bet:t:over',
    });
  }
  if (typeof snapshot.underOdds === 'number') {
    ouRow.push({
      text: `📉 Xỉu ${formatHandicapLabel('under', snapshot)} @${snapshot.underOdds.toFixed(2)}`,
      callback_data: 'bet:t:under',
    });
  }
  if (typeof snapshot.homeOdds === 'number') {
    ahRow.push({
      text: `🏠 Chủ ${formatHandicapLabel('home', snapshot)} @${snapshot.homeOdds.toFixed(2)}`,
      callback_data: 'bet:t:home',
    });
  }
  if (typeof snapshot.awayOdds === 'number') {
    ahRow.push({
      text: `✈️ Khách ${formatHandicapLabel('away', snapshot)} @${snapshot.awayOdds.toFixed(2)}`,
      callback_data: 'bet:t:away',
    });
  }

  if (ouRow.length > 0) rows.push(ouRow);
  if (ahRow.length > 0) rows.push(ahRow);
  rows.push([{ text: '❌ Hủy', callback_data: 'bet:c:no' }]);
  return rows;
}

/**
 * Build payload cho Sheet từ draft + subscription.
 * Tách ra để dễ test.
 */
export function buildBetLogPayload(draft: BetDraft): BetLogPayload {
  if (!draft.matchId || !draft.matchName || !draft.betType || !draft.snapshot || draft.stake === undefined || draft.odds === undefined) {
    throw new Error('Draft chưa đủ thông tin để build payload');
  }

  const [doiNha, doiKhach] = parseTeamsFromMatchName(draft.matchName);
  const keoVao = `${BET_TYPE_LABELS[draft.betType]} ${draft.handicapLabel ?? ''}`.trim();
  const score = draft.snapshot.score || 'N/A';
  const minute = draft.snapshot.minute;

  return {
    betId: draft.betId,
    giaiDau: draft.leagueName || 'N/A',
    doiNha,
    doiKhach,
    tySoLucVaoKeo: score,
    keoVao,
    phut: minute,
    tyLeAn: draft.odds,
    soTienCuoc: draft.stake,
    note: `[via Telegram] line=${draft.handicapLabel ?? '?'} odds=${draft.odds.toFixed(2)} minute=${minute} score=${score}`,
  };
}

/** Tách "Home vs Away" → ["Home", "Away"]. Fallback khi format khác. */
export function parseTeamsFromMatchName(matchName: string): [string, string] {
  const m = matchName.split(/\s+vs\s+/i);
  if (m.length === 2 && m[0].trim() && m[1].trim()) {
    return [m[0].trim(), m[1].trim()];
  }
  return [matchName, ''];
}

/** ---- Store ---- */

export class BetDraftStore {
  private drafts = new Map<number, BetDraft>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  startCleanup(intervalMs = 60_000): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), intervalMs);
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  get(chatId: number): BetDraft | undefined {
    const d = this.drafts.get(chatId);
    if (!d) return undefined;
    if (Date.now() - d.updatedAt > DRAFT_TTL_MS) {
      this.drafts.delete(chatId);
      return undefined;
    }
    return d;
  }

  set(chatId: number, draft: BetDraft): void {
    this.drafts.set(chatId, { ...draft, updatedAt: Date.now() });
  }

  update(chatId: number, patch: Partial<BetDraft>): BetDraft | undefined {
    const cur = this.get(chatId);
    if (!cur) return undefined;
    const next: BetDraft = { ...cur, ...patch, updatedAt: Date.now() };
    this.drafts.set(chatId, next);
    return next;
  }

  delete(chatId: number): void {
    this.drafts.delete(chatId);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [chatId, d] of this.drafts.entries()) {
      if (now - d.updatedAt > DRAFT_TTL_MS) {
        this.drafts.delete(chatId);
        logger.info(`[bet-flow] Draft expired for chat ${chatId}`);
      }
    }
  }

  size(): number {
    return this.drafts.size;
  }
}

/** ---- Controller (wires deps) ---- */

export interface BetFlowReply {
  text: string;
  replyMarkup?: InlineKeyboardMarkup;
  /** Gửi tin sau (ví dụ thông báo thành công sau khi gửi card). */
  followUpText?: string;
}

export interface BetFlowDeps {
  oddsMonitor: OddsMonitor;
  telegramSender: TelegramSender;
  store: BetDraftStore;
  /** Override để test. */
  logBet?: (payload: BetLogPayload) => Promise<BetLogResult>;
}

export class BetFlowController {
  private oddsMonitor: OddsMonitor;
  private telegramSender: TelegramSender;
  private store: BetDraftStore;
  private logBet: (payload: BetLogPayload) => Promise<BetLogResult>;

  constructor(deps: BetFlowDeps) {
    this.oddsMonitor = deps.oddsMonitor;
    this.telegramSender = deps.telegramSender;
    this.store = deps.store;
    this.logBet = deps.logBet || logBetEntry;
  }

  /** Bắt đầu /bet — render danh sách trận đang theo dõi. */
  startBetFlow(chatId: number): BetFlowReply {
    const userId = this.telegramSender.getUserIdByChatId(chatId);
    if (!userId) {
      return {
        text: [
          '❌ Bạn chưa liên kết tài khoản.',
          '',
          'Vào web app → mở AI Assistant → bấm "Liên kết Telegram" để lấy mã, rồi gửi `/bind <mã>` ở đây.',
        ].join('\n'),
      };
    }

    const subs = this.oddsMonitor.getSubscriptions(userId).filter((s) => s.active);
    if (subs.length === 0) {
      return {
        text: [
          '📋 Bạn chưa theo dõi trận nào.',
          '',
          'Vào web app, theo dõi 1 trận đang live, rồi quay lại gõ /bet.',
        ].join('\n'),
      };
    }

    const liveSubs = subs.filter((s) => isMatchLiveForBet(this.oddsMonitor, s.matchId));
    if (liveSubs.length === 0) {
      return {
        text: [
          '📡 *Không có trận live nào đủ điều kiện vào kèo.*',
          '',
          'Chỉ hiện trận khi đủ *cả hai* điều sau:',
          `• *Feed kèo còn mới* — mở trận trên web app để polling chạy (cập nhật trong ~${Math.round(LIVE_BET_MAX_SILENCE_MS / 60_000)} phút gần nhất).`,
          `• *Trận chưa kết thúc* — phút trận < ${LIVE_BET_FINISHED_MINUTE} trên snapshot gần nhất.`,
          '',
          'Các trận đã xong hoặc bạn đã tắt tab vẫn có thể nằm trong danh sách theo dõi — dùng `/clean` để dọn, rồi mở lại trận *đang đá* và gõ `/bet`.',
        ].join('\n'),
      };
    }

    // Khởi tạo draft mới (reset draft cũ nếu có)
    const draft: BetDraft = {
      chatId,
      userId,
      step: 'match',
      betId: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.store.set(chatId, draft);

    const keyboard = this.buildMatchKeyboard(liveSubs);
    return {
      text: [
        '🎫 *Vào kèo qua Telegram*',
        '',
        '_Chỉ trận đang có feed live từ web._',
        '',
        'Chọn trận bạn muốn vào kèo:',
      ].join('\n'),
      replyMarkup: { inline_keyboard: keyboard },
    };
  }

  /**
   * Xử lý callback từ inline KB. Trả về BetFlowReply hoặc null nếu không phải bet flow.
   * Side-effect: gửi tin nhắn (caller chịu trách nhiệm).
   */
  async handleCallback(chatId: number, data: string): Promise<BetFlowReply | null> {
    if (!data.startsWith('bet:')) return null;
    const parts = data.split(':');
    const action = parts[1];
    const arg = parts.slice(2).join(':'); // matchId có thể chứa ':'

    if (action === 'c' && arg === 'no') {
      this.store.delete(chatId);
      return { text: '❌ Đã hủy.' };
    }

    const draft = this.store.get(chatId);
    if (!draft) {
      return {
        text: '⏰ Phiên đã hết hạn. Gõ /bet để bắt đầu lại.',
      };
    }

    switch (action) {
      case 'm': return this.handlePickMatch(draft, arg);
      case 't': return this.handlePickType(draft, arg);
      case 's': return this.handlePickStake(draft, arg);
      case 'c':
        if (arg === 'ok') return this.handleConfirm(draft);
        return { text: '⚠️ Lệnh không hỗ trợ.' };
      default:
        return { text: '⚠️ Lệnh không hỗ trợ.' };
    }
  }

  /** Khi user gõ text → gọi method này. Trả null nếu không có draft cần custom stake. */
  async handleCustomStakeText(chatId: number, text: string): Promise<BetFlowReply | null> {
    const draft = this.store.get(chatId);
    if (!draft || draft.step !== 'custom_stake') return null;

    const stake = parseStake(text);
    if (stake === null) {
      return {
        text: '⚠️ Số tiền không hợp lệ. Gõ lại (vd: `100`, `100k`, `1.5tr`).',
      };
    }
    return this.completeStake(draft, stake);
  }

  /** ---- Step handlers ---- */

  private handlePickMatch(draft: BetDraft, matchId: string): BetFlowReply {
    if (!matchId) return { text: '⚠️ Thiếu matchId.' };

    const subs = this.oddsMonitor.getSubscriptions(draft.userId).filter((s) => s.active);
    const sub = subs.find((s) => s.matchId === matchId);
    if (!sub) {
      return { text: '⚠️ Không tìm thấy trận trong danh sách theo dõi của bạn. Gõ /bet để bắt đầu lại.' };
    }

    if (!isMatchLiveForBet(this.oddsMonitor, matchId)) {
      return {
        text: [
          '⚠️ Trận này *không còn coi là live* (hết trận hoặc lâu không có cập nhật kèo từ web).',
          '',
          'Mở lại trận đang đá trên web app rồi gõ `/bet` để chọn trận mới.',
        ].join('\n'),
      };
    }

    const snapshot = this.oddsMonitor.getLastOddsSnapshot(matchId);
    if (!snapshot) {
      return {
        text: [
          `⚠️ Chưa có dữ liệu kèo cho trận *${escapeMd(sub.matchName)}*.`,
          'Vui lòng đợi thêm hoặc kiểm tra trên web app.',
        ].join('\n'),
      };
    }

    const types = buildBetTypeKeyboard(snapshot);
    const hasAnyOdds = types.length > 1; // Luôn có hàng "Hủy" → > 1 nghĩa là có ít nhất 1 nút type
    if (!hasAnyOdds) {
      return {
        text: '⚠️ Snapshot kèo không có giá nào khả dụng. Thử lại sau khi feed cập nhật.',
      };
    }

    this.store.update(draft.chatId, {
      step: 'type',
      matchId: sub.matchId,
      matchName: sub.matchName,
      leagueName: sub.leagueName,
      snapshot,
      snapshotMinute: snapshot.minute,
    });

    const stale = isSnapshotStale(this.oddsMonitor, matchId);
    const lines = [
      `🎫 *${escapeMd(sub.matchName)}*`,
      sub.leagueName ? `🏆 ${escapeMd(sub.leagueName)}` : '',
      `📍 Tỷ số: *${escapeMd(snapshot.score || 'N/A')}* | Phút *${snapshot.minute}'*`,
      stale ? '⚠️ _Dữ liệu kèo có thể cũ — kiểm tra giá trước khi xác nhận._' : '',
      '',
      'Chọn loại kèo:',
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      replyMarkup: { inline_keyboard: types },
    };
  }

  private handlePickType(draft: BetDraft, betTypeArg: string): BetFlowReply {
    if (!draft.snapshot) {
      return { text: '⚠️ Phiên thiếu snapshot. Gõ /bet để bắt đầu lại.' };
    }
    if (!isFlowBetType(betTypeArg)) {
      return { text: '⚠️ Loại kèo không hỗ trợ.' };
    }
    const odds = pickOdds(betTypeArg, draft.snapshot);
    if (odds === undefined) {
      return { text: '⚠️ Snapshot không có giá cho loại kèo này. Thử loại khác.' };
    }

    const handicapLabel = formatHandicapLabel(betTypeArg, draft.snapshot);
    this.store.update(draft.chatId, {
      step: 'stake',
      betType: betTypeArg,
      handicapLabel,
      odds,
    });

    const text = [
      `🎫 *${escapeMd(draft.matchName ?? '')}*`,
      `💰 *${BET_TYPE_LABELS[betTypeArg]} ${handicapLabel} @${odds.toFixed(2)}*`,
      '',
      'Chọn mức stake (đơn vị tuỳ bạn):',
    ].join('\n');

    const stakeRow1: InlineKeyboardButton[] = STAKE_PRESETS.slice(0, 3).map((v) => ({
      text: String(v),
      callback_data: `bet:s:${v}`,
    }));
    const stakeRow2: InlineKeyboardButton[] = STAKE_PRESETS.slice(3).map((v) => ({
      text: String(v),
      callback_data: `bet:s:${v}`,
    }));
    const customRow: InlineKeyboardButton[] = [
      { text: '✏️ Tự nhập', callback_data: 'bet:s:custom' },
      { text: '❌ Hủy', callback_data: 'bet:c:no' },
    ];

    return {
      text,
      replyMarkup: { inline_keyboard: [stakeRow1, stakeRow2, customRow] },
    };
  }

  private handlePickStake(draft: BetDraft, stakeArg: string): BetFlowReply {
    if (stakeArg === 'custom') {
      this.store.update(draft.chatId, { step: 'custom_stake' });
      return {
        text: '✏️ Vui lòng *gõ số tiền* (vd: `100`, `100k`, `1.5tr`):',
      };
    }
    const stake = parseStake(stakeArg);
    if (stake === null) {
      return { text: '⚠️ Stake không hợp lệ.' };
    }
    return this.completeStake(draft, stake);
  }

  private completeStake(draft: BetDraft, stake: number): BetFlowReply {
    if (!draft.betType || !draft.snapshot || draft.odds === undefined) {
      return { text: '⚠️ Phiên chưa đủ thông tin. Gõ /bet để bắt đầu lại.' };
    }
    this.store.update(draft.chatId, {
      step: 'confirm',
      stake,
    });

    const handicapLabel = draft.handicapLabel ?? '';
    const text = [
      '🎫 *VÉ CHUẨN BỊ VÀO KÈO*',
      draft.leagueName ? `🏆 ${escapeMd(draft.leagueName)}` : '',
      `⚽ *${escapeMd(draft.matchName ?? '')}*`,
      `📍 Tỷ số: *${escapeMd(draft.snapshot.score || 'N/A')}* | Phút *${draft.snapshot.minute}'*`,
      '',
      `💰 *${BET_TYPE_LABELS[draft.betType]} ${handicapLabel} @${draft.odds.toFixed(2)}*`,
      `💵 Stake: *${stake.toLocaleString('vi-VN')}*`,
      '',
      'Xác nhận vào kèo?',
    ].filter(Boolean).join('\n');

    return {
      text,
      replyMarkup: {
        inline_keyboard: [[
          { text: '✅ Vào kèo', callback_data: 'bet:c:ok' },
          { text: '❌ Hủy', callback_data: 'bet:c:no' },
        ]],
      },
    };
  }

  private async handleConfirm(draft: BetDraft): Promise<BetFlowReply> {
    if (draft.step !== 'confirm') {
      return { text: '⚠️ Phiên chưa sẵn sàng để xác nhận.' };
    }
    let payload: BetLogPayload;
    try {
      payload = buildBetLogPayload(draft);
    } catch (err) {
      logger.error('[bet-flow] build payload failed', err);
      return { text: '⚠️ Phiên thiếu dữ liệu — vui lòng /bet lại.' };
    }

    const result = await this.logBet(payload);
    this.store.delete(draft.chatId);

    if (!result.ok) {
      const hint = result.code === 'disabled'
        ? '\n💡 Google Sheets chưa được cấu hình trên server.'
        : result.code === 'invalid'
          ? '\n💡 Dữ liệu không hợp lệ.'
          : '\n💡 Lỗi Sheets API — thử lại sau hoặc chốt vé từ web app.';
      return {
        text: `❌ Không ghi được vé.\n_${escapeMd(result.error)}_${hint}`,
      };
    }

    const dedupedNote = result.deduped
      ? '\n_Vé này đã có sẵn trên Sheet (idempotent), không tạo dòng mới._'
      : '';
    return {
      text: [
        `✅ *Đã vào kèo!*`,
        `🆔 betId: \`${result.betId}\``,
        `📄 Sheet row: *${result.rowIndex || '?'}*`,
        '',
        '_Vé sẽ được cập nhật ket\\_qua khi bạn chốt kết quả trên web app._',
        dedupedNote,
      ].filter(Boolean).join('\n'),
    };
  }

  /** ---- Keyboards ---- */

  private buildMatchKeyboard(subs: OddsSubscription[]): InlineKeyboardButton[][] {
    // Tối đa 8 trận để tránh tin quá dài; user theo nhiều hơn thì cắt.
    const top = subs.slice(0, 8);
    const rows = top.map((s) => [{
      text: trimText(`⚽ ${s.matchName}${s.leagueName ? ` · ${s.leagueName}` : ''}`, 64),
      callback_data: `bet:m:${s.matchId}`,
    }]);
    rows.push([{ text: '❌ Hủy', callback_data: 'bet:c:no' }]);
    return rows;
  }
}

/** ---- Internal utilities ---- */

function isFlowBetType(s: string): s is FlowBetType {
  return s === 'over' || s === 'under' || s === 'home' || s === 'away';
}

function trimText(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function escapeMd(text: string): string {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\').replace(/([_*`\[])/g, '\\$1');
}

/** Heuristic snapshot stale: snapshot.minute < phút thực tế "hiện tại" — ta không có time so monitor lastChecked. */
function isSnapshotStale(monitor: OddsMonitor, matchId: string): boolean {
  // Đơn giản: nếu không có history hoặc history cũ hơn 5 phút (so với now ↔ lastChecked) → stale.
  // OddsMonitor expose getOddsHistory; ta lấy lastChecked qua getMonitoredMatches gián tiếp không có sẵn,
  // → dùng monitor.getOddsHistory(matchId) để biết có dữ liệu fresh không.
  const history = monitor.getOddsHistory(matchId);
  if (history.length === 0) return true;
  // Không có timestamp trong snapshot → không thể chắc chắn; trả false (không cảnh báo nhầm).
  return false;
}
