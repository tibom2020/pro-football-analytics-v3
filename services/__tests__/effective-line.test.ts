import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  effectiveLineOU,
  effectiveHandicapAH,
  buildMinuteBars,
  probeAddTime,
  dedupeOddsTicks,
  oddsItemsToOuTicks,
  type OuOddsTick,
  type AhOddsTick,
  type OddsTick,
} from '../effective-line';
import { K_OU, K_AH } from '../effective-line-config';
import type { OddsItem } from '../../types';

function ouTick(
  partial: Partial<OuOddsTick> &
    Pick<OuOddsTick, 'minute' | 'handicap' | 'over' | 'under'>,
): OuOddsTick {
  return {
    seq: partial.seq ?? 0,
    ts: partial.ts ?? null,
    marketId: '1_3',
    half: partial.half ?? 1,
    sourceId: partial.sourceId,
    ...partial,
  };
}

function ahTick(
  partial: Partial<AhOddsTick> &
    Pick<AhOddsTick, 'minute' | 'handicap' | 'home' | 'away'>,
): AhOddsTick {
  return {
    seq: partial.seq ?? 0,
    ts: partial.ts ?? null,
    marketId: '1_2',
    half: partial.half ?? 1,
    sourceId: partial.sourceId,
    ...partial,
  };
}

describe('probeAddTime', () => {
  it('counter nhỏ → seq, ts null (không scale giả)', () => {
    expect(probeAddTime('3')).toEqual({ seq: 3, ts: null });
    expect(probeAddTime(42)).toEqual({ seq: 42, ts: null });
  });

  it('Unix seconds 10 chữ số → ts = add_time * 1000', () => {
    expect(probeAddTime('1720000000')).toEqual({
      seq: 1720000000,
      ts: 1720000000 * 1000,
    });
  });
});

describe('effectiveLineOU', () => {
  it('over === under → pOver 0.5 → bằng handicap', () => {
    expect(effectiveLineOU({ handicap: 2.5, over: 1.9, under: 1.9 })).toBe(2.5);
  });

  it('over giảm, handicap không đổi → effectiveLineOU tăng', () => {
    const base = { handicap: 2.5, under: 2.0 };
    const highOver = effectiveLineOU({ ...base, over: 2.0 })!;
    const lowOver = effectiveLineOU({ ...base, over: 1.5 })!;
    expect(lowOver).toBeGreaterThan(highOver);
  });

  it('odds ≤ 0 → null', () => {
    expect(effectiveLineOU({ handicap: 2.5, over: 0, under: 1.9 })).toBeNull();
    expect(effectiveLineOU({ handicap: 2.5, over: 1.9, under: -1 })).toBeNull();
  });

  it('dùng K_OU trong công thức', () => {
    const v = effectiveLineOU({ handicap: 2.5, over: 1.5, under: 2.5 })!;
    const invO = 1 / 1.5;
    const invU = 1 / 2.5;
    const p = invO / (invO + invU);
    expect(v).toBeCloseTo(2.5 + K_OU * (p - 0.5), 10);
  });
});

describe('effectiveHandicapAH', () => {
  it('home giảm, handicap không đổi → effectiveHandicapAH âm hơn', () => {
    const base = { handicap: -0.5, away: 2.0 };
    const highHome = effectiveHandicapAH({ ...base, home: 2.0 })!;
    const lowHome = effectiveHandicapAH({ ...base, home: 1.5 })!;
    expect(lowHome).toBeLessThan(highHome);
  });

  it('home === away → bằng handicap', () => {
    expect(effectiveHandicapAH({ handicap: -0.25, home: 1.95, away: 1.95 })).toBe(
      -0.25,
    );
  });

  it('dùng K_AH và dấu trừ', () => {
    const v = effectiveHandicapAH({ handicap: 0, home: 1.5, away: 2.5 })!;
    const invH = 1 / 1.5;
    const invA = 1 / 2.5;
    const p = invH / (invH + invA);
    expect(v).toBeCloseTo(0 - K_AH * (p - 0.5), 10);
  });
});

