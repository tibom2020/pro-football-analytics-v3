/**
 * Lưu kết quả AI phân tích trận ghim — theo trận đang xem (sourceMatchId).
 */

import { safeSetItem } from './safe-storage';
import { pinnedChartKey, type PinnedChart } from './pinned-charts';
import type { PinnedAnalyzeResponse } from './pinned-ai-analysis';

export const PINNED_AI_ANALYSIS_UPDATED_EVENT = 'proFootball:pinnedAiAnalysisUpdated';

const MAX_PER_SOURCE = 30;

export interface PinnedAiAnalysisRecord {
  pinKey: string;
  ts: number;
  sourceScore?: string;
  pinTeam: string;
  pinnedMatchId: string;
  half: 1 | 2;
  minute: number;
  data?: PinnedAnalyzeResponse;
  error?: string;
}

function storageKey(sourceMatchId: string): string {
  return `pinnedAiAnalysis_${sourceMatchId}`;
}

export function loadPinnedAiAnalyses(sourceMatchId: string): PinnedAiAnalysisRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(sourceMatchId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r): r is PinnedAiAnalysisRecord =>
        r != null &&
        typeof r === 'object' &&
        typeof (r as PinnedAiAnalysisRecord).pinKey === 'string' &&
        typeof (r as PinnedAiAnalysisRecord).ts === 'number' &&
        typeof (r as PinnedAiAnalysisRecord).pinTeam === 'string',
    );
  } catch {
    return [];
  }
}

export function getPinnedAiAnalysis(
  sourceMatchId: string,
  pin: Pick<PinnedChart, 'matchId' | 'sourceMatchId'>,
): PinnedAiAnalysisRecord | null {
  const key = pinnedChartKey(pin);
  const list = loadPinnedAiAnalyses(sourceMatchId);
  const found = list.filter((r) => r.pinKey === key).sort((a, b) => b.ts - a.ts);
  return found[0] ?? null;
}

export function hasPinnedAiAnalysis(
  sourceMatchId: string,
  pin: Pick<PinnedChart, 'matchId' | 'sourceMatchId'>,
): boolean {
  const rec = getPinnedAiAnalysis(sourceMatchId, pin);
  return rec != null && (rec.data != null || !!rec.error);
}

/** Ghi đè bản mới nhất cho cùng pinKey; giữ tối đa MAX_PER_SOURCE bản (mới nhất). */
export function savePinnedAiAnalysis(
  sourceMatchId: string,
  pin: PinnedChart,
  payload: { data?: PinnedAnalyzeResponse; error?: string; sourceScore?: string },
): { saved: boolean; record: PinnedAiAnalysisRecord } {
  const pinKey = pinnedChartKey(pin);
  const half: 1 | 2 = pin.half === 2 ? 2 : 1;
  const record: PinnedAiAnalysisRecord = {
    pinKey,
    ts: Date.now(),
    sourceScore: payload.sourceScore,
    pinTeam: pin.team,
    pinnedMatchId: String(pin.matchId),
    half,
    minute: pin.minute ?? 0,
    ...(payload.data ? { data: payload.data } : {}),
    ...(payload.error ? { error: payload.error } : {}),
  };

  const list = loadPinnedAiAnalyses(sourceMatchId).filter((r) => r.pinKey !== pinKey);
  list.push(record);
  list.sort((a, b) => a.ts - b.ts);
  const trimmed = list.length > MAX_PER_SOURCE ? list.slice(-MAX_PER_SOURCE) : list;

  const saved = safeSetItem(storageKey(sourceMatchId), JSON.stringify(trimmed), {
    keepMatchId: sourceMatchId,
  });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PINNED_AI_ANALYSIS_UPDATED_EVENT, { detail: { sourceMatchId } }),
    );
  }
  return { saved, record };
}

export function removePinnedAiAnalysisForPin(
  sourceMatchId: string,
  pin: Pick<PinnedChart, 'matchId' | 'sourceMatchId'>,
): void {
  const pinKey = pinnedChartKey(pin);
  const list = loadPinnedAiAnalyses(sourceMatchId);
  const next = list.filter((r) => r.pinKey !== pinKey);
  if (next.length === list.length) return;
  const saved = safeSetItem(storageKey(sourceMatchId), JSON.stringify(next), {
    keepMatchId: sourceMatchId,
  });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(PINNED_AI_ANALYSIS_UPDATED_EVENT, { detail: { sourceMatchId } }),
    );
  }
}

export function formatPinnedAnalysisTime(ts: number): string {
  try {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
