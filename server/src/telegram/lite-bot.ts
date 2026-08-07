/**
 * Telegram bot tối giản cho v3-lite: chỉ /start, /help, /bind, /unbind, /status, /ping.
 * Không phụ thuộc OddsMonitor / ChatOrchestrator.
 */
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { TelegramSender } from '../notification-service/telegram-sender.js';
import { saveTelegramBindings } from '../data/telegram-persistence.js';
import { consumeBindCode } from './bind-codes.js';

/** Bắt lệnh kể cả dạng /cmd@BotUsername (Telegram hay thêm khi chọn từ menu). */
function cmd(name: string, withArg = false): RegExp {
  const base = `^\\/${name}(?:@[\\w_]+)?`;
  // withArg: /bind CODE hoặc /bind@Bot CODE (CODE optional để vẫn trả lời khi thiếu mã)
  return withArg
    ? new RegExp(`${base}(?:\\s+(.+))?$`, 'i')
    : new RegExp(`${base}(?:\\s.*)?$`, 'i');
}

export function initLiteTelegramBot(sender: TelegramSender): TelegramBot | null {
  if (!config.telegram.enabled || !config.features.telegramBot) {
    logger.info('Telegram bot disabled (no token or FEATURE_TELEGRAM_BOT=false)');
    return null;
  }

  const bot = new TelegramBot(config.telegram.botToken, { polling: true });
  sender.setBot(bot);

  bot.on('polling_error', (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[telegram-lite] polling_error: ${msg}`);
  });

  bot.on('error', (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[telegram-lite] bot error: ${msg}`);
  });

  bot.onText(cmd('start'), (msg) => {
    void bot.sendMessage(
      msg.chat.id,
      [
        '⚽ *Pro Football Analytics*',
        '',
        'Bot cảnh báo kèo (lite).',
        '',
        '📋 *Lệnh:*',
        '/bind <mã> — Liên kết tài khoản web',
        '/unbind — Hủy liên kết',
        '/status — Trạng thái liên kết',
        '/ping — Tin thử',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  bot.onText(cmd('help'), (msg) => {
    void bot.sendMessage(
      msg.chat.id,
      [
        '🤖 *Hướng dẫn*',
        '',
        '1. Mở trận trên web → nút *Telegram*',
        '2. Lấy mã → gửi `/bind <mã>` tại đây',
        '3. Khi tab trận mở và line 1_3/1_6 hạ + Tài ≤ 1.725 → nhận cảnh báo tại đây',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  bot.onText(cmd('bind', true), (msg, match) => {
    const chatId = msg.chat.id;
    const raw = match?.[1]?.trim() ?? '';
    // Bỏ @BotName nếu dính vào mã; chỉ lấy token chữ/số.
    const code = raw.replace(/^@[\w_]+\s*/i, '').replace(/[^\w-]/g, '').toUpperCase();
    if (!code) {
      void bot.sendMessage(chatId, '❌ Vui lòng cung cấp mã: /bind <code>');
      return;
    }
    const consumed = consumeBindCode(code);
    if (!consumed) {
      void bot.sendMessage(
        chatId,
        '❌ Mã không hợp lệ hoặc đã hết hạn (TTL 10 phút).\nTạo mã mới từ web → nút Telegram, rồi gửi lại /bind <mã> tại đây (@TieuTuebot).',
      );
      return;
    }
    sender.bindUser(consumed.userId, chatId);
    saveTelegramBindings(sender);
    void bot.sendMessage(chatId, '✅ Liên kết thành công! Bạn sẽ nhận cảnh báo hạ line OU tại đây.');
    logger.info(`Telegram bound (lite): user=${consumed.userId} chat=${chatId}`);
  });

  bot.onText(cmd('unbind'), (msg) => {
    const chatId = msg.chat.id;
    const userId = sender.getUserIdByChatId(chatId);
    if (!userId) {
      void bot.sendMessage(chatId, 'ℹ️ Tài khoản chưa được liên kết.');
      return;
    }
    sender.unbindUser(userId);
    saveTelegramBindings(sender);
    void bot.sendMessage(chatId, '✅ Đã hủy liên kết. Bạn sẽ không nhận cảnh báo nữa.');
  });

  bot.onText(cmd('status'), (msg) => {
    const chatId = msg.chat.id;
    const userId = sender.getUserIdByChatId(chatId);
    if (!userId) {
      void bot.sendMessage(chatId, '📋 Chưa liên kết. Dùng /bind <mã> từ web app.');
      return;
    }
    void bot.sendMessage(
      chatId,
      `📋 Đã liên kết (user \`${userId.slice(0, 8)}…\`).\nCảnh báo hạ line OU (1_3/1_6 + Tài ≤ 1.725) sẽ gửi khi tab trận đang mở.`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.onText(cmd('ping'), async (msg) => {
    const chatId = msg.chat.id;
    const lineTime = `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' })} GMT+7`;
    const ok = await sender.sendTextToChat(
      chatId,
      ['🧪 Ping — Pro Football Analytics (lite)', '', `Thời gian: ${lineTime}`].join('\n'),
    );
    if (!ok) {
      void bot.sendMessage(chatId, '❌ Ping thất bại (xem log server).');
    }
  });

  logger.info('Telegram lite bot initialized (polling)');
  return bot;
}
