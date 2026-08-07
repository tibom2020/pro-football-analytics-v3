import type {
  AsianHandicapMinuteSnapshot,
  MatchInfo,
  MoneyLineMinuteSnapshot,
  OddsItem,
  OverUnderMinuteSnapshot,
} from '../types';
import {
  assignHalfByChronologicalMinutes,
  dedupeSnapshotsByHalfAndMinute,
  H1_STOPPAGE_CLOCK_END,
  isSecondHalfTimer,
  type MatchHalf,
} from './matchTimeline';

function parseFinite(n: unknown): number | null {
  if (n === undefined || n === null || n === '') return null;
  const v = typeof n === 'number' ? n : parseFloat(String(n).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function parseAddTimeOrder(row: OddsItem): number {
  const v = parseInt(String(row.add_time ?? '0'), 10);
  return Number.isFinite(v) ? v : 0;
}

type HalfMinuteDedupeFn<T extends { minute: number; half: MatchHalf }> = (rows: T[]) => T[];

/**
 * `tt` báo hiệp 2: tách phút &lt;45 (H1) vs ≥45 (H2).
 * Trước đây điều kiện `every(minute >= 45)` khiến không relabel khi lịch sử vẫn có mốc hiệp 1 (&lt;45).
 * Khi đã có hiệp 1 thường (&lt;45) và bù H1 (half=1, phút≥45) theo chronological — không remap sang H2
 * để tránh nhầm bù H1 với hiệp 2 khi feed gửi `tt>=2` sớm.
 */
function splitHalfByMinuteWhenSecondHalfTimer<
  T extends { minute: number; half: MatchHalf },
>(
  rows: T[],
  matchTimer: MatchInfo['timer'] | undefined,
  dedupeFn: HalfMinuteDedupeFn<T> = dedupeSnapshotsByHalfAndMinute,
): T[] {
  if (!matchTimer || !isSecondHalfTimer(matchTimer) || rows.length === 0) return rows;
  const tm =
    typeof matchTimer.tm === 'number' && Number.isFinite(matchTimer.tm) ? matchTimer.tm : null;
  const seenFirstHalfPlay = rows.some((r) => r.minute < 45);
  const hasH1Stoppage = rows.some((r) => r.half === 1 && r.minute >= 45);
  const inH1StoppageClock =
    tm != null && tm >= 45 && tm < H1_STOPPAGE_CLOCK_END;
  const isH1StoppageMinute = (m: number) => m >= 45 && m < H1_STOPPAGE_CLOCK_END;

  if (seenFirstHalfPlay && (hasH1Stoppage || inH1StoppageClock)) {
    return dedupeFn(
      rows.map((r) => {
        if (r.half === 1 && isH1StoppageMinute(r.minute)) {
          return { ...r, half: 1 as MatchHalf };
        }
        if (inH1StoppageClock && isH1StoppageMinute(r.minute)) {
          return { ...r, half: 1 as MatchHalf };
        }
        if (r.minute >= H1_STOPPAGE_CLOCK_END) {
          return { ...r, half: 2 as MatchHalf };
        }
        if (!inH1StoppageClock && r.minute >= 45) {
          return { ...r, half: 2 as MatchHalf };
        }
        return r;
      }),
    );
  }
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
function splitHalfByMinuteWhenClockInSecondHalfButTTWrong<
  T extends { minute: number; half: MatchHalf },
>(
  rows: T[],
  matchTimer: MatchInfo['timer'] | undefined,
  dedupeFn: HalfMinuteDedupeFn<T> = dedupeSnapshotsByHalfAndMinute,
): T[] {
  if (!matchTimer || rows.length === 0) return rows;
  const tm = matchTimer.tm;
  if (typeof tm !== 'number' || !Number.isFinite(tm) || tm < 50) return rows;
  if (isSecondHalfTimer(matchTimer)) return rows;
  if (!rows.some((r) => r.half === 1 && r.minute >= 46)) return rows;
  return dedupeFn(
    rows.map((r) => ({
      ...r,
      half: (r.minute < 45 ? 1 : 2) as MatchHalf,
    })),
  );
}

/** Giữ mọi tick (không gộp) — dùng trước khi chọn giá thấp nhất theo phút. */
function keepAllHalfMinuteSnapshots<T extends { minute: number; half: MatchHalf }>(rows: T[]): T[] {
  return rows;
}

/**
 * Mỗi (hiệp, phút) giữ snapshot có **giá Tài (`over`) thấp nhất** trong phút đó
 * (mọi tick / mọi line trong phút — nến biểu đồ dùng giá này).
 * Cùng over → giữ tick sau (handicap/under mới hơn).
 */
export function dedupeOverUnderByLowestOver(
  rows: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): (OverUnderMinuteSnapshot & { half: MatchHalf })[] {
  const groups = new Map<string, (OverUnderMinuteSnapshot & { half: MatchHalf })[]>();
  for (const r of rows) {
    const half = r.half === 2 ? 2 : 1;
    const k = `${half}-${r.minute}`;
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [{ ...r, half }]);
  }

  const out: (OverUnderMinuteSnapshot & { half: MatchHalf })[] = [];
  for (const arr of groups.values()) {
    let best = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const r = arr[i];
      if (r.over < best.over - 1e-9) best = r;
      else if (Math.abs(r.over - best.over) < 1e-9) best = r; // cùng giá → tick sau
    }
    out.push(best);
  }

  return out.sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half;
    return a.minute - b.minute;
  });
}

