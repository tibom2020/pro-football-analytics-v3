import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseStake,
  formatHandicapLabel,
  pickOdds,
  buildBetTypeKeyboard,
  buildBetLogPayload,
  parseTeamsFromMatchName,
  BetDraftStore,
  BetFlowController,
  isMatchLiveForBet,
  LIVE_BET_FINISHED_MINUTE,
  LIVE_BET_MAX_SILENCE_MS,
  type BetDraft,
  DRAFT_TTL_MS,
  type OddsMonitorBetPick,
} from '../telegram/bet-flow.js';
import type { OddsSnapshot, OddsSubscription } from '../ai-assistant-core/types.js';
import type { OddsMonitor } from '../odds-monitor/monitor.js';
import type { TelegramSender } from '../notification-service/telegram-sender.js';
import type { BetLogPayload, BetLogResult } from '../services/bet-logger.js';

function makeSnapshot(overrides: Partial<OddsSnapshot> = {}): OddsSnapshot {
  return {
    minute: 65,
    handicap: 2.5,
    handicapAH: -0.5,
    score: '1-0',
    overOdds: 1.9,
    underOdds: 1.95,
    homeOdds: 1.85,
    awayOdds: 2.05,
    ...overrides,
  };
}

function makeSub(overrides: Partial<OddsSubscription> = {}): OddsSubscription {
  return {
    id: 'sub-1',
    userId: 'user-1',
    matchId: 'm-1',
    matchName: 'MU vs Liverpool',
    leagueName: 'Premier League',
    markets: ['over_under', 'handicap'],
    threshold: 0.15,
    active: true,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('isMatchLiveForBet', () => {
  function makeMonitorPick(snap: OddsSnapshot | undefined, lastPush: number | undefined): OddsMonitorBetPick {
    return {
      getLastOddsSnapshot: vi.fn(() => snap),
      getLastOddsPushAt: vi.fn(() => lastPush),
    };
  }

  it('returns false without snapshot', () => {
    const now = 1_000_000;
    expect(isMatchLiveForBet(makeMonitorPick(undefined, now), 'm', now)).toBe(false);
  });

  it('returns false without last push time', () => {
    expect(isMatchLiveForBet(makeMonitorPick(makeSnapshot(), undefined), 'm')).toBe(false);
  });

  it('returns false when minute >= LIVE_BET_FINISHED_MINUTE', () => {
    const now = 1_000_000;
    expect(
      isMatchLiveForBet(makeMonitorPick(makeSnapshot({ minute: LIVE_BET_FINISHED_MINUTE }), now), 'm', now),
    ).toBe(false);
  });

  it('returns false when feed silent too long', () => {
    const now = LIVE_BET_MAX_SILENCE_MS + 10_000;
    const lastPush = 0;
    expect(isMatchLiveForBet(makeMonitorPick(makeSnapshot({ minute: 55 }), lastPush), 'm', now)).toBe(false);
  });

  it('returns true for fresh feed and in-play minute', () => {
    const now = 10_000_000;
    const lastPush = now - 60_000;
    expect(isMatchLiveForBet(makeMonitorPick(makeSnapshot({ minute: 67 }), lastPush), 'm', now)).toBe(true);
  });
});

describe('parseStake', () => {
  it('parses plain integers', () => {
    expect(parseStake('100')).toBe(100);
    expect(parseStake('  50 ')).toBe(50);
  });

  it('parses k suffix as ×1000', () => {
    expect(parseStake('100k')).toBe(100_000);
    expect(parseStake('1.5k')).toBe(1_500);
    expect(parseStake('2K')).toBe(2_000);
  });

  it('parses tr/m suffix as ×1_000_000', () => {
    expect(parseStake('1tr')).toBe(1_000_000);
    expect(parseStake('1.5tr')).toBe(1_500_000);
    expect(parseStake('2m')).toBe(2_000_000);
  });

  it('handles vietnamese decimal comma', () => {
    expect(parseStake('1,5tr')).toBe(1_500_000);
  });

  it('rejects invalid input', () => {
    expect(parseStake('')).toBe(null);
    expect(parseStake('abc')).toBe(null);
    expect(parseStake('-100')).toBe(null);
    expect(parseStake('0')).toBe(null);
    expect(parseStake('100xyz')).toBe(null);
  });

  it('caps at sanity limit', () => {
    expect(parseStake('99999tr')).toBe(null); // > 1e10
  });
});

describe('formatHandicapLabel', () => {
  it('returns OU handicap as plain string', () => {
    expect(formatHandicapLabel('over', makeSnapshot({ handicap: 2.5 }))).toBe('2.5');
    expect(formatHandicapLabel('under', makeSnapshot({ handicap: 3 }))).toBe('3');
  });

  it('home keeps raw sign with 2 decimals', () => {
    expect(formatHandicapLabel('home', makeSnapshot({ handicapAH: -0.5 }))).toBe('-0.50');
    expect(formatHandicapLabel('home', makeSnapshot({ handicapAH: 0.25 }))).toBe('+0.25');
    expect(formatHandicapLabel('home', makeSnapshot({ handicapAH: 0 }))).toBe('0');
  });

  it('away inverts sign', () => {
    expect(formatHandicapLabel('away', makeSnapshot({ handicapAH: -0.5 }))).toBe('+0.50');
    expect(formatHandicapLabel('away', makeSnapshot({ handicapAH: 0.25 }))).toBe('-0.25');
    expect(formatHandicapLabel('away', makeSnapshot({ handicapAH: 0 }))).toBe('0');
  });

  it('falls back to "?" when handicap missing', () => {
    expect(formatHandicapLabel('home', makeSnapshot({ handicapAH: undefined, handicap: NaN }))).toBe('?');
  });
});

describe('pickOdds', () => {
  it('returns the matching odds field', () => {
    const s = makeSnapshot();
    expect(pickOdds('over', s)).toBe(1.9);
    expect(pickOdds('under', s)).toBe(1.95);
    expect(pickOdds('home', s)).toBe(1.85);
    expect(pickOdds('away', s)).toBe(2.05);
  });

  it('returns undefined when missing', () => {
    expect(pickOdds('home', makeSnapshot({ homeOdds: undefined }))).toBeUndefined();
  });
});

describe('buildBetTypeKeyboard', () => {
  it('renders all 4 bet type buttons when all odds present', () => {
    const rows = buildBetTypeKeyboard(makeSnapshot());
    // Row 1: Tài + Xỉu, Row 2: Chủ + Khách, Row 3: Hủy
    expect(rows.length).toBe(3);
    expect(rows[0].length).toBe(2);
    expect(rows[1].length).toBe(2);
    expect(rows[0][0].callback_data).toBe('bet:t:over');
    expect(rows[0][1].callback_data).toBe('bet:t:under');
    expect(rows[1][0].callback_data).toBe('bet:t:home');
    expect(rows[1][1].callback_data).toBe('bet:t:away');
    expect(rows[2][0].callback_data).toBe('bet:c:no');
  });

  it('omits OU row when over and under odds missing', () => {
    const rows = buildBetTypeKeyboard(makeSnapshot({ overOdds: undefined, underOdds: undefined }));
    expect(rows.length).toBe(2); // AH row + Hủy row
    expect(rows[0][0].callback_data).toBe('bet:t:home');
  });

  it('omits AH row when home and away odds missing', () => {
    const rows = buildBetTypeKeyboard(makeSnapshot({ homeOdds: undefined, awayOdds: undefined }));
    expect(rows.length).toBe(2); // OU row + Hủy
    expect(rows[0][0].callback_data).toBe('bet:t:over');
  });

  it('omits individual buttons for missing odds', () => {
    const rows = buildBetTypeKeyboard(makeSnapshot({ overOdds: undefined, homeOdds: undefined }));
    // Row 1: only Xỉu, Row 2: only Khách, Row 3: Hủy
    expect(rows[0].length).toBe(1);
    expect(rows[0][0].callback_data).toBe('bet:t:under');
    expect(rows[1].length).toBe(1);
    expect(rows[1][0].callback_data).toBe('bet:t:away');
  });

  it('formats odds with 2 decimals in label text', () => {
    const rows = buildBetTypeKeyboard(makeSnapshot({ overOdds: 1.9, handicap: 2.5 }));
    expect(rows[0][0].text).toContain('@1.90');
    expect(rows[0][0].text).toContain('Tài');
    expect(rows[0][0].text).toContain('2.5');
  });
});

describe('parseTeamsFromMatchName', () => {
  it('splits on " vs "', () => {
    expect(parseTeamsFromMatchName('MU vs Liverpool')).toEqual(['MU', 'Liverpool']);
  });

  it('handles extra whitespace', () => {
    expect(parseTeamsFromMatchName('  Real Madrid   vs   Barcelona  ')).toEqual(['Real Madrid', 'Barcelona']);
  });

  it('case insensitive on "vs"', () => {
    expect(parseTeamsFromMatchName('MU VS Liverpool')).toEqual(['MU', 'Liverpool']);
  });

  it('falls back to whole name when format unexpected', () => {
    expect(parseTeamsFromMatchName('UnsplittableName')).toEqual(['UnsplittableName', '']);
  });
});

describe('buildBetLogPayload', () => {
  function makeDraft(overrides: Partial<BetDraft> = {}): BetDraft {
    return {
      chatId: 123,
      userId: 'user-1',
      step: 'confirm',
      betId: 'bet-uuid',
      matchId: 'm-1',
      matchName: 'MU vs Liverpool',
      leagueName: 'Premier League',
      snapshot: makeSnapshot(),
      betType: 'over',
      handicapLabel: '2.5',
      odds: 1.9,
      stake: 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  it('produces all required Sheet fields for OU bet', () => {
    const payload = buildBetLogPayload(makeDraft());
    expect(payload).toMatchObject({
      betId: 'bet-uuid',
      giaiDau: 'Premier League',
      doiNha: 'MU',
      doiKhach: 'Liverpool',
      tySoLucVaoKeo: '1-0',
      keoVao: 'Tài 2.5',
      phut: 65,
      tyLeAn: 1.9,
      soTienCuoc: 100,
    });
    expect(payload.note).toContain('[via Telegram]');
    expect(payload.note).toContain('odds=1.90');
    expect(payload.note).toContain('minute=65');
  });

  it('handles AH bet type with handicapLabel', () => {
    const payload = buildBetLogPayload(makeDraft({
      betType: 'home',
      handicapLabel: '-0.50',
      odds: 1.85,
    }));
    expect(payload.keoVao).toBe('Đội nhà -0.50');
    expect(payload.tyLeAn).toBe(1.85);
  });

  it('falls back to N/A for missing leagueName and score', () => {
    const payload = buildBetLogPayload(makeDraft({
      leagueName: undefined,
      snapshot: makeSnapshot({ score: undefined }),
    }));
    expect(payload.giaiDau).toBe('N/A');
    expect(payload.tySoLucVaoKeo).toBe('N/A');
  });

  it('throws when draft incomplete', () => {
    expect(() => buildBetLogPayload(makeDraft({ stake: undefined }))).toThrow();
    expect(() => buildBetLogPayload(makeDraft({ betType: undefined }))).toThrow();
    expect(() => buildBetLogPayload(makeDraft({ snapshot: undefined }))).toThrow();
  });
});

describe('BetDraftStore', () => {
  let store: BetDraftStore;

  beforeEach(() => {
    store = new BetDraftStore();
  });

  function fresh(): BetDraft {
    const now = Date.now();
    return {
      chatId: 1,
      userId: 'u1',
      step: 'match',
      betId: 'b1',
      createdAt: now,
      updatedAt: now,
    };
  }

  it('set / get round-trips a draft', () => {
    store.set(1, fresh());
    expect(store.get(1)?.userId).toBe('u1');
  });

  it('returns undefined for missing chat', () => {
    expect(store.get(999)).toBeUndefined();
  });

  it('update merges fields', () => {
    store.set(1, fresh());
    const next = store.update(1, { step: 'type', matchId: 'm-1' });
    expect(next?.step).toBe('type');
    expect(next?.matchId).toBe('m-1');
    expect(store.get(1)?.matchId).toBe('m-1');
  });

  it('update returns undefined when no draft', () => {
    expect(store.update(1, { step: 'type' })).toBeUndefined();
  });

  it('delete removes draft', () => {
    store.set(1, fresh());
    store.delete(1);
    expect(store.get(1)).toBeUndefined();
  });

  it('expires drafts older than TTL', () => {
    const oldDraft = { ...fresh(), updatedAt: Date.now() - DRAFT_TTL_MS - 1 };
    // Bypass set's auto-update by setting directly via test trick: use set then patch
    store.set(1, fresh());
    // Patch internal updatedAt by deleting and re-adding with old timestamp
    // Since we can't reach private map, simulate via cleanup interval:
    // First, place an old draft via set that we manually time-travel through Date mock.
    const realNow = Date.now;
    Date.now = () => realNow() + DRAFT_TTL_MS + 1000;
    expect(store.get(1)).toBeUndefined();
    Date.now = realNow;
    expect(oldDraft.updatedAt).toBeLessThan(Date.now()); // sanity
  });
});

describe('BetFlowController', () => {
  let store: BetDraftStore;
  let oddsMonitor: OddsMonitor;
  let telegramSender: TelegramSender;
  let logBet: ReturnType<typeof vi.fn>;
  let controller: BetFlowController;
  let dateNowSpy: ReturnType<typeof vi.spyOn<typeof Date, 'now'>> | undefined;

  afterEach(() => {
    dateNowSpy?.mockRestore();
    dateNowSpy = undefined;
  });

  function setupController(opts: {
    userIdByChat?: (chatId: number) => string | undefined;
    subscriptions?: OddsSubscription[];
    snapshotByMatch?: Record<string, OddsSnapshot | undefined>;
    historyByMatch?: Record<string, OddsSnapshot[]>;
    /** Thời điểm push gần nhất theo matchId; mặc định = `nowMs` nếu có snapshot */
    lastPushByMatch?: Record<string, number | undefined>;
    /** Mỗi lần gọi `getLastOddsPushAt` trả về phần tử tiếp theo (test stale giữa list và pick). */
    lastPushSequence?: number[];
    /** Đồng hồ giả lập cho isMatchLiveForBet */
    nowMs?: number;
    logResult?: BetLogResult;
  } = {}): void {
    store = new BetDraftStore();
    const subs = opts.subscriptions ?? [];
    const snapshots = opts.snapshotByMatch ?? {};
    const histories = opts.historyByMatch ?? {};
    const nowMs = opts.nowMs ?? Date.now();
    let pushSeqIdx = 0;

    oddsMonitor = {
      getSubscriptions: vi.fn((userId?: string) => subs.filter((s) => !userId || s.userId === userId)),
      getLastOddsSnapshot: vi.fn((matchId: string) => snapshots[matchId]),
      getLastOddsPushAt: vi.fn((matchId: string) => {
        if (opts.lastPushSequence?.length) {
          const seq = opts.lastPushSequence;
          const v = seq[Math.min(pushSeqIdx, seq.length - 1)];
          pushSeqIdx++;
          return v;
        }
        if (opts.lastPushByMatch && Object.prototype.hasOwnProperty.call(opts.lastPushByMatch, matchId)) {
          return opts.lastPushByMatch[matchId];
        }
        return snapshots[matchId] !== undefined ? nowMs : undefined;
      }),
      getOddsHistory: vi.fn((matchId: string) => histories[matchId] || []),
    } as unknown as OddsMonitor;

    telegramSender = {
      getUserIdByChatId: vi.fn(opts.userIdByChat ?? (() => 'user-1')),
    } as unknown as TelegramSender;

    logBet = vi.fn(async (_p: BetLogPayload): Promise<BetLogResult> =>
      opts.logResult ?? { ok: true, betId: 'bet-uuid', rowIndex: 42 },
    );

    controller = new BetFlowController({
      oddsMonitor,
      telegramSender,
      store,
      logBet: logBet as unknown as (p: BetLogPayload) => Promise<BetLogResult>,
    });

    dateNowSpy?.mockRestore();
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(nowMs);
  }

  it('startBetFlow blocks unbound user', () => {
    setupController({ userIdByChat: () => undefined });
    const reply = controller.startBetFlow(123);
    expect(reply.text).toContain('chưa liên kết');
    expect(reply.replyMarkup).toBeUndefined();
  });

  it('startBetFlow blocks user with no subscriptions', () => {
    setupController({ subscriptions: [] });
    const reply = controller.startBetFlow(123);
    expect(reply.text).toContain('chưa theo dõi trận');
  });

  it('startBetFlow shows match keyboard for live feed only', () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1', matchName: 'A vs B' })],
      snapshotByMatch: { 'm-1': makeSnapshot({ minute: 34, score: '0-0' }) },
    });
    const reply = controller.startBetFlow(123);
    expect(reply.text).toContain('feed live');
    expect(reply.replyMarkup?.inline_keyboard.length).toBeGreaterThan(0);
    const firstRow = reply.replyMarkup!.inline_keyboard[0];
    expect(firstRow[0].callback_data).toBe('bet:m:m-1');
  });

  it('startBetFlow explains when subscriptions exist but none are live', () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: {},
    });
    const reply = controller.startBetFlow(123);
    expect(reply.text).toContain('Không có trận live');
    expect(reply.replyMarkup).toBeUndefined();
  });

  it('startBetFlow hides finished matches (minute >= threshold)', () => {
    const t0 = 8_000_000;
    setupController({
      nowMs: t0,
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot({ minute: LIVE_BET_FINISHED_MINUTE }) },
      lastPushByMatch: { 'm-1': t0 },
    });
    const reply = controller.startBetFlow(123);
    expect(reply.text).toContain('Không có trận live');
  });

  it('handlePickMatch rejects when feed became stale before pick', async () => {
    const t0 = 9_000_000;
    const stalePush = t0 - LIVE_BET_MAX_SILENCE_MS - 60_000;
    setupController({
      nowMs: t0,
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot({ minute: 55 }) },
      lastPushSequence: [t0, stalePush],
    });
    controller.startBetFlow(123);
    const r = await controller.handleCallback(123, 'bet:m:m-1');
    expect(r?.text).toContain('không còn coi là live');
  });

  it('full happy path: match → type → preset stake → confirm', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot() },
      historyByMatch: { 'm-1': [makeSnapshot()] },
    });

    // Step 0: start
    controller.startBetFlow(123);

    // Step 1: pick match
    const r1 = await controller.handleCallback(123, 'bet:m:m-1');
    expect(r1?.text).toContain('MU vs Liverpool');
    expect(r1?.replyMarkup).toBeDefined();
    expect(store.get(123)?.step).toBe('type');

    // Step 2: pick type
    const r2 = await controller.handleCallback(123, 'bet:t:over');
    expect(r2?.text).toContain('Tài 2.5');
    expect(r2?.text).toContain('@1.90');
    expect(store.get(123)?.step).toBe('stake');

    // Step 3: pick stake
    const r3 = await controller.handleCallback(123, 'bet:s:100');
    expect(r3?.text).toContain('VÉ CHUẨN BỊ VÀO KÈO');
    expect(r3?.text).toContain('100');
    expect(store.get(123)?.step).toBe('confirm');

    // Step 4: confirm
    const r4 = await controller.handleCallback(123, 'bet:c:ok');
    expect(logBet).toHaveBeenCalledOnce();
    const payload = logBet.mock.calls[0][0] as BetLogPayload;
    expect(payload.keoVao).toBe('Tài 2.5');
    expect(payload.soTienCuoc).toBe(100);
    expect(payload.doiNha).toBe('MU');
    expect(r4?.text).toContain('Đã vào kèo');
    expect(r4?.text).toContain('42'); // row index
    expect(store.get(123)).toBeUndefined(); // draft cleared
  });

  it('cancel at any step deletes draft', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot() },
    });
    controller.startBetFlow(123);
    await controller.handleCallback(123, 'bet:m:m-1');
    expect(store.get(123)).toBeDefined();

    const r = await controller.handleCallback(123, 'bet:c:no');
    expect(r?.text).toContain('Đã hủy');
    expect(store.get(123)).toBeUndefined();
  });

  it('rejects pickType for missing odds', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot({ homeOdds: undefined }) },
    });
    controller.startBetFlow(123);
    await controller.handleCallback(123, 'bet:m:m-1');
    const r = await controller.handleCallback(123, 'bet:t:home');
    expect(r?.text).toContain('không có giá');
  });

  it('custom stake flow accepts text input', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot() },
    });
    controller.startBetFlow(123);
    await controller.handleCallback(123, 'bet:m:m-1');
    await controller.handleCallback(123, 'bet:t:over');
    const r1 = await controller.handleCallback(123, 'bet:s:custom');
    expect(r1?.text).toContain('gõ số tiền');
    expect(store.get(123)?.step).toBe('custom_stake');

    const r2 = await controller.handleCustomStakeText(123, '250k');
    expect(r2?.text).toContain('VÉ CHUẨN BỊ VÀO KÈO');
    expect(store.get(123)?.stake).toBe(250_000);
    expect(store.get(123)?.step).toBe('confirm');
  });

  it('handleCustomStakeText returns null when no draft awaiting custom stake', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
    });
    expect(await controller.handleCustomStakeText(123, '100')).toBeNull();

    controller.startBetFlow(123);
    // step is 'match', not 'custom_stake' → null
    expect(await controller.handleCustomStakeText(123, '100')).toBeNull();
  });

  it('confirm reports sheets disabled error', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
      snapshotByMatch: { 'm-1': makeSnapshot() },
      logResult: { ok: false, error: 'Sheets disabled', code: 'disabled' },
    });
    controller.startBetFlow(123);
    await controller.handleCallback(123, 'bet:m:m-1');
    await controller.handleCallback(123, 'bet:t:over');
    await controller.handleCallback(123, 'bet:s:100');
    const r = await controller.handleCallback(123, 'bet:c:ok');
    expect(r?.text).toContain('Không ghi được vé');
    expect(r?.text).toContain('Google Sheets chưa được cấu hình');
  });

  it('expired session yields friendly message on callback', async () => {
    setupController({
      subscriptions: [makeSub({ userId: 'user-1', matchId: 'm-1' })],
    });
    // No startBetFlow call → no draft
    const r = await controller.handleCallback(123, 'bet:m:m-1');
    expect(r?.text).toContain('hết hạn');
  });

  it('returns null for non bet:* callbacks', async () => {
    setupController({});
    expect(await controller.handleCallback(123, 'other:foo')).toBeNull();
  });
});
