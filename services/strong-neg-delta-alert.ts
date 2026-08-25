/**
 * Cảnh báo Telegram khi xuất hiện sự kiện hạ line OU mới có Δ ≤ −0.375
 * (phát hiện từ poll trang chủ → POST server).
 * Quét cả Tài đáy (low) và Tài đỉnh (high) — 6 luồng như Dashboard.
 */
import { AI_SERVER_URL } from './ai-service';
import { getAppUserId } from './user-id';
import type { MatchHalf } from './matchTimeline';
import type { MatchInfo, OverUnderMinuteSnapshot } from '../types';
import {
  detectOuOverLineDropDeltas,
  formatOuOverLineDropDeltaLabel,
  isStrongNegDeltaTelegram,
  type OuOverLineDropDelta,
} from './ou-line-over-delta';

export type StrongNegDeltaMarket = '1_3' | '1_6';
export type OverPickSeries = 'low' | 'high';

export interface StrongNegDeltaEvent {
  matchId: string;
  market: StrongNegDeltaMarket;
  half: MatchHalf;
  series: OverPickSeries;
  delta: number;
  minute: number;
  prevLine: number;
  newLine: number;
  prevOver: number;
  newOver: number;
  eventKey: string;
}

export interface StrongNegDeltaNotifyPayload {
  matchId: string;
  matchName: string;
  leagueName: string;
  score: string;
  minute: number;
  market: StrongNegDeltaMarket;
  half: MatchHalf;
  series?: OverPickSeries;
  delta: number;
  prevLine: number;
  newLine: number;
  prevOver: number;
  newOver: number;
  eventKey: string;
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  h1OpenOu16?: number;
}

function toDropPoints(snaps: OverUnderMinuteSnapshot[]) {
  return snaps
    .filter((s) => Number.isFinite(s.minute) && Number.isFinite(s.handicap) && Number.isFinite(s.over))
    .map((s) => ({ minute: s.minute, handicap: s.handicap, over: s.over }));
}

export function buildStrongNegDeltaEventKey(
  matchId: string,
  market: StrongNegDeltaMarket,
  half: MatchHalf,
  series: OverPickSeries,
  drop: Pick<OuOverLineDropDelta, 'minute' | 'prevHandicap' | 'newHandicap'>,
): string {
  return `snd:${matchId}:${market}:H${half}:${series}:${Math.round(drop.minute)}:${drop.prevHandicap.toFixed(2)}>${drop.newHandicap.toFixed(2)}`;
}

function dropsForHalf(
  snaps: OverUnderMinuteSnapshot[],
  half: MatchHalf,
): OuOverLineDropDelta[] {
  return detectOuOverLineDropDeltas(toDropPoints(snaps.filter((s) => s.half === half)));
}

function collectFromSnaps(
  matchId: string,
  market: StrongNegDeltaMarket,
  series: OverPickSeries,
  snaps: OverUnderMinuteSnapshot[],
  halves: readonly MatchHalf[],
): StrongNegDeltaEvent[] {
  const out: StrongNegDeltaEvent[] = [];
  for (const half of halves) {
    for (const drop of dropsForHalf(snaps, half)) {
      if (!isStrongNegDeltaTelegram(drop.delta)) continue;
      out.push({
        matchId,
        market,
        half,
        series,
        delta: drop.delta,
        minute: drop.minute,
        prevLine: drop.prevHandicap,
        newLine: drop.newHandicap,
        prevOver: drop.prevOver,
        newOver: drop.newOver,
        eventKey: buildStrongNegDeltaEventKey(matchId, market, half, series, drop),
      });
    }
  }
  return out;
}

/** Thu thập sự kiện Δ ≤ ngưỡng Telegram — 6 luồng: 1_3 H1/H2 × low/high + 1_6 H1 × low/high. */
export function collectStrongNegDeltaEvents(
  matchId: string,
  snaps13Low: OverUnderMinuteSnapshot[],
  snaps13High: OverUnderMinuteSnapshot[],
  snaps16Low: OverUnderMinuteSnapshot[],
  snaps16High: OverUnderMinuteSnapshot[],
): StrongNegDeltaEvent[] {
  return [
    ...collectFromSnaps(matchId, '1_3', 'low', snaps13Low, [1, 2]),
    ...collectFromSnaps(matchId, '1_3', 'high', snaps13High, [1, 2]),
    ...collectFromSnaps(matchId, '1_6', 'low', snaps16Low, [1]),
    ...collectFromSnaps(matchId, '1_6', 'high', snaps16High, [1]),
  ];
}

export function matchLabelFromInfo(match: MatchInfo): string {
  return `${match.home.name} vs ${match.away.name}`;
}

