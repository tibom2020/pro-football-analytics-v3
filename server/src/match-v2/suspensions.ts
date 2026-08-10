import type { RawOddsRecord, SuspensionEvent } from './types.js';

function isLocked(v: unknown): boolean {
  return v === '-' || v === '—' || v === '';
}

/** Bản ghi khoá cược: over/under hoặc home/away là "-". */
export function isSuspendedRecord(r: RawOddsRecord): boolean {
  const ouLocked =
    (r.over_od != null || r.under_od != null) &&
    (isLocked(r.over_od) || isLocked(r.under_od));
  const ahLocked =
    (r.home_od != null || r.away_od != null) &&
    (isLocked(r.home_od) || isLocked(r.away_od));
  return ouLocked || ahLocked;
}

/**
 * Danh sách khoá cược (theo thứ tự xuất hiện sau khi sort add_time).
 * Không gom theo phút — mỗi bản ghi khoá là một mục.
 */
export function buildSuspensions(records: RawOddsRecord[]): SuspensionEvent[] {
  const suspended = records.filter(isSuspendedRecord);
  suspended.sort((a, b) => {
    const da = Number(a.add_time);
    const db = Number(b.add_time);
    const na = Number.isFinite(da) ? da : 0;
    const nb = Number.isFinite(db) ? db : 0;
    return na - nb;
  });
  return suspended.map((r) => ({
    add_time: Number(r.add_time) || 0,
    time_str: r.time_str != null ? String(r.time_str) : null,
    market: String(r.market),
    ss: r.ss != null ? String(r.ss) : null,
  }));
}
