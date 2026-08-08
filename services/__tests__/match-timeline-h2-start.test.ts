import { describe, it, expect } from 'vitest';
import {
  resolveMatchHalfForUI,
  resolveStatsHalfFromSnapshots,
} from '../matchTimeline';
import {
  mergeOuSnapshotsKeepLowestOver,
  normalizeOverUnderSnapshots,
} from '../oddsNormalize';
import { applyHalfFromMinuteForFullMatchOdds } from '../odds-pressure-series';
import type { OddsItem, OverUnderMinuteSnapshot } from '../../types';
import type { MatchHalf } from '../matchTimeline';

function ou(
  minute: number,
  over: number,
  half: MatchHalf,
): OverUnderMinuteSnapshot & { half: MatchHalf } {
  return { marketId: '1_3', minute, handicap: 2.5, over, under: 1.9, half };
}

describe('đầu H2 (phút 45–49) khi tt>=2', () => {
  const timerH2 = { tm: 47, ts: 0, tt: '2' as const };

  it('resolveStatsHalfFromSnapshots → H2 ngay phút 45–49', () => {
    expect(resolveStatsHalfFromSnapshots(timerH2, 45, [])).toBe(2);
    expect(resolveStatsHalfFromSnapshots(timerH2, 47, [])).toBe(2);
    expect(resolveStatsHalfFromSnapshots(timerH2, 49, [])).toBe(2);
  });

  it('resolveMatchHalfForUI → H2 ngay (không chờ phút 50)', () => {
    expect(resolveMatchHalfForUI(timerH2, 46, [], [])).toBe(2);
    expect(resolveMatchHalfForUI(timerH2, 49, [], [])).toBe(2);
  });

  it('normalizeOverUnderSnapshots gắn phút ≥45 → half=2', () => {
    const items: OddsItem[] = [
      { id: 'a', time_str: '44', handicap: '2.5', over_od: '1.90', under_od: '1.90', add_time: '1' },
      { id: 'b', time_str: '46', handicap: '2.5', over_od: '1.85', under_od: '1.95', add_time: '2' },
      { id: 'c', time_str: '48', handicap: '2.5', over_od: '1.80', under_od: '2.00', add_time: '3' },
    ];
    const out = normalizeOverUnderSnapshots(items, '1_3', { matchTimer: timerH2 });
    expect(out.find((r) => r.minute === 44)?.half).toBe(1);
    expect(out.find((r) => r.minute === 46)?.half).toBe(2);
    expect(out.find((r) => r.minute === 48)?.half).toBe(2);
  });
});

describe('tt=1 phút 45–49 vẫn bù H1; kèo half=2 thì sang H2', () => {
  const timerH1 = { tm: 47, ts: 0, tt: '1' as const };

  it('không có kèo H2 → giữ H1 (bù giờ)', () => {
    expect(resolveMatchHalfForUI(timerH1, 47, [{ minute: 47, half: 1 }], [])).toBe(1);
  });

  it('kèo đã half=2 → UI H2 dù tt=1', () => {
    expect(resolveMatchHalfForUI(timerH1, 47, [{ minute: 47, half: 2 }], [])).toBe(2);
  });
});

describe('mergeOuSnapshotsKeepLowestOver ưu tiên H2 phút ≥45', () => {
  it('bỏ H1 stale khi đã có H2 cùng phút', () => {
    const prev = [ou(46, 1.72, 1)];
    const next = [ou(46, 1.88, 2)];
    const out = mergeOuSnapshotsKeepLowestOver(prev, next);
    expect(out.filter((r) => r.minute === 46)).toHaveLength(1);
    expect(out[0].half).toBe(2);
    expect(out[0].over).toBe(1.88);
  });
});

describe('applyHalfFromMinuteForFullMatchOdds', () => {
  it('điểm đã tag H2 không bị ép sang H1 khi UI còn H1', () => {
    const rows = [
      { minute: 40, half: 1 as MatchHalf },
      { minute: 46, half: 2 as MatchHalf },
    ];
    const out = applyHalfFromMinuteForFullMatchOdds(rows, false);
    expect(out.find((r) => r.minute === 40)?.half).toBe(1);
    expect(out.find((r) => r.minute === 46)?.half).toBe(2);
  });

  it('khi UI H2: phút ≥45 tag H2 → chart H2', () => {
    const rows = [
      { minute: 46, half: 2 as MatchHalf },
      { minute: 47, half: 1 as MatchHalf }, // bù H1 thật
    ];
    const out = applyHalfFromMinuteForFullMatchOdds(rows, true);
    expect(out.find((r) => r.minute === 46)?.half).toBe(2);
    expect(out.find((r) => r.minute === 47)?.half).toBe(1);
  });
});
