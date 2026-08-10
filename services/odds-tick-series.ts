import type { MatchInfo } from '../types';
import { effectiveHandicapAH, effectiveLineOU } from './effective-line';
import {
  assignHalfByChronologicalMinutes,
  keepAllHalfMinuteRows,
  splitHalfByMinuteWhenClockInSecondHalfButTTWrong,
  splitHalfByMinuteWhenSecondHalfTimer,
  type MatchHalf,
} from './matchTimeline';

export type RawTick = {
  market: string;
  id: string;
  add_time: string;
  time_str: string | null;
  ss: string | null;
  handicap: string;
  over_od?: string;
  under_od?: string;
  home_od?: string;
  away_od?: string;
};

export type Tick = {
  t: number;
  minute: number;
  minuteFrac: number;
  half: 1 | 2;
  score: [number, number];
  handicap: number;
  eff: number | null;
  suspended: boolean;
  id: string;
  /** Giữ nguyên chuỗi handicap (vd. kèo chéo) cho tooltip Phase sau. */
  handicapRaw: string;
  overOd?: string;
  underOd?: string;
  homeOd?: string;
  awayOd?: string;
  market: string;
};

const P_MIN = 0.4;
const P_MAX = 0.6;

type BuiltRow = {
  t: number;
  minute: number;
  score: [number, number];
  handicap: number;
  eff: number | null;
  suspended: boolean;
  id: string;
  handicapRaw: string;
  overOd?: string;
  underOd?: string;
  homeOd?: string;
  awayOd?: string;
  market: string;
  _fromSs: boolean;
  half?: 1 | 2;
  minuteFrac?: number;
};

/**
 * Kèo chéo `"2.0,2.5"` → trung bình 2.25.
 * Không dùng parseFloat trên cả chuỗi (sẽ cắt thành 2.0).
 */
