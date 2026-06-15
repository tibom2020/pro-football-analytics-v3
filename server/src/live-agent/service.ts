import type { OddsMonitor } from '../odds-monitor/monitor.js';
import type { OddsAlert, OddsSnapshot, OddsSubscription } from '../ai-assistant-core/types.js';
import { TelegramSender } from '../notification-service/telegram-sender.js';
import { logger } from '../logger.js';
import { logBetEntry } from '../services/bet-logger.js';
import { pickOdds, formatHandicapLabel, type OddsMonitorBetPick } from '../telegram/bet-flow.js';
import type { config as AppConfig } from '../config.js';
import type {
  AgentDecisionLog,
  AgentDecisionPayload,
  AgentExecutionMode,
  AgentLLMContext,
  AgentOrderRecord,
  AgentProvider,
  AgentProviderPublicStatus,
  AgentSharedConfig,
  LiveAgentRegistryStatus,
} from './types.js';
import {
  checkCanPlaceOrder,
  createEmptyRiskState,
  getOrdersForMatch,
  incrementOrderCount,
  type RiskState,
} from './risk.js';
import { buildUserPrompt, snapshotHasOddsForBetType } from './prompt.js';
import { createGptCaller, createDeepseekCaller, callGeminiWrapped, type LLMCaller } from './llm-clients.js';
import { buildAgentBetLogPayload, newBetId } from './bet-payload.js';
import { callDebateSidecar, type DebateResult } from './debate-client.js';
import { buildGoalContextForLiveAgent } from './goal-context.js';

type Config = typeof AppConfig;

const PROVIDERS: AgentProvider[] = ['gpt', 'gemini', 'deepseek'];

const DEFAULT_ALLOWED = ['over', 'under', 'home', 'away'] as const;

const LABELS: Record<AgentProvider, string> = {
  gpt: 'Tí Bơm',
  gemini: 'Tí Nị',
  deepseek: 'Tuệ Tuệ',
};

function pickForcedBetType(
  snapshot: OddsSnapshot,
  allowed: readonly ('over' | 'under' | 'home' | 'away')[],
): 'over' | 'under' | 'home' | 'away' | null {
  // Ưu tiên các cửa phổ biến trước (OU), sau đó AH.
  const candidates: Array<['over' | 'under' | 'home' | 'away', number | undefined]> = [
    ['under', snapshot.underOdds],
    ['over', snapshot.overOdds],
    ['home', snapshot.homeOdds],
    ['away', snapshot.awayOdds],
  ];
  for (const [bt, odd] of candidates) {
    if (!allowed.includes(bt)) continue;
    if (typeof odd === 'number' && Number.isFinite(odd) && odd > 0) return bt;
  }
  return null;
}

function providerApiConfigured(config: Config, p: AgentProvider): boolean {
  if (p === 'gpt') return !!config.openai.apiKey;
  if (p === 'gemini') return !!config.agent.geminiApiKey;
  return !!config.agent.deepseekApiKey;
}

interface ProviderMutableState {
  enabled: boolean;
  risk: RiskState;
  lastDecisionAt: number | null;
  lastDecisionSummaryVi: string | null;
  lastDecisionAction: 'skip' | 'bet' | 'error' | null;
  lastError: string | null;
  lastOrder: AgentOrderRecord | null;
  busy: boolean;
  lastOrderMatchId: string | null;
}

export class LiveBetAgentRegistry {
  private monitor: OddsMonitor;
  private telegram: TelegramSender;
  private config: Config;
  private emergencyStopped = false;
  private shared: AgentSharedConfig;
  private providers: Record<AgentProvider, ProviderMutableState>;
  private callers: Record<AgentProvider, LLMCaller>;
  private recentOrders: AgentOrderRecord[] = [];
  /** Lịch sử quyết định (skip + bet) của các agent — phục vụ bảng prompt+reply UI. Cap 200. */
  private recentDecisions: AgentDecisionLog[] = [];
  /** Risk state riêng cho consensus record trong debate mode (không share với 3 agent). */
  private consensusRisk: RiskState = createEmptyRiskState();
  private lastDebateSummary: { matchId: string; voteSummary: string; at: number } | null = null;

