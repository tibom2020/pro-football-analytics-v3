/**
 * HTTP client gọi Python sidecar debate (agent-debate-service/).
 *
 * Khi `config.agent.decisionMode === 'debate'`, service.ts sẽ gọi
 * `callDebateSidecar(config, ctx)` để nhận consensus + per-agent opinion
 * thay vì gọi LLM trực tiếp qua llm-clients.ts.
 */
import { randomUUID } from 'node:crypto';
import type { config as AppConfig } from '../config.js';
import type { AgentLLMContext } from './types.js';
import type { FlowBetType } from '../telegram/bet-flow.js';
import { logger } from '../logger.js';

type Config = typeof AppConfig;

export type DebateAction = 'skip' | 'bet';

export interface DebateAgentOpinion {
  action: DebateAction;
  betType?: FlowBetType;
  reasonVi: string;
  confidence: number;
  updatedInR2: boolean;
}

export interface DebateConsensus {
  action: DebateAction;
  betType?: FlowBetType;
  reasonVi: string;
  confidence: number;
}

export interface DebateTimings {
  round1Ms: number;
  round2Ms: number;
  moderatorMs: number;
  totalMs: number;
}

export interface DebateResult {
  ok: boolean;
  consensus?: DebateConsensus;
  voteSummary?: string;
  moderatorNoteVi?: string;
  /** Keys giới hạn ở 'gpt' | 'gemini' | 'deepseek' nhưng để string cho linh hoạt. */
  agents?: Record<string, DebateAgentOpinion>;
  timings?: DebateTimings;
  error?: string;
  /** request id để correlate với log sidecar */
  requestId: string;
}

/**
 * Gửi 1 request /debate tới sidecar. KHÔNG throw — luôn return DebateResult
 * (caller check `.ok` để quyết định fallback).
 */
export async function callDebateSidecar(
  config: Config,
  ctx: AgentLLMContext,
): Promise<DebateResult> {
  const requestId = randomUUID();
  const url = config.agent.debateSidecarUrl.replace(/\/$/, '') + '/debate';
  const body = buildDebateRequest(ctx, config);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.agent.debateTimeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        error: `HTTP ${res.status}: ${text.slice(0, 300)}`,
        requestId,
      };
    }

    const json = (await res.json()) as Omit<DebateResult, 'requestId'>;
    return { ...json, requestId };
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === 'AbortError'
        ? `timeout after ${config.agent.debateTimeoutMs}ms`
        : e instanceof Error
          ? `${e.name}: ${e.message}`
          : String(e);
    logger.warn(`[debate-client] call failed reqId=${requestId} err=${msg}`);
    return { ok: false, error: msg, requestId };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build request body từ AgentLLMContext. Strip `providerLabel` (sidecar tự gán).
 * Pass-through các field telegram* và options.round2Enabled.
 */
function buildDebateRequest(ctx: AgentLLMContext, config: Config): unknown {
  const { providerLabel: _unused, ...rest } = ctx;
  void _unused;
  return {
    ...rest,
    options: {
      round2Enabled: config.agent.debateRound2Enabled,
      moderatorModel: config.agent.debateModeratorModel || undefined,
    },
  };
}
