import { describe, expect, it } from 'vitest';

/**
 * Mirror rule client/server: hạ line + Tài ≤ priceMax.
 * (Logic thuần — tránh import frontend vào server vitest.)
 */
function shouldAlertOuLineDrop(
  prevLine: number,
  currLine: number,
  overOdds: number,
  priceMax = 1.725,
): boolean {
  return currLine < prevLine && overOdds <= priceMax;
}

describe('ou line drop rule', () => {
  it('alerts on line drop with cheap over', () => {
    expect(shouldAlertOuLineDrop(2.5, 2.25, 1.7)).toBe(true);
  });

  it('rejects line rise', () => {
    expect(shouldAlertOuLineDrop(2.25, 2.5, 1.7)).toBe(false);
  });

  it('rejects expensive over', () => {
    expect(shouldAlertOuLineDrop(2.5, 2.25, 1.8)).toBe(false);
  });

  it('accepts exactly 1.725', () => {
    expect(shouldAlertOuLineDrop(3, 2.75, 1.725)).toBe(true);
  });
});
