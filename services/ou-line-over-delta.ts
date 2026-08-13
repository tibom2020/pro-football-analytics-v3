const LINE_EPS = 0.001;

export type OuOverLineDropPoint = {
  minute: number;
  handicap: number;
  over: number;
};

export type OuOverLineDropDelta = {
  /** Phút nến đầu line mới (thấp hơn). */
  minute: number;
  /** Δ = over đầu line mới − over cuối line cũ (đã round 3 chữ số). */
  delta: number;
  prevHandicap: number;
  newHandicap: number;
  prevOver: number;
  newOver: number;
};

export function roundOdds3(n: number): number {
  return Number(n.toFixed(3));
}

/** Nhãn chart: Δ−0.130 / Δ+0.050 / Δ0.000 */
export function formatOuOverLineDropDeltaLabel(delta: number): string {
  const r = roundOdds3(delta);
  if (Object.is(r, -0) || r === 0) return 'Δ0.000';
  const abs = Math.abs(r).toFixed(3);
  if (r > 0) return `Δ+${abs}`;
  return `Δ−${abs}`;
}

/**
 * Khi line OU giảm giữa 2 điểm liền kề: Δ = over(line mới) − over(line cũ).
 * Chỉ báo line giảm; line tăng / đứng bỏ qua.
 */
export function detectOuOverLineDropDeltas(
  rows: readonly OuOverLineDropPoint[],
): OuOverLineDropDelta[] {
  if (rows.length < 2) return [];

  const sorted = [...rows].sort((a, b) => a.minute - b.minute);
  const out: OuOverLineDropDelta[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (!Number.isFinite(prev.handicap) || !Number.isFinite(curr.handicap)) continue;
    if (!Number.isFinite(prev.over) || !Number.isFinite(curr.over)) continue;
    if (!(curr.handicap < prev.handicap - LINE_EPS)) continue;

    out.push({
      minute: curr.minute,
      delta: roundOdds3(curr.over - prev.over),
      prevHandicap: prev.handicap,
      newHandicap: curr.handicap,
      prevOver: prev.over,
      newOver: curr.over,
    });
  }

  return out;
}
