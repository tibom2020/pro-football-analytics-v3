import type { MatchInfo, OverUnderMinuteSnapshot } from '../types';
import { getMatchOdds } from './api';
import {
  computeOu13OpeningLines,
  computeOu16OpeningLine,
  normalizeOverUnderSnapshots,
} from './oddsNormalize';
import { mergeStrongestNegativeDelta, strongestNegativeDelta } from './ou-line-over-delta';

export interface MatchOpeningLines {
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  /** Vạch mở Tài/Xỉu H1 (1_6). */
  h1OpenOu16?: number;
  /** Δ âm mạnh nhất 1_3 H1 — gộp Tài đáy + Tài đỉnh (chỉ khi < 0). */
  h1StrongNegDelta13?: number;
  /** Δ âm mạnh nhất 1_3 H2 — gộp Tài đáy + Tài đỉnh. */
  h2StrongNegDelta13?: number;
  /** Δ âm mạnh nhất 1_6 H1 — gộp Tài đáy + Tài đỉnh. */
  h1StrongNegDelta16?: number;
}

export interface MatchOpeningLinesResult {
  lines: MatchOpeningLines;
  /** 1_3 Tài thấp nhất / phút (biểu đồ đáy). */
  snaps13Low: OverUnderMinuteSnapshot[];
  /** 1_3 Tài cao nhất / phút (biểu đồ đỉnh). */
  snaps13High: OverUnderMinuteSnapshot[];
  /** 1_6 H1 Tài thấp nhất. */
  snaps16Low: OverUnderMinuteSnapshot[];
  /** 1_6 H1 Tài cao nhất. */
  snaps16High: OverUnderMinuteSnapshot[];
}

const emptyResult = (): MatchOpeningLinesResult => ({
  lines: {},
  snaps13Low: [],
  snaps13High: [],
  snaps16Low: [],
  snaps16High: [],
});

function toDropPoints(snaps: OverUnderMinuteSnapshot[]) {
  return snaps
    .filter((s) => Number.isFinite(s.minute) && Number.isFinite(s.handicap) && Number.isFinite(s.over))
    .map((s) => ({ minute: s.minute, handicap: s.handicap, over: s.over }));
}

function assignStrongNegMerged(
  out: MatchOpeningLines,
  key: 'h1StrongNegDelta13' | 'h2StrongNegDelta13' | 'h1StrongNegDelta16',
  lowSnaps: OverUnderMinuteSnapshot[],
  highSnaps: OverUnderMinuteSnapshot[],
) {
  const d = mergeStrongestNegativeDelta(
    strongestNegativeDelta(toDropPoints(lowSnaps)),
    strongestNegativeDelta(toDropPoints(highSnaps)),
  );
  if (d != null) out[key] = d;
}

async function fetchOneMatchOpeningLines(
  token: string,
  match: MatchInfo,
): Promise<MatchOpeningLinesResult> {
  const odds = await getMatchOdds(token, match.id);
  const marketOdds = odds?.results?.odds;
  if (!marketOdds) return emptyResult();

  const out: MatchOpeningLines = {};
  let snaps13Low: OverUnderMinuteSnapshot[] = [];
  let snaps13High: OverUnderMinuteSnapshot[] = [];
  let snaps16Low: OverUnderMinuteSnapshot[] = [];
  let snaps16High: OverUnderMinuteSnapshot[] = [];

  const normOpts = { matchTimer: match.timer } as const;
  const highPick = { ...normOpts, minutePick: 'highestOver' as const };

  const items13 = marketOdds['1_3'];
  if (items13?.length) {
    snaps13Low = normalizeOverUnderSnapshots(items13, '1_3', normOpts);
    snaps13High = normalizeOverUnderSnapshots(items13, '1_3', highPick);
    Object.assign(out, computeOu13OpeningLines(snaps13Low));
    assignStrongNegMerged(
      out,
      'h1StrongNegDelta13',
      snaps13Low.filter((s) => s.half === 1),
      snaps13High.filter((s) => s.half === 1),
    );
    assignStrongNegMerged(
      out,
      'h2StrongNegDelta13',
      snaps13Low.filter((s) => s.half === 2),
      snaps13High.filter((s) => s.half === 2),
    );
  }

  const items16 = marketOdds['1_6'];
  if (items16?.length) {
    snaps16Low = normalizeOverUnderSnapshots(items16, '1_6', normOpts);
    snaps16High = normalizeOverUnderSnapshots(items16, '1_6', highPick);
    Object.assign(out, computeOu16OpeningLine(snaps16Low));
    assignStrongNegMerged(
      out,
      'h1StrongNegDelta16',
      snaps16Low.filter((s) => s.half === 1),
      snaps16High.filter((s) => s.half === 1),
    );
  }

  return { lines: out, snaps13Low, snaps13High, snaps16Low, snaps16High };
}

export type MatchOpeningLinesOnMatch = (
  matchId: string,
  result: MatchOpeningLinesResult,
  match: MatchInfo,
) => void;

export type MatchOpeningLinesOnProgress = (
  done: number,
  total: number,
  match: MatchInfo,
) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lấy vạch mở + Δ — tuần tự từng trận, tránh timeout/429. */
export async function fetchOpeningLinesForMatches(
  token: string,
  matches: MatchInfo[],
  options?: {
    /** Khoảng nghỉ thêm sau mỗi trận (ms). Mặc định 2s. */
    delayBetweenMatchesMs?: number;
    onMatch?: MatchOpeningLinesOnMatch;
    onProgress?: MatchOpeningLinesOnProgress;
  },
): Promise<Record<string, MatchOpeningLines>> {
  const delayMs = Math.max(0, options?.delayBetweenMatchesMs ?? 2_000);
  const out: Record<string, MatchOpeningLines> = {};
  if (!token || matches.length === 0) return out;

  const total = matches.length;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    options?.onProgress?.(i, total, match);
    try {
      const result = await fetchOneMatchOpeningLines(token, match);
      out[match.id] = result.lines;
      options?.onMatch?.(match.id, result, match);
    } catch {
      out[match.id] = {};
      options?.onMatch?.(match.id, emptyResult(), match);
    }
    if (i < matches.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }
  options?.onProgress?.(total, total, matches[matches.length - 1]!);
  return out;
}
