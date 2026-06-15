import { Router, Request, Response } from 'express';
import { generateBindCode } from '../telegram/bot.js';
import { TelegramSender } from '../notification-service/telegram-sender.js';

export function createTelegramRouter(sender: TelegramSender): Router {
  const router = Router();

  /**
   * POST /api/telegram/bind-code
   * Generate a bind code for linking Telegram to web app user.
   *
   * Body: { userId: string }
   */
  router.post('/bind-code', (req: Request, res: Response): void => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    const code = generateBindCode(userId);
    res.json({
      success: true,
      code,
      expiresIn: '10 minutes',
      instruction: 'Gửi lệnh /bind ' + code + ' cho bot Telegram để liên kết tài khoản.',
    });
  });

  /**
   * GET /api/telegram/status/:userId
   */
  router.get('/status/:userId', (req: Request, res: Response): void => {
    const isBound = sender.isUserBound(String(req.params.userId));
    res.json({
      success: true,
      bound: isBound,
    });
  });

  /**
   * POST /api/telegram/ping
   * Gửi tin thử tới Telegram nếu userId đã bind (dùng để kiểm tra kết nối).
   * Body: { userId: string }
   */
  router.post('/ping', async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }
    const chatId = sender.getUserChatId(userId);
    if (chatId === undefined) {
      res.status(404).json({
        success: false,
        error: 'Chưa bind Telegram — tạo mã /bind từ web rồi gửi cho bot.',
      });
      return;
    }
    const lineTime = `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' })} GMT+7`;
    const text = [
      '🧪 Ping test — Pro Football Analytics',
      '',
      'Tin thử từ server (API /api/telegram/ping).',
      `Thời gian: ${lineTime}`,
    ].join('\n');
    try {
      const ok = await sender.sendTextToChat(chatId, text);
      res.json({ success: ok, message: ok ? 'Đã gửi tin tới Telegram.' : 'Gửi thất bại (xem log server).' });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  return router;
}