export function parseHandicap(s: string): number {
  const parts = String(s)
    .split(',')
    .map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return NaN;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function parseOddsNumber(s: string | undefined): number | null {
  if (s === undefined || s === null || s === '' || s === '-') return null;
  const v = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function impliedP(a: number, b: number): number | null {
  if (!(a > 0) || !(b > 0)) return null;
  const invA = 1 / a;
  const invB = 1 / b;
  const denom = invA + invB;
  if (!(denom > 0) || !Number.isFinite(denom)) return null;
  return invA / denom;
}

function pInBand(p: number | null): boolean {
  return p != null && p >= P_MIN && p <= P_MAX;
}

function parseScore(ss: string | null | undefined): [number, number] | null {
  if (ss == null || ss === '') return null;
  const m = String(ss).trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

/**
 * Vị trí trong phút suy từ add_time (Unix ms), không phải giây thi đấu thật.
 * Nếu API sau có timer.ts thì thay bằng giá trị thật.
 */
export function assignMinuteFrac<T extends { t: number; minute: number; half: 1 | 2 }>(
  ticks: T[],
): (T & { minuteFrac: number })[] {
  if (ticks.length === 0) return [];

  const groups = new Map<string, T[]>();
  for (const tick of ticks) {
    const key = `${tick.half}:${tick.minute}`;
    const list = groups.get(key);
    if (list) list.push(tick);
    else groups.set(key, [tick]);
  }

  const fracByRef = new Map<T, number>();
  for (const list of groups.values()) {
    const minute = list[0]!.minute;
    if (list.length === 1) {
      fracByRef.set(list[0]!, minute + 0.5);
      continue;
    }
    let tMin = Infinity;
    for (const row of list) {
      if (row.t < tMin) tMin = row.t;
    }
    for (const row of list) {
      const raw = minute + (row.t - tMin) / 60_000;
      const clamped = Math.min(minute + 0.98, Math.max(minute, raw));
      fracByRef.set(row, clamped);
    }
  }

  return ticks.map((tick) => ({
    ...tick,
    minuteFrac: fracByRef.get(tick) ?? tick.minute + 0.5,
  }));
}

function buildOne(raw: RawTick, mode: 'ou' | 'ah'): BuiltRow | null {
  const addSec = Number(raw.add_time);
  if (!Number.isFinite(addSec)) return null;
  const t = addSec * 1000;

  const handicap = parseHandicap(raw.handicap);
  if (!Number.isFinite(handicap)) return null;

  const suspended = mode === 'ou' ? raw.over_od === '-' : raw.home_od === '-';

  let eff: number | null = null;
  if (!suspended) {
    if (mode === 'ou') {
      const over = parseOddsNumber(raw.over_od);
      const under = parseOddsNumber(raw.under_od);
      if (over != null && under != null) {
        const p = impliedP(over, under);
        if (pInBand(p)) {
          eff = effectiveLineOU({ handicap, over, under });
        }
      }
    } else {
      const home = parseOddsNumber(raw.home_od);
      const away = parseOddsNumber(raw.away_od);
      if (home != null && away != null) {
        const p = impliedP(home, away);
        if (pInBand(p)) {
          eff = effectiveHandicapAH({ handicap, home, away });
        }
      }
    }
  }

  const fromSs = parseScore(raw.ss);
  const timeStr = raw.time_str;
  const isPrematch = timeStr == null || timeStr === '';
  const minute = isPrematch ? -1 : parseInt(String(timeStr), 10);
  if (!isPrematch && !Number.isFinite(minute)) return null;

  return {
    t,
    minute: isPrematch ? -1 : minute,
    score: fromSs ?? [0, 0],
    handicap,
    eff: suspended ? null : eff,
    suspended,
    id: raw.id,
    handicapRaw: raw.handicap,
    overOd: raw.over_od,
    underOd: raw.under_od,
    homeOd: raw.home_od,
    awayOd: raw.away_od,
    market: raw.market,
    _fromSs: fromSs != null,
  };
}

function dedupeByIdKeepFirst(rows: BuiltRow[]): BuiltRow[] {
  const seen = new Set<string>();
  const out: BuiltRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function applyScoreForwardFill(rows: BuiltRow[]): BuiltRow[] {
  let last: [number, number] = [0, 0];
  return rows.map((row) => {
    if (row._fromSs) {
      last = row.score;
      return row;
    }
    return { ...row, score: [...last] as [number, number] };
  });
}

function toTick(row: BuiltRow & { half: 1 | 2; minuteFrac: number }): Tick {
  return {
    t: row.t,
    minute: row.minute,
    minuteFrac: row.minuteFrac,
    half: row.half,
    score: row.score,
    handicap: row.handicap,
    eff: row.eff,
    suspended: row.suspended,
    id: row.id,
    handicapRaw: row.handicapRaw,
    overOd: row.overOd,
    underOd: row.underOd,
    homeOd: row.homeOd,
    awayOd: row.awayOd,
    market: row.market,
  };
}

/**
 * Chuẩn hoá RawTick → in-play + prematch.
 * Prematch không vẽ lên biểu đồ trận.
 * Gán hiệp giống nến OU/AH: chronological + tách theo timer (đồng hồ liên tục H2).
 */
export function normalizeRawTicks(
  raw: RawTick[],
  mode: 'ou' | 'ah',
  options?: { matchTimer?: MatchInfo['timer']; market?: string },
): { inPlay: Tick[]; prematch: Tick[] } {
  const built: BuiltRow[] = [];
  for (const row of raw) {
    const one = buildOne(row, mode);
    if (one) built.push(one);
  }

  built.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const deduped = dedupeByIdKeepFirst(built);
  const filled = applyScoreForwardFill(deduped);

  const preRaw: BuiltRow[] = [];
  const inRaw: BuiltRow[] = [];
  for (const row of filled) {
    if (row.minute < 0) preRaw.push(row);
    else inRaw.push(row);
  }

  let withHalf = assignHalfByChronologicalMinutes(inRaw) as (BuiltRow & { half: MatchHalf })[];
  withHalf = splitHalfByMinuteWhenSecondHalfTimer(
    withHalf,
    options?.matchTimer,
    keepAllHalfMinuteRows,
  );
  const market = options?.market;
  // Full-match markets: sửa tt sai + đồng hồ liên tục (giống oddsNormalize 1_3 / 1_2).
  if (market === '1_3' || market === '1_2' || market == null) {
    withHalf = splitHalfByMinuteWhenClockInSecondHalfButTTWrong(
      withHalf,
      options?.matchTimer,
      keepAllHalfMinuteRows,
    );
  }
  // Kèo hiệp 1 luôn half=1.
  if (market === '1_6' || market === '1_5') {
    withHalf = withHalf.map((r) => ({ ...r, half: 1 as MatchHalf }));
  }

  const withFrac = assignMinuteFrac(withHalf);

  const inPlay = withFrac.map((row) => toTick(row));

  const prematch = preRaw.map((row) =>
    toTick({
      ...row,
      half: 1,
      minuteFrac: 0,
    }),
  );

  return { inPlay, prematch };
}
