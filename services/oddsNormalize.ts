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
  keepAllHalfMinuteRows,
  splitHalfByMinuteWhenClockInSecondHalfButTTWrong,
  splitHalfByMinuteWhenSecondHalfTimer,
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

function groupOuByHalfMinute(
  rows: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): Map<string, (OverUnderMinuteSnapshot & { half: MatchHalf })[]> {
  const groups = new Map<string, (OverUnderMinuteSnapshot & { half: MatchHalf })[]>();
  for (const r of rows) {
    const half = r.half === 2 ? 2 : 1;
    const k = `${half}-${r.minute}`;
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [{ ...r, half }]);
  }
  return groups;
}

function sortOuByHalfMinute(
  rows: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): (OverUnderMinuteSnapshot & { half: MatchHalf })[] {
  return rows.sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half;
    return a.minute - b.minute;
  });
}

/** Phút ≥45 có H2 → ưu tiên H2, loại H1 cùng phút (stale từ lúc nhầm bù H1). */
function preferH2OverStaleH1OnSharedMinutes(
  merged: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): (OverUnderMinuteSnapshot & { half: MatchHalf })[] {
  const h2Mins = new Set(
    merged.filter((r) => r.half === 2 && r.minute >= 45).map((r) => r.minute),
  );
  if (h2Mins.size === 0) return merged;
  return merged.filter((r) => !(r.half === 1 && r.minute >= 45 && h2Mins.has(r.minute)));
}

/**
 * Mỗi (hiệp, phút) giữ snapshot có **giá Tài (`over`) thấp nhất** trong phút đó
 * (mọi tick / mọi line trong phút — nến biểu đồ dùng giá này).
 * Cùng over → giữ tick sau (handicap/under mới hơn).
 */
export function dedupeOverUnderByLowestOver(
  rows: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): (OverUnderMinuteSnapshot & { half: MatchHalf })[] {
  const out: (OverUnderMinuteSnapshot & { half: MatchHalf })[] = [];
  for (const arr of groupOuByHalfMinute(rows).values()) {
    let best = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const r = arr[i];
      if (r.over < best.over - 1e-9) best = r;
      else if (Math.abs(r.over - best.over) < 1e-9) best = r; // cùng giá → tick sau
    }
    out.push(best);
  }
  return sortOuByHalfMinute(out);
}

/**
 * Mỗi (hiệp, phút) giữ snapshot có **giá Tài (`over`) cao nhất** trong phút đó
 * (nến biểu đồ Tài peak). Cùng over → giữ tick sau.
 */
export function dedupeOverUnderByHighestOver(
  rows: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): (OverUnderMinuteSnapshot & { half: MatchHalf })[] {
  const out: (OverUnderMinuteSnapshot & { half: MatchHalf })[] = [];
  for (const arr of groupOuByHalfMinute(rows).values()) {
    let best = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const r = arr[i];
      if (r.over > best.over + 1e-9) best = r;
      else if (Math.abs(r.over - best.over) < 1e-9) best = r; // cùng giá → tick sau
    }
    out.push(best);
  }
  return sortOuByHalfMinute(out);
}

/**
 * Mỗi (hiệp, phút) giữ snapshot có **giá Xỉu (`under`) cao nhất** trong phút đó
 * (nến biểu đồ Xỉu). Cùng under → giữ tick sau.
 */
export function dedupeOverUnderByHighestUnder(
  rows: (OverUnderMinuteSnapshot & { half: MatchHalf })[],
): (OverUnderMinuteSnapshot & { half: MatchHalf })[] {
  const out: (OverUnderMinuteSnapshot & { half: MatchHalf })[] = [];
  for (const arr of groupOuByHalfMinute(rows).values()) {
    let best = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const r = arr[i];
      if (r.under > best.under + 1e-9) best = r;
      else if (Math.abs(r.under - best.under) < 1e-9) best = r; // cùng giá → tick sau
    }
    out.push(best);
  }
  return sortOuByHalfMinute(out);
}

/**
 * Gộp lịch sử cũ + fetch mới: mỗi (half, phút) giữ giá Tài thấp nhất từng thấy.
 * Fetch sau có giá cao hơn ở cùng phút → không ghi đè nến.
 * Khi phút ≥45 đã có bản H2: bỏ bản H1 trùng phút (tránh đầu H2 còn kẹt trên biểu đồ H1).
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
  return preferH2OverStaleH1OnSharedMinutes(dedupeOverUnderByLowestOver(tagged));
}

/**
 * Gộp lịch sử cũ + fetch mới: mỗi (half, phút) giữ giá Tài cao nhất từng thấy.
 * Fetch sau có giá thấp hơn ở cùng phút → không ghi đè nến peak.
 */
export function mergeOuSnapshotsKeepHighestOver(
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
  return preferH2OverStaleH1OnSharedMinutes(dedupeOverUnderByHighestOver(tagged));
}

/**
 * Gộp lịch sử cũ + fetch mới: mỗi (half, phút) giữ giá Xỉu cao nhất từng thấy.
 * Fetch sau có giá thấp hơn ở cùng phút → không ghi đè nến Xỉu.
 */
export function mergeOuSnapshotsKeepHighestUnder(
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
  return preferH2OverStaleH1OnSharedMinutes(dedupeOverUnderByHighestUnder(tagged));
}

/**
 * Chuẩn hóa lịch sử Tài/Xỉu: gán hiệp (H1 vs H2 tách 45'), gộp trùng (half+phút).
 * Mặc định mỗi phút giữ **giá Tài thấp nhất**.
 * `highestOver` = nến Tài peak; `highestUnder` = nến Xỉu.
 * `matchTimer`: nếu API chỉ trả mốc H2 mà không có chuỗi phút lùi, gán cả dải sang hiệp 2.
 */
export function normalizeOverUnderSnapshots(
  items: OddsItem[] | undefined,
  marketId: '1_3' | '1_6',
  options?: {
    matchTimer?: MatchInfo['timer'];
    /** `lowestOver` (mặc định) = nến Tài đáy; `highestOver` = nến Tài đỉnh; `highestUnder` = nến Xỉu. */
    minutePick?: 'lowestOver' | 'highestOver' | 'highestUnder';
  },
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
  // Giữ mọi tick qua bước gán hiệp; chỉ gộp 1 lần cuối theo cực trị chọn.
  let rows = assignHalfByChronologicalMinutes(stripped) as (OverUnderMinuteSnapshot & {
    half: MatchHalf;
  })[];
  rows = splitHalfByMinuteWhenSecondHalfTimer(rows, options?.matchTimer, keepAllHalfMinuteRows);
  if (marketId === '1_3') {
    rows = splitHalfByMinuteWhenClockInSecondHalfButTTWrong(
      rows,
      options?.matchTimer,
      keepAllHalfMinuteRows,
    );
  }
  if (marketId === '1_6') {
    rows = rows.map((r) => ({ ...r, half: 1 as MatchHalf }));
  }
  if (options?.minutePick === 'highestUnder') return dedupeOverUnderByHighestUnder(rows);
  if (options?.minutePick === 'highestOver') return dedupeOverUnderByHighestOver(rows);
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
