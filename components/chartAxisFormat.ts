/** Nhãn trục X — số phút trận (dùng chung MomentumChart / OddsDropChart). */
export function formatMinuteAxisTick(v: number | string): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return '';
  return `${Math.round(n)}'`;
}
