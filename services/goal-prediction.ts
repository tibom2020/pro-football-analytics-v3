/**
 * Client-side wrapper cho /api/ai/predict-goal.
 * Convert Dashboard state (statsHistory, oddsHistory, gameEvents, alertHistory)
 * → payload đúng format server md-parser.
 */

import { AI_SERVER_URL } from './ai-service';
import { safeSetItem } from './safe-storage';
import { decodeStatTimelineKey, type MatchHalf } from './matchTimeline';
import type {
  MatchInfo,
  ProcessedStats,
  OverUnderMinuteSnapshot,
  AsianHandicapMinuteSnapshot,
} from '../types';
import type { StoredAlert } from '../types';

interface GameEvent {
  minute: number;
  half: MatchHalf;
  type: 'goal' | 'corner';
}

/** Vạch mở 1_3 đầu H1/H2 — mirror server OpeningLinesRef. */
export interface OpeningLinesRef {
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  h1OpenAh12?: number;
  h2OpenAh12?: number;
}

export interface PredictGoalResult {
  /** Backward-compat — = goalProb15. */
  goalProb: number | null;
  goalProb15?: number | null;
  goalProb5?: number | null;
  /** Cửa sổ CHÍNH (30'). 15'/5' chỉ tham khảo. */
  goalProb30?: number | null;
  topFeatures: Array<{ name: string; value: number; importance: number }>;
  similarMatches: Array<{
    matchId: string;
    half: number;
    minute: number;
    label: 0 | 1;
    /** Nhãn "có bàn trong 30' sau" (từ dataset 30') — undefined nếu server không tra được. */
    label30?: 0 | 1;
    similarity: number;
    /** Tên 2 đội + trạng thái (từ meta dataset) — có thể thiếu nếu server chưa nạp meta. */
    home?: string;
    away?: string;
    ftStatus?: string;
    /** Snapshot feature THẬT tại phút đó — so sánh với trận đang xem trong popup "Chi tiết". */
    features?: Record<string, number>;
    /** Xác suất có bàn 30' theo model chính tại phút tương tự (null nếu model chưa load). */
    prob30?: number | null;
  }>;
  /** Feature THẬT của trận đang xem — popup "Chi tiết" so sánh tình huống tương tự với trận này. */
  queryFeatures?: Record<string, number>;
  /** Vạch mở hiệp 1_3 H1/H2 của trận đang xem. */
  openingLines?: OpeningLinesRef;
  /** Heuristic reason — sinh ngay sau ONNX (không cần LLM). */
  reasonVi: string;
  modelMeta: {
    version: string;
    rocAuc: number;
    numTrainRows: number;
    numTrainMatches?: number;
    trainedAt: string;
    recommendedThreshold?: number;
    /** Ngưỡng màu badge suy từ phân bố output thật (P70/P85/P95). */
    displayThresholds?: { warn: number; high: number; extreme: number };
  } | null;
  modelMeta5?: {
    version: string;
    rocAuc: number;
    numTrainRows: number;
    numTrainMatches?: number;
    trainedAt: string;
    recommendedThreshold?: number;
    displayThresholds?: { warn: number; high: number; extreme: number };
  } | null;
  modelMeta30?: {
    version: string;
    rocAuc: number;
    numTrainRows: number;
    numTrainMatches?: number;
    trainedAt: string;
    recommendedThreshold?: number;
    displayThresholds?: { warn: number; high: number; extreme: number };
  } | null;
  latencyMs: { onnx: number; onnx5?: number; onnx30?: number };
  fallback?: string;
  /** Reason async từ Ollama + GPT + DeepSeek — fill bằng fetchGoalReason() sau khi predict xong. */
  reasons?: {
    ollama?: ReasonOutput;
    gpt?: ReasonOutput;
    deepseek?: ReasonOutput;
  };
  /** Kết quả ghi Google Sheets (server predict-goal, một nguồn duy nhất). */
  sheetLog?: {
    ok: boolean;
    deduped?: boolean;
    rowIndex?: number;
    error?: string;
  };
}

export type GoalPredictNotifyPhase = 'predict' | 'reason';

export interface GoalPredictNotifyPayload {
  half: 1 | 2;
  minute: number;
  result: PredictGoalResult;
  phase: GoalPredictNotifyPhase;
}

