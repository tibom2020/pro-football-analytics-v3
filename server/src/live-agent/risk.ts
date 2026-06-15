import type { FlowBetType } from '../telegram/bet-flow.js';
import { isMatchLiveForBet, type OddsMonitorBetPick } from '../telegram/bet-flow.js';
import type { AgentSharedConfig, AgentProvider } from './types.js';

export interface RiskState {
  ordersByMatch: Map<string, number>;
  lastOrderAtByMatch: Map<string, number>;
}

export function createEmptyRiskState(): RiskState {
  return {
    ordersByMatch: new Map(),
    lastOrderAtByMatch: new Map(),
  };
}

export function incrementOrderCount(state: RiskState, matchId: string): void {
  state.ordersByMatch.set(matchId, (state.ordersByMatch.get(matchId) ?? 0) + 1);
  state.lastOrderAtByMatch.set(matchId, Date.now());
}

export function getOrdersForMatch(state: RiskState, matchId: string): number {
  return state.ordersByMatch.get(matchId) ?? 0;
}

export interface RiskCheckInput {
  monitor: OddsMonitorBetPick;
  matchId: string;
  nowMs: number;
  shared: AgentSharedConfig;
  risk: RiskState;
  provider: AgentProvider;
  betType: FlowBetType | undefined;
  stakeVnd: number;
}

export type RiskCheckResult = { ok: true } | { ok: false; reasonVi: string };

/** Cổng rủi ro trước khi gọi LLM place order (sau khi đã parse bet). */
export function checkCanPlaceOrder(input: RiskCheckInput): RiskCheckResult {
  const { monitor, matchId, nowMs, shared, risk, betType, stakeVnd } = input;

  if (!isMatchLiveForBet(monitor, matchId, nowMs)) {
    return { ok: false, reasonVi: 'Trận không còn coi là live (phút/feed).' };
  }

  const n = getOrdersForMatch(risk, matchId);
  if (n >= shared.maxOrdersPerMatch) {
    return { ok: false, reasonVi: `Đã đạt tối đa ${shared.maxOrdersPerMatch} lệnh/trận cho agent này.` };
  }

  const lastAt = risk.lastOrderAtByMatch.get(matchId);
  if (lastAt !== undefined && nowMs - lastAt < shared.cooldownMs) {
    return { ok: false, reasonVi: `Cooldown ${Math.ceil((shared.cooldownMs - (nowMs - lastAt)) / 1000)}s.` };
  }

  if (!betType || !shared.allowedBetTypes.includes(betType)) {
    return { ok: false, reasonVi: 'Loại kèo không được phép.' };
  }

  if (!Number.isFinite(stakeVnd) || stakeVnd <= 0) {
    return { ok: false, reasonVi: 'Stake không hợp lệ.' };
  }

  if (stakeVnd > shared.maxStakeVnd) {
    return { ok: false, reasonVi: `Stake vượt trần ${shared.maxStakeVnd.toLocaleString('vi-VN')} VND.` };
  }

  return { ok: true };
}
