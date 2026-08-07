import { describe, it, expect } from 'vitest';
import {
  dedupeOverUnderByLowestOver,
  mergeOuSnapshotsKeepLowestOver,
  normalizeOverUnderSnapshots,
} from '../oddsNormalize';
import type { OddsItem, OverUnderMinuteSnapshot } from '../../types';
import type { MatchHalf } from '../matchTimeline';

function ou(
  minute: number,
  handicap: number,
  over: number,
  under: number,
  half: MatchHalf = 1,
): OverUnderMinuteSnapshot & { half: MatchHalf } {
  return { marketId: '1_3', minute, handicap, over, under, half };
}

describe('dedupeOverUnderByLowestOver', () => {
  it('cùng phút + cùng line → giữ giá Tài thấp nhất', () => {
    const out = dedupeOverUnderByLowestOver([
      ou(10, 2.5, 1.95, 1.85),
      ou(10, 2.5, 1.8, 2.0),
      ou(10, 2.5, 1.88, 1.92),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].over).toBe(1.8);
    expect(out[0].under).toBe(2.0);
    expect(out[0].handicap).toBe(2.5);
  });

  it('cùng phút đổi line → vẫn lấy over thấp nhất trong phút (mọi line)', () => {
    const out = dedupeOverUnderByLowestOver([
      ou(20, 2.5, 1.7, 2.1), // line cũ nhưng Tài thấp hơn
      ou(20, 2.25, 1.95, 1.85),
      ou(20, 2.25, 1.82, 1.98),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].over).toBe(1.7);
    expect(out[0].handicap).toBe(2.5);
  });
});

describe('mergeOuSnapshotsKeepLowestOver', () => {
  it('fetch sau giá cao hơn → giữ đáy đã thấy', () => {
    const prev = [ou(30, 2.5, 1.72, 2.1)];
    const next = [ou(30, 2.5, 1.88, 1.92), ou(31, 2.5, 1.9, 1.9)];
    const out = mergeOuSnapshotsKeepLowestOver(prev, next);
    expect(out.find((r) => r.minute === 30)!.over).toBe(1.72);
    expect(out.find((r) => r.minute === 31)!.over).toBe(1.9);
  });

  it('fetch sau giá thấp hơn → cập nhật đáy', () => {
    const prev = [ou(30, 2.5, 1.85, 1.95)];
    const next = [ou(30, 2.5, 1.7, 2.1)];
    const out = mergeOuSnapshotsKeepLowestOver(prev, next);
    expect(out[0].over).toBe(1.7);
  });
});

describe('normalizeOverUnderSnapshots (1_3 / 1_6)', () => {
  it('gộp theo phút lấy over thấp nhất', () => {
    const items: OddsItem[] = [
      { id: 'a', time_str: '12', handicap: '2.5', over_od: '1.95', under_od: '1.85', add_time: '1' },
      { id: 'b', time_str: '12', handicap: '2.5', over_od: '1.78', under_od: '2.02', add_time: '2' },
      { id: 'c', time_str: '12', handicap: '2.5', over_od: '1.88', under_od: '1.92', add_time: '3' },
      { id: 'd', time_str: '13', handicap: '2.5', over_od: '1.90', under_od: '1.90', add_time: '4' },
    ];
    const out = normalizeOverUnderSnapshots(items, '1_3');
    expect(out).toHaveLength(2);
    const m12 = out.find((r) => r.minute === 12)!;
    expect(m12.over).toBe(1.78);
    expect(m12.under).toBe(2.02);
  });
});
