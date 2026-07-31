/**
 * Đọc liên kết trận tương tự từ History/*.md (forward + reverse scan).
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import {
  flipLinkForInbound,
  parseMatchFile,
  parseSimilarMatchLinksSection,
  type SimilarMatchLinkRow,
} from '../goal-predict/md-parser.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface ScanCache {
  at: number;
  byMatchId: Map<string, SimilarMatchLinkRow[]>;
}

let reverseScanCache: ScanCache | null = null;

function historyDir(): string {
  return config.goalPredict.historyDir;
}

async function findMdFileForMatch(matchId: string): Promise<string | null> {
  const dir = historyDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const prefix = `match_${matchId}_`;
  const candidates = entries.filter((f) => f.startsWith(prefix) && f.endsWith('.md'));
  if (candidates.length === 0) return null;
  candidates.sort();
  return path.join(dir, candidates[candidates.length - 1]!);
}

async function readForwardLinks(matchId: string): Promise<SimilarMatchLinkRow[]> {
  const filePath = await findMdFileForMatch(matchId);
  if (!filePath) return [];
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return parseSimilarMatchLinksSection(content, matchId);
  } catch {
    return [];
  }
}

async function buildReverseIndex(): Promise<Map<string, SimilarMatchLinkRow[]>> {
  const now = Date.now();
  if (reverseScanCache && now - reverseScanCache.at < CACHE_TTL_MS) {
    return reverseScanCache.byMatchId;
  }

  const dir = historyDir();
  const byMatchId = new Map<string, SimilarMatchLinkRow[]>();
  let entries: string[];
  try {
    entries = (await fs.readdir(dir)).filter((f) => f.startsWith('match_') && f.endsWith('.md'));
  } catch {
    reverseScanCache = { at: now, byMatchId };
    return byMatchId;
  }

  for (const file of entries) {
    const idMatch = file.match(/^match_(\d+)_/);
    if (!idMatch) continue;
    const ownerMatchId = idMatch[1]!;
    let content: string;
    try {
      content = await fs.readFile(path.join(dir, file), 'utf8');
    } catch {
      continue;
    }
    const meta = parseMatchFile(content).meta;
    const ownerTeam =
      meta.homeName && meta.awayName
        ? `${meta.homeName} vs ${meta.awayName}`
        : `Match ${ownerMatchId}`;
    const rows = parseSimilarMatchLinksSection(content, ownerMatchId);
    for (const row of rows) {
      const inbound = flipLinkForInbound(row, ownerMatchId, ownerTeam, row.relatedMatchId);
      if (!inbound) continue;
      const q = row.relatedMatchId;
      const list = byMatchId.get(q) ?? [];
      if (!list.some((r) => r.id === inbound.id)) {
        list.push(inbound);
        byMatchId.set(q, list);
      }
    }
  }

  reverseScanCache = { at: now, byMatchId };
  return byMatchId;
}

function dedupeLinks(rows: SimilarMatchLinkRow[]): SimilarMatchLinkRow[] {
  const seen = new Set<string>();
  const out: SimilarMatchLinkRow[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out.sort((a, b) => a.ts - b.ts);
}

/** Forward (file của matchId) + inbound (từ file trận khác). */
export async function loadSimilarMatchLinksFromHistory(
  matchId: string,
): Promise<SimilarMatchLinkRow[]> {
  const id = String(matchId);
  const forward = await readForwardLinks(id);
  const reverseIndex = await buildReverseIndex();
  const inbound = reverseIndex.get(id) ?? [];
  return dedupeLinks([...forward, ...inbound]);
}

/** Xóa cache reverse scan (test). */
export function clearSimilarLinksScanCache(): void {
  reverseScanCache = null;
}
