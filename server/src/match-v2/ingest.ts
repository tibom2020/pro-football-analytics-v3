import type { B365OddsApiResponse, IngestOddsResult, RawOddsRecord } from './types.js';

/**
 * Gỡ bản ghi odds từ response API — giữ nguyên field/kiểu, chỉ thêm `market`.
 * Market rỗng bỏ; không parse số; không sắp xếp lại.
 */
export function flattenOddsResponse(api: B365OddsApiResponse): RawOddsRecord[] {
  const odds = api.results?.odds;
  if (!odds || typeof odds !== 'object') return [];

  const out: RawOddsRecord[] = [];
  for (const [market, items] of Object.entries(odds)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const idRaw = (item as { id?: unknown }).id;
      if (idRaw == null || idRaw === '') continue;
      out.push({
        ...(item as Record<string, unknown>),
        market,
        id: String(idRaw),
      });
    }
  }
  return out;
}

/** add_time nhỏ nhất (so sánh số) cho từng market — chỉ dùng để phát hiện cắt lịch sử. */
export function oldestAddTimeByMarket(records: RawOddsRecord[]): Record<string, string> {
  const oldest: Record<string, string> = {};
  const oldestNum: Record<string, number> = {};

  for (const r of records) {
    if (r.add_time == null || r.add_time === '') continue;
    const raw = String(r.add_time);
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const prev = oldestNum[r.market];
    if (prev === undefined || n < prev) {
      oldestNum[r.market] = n;
      oldest[r.market] = raw;
    }
  }
  return oldest;
}

/** add_time lớn nhất theo market (cho poll_log.odds_update). */
export function newestAddTimeByMarket(records: RawOddsRecord[]): Record<string, number> {
  const newest: Record<string, number> = {};
  for (const r of records) {
    if (r.add_time == null || r.add_time === '') continue;
    const n = Number(r.add_time);
    if (!Number.isFinite(n)) continue;
    const prev = newest[r.market];
    if (prev === undefined || n > prev) newest[r.market] = n;
  }
  return newest;
}

/**
 * Nếu oldest_add_time của một market tăng so với lần poll trước → API đang cắt lịch sử cũ.
 */
export function detectTruncation(
  prevOldest: Record<string, string> | undefined,
  nextOldest: Record<string, string>,
): { truncationDetected: boolean; truncatedMarkets: string[] } {
  if (!prevOldest) return { truncationDetected: false, truncatedMarkets: [] };
  const truncatedMarkets: string[] = [];
  for (const [market, nextRaw] of Object.entries(nextOldest)) {
    const prevRaw = prevOldest[market];
    if (prevRaw == null) continue;
    const prev = Number(prevRaw);
    const next = Number(nextRaw);
    if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
    if (next > prev) truncatedMarkets.push(market);
  }
  return {
    truncationDetected: truncatedMarkets.length > 0,
    truncatedMarkets,
  };
}

/**
 * Lọc bản ghi chưa có trong `writtenIds`, cập nhật Set, trả kết quả ingest.
 * Thứ tự `appended` = thứ tự xuất hiện trong response (không sort).
 */
export function selectNewOddsRecords(
  flattened: RawOddsRecord[],
  writtenIds: Set<string>,
  prevOldestAddTime?: Record<string, string>,
): IngestOddsResult {
  const appended: RawOddsRecord[] = [];
  const newRecordsByMarket: Record<string, number> = {};

  for (const row of flattened) {
    if (writtenIds.has(row.id)) continue;
    writtenIds.add(row.id);
    appended.push(row);
    newRecordsByMarket[row.market] = (newRecordsByMarket[row.market] ?? 0) + 1;
  }

  const totalRecordsByMarket: Record<string, number> = {};
  for (const row of flattened) {
    totalRecordsByMarket[row.market] = (totalRecordsByMarket[row.market] ?? 0) + 1;
  }

  const oldest = oldestAddTimeByMarket(flattened);
  const { truncationDetected, truncatedMarkets } = detectTruncation(prevOldestAddTime, oldest);

  return {
    appended,
    newRecordsByMarket,
    totalRecordsByMarket,
    oldestAddTimeByMarket: oldest,
    oddsUpdateByMarket: newestAddTimeByMarket(flattened),
    truncationDetected,
    truncatedMarkets,
  };
}
