/**
 * Client wrapper cho POST /api/ai/predict-goal/pinned/analyze
 */

import { AI_SERVER_URL } from './ai-service';
import { decodeStatTimelineKey } from './matchTimeline';
import type { PinnedChart } from './pinned-charts';
import type {
  MatchInfo,
  ProcessedStats,
  OverUnderMinuteSnapshot,
  AsianHandicapMinuteSnapshot,
} from '../types';

export type PinnedDimensionKey =
  | 'odds_open'
  | 'line_runs'
  | 'odds_snapshot'
  | 'pressure'
  | 'shots'
  | 'outcome';

export interface AiPinnedDimension {
  key: PinnedDimensionKey;
  score: number;
  summaryVi: string;
}

export interface AiPinnedQuantitative {
  lineRunsScore?: number;
  lineRunsMatch?: boolean;
  openLineMatch?: boolean;
  ragSimilarity?: number;
  statDelta?: { da: number; shots: number; onTarget: number; corners: number };
  pinnedLineRuns?: string;
  sourceLineRuns?: string;
}

export interface AiPinnedAnalysis {
  similarityScore: number;
  similarityLevel: 'high' | 'medium' | 'low';
  dimensions: AiPinnedDimension[];
  highlightsVi: string[];
  differencesVi: string[];
  conclusionVi: string;
  quantitative?: AiPinnedQuantitative;
  model?: string;
  durationMs?: number;
}

export interface PinnedAnalyzeResponse {
  source: {
    matchId: string;
    team: string;
    half: 1 | 2;
    minute: number;
    scoreAtMinute?: string;
    ftScore?: string;
  };
  pinned: {
    matchId: string;
    team: string;
    half: 1 | 2;
    minute: number;
    scoreAtMinute?: string;
    ftScore?: string;
  };
  quantitative: AiPinnedQuantitative;
  analysis: AiPinnedAnalysis | null;
  aiDisabledReason?: string;
}

export type FetchPinnedAnalysisResult =
  | { ok: true; data: PinnedAnalyzeResponse }
  | { ok: false; error: string };

/** Context trận đang xem — truyền từ Dashboard. */
export interface PinnedLiveContext {
  matchId: string;
  liveMatch: MatchInfo;
  statsHistory: Record<number, ProcessedStats>;
  oddsHistory: OverUnderMinuteSnapshot[];
  homeOddsHistory: AsianHandicapMinuteSnapshot[];
  gameEvents?: Array<{ minute: number; half: 1 | 2; type: 'goal' | 'corner' }>;
}

interface ServerStatRow {
  clockMinute: number;
  half: 1 | 2;
  attacks: [number, number];
  dangerous: [number, number];
  onTarget: [number, number];
  offTarget: [number, number];
  corners: [number, number];
  yellow: [number, number];
  red: [number, number];
}

interface ServerOddsSnap {
  marketId: string;
  clockMinute: number;
  half: 1 | 2;
  handicap: number;
  over?: number;
  under?: number;
  home?: number;
  away?: number;
}

function convertStatsHistory(history: Record<number, ProcessedStats>): ServerStatRow[] {
  return Object.entries(history)
    .map(([k, s]) => {
      const decoded = decodeStatTimelineKey(Number(k));
      return {
        clockMinute: decoded.minute,
        half: decoded.half,
        attacks: s.attacks,
        dangerous: s.dangerous_attacks,
        onTarget: s.on_target,
        offTarget: s.off_target,
        corners: s.corners,
        yellow: s.yellowcards,
        red: s.redcards,
      };
    })
    .sort((a, b) => a.half - b.half || a.clockMinute - b.clockMinute);
}

function convertOuOdds(arr: OverUnderMinuteSnapshot[]): ServerOddsSnap[] {
  return arr.map((o) => ({
    marketId: o.marketId,
    clockMinute: o.minute,
    half: (o.half ?? 1) as 1 | 2,
    handicap: o.handicap,
    over: o.over,
    under: o.under,
  }));
}

function convertAhOdds(arr: AsianHandicapMinuteSnapshot[]): ServerOddsSnap[] {
  return arr.map((o) => ({
    marketId: o.marketId,
    clockMinute: o.minute,
    half: (o.half ?? 1) as 1 | 2,
    handicap: o.handicap,
    home: o.home,
    away: o.away,
  }));
}

function normalizeGameEventsForScore(
  events: NonNullable<PinnedLiveContext['gameEvents']>,
): Array<{ minute: number; half: 1 | 2; type: string }> {
  return events.map((e) => {
    let half: 1 | 2 = e.half === 1 || e.half === 2 ? e.half : e.minute >= 45 ? 2 : 1;
    if (e.type === 'goal' && half === 1 && e.minute >= 50) half = 2;
    return { minute: e.minute, half, type: e.type };
  });
}

/** Build request body — so sánh tại hiệp/phút lúc ghim. */
export function buildPinnedAnalyzeBody(live: PinnedLiveContext, pin: PinnedChart) {
  const half: 1 | 2 = pin.half === 2 ? 2 : 1;
  const minute = pin.minute ?? 0;
  return {
    sourceMatchId: live.matchId,
    sourceHalf: half,
    sourceMinute: minute,
    sourceScore: live.liveMatch.ss || undefined,
    sourceMatch: {
      stats: convertStatsHistory(live.statsHistory),
      odds: [...convertOuOdds(live.oddsHistory), ...convertAhOdds(live.homeOddsHistory)],
      events: normalizeGameEventsForScore(live.gameEvents ?? []),
    },
    pinned: {
      matchId: pin.matchId,
      half,
      minute,
      team: pin.team,
      ft: pin.ft,
      labelHalf: pin.labelHalf,
      similarity: pin.similarity,
      feats: pin.feats,
    },
  };
}

export async function fetchPinnedMatchAnalysis(
  live: PinnedLiveContext,
  pin: PinnedChart,
  signal?: AbortSignal,
): Promise<FetchPinnedAnalysisResult> {
  const url = `${AI_SERVER_URL}/api/ai/predict-goal/pinned/analyze`;
  const body = buildPinnedAnalyzeBody(live, pin);
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 30_000);
    const onAbort = (): void => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { ok: false, error: `Server ${res.status}${txt ? ` — ${txt.slice(0, 240)}` : ''}` };
      }
      const data = (await res.json()) as PinnedAnalyzeResponse;
      return { ok: true, data };
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = msg.includes('abort') || (e as Error)?.name === 'AbortError';
    return { ok: false, error: isAbort ? 'Yêu cầu bị huỷ' : `Lỗi gọi /pinned/analyze: ${msg}` };
  }
}

export const PINNED_DIM_LABEL: Record<PinnedDimensionKey, string> = {
  odds_open: 'Vạch mở kèo',
  line_runs: 'Pattern line chạy',
  odds_snapshot: 'Kèo tại phút',
  pressure: 'Áp lực / DA',
  shots: 'Sút bóng',
  outcome: 'Kết cục tham chiếu',
};

export const SIMILARITY_LEVEL_LABEL: Record<AiPinnedAnalysis['similarityLevel'], string> = {
  high: 'Rất giống',
  medium: 'Tương đối giống',
  low: 'Ít giống',
};