/**
 * Gộp lịch sử cũ + fetch mới: mỗi (half, phút) giữ giá Tài thấp nhất từng thấy.
 * Fetch sau có giá cao hơn ở cùng phút → không ghi đè nến.
 */
export function mergeOuSnapshotsKeepLowestOver(
  previous: readonly OverUnderMinuteSnapshot[],
  incoming: readonly OverUnderMinuteSnapshot[],
): OverUnderMinuteSnapshot[] {
  if (!previous.length) return [...incoming];
  if (!incoming.length) return [...previous];

  const tagged: (OverUnderMinuteSnapshot & { half: MatchHalf })[] = [];
  for (const r of previous) {
    tagged.push({ ...r, half: r.half === 2 ? 2 : 1 });
  }
  for (const r of incoming) {
    tagged.push({ ...r, half: r.half === 2 ? 2 : 1 });
  }
  return dedupeOverUnderByLowestOver(tagged);
}

/**
 * Chuẩn hóa lịch sử Tài/Xỉu: gán hiệp (H1 vs H2 tách 45'), gộp trùng (half+phút).
 * Mỗi phút giữ **giá Tài thấp nhất** (mọi tick trong phút), không lấy tick cuối.
 * `matchTimer`: nếu API chỉ trả mốc H2 mà không có chuỗi phút lùi, gán cả dải sang hiệp 2.
 */
export function normalizeOverUnderSnapshots(
  items: OddsItem[] | undefined,
  marketId: '1_3' | '1_6',
  options?: { matchTimer?: MatchInfo['timer'] },
): OverUnderMinuteSnapshot[] {
  if (!items?.length) return [];

  const parsed: (OverUnderMinuteSnapshot & { _ord: number })[] = [];

  for (const row of items) {
    if (row.time_str == null || row.time_str === '') continue;
    const minute = parseInt(String(row.time_str), 10);
    if (!Number.isFinite(minute) || minute < 0 || minute > 120) continue;

    const handicap = parseFinite(row.handicap);
    const over = parseFinite(row.over_od);
    const under = parseFinite(row.under_od);
    if (handicap === null || over === null || under === null) continue;

    parsed.push({
      marketId,
      minute,
      handicap,
      over,
      under,
      sourceId: row.id,
      _ord: parseAddTimeOrder(row),
    });
  }

  parsed.sort((a, b) => a._ord - b._ord || String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? '')));

  const stripped = parsed.map(({ _ord, ...rest }) => rest);
  // Giữ mọi tick qua bước gán hiệp; chỉ gộp 1 lần cuối theo giá Tài thấp nhất.
  let rows = assignHalfByChronologicalMinutes(stripped) as (OverUnderMinuteSnapshot & {
    half: MatchHalf;
  })[];
  rows = splitHalfByMinuteWhenSecondHalfTimer(rows, options?.matchTimer, keepAllHalfMinuteSnapshots);
  if (marketId === '1_3') {
    rows = splitHalfByMinuteWhenClockInSecondHalfButTTWrong(
      rows,
      options?.matchTimer,
      keepAllHalfMinuteSnapshots,
    );
  }
  if (marketId === '1_6') {
    rows = rows.map((r) => ({ ...r, half: 1 as MatchHalf }));
  }
  return dedupeOverUnderByLowestOver(rows);
}

