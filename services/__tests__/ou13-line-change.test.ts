import { describe, it, expect } from 'vitest';
import type { OverUnderMinuteSnapshot } from '../../types';
import { advanceOu13LineBaseline, detectOu13LineChanges, lineChangeSlot } from '../ou13-line-change';

function ou(
  minute: number,
  half: 1 | 2,
  handicap: number,
): OverUnderMinuteSnapshot {
  return { marketId: '1_3', minute, half, handicap, over: 1.9, under: 1.9 };
}

describe('detectOu13LineChanges', () => {
  it('phát hiện đổi line trong cùng hiệp', () => {
    const prev = [ou(50, 2, 3)];
    const next = [ou(50, 2, 3), ou(52, 2, 2.75)];
    const changes = detectOu13LineChanges(prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      half: 2,
      minute: 52,
      prevHandicap: 3,
      newHandicap: 2.75,
    });
  });

  it('không báo khi line không đổi', () => {
    const prev = [ou(10, 1, 2.5)];
    const next = [ou(10, 1, 2.5), ou(12, 1, 2.5)];
    expect(detectOu13LineChanges(prev, next)).toHaveLength(0);
  });

  it('tách theo hiệp — H1 và H2 độc lập', () => {
    const prev = [ou(20, 1, 2.5), ou(50, 2, 3)];
    const next = [ou(22, 1, 2.25), ou(52, 2, 2.75)];
    const changes = detectOu13LineChanges(prev, next);
    expect(changes).toHaveLength(2);
    expect(changes.map((c) => c.half).sort()).toEqual([1, 2]);
  });

  it('trả rỗng khi prev rỗng', () => {
    expect(detectOu13LineChanges([], [ou(1, 1, 2)])).toHaveLength(0);
  });
});

describe('lineChangeSlot', () => {
  it('tạo slot duy nhất theo hiệp và line mới', () => {
    expect(lineChangeSlot(2, 2.75)).toBe('ou-h2-2_75');
    expect(lineChangeSlot(1, 3)).toBe('ou-h1-3');
  });
});

describe('advanceOu13LineBaseline', () => {
  it('lần đầu chỉ seed baseline, không báo đổi line', () => {
    const baseline = new Map();
    expect(advanceOu13LineBaseline(baseline, [ou(52, 2, 2.75)])).toHaveLength(0);
    expect(baseline.get(2)?.handicap).toBe(2.75);
  });

  it('báo đổi line khi handicap mới nhất thay đổi', () => {
    const baseline = new Map();
    advanceOu13LineBaseline(baseline, [ou(50, 2, 3)]);
    const changes = advanceOu13LineBaseline(baseline, [ou(52, 2, 2.75)]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ prevHandicap: 3, newHandicap: 2.75 });
  });

  it('poll rebuild history không báo lại nếu line mới nhất giữ nguyên', () => {
    const baseline = new Map();
    advanceOu13LineBaseline(baseline, [ou(50, 2, 3)]);
    advanceOu13LineBaseline(baseline, [ou(52, 2, 2.75)]);
    const rebuilt = [ou(48, 2, 3), ou(50, 2, 3), ou(52, 2, 2.75), ou(53, 2, 2.75)];
    expect(advanceOu13LineBaseline(baseline, rebuilt)).toHaveLength(0);
  });
});
