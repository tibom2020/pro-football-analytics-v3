import type { OverUnderMinuteSnapshot, ProcessedStats } from '../types';
import {
  computeOuOverLineRunAvgs,
  detectOuOverLineDropDeltas,
  formatOuOverLineDropDeltaLabel,
  roundOdds3,
  type OuOverLineRunAvg,
} from './ou-line-over-delta';
import { halfPeriodShotTotalsAt, type OuMarketId } from './ou-line-drop-alert';

const LINE_EPS = 0.001;

export type OuChartPriceKind = 'low' | 'high';

export type OuLineDropHighlight = {
  market: OuMarketId;
  prevHandicap: number;
  newHandicap: number;
  minute: number;
  /** Δ over của tip (thường = chart thấp nhất) — fallback khi series cao nhất chưa đổi line. */
  overDelta?: number;
};

function formatHandicap(h: number): string {
  const n = Number(h.toFixed(2));
  return Number.isInteger(n) ? n.toFixed(0) : String(n);
}

function filterOuByHalf(
  rows: readonly OverUnderMinuteSnapshot[],
  half: 1 | 2,
): OverUnderMinuteSnapshot[] {
  return rows.filter((r) => (r.half === 2 ? 2 : 1) === half);
}

function toDropPoints(rows: readonly OverUnderMinuteSnapshot[]) {
  return rows
    .filter(
      (r) =>
        Number.isFinite(r.minute) && Number.isFinite(r.handicap) && Number.isFinite(r.over),
    )
    .map((r) => ({ minute: r.minute, handicap: r.handicap, over: r.over }));
}

function formatStatPart(
  da: number | null,
  ot: number | null,
  shots: number | null,
): string {
  if (da == null && ot == null && shots == null) return 'DA— OT— Sút—';
  const n = (v: number | null) => (v == null ? '—' : `+${v}`);
  return `DA${n(da)} OT${n(ot)} Sút${n(shots)}`;
}

/** Stats phát sinh trong [minuteStart, minuteEnd] (cùng hiệp, không âm). */
export function linePeriodStatDelta(
  statsHistory: Record<number, ProcessedStats> | null | undefined,
  half: 1 | 2,
  minuteStart: number,
  minuteEnd: number,
): { dangerousAttacks: number | null; onTarget: number | null; totalShots: number | null } {
  const end = halfPeriodShotTotalsAt(statsHistory, half, minuteEnd);
  if (end.onTarget == null && end.dangerousAttacks == null) {
    return { dangerousAttacks: null, onTarget: null, totalShots: null };
  }
  const beforeMinute = minuteStart - 1;
  const before =
    beforeMinute >= 0
      ? halfPeriodShotTotalsAt(statsHistory, half, beforeMinute)
      : { onTarget: 0, totalShots: 0, dangerousAttacks: 0 };

  const sub = (a: number | null, b: number | null): number | null => {
    if (a == null) return null;
    const base = b == null ? 0 : b;
    return Math.max(0, a - base);
  };

  return {
    dangerousAttacks: sub(end.dangerousAttacks, before.dangerousAttacks),
    onTarget: sub(end.onTarget, before.onTarget),
    totalShots: sub(end.totalShots, before.totalShots),
  };
}

function isHighlightedRun(run: OuOverLineRunAvg, dropped?: OuLineDropHighlight): boolean {
  if (!dropped) return false;
  if (Math.abs(run.handicap - dropped.prevHandicap) > LINE_EPS) return false;
  return run.minuteEnd <= dropped.minute + 0.5;
}

function formatDeltaLine(
  minute: number,
  prevHandicap: number,
  newHandicap: number,
  delta: number | null | undefined,
): string {
  const odds =
    delta != null && Number.isFinite(delta)
      ? ` ${formatOuOverLineDropDeltaLabel(delta).replace(/^Δ/, '')}`
      : '';
  return `Δ ${minute}' ${formatHandicap(prevHandicap)}→${formatHandicap(newHandicap)}${odds}`;
}