/**
 * Chuẩn hóa kèo chấp đội nhà/đội khách cho `1_2` và `1_5`.
 */
export function normalizeAsianHandicapSnapshots(
  items: OddsItem[] | undefined,
  marketId: '1_2' | '1_5',
  options?: { matchTimer?: MatchInfo['timer'] },
): AsianHandicapMinuteSnapshot[] {
  if (!items?.length) return [];

  const parsed: (AsianHandicapMinuteSnapshot & { _ord: number })[] = [];

  for (const row of items) {
    if (row.time_str == null || row.time_str === '') continue;
    const minute = parseInt(String(row.time_str), 10);
    if (!Number.isFinite(minute) || minute < 0 || minute > 120) continue;

    const handicap = parseFinite(row.handicap);
    const home = parseFinite(row.home_od);
    const away = parseFinite(row.away_od);
    if (handicap === null || home === null || away === null) continue;

    parsed.push({
      marketId,
      minute,
      handicap,
      home,
      away,
      sourceId: row.id,
      _ord: parseAddTimeOrder(row),
    });
  }

  parsed.sort((a, b) => a._ord - b._ord || String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? '')));

  const stripped = parsed.map(({ _ord, ...rest }) => rest);
  let deduped = dedupeSnapshotsByHalfAndMinute(
    assignHalfByChronologicalMinutes(stripped) as (AsianHandicapMinuteSnapshot & { half: MatchHalf })[],
  );
  deduped = splitHalfByMinuteWhenSecondHalfTimer(deduped, options?.matchTimer);
  if (marketId === '1_2') {
    deduped = splitHalfByMinuteWhenClockInSecondHalfButTTWrong(deduped, options?.matchTimer);
  }
  if (marketId === '1_5') {
    deduped = deduped.map((r) => ({ ...r, half: 1 as MatchHalf }));
  }
  return deduped;
}

/**
 * Chuẩn hóa thị trường 1X2 (`1_1`) — Đội nhà / Hòa / Đội khách.
 * Không có handicap; gán hiệp giống full-match (1_3 / 1_2).
 */
export function normalizeMoneyLineSnapshots(
  items: OddsItem[] | undefined,
  options?: { matchTimer?: MatchInfo['timer'] },
): MoneyLineMinuteSnapshot[] {
  if (!items?.length) return [];

  const parsed: (MoneyLineMinuteSnapshot & { _ord: number })[] = [];

  for (const row of items) {
    if (row.time_str == null || row.time_str === '') continue;
    const minute = parseInt(String(row.time_str), 10);
    if (!Number.isFinite(minute) || minute < 0 || minute > 120) continue;

    const home = parseFinite(row.home_od);
    const draw = parseFinite(row.draw_od);
    const away = parseFinite(row.away_od);
    if (home === null || draw === null || away === null) continue;

    parsed.push({
      marketId: '1_1',
      minute,
      home,
      draw,
      away,
      sourceId: row.id,
      _ord: parseAddTimeOrder(row),
    });
  }

  parsed.sort(
    (a, b) =>
      a._ord - b._ord ||
      String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? '')),
  );

  const stripped = parsed.map(({ _ord, ...rest }) => rest);
  let deduped = dedupeSnapshotsByHalfAndMinute(
    assignHalfByChronologicalMinutes(stripped) as (MoneyLineMinuteSnapshot & {
      half: MatchHalf;
    })[],
  );
  deduped = splitHalfByMinuteWhenSecondHalfTimer(deduped, options?.matchTimer);
  deduped = splitHalfByMinuteWhenClockInSecondHalfButTTWrong(deduped, options?.matchTimer);
  return deduped;
}

/** Vạch mở 1_3 đầu H1/H2 — snapshot sớm nhất theo hiệp (mirror server openingLineAt). */
export function computeOu13OpeningLines(
  snapshots: OverUnderMinuteSnapshot[],
): { h1OpenOu13?: number; h2OpenOu13?: number } {
  const firstInHalf = (half: MatchHalf): number | undefined => {
    const rows = snapshots
      .filter((o) => o.half === half && Number.isFinite(o.handicap))
      .sort((a, b) => a.minute - b.minute);
    return rows.length > 0 ? rows[0].handicap : undefined;
  };
  const h1 = firstInHalf(1);
  const h2 = firstInHalf(2);
  return {
    ...(h1 != null ? { h1OpenOu13: h1 } : {}),
    ...(h2 != null ? { h2OpenOu13: h2 } : {}),
  };
}
