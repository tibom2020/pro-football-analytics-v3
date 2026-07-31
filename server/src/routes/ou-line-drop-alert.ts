import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { TelegramSender, type NhatKyAlertPayload } from '../notification-service/telegram-sender.js';
import { tryReserveDedupeKey } from '../services/telegram-alert-dedupe.js';

export interface OuLineDropAlertBody {
  userId?: string;
  matchId?: string;
  matchName?: string;
  leagueName?: string;
  score?: string;
  minute?: number;
  market?: '1_3' | '1_6';
  prevLine?: number;
  currLine?: number;
  overOdds?: number;
  underOdds?: number;
  statsLines?: string[];
  perTeamApiLines?: string[];
  oddsTwoTeamLines?: string[];
  eventTimeMs?: number;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * POST /api/alerts/ou-line-drop
 * Client (tab trận đang mở) báo khi line 1_3/1_6 hạ và Tài ≤ ngưỡng → Telegram chi tiết.
 */
export function createOuLineDropAlertRouter(telegram: TelegramSender): Router {
  const router = Router();
  const priceMax = config.alerts.ouLineDropPriceMax;

  router.post('/ou-line-drop', (req: Request, res: Response): void => {
    try {
      const body = req.body as OuLineDropAlertBody;
      const {
        userId,
        matchId,
        matchName,
        leagueName,
        score,
        minute,
        market,
        prevLine,
        currLine,
        overOdds,
        underOdds,
      } = body;

      if (!userId || !matchId || !matchName) {
        res.status(400).json({ error: 'Missing userId, matchId, or matchName' });
        return;
      }
      if (market !== '1_3' && market !== '1_6') {
        res.status(400).json({ error: 'market must be 1_3 or 1_6' });
        return;
      }
      if (!isFiniteNum(prevLine) || !isFiniteNum(currLine) || !isFiniteNum(overOdds)) {
        res.status(400).json({ error: 'prevLine, currLine, overOdds must be finite numbers' });
        return;
      }

      // Server-side validate rule (không tin client mù quáng).
      if (!(currLine < prevLine)) {
        res.status(400).json({ error: 'Not a line drop (currLine must be < prevLine)' });
        return;
      }
      if (!(overOdds <= priceMax)) {
        res.status(400).json({ error: `overOdds must be <= ${priceMax}` });
        return;
      }

      if (!telegram.isUserBound(userId)) {
        res.json({ success: true, telegram: false, reason: 'not_bound' });
        return;
      }

      const lineKey = `${prevLine.toFixed(2)}>${currLine.toFixed(2)}`;
      const dedupeKey = `ould:${userId}:${matchId}:${market}:${lineKey}`;
      if (!tryReserveDedupeKey(dedupeKey)) {
        res.json({ success: true, skipped: true, reason: 'duplicate' });
        return;
      }

      const marketLabel = market === '1_3' ? 'Tài/Xỉu cả trận (1_3)' : 'Tài/Xỉu H1 (1_6)';
      const underStr = isFiniteNum(underOdds) ? underOdds.toFixed(3) : '—';
      const alertTitle = `Hạ line ${market} + Tài ≤ ${priceMax}`;
      const alertMessage = [
        `${marketLabel}`,
        `Line: ${prevLine.toFixed(2)} → ${currLine.toFixed(2)} ⬇`,
        `Tài @${overOdds.toFixed(3)} (≤ ${priceMax}) | Xỉu @${underStr}`,
      ].join('\n');

      const oddsLines = [
        `${marketLabel}: H${currLine.toFixed(2)} — Tài @${overOdds.toFixed(3)} | Xỉu @${underStr}`,
      ];

      const payload: NhatKyAlertPayload = {
        eventTimeMs: typeof body.eventTimeMs === 'number' ? body.eventTimeMs : Date.now(),
        leagueLine: leagueName || '—',
        matchLine: matchName,
        score: score || '—',
        minute: typeof minute === 'number' && Number.isFinite(minute) ? minute : 0,
        oddsLines,
        statsLines: Array.isArray(body.statsLines) ? body.statsLines : [],
        perTeamApiLines: Array.isArray(body.perTeamApiLines) ? body.perTeamApiLines : undefined,
        oddsTwoTeamLines: Array.isArray(body.oddsTwoTeamLines) ? body.oddsTwoTeamLines : undefined,
        alertTitle,
        alertMessage,
        alertType: 'ou_line_drop',
        headerLabel: 'HẠ LINE OU + GIÁ THẤP',
      };

      void telegram.sendNhatKyAlertToUser(userId, payload).catch((err) => {
        logger.error('[ou-line-drop] sendNhatKyAlertToUser failed:', err);
      });

      res.json({ success: true, telegram: true });
    } catch (e) {
      logger.error('POST /api/alerts/ou-line-drop:', e);
      res.status(500).json({ error: 'notify failed' });
    }
  });

  return router;
}
