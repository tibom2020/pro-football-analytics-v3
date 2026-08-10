import type { OddsItem } from '../types';
import { assignHalfByChronologicalMinutes, type MatchHalf } from './matchTimeline';
import { K_AH, K_OU } from './effective-line-config';

export type EffectiveMarketId = '1_3' | '1_2' | '1_6' | '1_5';

type OddsTickBase = {
  /** Thứ tự sắp xếp (luôn có). */
  seq: number;
  /** Unix ms — chỉ khi có thời gian thật (vd. add_time là Unix seconds). */
  ts?: number | null;
  marketId: EffectiveMarketId;
  minute: number;
  half: 1 | 2;
  handicap: number;
  sourceId?: string;
};

/** Tick OU (`1_3` / `1_6`). */
export type OuOddsTick = OddsTickBase & {
  marketId: '1_3' | '1_6';
  over: number;
  under: number;
};

/** Tick AH (`1_2` / `1_5`). */
export type AhOddsTick = OddsTickBase & {
  marketId: '1_2' | '1_5';
  home: number;
  away: number;
};

export type OddsTick = OuOddsTick | AhOddsTick;

export type MinuteBar = {
  minute: number;
  half: 1 | 2;
  open: number;
  high: number;
  low: number;
  close: number;
  range: number;
  tickCount: number;
  handicapChanged: boolean;
  handicapFrom?: number;
  handicapTo?: number;
  /** Snapshot thô từ tick close — tooltip. AH: over=home, under=away. */
  handicap: number;
  over: number;
  under: number;
};

const MIN_MINUTE = 0;
const MAX_MINUTE = 130;

/** Unix seconds ~10 chữ số (2001–2286). Không nhân hệ số giả vào ts khi chỉ là counter. */
export function probeAddTime(
  add_time: string | number | null | undefined,
): { seq: number; ts: number | null } {
  const v = parseInt(String(add_time ?? '0'), 10);
  if (!Number.isFinite(v)) return { seq: 0, ts: null };
  const isUnixSeconds = v >= 1_000_000_000 && v <= 9_999_999_999;
  if (isUnixSeconds) return { seq: v, ts: v * 1000 };
  return { seq: v, ts: null };
}

function parseFinite(n: unknown): number | null {
  if (n === undefined || n === null || n === '') return null;
  const v = typeof n === 'number' ? n : parseFloat(String(n).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

/**
 * OU 1_3 / 1_6 — tăng = thị trường nghiêng Tài / khả năng bàn cao hơn.
 * `handicap + K_OU * (pOver - 0.5)`
 */
export function effectiveLineOU(t: {
  handicap: number;
  over: number;
  under: number;
}): number | null {
  if (!Number.isFinite(t.handicap)) return null;
  if (!(t.over > 0) || !(t.under > 0)) return null;
  const invOver = 1 / t.over;
  const invUnder = 1 / t.under;
  const denom = invOver + invUnder;
  if (!(denom > 0) || !Number.isFinite(denom)) return null;
  const pOver = invOver / denom;
  return t.handicap + K_OU * (pOver - 0.5);
}

/**
 * AH 1_2 / 1_5 — dấu trừ bắt buộc: chấp âm hơn = đội nhà được đánh giá mạnh hơn.
 * `handicap - K_AH * (pHome - 0.5)`
 */
export function effectiveHandicapAH(t: {
  handicap: number;
  home: number;
  away: number;
}): number | null {
  if (!Number.isFinite(t.handicap)) return null;
  if (!(t.home > 0) || !(t.away > 0)) return null;
  const invHome = 1 / t.home;
  const invAway = 1 / t.away;
  const denom = invHome + invAway;
  if (!(denom > 0) || !Number.isFinite(denom)) return null;
  const pHome = invHome / denom;
  return t.handicap - K_AH * (pHome - 0.5);
}

export function compareOddsTicks(a: OddsTick, b: OddsTick): number {
  const aHasTs = a.ts != null && Number.isFinite(a.ts);
  const bHasTs = b.ts != null && Number.isFinite(b.ts);
  if (aHasTs && bHasTs && a.ts !== b.ts) return (a.ts as number) - (b.ts as number);
  if (a.seq !== b.seq) return a.seq - b.seq;
  return String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? ''));
}

function dedupeKey(t: OddsTick): string {
  if (t.ts != null && Number.isFinite(t.ts)) return `ts:${t.ts}`;
  return `seq:${t.seq}:${t.sourceId ?? ''}`;
}

/** Dedup cùng ts (khi có) hoặc cùng (seq, sourceId) — giữ bản sau. */
export function dedupeOddsTicks(ticks: OddsTick[]): OddsTick[] {
  const sorted = [...ticks].sort(compareOddsTicks);
  const map = new Map<string, OddsTick>();
  for (const t of sorted) map.set(dedupeKey(t), t);
  return [...map.values()].sort(compareOddsTicks);
}

function effectiveOf(tick: OddsTick, mode: 'ou' | 'ah'): number | null {
  if (mode === 'ou') {
    if (!('over' in tick) || !('under' in tick)) return null;
    return effectiveLineOU({
      handicap: tick.handicap,
      over: tick.over,
      under: tick.under,
    });
  }
  if (!('home' in tick) || !('away' in tick)) return null;
  return effectiveHandicapAH({
    handicap: tick.handicap,
    home: tick.home,
    away: tick.away,
  });
}

