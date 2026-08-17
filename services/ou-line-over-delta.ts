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

export type OuOverLineRunAvg = {
  handicap: number;
  minuteStart: number;
  minuteEnd: number;
  minuteCount: number;
  avgOver: number;
};

/** Chip: `1.25 TB 1.825 · 4'` */
export function formatOuOverLineRunAvgLabel(
  run: Pick<OuOverLineRunAvg, 'handicap' | 'avgOver' | 'minuteCount'>,
): string {
  const h = Number(run.handicap.toFixed(2));
  const hStr = Number.isInteger(h) ? h.toFixed(0) : String(h);
  return `${hStr} TB ${run.avgOver.toFixed(3)} · ${run.minuteCount}'`;
}

/**
 * TB Tài từng đoạn line liền kề: tổng over ÷ số phút (round 3).
 * Cùng HDP nhưng bị cắt bởi line khác → 2 đoạn riêng.
 */
export function computeOuOverLineRunAvgs(
  rows: readonly OuOverLineDropPoint[],
): OuOverLineRunAvg[] {
  const valid = rows.filter(
    (r) =>
      Number.isFinite(r.minute) &&
      Number.isFinite(r.handicap) &&
      Number.isFinite(r.over),
  );
  if (valid.length === 0) return [];

  const sorted = [...valid].sort((a, b) => a.minute - b.minute);
  const out: OuOverLineRunAvg[] = [];

  let start = sorted[0]!;
  let sum = start.over;
  let count = 1;
  let last = start;

  const flush = () => {
    out.push({
      handicap: start.handicap,
      minuteStart: start.minute,
      minuteEnd: last.minute,
      minuteCount: count,
      avgOver: roundOdds3(sum / count),
    });
  };

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i]!;
    if (Math.abs(curr.handicap - start.handicap) <= LINE_EPS) {
      sum += curr.over;
      count += 1;
      last = curr;
      continue;
    }
    flush();
    start = curr;
    sum = curr.over;
    count = 1;
    last = curr;
  }
  flush();
  return out;
}
