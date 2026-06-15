/**
 * Pure function tính lãi/lỗ (Profit & Loss) cho một vé cược dựa trên kết quả.
 *
 * Quy ước số liệu:
 *  - `stake`         : số tiền đã cược (đơn vị tuỳ user — VND/USD/…), > 0.
 *  - `odds`          : tỷ lệ ăn theo định dạng decimal (1.95 nghĩa là cược 1
 *                      thắng nhận về 1.95 → lãi ròng 0.95 × stake).
 *  - `result`        : kết quả chuẩn hoá (xem `BetResult`).
 *
 * Quy ước trả về:
 *  - Số dương  → lãi ròng (đã trừ tiền cược; chỉ là phần lời).
 *  - Số âm     → lỗ ròng (số tiền mất).
 *  - 0         → hoà / hoàn cược / dữ liệu không hợp lệ.
 *
 * Các nhánh `won_half` / `lost_half` ứng với kèo châu Á 1/4, 3/4 nửa thắng /
 * nửa thua — đồng nhất với UI Việt hoá ("Thắng 1/2", "Thua 1/2").
 */

export type BetResult =
  | 'won'
  | 'lost'
  | 'push'
  | 'won_half'
  | 'lost_half';

const VALID_RESULTS: ReadonlySet<BetResult> = new Set([
  'won',
  'lost',
  'push',
  'won_half',
  'lost_half',
]);

export function isBetResult(v: unknown): v is BetResult {
  return typeof v === 'string' && VALID_RESULTS.has(v as BetResult);
}

export function calculatePnL(
  stake: number,
  odds: number,
  result: BetResult,
): number {
  if (!Number.isFinite(stake) || !Number.isFinite(odds)) return 0;
  if (stake <= 0 || odds <= 0) return 0;

  switch (result) {
    case 'won':
      return round2(stake * (odds - 1));
    case 'lost':
      return round2(-stake);
    case 'push':
      return 0;
    case 'won_half':
      return round2((stake * (odds - 1)) / 2);
    case 'lost_half':
      return round2(-stake / 2);
    default:
      return 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
