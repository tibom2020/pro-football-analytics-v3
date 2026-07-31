import { describe, it, expect } from 'vitest';
import {
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
  it('chụp H1 10 khi đồng hồ >= 10', () => {
    const plans = planAutoSimilarCaptures({ half: 1, minute: 10 }, { half: 1, minute: 5 }, []);
    expect(plans).toHaveLength(1);
    expect(plans[0].slot).toBe('h1-10');
    expect(plans[0].captureMinute).toBe(10);
    expect(plans[0].lateCapture).toBe(false);
  });

  it('chụp H2 52 khi hiệp 2 >= 52', () => {
    const plans = planAutoSimilarCaptures({ half: 2, minute: 52 }, { half: 1, minute: 5 }, []);
    expect(plans.some((p) => p.slot === 'h2-52')).toBe(true);
  });

  it('không lên lịch lại khi đã có snapshot slot', () => {
    const existing = [
      snap({ autoSlot: 'h1-10', half: 1, minute: 10 }),
    ];
    expect(planAutoSimilarCaptures({ half: 1, minute: 15 }, null, existing)).toHaveLength(0);
    expect(hasAutoSimilarForSlot(existing, 'h1-10')).toBe(true);
  });

  it('pending khi chưa tới mốc', () => {
    expect(pendingAutoSimilarSlots({ half: 1, minute: 8 }, [])).toEqual(['h1-10']);
    expect(pendingAutoSimilarSlots({ half: 2, minute: 50 }, [snap({ autoSlot: 'h1-10', half: 1, minute: 10 })])).toEqual([
      'h2-52',
    ]);
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
