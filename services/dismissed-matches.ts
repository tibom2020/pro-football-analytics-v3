import type { MatchInfo } from '../types';

export const DISMISSED_LIVE_MATCHES_KEY = 'dismissedLiveMatches';

export const DISMISSED_MATCHES_UPDATED_EVENT = 'proFootball:dismissedMatchesUpdated';

export interface DismissedMatchEntry {
  match: MatchInfo;
  dismissedAt: number;
}

export type DismissedMatchMap = Record<string, DismissedMatchEntry>;

function readRaw(): DismissedMatchMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DISMISSED_LIVE_MATCHES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as DismissedMatchMap;
  } catch {
    return {};
  }
}

function writeRaw(map: DismissedMatchMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_LIVE_MATCHES_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISMISSED_MATCHES_UPDATED_EVENT));
  }
}

export function loadDismissed(): DismissedMatchMap {
  return readRaw();
}

export function dismissMatch(match: MatchInfo): DismissedMatchMap {
  const map = readRaw();
  map[match.id] = { match, dismissedAt: Date.now() };
  writeRaw(map);
  return map;
}

export function restoreMatch(matchId: string): DismissedMatchMap {
  const map = readRaw();
  delete map[matchId];
  writeRaw(map);
  return map;
}

export function clearDismissed(): DismissedMatchMap {
  writeRaw({});
  return {};
}

export function getDismissedIds(map: DismissedMatchMap): Set<string> {
  return new Set(Object.keys(map));
}
