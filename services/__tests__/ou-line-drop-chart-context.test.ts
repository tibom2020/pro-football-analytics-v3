import { describe, it, expect } from 'vitest';
import type { OverUnderMinuteSnapshot, ProcessedStats } from '../../types';
import { encodeStatTimelineKey } from '../matchTimeline';
import {
  buildOuLineDropChartLines,
  linePeriodStatDelta,
} from '../ou-line-drop-chart-context';

function ou(
  marketId: '1_3' | '1_6',
  minute: number,
  half: 1 | 2,
  handicap: number,
  over: number,
): OverUnderMinuteSnapshot {
  return { marketId, minute, half, handicap, over, under: 2.1 };
}

function stats(da: number, on: number, off: number): ProcessedStats {
  return {
    attacks: [0, 0],
    dangerous_attacks: [da, 0],
    on_target: [on, 0],
    off_target: [off, 0],
    corners: [0, 0],
    yellowcards: [0, 0],
    redcards: [0, 0],
  };
}

describe('linePeriodStatDelta', () => {
  it('DA/OT/sút = mốc cuối − mốc trước đoạn', () => {
    const hist: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 9)]: stats(4, 1, 2),
      [encodeStatTimelineKey(1, 14)]: stats(10, 3, 5),
    };
    const d = linePeriodStatDelta(hist, 1, 10, 14);
    expect(d.dangerousAttacks).toBe(6);
    expect(d.onTarget).toBe(2);
    expect(d.totalShots).toBe(5);
  });

  it('thiếu stats → null', () => {
    const d = linePeriodStatDelta({}, 1, 10, 14);
    expect(d.dangerousAttacks).toBeNull();
    expect(d.onTarget).toBeNull();
    expect(d.totalShots).toBeNull();
  });
});

describe('buildOuLineDropChartLines', () => {
  const low13 = [
    ou('1_3', 10, 1, 2.75, 1.9),
    ou('1_3', 11, 1, 2.75, 1.88),
    ou('1_3', 12, 1, 2.5, 1.7),
  ];
  const high13 = [
    ou('1_3', 10, 1, 2.75, 2.05),
    ou('1_3', 11, 1, 2.75, 2.0),
    ou('1_3', 12, 1, 2.5, 1.85),
  ];
  const low16 = [
    ou('1_6', 10, 1, 1.5, 1.8),
    ou('1_6', 12, 1, 1.25, 1.65),
  ];
  const high16 = [
    ou('1_6', 10, 1, 1.5, 1.95),
    ou('1_6', 12, 1, 1.25, 1.8),
  ];

  it('H1: 4 block thấp/cao 1_3 và 1_6; TB khác nhau', () => {
    const lines = buildOuLineDropChartLines({
      half: 1,
      ou13Low: low13,
      ou13High: high13,
      ou16Low: low16,
      ou16High: high16,
    });
    const heads = lines.filter((l) => l.startsWith('—'));
    expect(heads).toEqual([
      '— 1_3 H1 · thấp nhất —',
      '— 1_3 H1 · cao nhất —',
      '— 1_6 H1 · thấp nhất —',
      '— 1_6 H1 · cao nhất —',
    ]);
    expect(lines.some((l) => l.includes('TB 1.890'))).toBe(true);
    expect(lines.some((l) => l.includes('TB 2.025'))).toBe(true);
    expect(lines.some((l) => l.includes('Δ 12\''))).toBe(true);
  });

  it('H2: chỉ 1_3 thấp/cao, không 1_6', () => {
    const h2Low = [ou('1_3', 50, 2, 3, 1.8), ou('1_3', 51, 2, 2.75, 1.7)];
    const h2High = [ou('1_3', 50, 2, 3, 1.95), ou('1_3', 51, 2, 2.75, 1.88)];
    const lines = buildOuLineDropChartLines({
      half: 2,
      ou13Low: h2Low,
      ou13High: h2High,
      ou16Low: low16,
      ou16High: high16,
    });
    expect(lines.some((l) => l.includes('1_6'))).toBe(false);
    expect(lines.filter((l) => l.startsWith('—'))).toEqual([
      '— 1_3 H2 · thấp nhất —',
      '— 1_3 H2 · cao nhất —',
    ]);
  });

  it('đánh dấu đoạn vừa rớt', () => {
    const lines = buildOuLineDropChartLines({
      half: 1,
      dropped: { market: '1_3', prevHandicap: 2.75, newHandicap: 2.5, minute: 12 },
      ou13Low: low13,
      ou13High: high13,
    });
    expect(lines.filter((l) => l.includes('(vừa rớt)')).length).toBeGreaterThanOrEqual(1);
  });

  it('H2 cao nhất chưa đổi nến sang line mới vẫn có Δ phút rớt', () => {
    const h2Low = [
      ou('1_3', 55, 2, 3, 1.84),
      ou('1_3', 62, 2, 3, 1.84),
      ou('1_3', 63, 2, 2.75, 1.7),
    ];
    const h2High = [
      ou('1_3', 56, 2, 3, 1.92),
      ou('1_3', 63, 2, 3, 1.91),
    ];
    const lines = buildOuLineDropChartLines({
      half: 2,
      dropped: {
        market: '1_3',
        prevHandicap: 3,
        newHandicap: 2.75,
        minute: 63,
        overDelta: 1.7 - 1.84,
      },
      ou13Low: h2Low,
      ou13High: h2High,
    });
    const highBlock = lines.slice(lines.findIndex((l) => l.includes('cao nhất')));
    expect(highBlock.some((l) => l.includes("Δ 63'") && l.includes('3→2.75'))).toBe(true);
  });
});
