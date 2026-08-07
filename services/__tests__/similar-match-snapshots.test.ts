import { describe, it, expect } from 'vitest';
import {
  AUTO_SIMILAR_CLOCK_ENABLED,
  formatAutoSimilarLabel,
  hasAutoSimilarForSlot,
  pendingAutoSimilarSlots,
  planAutoSimilarCaptures,
  type SimilarMatchSnapshot,
} from '../similar-match-snapshots';

function snap(partial: Partial<SimilarMatchSnapshot> & Pick<SimilarMatchSnapshot, 'half' | 'minute'>): SimilarMatchSnapshot {
  return {
    id: partial.id ?? 'x',
    auto: partial.auto ?? true,
    ts: partial.ts ?? 1,
    score: partial.score ?? '0-0',
    ...partial,
  };
}

describe('planAutoSimilarCaptures', () => {
  it('tắt lịch đồng hồ khi AUTO_SIMILAR_CLOCK_ENABLED=false', () => {
    expect(AUTO_SIMILAR_CLOCK_ENABLED).toBe(false);
    expect(planAutoSimilarCaptures({ half: 1, minute: 10 }, { half: 1, minute: 5 }, [])).toHaveLength(0);
    expect(planAutoSimilarCaptures({ half: 2, minute: 52 }, { half: 1, minute: 5 }, [])).toHaveLength(0);
    expect(pendingAutoSimilarSlots({ half: 1, minute: 8 }, [])).toEqual([]);
    expect(pendingAutoSimilarSlots({ half: 2, minute: 50 }, [])).toEqual([]);
  });

  it('hasAutoSimilarForSlot nhận slot đổi line', () => {
    const existing = [snap({ autoSlot: 'ou-h2-2_75', half: 2, minute: 52, trigger: 'ou_line_change' })];
    expect(hasAutoSimilarForSlot(existing, 'ou-h2-2_75')).toBe(true);
  });

  it('formatAutoSimilarLabel cho đổi line', () => {
    const label = formatAutoSimilarLabel(
      snap({
        auto: true,
        autoSlot: 'ou-h2-2_75',
        half: 2,
        minute: 52,
        trigger: 'ou_line_change',
        lineChange: { prevHandicap: 3, newHandicap: 2.75 },
      }),
    );
    expect(label).toBe('H2 line 3→2.75 · p52\'');
  });
});
