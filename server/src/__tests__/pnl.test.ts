import { describe, it, expect } from 'vitest';
import { calculatePnL, isBetResult } from '../services/pnl.js';

describe('calculatePnL', () => {
  it('won: returns net profit = stake * (odds - 1)', () => {
    expect(calculatePnL(100_000, 1.95, 'won')).toBe(95_000);
    expect(calculatePnL(50, 2.0, 'won')).toBe(50);
    expect(calculatePnL(200_000, 1.5, 'won')).toBe(100_000);
  });

  it('lost: returns -stake', () => {
    expect(calculatePnL(100_000, 1.95, 'lost')).toBe(-100_000);
    expect(calculatePnL(75, 2.5, 'lost')).toBe(-75);
  });

  it('push: returns 0', () => {
    expect(calculatePnL(100_000, 1.95, 'push')).toBe(0);
    expect(calculatePnL(1, 1.01, 'push')).toBe(0);
  });

  it('won_half: returns half of net win', () => {
    expect(calculatePnL(100_000, 1.95, 'won_half')).toBe(47_500);
    expect(calculatePnL(200_000, 2.0, 'won_half')).toBe(100_000);
  });

  it('lost_half: returns -stake/2', () => {
    expect(calculatePnL(100_000, 1.95, 'lost_half')).toBe(-50_000);
    expect(calculatePnL(80, 1.8, 'lost_half')).toBe(-40);
  });

  it('rounds to 2 decimals', () => {
    expect(calculatePnL(33, 1.95, 'won')).toBeCloseTo(31.35, 2);
    expect(calculatePnL(33, 1.95, 'won_half')).toBeCloseTo(15.68, 1);
  });

  it('returns 0 for invalid input', () => {
    expect(calculatePnL(NaN, 1.95, 'won')).toBe(0);
    expect(calculatePnL(100, NaN, 'won')).toBe(0);
    expect(calculatePnL(0, 1.95, 'won')).toBe(0);
    expect(calculatePnL(-100, 1.95, 'won')).toBe(0);
    expect(calculatePnL(100, 0, 'won')).toBe(0);
    expect(calculatePnL(100, -1, 'won')).toBe(0);
  });
});

describe('isBetResult', () => {
  it('accepts the canonical 5 results', () => {
    expect(isBetResult('won')).toBe(true);
    expect(isBetResult('lost')).toBe(true);
    expect(isBetResult('push')).toBe(true);
    expect(isBetResult('won_half')).toBe(true);
    expect(isBetResult('lost_half')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isBetResult('pending')).toBe(false);
    expect(isBetResult('WON')).toBe(false);
    expect(isBetResult('')).toBe(false);
    expect(isBetResult(undefined)).toBe(false);
    expect(isBetResult(null)).toBe(false);
    expect(isBetResult(1)).toBe(false);
  });
});