  constructor(monitor: OddsMonitor, telegram: TelegramSender, cfg: Config) {
    this.monitor = monitor;
    this.telegram = telegram;
    this.config = cfg;
    this.shared = {
      stakeVnd: cfg.agent.defaultStakeVnd,
      maxOrdersPerMatch: cfg.agent.maxOrdersPerMatch,
      cooldownMs: cfg.agent.cooldownMs,
      maxStakeVnd: cfg.agent.maxStakeVnd,
      allowedBetTypes: [...DEFAULT_ALLOWED],
      userId: cfg.agent.defaultUserId,
      executionMode: 'paper',
    };

    this.providers = {
      gpt: this.newProviderState(),
      gemini: this.newProviderState(),
      deepseek: this.newProviderState(),
    };

    this.callers = {
      gpt: createGptCaller(cfg),
      gemini: (ctx) => callGeminiWrapped(cfg, ctx),
      deepseek: createDeepseekCaller(cfg),
    };
  }

  private newProviderState(): ProviderMutableState {
    return {
      enabled: false,
      risk: createEmptyRiskState(),
      lastDecisionAt: null,
      lastDecisionSummaryVi: null,
      lastDecisionAction: null,
      lastError: null,
      lastOrder: null,
      busy: false,
      lastOrderMatchId: null,
    };
  }

  /** Manual-only mode: không auto nghe alert/odds push. */
  attach(): void {}

  dispose(): void {}

  getStatus(matchId?: string): LiveAgentRegistryStatus {
    const prov: Record<AgentProvider, AgentProviderPublicStatus> = {
      gpt: this.publicProviderRow('gpt', matchId),
      gemini: this.publicProviderRow('gemini', matchId),
      deepseek: this.publicProviderRow('deepseek', matchId),
    };
    const ordersForResponse = matchId
      ? this.recentOrders.filter((o) => o.matchId === matchId).slice(-40)
      : this.recentOrders.slice(-40);

    const decisionsForResponse = matchId
      ? this.recentDecisions.filter((d) => d.matchId === matchId).slice(-60)
      : this.recentDecisions.slice(-60);

    return {
      emergencyStopped: this.emergencyStopped,
      shared: { ...this.shared },
      providers: prov,
      recentOrders: ordersForResponse,
      recentDecisions: decisionsForResponse,
      disclaimerVi:
        'Live Agent chỉ hỗ trợ quan sát và đo lường; không đảm bảo lãi. Chế độ PAPER là mô phỏng. LIVE cần API bookmaker chính thức và bật AGENT_LIVE_EXECUTION trên server.',
    };
  }

  private publicProviderRow(p: AgentProvider, matchId?: string): AgentProviderPublicStatus {
    const st = this.providers[p];
    const mid = matchId ?? st.lastOrderMatchId ?? '';
    const ordersThisMatch = mid ? getOrdersForMatch(st.risk, mid) : 0;
    const lastOrd =
      st.lastOrder && (!matchId || st.lastOrder.matchId === matchId) ? st.lastOrder : null;
    return {
      provider: p,
      enabled: st.enabled,
      apiConfigured: providerApiConfigured(this.config, p),
      lastDecisionAt: st.lastDecisionAt,
      lastDecisionSummaryVi: st.lastDecisionSummaryVi,
      lastDecisionAction: st.lastDecisionAction,
      lastError: st.lastError,
      ordersThisMatch: matchId ? getOrdersForMatch(st.risk, matchId) : ordersThisMatch,
      lastOrder: lastOrd,
      busy: st.busy,
    };
  }

  setShared(patch: Partial<AgentSharedConfig>): void {
    if (patch.stakeVnd !== undefined) this.shared.stakeVnd = patch.stakeVnd;
    if (patch.maxOrdersPerMatch !== undefined) this.shared.maxOrdersPerMatch = patch.maxOrdersPerMatch;
    if (patch.cooldownMs !== undefined) this.shared.cooldownMs = patch.cooldownMs;
    if (patch.maxStakeVnd !== undefined) this.shared.maxStakeVnd = patch.maxStakeVnd;
    if (patch.allowedBetTypes !== undefined) this.shared.allowedBetTypes = patch.allowedBetTypes;
    if (patch.userId !== undefined) this.shared.userId = patch.userId;
    if (patch.executionMode !== undefined) this.shared.executionMode = patch.executionMode;
  }

