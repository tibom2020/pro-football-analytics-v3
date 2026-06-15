import { describe, it, expect } from 'vitest';
import {
  checkCanPlaceOrder,
  createEmptyRiskState,
  incrementOrderCount,
  getOrdersForMatch,
} from '../live-agent/risk.js';
import type { OddsMonitorBetPick } from '../telegram/bet-flow.js';
import type { AgentSharedConfig } from '../live-agent/types.js';

function makeMonitor(minute = 55, lastPush = Date.now()): OddsMonitorBetPick {
  return {
    getLastOddsSnapshot: () => ({
      minute,
      handicap: 2.5,
      score: '1-1',
      overOdds: 1.9,
      underOdds: 1.9,
    }),
    getLastOddsPushAt: () => lastPush,
  };
}

const shared: AgentSharedConfig = {
  stakeVnd: 100_000,
  maxOrdersPerMatch: 2,
  cooldownMs: 60_000,
  maxStakeVnd: 5_000_000,
  allowedBetTypes: ['over', 'under', 'home', 'away'],
  userId: 'u1',
  executionMode: 'paper',
};

describe('checkCanPlaceOrder', () => {
  it('blocks when max orders reached', () => {
    const risk = createEmptyRiskState();
    incrementOrderCount(risk, 'm1');
    incrementOrderCount(risk, 'm1');
    const r = checkCanPlaceOrder({
      monitor: makeMonitor(),
      matchId: 'm1',
      nowMs: Date.now(),
      shared,
      risk,
      provider: 'gpt',
      betType: 'over',
      stakeVnd: 100_000,
    });
    expect(r.ok).toBe(false);
  });

  it('allows first order', () => {
    const risk = createEmptyRiskState();
    const r = checkCanPlaceOrder({
      monitor: makeMonitor(),
      matchId: 'm1',
      nowMs: Date.now(),
      shared,
      risk,
      provider: 'gpt',
      betType: 'over',
      stakeVnd: 100_000,
    });
    expect(r.ok).toBe(true);
  });

  it('blocks within cooldown', () => {
    const risk = createEmptyRiskState();
    const t0 = 1_000_000;
    risk.lastOrderAtByMatch.set('m1', t0);
    const r = checkCanPlaceOrder({
      monitor: makeMonitor(),
      matchId: 'm1',
      nowMs: t0 + 5_000,
      shared,
      risk,
      provider: 'gpt',
      betType: 'over',
      stakeVnd: 100_000,
    });
    expect(r.ok).toBe(false);
  });

  it('allows after cooldown', () => {
    const risk = createEmptyRiskState();
    const t0 = 1_000_000;
    risk.lastOrderAtByMatch.set('m1', t0);
    const r = checkCanPlaceOrder({
      monitor: makeMonitor(),
      matchId: 'm1',
      nowMs: t0 + 70_000,
      shared,
      risk,
      provider: 'gpt',
      betType: 'over',
      stakeVnd: 100_000,
    });
    expect(r.ok).toBe(true);
  });
});

describe('getOrdersForMatch', () => {
  it('returns count', () => {
    const risk = createEmptyRiskState();
    expect(getOrdersForMatch(risk, 'x')).toBe(0);
    incrementOrderCount(risk, 'x');
    expect(getOrdersForMatch(risk, 'x')).toBe(1);
  });
});
