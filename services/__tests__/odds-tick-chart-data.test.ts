import { describe, it, expect } from 'vitest';
import type { Tick } from '../odds-tick-series';
import {
  detectScoreEvents,
  buildMinuteAggs,
  buildSuspendedBands,
  TYPICAL_MINUTE_RANGE,
} from '../odds-tick-chart-data';

function tick(partial: Partial<Tick> & Pick<Tick, 'id' | 't' | 'minute' | 'minuteFrac'>): Tick {
  return {
    half: 1,
    score: [0, 0],
    handicap: 2.5,
    handicapRaw: '2.5',
    eff: 2.5,
    suspended: false,
    market: '1_3',
    ...partial,
  };
}

describe('detectScoreEvents', () => {
  it('ss tăng → goal; ss giảm → disallowed', () => {
    const events = detectScoreEvents([
      tick({ id: 'a', t: 1, minute: 10, minuteFrac: 10.2, score: [0, 0] }),
      tick({ id: 'b', t: 2, minute: 20, minuteFrac: 20.1, score: [1, 0] }),
      tick({ id: 'c', t: 3, minute: 25, minuteFrac: 25.1, score: [0, 0] }),
    ]);
    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe('goal');
    expect(events[0].label).toBe('1-0');
    expect(events[1].kind).toBe('disallowed');
  });
});

describe('buildMinuteAggs', () => {
  it('1 tick → range 0; đánh dấu phút bàn', () => {
    const aggs = buildMinuteAggs([
      tick({ id: 'a', t: 1, minute: 12, minuteFrac: 12.1, score: [0, 0], eff: 2.4 }),
      tick({ id: 'b', t: 2, minute: 12, minuteFrac: 12.5, score: [0, 0], eff: 2.5 }),
      tick({ id: 'c', t: 3, minute: 30, minuteFrac: 30.2, score: [1, 0], eff: 3.0 }),
    ]);
    const m12 = aggs.find((a) => a.minute === 12)!;
    expect(m12.tickCount).toBe(2);
    expect(m12.range).toBeCloseTo(0.1, 10);
    const m30 = aggs.find((a) => a.minute === 30)!;
    expect(m30.hasGoal).toBe(true);
    expect(TYPICAL_MINUTE_RANGE).toBe(0.03);
  });
});

describe('buildSuspendedBands', () => {
  it('tô từ suspended đến tick odds trở lại', () => {
    const bands = buildSuspendedBands([
      tick({ id: 'a', t: 1, minute: 5, minuteFrac: 5.1, suspended: false, eff: 2.5 }),
      tick({ id: 'b', t: 2, minute: 5, minuteFrac: 5.4, suspended: true, eff: null }),
      tick({ id: 'c', t: 3, minute: 5, minuteFrac: 5.8, suspended: false, eff: 2.4 }),
    ]);
    expect(bands).toHaveLength(1);
    expect(bands[0].x1).toBe(5.4);
    expect(bands[0].x2).toBe(5.8);
  });
});