  setProviderEnabled(p: AgentProvider, enabled: boolean): void {
    this.providers[p].enabled = enabled;
  }

  emergencyStop(): void {
    this.emergencyStopped = true;
    for (const p of PROVIDERS) {
      this.providers[p].enabled = false;
    }
  }

  clearEmergency(): void {
    this.emergencyStopped = false;
  }

  async triggerMatchAction(matchId: string, userPrompt?: string): Promise<void> {
    if (!this.config.features.liveAgent) return;
    if (!matchId) return;
    const snapshot = this.monitor.getLastOddsSnapshot(matchId);
    const subscriptions = this.monitor.getSubscriptions().filter((s) => s.matchId === matchId && s.active);
    const matchName = subscriptions[0]?.matchName || `Match ${matchId}`;
    const leagueName = subscriptions[0]?.leagueName;
    const recentAlerts = this.monitor.getAlertHistory(matchId, 1);
    await this.runAllProviders({
      matchId,
      matchName,
      leagueName,
      snapshot,
      subscriptions,
      triggerLabel: 'manual',
      alert: recentAlerts[0],
      userPrompt,
    });
  }

  private monitorPick(): OddsMonitorBetPick {
    return {
      getLastOddsSnapshot: (id) => this.monitor.getLastOddsSnapshot(id),
      getLastOddsPushAt: (id) => this.monitor.getLastOddsPushAt(id),
    };
  }

  private async runAllProviders(args: {
    matchId: string;
    matchName: string;
    leagueName?: string;
    snapshot: OddsSnapshot | undefined;
    subscriptions: OddsSubscription[];
    triggerLabel: 'manual';
    alert?: OddsAlert;
    userPrompt?: string;
  }): Promise<void> {
    const { matchId, matchName, leagueName, snapshot, subscriptions, triggerLabel, alert, userPrompt } = args;
    if (!snapshot || this.emergencyStopped) return;

    const userId = subscriptions[0]?.userId || this.shared.userId;
    if (!userId) {
      logger.warn('[LiveAgent] Bỏ qua: chưa có userId (bind Telegram / gửi userId trong config API).');
      return;
    }

    const ctxBase = {
      matchId,
      matchName,
      leagueName,
      userId,
      snapshot,
      triggerLabel,
      alert,
      userPrompt,
    };

    if (this.config.agent.decisionMode === 'debate') {
      try {
        await this.runDebateMode(ctxBase);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!this.config.agent.debateFallbackOnError) {
          logger.warn(`[LiveAgent] Debate failed (no fallback): ${msg}`);
          return;
        }
        logger.warn(`[LiveAgent] Debate failed → fallback independent: ${msg}`);
        // Fall through tới flow independent dưới đây.
      }
    }

