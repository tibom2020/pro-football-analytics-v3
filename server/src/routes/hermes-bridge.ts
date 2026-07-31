/**
 * Hermes Agent Bridge — kết nối PFA với Hermes Agent (Tí Nị).
 *
 * Endpoints:
 *   GET  /api/hermes/match/:id    → Full snapshot (Hermes poll)
 *   POST /api/hermes/subscribe    → Frontend đăng ký theo dõi trận
 *   GET  /api/hermes/events/:id   → Event log (Hermes đọc)
 *   POST /api/hermes/notify       → Hermes gửi kết quả phân tích về
 *   GET  /api/hermes/subscriptions→ Danh sách trận đang theo dõi
 *   POST /api/hermes/unsubscribe  → Frontend ngừng theo dõi
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../logger.js';

// ─── Types ───────────────────────────────────────────────────────────

interface HermesSubscription {
  matchId: string;
  home?: string;
  away?: string;
  league?: string;
  subscribedAt: number;
  events: HermesEvent[];
  b365Token?: string; // Token từ frontend (localStorage)
}

interface HermesEvent {
  type: 'line_change' | 'goal' | 'half_time' | 'full_time' | 'on_target' | 'red_card' | 'corner' | 'status_change';
  minute: number;
  half: 1 | 2 | 0;
  data: Record<string, unknown>;
  ts: number;
  id: string;
}

interface SnapshotCache {
  score: string;
  minute: number;
  half: 1 | 2 | 0;
  onTarget: [number, number];
  redCards: [number, number];
  corners: [number, number];
  ouHandicap: number | null;
  ahHandicap: number | null;
  timestamp: number;
}

// ─── State ───────────────────────────────────────────────────────────

const subscriptions = new Map<string, HermesSubscription>();
const snapshotHistory = new Map<string, SnapshotCache>();

// ─── Constants ───────────────────────────────────────────────────────

const B365_EVENT_URL = 'https://api.b365api.com/v3/events/inplay';
const B365_ODDS_URL = 'https://api.b365api.com/v2/event/odds';
const HERMES_EVENT_TTL_MS = 30 * 60 * 1000; // Giữ event 30 phút

// ─── Helpers ─────────────────────────────────────────────────────────

function uid(): string {
  return randomUUID();
}

/** Xác định hiệp đấu từ timer + scores. */
function detectHalf(timer: { tm: number; tt: string } | undefined, scores: Record<string, { home: string; away: string }> | undefined): 1 | 2 | 0 {
  if (!timer) return 0;
  const tm = timer.tm ?? 0;
  const tt = timer.tt;
  // Nếu có scores H2 và thời gian >= 45 → H2
  if (scores?.['2'] !== undefined && tm >= 40) return 2;
  if (tt === '0' && tm === 45) return 0; // HT
  if (tm > 0) return 1;
  return 0;
}

/** Parse scores từ ss string "1-0" → [home, away] */
function parseScore(ss: string | undefined): [number, number] {
  if (!ss) return [0, 0];
  const parts = ss.split('-').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0];
}

/** Extract numeric pair từ stats array */
function statPair(stats: Record<string, string[]> | undefined, key: string): [number, number] {
  const arr = stats?.[key];
  if (arr?.length === 2) return [parseInt(arr[0] || '0'), parseInt(arr[1] || '0')];
  return [0, 0];
}

/**
 * Gọi B365 API qua proxy endpoint (dùng token từ subscription).
 * Token được frontend gửi khi subscribe.
 */
async function fetchB365viaProxy<T = unknown>(matchId: string, baseUrl: string): Promise<T | null> {
  const sub = subscriptions.get(matchId);
  const token = sub?.b365Token || config.b365.apiToken;
  if (!token) {
    logger.warn('[hermes] Thiếu B365 token — subscribe kèm b365Token');
    return null;
  }
  const sep = baseUrl.includes('?') ? '&' : '?';
  const b365Url = `${baseUrl}${sep}token=${encodeURIComponent(token)}`;
  // Dùng proxy của server để tránh CORS
  const proxyUrl = `http://localhost:${config.port}/api/b365-proxy?target=${encodeURIComponent(b365Url)}`;
  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text?.trim()) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    logger.warn(`[hermes] B365 proxy fetch error: ${(err as Error).message}`);
    return null;
  }
}

/** Lấy odds cho 1 market từ response odds. */
function findLatestOdds(oddsData: unknown, marketKey: string): { handicap: number; over?: number; under?: number; home?: number; away?: number } | null {
  const odds = (oddsData as any)?.results?.odds;
  if (!odds?.[marketKey]?.length) return null;
  const items = odds[marketKey] as Array<Record<string, string>>;
  // Lấy item cuối (gần nhất)
  const last = items[items.length - 1];
  const handicap = parseFloat(last.handicap ?? '0');
  return {
    handicap,
    over: last.over_od ? parseFloat(last.over_od) : undefined,
    under: last.under_od ? parseFloat(last.under_od) : undefined,
    home: last.home_od ? parseFloat(last.home_od) : undefined,
    away: last.away_od ? parseFloat(last.away_od) : undefined,
  };
}

