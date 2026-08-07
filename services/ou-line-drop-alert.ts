/**
 * Cảnh báo khi line Tài/Xỉu 1_3 hoặc 1_6 hạ và odds Tài ≤ ngưỡng (mặc định 1.725).
 * Detect trên tab trận đang mở → toast/beep in-app + POST server → Telegram.
 */
import { AI_SERVER_URL } from './ai-service';
import { getAppUserId } from './user-id';
import { decodeStatTimelineKey } from './matchTimeline';
import type { OverUnderMinuteSnapshot, ProcessedStats } from '../types';

/** Đồng bộ với server `config.alerts.ouLineDropPriceMax`. */
export const OU_LINE_DROP_PRICE_MAX = 1.725;

export type OuMarketId = '1_3' | '1_6';

export interface OuTipSnapshot {
  handicap: number;
  over: number;
  under: number;
  minute: number;
}

export interface OuLineDropHit {
  market: OuMarketId;
  prev: OuTipSnapshot;
  curr: OuTipSnapshot;
}

export interface OuLineDropNotifyPayload {
  matchId: string;
  matchName: string;
  leagueName: string;
  score: string;
  minute: number;
  market: OuMarketId;
  prevLine: number;
  currLine: number;
  overOdds: number;
  underOdds: number;
  statsLines?: string[];
  perTeamApiLines?: string[];
  oddsTwoTeamLines?: string[];
}

/** Lấy tip (snapshot mới nhất) từ chuỗi OU đã normalize. */
export function tipFromOuHistory(rows: OverUnderMinuteSnapshot[]): OuTipSnapshot | null {
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  if (
    !last ||
    !Number.isFinite(last.handicap) ||
    !Number.isFinite(last.over) ||
    !Number.isFinite(last.under)
  ) {
    return null;
  }
  return {
    handicap: last.handicap,
    over: last.over,
    under: last.under,
    minute: last.minute,
  };
}

/**
 * So sánh tip lần poll trước vs hiện tại.
 * Trigger khi line hạ (curr.handicap < prev.handicap) và Tài ≤ priceMax.
 */
export function detectOuLineDrop(
  prev: OuTipSnapshot | null | undefined,
  curr: OuTipSnapshot | null,
  market: OuMarketId,
  priceMax: number = OU_LINE_DROP_PRICE_MAX,
): OuLineDropHit | null {
  if (!prev || !curr) return null;
  if (!(curr.handicap < prev.handicap)) return null;
  if (!(curr.over <= priceMax)) return null;
  return { market, prev, curr };
}

/** Một dòng bảng Dashboard — phút có odds Tài ≤ ngưỡng. */
export interface OuLowOverRow {
  minute: number;
  half: 1 | 2;
  marketId: OuMarketId;
  handicap: number;
  over: number;
  /** Tổng on_target 2 đội từ đầu hiệp → phút dòng (null nếu thiếu stats). */
  onTarget: number | null;
  /** Tổng cú sút (on + off) 2 đội, cùng phạm vi. */
  totalShots: number | null;
}

function rowKey(r: Pick<OuLowOverRow, 'marketId' | 'half' | 'minute' | 'handicap' | 'over'>): string {
  return `${r.marketId}|${r.half}|${r.minute}|${r.handicap}|${r.over}`;
}

interface StatTimelineEntry {
  half: 1 | 2;
  minute: number;
  stats: ProcessedStats;
}

function buildStatTimeline(
  statsHistory: Record<number, ProcessedStats> | null | undefined,
): StatTimelineEntry[] {
  if (!statsHistory) return [];
  return Object.keys(statsHistory)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .map((k) => {
      const { half, minute } = decodeStatTimelineKey(k);
      return { half, minute, stats: statsHistory[k]! };
    })
    .filter((e) => e.stats != null)
    .sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
}

/**
 * Chọn snap stats cùng hiệp gần nhất với phút kèo.
 * Ưu tiên phút ≤ target (đúng nghĩa "tới thời điểm đó");
 * nếu tab mở muộn / chưa có mốc trước → lấy mốc sớm nhất sau target trong cùng hiệp.
 */
function findBestStatInHalf(
  timeline: StatTimelineEntry[],
  half: 1 | 2,
  minute: number,
): ProcessedStats | null {
  const same = timeline.filter((e) => e.half === half);
  if (same.length === 0) return null;

  let atOrBefore: StatTimelineEntry | null = null;
  for (const e of same) {
    if (e.minute <= minute) atOrBefore = e;
    else break;
  }
  if (atOrBefore) return atOrBefore.stats;

  // Fallback: mốc gần nhất sau phút (tab mở muộn hơn lúc Tài ≤ ngưỡng).
  return same[0]?.stats ?? null;
}

function sumPair(pair: [number, number] | undefined): number {
  if (!pair) return 0;
  return (Number(pair[0]) || 0) + (Number(pair[1]) || 0);
}

