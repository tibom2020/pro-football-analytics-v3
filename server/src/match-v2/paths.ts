import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../config.js';

/** Thư mục gốc dữ liệu trận v2 — mặc định `repo/data/v2`. */
export function resolveV2Root(explicit?: string): string {
  if (explicit?.trim()) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(REPO_ROOT, explicit);
  }
  return path.resolve(REPO_ROOT, 'data', 'v2');
}

/** Ngày bóng lăn theo UTC: `YYYY-MM-DD`. */
export function utcDayString(unixSeconds: number = Math.floor(Date.now() / 1000)): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export type MatchV2Paths = {
  root: string;
  dayDir: string;
  matchDir: string;
  oddsJsonl: string;
  pollLogJsonl: string;
  statsJsonl: string;
  metaJson: string;
  reportMd: string;
};

export function pathsForMatchDir(matchDir: string): MatchV2Paths {
  return {
    root: path.dirname(path.dirname(matchDir)),
    dayDir: path.dirname(matchDir),
    matchDir,
    oddsJsonl: path.join(matchDir, 'odds.jsonl'),
    pollLogJsonl: path.join(matchDir, 'poll_log.jsonl'),
    statsJsonl: path.join(matchDir, 'stats.jsonl'),
    metaJson: path.join(matchDir, 'meta.json'),
    reportMd: path.join(matchDir, 'report.md'),
  };
}

/**
 * Tìm thư mục trận đã tồn tại: `data/v2/<UTC-day>/<matchId>/`.
 * Nếu có nhiều ngày (không kỳ vọng), lấy thư mục mới nhất theo tên ngày.
 */
export function findExistingMatchDir(v2Root: string, matchId: string): string | null {
  if (!fs.existsSync(v2Root)) return null;
  const days = fs
    .readdirSync(v2Root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort();
  for (let i = days.length - 1; i >= 0; i--) {
    const candidate = path.join(v2Root, days[i], matchId);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Dùng thư mục đã có (nếu có) — không tạo bản thứ hai khi restart giữa trận.
 * Nếu chưa có: tạo dưới ngày UTC hiện tại.
 */
export function resolveOrCreateMatchDir(v2Root: string, matchId: string): MatchV2Paths {
  const existing = findExistingMatchDir(v2Root, matchId);
  const matchDir = existing ?? path.join(v2Root, utcDayString(), matchId);
  fs.mkdirSync(matchDir, { recursive: true });
  return pathsForMatchDir(matchDir);
}