// ─── Event detection ─────────────────────────────────────────────────

function detectEvents(matchId: string, current: {
  score: string;
  minute: number;
  half: 1 | 2 | 0;
  onTarget: [number, number];
  redCards: [number, number];
  corners: [number, number];
  ouHandicap: number | null;
  ahHandicap: number | null;
}): HermesEvent[] {
  const events: HermesEvent[] = [];
  const prev = snapshotHistory.get(matchId);
  if (!prev) return events;

  const ts = Date.now();

  // 1. Goal
  if (current.score !== prev.score) {
    events.push({
      type: 'goal',
      minute: current.minute,
      half: current.half,
      data: { prevScore: prev.score, newScore: current.score },
      ts, id: uid(),
    });
  }

  // 2. Half-time (chuyển từ đá → nghỉ)
  if (prev.half === 1 && current.half === 0) {
    events.push({
      type: 'half_time',
      minute: current.minute,
      half: 1,
      data: { score: current.score },
      ts, id: uid(),
    });
  }

  // 3. On-target mới
  if (current.onTarget[0] > prev.onTarget[0] || current.onTarget[1] > prev.onTarget[1]) {
    events.push({
      type: 'on_target',
      minute: current.minute,
      half: current.half,
      data: { home: current.onTarget[0], away: current.onTarget[1] },
      ts, id: uid(),
    });
  }

  // 4. Red card
  if (current.redCards[0] > prev.redCards[0] || current.redCards[1] > prev.redCards[1]) {
    events.push({
      type: 'red_card',
      minute: current.minute,
      half: current.half,
      data: { home: current.redCards[0], away: current.redCards[1] },
      ts, id: uid(),
    });
  }

  // 5. Corner
  if (current.corners[0] > prev.corners[0] || current.corners[1] > prev.corners[1]) {
    events.push({
      type: 'corner',
      minute: current.minute,
      half: current.half,
      data: { home: current.corners[0], away: current.corners[1] },
      ts, id: uid(),
    });
  }

  // 6. Line change (O/U)
  if (current.ouHandicap !== null && prev.ouHandicap !== null && current.ouHandicap !== prev.ouHandicap) {
    events.push({
      type: 'line_change',
      minute: current.minute,
      half: current.half,
      data: { market: '1_3', prev: prev.ouHandicap, current: current.ouHandicap },
      ts, id: uid(),
    });
  }

  // 7. FT (trận kết thúc)
  if (prev.half === 2 && current.half === 0 && current.minute === 0) {
    events.push({
      type: 'full_time',
      minute: prev.minute,
      half: 2,
      data: { score: current.score },
      ts, id: uid(),
    });
  }

  return events;
}

// ─── Router ──────────────────────────────────────────────────────────

