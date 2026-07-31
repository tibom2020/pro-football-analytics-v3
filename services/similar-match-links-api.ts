import { AI_SERVER_URL } from './ai-service';
import type { SimilarMatchLinkRecord } from './similar-match-links';

export async function fetchSimilarMatchLinksFromHistory(
  matchId: string,
  signal?: AbortSignal,
): Promise<SimilarMatchLinkRecord[]> {
  try {
    const q = new URLSearchParams({ matchId: String(matchId) });
    const res = await fetch(`${AI_SERVER_URL}/api/history/similar-links?${q}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { links?: SimilarMatchLinkRecord[] };
    return Array.isArray(data.links) ? data.links : [];
  } catch {
    return [];
  }
}
