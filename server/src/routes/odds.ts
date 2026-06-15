import { Router, Request, Response } from 'express';
import { OddsMonitor, type OddsPushTelegramContext } from '../odds-monitor/monitor.js';
import { NotificationService } from '../notification-service/notifier.js';
import { OddsSubscription, OddsSnapshot } from '../ai-assistant-core/types.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../index.js';
import { saveFollowSubscriptions } from '../data/follow-subscriptions-persistence.js';

export function createOddsRouter(monitor: OddsMonitor, notifier: NotificationService): Router {
  const router = Router();

  /**
   * POST /api/odds/subscribe
   * Subscribe to odds alerts for a match.
   *
   * Body: {
   *   userId: string,
   *   matchId: string,
   *   matchName: string,
   *   markets?: string[],
   *   threshold?: number
   * }
   */
  router.post('/subscribe', (req: Request, res: Response): void => {
    try {
      const { userId, matchId, matchName, leagueName, markets, threshold } = req.body as {
        userId?: string;
        matchId?: string;
        matchName?: string;
        leagueName?: string;
        markets?: string[];
        threshold?: number;
      };

      if (!userId || !matchId || !matchName) {
        res.status(400).json({ error: 'Missing required fields: userId, matchId, matchName' });
        return;
      }

      const existing = monitor.getSubscriptions(userId).find((s) => s.matchId === matchId && s.active);
      if (existing) {
        if (existing.matchName !== matchName || (typeof leagueName === 'string' && existing.leagueName !== leagueName)) {
          existing.matchName = matchName;
          if (typeof leagueName === 'string') existing.leagueName = leagueName;
          saveFollowSubscriptions(monitor);
        }
        res.json({ success: true, subscription: existing });
        return;
      }

      const subscription: OddsSubscription = {
        id: uuidv4(),
        userId,
        matchId,
        matchName,
        leagueName: typeof leagueName === 'string' ? leagueName : undefined,
        markets: markets || ['over_under', 'handicap'],
        threshold: threshold || 0.15,
        active: true,
        createdAt: Date.now(),
      };

      monitor.addSubscription(subscription);
      saveFollowSubscriptions(monitor);
      logger.info(`Odds subscription: ${userId} -> ${matchName}`);

      res.json({ success: true, subscription });
    } catch (err) {
      logger.error('Subscribe error:', err);
      res.status(500).json({ error: 'Subscription failed' });
    }
  });

  /**
   * DELETE /api/odds/subscribe/:subId
   */
  router.delete('/subscribe/:subId', (req: Request, res: Response): void => {
    const removed = monitor.removeSubscription(String(req.params.subId));
    if (removed) saveFollowSubscriptions(monitor);
    res.json({ success: removed });
  });

  /**
   * GET /api/odds/subscriptions/:userId
   */
  router.get('/subscriptions/:userId', (req: Request, res: Response): void => {
    const subs = monitor.getSubscriptions(String(req.params.userId));
    res.json({ success: true, subscriptions: subs });
  });

  /**
   * POST /api/odds/push
   * Push odds update from frontend (since frontend polls B365).
   *
   * Body: {
   *   matchId: string,
   *   snapshot: OddsSnapshot
   * }
   */
  router.post('/push', (req: Request, res: Response): void => {
    try {
      const { matchId, snapshot, telegramContext } = req.body as {
        matchId: string;
        snapshot: OddsSnapshot;
        telegramContext?: OddsPushTelegramContext;
      };

      if (!matchId || !snapshot) {
        res.status(400).json({ error: 'Missing matchId or snapshot' });
        return;
      }

      const alerts = monitor.pushOddsUpdate(matchId, snapshot, telegramContext);
      res.json({ success: true, alerts });
    } catch (err) {
      logger.error('Odds push error:', err);
      res.status(500).json({ error: 'Failed to process odds update' });
    }
  });

  /**
   * GET /api/odds/alerts
   * Get alert history.
   */
  router.get('/alerts', (req: Request, res: Response): void => {
    const matchId = req.query.matchId ? String(req.query.matchId) : undefined;
    const limitStr = req.query.limit ? String(req.query.limit) : '';
    const alerts = monitor.getAlertHistory(
      matchId,
      limitStr ? parseInt(limitStr, 10) : 50,
    );
    res.json({ success: true, alerts });
  });

  /**
   * GET /api/odds/history/:matchId
   */
  router.get('/history/:matchId', (req: Request, res: Response): void => {
    const history = monitor.getOddsHistory(String(req.params.matchId));
    res.json({ success: true, history });
  });

  /**
   * GET /api/odds/notifications/stream
   * SSE endpoint for real-time notifications.
   */
  router.get('/notifications/stream', (req: Request, res: Response): void => {
    const userId = req.query.userId ? String(req.query.userId) : '';
    if (!userId) {
      res.status(400).json({ error: 'Missing userId query parameter' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write('data: {"type":"connected"}\n\n');

    const unregister = notifier.registerSSEClient(userId, (data) => {
      res.write(data);
    });

    req.on('close', () => {
      unregister();
    });
  });

  return router;
}
