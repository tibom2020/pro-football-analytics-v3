import type { MatchInfo } from '../types';

/** Hiệp 2 trong dữ liệu lưu / biểu đồ luôn bắt đầu từ phút 45 (đồng hồ trận), tách khỏi bù giờ H1 (>45'). */
export type MatchHalf = 1 | 2;

/** Khóa stats H1: 0..511 (phút thực tế H1, có thể >45). Khóa H2: 512 + phút đồng hồ (45–150). */
export const STAT_KEY_HALF2_OFFSET = 512;

export function encodeStatTimelineKey(half: MatchHalf, minute: number): number {
  const m = Math.max(0, Math.round(minute));
  if (half === 2) return STAT_KEY_HALF2_OFFSET + Math.min(m, 200);
  return Math.min(m, STAT_KEY_HALF2_OFFSET - 1);
}

export function decodeStatTimelineKey(key: number): { half: MatchHalf; minute: number } {
  if (!Number.isFinite(key)) return { half: 1, minute: 0 };
  if (key >= STAT_KEY_HALF2_OFFSET) return { half: 2, minute: key - STAT_KEY_HALF2_OFFSET };
  return { half: 1, minute: key };
}

/** H2: đồng hồ reset (0–44) vs liên tục (≥45). */
export type H2ClockMode = 'reset' | 'continuous';

export function detectH2ClockMode(h2RawMinutes: readonly number[]): H2ClockMode {
  if (h2RawMinutes.some((m) => m >= 45)) return 'continuous';
  return 'reset';
}

/**
 * Phút trên trục biểu đồ: H2 luôn 45…90+ (đồng hồ liên tục).
 * Feed reset H2 (tm 0–44) → cộng 45. Feed liên tục → giữ nguyên (≥45).
 */
export function chartMinuteForHalf(
  half: MatchHalf,
  minute: number,
  h2Mode: H2ClockMode = 'reset',
): number {
  const m = Math.max(0, Math.round(minute));
  if (half === 2) {
    if (h2Mode === 'continuous') return m;
    return m < 45 ? m + 45 : m;
  }
  return m;
}

/** B365 thường dùng tt: 1 = hiệp 1, 2 = hiệp 2 (có thể khác nhà cung cấp). */
export function isSecondHalfTimer(timer?: MatchInfo['timer']): boolean {
  if (!timer) return false;
  const tt = timer.tt;
  if (tt === undefined || tt === null || tt === '') return false;
  const n = parseInt(String(tt), 10);
  return Number.isFinite(n) && n >= 2;
}

/**
 * Xác định hiệp để lưu stats — đồng bộ với odds (đã gán half theo add_time / timer).
 * Nhiều feed vẫn để tt=1 trong H2; khi đó chỉ dựa timer sẽ ghi nhầm vào khóa H1 → biểu đồ H2 không có đường API.
 *
 * Khi `tt>=2` (đã báo hiệp 2): tin timer — ghi H2 ngay cả phút 45–49 (đồng hồ liên tục đầu H2).
 * Trước đây ép 45–49 → H1 khiến đầu H2 ghi đè biểu đồ H1 đến phút 50.
 */
export function resolveStatsHalfFromSnapshots(
  timer: MatchInfo['timer'] | undefined,
  clockMinute: number,
  snapshots: readonly { minute: number; half?: MatchHalf }[],
): MatchHalf {
  const cm = Math.max(0, Math.round(clockMinute));

  if (isSecondHalfTimer(timer)) {
    // Đồng hồ hiệp 2 dạng reset (0–45) hoặc liên tục (≥45): đều là H2 khi tt>=2.
    return 2;
  }

  if (snapshots.length === 0) {
    return cm >= H1_STOPPAGE_CLOCK_END ? 2 : 1;
  }
  if (snapshots.some((s) => s.minute === cm && s.half === 2)) return 2;
  const atOrBefore = snapshots.filter((s) => s.minute <= cm);
  if (atOrBefore.length === 0) {
    return cm >= H1_STOPPAGE_CLOCK_END ? 2 : 1;
  }
  const latest = atOrBefore.reduce((a, b) => (b.minute >= a.minute ? b : a));
  if (latest.half === 2) return 2;
  /**
   * Đồng hồ 0→90 (MLS/feed không lùi phút) + mọi dòng kèo vẫn half=1 vì không có “phút reset” —
   * cần mốc đồng hồ (≥50): hiệp 1 cực kỳ hiếm >50’ tích lũy; tránh nhầm bù hiệp 1 ~45+4..6.
   * Chỉ dùng khi tt vẫn =1 (chưa báo H2).
   */
  if (cm >= H1_STOPPAGE_CLOCK_END) return 2;
  return 1;
}

