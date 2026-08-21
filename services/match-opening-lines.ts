import type { MatchInfo, OverUnderMinuteSnapshot } from '../types';
import { getMatchOdds } from './api';
import {
  computeOu13OpeningLines,
  computeOu16OpeningLine,
  normalizeOverUnderSnapshots,
} from './oddsNormalize';
import { strongestNegativeDelta } from './ou-line-over-delta';

export interface MatchOpeningLines {
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  /** Vạch mở Tài/Xỉu H1 (1_6). */
  h1OpenOu16?: number;
  /** Δ âm mạnh nhất 1_3 H1 (chỉ khi < 0). */
  h1StrongNegDelta13?: number;
  /** Δ âm mạnh nhất 1_3 H2 (chỉ khi < 0). */
  h2StrongNegDelta13?: number;
  /** Δ âm mạnh nhất 1_6 H1 (chỉ khi < 0). */
  h1StrongNegDelta16?: number;
}

function toDropPoints(snaps: OverUnderMinuteSnapshot[]) {
  return snaps
    .filter((s) => Number.isFinite(s.minute) && Number.isFinite(s.handicap) && Number.isFinite(s.over))
    .map((s) => ({ minute: s.minute, handicap: s.handicap, over: s.over }));
}

function assignStrongNeg(
  out: MatchOpeningLines,
  key: 'h1StrongNegDelta13' | 'h2StrongNegDelta13' | 'h1StrongNegDelta16',
  snaps: OverUnderMinuteSnapshot[],
) {
  const d = strongestNegativeDelta(toDropPoints(snaps));
  if (d != null) out[key] = d;
}

async function fetchOneMatchOpeningLines(
  token: string,
  match: MatchInfo,
): Promise<MatchOpeningLines> {
  const odds = await getMatchOdds(token, match.id);
  const marketOdds = odds?.results?.odds;
  if (!marketOdds) return {};

  const out: MatchOpeningLines = {};
  const items13 = marketOdds['1_3'];
  if (items13?.length) {
    const snaps13 = normalizeOverUnderSnapshots(items13, '1_3', { matchTimer: match.timer });
    Object.assign(out, computeOu13OpeningLines(snaps13));
    assignStrongNeg(
      out,
      'h1StrongNegDelta13',
      snaps13.filter((s) => s.half === 1),
    );
    assignStrongNeg(
      out,
      'h2StrongNegDelta13',
      snaps13.filter((s) => s.half === 2),
    );
  }

  const items16 = marketOdds['1_6'];
  if (items16?.length) {
    const snaps16 = normalizeOverUnderSnapshots(items16, '1_6', { matchTimer: match.timer });
    Object.assign(out, computeOu16OpeningLine(snaps16));
    assignStrongNeg(out, 'h1StrongNegDelta16', snaps16.filter((s) => s.half === 1));
  }

  return out;
}

/** Lấy vạch mở + Δ âm mạnh nhất — concurrency 1 mặc định để tránh 429. */
export async function fetchOpeningLinesForMatches(
  token: string,
  matches: MatchInfo[],
  options?: {
    concurrency?: number;
    onMatch?: (matchId: string, lines: MatchOpeningLines) => void;
  },
): Promise<Record<string, MatchOpeningLines>> {
  const concurrency = Math.max(1, options?.concurrency ?? 1);
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