describe('buildMinuteBars', () => {
  it('1 tick / phút → range 0, tickCount 1', () => {
    const bars = buildMinuteBars(
      [ouTick({ minute: 10, handicap: 2.5, over: 1.9, under: 1.9, seq: 1 })],
      'ou',
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].tickCount).toBe(1);
    expect(bars[0].range).toBe(0);
    expect(bars[0].open).toBe(bars[0].close);
    expect(bars[0].handicap).toBe(2.5);
    expect(bars[0].over).toBe(1.9);
    expect(bars[0].under).toBe(1.9);
  });

  it('nhiều tick → OHLC theo seq; tickCount và range đúng', () => {
    const ticks: OddsTick[] = [
      ouTick({ minute: 12, handicap: 2.5, over: 2.0, under: 1.8, seq: 1 }),
      ouTick({ minute: 12, handicap: 2.5, over: 1.6, under: 2.2, seq: 2 }),
      ouTick({ minute: 12, handicap: 2.5, over: 1.8, under: 2.0, seq: 3 }),
    ];
    const bars = buildMinuteBars(ticks, 'ou');
    expect(bars).toHaveLength(1);
    const b = bars[0];
    expect(b.tickCount).toBe(3);
    const e1 = effectiveLineOU({ handicap: 2.5, over: 2.0, under: 1.8 })!;
    const e2 = effectiveLineOU({ handicap: 2.5, over: 1.6, under: 2.2 })!;
    const e3 = effectiveLineOU({ handicap: 2.5, over: 1.8, under: 2.0 })!;
    expect(b.open).toBe(e1);
    expect(b.close).toBe(e3);
    expect(b.high).toBe(Math.max(e1, e2, e3));
    expect(b.low).toBe(Math.min(e1, e2, e3));
    expect(b.range).toBe(b.high - b.low);
    expect(b.over).toBe(1.8);
    expect(b.under).toBe(2.0);
  });

  it('phút thiếu → không nội suy bar xen giữa', () => {
    const bars = buildMinuteBars(
      [
        ouTick({ minute: 10, handicap: 2.5, over: 1.9, under: 1.9, seq: 1 }),
        ouTick({ minute: 12, handicap: 2.5, over: 1.9, under: 1.9, seq: 2 }),
      ],
      'ou',
    );
    expect(bars.map((b) => b.minute)).toEqual([10, 12]);
  });

  it('over/under = 0 → bỏ khỏi bar', () => {
    const bars = buildMinuteBars(
      [
        ouTick({ minute: 5, handicap: 2.5, over: 0, under: 1.9, seq: 1 }),
        ouTick({ minute: 5, handicap: 2.5, over: 1.9, under: 1.9, seq: 2 }),
      ],
      'ou',
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].tickCount).toBe(1);
  });

  it('handicap đổi trong phút → handicapChanged + from/to', () => {
    const bars = buildMinuteBars(
      [
        ouTick({ minute: 20, handicap: 2.5, over: 1.9, under: 1.9, seq: 1 }),
        ouTick({ minute: 20, handicap: 2.25, over: 1.85, under: 1.95, seq: 2 }),
      ],
      'ou',
    );
    expect(bars[0].handicapChanged).toBe(true);
    expect(bars[0].handicapFrom).toBe(2.5);
    expect(bars[0].handicapTo).toBe(2.25);
    expect(bars[0].handicap).toBe(2.25);
  });

  it('group theo (minute, half) — không gộp khác half', () => {
    const bars = buildMinuteBars(
      [
        ouTick({ minute: 46, half: 1, handicap: 2.5, over: 1.9, under: 1.9, seq: 1 }),
        ouTick({ minute: 46, half: 2, handicap: 2.5, over: 1.8, under: 2.0, seq: 2 }),
      ],
      'ou',
    );
    expect(bars).toHaveLength(2);
  });

  it('AH mode: map home/away vào over/under thô trên bar', () => {
    const bars = buildMinuteBars(
      [ahTick({ minute: 15, handicap: -0.5, home: 1.85, away: 1.95, seq: 1 })],
      'ah',
    );
    expect(bars[0].over).toBe(1.85);
    expect(bars[0].under).toBe(1.95);
    expect(bars[0].close).toBe(
      effectiveHandicapAH({ handicap: -0.5, home: 1.85, away: 1.95 }),
    );
  });
});

describe('dedupeOddsTicks', () => {
  it('cùng ts → giữ bản sau', () => {
    const out = dedupeOddsTicks([
      ouTick({
        minute: 8,
        handicap: 2.5,
        over: 1.9,
        under: 1.9,
        seq: 1,
        ts: 1000,
        sourceId: 'a',
      }),
      ouTick({
        minute: 8,
        handicap: 2.5,
        over: 1.7,
        under: 2.1,
        seq: 2,
        ts: 1000,
        sourceId: 'b',
      }),
    ]);
    expect(out).toHaveLength(1);
    expect((out[0] as OuOddsTick).over).toBe(1.7);
  });
});

describe('oddsItemsToOuTicks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('minute vô lý → bỏ + warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items: OddsItem[] = [
      {
        id: 'ok',
        time_str: '10',
        handicap: '2.5',
        over_od: '1.9',
        under_od: '1.9',
        add_time: '1',
      },
      {
        id: 'bad',
        time_str: '200',
        handicap: '2.5',
        over_od: '1.9',
        under_od: '1.9',
        add_time: '2',
      },
    ];
    const ticks = oddsItemsToOuTicks(items, '1_3');
    expect(ticks).toHaveLength(1);
    expect(ticks[0].minute).toBe(10);
    expect(warn).toHaveBeenCalled();
  });

  it('add_time Unix seconds → set ts', () => {
    const items: OddsItem[] = [
      {
        id: '1',
        time_str: '5',
        handicap: '2.5',
        over_od: '1.9',
        under_od: '1.9',
        add_time: '1720000000',
      },
    ];
    const ticks = oddsItemsToOuTicks(items, '1_3');
    expect(ticks[0].ts).toBe(1720000000 * 1000);
    expect(ticks[0].seq).toBe(1720000000);
  });
});
