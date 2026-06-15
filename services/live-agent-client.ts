import { AI_SERVER_URL } from './ai-service';
import { getAppUserId } from './user-id';

export type AgentProvider = 'gpt' | 'gemini' | 'deepseek';

export type AgentExecutionMode = 'paper' | 'live';

export type AgentFlowBetType = 'over' | 'under' | 'home' | 'away';

/** Khớp server `AgentOrderRecord` — lệnh đặt từ Live Agent. */
export interface AgentOrderRecord {
  betId: string;
  provider: AgentProvider;
  matchId: string;
  matchName: string;
  leagueName?: string;
  betType: AgentFlowBetType;
  handicapLabel: string;
  odds: number;
  stakeVnd: number;
  minute: number;
  score?: string;
  reasonVi: string;
  mode: AgentExecutionMode;
  createdAt: number;
  sheetStatus: 'ok' | 'skipped' | 'error';
  sheetDetail?: string;
  telegramStatus?: string;
  telegramDetail?: string;
}

export interface AgentProviderPublicStatus {
  provider: AgentProvider;
  enabled: boolean;
  apiConfigured: boolean;
  lastDecisionAt: number | null;
  lastDecisionSummaryVi: string | null;
  lastDecisionAction: 'skip' | 'bet' | 'error' | null;
  lastError: string | null;
  ordersThisMatch: number;
  lastOrder: Record<string, unknown> | null;
  busy: boolean;
}

/** Lịch sử quyết định của 1 agent (skip + bet). Mirror server `AgentDecisionLog`. */
export interface AgentDecisionLog {
  id: string;
  createdAt: number;
  matchId: string;
  matchName: string;
  leagueName?: string;
  minute: number;
  score?: string;
  provider: AgentProvider;
  providerLabel: string;
  action: 'skip' | 'bet';
  betType?: AgentFlowBetType;
  handicapLabel?: string;
  odds?: number;
  stakeVnd?: number;
  reasonVi: string;
  userPrompt?: string;
  isConsensus?: boolean;
  debateVoteSummary?: string;
  confidence?: number;
}

export interface LiveAgentRegistryStatus {
  emergencyStopped: boolean;
  shared: {
    stakeVnd: number;
    maxOrdersPerMatch: number;
    cooldownMs: number;
    maxStakeVnd: number;
    allowedBetTypes: string[];
    userId: string;
    executionMode: AgentExecutionMode;
  };
  providers: Record<AgentProvider, AgentProviderPublicStatus>;
  recentOrders: AgentOrderRecord[];
  recentDecisions?: AgentDecisionLog[];
  disclaimerVi: string;
}

function agentHeaders(): HeadersInit {
  const token = (import.meta.env.VITE_AGENT_CONTROL_TOKEN as string) || '';
  return {
    'Content-Type': 'application/json',
    'X-Agent-Control-Token': token,
  };
}

export async function fetchLiveAgentStatus(matchId?: string): Promise<LiveAgentRegistryStatus> {
  const u = new URL(`${AI_SERVER_URL}/api/live-agent/status`);
  if (matchId) u.searchParams.set('matchId', matchId);
  const r = await fetch(u.toString(), { headers: agentHeaders() });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(text || r.statusText);
  }
  return JSON.parse(text) as LiveAgentRegistryStatus;
}

export async function postLiveAgentEmergencyStop(): Promise<LiveAgentRegistryStatus> {
  const r = await fetch(`${AI_SERVER_URL}/api/live-agent/emergency-stop`, {
    method: 'POST',
    headers: agentHeaders(),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text) as LiveAgentRegistryStatus;
}

export async function postLiveAgentClearEmergency(): Promise<LiveAgentRegistryStatus> {
  const r = await fetch(`${AI_SERVER_URL}/api/live-agent/clear-emergency`, {
    method: 'POST',
    headers: agentHeaders(),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text) as LiveAgentRegistryStatus;
}

export async function postLiveAgentConfig(body: {
  userId?: string;
  stakeVnd?: number;
  maxOrdersPerMatch?: number;
  cooldownMs?: number;
  executionMode?: AgentExecutionMode;
  agents?: Partial<Record<AgentProvider, { enabled?: boolean }>>;
}): Promise<LiveAgentRegistryStatus> {
  const r = await fetch(`${AI_SERVER_URL}/api/live-agent/config`, {
    method: 'POST',
    headers: agentHeaders(),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text) as LiveAgentRegistryStatus;
}

export async function postLiveAgentTrigger(
  matchId: string,
  userPrompt?: string,
): Promise<LiveAgentRegistryStatus> {
  const body: { matchId: string; userPrompt?: string } = { matchId };
  if (userPrompt && userPrompt.trim()) body.userPrompt = userPrompt.trim();
  const r = await fetch(`${AI_SERVER_URL}/api/live-agent/trigger`, {
    method: 'POST',
    headers: agentHeaders(),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text) as LiveAgentRegistryStatus;
}
