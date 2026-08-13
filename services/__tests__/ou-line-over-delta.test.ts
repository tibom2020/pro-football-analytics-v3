import { describe, it, expect } from 'vitest';
import {
  detectOuOverLineDropDeltas,
  formatOuOverLineDropDeltaLabel,
  roundOdds3,
} from '../ou-line-over-delta';

describe('roundOdds3', () => {
  it('làm tròn 3 chữ số', () => {
    expect(roundOdds3(1.7700000001)).toBe(1.77);
    expect(roundOdds3(-0.1300000002)).toBe(-0.13);
  });
});

describe('formatOuOverLineDropDeltaLabel', () => {
  it('âm / dương / zero', () => {
    expect(formatOuOverLineDropDeltaLabel(-0.13)).toBe('Δ−0.130');
    expect(formatOuOverLineDropDeltaLabel(0.05)).toBe('Δ+0.050');
    expect(formatOuOverLineDropDeltaLabel(0)).toBe('Δ0.000');
  });
});

describe('detectOuOverLineDropDeltas', () => {
  it('line 2.5→2.25, over 1.90→1.77 → Δ−0.130', () => {
    const deltas = detectOuOverLineDropDeltas([
      { minute: 20, handicap: 2.5, over: 1.9 },
      { minute: 21, handicap: 2.25, over: 1.77 },
    ]);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].minute).toBe(21);
    expect(deltas[0].delta).toBe(-0.13);
    expect(formatOuOverLineDropDeltaLabel(deltas[0].delta)).toBe('Δ−0.130');
  });

  it('line tăng → không marker', () => {
    const deltas = detectOuOverLineDropDeltas([
      { minute: 10, handicap: 2.25, over: 1.8 },
      { minute: 11, handicap: 2.5, over: 1.9 },
    ]);
    expect(deltas).toHaveLength(0);
  });

  it('line đứng → không marker', () => {
    const deltas = detectOuOverLineDropDeltas([
      { minute: 10, handicap: 2.5, over: 1.9 },
      { minute: 11, handicap: 2.5, over: 1.85 },
    ]);
    expect(deltas).toHaveLength(0);
  });

  it('thiếu over hữu hạn → bỏ qua', () => {
    const deltas = detectOuOverLineDropDeltas([
      { minute: 10, handicap: 2.5, over: Number.NaN },
      { minute: 11, handicap: 2.25, over: 1.8 },
    ]);
    expect(deltas).toHaveLength(0);
  });
});