export function createHermesBridgeRouter(): Router {
  const router = Router();

  /**
   * GET /api/hermes/match/:id
   * Full snapshot — Hermes poll mỗi 45s
   */
  router.get('/match/:id', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.params.id);
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }

    // Fetch match data + odds từ B365 (qua proxy, dùng token từ subscription)
    const b365EventUrl = `${B365_EVENT_URL}?sport_id=1`;
    const b365OddsUrl = `${B365_ODDS_URL}?event_id=${matchId}`;
    const [matchData, oddsData] = await Promise.all([
      fetchB365viaProxy<{ success: number; results: Array<Record<string, any>> }>(matchId, b365EventUrl),
      fetchB365viaProxy<{ success: number; results: { odds: Record<string, any> } }>(matchId, b365OddsUrl),
    ]);

    // Tìm match trong results
    const match = (matchData?.results ?? []).find((m: any) => String(m.id) === matchId);

    if (!match) {
      // Có thể trận đã kết thúc — trả về thông tin tối thiểu
      res.json({
        matchId,
        status: 'unknown',
        error: 'Match not found in in-play list (có thể đã kết thúc)',
        fetchedAt: Date.now(),
      });
      return;
    }

    const timer = match.timer ?? {};
    const stats = match.stats ?? {};
    const scores = match.scores ?? {};
    const ss = match.ss ?? '0-0';
    const half = detectHalf(timer, scores);
    const onTarget = statPair(stats, 'on_target');
    const ahOdds = findLatestOdds(oddsData, '1_2');
    const ouOdds = findLatestOdds(oddsData, '1_3');

    // Build snapshot
    const snapshot = {
      matchId,
      status: 'in_play',
      home: match.home?.name ?? '',
      away: match.away?.name ?? '',
      league: match.league?.name ?? '',
      score: ss,
      minute: timer.tm ?? 0,
      half,
      timer: {
        tm: timer.tm ?? 0,
        ts: timer.ts ?? 0,
        tt: timer.tt ?? '',
        ta: timer.ta ?? 0,
        md: timer.md ?? 0,
      },
      stats: {
        attacks: statPair(stats, 'attacks'),
        dangerous_attacks: statPair(stats, 'dangerous_attacks'),
        on_target: onTarget,
        off_target: statPair(stats, 'off_target'),
        corners: statPair(stats, 'corners'),
        xg: stats.xg ? [parseFloat(stats.xg[0] || '0'), parseFloat(stats.xg[1] || '0')] : undefined,
        possession_rt: stats.possession_rt ? [parseFloat(stats.possession_rt[0] || '0'), parseFloat(stats.possession_rt[1] || '0')] : undefined,
        yellowcards: statPair(stats, 'yellowcards'),
        redcards: statPair(stats, 'redcards'),
      },
      odds: {
        over_under: ouOdds,
        asian_handicap: ahOdds,
      },
      goals: scores,
      fetchedAt: Date.now(),
    };

    // Event detection (nếu có subscription)
    const sub = subscriptions.get(matchId);
    if (sub) {
      const current = {
        score: ss,
        minute: timer.tm ?? 0,
        half,
        onTarget,
        redCards: statPair(stats, 'redcards'),
        corners: statPair(stats, 'corners'),
        ouHandicap: ouOdds?.handicap ?? null,
        ahHandicap: ahOdds?.handicap ?? null,
      };
      const events = detectEvents(matchId, current);
      for (const evt of events) {
        sub.events.push(evt);
        logger.info(`[hermes] Event: ${evt.type} | match=${matchId} | data=${JSON.stringify(evt.data)}`);
      }
      // Giữ event log không quá lớn
      if (sub.events.length > 200) {
        sub.events = sub.events.slice(-200);
      }
      // Cập nhật snapshot
      snapshotHistory.set(matchId, {
        ...current,
        timestamp: Date.now(),
      });
    }

    res.json(snapshot);
  });

  /**
   * POST /api/hermes/subscribe
   * Frontend gọi khi user bấm "Kết nối Hermes"
   */
  router.post('/subscribe', (req: Request, res: Response): void => {
    const { matchId, home, away, league, b365Token } = req.body as {
      matchId?: string;
      home?: string;
      away?: string;
      league?: string;
      b365Token?: string;
    };

    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }

    if (subscriptions.has(matchId)) {
      // Cập nhật token nếu có
      if (b365Token) {
        const existing = subscriptions.get(matchId)!;
        existing.b365Token = b365Token;
      }
      res.json({ ok: true, matchId, status: 'already_subscribed' });
      return;
    }

    subscriptions.set(matchId, {
      matchId,
      home,
      away,
      league,
      b365Token,
      subscribedAt: Date.now(),
      events: [],
    });

    // Khởi tạo snapshot cache trống để lần poll đầu detect đúng
    snapshotHistory.set(matchId, {
      score: '',
      minute: 0,
      half: 0,
      onTarget: [0, 0],
      redCards: [0, 0],
      corners: [0, 0],
      ouHandicap: null,
      ahHandicap: null,
      timestamp: Date.now(),
    });

    logger.info(`[hermes] Subscribed: match=${matchId} ${home ?? ''} vs ${away ?? ''}`);
    res.json({ ok: true, matchId, status: 'subscribed' });
  });

  /**
   * POST /api/hermes/unsubscribe
   * Frontend gọi khi user ngừng theo dõi
   */
  router.post('/unsubscribe', (req: Request, res: Response): void => {
    const { matchId } = req.body as { matchId?: string };
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    subscriptions.delete(matchId);
    snapshotHistory.delete(matchId);
    logger.info(`[hermes] Unsubscribed: match=${matchId}`);
    res.json({ ok: true, matchId });
  });

  /**
   * GET /api/hermes/events/:id
   * Hermes poll lấy event log
   */
  router.get('/events/:id', (req: Request, res: Response): void => {
    const matchId = String(req.params.id);
    const sub = subscriptions.get(matchId);
    if (!sub) {
      res.json({ events: [], subscribed: false });
      return;
    }
    // Chỉ trả event từ lần poll trước
    const events = sub.events;
    res.json({ events, subscribed: true, matchId });
  });

  /**
   * POST /api/hermes/notify
   * Hermes gửi kết quả phân tích về PFA (log + forward Telegram)
   */
  router.post('/notify', (req: Request, res: Response): void => {
    const { matchId, analysis, event, agent } = req.body as {
      matchId?: string;
      analysis?: string;
      event?: string;
      agent?: string;
    };

    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }

    logger.info(`[hermes] Analysis from ${agent ?? 'Tí Nị'} for match=${matchId}: ${event ?? 'manual'}`);
    logger.info(`[hermes] Analysis text: ${analysis?.slice(0, 200) ?? '(empty)'}`);

    // TODO: Forward lên Telegram nếu cấu hình
    // Có thể gọi TelegramSender.sendMessage() ở đây

    res.json({ ok: true, matchId, receivedAt: Date.now() });
  });

  /**
   * GET /api/hermes/subscriptions
   * Danh sách trận đang theo dõi
   */
  router.get('/subscriptions', (_req: Request, res: Response): void => {
    const list = Array.from(subscriptions.values()).map((s) => ({
      matchId: s.matchId,
      home: s.home,
      away: s.away,
      league: s.league,
      subscribedAt: s.subscribedAt,
      eventCount: s.events.length,
    }));
    res.json({ subscriptions: list, count: list.length });
  });

  return router;
}