/** Nội dung phần dự đoán — ghép vào tin Telegram (alert.message). */
export function formatGoalPredictTelegramMessage(payload: GoalPredictNotifyPayload): string {
  const { half, minute, result, phase } = payload;
  const prob15 = result.goalProb15 ?? result.goalProb;
  const prob5 = result.goalProb5;
  const lines: string[] = [`🔥 Dự đoán bàn thắng — H${half} · phút ${minute}'`, ''];

  if (phase === 'predict') {
    if (typeof prob15 === 'number') {
      lines.push(`📊 Có bàn trong 15': ${Math.round(prob15 * 100)}%`);
    }
    if (typeof prob5 === 'number') {
      lines.push(`📊 Có bàn trong 5': ${Math.round(prob5 * 100)}%`);
    }
    if (result.reasonVi) {
      lines.push('', `💡 ${result.reasonVi}`);
    }
    const top = result.topFeatures?.slice(0, 3) ?? [];
    if (top.length > 0) {
      lines.push('', '📌 Yếu tố hàng đầu:');
      for (const f of top) {
        lines.push(`  • ${f.name}: ${f.value.toFixed(2)}`);
      }
    }
    return lines.join('\n');
  }

  const fmtLlmBlock = (label: string, r?: ReasonOutput): string[] => {
    const text = r?.reasonVi?.trim();
    if (!text) return [];
    const pct =
      typeof r?.goalProb30Pct === 'number' ? ` · 30': ${r.goalProb30Pct}%` : '';
    return [label + pct + ':', text, ''];
  };

  const ollamaBlock = fmtLlmBlock('🤖 Ollama', result.reasons?.ollama);
  const gptBlock = fmtLlmBlock('🧠 GPT', result.reasons?.gpt);
  const deepseekBlock = fmtLlmBlock('⚡ DeepSeek', result.reasons?.deepseek);
  if (ollamaBlock.length === 0 && gptBlock.length === 0 && deepseekBlock.length === 0) return '';

  const prob30 = result.goalProb30;
  lines.push(
    `📊 ONNX 30': ${typeof prob30 === 'number' ? `${Math.round(prob30 * 100)}%` : '—'} | 15': ${typeof prob15 === 'number' ? `${Math.round(prob15 * 100)}%` : '—'} | 5': ${typeof prob5 === 'number' ? `${Math.round(prob5 * 100)}%` : '—'}`,
    '',
  );
  lines.push(...ollamaBlock, ...gptBlock, ...deepseekBlock);
  return lines.join('\n').trim();
}

export interface ReasonOutput {
  reasonVi: string;
  latencyMs: number;
  error?: string;
  /** 'llm' = output thật từ model; 'heuristic_fallback' = server thay bằng rule-based khi LLM lỗi. */
  source?: 'llm' | 'heuristic_fallback';
  /** % có bàn trong 30' tới — LLM tự ước lượng (Ollama / GPT / DeepSeek). */
  goalProb30Pct?: number | null;
}

export interface PredictGoalReasonResponse {
  ollama: ReasonOutput;
  gpt: ReasonOutput;
  deepseek: ReasonOutput;
}

export interface PredictGoalStatus {
  modelLoaded: boolean;
  modelLoadError: string | null;
  ragStats: { loaded: boolean; total: number; positives: number };
  ollama: { url: string; model: string; available: boolean; models: string[]; error?: string };
  openai: { enabled: boolean; model: string };
  deepseek?: { enabled: boolean; model: string; baseUrl?: string };
  cache?: {
    predict: { size: number; hits: number; misses: number; ttlMs: number };
    reason: { size: number; hits: number; misses: number; ttlMs: number };
  };
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
  marketId: '1_3' | '1_2' | '1_6' | '1_5';
  clockMinute: number;
  half: 1 | 2;
  handicap: number;
  over?: number;
  under?: number;
  home?: number;
  away?: number;
}

interface ServerAlertEntry {
  clockMinute: number;
  half: 1 | 2;
  type: string;
  pressure: number;
}

interface ServerEventEntry {
  clockMinute: number;
  half: 1 | 2;
  type: 'goal' | 'corner';
}

function processedStatsToServerRow(
  half: 1 | 2,
  clockMinute: number,
  s: ProcessedStats,
): ServerStatRow {
  return {
    clockMinute,
    half,
    attacks: s.attacks,
    dangerous: s.dangerous_attacks,
    onTarget: s.on_target,
    offTarget: s.off_target,
    corners: s.corners,
    yellow: s.yellowcards,
    red: s.redcards,
  };
}

