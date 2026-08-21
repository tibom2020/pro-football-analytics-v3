import { describe, it, expect } from 'vitest';
import type { OverUnderMinuteSnapshot, ProcessedStats } from '../../types';
import { encodeStatTimelineKey } from '../matchTimeline';
import {
  listOuLowOverRows,
  halfPeriodShotTotalsAt,
  OU_LINE_DROP_PRICE_MAX,
} from '../ou-line-drop-alert';

function ou(
  marketId: '1_3' | '1_6',
  minute: number,
  half: 1 | 2,
  handicap: number,
  over: number,
): OverUnderMinuteSnapshot {
  return { marketId, minute, half, handicap, over, under: 2.1 };
}

function stats(
  onH: number,
  onA: number,
  offH: number,
  offA: number,
): ProcessedStats {
  return {
    attacks: [0, 0],
    dangerous_attacks: [0, 0],
    on_target: [onH, onA],
    off_target: [offH, offA],
    corners: [0, 0],
    yellowcards: [0, 0],
    redcards: [0, 0],
  };
}

describe('listOuLowOverRows', () => {
  it('giữ đúng ngưỡng 1.725 và loại giá cao hơn', () => {
    const rows = listOuLowOverRows(
      [
        ou('1_3', 10, 1, 2.5, 1.725),
        ou('1_3', 12, 1, 2.5, 1.726),
        ou('1_3', 14, 1, 2.25, 1.7),
      ],
      [],
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.over)).toEqual([1.725, 1.7]);
    expect(rows.every((r) => r.onTarget === null && r.totalShots === null)).toBe(true);
  });

  it('gộp 1_3 và 1_6, sort half rồi minute', () => {
    const rows = listOuLowOverRows(
      [ou('1_3', 50, 2, 3, 1.7)],
      [ou('1_6', 20, 1, 1.5, 1.65)],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ marketId: '1_6', half: 1, minute: 20 });
    expect(rows[1]).toMatchObject({ marketId: '1_3', half: 2, minute: 50 });
  });

  it('dedupe poll lặp cùng market/phút/line/giá', () => {
    const dup = ou('1_3', 30, 1, 2.5, 1.72);
    const rows = listOuLowOverRows([dup, { ...dup }, { ...dup, over: 1.71 }], []);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.over)).toEqual([1.72, 1.71]);
  });

  it('dùng OU_LINE_DROP_PRICE_MAX mặc định', () => {
    expect(OU_LINE_DROP_PRICE_MAX).toBe(1.725);
  });

  it('H1: gắn OT / Sút từ snap ≤ phút', () => {
    const hist: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 10)]: stats(2, 1, 3, 2), // OT=3, shots=8
      [encodeStatTimelineKey(1, 14)]: stats(3, 2, 4, 3), // OT=5, shots=12
    };
    const rows = listOuLowOverRows(
      [ou('1_3', 12, 1, 2.5, 1.7)],
      [],
      hist,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].onTarget).toBe(3);
    expect(rows[0].totalShots).toBe(8);
  });

  it('H2: OT/Sút = snap H2 − last H1', () => {
    const hist: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 45)]: stats(4, 2, 5, 3), // H1 OT=6, off=8
      [encodeStatTimelineKey(2, 55)]: stats(7, 4, 8, 5), // cum OT=11, off=13 → H2 OT=5, shots=10
    };
    const rows = listOuLowOverRows(
      [ou('1_3', 55, 2, 2.5, 1.68)],
      [],
      hist,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].onTarget).toBe(5);
    expect(rows[0].totalShots).toBe(10);
  });

  it('thiếu stats → onTarget/totalShots null', () => {
    const rows = listOuLowOverRows([ou('1_3', 20, 1, 2.5, 1.7)], [], {});
    expect(rows[0].onTarget).toBeNull();
    expect(rows[0].totalShots).toBeNull();
  });

  it('H2 thiếu mốc H1 → dùng số tuyệt đối tại mốc H2', () => {
    const hist: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(2, 50)]: stats(5, 3, 4, 2), // OT=8, shots=14
    };
    const rows = listOuLowOverRows([ou('1_3', 50, 2, 2.5, 1.7)], [], hist);
    expect(rows[0].onTarget).toBe(8);
    expect(rows[0].totalShots).toBe(14);
  });

  it('tab mở muộn: lấy mốc sau phút kèo trong cùng hiệp', () => {
    const hist: Record<number, ProcessedStats> = {
      [encodeStatTimelineKey(1, 40)]: stats(4, 2, 6, 3), // OT=6, shots=15
    };
    const rows = listOuLowOverRows([ou('1_3', 22, 1, 2.5, 1.7)], [], hist);
    expect(rows[0].onTarget).toBe(6);
    expect(rows[0].totalShots).toBe(15);
  });
});

describe('halfPeriodShotTotalsAt', () => {
  it('trả null khi không có history', () => {
    expect(halfPeriodShotTotalsAt(null, 1, 10)).toEqual({
      onTarget: null,
      totalShots: null,
      dangerousAttacks: null,
    });
  });
});
