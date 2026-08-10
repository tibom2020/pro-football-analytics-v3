import { describe, it, expect } from 'vitest';
import {
  parseHandicap,
  assignMinuteFrac,
  normalizeRawTicks,
  type RawTick,
} from '../odds-tick-series';

function raw(partial: Partial<RawTick> & Pick<RawTick, 'id' | 'add_time'>): RawTick {
  return {
    market: '1_3',
    time_str: '10',
    ss: '0-0',
    handicap: '2.5',
    over_od: '1.90',
    under_od: '1.90',
    ...partial,
  };
}

describe('parseHandicap', () => {
  it('kèo thường', () => {
    expect(parseHandicap('2.5')).toBe(2.5);
  });

  it('kèo chéo 2.0,2.5 → 2.25', () => {
    expect(parseHandicap('2.0,2.5')).toBe(2.25);
  });

  it('kèo chéo 3.5,3.75 → 3.625', () => {
    expect(parseHandicap('3.5,3.75')).toBe(3.625);
  });

  it('rác → NaN', () => {
    expect(Number.isNaN(parseHandicap('abc'))).toBe(true);
    expect(Number.isNaN(parseHandicap('2.0,x'))).toBe(true);
  });
});

describe('assignMinuteFrac', () => {
  it('1 tick → minute + 0.5', () => {
    const out = assignMinuteFrac([{ t: 1_000_000, minute: 10, half: 1 as const }]);
    expect(out[0].minuteFrac).toBe(10.5);
  });

  it('nhiều tick: sớm nhất = minute, sau tăng theo Δt/60000, kẹp ≤ minute+0.98', () => {
    const t0 = 1_720_000_000_000;
    const out = assignMinuteFrac([
      { t: t0, minute: 12, half: 1 as const, id: 'a' },
      { t: t0 + 30_000, minute: 12, half: 1 as const, id: 'b' },
      { t: t0 + 120_000, minute: 12, half: 1 as const, id: 'c' }, // 2 phút wall → kẹp 0.98
    ]);
    expect(out[0].minuteFrac).toBe(12);
    expect(out[1].minuteFrac).toBeCloseTo(12.5, 10);
    expect(out[2].minuteFrac).toBe(12.98);
  });

  it('hai phút khác nhau không dùng chung tMin', () => {
    const t0 = 1_720_000_000_000;
    const out = assignMinuteFrac([
      { t: t0, minute: 10, half: 1 as const },
      { t: t0 + 5_000, minute: 11, half: 1 as const },
    ]);
    expect(out[0].minuteFrac).toBe(10.5);
    expect(out[1].minuteFrac).toBe(11.5);
  });
});

describe('normalizeRawTicks', () => {
  it('tách prematch khỏi inPlay', () => {
    const { inPlay, prematch } = normalizeRawTicks(
      [
        raw({ id: 'pre', add_time: '1720000000', time_str: null }),
        raw({ id: 'live', add_time: '1720000060', time_str: '5' }),
      ],
      'ou',
    );
    expect(prematch).toHaveLength(1);
    expect(prematch[0].id).toBe('pre');
    expect(inPlay).toHaveLength(1);
    expect(inPlay[0].id).toBe('live');
  });

  it('over_od "-" → suspended, eff null, vẫn giữ tick', () => {
    const { inPlay } = normalizeRawTicks(
      [
        raw({
          id: 's1',
          add_time: '1720000000',
          time_str: '8',
          over_od: '-',
          under_od: '-',
        }),
      ],
      'ou',
    );
    expect(inPlay).toHaveLength(1);
    expect(inPlay[0].suspended).toBe(true);
    expect(inPlay[0].eff).toBeNull();
  });

  it('id trùng → giữ bản đầu (sau sort t)', () => {
    const { inPlay } = normalizeRawTicks(
      [
        raw({
          id: 'same',
          add_time: '1720000000',
          time_str: '10',
          over_od: '1.90',
          under_od: '1.90',
        }),
        raw({
          id: 'same',
          add_time: '1720000010',
          time_str: '10',
          over_od: '1.50',
          under_od: '2.50',
        }),
      ],
      'ou',
    );
    expect(inPlay).toHaveLength(1);
    expect(inPlay[0].overOd).toBe('1.90');
  });

  it('kèo chéo handicap = 2.25', () => {
    const { inPlay } = normalizeRawTicks(
      [
        raw({
          id: 'x',
          add_time: '1720000000',
          time_str: '15',
          handicap: '2.0,2.5',
          over_od: '1.90',
          under_od: '1.90',
        }),
      ],
      'ou',
    );
    expect(inPlay[0].handicap).toBe(2.25);
    expect(inPlay[0].handicapRaw).toBe('2.0,2.5');
    expect(inPlay[0].eff).toBe(2.25); // over===under → p=0.5
  });

  it('gán minuteFrac cho inPlay', () => {
    const { inPlay } = normalizeRawTicks(
      [
        raw({ id: 'a', add_time: '1720000000', time_str: '20' }),
        raw({ id: 'b', add_time: '1720000030', time_str: '20' }),
      ],
      'ou',
    );
    expect(inPlay[0].minuteFrac).toBe(20);
    expect(inPlay[1].minuteFrac).toBeCloseTo(20.5, 10);
  });

  it('tt≥2 + đồng hồ liên tục: phút ≥45 → half=2 (không cần reset phút)', () => {
    const { inPlay } = normalizeRawTicks(
      [
        raw({ id: 'h1', add_time: '1720000000', time_str: '40' }),
        raw({ id: 'h2a', add_time: '1720001000', time_str: '46' }),
        raw({ id: 'h2b', add_time: '1720002000', time_str: '60' }),
      ],
      'ou',
      { matchTimer: { tm: 60, ts: 0, tt: '2' }, market: '1_3' },
    );
    expect(inPlay.find((t) => t.id === 'h1')?.half).toBe(1);
    expect(inPlay.find((t) => t.id === 'h2a')?.half).toBe(2);
    expect(inPlay.find((t) => t.id === 'h2b')?.half).toBe(2);
  });

  it('tt=1 nhưng tm≥50 + phút ≥46 half=1 → tách H2 theo phút', () => {
    const { inPlay } = normalizeRawTicks(
      [
        raw({ id: 'a', add_time: '1720000000', time_str: '30' }),
        raw({ id: 'b', add_time: '1720001000', time_str: '55' }),
      ],
      'ou',
      { matchTimer: { tm: 55, ts: 0, tt: '1' }, market: '1_3' },
    );
    expect(inPlay.find((t) => t.id === 'a')?.half).toBe(1);
    expect(inPlay.find((t) => t.id === 'b')?.half).toBe(2);
  });

  it('market 1_6 luôn half=1', () => {
    const { inPlay } = normalizeRawTicks(
      [raw({ id: 'x', add_time: '1720000000', time_str: '60', market: '1_6' })],
      'ou',
      { matchTimer: { tm: 60, ts: 0, tt: '2' }, market: '1_6' },
    );
    expect(inPlay[0].half).toBe(1);
  });
});
