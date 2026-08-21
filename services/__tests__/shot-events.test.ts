import { describe, expect, it } from 'vitest';
import { chartMinuteForHalf, encodeStatTimelineKey, detectH2ClockMode } from '../matchTimeline';
import { deriveShotEventsFromStatsHistory } from '../shot-events';
import type { ProcessedStats } from '../../types';

function stats(on: number, off: number): ProcessedStats {
  return {
    attacks: [0, 0],
    dangerous_attacks: [0, 0],
    on_target: [on, 0],
    off_target: [off, 0],
    corners: [0, 0],
    yellowcards: [0, 0],
    redcards: [0, 0],
  };
}

describe('detectH2ClockMode', () => {
  it('liên tục khi có phút ≥45', () => {
    expect(detectH2ClockMode([0, 1, 45, 46])).toBe('continuous');
  });
  it('reset khi chỉ có 0–44', () => {
    expect(detectH2ClockMode([0, 10, 44])).toBe('reset');
  });
});

describe('chartMinuteForHalf', () => {
  it('H2 reset clock cộng 45', () => {
    expect(chartMinuteForHalf(2, 10, 'reset')).toBe(55);
    expect(chartMinuteForHalf(2, 55, 'reset')).toBe(55);
  });
  it('H2 liên tục giữ nguyên phút', () => {
    expect(chartMinuteForHalf(2, 45, 'continuous')).toBe(45);
    expect(chartMinuteForHalf(2, 10, 'continuous')).toBe(10);
  });
});

describe('deriveShotEventsFromStatsHistory', () => {
  it('H2 lũy kế: không dồn bóng phút 45 nếu đã có mốc H1', () => {
    const history: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 44)]: stats(5, 2),
      [encodeStatTimelineKey(2, 45)]: stats(5, 2),
      [encodeStatTimelineKey(2, 50)]: stats(6, 2),
    };
    const events = deriveShotEventsFromStatsHistory(history);
    expect(events.filter((e) => e.half === 2)).toEqual([
      { minute: 50, type: 'on', half: 2 },
    ]);
  });

  it('H2 reset counter: baseline H1 không chặn sút mới', () => {
    const history: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 40)]: stats(5, 0),
      [encodeStatTimelineKey(2, 0)]: stats(1, 0),
      [encodeStatTimelineKey(2, 5)]: stats(2, 0),
    };
    const events = deriveShotEventsFromStatsHistory(history);
    expect(events.filter((e) => e.half === 2)).toEqual([
      { minute: 45, type: 'on', half: 2 },
      { minute: 50, type: 'on', half: 2 },
    ]);
  });

  it('H2 liên tuc: bỏ mốc reset 0–44, tránh trùng phút 45', () => {
    const history: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 44)]: stats(3, 0),
      [encodeStatTimelineKey(2, 0)]: stats(8, 0),
      [encodeStatTimelineKey(2, 45)]: stats(8, 0),
      [encodeStatTimelineKey(2, 48)]: stats(9, 0),
    };
    const events = deriveShotEventsFromStatsHistory(history);
    expect(events.filter((e) => e.half === 2 && e.minute === 45)).toHaveLength(0);
    expect(events.filter((e) => e.half === 2)).toEqual([
      { minute: 48, type: 'on', half: 2 },
    ]);
  });

  it('phút trống vẫn ghi nhận delta tại mốc mới', () => {
    const history: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 10)]: stats(0, 0),
      [encodeStatTimelineKey(1, 18)]: stats(2, 1),
    };
    const events = deriveShotEventsFromStatsHistory(history);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.minute === 18)).toBe(true);
  });
});
