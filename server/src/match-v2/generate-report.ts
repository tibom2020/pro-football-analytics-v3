import fs from 'node:fs/promises';
import { readJsonlLines } from './jsonl.js';
import { listMatchDirs, resolveMatchPathsForReport } from './list-matches.js';
import { buildMetaFromFiles, readMeta, writeMetaAtomic } from './meta.js';
import { pathsForMatchDir } from './paths.js';
import { buildReportMarkdown } from './report.js';
import type { MatchV2Meta, RawOddsRecord, StatsRow } from './types.js';

export type GenerateReportResult = {
  matchId: string;
  matchDir: string;
  reportPath: string;
  metaPath: string;
};

/**
 * Sinh lại meta (nếu cần) + report.md hoàn toàn từ file thô — không gọi API.
 */
export async function generateReportForMatchDir(matchDir: string): Promise<GenerateReportResult> {
  const paths = pathsForMatchDir(matchDir);
  const matchId = matchDir.split(/[/\\]/).pop() || '';

  let meta = await readMeta(paths.metaJson);
  if (!meta) {
    meta = await buildMetaFromFiles(paths, { matchId });
    await writeMetaAtomic(paths.metaJson, meta);
  } else {
    // Làm mới goals / self_check từ file thô (report không chứa dữ liệu ngoài 3 file)
    meta = await buildMetaFromFiles(paths, {
      matchId,
      league: meta.league,
      home: meta.home,
      away: meta.away,
      kickoffAddTime: meta.kickoff_add_time,
      finalScore: meta.final_score,
      statusAtEnd: meta.status_at_end,
      truncationDetected: meta.truncation_detected,
      truncationFirstSeenAt: meta.truncation_first_seen_at ?? null,
      previous: meta,
    });
    await writeMetaAtomic(paths.metaJson, meta);
  }

  const [odds, stats] = await Promise.all([
    readJsonlLines<RawOddsRecord>(paths.oddsJsonl),
    readJsonlLines<StatsRow>(paths.statsJsonl),
  ]);

  const md = buildReportMarkdown({ meta, odds, stats });
  await fs.writeFile(paths.reportMd, md, 'utf8');

  return {
    matchId,
    matchDir,
    reportPath: paths.reportMd,
    metaPath: paths.metaJson,
  };
}

export async function generateReportForMatchId(
  matchId: string,
  v2Root?: string,
): Promise<GenerateReportResult> {
  const resolved = resolveMatchPathsForReport(matchId, v2Root);
  if (!resolved.found) {
    throw new Error(`Không tìm thấy trận ${matchId} dưới ${resolved.root}`);
  }
  return generateReportForMatchDir(resolved.paths.matchDir);
}

export async function generateReportsAll(opts: {
  v2Root?: string;
  since?: string;
}): Promise<GenerateReportResult[]> {
  const listed = listMatchDirs(opts.v2Root, opts.since);
  const results: GenerateReportResult[] = [];
  for (const item of listed) {
    results.push(await generateReportForMatchDir(item.matchDir));
  }
  return results;
}

export type { MatchV2Meta };
