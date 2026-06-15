import type { BetTicket, MatchInfo } from '../types';
import type { AgentOrderRecord, AgentProvider } from './live-agent-client';
import { buildNoteSummary, type NoteContext } from './bet-sheet-log';
import { saveBetTickets } from './bet-storage';

export const PFA_BET_TICKETS_UPDATED = 'pfa-bet-tickets-updated';

const AGENT_LABEL: Record<AgentProvider, string> = {
  gpt: 'Tí Bơm',
  gemini: 'Tí Nị',
  deepseek: 'Tuệ Tuệ',
};

function flowBetToUi(
  bt: AgentOrderRecord['betType'],
): BetTicket['betType'] {
  switch (bt) {
    case 'over':
      return 'Tài';
    case 'under':
      return 'Xỉu';
    case 'home':
      return 'Đội nhà';
    case 'away':
      return 'Đội khách';
    default:
      return 'Tài';
  }
}

function isAgentOrderRecord(o: unknown): o is AgentOrderRecord {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.betId === 'string' &&
    typeof r.matchId === 'string' &&
    typeof r.betType === 'string' &&
    typeof r.odds === 'number' &&
    typeof r.stakeVnd === 'number'
  );
}

/**
 * Thêm vé từ Live Agent vào cùng kho `betTickets` với vé tay — dedupe theo `betId`
 * (trùng `betId` với server đã ghi Sheet). Không gọi API Sheet lần nữa.
 */
export function mergeAgentOrdersIntoBetTickets(
  match: MatchInfo,
  orders: unknown[],
  noteCtx: NoteContext = {},
): number {
  try {
    const storedTickets = localStorage.getItem('betTickets');
    const allTickets: BetTicket[] = storedTickets ? JSON.parse(storedTickets) : [];
    const existingBetIds = new Set(
      allTickets.map((t) => t.betId).filter((id): id is string => !!id && id.length > 0),
    );

    let added = 0;
    const baseNote = buildNoteSummary(match, noteCtx);

    for (const raw of orders) {
      if (!isAgentOrderRecord(raw)) continue;
      const o = raw;
      if (o.matchId !== match.id) continue;
      if (existingBetIds.has(o.betId)) continue;

      const label = AGENT_LABEL[o.provider] ?? o.provider;
      const agentTail = `${label} (${o.mode}) — ${o.reasonVi}`;
      const noteSnapshot = `${baseNote} | Live Agent: ${agentTail}`;

      const ticket: BetTicket = {
        id: `agent-${o.betId}`,
        matchId: o.matchId,
        matchName: o.matchName,
        betType: flowBetToUi(o.betType),
        handicap: o.handicapLabel || '0',
        odds: o.odds,
        stake: o.stakeVnd,
        minute: o.minute,
        scoreAtBet: o.score,
        status: 'pending',
        createdAt: o.createdAt,
        notes: `[Live Agent · ${label}] ${o.reasonVi}`,
        betId: o.betId,
        leagueName: o.leagueName ?? match.league?.name ?? 'N/A',
        noteSnapshot,
        sheetSynced: o.sheetStatus === 'ok',
      };

      allTickets.push(ticket);
      existingBetIds.add(o.betId);
      added++;
    }

    if (added > 0) {
      saveBetTickets(allTickets);
      window.dispatchEvent(new CustomEvent(PFA_BET_TICKETS_UPDATED));
    }

    return added;
  } catch (e) {
    console.warn('[agent-tickets-merge]', e);
    return 0;
  }
}
