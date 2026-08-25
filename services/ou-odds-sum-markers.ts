/** Tổng odds Tài + Xỉu (hoặc Nhà + Khách) cần ghi chú trên chart. */
export const OU_ODDS_SUM_HIGHLIGHT = 3.83;

/** Sai số làm tròn float (±0.005 quanh 3.83). */
export const OU_ODDS_SUM_HIGHLIGHT_TOLERANCE = 0.005;

export type TwoWayOddsPoint = {
  minute: number;
  sideA: number;
  sideB: number;
};

export type OddsSumDeviationMarker = {
  minute: number;
  label: string;
  sum: number;
};

export function twoWayOddsSum(sideA: number, sideB: number): number | null {
  if (!(sideA > 0) || !(sideB > 0)) return null;
  const sum = sideA + sideB;
  return Number.isFinite(sum) ? sum : null;
}

export function isHighlightedTwoWayOddsSum(
  sum: number,
  target = OU_ODDS_SUM_HIGHLIGHT,
  tolerance = OU_ODDS_SUM_HIGHLIGHT_TOLERANCE,
): boolean {
  return Math.abs(sum - target) <= tolerance;
}

/** Nhãn chip trên chart — vd. Σ3.83 · 4' */
export function formatOddsSumHighlightLabel(sum: number, minuteCount: number): string {
  const base = `Σ${sum.toFixed(2)}`;
  return minuteCount > 1 ? `${base} · ${minuteCount}'` : base;
}

/**
 * Gom các phút liên tiếp có tổng ≈ 3.83 → một chip trên timeline.
 */
export function computeOddsSumHighlightMarkers(
  rows: readonly TwoWayOddsPoint[],
  opts?: { target?: number; tolerance?: number },
): OddsSumDeviationMarker[] {
  const target = opts?.target ?? OU_ODDS_SUM_HIGHLIGHT;
  const tolerance = opts?.tolerance ?? OU_ODDS_SUM_HIGHLIGHT_TOLERANCE;

  const sorted = [...rows]
    .filter(
      (r) =>
        typeof r.minute === 'number' &&
        Number.isFinite(r.minute) &&
        Number.isFinite(r.sideA) &&
        Number.isFinite(r.sideB),
    )
    .sort((a, b) => a.minute - b.minute);

  const out: OddsSumDeviationMarker[] = [];

  let runStart: number | null = null;
  let runEnd: number | null = null;
  let runSum = 0;

  const flush = () => {
    if (runStart == null || runEnd == null) return;
    const count = runEnd - runStart + 1;
    out.push({
      minute: (runStart + runEnd) / 2,
      sum: runSum,
      label: formatOddsSumHighlightLabel(runSum, count),
    });
    runStart = null;
    runEnd = null;
    runSum = 0;
  };

  for (const row of sorted) {
    const sum = twoWayOddsSum(row.sideA, row.sideB);
    if (sum == null || !isHighlightedTwoWayOddsSum(sum, target, tolerance)) {
      flush();
      continue;
    }
    if (runEnd != null && row.minute === runEnd + 1) {
      runEnd = row.minute;
      continue;
    }
    flush();
    runStart = row.minute;
    runEnd = row.minute;
    runSum = sum;
  }
  flush();

  return out;
}

export function computeOuOddsSumDeviationMarkers(
  rows: readonly Array<{ minute: number; over: number; under: number }>,
  opts?: { target?: number; tolerance?: number },
): OddsSumDeviationMarker[] {
  return computeOddsSumHighlightMarkers(
    rows.map((r) => ({ minute: r.minute, sideA: r.over, sideB: r.under })),
    opts,
  );
}

export function computeAhOddsSumDeviationMarkers(
  rows: readonly Array<{ minute: number; home: number; away: number }>,
  opts?: { target?: number; tolerance?: number },
): OddsSumDeviationMarker[] {
  return computeOddsSumHighlightMarkers(
    rows.map((r) => ({ minute: r.minute, sideA: r.home, sideB: r.away })),
    opts,
  );
}