function rawSides(tick: OddsTick): { over: number; under: number } {
  if ('over' in tick && 'under' in tick) {
    return { over: tick.over, under: tick.under };
  }
  return { over: tick.home, under: tick.away };
}

/**
 * Gom nến theo (minute, half). Không nội suy phút thiếu.
 * OHLC trên giá hiệu chỉnh; handicap/over/under thô lấy từ tick close.
 */
export function buildMinuteBars(ticks: OddsTick[], mode: 'ou' | 'ah'): MinuteBar[] {
  const usable: { tick: OddsTick; eff: number }[] = [];
  for (const tick of ticks) {
    const eff = effectiveOf(tick, mode);
    if (eff === null) continue;
    usable.push({ tick, eff });
  }

  const groups = new Map<string, { tick: OddsTick; eff: number }[]>();
  for (const row of usable) {
    const key = `${row.tick.half}:${row.tick.minute}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const bars: MinuteBar[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => compareOddsTicks(a.tick, b.tick));
    const values = list.map((r) => r.eff);
    const open = values[0]!;
    const close = values[values.length - 1]!;
    const high = Math.max(...values);
    const low = Math.min(...values);
    const handicaps = list.map((r) => r.tick.handicap);
    const hMin = Math.min(...handicaps);
    const hMax = Math.max(...handicaps);
    const handicapChanged = hMin !== hMax;
    const closeTick = list[list.length - 1]!.tick;
    const sides = rawSides(closeTick);
    const bar: MinuteBar = {
      minute: closeTick.minute,
      half: closeTick.half,
      open,
      high,
      low,
      close,
      range: high - low,
      tickCount: list.length,
      handicapChanged,
      handicap: closeTick.handicap,
      over: sides.over,
      under: sides.under,
    };
    if (handicapChanged) {
      bar.handicapFrom = list[0]!.tick.handicap;
      bar.handicapTo = closeTick.handicap;
    }
    bars.push(bar);
  }

  bars.sort((a, b) => a.half - b.half || a.minute - b.minute);
  return bars;
}

function warnBadMinute(minute: number, sourceId: string | undefined): void {
  console.warn(
    `[effective-line] bỏ tick minute=${minute} (ngoài ${MIN_MINUTE}..${MAX_MINUTE})`,
    sourceId ?? '',
  );
}

/**
 * Adapter OddsItem → OuOddsTick. Gán half theo thứ tự thời gian (giống normalize OU).
 */
export function oddsItemsToOuTicks(
  items: OddsItem[] | undefined,
  marketId: '1_3' | '1_6',
): OuOddsTick[] {
  if (!items?.length) return [];

  type Row = Omit<OuOddsTick, 'half'> & { half?: MatchHalf };
  const parsed: Row[] = [];

  for (const row of items) {
    if (row.time_str == null || row.time_str === '') continue;
    const minute = parseInt(String(row.time_str), 10);
    if (!Number.isFinite(minute)) continue;
    if (minute < MIN_MINUTE || minute > MAX_MINUTE) {
      warnBadMinute(minute, row.id);
      continue;
    }

    const handicap = parseFinite(row.handicap);
    const over = parseFinite(row.over_od);
    const under = parseFinite(row.under_od);
    if (handicap === null || over === null || under === null) continue;
    if (!(over > 0) || !(under > 0)) continue;

    const { seq, ts } = probeAddTime(row.add_time);
    parsed.push({
      seq,
      ts,
      marketId,
      minute,
      handicap,
      over,
      under,
      sourceId: row.id,
    });
  }

  parsed.sort(
    (a, b) =>
      a.seq - b.seq ||
      (a.ts ?? 0) - (b.ts ?? 0) ||
      String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? '')),
  );

  const withHalf = assignHalfByChronologicalMinutes(
    parsed as (OuOddsTick & { half?: MatchHalf })[],
  ) as OuOddsTick[];

  return dedupeOddsTicks(withHalf) as OuOddsTick[];
}

/**
 * Adapter OddsItem → AhOddsTick.
 */
export function oddsItemsToAhTicks(
  items: OddsItem[] | undefined,
  marketId: '1_2' | '1_5',
): AhOddsTick[] {
  if (!items?.length) return [];

  type Row = Omit<AhOddsTick, 'half'> & { half?: MatchHalf };
  const parsed: Row[] = [];

  for (const row of items) {
    if (row.time_str == null || row.time_str === '') continue;
    const minute = parseInt(String(row.time_str), 10);
    if (!Number.isFinite(minute)) continue;
    if (minute < MIN_MINUTE || minute > MAX_MINUTE) {
      warnBadMinute(minute, row.id);
      continue;
    }

    const handicap = parseFinite(row.handicap);
    const home = parseFinite(row.home_od);
    const away = parseFinite(row.away_od);
    if (handicap === null || home === null || away === null) continue;
    if (!(home > 0) || !(away > 0)) continue;

    const { seq, ts } = probeAddTime(row.add_time);
    parsed.push({
      seq,
      ts,
      marketId,
      minute,
      handicap,
      home,
      away,
      sourceId: row.id,
    });
  }

  parsed.sort(
    (a, b) =>
      a.seq - b.seq ||
      (a.ts ?? 0) - (b.ts ?? 0) ||
      String(a.sourceId ?? '').localeCompare(String(b.sourceId ?? '')),
  );

  const withHalf = assignHalfByChronologicalMinutes(
    parsed as (AhOddsTick & { half?: MatchHalf })[],
  ) as AhOddsTick[];

  return dedupeOddsTicks(withHalf) as AhOddsTick[];
}
