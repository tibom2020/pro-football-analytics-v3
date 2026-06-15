/**
 * Client wrapper cho Google Sheets goal prediction logging.
 * Gọi `/api/sheets/goal-prediction` — private key không lộ ra bundle.
 */
import type { MatchInfo } from '../types';
import { AI_SERVER_URL } from './ai-service';
import type { PredictGoalResult, PredictionVerdict } from './goal-prediction';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 600;

function timeoutSignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(FETCH_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

async function fetchWithRetry<T>(
  url: string,
  init: RequestInit,
): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
    }
    try {
      const res = await fetch(url, { ...init, signal: timeoutSignal() });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (res.ok) return json as T;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.warn('[goal-prediction-sheet-log] HTTP', res.status, json);
        return json as T;
      }
    } catch (e) {
      console.warn('[goal-prediction-sheet-log] network error attempt', attempt + 1, e);
    }
  }
  return null;
}

export interface GoalPredictionSheetPayload {
  predictionId: string;
  matchId: string;
  giaiDau: string;
  doiNha: string;
  doiKhach: string;
  hieu: 1 | 2;
  phut: number;
  khoang10?: string;
  tySoLucDuDoan: string;
  prob15Pct: number;
  prob5Pct?: number | '';
  duDoan15?: 'cao' | 'thap';
  model15?: string;
  onnxMs?: number | '';
  reasonHeuristic?: string;
  timestampGmt7?: string;
  /** Cửa sổ 30' (cửa sổ CHÍNH). Bỏ trống nếu model 30' chưa load. */
  prob30Pct?: number | '';
  duDoan30?: 'cao' | 'thap';
  model30?: string;
}

export type LogGoalPredictionResult =
  | { ok: true; predictionId: string; rowIndex?: number; deduped?: boolean }
  | { ok: false; error: string };

export interface SheetsHealthInfo {
  enabled: boolean;
  hint?: string;
}

export async function fetchSheetsHealth(): Promise<SheetsHealthInfo> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/sheets/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { enabled: false, hint: `HTTP ${res.status}` };
    const json = (await res.json()) as { enabled?: boolean; hint?: string };
    return {
      enabled: json.enabled === true,
      hint: typeof json.hint === 'string' ? json.hint : undefined,
    };
  } catch {
    return {
      enabled: false,
      hint: 'Không kết nối server AI (npm run dev trong server/)',
    };
  }
}

export async function logGoalPredictionToSheet(
  payload: GoalPredictionSheetPayload,
): Promise<LogGoalPredictionResult> {
  const res = await fetchWithRetry<{
    success: boolean;
    predictionId?: string;
    rowIndex?: number;
    deduped?: boolean;
    error?: string;
  }>(`${AI_SERVER_URL}/api/sheets/goal-prediction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res === null) {
    return {
      ok: false,
      error:
        'Không kết nối được server AI. Chạy `npm run dev` trong `server/` và kiểm tra VITE_AI_SERVER_URL.',
    };
  }
  if (res.success === false) {
    const msg = typeof res.error === 'string' && res.error.trim() ? res.error : 'Server từ chối ghi sheet.';
    console.warn('[goal-prediction-sheet-log] log failed:', msg);
    return { ok: false, error: msg };
  }
  return {
    ok: true,
    predictionId: res.predictionId || payload.predictionId,
    rowIndex: res.rowIndex,
    deduped: res.deduped,
  };
}

export async function updateGoalPredictionVerdictOnSheet(
  predictionId: string,
  verdict: PredictionVerdict,
  opts: { verdictAuto?: boolean; prob15Pct?: number; duDoan15?: 'cao' | 'thap' } = {},
): Promise<boolean> {
  const res = await fetchWithRetry<{ success: boolean; error?: string }>(
    `${AI_SERVER_URL}/api/sheets/goal-prediction/${encodeURIComponent(predictionId)}/verdict`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ketQua15: verdict,
        verdictAuto: opts.verdictAuto === true,
        prob15Pct: opts.prob15Pct,
        duDoan15: opts.duDoan15,
      }),
    },
  );
  if (!res || res.success === false) {
    if (res?.error) console.warn('[goal-prediction-sheet-log] verdict update failed:', res.error);
    return false;
  }
  return true;
}

/** Cập nhật kết quả cửa sổ 30' (block cột du_doan_30/ket_qua_30/chinh_xac_30 trên sheet). */
export async function updateGoalPrediction30VerdictOnSheet(
  predictionId: string,
  verdict: PredictionVerdict,
  opts: { verdictAuto?: boolean; prob30Pct?: number; duDoan30?: 'cao' | 'thap' } = {},
): Promise<boolean> {
  const res = await fetchWithRetry<{ success: boolean; error?: string }>(
    `${AI_SERVER_URL}/api/sheets/goal-prediction/${encodeURIComponent(predictionId)}/verdict`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        window: 30,
        ketQua30: verdict,
        verdictAuto: opts.verdictAuto === true,
        prob30Pct: opts.prob30Pct,
        duDoan30: opts.duDoan30,
      }),
    },
  );
  if (!res || res.success === false) {
    if (res?.error) console.warn('[goal-prediction-sheet-log] verdict30 update failed:', res.error);
    return false;
  }
  return true;
}

function minuteBucket10(phut: number): string {
  const m = Math.max(0, Math.floor(phut));
  if (m >= 90) return '90+';
  const lo = Math.floor(m / 10) * 10;
  return `${lo}-${lo + 9}`;
}

function deriveDuDoan15(prob15: number): 'cao' | 'thap' {
  return prob15 >= 0.5 ? 'cao' : 'thap';
}

export function buildGoalPredictionSheetPayload(
  match: MatchInfo,
  params: {
    predictionId: string;
    half: 1 | 2;
    minute: number;
    result: PredictGoalResult;
    ts?: number;
  },
): GoalPredictionSheetPayload {
  const prob15 = params.result.goalProb15 ?? params.result.goalProb;
  const prob15Pct =
    typeof prob15 === 'number' ? Math.round(prob15 * 100) : 0;
  const prob5 = params.result.goalProb5;
  const prob5Pct =
    typeof prob5 === 'number' ? Math.round(prob5 * 100) : undefined;
  const prob30 = params.result.goalProb30;
  const prob30Pct =
    typeof prob30 === 'number' ? Math.round(prob30 * 100) : undefined;

  return {
    predictionId: params.predictionId,
    matchId: match.id,
    giaiDau: match.league?.name || 'N/A',
    doiNha: match.home?.name || 'Home',
    doiKhach: match.away?.name || 'Away',
    hieu: params.half,
    phut: params.minute,
    khoang10: minuteBucket10(params.minute),
    tySoLucDuDoan: match.ss || 'N/A',
    prob15Pct,
    prob5Pct,
    duDoan15: typeof prob15 === 'number' ? deriveDuDoan15(prob15) : undefined,
    model15: params.result.modelMeta?.version ?? '',
    onnxMs: params.result.latencyMs?.onnx ?? '',
    reasonHeuristic: (params.result.reasonVi || params.result.fallback || '').slice(0, 500),
    prob30Pct,
    duDoan30: typeof prob30 === 'number' ? deriveDuDoan15(prob30) : undefined,
    model30: params.result.modelMeta30?.version ?? '',
    timestampGmt7: params.ts
      ? formatGmt7FromTs(params.ts)
      : undefined,
  };
}

function formatGmt7FromTs(ts: number): string {
  const shifted = new Date(ts + 7 * 60 * 60 * 1000);
  const iso = shifted.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} GMT+7`;
}