    await Promise.allSettled(
      PROVIDERS.map((p) => this.runOneProvider(p, ctxBase)),
    );
  }

  /**
   * Debate mode: gọi Python sidecar → nhận consensus + per-agent opinions →
   * persist 3 record per-agent (giữ PnL tracking từng agent) + 1 record consensus.
   *
   * Throw nếu sidecar fail và caller (runAllProviders) sẽ quyết định fallback.
   */
  private async runDebateMode(ctx: {
    matchId: string;
    matchName: string;
    leagueName?: string;
    userId: string;
    snapshot: OddsSnapshot;
    triggerLabel: 'manual';
    alert?: OddsAlert;
    userPrompt?: string;
  }): Promise<void> {
    // Pre-check: tránh gọi sidecar vô ích nếu ALL provider state đã hit max orders.
    const allMaxed = PROVIDERS.every(
      (p) =>
        getOrdersForMatch(this.providers[p].risk, ctx.matchId) >= this.shared.maxOrdersPerMatch,
    );
    const consensusMaxed =
      getOrdersForMatch(this.consensusRisk, ctx.matchId) >= this.shared.maxOrdersPerMatch;
    if (allMaxed && consensusMaxed) {
      logger.info(`[LiveAgent debate] match=${ctx.matchId} đã đạt max orders ở mọi slot — bỏ qua.`);
      return;
    }

    // Mark tất cả provider busy (best-effort UI)
    for (const p of PROVIDERS) this.providers[p].busy = true;
    try {
      const recentAlerts = this.monitor.getAlertHistory(ctx.matchId, 20);
      const oddsHistoryTail = this.monitor.getOddsHistory(ctx.matchId).slice(-20);
      const tg = this.monitor.getLastTelegramContext(ctx.matchId);
      const goalCtx = await buildGoalContextForLiveAgent({
        snapshot: ctx.snapshot,
        oddsHistoryTail,
        recentAlerts,
        telegramStatsLines: tg?.statsLines,
        telegramPressureBell: tg?.pressureBellHistoryMinutes,
      });

      const debateCtx: AgentLLMContext = {
        providerLabel: 'DEBATE',
        matchId: ctx.matchId,
        matchName: ctx.matchName,
        leagueName: ctx.leagueName,
        snapshot: ctx.snapshot,
        recentAlerts: ctx.alert
          ? [ctx.alert, ...recentAlerts.filter((a) => a.id !== ctx.alert!.id)].slice(0, 20)
          : recentAlerts,
        oddsHistoryTail,
        telegramPerTeamApiLines: tg?.perTeamApiLines,
        telegramStatsLines: tg?.statsLines,
        telegramTraditionalFactorsLines: tg?.traditionalFactorsLines,
        telegramPressureBell: tg?.pressureBellHistoryMinutes,
        telegramOuDrop: tg?.ouDropIntensityHistoryMinutes,
        userPrompt: ctx.userPrompt,
        goalProb15: goalCtx.goalProb15,
        goalProb5: goalCtx.goalProb5,
        similarMatches: goalCtx.similarMatches,
        goalTopFeatures: goalCtx.topFeatures,
        goalFeatureQuality: goalCtx.featureQuality,
        constraints: {
          stakeVnd: this.shared.stakeVnd,
          maxOrdersPerMatch: this.shared.maxOrdersPerMatch,
          ordersAlready: Math.max(
            ...PROVIDERS.map((p) => getOrdersForMatch(this.providers[p].risk, ctx.matchId)),
          ),
          allowedBetTypes: this.shared.allowedBetTypes,
          executionMode: this.shared.executionMode,
        },
      };

      const result = await callDebateSidecar(this.config, debateCtx);
      if (!result.ok || !result.consensus || !result.agents) {
        throw new Error(result.error || 'debate_unknown_error');
      }

      logger.info(
        `[LiveAgent debate] reqId=${result.requestId} match=${ctx.matchId} consensus=${result.consensus.action}${result.consensus.betType ? '/' + result.consensus.betType : ''} vote="${result.voteSummary ?? ''}" timings=${JSON.stringify(result.timings ?? {})}`,
      );

      // Persist 3 per-agent records (giữ PnL tracking).
      for (const p of PROVIDERS) {
        const op = result.agents[p];
        if (!op) {
          this.providers[p].lastDecisionAt = Date.now();
          this.providers[p].lastDecisionAction = 'error';
          this.providers[p].lastError = 'Không có opinion trong debate result (sidecar partial)';
          this.recordDecisionLog({
            matchId: ctx.matchId,
            matchName: ctx.matchName,
            leagueName: ctx.leagueName,
            minute: ctx.snapshot.minute,
            score: ctx.snapshot.score,
            provider: p,
            providerLabel: LABELS[p],
            action: 'skip',
            reasonVi: '[DEBATE] Sidecar không trả opinion cho agent này (partial response).',
            userPrompt: ctx.userPrompt,
            debateVoteSummary: result.voteSummary,
          });
          continue;
        }
        const payload: AgentDecisionPayload = {
          action: op.action,
          betType: op.betType,
          reasonVi: op.reasonVi,
        };
        await this.persistDecisionAndSideEffects(p, ctx, payload, {
          reasonPrefix: '[DEBATE]',
          telegramHeaderTag: op.updatedInR2 ? 'DEBATE-AGENT-R2' : 'DEBATE-AGENT',
          skipForceBet: true, // Round 2 đã cho deepseek chance update
          debateAgentConfidence: op.confidence,
          debateVoteSummary: result.voteSummary,
        });
      }

      // Persist 1 consensus record (provider field=gpt vô nghĩa, dùng isConsensus để filter).
      await this.persistConsensusDecision(ctx, result);

      this.lastDebateSummary = {
        matchId: ctx.matchId,
        voteSummary: result.voteSummary ?? '',
        at: Date.now(),
      };
    } finally {
      for (const p of PROVIDERS) this.providers[p].busy = false;
    }
  }

  private async persistConsensusDecision(
    ctx: {
      matchId: string;
      matchName: string;
      leagueName?: string;
      userId: string;
      snapshot: OddsSnapshot;
      triggerLabel: 'manual';
      alert?: OddsAlert;
    },
    result: DebateResult,
  ): Promise<void> {
    if (!result.consensus) return;
    const cons = result.consensus;
    const payload: AgentDecisionPayload = {
      action: cons.action,
      betType: cons.betType,
      reasonVi: `${result.moderatorNoteVi ? result.moderatorNoteVi + ' | ' : ''}${cons.reasonVi}`,
    };
    const stake = Math.round(this.shared.stakeVnd * this.config.agent.debateConsensusStakeMult);
    await this.persistDecisionAndSideEffects(
      'gpt', // placeholder — UI status không hiển thị consensus state, dùng isConsensus để phân biệt.
      ctx,
      payload,
      {
        providerLabelOverride: 'Consensus',
        telegramHeaderTag: 'CONSENSUS',
        reasonPrefix: `[CONSENSUS] vote=${result.voteSummary ?? 'n/a'} |`,
        skipForceBet: true,
        riskState: this.consensusRisk,
        stakeVndOverride: stake,
        isConsensus: true,
        debateVoteSummary: result.voteSummary,
        debateAgentConfidence: cons.confidence,
        updateProviderState: false,
      },
    );
  }

  private async runOneProvider(
    provider: AgentProvider,
    ctx: {
      matchId: string;
      matchName: string;
      leagueName?: string;
      userId: string;
      snapshot: OddsSnapshot;
      triggerLabel: 'manual';
      alert?: OddsAlert;
      userPrompt?: string;
    },
  ): Promise<void> {
    const st = this.providers[provider];
    if (!st.enabled || !providerApiConfigured(this.config, provider) || st.busy) return;

    st.busy = true;
    st.lastError = null;
    try {
      const recentAlerts = this.monitor.getAlertHistory(ctx.matchId, 20);
      const oddsHistoryTail = this.monitor.getOddsHistory(ctx.matchId).slice(-20);
      const tg = this.monitor.getLastTelegramContext(ctx.matchId);
      const goalCtx = await buildGoalContextForLiveAgent({
        snapshot: ctx.snapshot,
        oddsHistoryTail,
        recentAlerts,
        telegramStatsLines: tg?.statsLines,
        telegramPressureBell: tg?.pressureBellHistoryMinutes,
      });

      const llmCtx: AgentLLMContext = {
        providerLabel: LABELS[provider],
        matchId: ctx.matchId,
        matchName: ctx.matchName,
        leagueName: ctx.leagueName,
        snapshot: ctx.snapshot,
        recentAlerts: ctx.alert
          ? [ctx.alert, ...recentAlerts.filter((a) => a.id !== ctx.alert!.id)].slice(0, 20)
          : recentAlerts,
        oddsHistoryTail,
        telegramPerTeamApiLines: tg?.perTeamApiLines,
        telegramStatsLines: tg?.statsLines,
        telegramTraditionalFactorsLines: tg?.traditionalFactorsLines,
        telegramPressureBell: tg?.pressureBellHistoryMinutes,
        telegramOuDrop: tg?.ouDropIntensityHistoryMinutes,
        userPrompt: ctx.userPrompt,
        goalProb15: goalCtx.goalProb15,
        goalProb5: goalCtx.goalProb5,
        similarMatches: goalCtx.similarMatches,
        goalTopFeatures: goalCtx.topFeatures,
        goalFeatureQuality: goalCtx.featureQuality,
        constraints: {
          stakeVnd: this.shared.stakeVnd,
          maxOrdersPerMatch: this.shared.maxOrdersPerMatch,
          ordersAlready: getOrdersForMatch(st.risk, ctx.matchId),
          allowedBetTypes: this.shared.allowedBetTypes,
          executionMode: this.shared.executionMode,
        },
      };

      const logEarlySkip = (reason: string): void => {
        this.recordDecisionLog({
          matchId: ctx.matchId,
          matchName: ctx.matchName,
          leagueName: ctx.leagueName,
          minute: ctx.snapshot.minute,
          score: ctx.snapshot.score,
          provider,
          providerLabel: LABELS[provider],
          action: 'skip',
          reasonVi: reason.slice(0, 500),
          userPrompt: ctx.userPrompt,
        });
      };

      if (getOrdersForMatch(st.risk, ctx.matchId) >= this.shared.maxOrdersPerMatch) {
        const reason = `Bỏ qua: đã ${this.shared.maxOrdersPerMatch} lệnh/trận (${LABELS[provider]}).`;
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'skip';
        st.lastDecisionSummaryVi = reason;
        logEarlySkip(reason);
        return;
      }

      const { payload, error, raw } = await this.callers[provider](llmCtx);
      if (error) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'error';
        st.lastError = error;
        st.lastDecisionSummaryVi = error;
        logger.warn(`[LiveAgent ${provider}] LLM lỗi: ${error}`);
        logEarlySkip(`[LLM error] ${error}`);
        return;
      }
      if (!payload) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'error';
        const rawPreview = raw ? (raw.length > 400 ? raw.slice(0, 400) + '...' : raw) : '';
        st.lastError = `Không parse được JSON quyết định | len=${raw.length} | raw: ${rawPreview}`;
        st.lastDecisionSummaryVi = st.lastError;
        logger.warn(`[LiveAgent ${provider}] Không parse được JSON. Raw: ${raw}`);
        logEarlySkip(`[Parse error] ${rawPreview.slice(0, 200)}`);
        return;
      }

      await this.persistDecisionAndSideEffects(provider, ctx, payload);
    } finally {
      st.busy = false;
    }
  }

  /** Push 1 quyết định vào history log (skip hoặc bet). Cap 200 record. */
  private recordDecisionLog(entry: Omit<AgentDecisionLog, 'id' | 'createdAt'>): void {
    const log: AgentDecisionLog = {
      id: newBetId(),
      createdAt: Date.now(),
      ...entry,
    };
    this.recentDecisions.push(log);
    if (this.recentDecisions.length > 200) {
      this.recentDecisions = this.recentDecisions.slice(-200);
    }
  }

  /**
   * Áp dụng decision (skip/bet) → risk check → log Sheets → gửi Telegram → push recentOrders.
   * Tách từ inline runOneProvider để reuse cho debate mode (per-agent records + consensus).
   *
   * Caller phải đã set `st.busy = true` và sẽ reset trong finally riêng.
   */
  private async persistDecisionAndSideEffects(
    provider: AgentProvider,
    ctx: {
      matchId: string;
      matchName: string;
      leagueName?: string;
      userId: string;
      snapshot: OddsSnapshot;
      triggerLabel: 'manual';
      alert?: OddsAlert;
      userPrompt?: string;
    },
    payload: AgentDecisionPayload,
    options: {
      providerLabelOverride?: string;
      telegramHeaderTag?: string;
      reasonPrefix?: string;
      skipForceBet?: boolean;
      riskState?: RiskState;
      stakeVndOverride?: number;
      isConsensus?: boolean;
      debateVoteSummary?: string;
      debateAgentConfidence?: number;
      updateProviderState?: boolean;
    } = {},
  ): Promise<void> {
    const st = this.providers[provider];
    const risk = options.riskState ?? st.risk;
    const providerLabel = options.providerLabelOverride ?? LABELS[provider];
    const updateState = options.updateProviderState !== false;
    const stake = options.stakeVndOverride ?? this.shared.stakeVnd;
    const reasonPrefix = options.reasonPrefix ? `${options.reasonPrefix} ` : '';
    const headerTag = options.telegramHeaderTag
      ? ` ${options.telegramHeaderTag}`
      : '';

    // Helper: ghi 1 dòng decision log (skip hoặc bet) cho UI bảng lịch sử
    const logDecision = (
      action: 'skip' | 'bet',
      reasonViForLog: string,
      extras: Partial<Pick<AgentDecisionLog, 'betType' | 'handicapLabel' | 'odds' | 'stakeVnd'>> = {},
    ): void => {
      this.recordDecisionLog({
        matchId: ctx.matchId,
        matchName: ctx.matchName,
        leagueName: ctx.leagueName,
        minute: ctx.snapshot.minute,
        score: ctx.snapshot.score,
        provider,
        providerLabel,
        action,
        reasonVi: reasonViForLog.slice(0, 500),
        userPrompt: ctx.userPrompt,
        isConsensus: options.isConsensus,
        debateVoteSummary: options.debateVoteSummary,
        confidence: options.debateAgentConfidence,
        ...extras,
      });
    };

    // Force-bet cho deepseek (chỉ áp dụng trong independent mode — debate đã có round 2)
    if (
      !options.skipForceBet &&
      payload.action === 'skip' &&
      provider === 'deepseek'
    ) {
      const forced = pickForcedBetType(
        ctx.snapshot,
        this.shared.allowedBetTypes as readonly (
          | 'over'
          | 'under'
          | 'home'
          | 'away'
        )[],
      );
      if (!forced) {
        const reason = 'Tuệ Tuệ skip, không có odds hợp lệ để ép vào kèo.';
        if (updateState) {
          st.lastDecisionAt = Date.now();
          st.lastDecisionAction = 'skip';
          st.lastDecisionSummaryVi = `[manual] ${reason}`;
        }
        logDecision('skip', reason);
        return;
      }
      payload.action = 'bet';
      payload.betType = forced;
      payload.reasonVi = `(Ép vào kèo theo cấu hình) ${payload.reasonVi}`;
    }

    if (payload.action === 'skip') {
      if (updateState) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'skip';
        st.lastDecisionSummaryVi = `[${ctx.triggerLabel}]${headerTag} ${payload.reasonVi}`;
      }
      logDecision('skip', payload.reasonVi);
      return;
    }

    const betType = payload.betType!;
    const preRisk = checkCanPlaceOrder({
      monitor: this.monitorPick(),
      matchId: ctx.matchId,
      nowMs: Date.now(),
      shared: this.shared,
      risk,
      provider,
      betType,
      stakeVnd: stake,
    });
    if (!preRisk.ok) {
      if (updateState) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'skip';
        st.lastDecisionSummaryVi = preRisk.reasonVi;
      }
      logDecision('skip', `[Risk] ${preRisk.reasonVi} (LLM muốn ${betType}: ${payload.reasonVi})`);
      return;
    }

    if (!snapshotHasOddsForBetType(betType, ctx.snapshot)) {
      const reason = 'LLM chọn kèo nhưng snapshot thiếu giá tương ứng.';
      if (updateState) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'skip';
        st.lastDecisionSummaryVi = reason;
      }
      logDecision('skip', `${reason} (LLM: ${payload.reasonVi})`);
      return;
    }

    if (this.shared.executionMode === 'live' && !this.config.agent.liveExecution) {
      const reason = 'Chế độ LIVE chưa bật trên server (AGENT_LIVE_EXECUTION).';
      if (updateState) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'skip';
        st.lastDecisionSummaryVi = reason;
      }
      logDecision('skip', reason);
      return;
    }

    const odds = pickOdds(betType, ctx.snapshot);
    if (odds === undefined) {
      const reason = 'Thiếu odds.';
      if (updateState) {
        st.lastDecisionAt = Date.now();
        st.lastDecisionAction = 'skip';
        st.lastDecisionSummaryVi = reason;
      }
      logDecision('skip', reason);
      return;
    }

    const betId = newBetId();
    const handicapLabel = formatHandicapLabel(betType, ctx.snapshot);
    const mode: AgentExecutionMode =
      this.shared.executionMode === 'live' && this.config.agent.liveExecution
        ? 'live'
        : 'paper';

    let sheetStatus: AgentOrderRecord['sheetStatus'] = 'skipped';
    let sheetDetail: string | undefined;
    let telegramStatus: AgentOrderRecord['telegramStatus'] = 'skipped';
    let telegramDetail: string | undefined;

    try {
      const payloadSheet = buildAgentBetLogPayload({
        betId,
        matchId: ctx.matchId,
        matchName: ctx.matchName,
        leagueName: ctx.leagueName,
        betType,
        snapshot: ctx.snapshot,
        stakeVnd: stake,
        providerLabel,
        reasonVi: `${reasonPrefix}${payload.reasonVi} | kích hoạt: ${ctx.triggerLabel}`,
      });
      const logRes = await logBetEntry(payloadSheet);
      if (logRes.ok) {
        sheetStatus = 'ok';
        sheetDetail = logRes.deduped ? 'deduped' : `row ${logRes.rowIndex}`;
      } else {
        sheetStatus = 'error';
        sheetDetail = logRes.error;
      }
    } catch (e) {
      sheetStatus = 'error';
      sheetDetail = e instanceof Error ? e.message : String(e);
    }

    const modeTag = mode === 'live' ? 'LIVE' : 'PAPER';
    const safe = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/([_*`\[])/g, '\\$1');
    const tgHeader = options.telegramHeaderTag
      ? `🤖 *Live Agent ${providerLabel} · ${modeTag} · ${options.telegramHeaderTag}*`
      : `🤖 *Live Agent ${providerLabel} · ${modeTag}*`;
    const voteLine = options.debateVoteSummary
      ? [`🗳 *Vote:* ${safe(options.debateVoteSummary)}`]
      : [];
    const tgLines = [
      tgHeader,
      ``,
      `⚽ *${safe(ctx.matchName)}*`,
      `🆔 \`${ctx.matchId}\``,
      `📍 Phút ${ctx.snapshot.minute}' | Tỷ số: ${safe(ctx.snapshot.score ?? 'N/A')}`,
      ``,
      `📌 *Lý do:* ${safe(payload.reasonVi)}`,
      `🎯 *Kèo:* ${betType} ${handicapLabel} @${odds.toFixed(2)}`,
      `💰 *Stake:* ${stake.toLocaleString('vi-VN')} VND`,
      ...voteLine,
      ``,
      `📝 Sheets: ${sheetStatus}${sheetDetail ? ` (${safe(sheetDetail)})` : ''}`,
    ];

    if (this.telegram.isUserBound(ctx.userId)) {
      const ok = await this.telegram.sendMarkdownToUser(ctx.userId, tgLines.join('\n'));
      telegramStatus = ok ? 'sent' : 'failed';
      if (!ok) telegramDetail = 'sendMarkdownToUser returned false';
    } else {
      telegramStatus = 'skipped';
      telegramDetail = 'User chưa bind Telegram';
    }

    incrementOrderCount(risk, ctx.matchId);

    const order: AgentOrderRecord = {
      betId,
      provider,
      matchId: ctx.matchId,
      matchName: ctx.matchName,
      leagueName: ctx.leagueName,
      betType,
      handicapLabel,
      odds,
      stakeVnd: stake,
      minute: ctx.snapshot.minute,
      score: ctx.snapshot.score,
      reasonVi: `${reasonPrefix}${payload.reasonVi}`,
      mode,
      createdAt: Date.now(),
      sheetStatus,
      sheetDetail,
      telegramStatus,
      telegramDetail,
      isConsensus: options.isConsensus,
      debateVoteSummary: options.debateVoteSummary,
      debateAgentConfidence: options.debateAgentConfidence,
    };

    if (updateState) {
      st.lastOrder = order;
      st.lastOrderMatchId = ctx.matchId;
      st.lastDecisionAt = Date.now();
      st.lastDecisionAction = 'bet';
      st.lastDecisionSummaryVi = `Đặt ${betType} @${odds.toFixed(2)} — ${payload.reasonVi.slice(0, 120)}`;
    }

    this.recentOrders.push(order);
    if (this.recentOrders.length > 200) this.recentOrders = this.recentOrders.slice(-200);

    logDecision('bet', payload.reasonVi, {
      betType,
      handicapLabel,
      odds,
      stakeVnd: stake,
    });

    const consensusTag = options.isConsensus ? ' [CONSENSUS]' : '';
    logger.info(
      `[LiveAgent ${providerLabel}${consensusTag}] ORDER ${mode} ${betType} match=${ctx.matchId} betId=${betId}`,
    );
  }
}
