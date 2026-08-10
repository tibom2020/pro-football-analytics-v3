import type { OddsItem } from '../types';
import type { RawTick, Tick } from './odds-tick-series';

/** Legacy: trung vị biên độ 1 trận mẫu — UI strip dùng TB live; hằng này chỉ còn làm sàn domain. */
export const TYPICAL_MINUTE_RANGE = 0.03;

/** Zoom nến khi khoảng hiển thị vượt ngưỡng này (phút). */
export const CANDLE_ZOOM_SPAN_MINUTES = 30;

export function oddsItemsToRawTicks(
  items: OddsItem[] | undefined,
  market: string,
  ss: string | null,
): RawTick[] {
  if (!items?.length) return [];
  const out: RawTick[] = [];
  for (const item of items) {
    if (item.id == null || item.id === '') continue;
    out.push({
      market,
      id: String(item.id),
      add_time: String(item.add_time ?? ''),
      time_str: item.time_str == null || item.time_str === '' ? null : String(item.time_str),
      ss,
      handicap: String(item.handicap ?? ''),
      over_od: item.over_od,
      under_od: item.under_od,
      home_od: item.home_od,
      away_od: item.away_od,
    });
  }
  return out;
}

/** Gộp nhiều nguồn RawTick theo id — giữ bản đầu gặp. */
export function mergeRawTicksById(...sources: RawTick[][]): RawTick[] {
  const map = new Map<string, RawTick>();
  for (const src of sources) {
    for (const row of src) {
      if (!row.id || map.has(row.id)) continue;
      map.set(row.id, row);
    }
  }
  return [...map.values()];
}

export type MinuteAgg = {
  half: 1 | 2;
  minute: number;
  /** Tâm cột trên trục minuteFrac. */
  minuteFrac: number;
  range: number;
  tickCount: number;
  /** Phút có bàn thắng (ss đổi tăng) — không phải tín hiệu dự báo. */
  hasGoal: boolean;
  /** Phút 45 hoặc phút cuối hiệp 2 — nhà cái viết lại kèo. */
  isHalfBoundary: boolean;
};

export type ScoreEventMark = {
  half: 1 | 2;
  minuteFrac: number;
  score: [number, number];
  kind: 'goal' | 'disallowed';
  label: string;
};

export type SuspendedBand = {
  half: 1 | 2;
  x1: number;
  x2: number;
};

export type HandicapChangeMark = {
  half: 1 | 2;
  minuteFrac: number;
  from: number;
  to: number;
  fromRaw: string;
  toRaw: string;
};

export type TickChartPoint = {
  minuteFrac: number;
  half: 1 | 2;
  minute: number;
  t: number;
  eff: number | null;
  suspended: boolean;
  handicap: number;
  handicapRaw: string;
  score: [number, number];
  overOd?: string;
  underOd?: string;
  homeOd?: string;
  awayOd?: string;
  id: string;
  /** ms tới tick trước (cùng half) — chấm to nếu < 5000. */
  dtPrevMs: number | null;
  burst: boolean;
};

