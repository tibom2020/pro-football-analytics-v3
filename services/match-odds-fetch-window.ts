import type { MatchInfo } from '../types';
import {
  H1_STOPPAGE_CLOCK_END,
  isSecondHalfTimer,
  type MatchHalf,
} from './matchTimeline';

/** Khung phút trên trang chủ mới gọi API odds (tiết kiệm request). */
export const ODDS_FETCH_H1_MIN = 15;
export const ODDS_FETCH_H1_MAX = 30;
export const ODDS_FETCH_H2_MIN = 55;
export const ODDS_FETCH_H2_MAX = 70;

export function parseListMatchClock(match: MatchInfo): { half: MatchHalf; minute: number } {
  let minute = match.timer?.tm ?? 0;
  if (minute === 0 && match.time) {
    const parsed = parseInt(match.time.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) minute = parsed;
  }
  minute = Math.max(0, Math.round(minute));

  if (isSecondHalfTimer(match.timer)) {
    const h2Minute = minute < 45 ? minute + 45 : minute;
    return { half: 2, minute: h2Minute };
  }

  if (minute >= 45 && minute < H1_STOPPAGE_CLOCK_END) {
    return { half: 1, minute };
  }

  if (minute >= H1_STOPPAGE_CLOCK_END) {
    return { half: 2, minute };
  }

  return { half: 1, minute };
}

export function isMatchInOddsFetchWindow(match: MatchInfo): boolean {
  const tt = String(match.timer?.tt ?? '').trim();
  if (tt === '3' || tt === '4') return false;
  const n = parseInt(tt, 10);
  if (Number.isFinite(n) && n >= 3) return false;

  const { half, minute } = parseListMatchClock(match);
  if (half === 1) {
    return minute >= ODDS_FETCH_H1_MIN && minute <= ODDS_FETCH_H1_MAX;
  }
  return minute >= ODDS_FETCH_H2_MIN && minute <= ODDS_FETCH_H2_MAX;
}

export function oddsFetchWindowLabel(): string {
  return `H1 ${ODDS_FETCH_H1_MIN}–${ODDS_FETCH_H1_MAX}' · H2 ${ODDS_FETCH_H2_MIN}–${ODDS_FETCH_H2_MAX}'`;
}
