/**
 * Ghi chú liên kết 2 trận tương tự — lưu localStorage, xuất section .md khi export.
 */

import { safeSetItem } from './safe-storage';

export const SIMILAR_MATCH_LINKS_UPDATED_EVENT = 'proFootball:similarMatchLinksUpdated';

const MAX_PER_MATCH = 50;

export type SimilarMatchLinkTier = 'openLine' | 'catalog' | 'catalogRuns';

export interface SimilarMatchLinkRecord {
  id: string;
  relatedMatchId: string;
  relatedTeam: string;
  relatedFt: string;
  relatedHalf: 1 | 2;
  relatedMinute: number;
  tier: SimilarMatchLinkTier;
  similarity?: number;
  label30?: 0 | 1;
  sourceHalf: 1 | 2;
  sourceMinute: number;
  sourceScore?: string;
  ts: number;
}

export function similarMatchLinksKey(matchId: string): string {
  return `similarMatchLinks_${matchId}`;
}

export function similarMatchLinkId(
  sourceMatchId: string,
  relatedMatchId: string,
  sourceHalf: 1 | 2,
  sourceMinute: number,
): string {
  return `${sourceMatchId}:${relatedMatchId}:${sourceHalf}:${sourceMinute}`;
}

export function loadSimilarMatchLinks(matchId: string): SimilarMatchLinkRecord[] {
  try {
    const raw = localStorage.getItem(similarMatchLinksKey(matchId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r): r is SimilarMatchLinkRecord =>
        r != null &&
        typeof r === 'object' &&
        typeof (r as SimilarMatchLinkRecord).id === 'string' &&
        typeof (r as SimilarMatchLinkRecord).relatedMatchId === 'string' &&
        typeof (r as SimilarMatchLinkRecord).ts === 'number',
    );
  } catch {
    return [];
  }
}

export function isSimilarMatchLinked(
  matchId: string,
  relatedMatchId: string,
  sourceHalf: 1 | 2,
  sourceMinute: number,
): boolean {
  const id = similarMatchLinkId(matchId, relatedMatchId, sourceHalf, sourceMinute);
  return loadSimilarMatchLinks(matchId).some((r) => r.id === id);
}

function persistLinks(matchId: string, list: SimilarMatchLinkRecord[]): boolean {
  const trimmed =
    list.length > MAX_PER_MATCH ? list.slice(-MAX_PER_MATCH) : list;
  const saved = safeSetItem(similarMatchLinksKey(matchId), JSON.stringify(trimmed), {
    keepMatchId: matchId,
  });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(SIMILAR_MATCH_LINKS_UPDATED_EVENT, { detail: { matchId } }),
    );
  }
  return saved;
}

export interface SaveSimilarMatchLinkInput {
  relatedMatchId: string;
  relatedTeam: string;
  relatedFt: string;
  relatedHalf: 1 | 2;
  relatedMinute: number;
  tier: SimilarMatchLinkTier;
  similarity?: number;
  label30?: 0 | 1;
  sourceHalf: 1 | 2;
  sourceMinute: number;
  sourceScore?: string;
  /** Tên trận nguồn — dùng cho bản ghi reverse. */
  sourceTeam: string;
}

/** Ghi liên kết 2 chiều (A↔B). Trả về false nếu đã tồn tại. */
export function saveSimilarMatchLink(
  sourceMatchId: string,
  input: SaveSimilarMatchLinkInput,
): { saved: boolean; record?: SimilarMatchLinkRecord } {
  const id = similarMatchLinkId(
    sourceMatchId,
    input.relatedMatchId,
    input.sourceHalf,
    input.sourceMinute,
  );
  if (loadSimilarMatchLinks(sourceMatchId).some((r) => r.id === id)) {
    return { saved: false };
  }

  const ts = Date.now();
  const forward: SimilarMatchLinkRecord = {
    id,
    relatedMatchId: input.relatedMatchId,
    relatedTeam: input.relatedTeam,
    relatedFt: input.relatedFt,
    relatedHalf: input.relatedHalf,
    relatedMinute: input.relatedMinute,
    tier: input.tier,
    similarity: input.similarity,
    label30: input.label30,
    sourceHalf: input.sourceHalf,
    sourceMinute: input.sourceMinute,
    sourceScore: input.sourceScore,
    ts,
  };

  const reverseId = similarMatchLinkId(
    input.relatedMatchId,
    sourceMatchId,
    input.relatedHalf,
    input.relatedMinute,
  );
  const reverse: SimilarMatchLinkRecord = {
    id: reverseId,
    relatedMatchId: sourceMatchId,
    relatedTeam: input.sourceTeam,
    relatedFt: input.sourceScore ?? '—',
    relatedHalf: input.sourceHalf,
    relatedMinute: input.sourceMinute,
    tier: input.tier,
    similarity: input.similarity,
    label30: undefined,
    sourceHalf: input.relatedHalf,
    sourceMinute: input.relatedMinute,
    sourceScore: input.relatedFt,
    ts,
  };

  const fwdList = loadSimilarMatchLinks(sourceMatchId).filter((r) => r.id !== id);
  fwdList.push(forward);
  fwdList.sort((a, b) => a.ts - b.ts);
  persistLinks(sourceMatchId, fwdList);

  const revList = loadSimilarMatchLinks(input.relatedMatchId).filter((r) => r.id !== reverseId);
  revList.push(reverse);
  revList.sort((a, b) => a.ts - b.ts);
  persistLinks(input.relatedMatchId, revList);

  return { saved: true, record: forward };
}

/** Xóa liên kết 2 chiều. */
export function removeSimilarMatchLink(
  sourceMatchId: string,
  relatedMatchId: string,
  sourceHalf: 1 | 2,
  sourceMinute: number,
  relatedHalf: 1 | 2,
  relatedMinute: number,
): void {
  const id = similarMatchLinkId(sourceMatchId, relatedMatchId, sourceHalf, sourceMinute);
  const reverseId = similarMatchLinkId(relatedMatchId, sourceMatchId, relatedHalf, relatedMinute);

  const fwdNext = loadSimilarMatchLinks(sourceMatchId).filter((r) => r.id !== id);
  if (fwdNext.length !== loadSimilarMatchLinks(sourceMatchId).length) {
    persistLinks(sourceMatchId, fwdNext);
  }

  const revNext = loadSimilarMatchLinks(relatedMatchId).filter((r) => r.id !== reverseId);
  if (revNext.length !== loadSimilarMatchLinks(relatedMatchId).length) {
    persistLinks(relatedMatchId, revNext);
  }
}

/** Merge bản ghi từ server (.md) — không ghi đè localStorage nếu trùng id. */
export function mergeSimilarMatchLinksFromServer(
  matchId: string,
  incoming: SimilarMatchLinkRecord[],
): SimilarMatchLinkRecord[] {
  if (!incoming.length) return loadSimilarMatchLinks(matchId);
  const existing = loadSimilarMatchLinks(matchId);
  const ids = new Set(existing.map((r) => r.id));
  const merged = [...existing];
  for (const row of incoming) {
    if (!ids.has(row.id)) {
      merged.push(row);
      ids.add(row.id);
    }
  }
  merged.sort((a, b) => a.ts - b.ts);
  persistLinks(matchId, merged);
  return merged;
}

export const TIER_LABEL: Record<SimilarMatchLinkTier, string> = {
  openLine: 'top vạch mở',
  catalog: 'catalog',
  catalogRuns: 'catalog+pattern',
};

export function formatSimilarLinkTime(ts: number): string {
  try {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
