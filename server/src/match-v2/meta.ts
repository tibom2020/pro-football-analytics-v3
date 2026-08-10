import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { buildGoalsFromSs } from './goals.js';
import { readJsonlLines } from './jsonl.js';
import { computeSelfCheck } from './self-check.js';
import { buildSuspensions } from './suspensions.js';
import type {
  MatchV2Meta,
  PollLogEntry,
  RawOddsRecord,
  StatsRow,
} from './types.js';

export type MetaBuildContext = {
  matchId: string;
  league?: string;
  home?: string;
  away?: string;
  kickoffAddTime?: number | null;
  finalScore?: string | null;
  statusAtEnd?: string | null;
  truncationDetected?: boolean;
  truncationFirstSeenAt?: number | null;
  /** Giữ tên đội/league đã biết nếu lần poll này không còn trong inplay. */
  previous?: MatchV2Meta | null;
};

function mapTimeStatus(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw);
  if (s === '3' || s.toUpperCase() === 'FT') return 'FT';
  if (s === '1') return 'NS';
  if (s === '2') return 'LIVE';
  if (s === '4') return 'POSTPONED';
  if (s === '5') return 'CANCELLED';
  return s;
}

/**
 * Ghi meta.json kiểu tạm → rename (không bao giờ để JSON dở dang thay file cũ).
 * Windows: nếu đích đã tồn tại thì unlink rồi rename.
 */
export async function writeMetaAtomic(metaPath: string, meta: MatchV2Meta): Promise<void> {
  const dir = path.dirname(metaPath);
  await fsPromises.mkdir(dir, { recursive: true });
  const tmp = `${metaPath}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(meta, null, 2)}\n`;
  await fsPromises.writeFile(tmp, body, { encoding: 'utf8' });
  try {
    await fsPromises.rename(tmp, metaPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EEXIST' || code === 'EPERM' || code === 'EACCES') {
      await fsPromises.unlink(metaPath).catch(() => undefined);
      await fsPromises.rename(tmp, metaPath);
    } else {
      await fsPromises.unlink(tmp).catch(() => undefined);
      throw err;
    }
  }
}

export function readMetaSync(metaPath: string): MatchV2Meta | null {
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8')) as MatchV2Meta;
  } catch {
    return null;
  }
}

export async function readMeta(metaPath: string): Promise<MatchV2Meta | null> {
  try {
    const text = await fsPromises.readFile(metaPath, 'utf8');
    return JSON.parse(text) as MatchV2Meta;
  } catch {
    return null;
  }
}

/** Dựng meta từ file thô (+ context trận từ inplay / lần trước). */
export async function buildMetaFromFiles(
  paths: { oddsJsonl: string; statsJsonl: string; pollLogJsonl: string },
  ctx: MetaBuildContext,
): Promise<MatchV2Meta> {
  const [odds, stats, polls] = await Promise.all([
    readJsonlLines<RawOddsRecord>(paths.oddsJsonl),
    readJsonlLines<StatsRow>(paths.statsJsonl),
    readJsonlLines<PollLogEntry>(paths.pollLogJsonl),
  ]);

  const prev = ctx.previous ?? null;
  const goals = buildGoalsFromSs(odds);
  const suspensions = buildSuspensions(odds);
  const truncationDetected = Boolean(ctx.truncationDetected ?? prev?.truncation_detected);
  const selfCheck = computeSelfCheck({
    odds,
    stats,
    polls,
    truncationDetected,
  });

  const addTimes = odds
    .map((r) => Number(r.add_time))
    .filter((n) => Number.isFinite(n)) as number[];
  const pollAts = polls.map((p) => p.at).filter((n) => Number.isFinite(n)) as number[];
  const collectedCandidates = [...addTimes, ...pollAts];
  const collected_from =
    collectedCandidates.length > 0 ? Math.min(...collectedCandidates) : prev?.collected_from ?? null;
  const collected_to =
    collectedCandidates.length > 0 ? Math.max(...collectedCandidates) : prev?.collected_to ?? null;

  const lastOddsSs = [...odds].reverse().find((r) => r.ss != null)?.ss;
  const lastStatsSs = stats.length ? stats[stats.length - 1]?.ss : null;

  return {
    schema_version: 2,
    match_id: ctx.matchId,
    league: ctx.league || prev?.league || '',
    home: ctx.home || prev?.home || '',
    away: ctx.away || prev?.away || '',
    kickoff_add_time:
      ctx.kickoffAddTime !== undefined
        ? ctx.kickoffAddTime
        : prev?.kickoff_add_time ?? null,
    collected_from,
    collected_to,
    final_score:
      ctx.finalScore !== undefined && ctx.finalScore !== null
        ? ctx.finalScore
        : lastStatsSs || (lastOddsSs != null ? String(lastOddsSs) : prev?.final_score ?? null),
    status_at_end:
      ctx.statusAtEnd !== undefined
        ? ctx.statusAtEnd
        : prev?.status_at_end ?? null,
    goals_from_ss: goals,
    suspensions,
    truncation_detected: truncationDetected,
    truncation_first_seen_at:
      ctx.truncationFirstSeenAt !== undefined
        ? ctx.truncationFirstSeenAt
        : prev?.truncation_first_seen_at ?? null,
    self_check: selfCheck,
  };
}

export { mapTimeStatus };
