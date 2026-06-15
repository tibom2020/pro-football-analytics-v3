import { OddsAlert, BetEvaluation, OddsSnapshot } from '../ai-assistant-core/types.js';
import { logger } from '../index.js';

interface TelegramBotLike {
  sendMessage(chatId: number | string, text: string, options?: Record<string, unknown>): Promise<unknown>;
}

/** Inline keyboard markup tối thiểu — khớp Telegram Bot API. */
export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/** Ngữ cảnh từ app (lần push kèo gần nhất) — dùng cho tin CẢNH BÁO KÈO. */
export interface OddsAlertTelegramExtras {
  leagueName?: string;
  snapshot?: OddsSnapshot;
  score?: string;
  perTeamApiLines?: string[];
  statsLines?: string[];
  pressureBellHistoryMinutes?: string;
  ouDropIntensityHistoryMinutes?: string;
}

export interface NhatKyAlertPayload {
  /** Thời điểm hiển thị (thường = alert.timestamp client, ms). */
  eventTimeMs: number;
  leagueLine: string;
  matchLine: string;
  score: string;
  minute: number;
  oddsLines: string[];
  statsLines: string[];
  /** Dòng 1: điểm API 2 đội; tiếp theo chi tiết. */
  perTeamApiLines?: string[];
  /** Tài/Xỉu + chấp, nhãn 2 đội. */
  oddsTwoTeamLines?: string[];
  /** Chuỗi phút chuông báo động (áp lực). */
  pressureBellHistoryMinutes?: string;
  /** Chuỗi phút cường độ giảm giá OU. */
  ouDropIntensityHistoryMinutes?: string;
  alertTitle: string;
  alertMessage: string;
  alertType: string;
  /** Mặc định: NHẬT KÝ CẢNH BÁO — dùng cho cập nhật theo dõi / thử Telegram. */
  headerLabel?: string;
}

