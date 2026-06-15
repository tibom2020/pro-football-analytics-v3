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

/**
 * `tt` báo hiệp 2: tách phút &lt;45 (H1) vs ≥45 (H2).
 * Trước đây điều kiện `every(minute >= 45)` khiến không relabel khi lịch sử vẫn có mốc hiệp 1 (&lt;45).
 * Khi đã có hiệp 1 thường (&lt;45) và bù H1 (half=1, phút≥45) theo chronological — không remap sang H2
 * để tránh nhầm bù H1 với hiệp 2 khi feed gửi `tt>=2` sớm.
 */
function splitHalfByMinuteWhenSecondHalfTimer<
  T extends { minute: number; half: MatchHalf },
>(rows: T[], matchTimer: MatchInfo['timer'] | undefined): T[] {
  if (!matchTimer || !isSecondHalfTimer(matchTimer) || rows.length === 0) return rows;
  const seenFirstHalfPlay = rows.some((r) => r.minute < 45);
  const hasH1Stoppage = rows.some((r) => r.half === 1 && r.minute >= 45);
  if (seenFirstHalfPlay && hasH1Stoppage) {
    return dedupeSnapshotsByHalfAndMinute(rows);
  }
  return dedupeSnapshotsByHalfAndMinute(
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
>(rows: T[], matchTimer: MatchInfo['timer'] | undefined): T[] {
  if (!matchTimer || rows.length === 0) return rows;
  const tm = matchTimer.tm;
  if (typeof tm !== 'number' || !Number.isFinite(tm) || tm < 50) return rows;
  if (isSecondHalfTimer(matchTimer)) return rows;
  if (!rows.some((r) => r.half === 1 && r.minute >= 46)) return rows;
  return dedupeSnapshotsByHalfAndMinute(
    rows.map((r) => ({
      ...r,
      half: (r.minute < 45 ? 1 : 2) as MatchHalf,
    })),
  );
}

/**
 * Chuẩn hóa lịch sử Tài/Xỉu: gán hiệp (H1 vs H2 tách 45'), gộp trùng (half+phút).
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
  const withHalf = assignHalfByChronologicalMinutes(stripped);
  let deduped = dedupeSnapshotsByHalfAndMinute(withHalf as (OverUnderMinuteSnapshot & { half: MatchHalf })[]);
  deduped = splitHalfByMinuteWhenSecondHalfTimer(deduped, options?.matchTimer);
  if (marketId === '1_3') {
    deduped = splitHalfByMinuteWhenClockInSecondHalfButTTWrong(deduped, options?.matchTimer);
  }
  if (marketId === '1_6') {
    deduped = deduped.map((r) => ({ ...r, half: 1 as MatchHalf }));
  }
  return deduped;
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
