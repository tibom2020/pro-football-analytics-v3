import fs from 'node:fs';
import path from 'node:path';
import { findExistingMatchDir, pathsForMatchDir, resolveV2Root, utcDayString } from './paths.js';

export type ListedMatchDir = {
  matchId: string;
  day: string;
  matchDir: string;
};

/** Liệt kê mọi `data/v2/<day>/<matchId>/`. */
export function listMatchDirs(v2Root?: string, sinceDay?: string): ListedMatchDir[] {
  const root = resolveV2Root(v2Root);
  if (!fs.existsSync(root)) return [];

  const days = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort();

  const out: ListedMatchDir[] = [];
  for (const day of days) {
    if (sinceDay && day < sinceDay) continue;
    const dayPath = path.join(root, day);
    const matches = fs
      .readdirSync(dayPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const matchId of matches) {
      out.push({ matchId, day, matchDir: path.join(dayPath, matchId) });
    }
  }
  return out;
}

export function resolveMatchPathsForReport(matchId: string, v2Root?: string) {
  const root = resolveV2Root(v2Root);
  const existing = findExistingMatchDir(root, matchId);
  if (!existing) {
    // Gợi ý đường dẫn ngày hôm nay nếu chưa có
    return {
      found: false as const,
      root,
      expected: path.join(root, utcDayString(), matchId),
    };
  }
  return { found: true as const, root, paths: pathsForMatchDir(existing) };
}