/** Đồng hồ liên tục + tt=1: phút 45–49 = bù H1; từ 50 coi là đã vào H2 (WC bù >12' hiếm). */
export const H1_STOPPAGE_CLOCK_END = 50;

/**
 * @deprecated Dùng `H1_STOPPAGE_CLOCK_END` cho nhận diện hiệp; giữ alias cho trục biểu đồ.
 * Trần trục X H1 khi vẫn đang bù (có thể >45).
 */
export const H1_CLOCK_MAX_WHILE_TT1 = 63;

/**
 * Hiệp 2 cho UI + tách H1/H2: không chỉ dựa `timer.tt` (nhiều feed B365 vẫn tt=1 trong H2).
 * Ưu tiên: tt + kèo (như khi lưu stats) → fallback mốc đã lưu trong statsHistory (khóa >= 512).
 */
export function resolveMatchHalfForUI(
  timer: MatchInfo['timer'] | undefined,
  clockMinute: number,
  oddsSnapshots: readonly { minute: number; half?: MatchHalf }[],
  statsHistoryKeyStrings: readonly string[],
): MatchHalf {
  const cm = Math.max(0, Math.round(clockMinute));

  /** Feed đã báo hiệp 2 → UI/H2 ngay (kể cả phút 45–49 đầu H2). */
  if (isSecondHalfTimer(timer)) return 2;

  const fromOdds = resolveStatsHalfFromSnapshots(timer, cm, oddsSnapshots);
  /** Kèo đã gắn H2 (phút reset / normalize) → tin kèo, không ép 45–49 về H1. */
  if (fromOdds === 2) return 2;

  /** Bù giờ H1 (45–49) khi tt vẫn =1 và kèo chưa sang H2: giữ panel H1. */
  if (cm >= 45 && cm < H1_STOPPAGE_CLOCK_END) {
    return 1;
  }

  if (cm < H1_STOPPAGE_CLOCK_END) return 1;
  if (cm >= H1_STOPPAGE_CLOCK_END) return 2;

  /** Suy H2 từ localStorage khi feed chưa báo tt>=2. */
  for (const k of statsHistoryKeyStrings) {
    const num = Number(k);
    if (!Number.isFinite(num)) continue;
    const decoded = decodeStatTimelineKey(num);
    if (decoded.half !== 2) continue;
    if (cm >= 50 && decoded.minute <= cm + 2) return 2;
  }
  return 1;
}

/** Trận đang live (H1/H2) theo timer B365. */
export function isLiveMatchTimer(timer?: MatchInfo['timer']): boolean {
  const tt = String(timer?.tt ?? '').trim();
  return tt === '1' || tt === '2';
}

/** FT / kết thúc — tt 3/4 hoặc không còn tt live khi đồng hồ đã qua ~90'. */
export function isMatchFinishedTimer(
  timer?: MatchInfo['timer'],
  clockMinute = 0,
): boolean {
  const tt = String(timer?.tt ?? '').trim();
  if (tt === '3' || tt === '4') return true;
  const n = parseInt(tt, 10);
  if (Number.isFinite(n) && n >= 3) return true;
  const m = Math.max(0, Math.round(clockMinute));
  // Feed đôi khi giữ tt=1 tới hết trận — coi như FT khi phút >= 90 và timer không báo live.
  if (m >= 90 && tt !== '' && !isLiveMatchTimer(timer)) return true;
  return false;
}

export interface MatchClockContext {
  half: MatchHalf;
  minute: number;
  isFt: boolean;
}

