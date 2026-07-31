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

export function initLiteTelegramBot(sender: TelegramSender): TelegramBot | null {
  if (!config.telegram.enabled || !config.features.telegramBot) {
    logger.info('Telegram bot disabled (no token or FEATURE_TELEGRAM_BOT=false)');
    return null;
  }

  const bot = new TelegramBot(config.telegram.botToken, { polling: true });
  sender.setBot(bot);

  bot.onText(/\/start/, (msg) => {
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

  bot.onText(/\/help/, (msg) => {
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

  bot.onText(/\/bind\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const code = match?.[1]?.trim().toUpperCase();
    if (!code) {
      void bot.sendMessage(chatId, '❌ Vui lòng cung cấp mã: /bind <code>');
      return;
    }
    const consumed = consumeBindCode(code);
    if (!consumed) {
      void bot.sendMessage(chatId, '❌ Mã không hợp lệ hoặc đã hết hạn. Tạo mã mới từ web app.');
      return;
    }
    sender.bindUser(consumed.userId, chatId);
    saveTelegramBindings(sender);
    void bot.sendMessage(chatId, '✅ Liên kết thành công! Bạn sẽ nhận cảnh báo hạ line OU tại đây.');
    logger.info(`Telegram bound (lite): user=${consumed.userId} chat=${chatId}`);
  });

  bot.onText(/\/unbind/, (msg) => {
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

  bot.onText(/\/status/, (msg) => {
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

  bot.onText(/\/ping/, async (msg) => {
    const chatId = msg.chat.id;
    const lineTime = `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' })} GMT+7`;
    await sender.sendTextToChat(
      chatId,
      ['🧪 Ping — Pro Football Analytics (lite)', '', `Thời gian: ${lineTime}`].join('\n'),
    );
  });

  logger.info('Telegram lite bot initialized (polling)');
  return bot;
}