export type EffCandle = {
  minuteFrac: number;
  half: 1 | 2;
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function normalizeScore(s: [number, number] | null | undefined): [number, number] {
  if (!s || !Array.isArray(s)) return [0, 0];
  const a = Number(s[0]);
  const b = Number(s[1]);
  return [Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0];
}

function scoreTotal(s: [number, number] | null | undefined): number {
  const [a, b] = normalizeScore(s);
  return a + b;
}

/** Sự kiện bàn / huỷ từ chuỗi ss (không dùng bảng sự kiện cũ). */
export function detectScoreEvents(ticks: Tick[]): ScoreEventMark[] {
  const marks: ScoreEventMark[] = [];
  let prev: [number, number] | null = null;
  for (const tick of ticks) {
    const cur = normalizeScore(tick.score);
    if (prev == null) {
      prev = cur;
      continue;
    }
    const d = scoreTotal(cur) - scoreTotal(prev);
    if (d > 0) {
      marks.push({
        half: tick.half,
        minuteFrac: tick.minuteFrac,
        score: cur,
        kind: 'goal',
        label: `${cur[0]}-${cur[1]}`,
      });
    } else if (d < 0) {
      marks.push({
        half: tick.half,
        minuteFrac: tick.minuteFrac,
        score: cur,
        kind: 'disallowed',
        label: `Huỷ → ${cur[0]}-${cur[1]}`,
      });
    }
    prev = cur;
  }
  return marks;
}

export function buildSuspendedBands(ticks: Tick[]): SuspendedBand[] {
  const bands: SuspendedBand[] = [];
  let start: Tick | null = null;
  let lastSus: Tick | null = null;

  const flush = () => {
    if (start && lastSus) {
      bands.push({
        half: start.half,
        x1: start.minuteFrac,
        x2: Math.max(lastSus.minuteFrac, start.minuteFrac + 0.02),
      });
    }
    start = null;
    lastSus = null;
  };

  for (const tick of ticks) {
    if (tick.suspended) {
      if (!start || start.half !== tick.half) {
        flush();
        start = tick;
      }
      lastSus = tick;
    } else if (start) {
      // kết thúc vùng khoá tại tick có odds trở lại
      bands.push({
        half: start.half,
        x1: start.minuteFrac,
        x2: tick.minuteFrac,
      });
      start = null;
      lastSus = null;
    }
  }
  flush();
  return bands;
}

export function detectHandicapChanges(ticks: Tick[]): HandicapChangeMark[] {
  const marks: HandicapChangeMark[] = [];
  let prev: Tick | null = null;
  for (const tick of ticks) {
    if (prev && prev.half === tick.half && prev.handicap !== tick.handicap) {
      marks.push({
        half: tick.half,
        minuteFrac: tick.minuteFrac,
        from: prev.handicap,
        to: tick.handicap,
        fromRaw: prev.handicapRaw,
        toRaw: tick.handicapRaw,
      });
    }
    prev = tick;
  }
  return marks;
}

export function buildTickChartPoints(ticks: Tick[]): TickChartPoint[] {
  const out: TickChartPoint[] = [];
  const prevByHalf: Partial<Record<1 | 2, Tick>> = {};
  for (const tick of ticks) {
    const prev = prevByHalf[tick.half];
    const dtPrevMs = prev ? tick.t - prev.t : null;
    out.push({
      minuteFrac: tick.minuteFrac,
      half: tick.half,
      minute: tick.minute,
      t: tick.t,
      eff: tick.eff,
      suspended: tick.suspended,
      handicap: tick.handicap,
      handicapRaw: tick.handicapRaw,
      score: normalizeScore(tick.score),
      overOd: tick.overOd,
      underOd: tick.underOd,
      homeOd: tick.homeOd,
      awayOd: tick.awayOd,
      id: tick.id,
      dtPrevMs,
      burst: dtPrevMs != null && dtPrevMs < 5000,
    });
    prevByHalf[tick.half] = tick;
  }
  return out;
}

/**
 * Chèn null giữa hai hiệp để Line không nối xuyên giờ nghỉ.
 */
export function withHalfGapNulls(points: TickChartPoint[]): TickChartPoint[] {
  if (points.length === 0) return [];
  const out: TickChartPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (i > 0 && points[i - 1]!.half !== p.half) {
      out.push({
        ...p,
        minuteFrac: points[i - 1]!.minuteFrac,
        eff: null,
        suspended: false,
        id: `__gap_${i}`,
        burst: false,
        dtPrevMs: null,
      });
    }
    out.push(p);
  }
  return out;
}

export function buildMinuteAggs(ticks: Tick[]): MinuteAgg[] {
  const goalMinutes = new Set<string>();
  for (const ev of detectScoreEvents(ticks)) {
    if (ev.kind === 'goal') {
      const minute = Math.floor(ev.minuteFrac);
      goalMinutes.add(`${ev.half}:${minute}`);
    }
  }

  const groups = new Map<string, Tick[]>();
  for (const tick of ticks) {
    const key = `${tick.half}:${tick.minute}`;
    const list = groups.get(key);
    if (list) list.push(tick);
    else groups.set(key, [tick]);
  }

  let maxH2Minute = -1;
  for (const tick of ticks) {
    if (tick.half === 2 && tick.minute > maxH2Minute) maxH2Minute = tick.minute;
  }

  const aggs: MinuteAgg[] = [];
  for (const list of groups.values()) {
    const half = list[0]!.half;
    const minute = list[0]!.minute;
    const effs = list.map((t) => t.eff).filter((e): e is number => e != null);
    const range = effs.length >= 2 ? Math.max(...effs) - Math.min(...effs) : 0;
    const isHalfBoundary =
      minute === 45 || (half === 2 && maxH2Minute >= 0 && minute === maxH2Minute);
    aggs.push({
      half,
      minute,
      minuteFrac: minute + 0.5,
      range,
      tickCount: list.length,
      hasGoal: goalMinutes.has(`${half}:${minute}`),
      isHalfBoundary,
    });
  }

  aggs.sort((a, b) => a.half - b.half || a.minute - b.minute);
  return aggs;
}

/** Nến OHLC theo phút từ tick (chỉ khi zoom xa). */
export function buildEffCandles(ticks: Tick[]): EffCandle[] {
  const groups = new Map<string, Tick[]>();
  for (const tick of ticks) {
    if (tick.eff == null) continue;
    const key = `${tick.half}:${tick.minute}`;
    const list = groups.get(key);
    if (list) list.push(tick);
    else groups.set(key, [tick]);
  }
  const candles: EffCandle[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.t - b.t);
    const values = sorted.map((t) => t.eff!);
    candles.push({
      half: sorted[0]!.half,
      minute: sorted[0]!.minute,
      minuteFrac: sorted[0]!.minute + 0.5,
      open: values[0]!,
      high: Math.max(...values),
      low: Math.min(...values),
      close: values[values.length - 1]!,
    });
  }
  candles.sort((a, b) => a.half - b.half || a.minute - b.minute);
  return candles;
}

export function xSpanMinutes(ticks: Tick[]): number {
  if (ticks.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const t of ticks) {
    if (t.minuteFrac < min) min = t.minuteFrac;
    if (t.minuteFrac > max) max = t.minuteFrac;
  }
  return max - min;
}

export function filterTicksByHalf(ticks: Tick[], half: 1 | 2 | 'all'): Tick[] {
  if (half === 'all') return ticks;
  return ticks.filter((t) => t.half === half);
}
