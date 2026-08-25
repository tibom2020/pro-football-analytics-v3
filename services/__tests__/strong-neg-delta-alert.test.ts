import { describe, expect, it } from 'vitest';
import type { OverUnderMinuteSnapshot } from '../types';
import {
  buildStrongNegDeltaEventKey,
  collectStrongNegDeltaEvents,
  findNewStrongNegDeltaEvents,
} from '../strong-neg-delta-alert';
import { isStrongNegDeltaTelegram, mergeStrongestNegativeDelta } from '../ou-line-over-delta';

function snap(
  half: 1 | 2,
  minute: number,
  handicap: number,
  over: number,
): OverUnderMinuteSnapshot {
  return {
    half,
    minute,
    handicap,
    over,
    under: 2 - over,
    ss: '0-0',
  };
}

describe('isStrongNegDeltaTelegram', () => {
  it('Δ ≤ −0.375', () => {
    expect(isStrongNegDeltaTelegram(-0.375)).toBe(true);
    expect(isStrongNegDeltaTelegram(-0.38)).toBe(true);
    expect(isStrongNegDeltaTelegram(-0.374)).toBe(false);
    expect(isStrongNegDeltaTelegram(-0.35)).toBe(false);
  });
});

describe('mergeStrongestNegativeDelta', () => {
  it('lấy Δ âm nhỏ nhất từ low/high', () => {
    expect(mergeStrongestNegativeDelta(-0.35, -0.42)).toBe(-0.42);
    expect(mergeStrongestNegativeDelta(undefined, -0.38)).toBe(-0.38);
    expect(mergeStrongestNegativeDelta(0.1, undefined)).toBeUndefined();
  });
});

describe('buildStrongNegDeltaEventKey', () => {
  it('ổn định theo match/market/half/series/line', () => {
    const k = buildStrongNegDeltaEventKey('99', '1_3', 2, 'high', {
      minute: 55,
      prevHandicap: 2.5,
      newHandicap: 2.25,
    });
    expect(k).toBe('snd:99:1_3:H2:high:55:2.50>2.25');
  });
});

describe('collectStrongNegDeltaEvents', () => {
  it('chỉ lấy drop có Δ ≤ −0.375', () => {
    const snaps13Low: OverUnderMinuteSnapshot[] = [
      snap(1, 10, 2.5, 1.9),
      snap(1, 12, 2.25, 1.5),
    ];
    const events = collectStrongNegDeltaEvents('1', snaps13Low, [], [], []);
    expect(events.some((e) => e.delta === -0.4)).toBe(true);
    expect(events.every((e) => e.delta <= -0.375)).toBe(true);
  });

  it('quét 6 luồng low/high', () => {
    const snaps13Low = [
      snap(1, 10, 2.5, 1.9),
      snap(1, 11, 2.25, 1.48),
    ];
    const snaps13High = [
      snap(1, 10, 2.5, 2.0),
      snap(1, 11, 2.25, 1.35),
    ];
    const snaps16Low = [snap(1, 8, 1.0, 1.85), snap(1, 9, 0.75, 1.42)];
    const snaps16High = [snap(1, 8, 1.0, 1.95), snap(1, 9, 0.75, 1.38)];
    const events = collectStrongNegDeltaEvents('2', snaps13Low, snaps13High, snaps16Low, snaps16High);
    expect(events.some((e) => e.market === '1_3' && e.series === 'low')).toBe(true);
    expect(events.some((e) => e.market === '1_3' && e.series === 'high')).toBe(true);
    expect(events.some((e) => e.market === '1_6' && e.series === 'low')).toBe(true);
    expect(events.some((e) => e.market === '1_6' && e.series === 'high')).toBe(true);
  });
});

describe('findNewStrongNegDeltaEvents', () => {
  it('baseline không trả event nhưng ghi known', () => {
    const known = new Map<string, Set<string>>();
    const events = collectStrongNegDeltaEvents(
      'm1',
      [snap(1, 10, 2.5, 1.9), snap(1, 11, 2.25, 1.48)],
      [],
      [],
      [],
    );
    const fresh = findNewStrongNegDeltaEvents('m1', events, known, true);
    expect(fresh).toHaveLength(0);
    expect(known.get('m1')?.size).toBe(events.length);
  });

  it('lần sau chỉ trả drop mới', () => {
    const known = new Map<string, Set<string>>();
    const base = [snap(1, 10, 2.5, 1.9), snap(1, 11, 2.25, 1.48)];
    const events1 = collectStrongNegDeltaEvents('m1', base, [], [], []);
    findNewStrongNegDeltaEvents('m1', events1, known, true);

    const events2 = collectStrongNegDeltaEvents(
      'm1',
      [...base, snap(1, 30, 2.0, 1.05)],
      [],
      [],
      [],
    );
    const fresh = findNewStrongNegDeltaEvents('m1', events2, known, false);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.minute).toBe(30);
  });
});
