import { describe, it, expect } from 'vitest';
import {
  computeOuOverLineRunAvgs,
  detectOuOverLineDropDeltas,
  formatOuOverLineDropDeltaLabel,
  formatOuOverLineRunAvgLabel,
  isStrongNegDeltaRed,
  isStrongNegDeltaTelegram,
  isStrongNegDeltaYellow,
  roundOdds3,
  strongestNegativeDelta,
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

describe('strongestNegativeDelta', () => {
  it('không có line drop → undefined', () => {
    expect(
      strongestNegativeDelta([
        { minute: 10, handicap: 2.5, over: 1.9 },
        { minute: 11, handicap: 2.5, over: 1.85 },
      ]),
    ).toBeUndefined();
  });

  it('nhiều Δ âm → lấy số nhỏ nhất', () => {
    const d = strongestNegativeDelta([
      { minute: 10, handicap: 2.5, over: 1.9 },
      { minute: 12, handicap: 2.25, over: 1.8 }, // −0.1
      { minute: 20, handicap: 2.0, over: 1.45 }, // −0.35
    ]);
    expect(d).toBe(-0.35);
  });

  it('Δ dương không đếm', () => {
    expect(
      strongestNegativeDelta([
        { minute: 10, handicap: 2.5, over: 1.7 },
        { minute: 11, handicap: 2.25, over: 1.85 }, // +0.15
      ]),
    ).toBeUndefined();
  });
});

describe('isStrongNegDeltaRed / Yellow', () => {
  it('Δ ≤ −0.375; vàng Δ ≤ −0.400', () => {
    expect(isStrongNegDeltaRed(-0.35)).toBe(true);
    expect(isStrongNegDeltaRed(-0.349)).toBe(false);
    expect(isStrongNegDeltaYellow(-0.4)).toBe(true);
    expect(isStrongNegDeltaYellow(-0.399)).toBe(false);
    expect(isStrongNegDeltaRed(-0.4)).toBe(true);
    expect(isStrongNegDeltaYellow(-0.35)).toBe(false);
    expect(isStrongNegDeltaRed(undefined)).toBe(false);
  });
});

describe('isStrongNegDeltaTelegram', () => {
  it('Telegram Δ ≤ −0.375', () => {
    expect(isStrongNegDeltaTelegram(-0.375)).toBe(true);
    expect(isStrongNegDeltaTelegram(-0.374)).toBe(false);
  });
});

describe('computeOuOverLineRunAvgs', () => {
  it('line 1.25 bốn phút → TB 1.825', () => {
    const runs = computeOuOverLineRunAvgs([
      { minute: 10, handicap: 1.25, over: 1.8 },
      { minute: 11, handicap: 1.25, over: 1.85 },
      { minute: 12, handicap: 1.25, over: 1.82 },
      { minute: 13, handicap: 1.25, over: 1.83 },
    ]);
    expect(runs).toHaveLength(1);
    expect(runs[0].avgOver).toBe(1.825);
    expect(runs[0].minuteCount).toBe(4);
    expect(formatOuOverLineRunAvgLabel(runs[0])).toBe("1.25 TB 1.825 · 4'");
  });

  it('đổi line (giảm hoặc tăng) → 2 đoạn TB riêng', () => {
    const down = computeOuOverLineRunAvgs([
      { minute: 1, handicap: 2.5, over: 1.9 },
      { minute: 2, handicap: 2.5, over: 1.88 },
      { minute: 3, handicap: 2.25, over: 1.7 },
    ]);
    expect(down).toHaveLength(2);
    expect(down[0].handicap).toBe(2.5);
    expect(down[0].avgOver).toBe(1.89);
    expect(down[1].handicap).toBe(2.25);
    expect(down[1].avgOver).toBe(1.7);

    const up = computeOuOverLineRunAvgs([
      { minute: 1, handicap: 2.25, over: 1.7 },
      { minute: 2, handicap: 2.5, over: 1.9 },
    ]);
    expect(up).toHaveLength(2);
    expect(up[0].handicap).toBe(2.25);
    expect(up[1].handicap).toBe(2.5);
  });

  it('cùng HDP bị cắt bởi line khác → 2 đoạn', () => {
    const runs = computeOuOverLineRunAvgs([
      { minute: 1, handicap: 2.5, over: 1.9 },
      { minute: 2, handicap: 2.25, over: 1.7 },
      { minute: 3, handicap: 2.5, over: 1.8 },
    ]);
    expect(runs).toHaveLength(3);
    expect(runs[0].minuteCount).toBe(1);
    expect(runs[2].avgOver).toBe(1.8);
  });

  it('bỏ phút over không hữu hạn', () => {
    const runs = computeOuOverLineRunAvgs([
      { minute: 1, handicap: 1, over: Number.NaN },
      { minute: 2, handicap: 1, over: 1.9 },
      { minute: 3, handicap: 1, over: 1.9 },
    ]);
    expect(runs).toHaveLength(1);
    expect(runs[0].avgOver).toBe(1.9);
    expect(runs[0].minuteCount).toBe(2);
    expect(formatOuOverLineRunAvgLabel(runs[0])).toBe("1 TB 1.900 · 2'");
  });

  it('phút trống không nến vẫn tính vào thời gian tồn tại', () => {
    const runs = computeOuOverLineRunAvgs([
      { minute: 10, handicap: 2.5, over: 1.9 },
      { minute: 11, handicap: 2.5, over: 1.88 },
      { minute: 14, handicap: 2.5, over: 1.86 },
    ]);
    expect(runs).toHaveLength(1);
    expect(runs[0].minuteStart).toBe(10);
    expect(runs[0].minuteEnd).toBe(14);
    expect(runs[0].minuteCount).toBe(5);
    expect(runs[0].avgOver).toBe(1.88);
    expect(formatOuOverLineRunAvgLabel(runs[0])).toBe("2.5 TB 1.880 · 5'");
  });

  it('khoảng trống trước nến line mới tính vào đoạn line cũ', () => {
    const runs = computeOuOverLineRunAvgs([
      { minute: 10, handicap: 2.5, over: 1.9 },
      { minute: 11, handicap: 2.5, over: 1.88 },
      { minute: 15, handicap: 2.25, over: 1.7 },
    ]);
    expect(runs).toHaveLength(2);
    expect(runs[0].minuteStart).toBe(10);
    expect(runs[0].minuteEnd).toBe(14);
    expect(runs[0].minuteCount).toBe(5);
    expect(runs[1].minuteStart).toBe(15);
    expect(runs[1].minuteCount).toBe(1);
  });
});
