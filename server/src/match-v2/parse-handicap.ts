/**
 * Parse handicap ở tầng phân tích (không dùng khi ghi thô).
 * - "2.5" → 2.5
 * - "2.0,2.5" → 2.25 (trung bình kèo chéo)
 * - "-0.75" → -0.75
 * - "abc" / rỗng → NaN
 */
export function parseHandicap(raw: string | null | undefined): number {
  if (raw == null) return Number.NaN;
  const s = String(raw).trim();
  if (!s || s === '-') return Number.NaN;
  if (s.includes(',')) {
    const parts = s.split(',').map((p) => Number(p.trim()));
    if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return Number.NaN;
    return parts.reduce((a, b) => a + b, 0) / parts.length;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}