export function eventToNotifyPayload(
  event: StrongNegDeltaEvent,
  match: MatchInfo,
  openLines?: {
    h1OpenOu13?: number;
    h2OpenOu13?: number;
    h1OpenOu16?: number;
  },
): StrongNegDeltaNotifyPayload {
  const minute =
    match.timer?.tm ??
    (parseInt(String(match.time ?? '0').replace(/\D/g, ''), 10) || 0);
  return {
    matchId: event.matchId,
    matchName: matchLabelFromInfo(match),
    leagueName: match.league?.name ?? '—',
    score: match.ss ?? '—',
    minute: Number.isFinite(minute) ? minute : 0,
    market: event.market,
    half: event.half,
    series: event.series,
    delta: event.delta,
    prevLine: event.prevLine,
    newLine: event.newLine,
    prevOver: event.prevOver,
    newOver: event.newOver,
    eventKey: event.eventKey,
    h1OpenOu13: openLines?.h1OpenOu13,
    h2OpenOu13: openLines?.h2OpenOu13,
    h1OpenOu16: openLines?.h1OpenOu16,
  };
}

export function findNewStrongNegDeltaEvents(
  matchId: string,
  events: StrongNegDeltaEvent[],
  knownKeysByMatch: Map<string, Set<string>>,
  isBaseline: boolean,
): StrongNegDeltaEvent[] {
  let known = knownKeysByMatch.get(matchId);
  if (!known) {
    known = new Set<string>();
    knownKeysByMatch.set(matchId, known);
  }

  if (isBaseline) {
    for (const ev of events) known.add(ev.eventKey);
    return [];
  }

  return events.filter((ev) => !known.has(ev.eventKey));
}

export function markStrongNegDeltaEventKnown(
  knownKeysByMatch: Map<string, Set<string>>,
  matchId: string,
  eventKey: string,
): void {
  let known = knownKeysByMatch.get(matchId);
  if (!known) {
    known = new Set<string>();
    knownKeysByMatch.set(matchId, known);
  }
  known.add(eventKey);
}

export function diffNewStrongNegDeltaEvents(
  matchId: string,
  events: StrongNegDeltaEvent[],
  knownKeysByMatch: Map<string, Set<string>>,
  isBaseline: boolean,
): StrongNegDeltaEvent[] {
  const fresh = findNewStrongNegDeltaEvents(matchId, events, knownKeysByMatch, isBaseline);
  for (const ev of fresh) markStrongNegDeltaEventKnown(knownKeysByMatch, matchId, ev.eventKey);
  return fresh;
}

export function formatStrongNegDeltaAlertMessage(event: StrongNegDeltaEvent): string {
  const marketLabel = event.market === '1_3' ? '1_3' : '1_6';
  const seriesLabel = event.series === 'high' ? 'Tài đỉnh' : 'Tài đáy';
  return [
    `${marketLabel} H${event.half} · ${seriesLabel} · ${formatOuOverLineDropDeltaLabel(event.delta)}`,
    `Line: ${event.prevLine.toFixed(2)} → ${event.newLine.toFixed(2)}`,
    `Tài: ${event.prevOver.toFixed(3)} → ${event.newOver.toFixed(3)}`,
    `Phút drop: ${event.minute}'`,
  ].join('\n');
}

export async function postStrongNegDeltaAlert(payload: StrongNegDeltaNotifyPayload): Promise<boolean> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/alerts/strong-neg-delta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: getAppUserId(),
        ...payload,
        eventTimeMs: Date.now(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[strong-neg-delta] server rejected:', res.status, text);
      return false;
    }
    const data = (await res.json()) as {
      telegram?: boolean;
      skipped?: boolean;
      success?: boolean;
    };
    if (data.success !== true) return false;
    if (data.skipped === true) return true;
    if (data.telegram === true) return true;
    return false;
  } catch (e) {
    console.warn('[strong-neg-delta] network — kiểm tra AI server / VITE_AI_SERVER_URL:', e);
    return false;
  }
}

export async function processStrongNegDeltaAlertsForMatch(input: {
  match: MatchInfo;
  snaps13Low: OverUnderMinuteSnapshot[];
  snaps13High: OverUnderMinuteSnapshot[];
  snaps16Low: OverUnderMinuteSnapshot[];
  snaps16High: OverUnderMinuteSnapshot[];
  openLines: {
    h1OpenOu13?: number;
    h2OpenOu13?: number;
    h1OpenOu16?: number;
  };
  knownKeysByMatch: Map<string, Set<string>>;
  isBaseline: boolean;
  dismissed?: boolean;
}): Promise<void> {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (input.dismissed === true) return;

  const events = collectStrongNegDeltaEvents(
    input.match.id,
    input.snaps13Low,
    input.snaps13High,
    input.snaps16Low,
    input.snaps16High,
  );
  const fresh = findNewStrongNegDeltaEvents(
    input.match.id,
    events,
    input.knownKeysByMatch,
    input.isBaseline,
  );

  for (const ev of fresh) {
    const payload = eventToNotifyPayload(ev, input.match, input.openLines);
    const sent = await postStrongNegDeltaAlert(payload);
    if (sent) {
      markStrongNegDeltaEventKnown(input.knownKeysByMatch, input.match.id, ev.eventKey);
    }
  }
}
