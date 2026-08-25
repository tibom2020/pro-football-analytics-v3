import { describe, expect, it } from 'vitest';
import { isMatchInOddsFetchWindow, parseListMatchClock } from '../match-odds-fetch-window';
import type { MatchInfo } from '../types';

function mk(minute: number, tt: string): MatchInfo {
  return {
    id: '1',
    league: { name: 'L' },
    home: { name: 'H' },
    away: { name: 'A' },
    ss: '0-0',
    time: String(minute),
    timer: { tm: minute, ts: 0, tt, ta: 0, md: 0 },
  };
}

describe('match-odds-fetch-window', () => {
  it('H1 trong khung 15–30', () => {
    expect(isMatchInOddsFetchWindow(mk(20, '1'))).toBe(true);
    expect(isMatchInOddsFetchWindow(mk(14, '1'))).toBe(false);
    expect(isMatchInOddsFetchWindow(mk(31, '1'))).toBe(false);
  });

  it('H2 trong khung 55–70', () => {
    expect(isMatchInOddsFetchWindow(mk(60, '2'))).toBe(true);
    expect(isMatchInOddsFetchWindow(mk(54, '2'))).toBe(false);
    expect(isMatchInOddsFetchWindow(mk(71, '2'))).toBe(false);
  });

  it('H2 đồng hồ reset (tm 15 = phút 60)', () => {
    const clock = parseListMatchClock(mk(15, '2'));
    expect(clock).toEqual({ half: 2, minute: 60 });
    expect(isMatchInOddsFetchWindow(mk(15, '2'))).toBe(true);
  });

  it('FT không fetch', () => {
    expect(isMatchInOddsFetchWindow(mk(90, '3'))).toBe(false);
  });
});