/** Đồng hồ + hiệp + FT — dùng chung cho snapshot, auto-score, predict. */
export function resolveMatchClockContext(
  timer: MatchInfo['timer'] | undefined,
  clockMinute: number,
  oddsSnapshots: readonly { minute: number; half?: MatchHalf }[],
  statsHistoryKeyStrings: readonly string[],
): MatchClockContext {
  const minute = Math.max(0, Math.round(clockMinute));
  const half = resolveMatchHalfForUI(timer, minute, oddsSnapshots, statsHistoryKeyStrings);
  const isFt = isMatchFinishedTimer(timer, minute);
  return { half, minute, isFt };
}

/**
 * Gán hiệp cho từng snapshot theo thứ tự thời gian API (add_time):
 * khi phút giảm đột ngột sau khi đã qua >45' → coi như reset sang hiệp 2 (45' H2).
 */
export function assignHalfByChronologicalMinutes<T extends { minute: number }>(
  ordered: T[],
): (T & { half: MatchHalf })[] {
  if (ordered.length === 0) return [];
  let half: MatchHalf = 1;
  let prevMinute = -1;
  return ordered.map((row) => {
    const m = row.minute;
    if (prevMinute >= 0 && m < prevMinute && prevMinute > 45 && m >= 40) {
      half = 2;
    }
    prevMinute = m;
    return { ...row, half };
  });
}

export function dedupeSnapshotsByHalfAndMinute<
  T extends { minute: number; half: MatchHalf },
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    map.set(`${r.half}-${r.minute}`, r);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half;
    return a.minute - b.minute;
  });
}

type HalfMinuteDedupeFn<T extends { minute: number; half: MatchHalf }> = (rows: T[]) => T[];

/** Giữ mọi dòng (không gộp) — dùng cho tick series / trước khi chọn cực trị theo phút. */
export function keepAllHalfMinuteRows<T extends { minute: number; half: MatchHalf }>(rows: T[]): T[] {
  return rows;
}

/**
 * `tt` báo hiệp 2: tách phút &lt;45 (H1) vs ≥45 (H2).
 * Khi đang H2 (tt≥2): phút ≥45 → H2 (đồng hồ liên tục đầu hiệp 2), không giữ 45–49 trên H1.
 * Chỉ khi tt vẫn =1 mới coi 45–49 là bù H1.
 */
export function splitHalfByMinuteWhenSecondHalfTimer<
  T extends { minute: number; half: MatchHalf },
>(
  rows: T[],
  matchTimer: MatchInfo['timer'] | undefined,
  dedupeFn: HalfMinuteDedupeFn<T> = dedupeSnapshotsByHalfAndMinute,
): T[] {
  if (!matchTimer || !isSecondHalfTimer(matchTimer) || rows.length === 0) return rows;

  return dedupeFn(
    rows.map((r) => ({
      ...r,
      half: (r.minute < 45 ? 1 : 2) as MatchHalf,
    })),
  );
}

/**
 * Feed giữ `tt=1` trong H2 + đồng hồ liên tục không lùi: gán half theo phút khi `tm` đã &gt; mốc bù H1 thông thường.
 */
export function splitHalfByMinuteWhenClockInSecondHalfButTTWrong<
  T extends { minute: number; half: MatchHalf },
>(
  rows: T[],
  matchTimer: MatchInfo['timer'] | undefined,
  dedupeFn: HalfMinuteDedupeFn<T> = dedupeSnapshotsByHalfAndMinute,
): T[] {
  if (!matchTimer || rows.length === 0) return rows;
  const tm = matchTimer.tm;
  if (typeof tm !== 'number' || !Number.isFinite(tm) || tm < H1_STOPPAGE_CLOCK_END) return rows;
  if (isSecondHalfTimer(matchTimer)) return rows;
  if (!rows.some((r) => r.half === 1 && r.minute >= 46)) return rows;
  return dedupeFn(
    rows.map((r) => ({
      ...r,
      half: (r.minute < 45 ? 1 : 2) as MatchHalf,
    })),
  );
}