/** Δ từ nến series; nếu series cao nhất còn giữ line cũ tại phút rớt thì vẫn ghi Δ (fallback overDelta). */
function deltasForSeries(
  pts: Array<{ minute: number; handicap: number; over: number }>,
  dropped?: OuLineDropHighlight,
): Array<{ minute: number; prevHandicap: number; newHandicap: number; delta: number | null }> {
  const fromCandles = detectOuOverLineDropDeltas(pts).map((d) => ({
    minute: d.minute,
    prevHandicap: d.prevHandicap,
    newHandicap: d.newHandicap,
    delta: d.delta,
  }));
  if (!dropped || !Number.isFinite(dropped.newHandicap)) return fromCandles;

  const already = fromCandles.some(
    (d) =>
      Math.abs(d.minute - dropped.minute) < 0.5 &&
      Math.abs(d.newHandicap - dropped.newHandicap) < LINE_EPS,
  );
  if (already) return fromCandles;

  const sorted = [...pts].sort((a, b) => a.minute - b.minute);
  const lastPrev = [...sorted]
    .reverse()
    .find(
      (p) => p.minute <= dropped.minute && Math.abs(p.handicap - dropped.prevHandicap) < LINE_EPS,
    );
  const firstNew = sorted.find(
    (p) => p.minute >= dropped.minute && Math.abs(p.handicap - dropped.newHandicap) < LINE_EPS,
  );
  let delta: number | null = null;
  if (lastPrev && firstNew) {
    delta = roundOdds3(firstNew.over - lastPrev.over);
  } else if (dropped.overDelta != null && Number.isFinite(dropped.overDelta)) {
    delta = roundOdds3(dropped.overDelta);
  }

  return [
    ...fromCandles,
    {
      minute: dropped.minute,
      prevHandicap: dropped.prevHandicap,
      newHandicap: dropped.newHandicap,
      delta,
    },
  ];
}

function formatRunLine(
  run: OuOverLineRunAvg,
  half: 1 | 2,
  statsHistory: Record<number, ProcessedStats> | null | undefined,
  dropped?: OuLineDropHighlight,
  isLastMatching?: boolean,
): string {
  const stats = linePeriodStatDelta(statsHistory, half, run.minuteStart, run.minuteEnd);
  const mark = isLastMatching && isHighlightedRun(run, dropped) ? ' (vừa rớt)' : '';
  return `${formatHandicap(run.handicap)} · ${run.minuteStart}–${run.minuteEnd}' (${run.minuteCount}') TB ${run.avgOver.toFixed(3)} · ${formatStatPart(stats.dangerousAttacks, stats.onTarget, stats.totalShots)}${mark}`;
}

function formatSeriesBlock(
  heading: string,
  rows: readonly OverUnderMinuteSnapshot[],
  half: 1 | 2,
  statsHistory: Record<number, ProcessedStats> | null | undefined,
  dropped?: OuLineDropHighlight,
): string[] {
  const pts = toDropPoints(rows);
  if (pts.length === 0) return [];
  const runs = computeOuOverLineRunAvgs(pts);
  const deltas = deltasForSeries(pts, dropped);
  const out: string[] = [`— ${heading} —`];

  let lastMatchIdx = -1;
  if (dropped) {
    for (let i = 0; i < runs.length; i++) {
      if (isHighlightedRun(runs[i]!, dropped)) lastMatchIdx = i;
    }
  }

  for (let i = 0; i < runs.length; i++) {
    out.push(formatRunLine(runs[i]!, half, statsHistory, dropped, i === lastMatchIdx));
  }
  for (const d of deltas) {
    out.push(formatDeltaLine(d.minute, d.prevHandicap, d.newHandicap, d.delta));
  }
  return out;
}

export function buildOuLineDropChartLines(opts: {
  half: 1 | 2;
  dropped?: OuLineDropHighlight;
  ou13Low: readonly OverUnderMinuteSnapshot[];
  ou13High: readonly OverUnderMinuteSnapshot[];
  ou16Low?: readonly OverUnderMinuteSnapshot[];
  ou16High?: readonly OverUnderMinuteSnapshot[];
  statsHistory?: Record<number, ProcessedStats> | null;
}): string[] {
  const { half, dropped, ou13Low, ou13High, ou16Low = [], ou16High = [], statsHistory } = opts;
  const lines: string[] = [];

  const drop13 = dropped?.market === '1_3' ? dropped : undefined;
  const drop16 = dropped?.market === '1_6' ? dropped : undefined;

  lines.push(
    ...formatSeriesBlock(
      `1_3 H${half} · thấp nhất`,
      filterOuByHalf(ou13Low, half),
      half,
      statsHistory,
      drop13,
    ),
  );
  lines.push(
    ...formatSeriesBlock(
      `1_3 H${half} · cao nhất`,
      filterOuByHalf(ou13High, half),
      half,
      statsHistory,
      drop13,
    ),
  );

  if (half === 1) {
    lines.push(
      ...formatSeriesBlock(
        '1_6 H1 · thấp nhất',
        filterOuByHalf(ou16Low, 1),
        1,
        statsHistory,
        drop16,
      ),
    );
    lines.push(
      ...formatSeriesBlock(
        '1_6 H1 · cao nhất',
        filterOuByHalf(ou16High, 1),
        1,
        statsHistory,
        drop16,
      ),
    );
  }

  return lines;
}