function formatTimestampGmt7(ms: number): string {
  const s = new Date(ms).toLocaleString('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${s.replace(' ', ' ')} GMT+7`;
}

function formatSnapshotLines(s: OddsSnapshot): string[] {
  const lines: string[] = [];
  const h = s.handicap;
  const hLabel = typeof h === 'number' && Number.isFinite(h) ? h.toFixed(2) : '?';
  if (s.overOdds != null || s.underOdds != null) {
    const ou = [s.overOdds != null ? `Tài @${s.overOdds.toFixed(2)}` : null, s.underOdds != null ? `Xỉu @${s.underOdds.toFixed(2)}` : null]
      .filter(Boolean)
      .join(' | ');
    lines.push(`• Tài/Xỉu H${hLabel}: ${ou}`);
  }
  if (s.homeOdds != null || s.awayOdds != null) {
    const ah = [s.homeOdds != null ? `Chủ @${s.homeOdds.toFixed(2)}` : null, s.awayOdds != null ? `Khách @${s.awayOdds.toFixed(2)}` : null]
      .filter(Boolean)
      .join(' | ');
    // Use the handicapAH line from the snapshot if available, fallback to handicap (OU) if missing
    const ahLine = typeof s.handicapAH === 'number' ? s.handicapAH.toFixed(2) : (typeof s.handicap === 'number' ? s.handicap.toFixed(2) : '0');
    lines.push(`• Chấp ${ahLine}: ${ah}`);
  }
  return lines;
}

/**
 * Telegram message formatter and sender.
 * Separated from bot logic to allow independent notification dispatch.
 */
export class TelegramSender {
  private bot: TelegramBotLike | null = null;
  private userChatMap = new Map<string, number>(); // userId -> chatId

  setBot(bot: TelegramBotLike): void {
    this.bot = bot;
  }

  bindUser(userId: string, chatId: number): void {
    this.userChatMap.set(userId, chatId);
    logger.info(`Telegram user bound: ${userId} -> chat ${chatId}`);
  }

  unbindUser(userId: string): void {
    this.userChatMap.delete(userId);
  }

  getUserChatId(userId: string): number | undefined {
    return this.userChatMap.get(userId);
  }

  /** Gửi Markdown tới user đã bind (Live Agent, thông báo lệnh). */
  async sendMarkdownToUser(userId: string, text: string): Promise<boolean> {
    const chatId = this.userChatMap.get(userId);
    if (!chatId || !this.bot) return false;
    return this.sendMessageWithRetry(chatId, text);
  }

  /** Reverse lookup: tìm app userId theo chatId (dùng khi bot xử lý callback). */
  getUserIdByChatId(chatId: number): string | undefined {
    for (const [userId, mapped] of this.userChatMap.entries()) {
      if (mapped === chatId) return userId;
    }
    return undefined;
  }

  isUserBound(userId: string): boolean {
    return this.userChatMap.has(userId);
  }

  getBindings(): Record<string, number> {
    return Object.fromEntries(this.userChatMap);
  }

  setBindings(bindings: Record<string, number>): void {
    this.userChatMap = new Map(Object.entries(bindings));
  }

  async sendAlertToUser(userId: string, alert: OddsAlert, extras?: OddsAlertTelegramExtras): Promise<boolean> {
    const chatId = this.userChatMap.get(userId);
    if (!chatId || !this.bot) return false;

    const emoji = alert.alertType === 'odds_drop' ? '📉'
      : alert.alertType === 'line_change' ? '🔄'
      : '⚡';

    const timeLine = formatTimestampGmt7(alert.timestamp);
    const leaguePart = extras?.leagueName ? `🏆 *${this.escapeMarkdown(extras.leagueName)}*\n` : '';
    const snapLines = extras?.snapshot ? formatSnapshotLines(extras.snapshot) : [];

    const perTeam = Array.isArray(extras?.perTeamApiLines) ? extras.perTeamApiLines.filter(Boolean) : [];
    const perTeamBlock =
      perTeam.length > 0
        ? `📡 *Chỉ số từng đội (API):*\n${perTeam.map((l) => `• ${this.escapeMarkdown(l)}`).join('\n')}`
        : '';
    const statsAgg =
      Array.isArray(extras?.statsLines) && extras.statsLines.length > 0
        ? `📊 *Chỉ số tổng hợp:*\n${extras.statsLines.map((l) => `• ${this.escapeMarkdown(l)}`).join('\n')}`
        : '';
    const bellH = (extras?.pressureBellHistoryMinutes ?? 'Chưa có').trim() || 'Chưa có';
    const ouH = (extras?.ouDropIntensityHistoryMinutes ?? 'Chưa có').trim() || 'Chưa có';
    const historyBlock = `\n🔔 *Lịch sử chuông báo động (phút):* ${this.escapeMarkdown(bellH)}\n📉 *Lịch sử cường độ giảm giá OU (phút):* ${this.escapeMarkdown(ouH)}`;

    const text = [
      `${emoji} *CẢNH BÁO KÈO*`,
      ``,
      `⏰ *${this.escapeMarkdown(timeLine)}*`,
      ``,
      leaguePart,
      `⚽ *${this.escapeMarkdown(alert.matchName)}*`,
      `📍 ${extras?.score ? `Tỷ số: *${this.escapeMarkdown(extras.score)}* | ` : ''}Phút trận: *${alert.minute}'*`,
      ``,
      snapLines.length > 0 ? `📈 *Kèo snapshot:*\n${snapLines.map((l) => this.escapeMarkdown(l)).join('\n')}\n` : '',
      `📉 *Diễn biến:*`,
      `${this.escapeMarkdown(alert.message)}`,
      perTeamBlock ? `\n${perTeamBlock}` : '',
      statsAgg ? `\n${statsAgg}` : '',
      historyBlock,
    ].filter(Boolean).join('\n');

    return this.sendMessageWithRetry(chatId, text);
  }

  /**
   * Tin từ Nhật ký Cảnh báo (client) — đủ mốc thời gian GMT+7, giải, kèo, chỉ số, nội dung cảnh báo.
   */
  async sendNhatKyAlertToUser(userId: string, payload: NhatKyAlertPayload): Promise<boolean> {
    const chatId = this.userChatMap.get(userId);
    if (!chatId || !this.bot) return false;

    const timeLine = formatTimestampGmt7(payload.eventTimeMs);
    const odd2 = Array.isArray(payload.oddsTwoTeamLines) ? payload.oddsTwoTeamLines.filter(Boolean) : [];
    const oddsBlock =
      odd2.length > 0
        ? `🎯 *Kèo (T/X & chấp — 2 đội):*\n${odd2.map((l) => `• ${this.escapeMarkdown(l)}`).join('\n')}`
        : payload.oddsLines.length > 0
          ? `📈 *Kèo hiện có:*\n${payload.oddsLines.map((l) => `• ${this.escapeMarkdown(l)}`).join('\n')}`
          : '';
    const perTeamBlock =
      Array.isArray(payload.perTeamApiLines) && payload.perTeamApiLines.length > 0
        ? `📡 *Chỉ số từng đội (API):*\n${payload.perTeamApiLines.map((l) => `• ${this.escapeMarkdown(l)}`).join('\n')}`
        : '';
    const statsBlock =
      payload.statsLines.length > 0
        ? `📊 *Chỉ số tổng hợp:*\n${payload.statsLines.map((l) => `• ${this.escapeMarkdown(l)}`).join('\n')}`
        : '';
    const bellHist = (payload.pressureBellHistoryMinutes ?? 'Chưa có').trim() || 'Chưa có';
    const ouHist = (payload.ouDropIntensityHistoryMinutes ?? 'Chưa có').trim() || 'Chưa có';
    const historyBlock =
      `🔔 *Lịch sử chuông báo động (phút):* ${this.escapeMarkdown(bellHist)}\n` +
      `📉 *Lịch sử cường độ giảm giá OU (phút):* ${this.escapeMarkdown(ouHist)}`;

    const heading = payload.headerLabel?.trim() || 'NHẬT KÝ CẢNH BÁO';
    const text = [
      `🔔 *${this.escapeMarkdown(heading)}*`,
      ``,
      `⏰ *${this.escapeMarkdown(timeLine)}*`,
      ``,
      `🏆 *${this.escapeMarkdown(payload.leagueLine)}*`,
      `⚽ *${this.escapeMarkdown(payload.matchLine)}*`,
      `📍 Tỷ số: *${this.escapeMarkdown(payload.score)}* | Phút: *${payload.minute}'*`,
      ``,
      oddsBlock,
      perTeamBlock ? `\n${perTeamBlock}` : '',
      statsBlock ? `\n${statsBlock}` : '',
      ``,
      historyBlock,
      ``,
      `⚠️ *${this.escapeMarkdown(payload.alertTitle)}*`,
      `${this.escapeMarkdown(payload.alertMessage)}`,
      ``,
      `Loại: ${this.escapeMarkdown(payload.alertType)}`,
    ].filter(Boolean).join('\n');

    return this.sendMessageWithRetry(chatId, text);
  }

  private async sendMessageWithRetry(chatId: number | string, text: string): Promise<boolean> {
    if (!this.bot) return false;
    const delays = [0, 500, 1_200];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        return true;
      } catch (err) {
        logger.warn(`Telegram send attempt ${i + 1}/${delays.length} failed:`, err);
        if (i === delays.length - 1) {
          logger.error(`Telegram send failed after retries for chat ${chatId}`);
          return false;
        }
      }
    }
    return false;
  }

  async sendEvaluationToUser(userId: string, evaluation: BetEvaluation, matchName: string): Promise<boolean> {
    const chatId = this.userChatMap.get(userId);
    if (!chatId || !this.bot) return false;

    const recEmoji: Record<string, string> = {
      strong_enter: '🟢🟢',
      enter: '🟢',
      hold: '🟡',
      reduce_stake: '🟠',
      exit: '🔴',
      no_enter: '⛔',
    };

    const text = [
      `🤖 *PHÂN TÍCH AI*`,
      ``,
      `🏟 *${this.escapeMarkdown(matchName)}*`,
      `📋 Loại cược: ${evaluation.betType}`,
      ``,
      `${recEmoji[evaluation.recommendation] || '❓'} *${this.escapeMarkdown(evaluation.recommendationText)}*`,
      ``,
      `📊 Điểm hợp lý: ${evaluation.score}/100`,
      `🎯 Xác suất thắng: ${evaluation.winProbability}%`,
      `🔒 Độ tin cậy: ${evaluation.confidence}%`,
      ``,
      evaluation.risks.length > 0
        ? `⚠️ *Rủi ro:*\n${evaluation.risks.map(r => `  • ${this.escapeMarkdown(r)}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n');

    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      return true;
    } catch (err) {
      logger.error(`Telegram evaluation send failed:`, err);
      return false;
    }
  }

  async sendTextToChat(chatId: number, text: string): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      return true;
    } catch (err) {
      logger.error(`Telegram text send failed:`, err);
      return false;
    }
  }

  /**
   * Gửi tin có inline keyboard (dùng cho /bet flow). Có retry như alert.
   * Trả về `false` nếu gửi thất bại sau retry.
   */
  async sendMessageWithMarkup(
    chatId: number,
    text: string,
    replyMarkup: InlineKeyboardMarkup,
    opts: { parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML' | null } = {},
  ): Promise<boolean> {
    if (!this.bot) return false;
    const options: Record<string, unknown> = { reply_markup: replyMarkup };
    if (opts.parseMode !== null) {
      options.parse_mode = opts.parseMode || 'Markdown';
    }
    const delays = [0, 500, 1_200];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        await this.bot.sendMessage(chatId, text, options);
        return true;
      } catch (err) {
        logger.warn(`Telegram markup send attempt ${i + 1}/${delays.length} failed:`, err);
        if (i === delays.length - 1) {
          logger.error(`Telegram markup send failed after retries for chat ${chatId}`);
          return false;
        }
      }
    }
    return false;
  }

  private escapeMarkdown(text: string): string {
    if (!text) return '';
    // For Markdown V1, we need to escape: _, *, `, [
    // We also escape \ to avoid issues if the text already contains it.
    return text
      .replace(/\\/g, '\\\\')
      .replace(/([_*`\[])/g, '\\$1');
  }
}