function convertStatsHistory(history: Record<number, ProcessedStats>): ServerStatRow[] {
  return Object.entries(history)
    .map(([k, s]) => {
      const decoded = decodeStatTimelineKey(Number(k));
      return processedStatsToServerRow(decoded.half, decoded.minute, s);
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

function convertEvents(events: GameEvent[]): ServerEventEntry[] {
  return events
    .filter((e) => e.type === 'goal' || e.type === 'corner')
    .map((e) => ({ clockMinute: e.minute, half: e.half as 1 | 2, type: e.type }));
}

function convertAlerts(alerts: StoredAlert[]): ServerAlertEntry[] {
  return alerts
    .filter((a) => typeof a.minute === 'number')
    .map((a) => ({
      clockMinute: a.minute,
      half: (a.half ?? 1) as 1 | 2,
      type: a.type,
      pressure: a.pressureLevel ?? 0,
    }));
}

export interface PredictGoalInput {
  matchId: string;
  liveMatch: MatchInfo;
  statsHistory: Record<number, ProcessedStats>;
  oddsHistory: OverUnderMinuteSnapshot[];         // 1_3
  homeOddsHistory: AsianHandicapMinuteSnapshot[]; // 1_2
  h1OuHistory?: OverUnderMinuteSnapshot[];        // 1_6
  h1AhHistory?: AsianHandicapMinuteSnapshot[];    // 1_5
  gameEvents: GameEvent[];
  alertHistory: StoredAlert[];
}

export type PredictGoalResponse =
  | { ok: true; data: PredictGoalResult }
  | { ok: false; error: string };

export type PredictGoalReasonResult =
  | { ok: true; data: PredictGoalReasonResponse }
  | { ok: false; error: string };

export interface PredictGoalSheetLogMeta {
  predictionId: string;
  giaiDau: string;
  doiNha: string;
  doiKhach: string;
  tySoLucDuDoan: string;
  timestampGmt7?: string;
}

/** Build server payload từ Dashboard state — chia sẻ giữa /predict-goal và /predict-goal/reason. */
function buildServerBody(
  input: PredictGoalInput,
  sheetLog?: PredictGoalSheetLogMeta,
): {
  matchId: string;
  half: 1 | 2;
  minute: number;
  match: {
    stats: ServerStatRow[];
    events: ServerEventEntry[];
    alerts: ServerAlertEntry[];
    odds: ServerOddsSnap[];
  };
  sheetLog?: PredictGoalSheetLogMeta;
} {
  const minute = input.liveMatch.timer?.tm ?? parseInt(input.liveMatch.time || '0', 10) ?? 0;
  const tt = input.liveMatch.timer?.tt;
  const half: 1 | 2 = String(tt) === '2' || minute >= 45 ? 2 : 1;

  return {
    matchId: input.matchId,
    half,
    minute,
    match: {
      stats: convertStatsHistory(input.statsHistory),
      events: convertEvents(input.gameEvents),
      alerts: convertAlerts(input.alertHistory),
      odds: [
        ...convertOuOdds(input.oddsHistory),
        ...convertAhOdds(input.homeOddsHistory),
        ...convertOuOdds(input.h1OuHistory ?? []),
        ...convertAhOdds(input.h1AhHistory ?? []),
      ],
    },
    ...(sheetLog ? { sheetLog } : {}),
  };
}

export async function fetchGoalPrediction(
  input: PredictGoalInput,
  opts: { force?: boolean; sheetLog?: PredictGoalSheetLogMeta } = {},
): Promise<PredictGoalResponse> {
  const body = buildServerBody(input, opts.sheetLog);
  const url = `${AI_SERVER_URL}/api/ai/predict-goal${opts.force ? '?force=1' : ''}`;
  try {
    // Fast path: server chỉ chạy ONNX + heuristic → 10s đủ rộng.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      let detail = '';
      try {
        const txt = await res.text();
        try {
          const j = JSON.parse(txt) as { error?: string; message?: string };
          detail = j.error || j.message || txt;
        } catch {
          detail = txt;
        }
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        error: `Server ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 240)}` : ''}`,
      };
    }
    const data = (await res.json()) as PredictGoalResult;
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.includes('timeout') || msg.includes('aborted') || (e as Error)?.name === 'TimeoutError';
    return {
      ok: false,
      error: isTimeout
        ? `Timeout sau 10s khi gọi ${AI_SERVER_URL}/api/ai/predict-goal`
        : `Không kết nối được ${AI_SERVER_URL} — ${msg}`,
    };
  }
}

export interface SimilarMatchDetail {
  matchId: string;
  homeName: string;
  awayName: string;
  league: string;
  finalScore: string;
  ftStatus: string;
  file?: string;
}

/** Lấy chi tiết 1 trận tương tự (tên đội + giải + tỷ số chung cuộc) — đọc lazy History md ở server. */
export async function fetchMatchDetail(matchId: string): Promise<SimilarMatchDetail | null> {
  const url = `${AI_SERVER_URL}/api/ai/predict-goal/match-detail?matchId=${encodeURIComponent(matchId)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    return (await res.json()) as SimilarMatchDetail;
  } catch {
    return null;
  }
}

/** 1 điểm odds Tài/Xỉu cả trận (1_3) — phút tuyệt đối (H2 = 45+). */
export interface OddsHistoryPoint {
  minute: number;
  half: 1 | 2;
  handicap: number;
  over?: number;
  under?: number;
}

/** 1 điểm kèo chấp cả trận (1_2). */
export interface AhHistoryPoint {
  minute: number;
  half: 1 | 2;
  handicap: number;
  home?: number;
  away?: number;
}

/** Counter lũy kế theo phút [home, away] — từ bảng statsHistory trong History md. */
export interface MinuteStatRow {
  minute: number;
  half: 1 | 2;
  attacks: [number, number];
  dangerous: [number, number];
  onTarget: [number, number];
  offTarget: [number, number];
  corners: [number, number];
}

export interface OddsHistory13Data {
  matchId: string;
  homeName: string;
  awayName: string;
  league: string;
  finalScore: string;
  odds: OddsHistoryPoint[];
  odds12: AhHistoryPoint[];
  events: Array<{ minute: number; half: 1 | 2; type: 'goal' | 'corner' }>;
  alerts: Array<{ minute: number; half: 1 | 2; type: string; pressure: number }>;
  stats: MinuteStatRow[];
}

export type FetchOddsHistoryResult =
  | { ok: true; data: OddsHistory13Data }
  | { ok: false; error: string };

/** Lấy lịch sử odds Tài/Xỉu (1_3) + bàn thắng của 1 trận History — cho biểu đồ trong modal Tình huống tương tự. */
export async function fetchOddsHistory13(matchId: string, signal?: AbortSignal): Promise<FetchOddsHistoryResult> {
  const url = `${AI_SERVER_URL}/api/ai/predict-goal/odds-history?matchId=${encodeURIComponent(matchId)}`;
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10_000);
    const onAbort = (): void => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        let detail = '';
        try {
          const txt = await res.text();
          try {
            const j = JSON.parse(txt) as { error?: string; message?: string };
            detail = j.error || j.message || txt;
          } catch {
            detail = txt;
          }
        } catch {
          /* ignore */
        }
        return {
          ok: false,
          error: `Server ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 240)}` : ''}`,
        };
      }
      const data = (await res.json()) as OddsHistory13Data;
      return { ok: true, data };
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.includes('timeout') || msg.includes('aborted') || (e as Error)?.name === 'TimeoutError';
    return {
      ok: false,
      error: isTimeout
        ? `Timeout/hủy khi tải odds 1_3 từ ${AI_SERVER_URL}`
        : `Không kết nối được ${AI_SERVER_URL} — ${msg}`,
    };
  }
}

/**
 * Async fetch reason từ Ollama + GPT (song song server-side). Gọi sau khi
 * fetchGoalPrediction() đã trả về để không block UI hiển thị goalProb.
 * `signal` cho phép abort khi user đổi trận / unmount.
 * `force` = true → bypass server-side cache (dùng cho refresh button).
 */
export async function fetchGoalReason(
  input: PredictGoalInput,
  signal?: AbortSignal,
  opts: { force?: boolean; enableCloudAi?: boolean } = {},
): Promise<PredictGoalReasonResult> {
  // enableCloudAi = bật GPT + DeepSeek (tốn token) cho trận này; mặc định chỉ Ollama local.
  const body = { ...buildServerBody(input), enableCloudAi: opts.enableCloudAi === true };
  const url = `${AI_SERVER_URL}/api/ai/predict-goal/reason${opts.force ? '?force=1' : ''}`;
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 60_000);
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
        return { ok: false, error: `Server ${res.status} ${res.statusText}${txt ? ` — ${txt.slice(0, 240)}` : ''}` };
      }
      const data = (await res.json()) as PredictGoalReasonResponse;
      return { ok: true, data };
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = msg.includes('abort') || (e as Error)?.name === 'AbortError';
    return {
      ok: false,
      error: isAbort ? 'Reason request bị huỷ' : `Lỗi gọi /reason: ${msg}`,
    };
  }
}

// ---- Tình huống tương tự (modal "Xem tất cả") ----

/** Tổng lũy kế từ đầu trận: DA / sút / sút trúng đích / phạt góc. */
export interface CumulativeTotals {
  da: number;
  shots: number;
  onTarget: number;
  corners: number;
}

/** 1 tình huống tương tự kèm tỷ số FT + giải + tổng lũy kế (server enrich từ History md). */
export type SimilarMatchFull = PredictGoalResult['similarMatches'][number] & {
  finalScore?: string;
  league?: string;
  totals?: CumulativeTotals | null;
};

export type FetchSimilarResult =
  | {
      ok: true;
      data: {
        queryFeatures?: Record<string, number>;
        openingLines?: OpeningLinesRef;
        /** Cách cũ: vạch snapshot T/X + chấp + sim. */
        similarMatches: SimilarMatchFull[];
        /** Cách mới: vạch mở hiệp H1/H2 + bonus 2 hiệp. */
        similarMatchesOpenLine?: SimilarMatchFull[];
        currentTotals?: CumulativeTotals | null;
      };
    }
  | { ok: false; error: string };

/**
 * Lấy top-N tình huống tương tự (cùng/gần vạch kèo) kèm tỷ số FT để hiển thị bảng
 * so sánh trong modal. Gọi khi user mở modal "Xem tất cả".
 */
export async function fetchSimilarMatches(
  input: PredictGoalInput,
  limit = 20,
  signal?: AbortSignal,
  queryFeatures?: Record<string, number>,
): Promise<FetchSimilarResult> {
  // Gửi kèm queryFeatures (đã build lúc predict) để server khỏi dựng lại feature vector
  // — tránh lỗi "không đủ stats" khi mở modal lúc state live thiếu dữ liệu.
  const body = { ...buildServerBody(input), ...(queryFeatures ? { queryFeatures } : {}) };
  const url = `${AI_SERVER_URL}/api/ai/predict-goal/similar?limit=${limit}`;
  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 15_000);
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
        return { ok: false, error: `Server ${res.status} ${res.statusText}${txt ? ` — ${txt.slice(0, 240)}` : ''}` };
      }
      const data = (await res.json()) as {
        queryFeatures?: Record<string, number>;
        openingLines?: OpeningLinesRef;
        similarMatches: SimilarMatchFull[];
        similarMatchesOpenLine?: SimilarMatchFull[];
        currentTotals?: CumulativeTotals | null;
      };
      return { ok: true, data };
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = msg.includes('abort') || (e as Error)?.name === 'AbortError';
    return { ok: false, error: isAbort ? 'Yêu cầu bị huỷ' : `Lỗi gọi /similar: ${msg}` };
  }
}

// ---- Cloud AI toggle (bật GPT + DeepSeek theo từng trận để tiết kiệm token) ----

/** Key localStorage lưu trạng thái bật Cloud AI (GPT + DeepSeek) cho 1 trận. */
export function cloudAiEnabledKey(matchId: string): string {
  return `goalCloudAiEnabled_${matchId}`;
}

/** Đọc trạng thái bật Cloud AI của trận. Mặc định false → chỉ Ollama local chạy. */
export function loadCloudAiEnabled(matchId: string): boolean {
  try {
    return localStorage.getItem(cloudAiEnabledKey(matchId)) === '1';
  } catch {
    return false;
  }
}

/** Lưu trạng thái bật/tắt Cloud AI cho trận. */
export function setCloudAiEnabled(matchId: string, enabled: boolean): void {
  safeSetItem(cloudAiEnabledKey(matchId), enabled ? '1' : '0', { keepMatchId: matchId });
}

// ---- Goal-prob history (lưu chuỗi prediction theo phút để vẽ biểu đồ) ----

export const GOAL_PROB_HISTORY_UPDATED_EVENT = 'proFootball:goalProbHistoryUpdated';
const GOAL_PROB_MAX_ENTRIES_PER_MATCH = 200;

export interface GoalProbEntry {
  /** Phút đồng hồ trận tại lúc predict. */
  minute: number;
  half: 1 | 2;
  /** Xác suất 15' 0–1. */
  prob: number;
  /** Xác suất 5' 0–1 (optional — entry cũ không có). */
  prob5?: number;
  /** Xác suất 30' 0–1 — cửa sổ CHÍNH (optional — entry cũ không có). */
  prob30?: number;
  /** Unix ms. */
  ts: number;
}

export function goalProbHistoryKey(matchId: string): string {
  return `goalProbHistory_${matchId}`;
}

export function loadGoalProbHistory(matchId: string): GoalProbEntry[] {
  try {
    const raw = localStorage.getItem(goalProbHistoryKey(matchId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is GoalProbEntry =>
        e && typeof e === 'object' &&
        typeof (e as GoalProbEntry).minute === 'number' &&
        typeof (e as GoalProbEntry).prob === 'number' &&
        ((e as GoalProbEntry).half === 1 || (e as GoalProbEntry).half === 2),
    );
  } catch {
    return [];
  }
}

/**
 * Append 1 entry. Nếu đã có entry cùng (half, minute) → ghi đè bằng prob mới nhất.
 * Trả về snapshot sau khi cập nhật.
 */
export function appendGoalProbEntry(matchId: string, entry: GoalProbEntry): GoalProbEntry[] {
  const list = loadGoalProbHistory(matchId);
  const k = `${entry.half}-${entry.minute}`;
  const idx = list.findIndex((e) => `${e.half}-${e.minute}` === k);
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  // Sort + cap
  list.sort((a, b) => a.half - b.half || a.minute - b.minute);
  const trimmed = list.length > GOAL_PROB_MAX_ENTRIES_PER_MATCH
    ? list.slice(-GOAL_PROB_MAX_ENTRIES_PER_MATCH)
    : list;
  const saved = safeSetItem(goalProbHistoryKey(matchId), JSON.stringify(trimmed), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(GOAL_PROB_HISTORY_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return trimmed;
}

// ---- Prediction snapshots (lưu full result mỗi lần gọi để xem lại lịch sử) ----

const PREDICTION_SNAPSHOTS_MAX = 20;
export const PREDICTION_SNAPSHOTS_UPDATED_EVENT = 'proFootball:predictionSnapshotsUpdated';

/** "Trong 15p tới có/không có bàn" — auto suy từ gameEvents hoặc user chấm tay. */
export type PredictionVerdict = 'yes' | 'no';

export interface PredictionSnapshot {
  id: string;
  minute: number;
  half: 1 | 2;
  ts: number;
  result: PredictGoalResult;
  /** null/undefined = chưa chấm. */
  verdict?: PredictionVerdict | null;
  /** Unix ms khi chấm (auto hoặc user). */
  verdictTs?: number;
  /** true = chấm tự động từ gameEvents; false/undefined = user chấm tay. */
  verdictAuto?: boolean;
  /** true sau khi PATCH verdict lên Google Sheets thành công. */
  sheetVerdictSynced?: boolean;
  /** true sau khi POST dòng dự đoán lên Google Sheets thành công. */
  sheetLogged?: boolean;
  // ---- Verdict cửa sổ 30' (cửa sổ CHÍNH) — song song với verdict 15' ở trên ----
  /** null/undefined = chưa chấm cửa sổ 30'. */
  verdict30?: PredictionVerdict | null;
  verdict30Ts?: number;
  verdict30Auto?: boolean;
  /** true sau khi PATCH verdict 30' lên Google Sheets thành công. */
  sheetVerdict30Synced?: boolean;
}

/**
 * Cửa sổ dự đoán: nếu có bàn thắng trong (predict.minute, predict.minute + GOAL_WINDOW_MIN]
 * **cùng hiệp** với prediction → 'yes'. Nếu cửa sổ đã hết mà không có bàn → 'no'.
 * Nếu cửa sổ chưa hết (đang trong trận, chưa đủ data) → null.
 *
 * GOAL_WINDOW_MIN giữ đồng bộ với feature-builder server-side (15p).
 */
export const GOAL_VERDICT_WINDOW_MIN = 15;

/** Cửa sổ chấm cho dự đoán 30' (cửa sổ CHÍNH). */
export const GOAL_VERDICT_WINDOW_MIN_30 = 30;

/** Snapshots phút >= ngưỡng này (auto 80, 90…) chờ FT mới chấm, không đóng sớm theo minute+15. */
export const LATE_GAME_AUTO_SCORE_MIN = 80;

export function isLateGameAutoScoreMinute(minute: number): boolean {
  return minute >= LATE_GAME_AUTO_SCORE_MIN;
}

export interface GameEventLike {
  minute: number;
  half: 1 | 2;
  type: 'goal' | 'corner';
}

export function autoScoreVerdict(
  snapshot: { half: 1 | 2; minute: number },
  events: GameEventLike[],
  current: { half: 1 | 2; minute: number; isFt?: boolean },
  windowMin: number = GOAL_VERDICT_WINDOW_MIN,
): PredictionVerdict | null {
  const rawWindowEnd = snapshot.minute + windowMin;
  const lateGame = isLateGameAutoScoreMinute(snapshot.minute);
  const effectiveFt =
    current.isFt === true || (lateGame && current.minute >= 90);
  const windowEnd = effectiveFt ? Math.min(rawWindowEnd, current.minute) : rawWindowEnd;

  const goalInWindow = events.some((e) => {
    if (e.type !== 'goal' || e.minute <= snapshot.minute || e.minute > windowEnd) return false;
    if (e.half === snapshot.half) return true;
    // Feed đôi khi gán half=1 cho bàn thuộc H2 (phút >= 45).
    if (snapshot.half === 2 && snapshot.minute >= 45 && e.half === 1 && e.minute >= 45) {
      return true;
    }
    return false;
  });
  if (goalInWindow) return 'yes';

  const windowElapsed =
    effectiveFt ||
    current.half > snapshot.half ||
    (!lateGame &&
      current.half === snapshot.half &&
      current.minute >= rawWindowEnd);
  if (windowElapsed) return 'no';

  return null;
}

function snapshotsKey(matchId: string): string {
  return `goalPredictionSnapshots_${matchId}`;
}

export function loadPredictionSnapshots(matchId: string): PredictionSnapshot[] {
  try {
    const raw = localStorage.getItem(snapshotsKey(matchId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (s): s is PredictionSnapshot =>
        s && typeof s === 'object' &&
        typeof (s as PredictionSnapshot).id === 'string' &&
        typeof (s as PredictionSnapshot).minute === 'number' &&
        typeof (s as PredictionSnapshot).ts === 'number' &&
        ((s as PredictionSnapshot).half === 1 || (s as PredictionSnapshot).half === 2) &&
        (s as PredictionSnapshot).result != null,
    );
  } catch {
    return [];
  }
}

export function appendPredictionSnapshot(
  matchId: string,
  snapshot: Omit<PredictionSnapshot, 'id'>,
): { snapshots: PredictionSnapshot[]; saved: boolean } {
  const list = loadPredictionSnapshots(matchId);
  const id = `${snapshot.half}-${snapshot.minute}-${snapshot.ts}`;
  const filtered = list.filter((s) => !(s.half === snapshot.half && s.minute === snapshot.minute));
  filtered.push({ id, ...snapshot });
  filtered.sort((a, b) => a.ts - b.ts);
  const trimmed = filtered.length > PREDICTION_SNAPSHOTS_MAX
    ? filtered.slice(-PREDICTION_SNAPSHOTS_MAX)
    : filtered;
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(trimmed), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  } else {
    console.warn('[goal-prediction] appendPredictionSnapshot: không lưu được localStorage');
  }
  return { snapshots: saved ? trimmed : list, saved };
}

/**
 * Set/unset verdict cho 1 snapshot. Truyền `verdict=null` để xoá đánh dấu.
 * Khớp snapshot theo `id` (do `appendPredictionSnapshot` sinh dạng `half-minute-ts`).
 * `auto=true` → đánh dấu là chấm tự động (UI hiển thị nhãn "auto").
 */
export function setPredictionSnapshotVerdict(
  matchId: string,
  snapshotId: string,
  verdict: PredictionVerdict | null,
  opts: { auto?: boolean } = {},
): PredictionSnapshot[] {
  const list = loadPredictionSnapshots(matchId);
  const idx = list.findIndex((s) => s.id === snapshotId);
  if (idx < 0) return list;
  list[idx] = {
    ...list[idx],
    verdict,
    verdictTs: verdict == null ? undefined : Date.now(),
    verdictAuto: verdict == null ? undefined : !!opts.auto,
    sheetVerdictSynced: verdict == null ? undefined : false,
  };
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return list;
}

/**
 * Set/unset verdict cửa sổ 30' cho 1 snapshot. Song song với
 * `setPredictionSnapshotVerdict` (15') — dùng cho nút chấm tay mốc 30'.
 */
export function setPredictionSnapshotVerdict30(
  matchId: string,
  snapshotId: string,
  verdict: PredictionVerdict | null,
  opts: { auto?: boolean } = {},
): PredictionSnapshot[] {
  const list = loadPredictionSnapshots(matchId);
  const idx = list.findIndex((s) => s.id === snapshotId);
  if (idx < 0) return list;
  list[idx] = {
    ...list[idx],
    verdict30: verdict,
    verdict30Ts: verdict == null ? undefined : Date.now(),
    verdict30Auto: verdict == null ? undefined : !!opts.auto,
    sheetVerdict30Synced: verdict == null ? undefined : false,
  };
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return list;
}

/**
 * Quét toàn bộ snapshots của 1 trận, auto-chấm những snapshot chưa có verdict
 * (hoặc đã từng auto nhưng giờ data đầy đủ hơn → re-evaluate). KHÔNG đè verdict
 * mà user chấm tay (`verdictAuto !== true`).
 *
 * Trả về số lượng snapshot đã update (để caller decide có log không).
 */
export function autoScoreAllSnapshots(
  matchId: string,
  events: GameEventLike[],
  current: { half: 1 | 2; minute: number; isFt?: boolean },
): number {
  const list = loadPredictionSnapshots(matchId);
  let changed = 0;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    let next = s;
    let rowChanged = false;

    // --- Cửa sổ 15' --- (bỏ qua nếu user đã chấm tay: verdictAuto === false)
    if (!(s.verdict && s.verdictAuto !== true)) {
      const computed = autoScoreVerdict({ half: s.half, minute: s.minute }, events, current);
      if (computed !== (s.verdict ?? null)) {
        next = {
          ...next,
          verdict: computed,
          verdictTs: computed == null ? undefined : Date.now(),
          verdictAuto: computed == null ? undefined : true,
          sheetVerdictSynced: computed == null ? undefined : false,
        };
        rowChanged = true;
      }
    }

    // --- Cửa sổ 30' (cửa sổ CHÍNH) ---
    if (!(s.verdict30 && s.verdict30Auto !== true)) {
      const computed30 = autoScoreVerdict(
        { half: s.half, minute: s.minute },
        events,
        current,
        GOAL_VERDICT_WINDOW_MIN_30,
      );
      if (computed30 !== (s.verdict30 ?? null)) {
        next = {
          ...next,
          verdict30: computed30,
          verdict30Ts: computed30 == null ? undefined : Date.now(),
          verdict30Auto: computed30 == null ? undefined : true,
          sheetVerdict30Synced: computed30 == null ? undefined : false,
        };
        rowChanged = true;
      }
    }

    if (rowChanged) {
      list[i] = next;
      changed++;
    }
  }
  if (changed > 0) {
    const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
    if (saved) {
      window.dispatchEvent(
        new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
      );
      return changed;
    }
    console.warn('[goal-prediction] autoScoreAllSnapshots: không lưu được localStorage');
    return 0;
  }
  return changed;
}

/**
 * Patch field `reasons` của snapshot khớp (half, minute, ts) trong localStorage —
 * gọi sau khi /reason trả về để badge và history tab cùng có data Ollama + GPT.
 */
export function updatePredictionSnapshotReasons(
  matchId: string,
  match: { half: 1 | 2; minute: number; ts: number },
  reasons: PredictGoalResult['reasons'],
): PredictionSnapshot[] {
  const list = loadPredictionSnapshots(matchId);
  const idx = list.findIndex(
    (s) => s.half === match.half && s.minute === match.minute && s.ts === match.ts,
  );
  if (idx < 0) return list;
  list[idx] = {
    ...list[idx],
    result: { ...list[idx].result, reasons },
  };
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return list;
}

/** Đánh dấu dòng dự đoán đã ghi lên Google Sheets. */
export function markPredictionSheetLogged(
  matchId: string,
  snapshotId: string,
): PredictionSnapshot[] {
  const list = loadPredictionSnapshots(matchId);
  const idx = list.findIndex((s) => s.id === snapshotId);
  if (idx < 0) return list;
  list[idx] = { ...list[idx], sheetLogged: true };
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return list;
}

/** Đánh dấu verdict đã sync lên Google Sheets. */
export function markPredictionSheetVerdictSynced(
  matchId: string,
  snapshotId: string,
): PredictionSnapshot[] {
  const list = loadPredictionSnapshots(matchId);
  const idx = list.findIndex((s) => s.id === snapshotId);
  if (idx < 0) return list;
  list[idx] = { ...list[idx], sheetVerdictSynced: true };
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return list;
}

/** Đánh dấu verdict cửa sổ 30' đã sync lên Google Sheets. */
export function markPredictionSheetVerdict30Synced(
  matchId: string,
  snapshotId: string,
): PredictionSnapshot[] {
  const list = loadPredictionSnapshots(matchId);
  const idx = list.findIndex((s) => s.id === snapshotId);
  if (idx < 0) return list;
  list[idx] = { ...list[idx], sheetVerdict30Synced: true };
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(list), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PREDICTION_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return list;
}

export async function fetchGoalPredictStatus(): Promise<PredictGoalStatus | null> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/ai/predict-goal/status`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PredictGoalStatus;
  } catch {
    return null;
  }
}