/**
 * OT + tổng sút từ đầu hiệp → phút.
 * H1: snap tích lũy. H2: snap − last H1 (nếu có); không có H1 → dùng snap tuyệt đối (như Dashboard).
 */
export function halfPeriodShotTotalsAt(
  statsHistory: Record<number, ProcessedStats> | null | undefined,
  half: 1 | 2,
  minute: number,
): { onTarget: number | null; totalShots: number | null } {
  const timeline = buildStatTimeline(statsHistory);
  if (timeline.length === 0) return { onTarget: null, totalShots: null };

  let at = findBestStatInHalf(timeline, half, minute);

  // Hàng 1_3/1_6 đôi khi lệch half so với khóa stats — thử hiệp còn lại cùng phút.
  if (!at) {
    const otherHalf: 1 | 2 = half === 1 ? 2 : 1;
    at = findBestStatInHalf(timeline, otherHalf, minute);
  }
  if (!at) return { onTarget: null, totalShots: null };

  let onTarget = sumPair(at.on_target);
  let offTarget = sumPair(at.off_target);

  if (half === 2) {
    const h1Snaps = timeline.filter((e) => e.half === 1);
    const lastH1 = h1Snaps[h1Snaps.length - 1];
    if (lastH1?.stats) {
      onTarget = Math.max(0, onTarget - sumPair(lastH1.stats.on_target));
      offTarget = Math.max(0, offTarget - sumPair(lastH1.stats.off_target));
    }
    // Không có H1: giữ số tuyệt đối tại mốc (cùng hành vi halfPeriodStats khi thiếu anchor).
  }

  return { onTarget, totalShots: onTarget + offTarget };
}

/**
 * Liệt kê snapshot 1_3 + 1_6 có odds Tài ≤ priceMax.
 * Sort half → minute → market; dedupe poll lặp cùng key.
 * Gắn OT / tổng sút từ statsHistory (đầu hiệp → phút dòng) khi có.
 */
export function listOuLowOverRows(
  odds13: readonly OverUnderMinuteSnapshot[],
  odds16: readonly OverUnderMinuteSnapshot[],
  statsHistory?: Record<number, ProcessedStats> | null,
  priceMax: number = OU_LINE_DROP_PRICE_MAX,
): OuLowOverRow[] {
  const out: OuLowOverRow[] = [];
  const seen = new Set<string>();

  const pushFrom = (rows: readonly OverUnderMinuteSnapshot[], fallbackMarket: OuMarketId) => {
    for (const s of rows) {
      if (!Number.isFinite(s.over) || !(s.over <= priceMax)) continue;
      if (!Number.isFinite(s.handicap) || !Number.isFinite(s.minute)) continue;
      const marketId: OuMarketId =
        s.marketId === '1_6' || s.marketId === '1_3' ? s.marketId : fallbackMarket;
      const half: 1 | 2 = s.half === 2 ? 2 : 1;
      const shots = halfPeriodShotTotalsAt(statsHistory, half, s.minute);
      const row: OuLowOverRow = {
        minute: s.minute,
        half,
        marketId,
        handicap: s.handicap,
        over: s.over,
        onTarget: shots.onTarget,
        totalShots: shots.totalShots,
      };
      const k = rowKey(row);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
  };

  pushFrom(odds13, '1_3');
  pushFrom(odds16, '1_6');

  out.sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half;
    if (a.minute !== b.minute) return a.minute - b.minute;
    return a.marketId.localeCompare(b.marketId);
  });
  return out;
}

let audioCtx: AudioContext | null = null;

function beepAlert(): void {
  try {
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const play = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    // 3 nốt xuống — khác beep bàn thắng
    play(988, 0, 0.14);
    play(784, 0.14, 0.14);
    play(587, 0.28, 0.22);
  } catch {
    /* ignore */
  }
}

export function notifyOuLineDropInApp(hit: OuLineDropHit, matchLabel: string): void {
  const marketLabel = hit.market === '1_3' ? '1_3 FT' : '1_6 H1';
  const title = `📉 Hạ line ${marketLabel} — Tài ≤ ${OU_LINE_DROP_PRICE_MAX}`;
  const body = `${matchLabel}: ${hit.prev.handicap.toFixed(2)} → ${hit.curr.handicap.toFixed(2)} · Tài @${hit.curr.over.toFixed(3)}`;

  beepAlert();

  try {
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          tag: `ould-${hit.market}-${hit.prev.handicap}-${hit.curr.handicap}`,
          renotify: true,
        } as NotificationOptions);
        setTimeout(() => {
          try {
            n.close();
          } catch {
            /* noop */
          }
        }, 10_000);
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  } catch {
    /* ignore */
  }
}

/** Gửi Telegram qua server (best-effort). */
export async function postOuLineDropAlert(payload: OuLineDropNotifyPayload): Promise<void> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/alerts/ou-line-drop`, {
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
      console.warn('[ou-line-drop] server rejected:', res.status, text);
    }
  } catch (e) {
    console.warn('[ou-line-drop] network — kiểm tra AI server / VITE_AI_SERVER_URL:', e);
  }
}
