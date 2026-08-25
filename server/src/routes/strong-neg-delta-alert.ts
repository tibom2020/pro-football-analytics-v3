import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { tryMarkStrongNegDeltaSent } from '../data/strong-neg-delta-persistence.js';
import { TelegramSender, type NhatKyAlertPayload } from '../notification-service/telegram-sender.js';

export interface StrongNegDeltaAlertBody {
  userId?: string;
  matchId?: string;
  matchName?: string;
  leagueName?: string;
  score?: string;
  minute?: number;
  market?: '1_3' | '1_6';
  half?: 1 | 2;
  delta?: number;
  prevLine?: number;
  newLine?: number;
  prevOver?: number;
  newOver?: number;
  eventKey?: string;
  /** Tài đáy | Tài đỉnh */
  series?: 'low' | 'high';
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  h1OpenOu16?: number;
  eventTimeMs?: number;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function formatDeltaLabel(delta: number): string {
  const r = Number(delta.toFixed(3));
  if (Object.is(r, -0) || r === 0) return 'Δ0.000';
  const abs = Math.abs(r).toFixed(3);
  return r > 0 ? `Δ+${abs}` : `Δ−${abs}`;
}

function openLineLabel(
  market: '1_3' | '1_6',
  half: 1 | 2,
  body: StrongNegDeltaAlertBody,
): string | undefined {
  if (market === '1_6' && half === 1 && isFiniteNum(body.h1OpenOu16)) {
    return `Vạch mở H1 (1_6): ${body.h1OpenOu16.toFixed(2)}`;
  }
  if (market === '1_3' && half === 1 && isFiniteNum(body.h1OpenOu13)) {
    return `Vạch mở H1 (1_3): ${body.h1OpenOu13.toFixed(2)}`;
  }
  if (market === '1_3' && half === 2 && isFiniteNum(body.h2OpenOu13)) {
    return `Vạch mở H2 (1_3): ${body.h2OpenOu13.toFixed(2)}`;
  }
  return undefined;
}

/**
 * POST /api/alerts/strong-neg-delta
 * Trang chủ báo sự kiện hạ line OU mới có Δ ≤ ngưỡng → Telegram.
 */
export function createStrongNegDeltaAlertRouter(telegram: TelegramSender): Router {
  const router = Router();
  const threshold = config.alerts.strongNegDeltaTelegram;

  router.post('/strong-neg-delta', (req: Request, res: Response): void => {
    try {
      const body = req.body as StrongNegDeltaAlertBody;
      const {
        userId,
        matchId,
        matchName,
        leagueName,
        score,
        minute,
        market,
        half,
        delta,
        prevLine,
        newLine,
        prevOver,
        newOver,
        eventKey,
      } = body;

      if (!userId || !matchId || !matchName) {
        res.status(400).json({ error: 'Missing userId, matchId, or matchName' });
        return;
      }
      if (market !== '1_3' && market !== '1_6') {
        res.status(400).json({ error: 'market must be 1_3 or 1_6' });
        return;
      }
      if (half !== 1 && half !== 2) {
        res.status(400).json({ error: 'half must be 1 or 2' });
        return;
      }
      if (!isFiniteNum(delta) || !isFiniteNum(prevLine) || !isFiniteNum(newLine)) {
        res.status(400).json({ error: 'delta, prevLine, newLine must be finite numbers' });
        return;
      }
      if (!isFiniteNum(prevOver) || !isFiniteNum(newOver)) {
        res.status(400).json({ error: 'prevOver, newOver must be finite numbers' });
        return;
      }
      if (!(delta <= threshold)) {
        res.status(400).json({ error: `delta must be <= ${threshold}` });
        return;
      }
      if (!(newLine < prevLine)) {
        res.status(400).json({ error: 'Not a line drop (newLine must be < prevLine)' });
        return;
      }

      if (!telegram.isUserBound(userId)) {
        res.json({ success: true, telegram: false, reason: 'not_bound' });
        return;
      }

      const dedupeKey =
        typeof eventKey === 'string' && eventKey.trim()
          ? eventKey.trim()
          : `snd:${matchId}:${market}:H${half}:${Math.round(minute ?? 0)}:${prevLine.toFixed(2)}>${newLine.toFixed(2)}`;

      if (!tryMarkStrongNegDeltaSent(dedupeKey)) {
        res.json({ success: true, skipped: true, reason: 'duplicate' });
        return;
      }

      const marketLabel = market === '1_3' ? 'Tài/Xỉu cả trận (1_3)' : 'Tài/Xỉu H1 (1_6)';
      const seriesLabel =
        body.series === 'high' ? 'Tài đỉnh' : body.series === 'low' ? 'Tài đáy' : '';
      const deltaLabel = formatDeltaLabel(delta);
      const openLine = openLineLabel(market, half, body);
      const alertTitle = `${deltaLabel} · ${market} H${half}${seriesLabel ? ` · ${seriesLabel}` : ''} (≤ ${threshold})`;
      const alertMessage = [
        `${marketLabel} · Hiệp ${half}${seriesLabel ? ` · ${seriesLabel}` : ''}`,
        `${deltaLabel}`,
        `Line: ${prevLine.toFixed(2)} → ${newLine.toFixed(2)} ⬇`,
        `Tài: ${prevOver.toFixed(3)} → ${newOver.toFixed(3)}`,
        openLine ?? '',
      ]
        .filter(Boolean)
        .join('\n');

      const payload: NhatKyAlertPayload = {
        eventTimeMs: typeof body.eventTimeMs === 'number' ? body.eventTimeMs : Date.now(),
        leagueLine: leagueName || '—',
        matchLine: matchName,
        score: score || '—',
        minute: typeof minute === 'number' && Number.isFinite(minute) ? minute : 0,
        oddsLines: [
          `${marketLabel} H${half}: ${prevLine.toFixed(2)}→${newLine.toFixed(2)} · ${deltaLabel} · Tài ${prevOver.toFixed(3)}→${newOver.toFixed(3)}`,
        ],
        statsLines: [],
        alertTitle,
        alertMessage,
        alertType: 'strong_neg_delta',
        headerLabel: 'CẢNH BÁO Δ ÂM',
      };

      void telegram.sendNhatKyAlertToUser(userId, payload).catch((err) => {
        logger.error('[strong-neg-delta] sendNhatKyAlertToUser failed:', err);
      });

      res.json({ success: true, telegram: true });
    } catch (e) {
      logger.error('POST /api/alerts/strong-neg-delta:', e);
      res.status(500).json({ error: 'notify failed' });
    }
  });

  return router;
}
