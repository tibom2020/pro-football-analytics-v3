import { describe, expect, it } from 'vitest';
import {
  OU_ODDS_SUM_HIGHLIGHT,
  computeAhOddsSumDeviationMarkers,
  computeOuOddsSumDeviationMarkers,
  isHighlightedTwoWayOddsSum,
  twoWayOddsSum,
} from '../ou-odds-sum-markers';

describe('ou-odds-sum-markers', () => {
  it('twoWayOddsSum và ngưỡng 3.83', () => {
    expect(twoWayOddsSum(1.925, 1.905)).toBeCloseTo(3.83, 2);
    expect(isHighlightedTwoWayOddsSum(3.83)).toBe(true);
    expect(isHighlightedTwoWayOddsSum(3.828)).toBe(true);
    expect(isHighlightedTwoWayOddsSum(3.8)).toBe(false);
    expect(isHighlightedTwoWayOddsSum(3.95)).toBe(false);
  });

  it('bỏ qua phút tổng khác 3.83', () => {
    const m = computeOuOddsSumDeviationMarkers([
      { minute: 10, over: 1.9, under: 1.9 },
      { minute: 11, over: 1.95, under: 2.0 },
    ]);
    expect(m).toHaveLength(0);
  });

  it('đánh dấu phút tổng ≈ 3.83', () => {
    const m = computeOuOddsSumDeviationMarkers([{ minute: 12, over: 1.925, under: 1.905 }]);
    expect(m).toHaveLength(1);
    expect(m[0]!.minute).toBe(12);
    expect(m[0]!.label).toBe('Σ3.83');
    expect(m[0]!.sum).toBeCloseTo(3.83, 2);
  });

  it('gom phút liên tiếp cùng tổng 3.83', () => {
    const m = computeOuOddsSumDeviationMarkers([
      { minute: 20, over: 1.925, under: 1.905 },
      { minute: 21, over: 1.925, under: 1.905 },
      { minute: 22, over: 1.925, under: 1.905 },
    ]);
    expect(m).toHaveLength(1);
    expect(m[0]!.minute).toBe(21);
    expect(m[0]!.label).toBe('Σ3.83 · 3\'');
  });

  it('tách run khi gap phút', () => {
    const m = computeOuOddsSumDeviationMarkers([
      { minute: 30, over: 1.925, under: 1.905 },
      { minute: 32, over: 1.925, under: 1.905 },
    ]);
    expect(m).toHaveLength(2);
    expect(m[0]!.label).toBe('Σ3.83');
    expect(m[1]!.label).toBe('Σ3.83');
  });

  it('AH home+away dùng cùng ngưỡng 3.83', () => {
    const m = computeAhOddsSumDeviationMarkers([{ minute: 5, home: 1.925, away: 1.905 }]);
    expect(m).toHaveLength(1);
    expect(m[0]!.sum).toBeCloseTo(3.83, 2);
  });

  it('export hằng highlight 3.83', () => {
    expect(OU_ODDS_SUM_HIGHLIGHT).toBe(3.83);
  });
});
