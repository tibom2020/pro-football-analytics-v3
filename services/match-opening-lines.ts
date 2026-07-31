import type { MatchInfo } from '../types';
import { getMatchOdds } from './api';
import { computeOu13OpeningLines, normalizeOverUnderSnapshots } from './oddsNormalize';
import type { OpeningLinesRef } from './goal-prediction';

export type MatchOpeningLines = Pick<OpeningLinesRef, 'h1OpenOu13' | 'h2OpenOu13'>;

async function fetchOneMatchOpeningLines(
  token: string,
  match: MatchInfo,
): Promise<MatchOpeningLines> {
  const odds = await getMatchOdds(token, match.id);
  const items = odds?.results?.odds?.['1_3'];
  if (!items?.length) return {};
  const snaps = normalizeOverUnderSnapshots(items, '1_3', { matchTimer: match.timer });
  return computeOu13OpeningLines(snaps);
}

/** Lấy vạch mở 1_3 H1/H2 cho nhiều trận — giới hạn concurrency để tránh 429. */
export async function fetchOpeningLinesForMatches(
  token: string,
  matches: MatchInfo[],
  options?: {
    concurrency?: number;
    onMatch?: (matchId: string, lines: MatchOpeningLines) => void;
  },
): Promise<Record<string, MatchOpeningLines>> {
  const concurrency = Math.max(1, options?.concurrency ?? 3);
  const out: Record<string, MatchOpeningLines> = {};
  if (!token || matches.length === 0) return out;

  let idx = 0;
  async function worker() {
    while (idx < matches.length) {
      const i = idx++;
      const match = matches[i];
      try {
        const lines = await fetchOneMatchOpeningLines(token, match);
        out[match.id] = lines;
        options?.onMatch?.(match.id, lines);
      } catch {
        out[match.id] = {};
        options?.onMatch?.(match.id, {});
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, matches.length) }, () => worker()));
  return out;
}
