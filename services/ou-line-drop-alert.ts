/**
 * Cảnh báo khi line Tài/Xỉu 1_3 hoặc 1_6 hạ và odds Tài ≤ ngưỡng (mặc định 1.725).
 * Detect trên tab trận đang mở → toast/beep in-app + POST server → Telegram.
 */
import { AI_SERVER_URL } from './ai-service';
import { getAppUserId } from './user-id';
import type { OverUnderMinuteSnapshot } from '../types';

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
