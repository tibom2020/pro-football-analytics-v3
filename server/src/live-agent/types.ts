import type { OddsAlert, OddsSnapshot } from '../ai-assistant-core/types.js';
import type { FlowBetType } from '../telegram/bet-flow.js';

export type AgentProvider = 'gpt' | 'gemini' | 'deepseek';

export type AgentExecutionMode = 'paper' | 'live';

export interface AgentSharedConfig {
  stakeVnd: number;
  maxOrdersPerMatch: number;
  cooldownMs: number;
  maxStakeVnd: number;
  allowedBetTypes: FlowBetType[];
  userId: string;
  executionMode: AgentExecutionMode;
}

export interface AgentProviderConfig {
  enabled: boolean;
}

export interface AgentDecisionPayload {
  action: 'skip' | 'bet';
  betType?: FlowBetType;
  /** Tiếng Việt, ngắn — tóm tắt tín hiệu / rule LLM. */
  reasonVi: string;
}

export interface SimilarMatchEntry {
  matchId: string;
  half: number;
  minute: number;
  /** 1 = có bàn trong cửa sổ, 0 = không có bàn */
  label: 0 | 1;
  similarity: number;
}

export interface AgentLLMContext {
  providerLabel: string;
  matchId: string;
  matchName: string;
  leagueName?: string;
  snapshot: OddsSnapshot;
  recentAlerts: OddsAlert[];
  oddsHistoryTail: OddsSnapshot[];
  telegramPerTeamApiLines?: string[];
  telegramStatsLines?: string[];
  telegramTraditionalFactorsLines?: string[];
  telegramPressureBell?: string;
  telegramOuDrop?: string;
  /** Yêu cầu cụ thể từ người dùng (vd "đánh giá kèo Tài H1", "vào kèo chấp home được không"). */
  userPrompt?: string;
  constraints: {
    stakeVnd: number;
    maxOrdersPerMatch: number;
    ordersAlready: number;
    allowedBetTypes: FlowBetType[];
    executionMode: AgentExecutionMode;
  };
  /** Xác suất có bàn thắng trong 15 phút tới (model XGBoost 15min). null = model chưa load. */
  goalProb15?: number | null;
  /** Xác suất có bàn thắng trong 5 phút tới (model XGBoost 5min). null = model chưa load. */
  goalProb5?: number | null;
  /** Top 5 trận tương tự nhất từ RAG store (cosine similarity trên feature vector). */
  similarMatches?: SimilarMatchEntry[];
  /** Feature quan trọng theo model 15' cho snapshot live hiện tại. */
  goalTopFeatures?: Array<{ name: string; value: number; importance: number }>;
  /** Chất lượng feature live: full-ish có stats text, odds-only chỉ có kèo/alert. */
  goalFeatureQuality?: 'full-ish' | 'odds-only';
}

export interface AgentOrderRecord {
  betId: string;
  provider: AgentProvider;
  matchId: string;
  matchName: string;
  leagueName?: string;
  betType: FlowBetType;
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
  telegramStatus: 'sent' | 'failed' | 'skipped';
  telegramDetail?: string;
  /** True khi record là consensus tổng hợp từ debate (provider field giữ nguyên 1 trong 3 để pass type). */
  isConsensus?: boolean;
  /** Vote summary từ moderator (vd "2/3 bet over"). */
  debateVoteSummary?: string;
  /** Confidence per-agent (0-1) trong debate mode. */
  debateAgentConfidence?: number;
}

/**
 * Lịch sử quyết định của 1 agent cho 1 trigger (skip hoặc bet).
 * Khác với `AgentOrderRecord` (chỉ lưu khi bet được đặt) — `AgentDecisionLog` lưu MỌI
 * quyết định kể cả skip / blocked-by-risk, để UI hiển thị bảng lịch sử prompt+reply.
 */
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
  betType?: FlowBetType;
  handicapLabel?: string;
  odds?: number;
  stakeVnd?: number;
  reasonVi: string;
  userPrompt?: string;
  isConsensus?: boolean;
  debateVoteSummary?: string;
  confidence?: number;
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
  lastOrder: AgentOrderRecord | null;
  busy: boolean;
}

export interface LiveAgentRegistryStatus {
  emergencyStopped: boolean;
  shared: AgentSharedConfig;
  providers: Record<AgentProvider, AgentProviderPublicStatus>;
  recentOrders: AgentOrderRecord[];
  /** Lịch sử quyết định (skip + bet) của các agent — dùng cho bảng prompt+reply UI. */
  recentDecisions: AgentDecisionLog[];
  disclaimerVi: string;
}
