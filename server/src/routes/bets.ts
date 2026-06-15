/**
 * Routes cho bet ticket mirror.
 *
 *   POST /api/bets/sync         → replace toàn bộ ticket list cho userId.
 *   GET  /api/bets/sync/:userId → lấy ticket list đã sync.
 *   GET  /api/bets/sync         → lấy toàn bộ ticket của mọi user (cho sidecar).
 *
 * Frontend giữ source of truth ở localStorage, server chỉ mirror để các sidecar
 * (ví dụ OpenHuman bridge) có thể đọc qua HTTP / file `server/data/bet_tickets.json`.
 */
import { Router, Request, Response } from 'express';
import {
  getAllBetTickets,
  getBetTickets,
  replaceBetTickets,
  type PersistedBetTicket,
} from '../data/bet-tickets-persistence.js';
import { logger } from '../index.js';

const VALID_STATUSES = new Set([
  'pending',
  'won',
  'lost',
  'push',
  'won_half',
  'lost_half',
]);

function sanitize(raw: unknown): PersistedBetTicket | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.matchId !== 'string') return null;
  if (typeof r.matchName !== 'string' || typeof r.betType !== 'string') return null;
  if (typeof r.handicap !== 'string') return null;
  if (typeof r.odds !== 'number' || typeof r.stake !== 'number') return null;
  if (typeof r.minute !== 'number' || typeof r.createdAt !== 'number') return null;
  if (typeof r.status !== 'string' || !VALID_STATUSES.has(r.status)) return null;
  return {
    id: r.id,
    matchId: r.matchId,
    matchName: r.matchName,
    betType: r.betType,
    handicap: r.handicap,
    odds: r.odds,
    stake: r.stake,
    minute: r.minute,
    scoreAtBet: typeof r.scoreAtBet === 'string' ? r.scoreAtBet : undefined,
    status: r.status as PersistedBetTicket['status'],
    createdAt: r.createdAt,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    betId: typeof r.betId === 'string' ? r.betId : undefined,
    sheetSynced: typeof r.sheetSynced === 'boolean' ? r.sheetSynced : undefined,
    leagueName: typeof r.leagueName === 'string' ? r.leagueName : undefined,
    noteSnapshot: typeof r.noteSnapshot === 'string' ? r.noteSnapshot : undefined,
  };
}

export function createBetsRouter(): Router {
  const router = Router();

  router.post('/sync', (req: Request, res: Response): void => {
    try {
      const { userId, tickets } = req.body as {
        userId?: string;
        tickets?: unknown[];
      };
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }
      if (!Array.isArray(tickets)) {
        res.status(400).json({ error: 'tickets must be an array' });
        return;
      }
      const cleaned: PersistedBetTicket[] = [];
      let dropped = 0;
      for (const t of tickets) {
        const s = sanitize(t);
        if (s) cleaned.push(s);
        else dropped++;
      }
      const count = replaceBetTickets(userId, cleaned);
      if (dropped > 0) {
        logger.warn(`[bets] Sync from ${userId}: ${dropped} invalid ticket(s) dropped`);
      }
      res.json({ success: true, count, dropped });
    } catch (err) {
      logger.error('Bet sync error:', err);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  router.get('/sync/:userId', (req: Request, res: Response): void => {
    res.json({ success: true, tickets: getBetTickets(String(req.params.userId)) });
  });

  router.get('/sync', (_req: Request, res: Response): void => {
    res.json({ success: true, byUser: getAllBetTickets() });
  });

  return router;
}
