import { Router, Request, Response } from 'express';
import { OddsMonitor } from '../odds-monitor/monitor.js';
import { TelegramSender, NhatKyAlertPayload } from '../notification-service/telegram-sender.js';
import { tryReserveDedupeKey } from '../services/telegram-alert-dedupe.js';

/**
 * POST /api/follow-match/alert
 * Khi client thêm bản ghi vào Nhật ký Cảnh báo — gửi Telegram nếu subscription hợp lệ.
 * Trùng lặp: cùng subscriptionId + alert.id → bỏ qua (xem telegram-alert-dedupe).
 */
export function createFollowMatchRouter(monitor: OddsMonitor, telegram: TelegramSender): Router {
  const router = Router();

  router.post('/alert', (req: Request, res: Response): void => {
    try {
      const body = req.body as {
        subscriptionId?: string;
        telegramHeader?: string;
        alert?: {
          id: string;
          type: string;
          title: string;
          message: string;
          timestamp: number;
          minute: number;
        };
        matchSnapshot?: {
          matchId: string;
          leagueName: string;
          matchLine: string;
          score: string;
          minute: number;
          oddsLines: string[];
          statsLines: string[];
          perTeamApiLines?: string[];
          oddsTwoTeamLines?: string[];
          pressureBellHistoryMinutes?: string;
          ouDropIntensityHistoryMinutes?: string;
        };
      };

      const { subscriptionId, alert, matchSnapshot, telegramHeader } = body;

      if (!subscriptionId || !alert?.id || !matchSnapshot?.matchId) {
        res.status(400).json({ error: 'Missing subscriptionId, alert.id, or matchSnapshot.matchId' });
        return;
      }

      const sub = monitor.getSubscriptionById(subscriptionId);
      if (!sub?.active || !sub.userId) {
        res.status(403).json({ error: 'Invalid or inactive subscription' });
        return;
      }

      if (matchSnapshot.matchId !== sub.matchId) {
        res.status(403).json({ error: 'matchId does not match subscription' });
        return;
      }

      const dedupeKey = `nj:${subscriptionId}:${alert.id}`;
      if (!tryReserveDedupeKey(dedupeKey)) {
        res.json({ success: true, skipped: true, reason: 'duplicate' });
        return;
      }

      const snap = matchSnapshot;
      const payload: NhatKyAlertPayload = {
        eventTimeMs: typeof alert.timestamp === 'number' ? alert.timestamp : Date.now(),
        leagueLine: snap.leagueName || '—',
        matchLine: snap.matchLine,
        score: snap.score,
        minute: snap.minute,
        oddsLines: Array.isArray(snap.oddsLines) ? snap.oddsLines : [],
        statsLines: Array.isArray(snap.statsLines) ? snap.statsLines : [],
        perTeamApiLines: Array.isArray(snap.perTeamApiLines) ? snap.perTeamApiLines : undefined,
        oddsTwoTeamLines: Array.isArray(snap.oddsTwoTeamLines) ? snap.oddsTwoTeamLines : undefined,
        pressureBellHistoryMinutes: typeof snap.pressureBellHistoryMinutes === 'string' ? snap.pressureBellHistoryMinutes : undefined,
        ouDropIntensityHistoryMinutes: typeof snap.ouDropIntensityHistoryMinutes === 'string' ? snap.ouDropIntensityHistoryMinutes : undefined,
        alertTitle: alert.title,
        alertMessage: alert.message,
        alertType: alert.type,
        headerLabel: typeof telegramHeader === 'string' && telegramHeader.trim() ? telegramHeader.trim() : undefined,
      };

      void telegram.sendNhatKyAlertToUser(sub.userId, payload).catch((err) => {
        console.error('[follow-match] sendNhatKyAlertToUser failed:', err);
      });

      res.json({ success: true });
    } catch (e) {
      console.error('POST /api/follow-match/alert:', e);
      res.status(500).json({ error: 'notify failed' });
    }
  });

  /**
   * POST /api/follow-match/test
   * Gửi một tin thử (Telegram) cùng layout Nhật ký — không dedupe theo alert id.
   */
  router.post('/test', async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as {
        subscriptionId?: string;
        matchSnapshot?: {
          matchId: string;
          leagueName: string;
          matchLine: string;
          score: string;
          minute: number;
          oddsLines: string[];
          statsLines: string[];
          perTeamApiLines?: string[];
          oddsTwoTeamLines?: string[];
          pressureBellHistoryMinutes?: string;
          ouDropIntensityHistoryMinutes?: string;
        };
      };

      const { subscriptionId, matchSnapshot } = body;

      if (!subscriptionId || !matchSnapshot?.matchId) {
        res.status(400).json({ error: 'Missing subscriptionId or matchSnapshot.matchId' });
        return;
      }

      const sub = monitor.getSubscriptionById(subscriptionId);
      if (!sub?.active || !sub.userId) {
        res.status(403).json({ error: 'Invalid or inactive subscription' });
        return;
      }

      if (matchSnapshot.matchId !== sub.matchId) {
        res.status(403).json({ error: 'matchId does not match subscription' });
        return;
      }

      const snap = matchSnapshot;
      const payload: NhatKyAlertPayload = {
        eventTimeMs: Date.now(),
        leagueLine: snap.leagueName || '—',
        matchLine: snap.matchLine,
        score: snap.score,
        minute: snap.minute,
        oddsLines: Array.isArray(snap.oddsLines) ? snap.oddsLines : [],
        statsLines: Array.isArray(snap.statsLines) ? snap.statsLines : [],
        perTeamApiLines: Array.isArray(snap.perTeamApiLines) ? snap.perTeamApiLines : undefined,
        oddsTwoTeamLines: Array.isArray(snap.oddsTwoTeamLines) ? snap.oddsTwoTeamLines : undefined,
        pressureBellHistoryMinutes: typeof snap.pressureBellHistoryMinutes === 'string' ? snap.pressureBellHistoryMinutes : undefined,
        ouDropIntensityHistoryMinutes: typeof snap.ouDropIntensityHistoryMinutes === 'string' ? snap.ouDropIntensityHistoryMinutes : undefined,
        alertTitle: 'Kiểm tra thông báo',
        alertMessage: 'Đây là tin thử từ nút trên app (theo dõi trận).',
        alertType: 'manual_test',
        headerLabel: 'KIỂM TRA TELEGRAM',
      };

      const ok = await telegram.sendNhatKyAlertToUser(sub.userId, payload).catch((err) => {
        console.error('[follow-match] test sendNhatKyAlertToUser failed:', err);
        return false;
      });

      if (!ok) {
        const isBound = telegram.isUserBound(sub.userId);
        res.status(200).json({ 
          success: false, 
          error: isBound ? 'Gửi thất bại (xem log server).' : 'Tài khoản chưa bind Telegram hoặc đã mất liên kết (thử bind lại).' 
        });
        return;
      }

      res.json({ success: true });
    } catch (e) {
      console.error('POST /api/follow-match/test:', e);
      res.status(500).json({ error: 'test notify failed' });
    }
  });

  return router;
}
