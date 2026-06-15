import { v4 as uuidv4 } from 'uuid';
import type { BetLogPayload } from '../services/bet-logger.js';
import {
  formatHandicapLabel,
  pickOdds,
  parseTeamsFromMatchName,
  type FlowBetType,
} from '../telegram/bet-flow.js';

const BET_TYPE_LABELS: Record<FlowBetType, string> = {
  over: 'Tài',
  under: 'Xỉu',
  home: 'Đội nhà',
  away: 'Đội khách',
};

export function buildAgentBetLogPayload(input: {
  betId: string;
  matchId: string;
  matchName: string;
  leagueName?: string;
  betType: FlowBetType;
  snapshot: import('../ai-assistant-core/types.js').OddsSnapshot;
  stakeVnd: number;
  providerLabel: string;
  reasonVi: string;
}): BetLogPayload {
  const { betId, matchName, leagueName, betType, snapshot, stakeVnd, providerLabel, reasonVi } = input;
  const [doiNha, doiKhach] = parseTeamsFromMatchName(matchName);
  const handicapLabel = formatHandicapLabel(betType, snapshot);
  const keoVao = `${BET_TYPE_LABELS[betType]} ${handicapLabel}`.trim();
  const odds = pickOdds(betType, snapshot);
  if (odds === undefined) {
    throw new Error('Thiếu odds cho loại kèo');
  }
  const score = snapshot.score || 'N/A';
  const minute = snapshot.minute;

  return {
    betId,
    giaiDau: leagueName || 'N/A',
    doiNha,
    doiKhach,
    tySoLucVaoKeo: score,
    keoVao,
    phut: minute,
    tyLeAn: odds,
    soTienCuoc: stakeVnd,
    note: `[LiveAgent ${providerLabel}] ${reasonVi.slice(0, 500)} | matchId=${input.matchId}`,
  };
}

export function newBetId(): string {
  return typeof uuidv4 === 'function' ? uuidv4() : `bet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
