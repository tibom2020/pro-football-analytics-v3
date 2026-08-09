/**
 * Telegram bot tối giản cho v3-lite: chỉ /start, /help, /bind, /unbind, /status, /ping.
 * Không phụ thuộc OddsMonitor / ChatOrchestrator.
 *
 * Telegram chỉ cho 1 getUpdates / token. Khi 409 (local + VPS cùng poll), dừng polling,
 * log hướng dẫn một lần, rồi retry backoff — ưu tiên máy local khi VPS đã tắt bot.
 */
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { TelegramSender } from '../notification-service/telegram-sender.js';
import { saveTelegramBindings } from '../data/telegram-persistence.js';
import { consumeBindCode } from './bind-codes.js';

const CONFLICT_RETRY_MS_MIN = 5_000;
const CONFLICT_RETRY_MS_MAX = 60_000;

/** Bắt lệnh kể cả dạng /cmd@BotUsername (Telegram hay thêm khi chọn từ menu). */
function cmd(name: string, withArg = false): RegExp {
  const base = `^\\/${name}(?:@[\\w_]+)?`;
  // withArg: /bind CODE hoặc /bind@Bot CODE (CODE optional để vẫn trả lời khi thiếu mã)
  return withArg
    ? new RegExp(`${base}(?:\\s+(.+))?$`, 'i')
    : new RegExp(`${base}(?:\\s.*)?$`, 'i');
}

function is409Conflict(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /409|Conflict|terminated by other getUpdates/i.test(msg);
}

export function initLiteTelegramBot(sender: TelegramSender): TelegramBot | null {
  if (!config.telegram.enabled || !config.features.telegramBot) {
    logger.info('Telegram bot disabled (no token or FEATURE_TELEGRAM_BOT=false)');
    return null;
  }

  const bot = new TelegramBot(config.telegram.botToken, { polling: true });
  sender.setBot(bot);

  let conflictLogged = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelayMs = CONFLICT_RETRY_MS_MIN;
  let pausingForConflict = false;

  const clearRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const schedulePollingRetry = () => {
    clearRetry();
    const wait = retryDelayMs;
    retryDelayMs = Math.min(retryDelayMs * 2, CONFLICT_RETRY_MS_MAX);
    logger.warn(`[telegram-lite] Thử poll lại sau ${Math.round(wait / 1000)}s…`);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      pausingForConflict = false;
      void bot.startPolling().then(
        () => {
          retryDelayMs = CONFLICT_RETRY_MS_MIN;
          conflictLogged = false;
          logger.info('[telegram-lite] Polling đã chạy lại (getUpdates độc quyền).');
        },
        (e: unknown) => {
          if (is409Conflict(e)) {
            pausingForConflict = true;
            schedulePollingRetry();
            return;
          }
          const msg = e instanceof Error ? e.message : String(e);
          logger.error(`[telegram-lite] startPolling failed: ${msg}`);
          schedulePollingRetry();
        },
      );
    }, wait);
  };

  bot.on('polling_error', (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (is409Conflict(err)) {
      if (!conflictLogged) {
        conflictLogged = true;
        logger.warn(
          [
            '[telegram-lite] 409 Conflict: có process khác đang getUpdates cùng TELEGRAM_BOT_TOKEN.',
            'Ưu tiên local → trên VPS đặt FEATURE_TELEGRAM_BOT=false rồi redeploy/restart,',
            'hoặc tắt server trùng trên máy này. Bot sẽ tự thử poll lại.',
          ].join(' '),
        );
      }
      if (!pausingForConflict) {
        pausingForConflict = true;
        void bot.stopPolling().catch(() => undefined);
        schedulePollingRetry();
      }
      return;
    }
    logger.error(`[telegram-lite] polling_error: ${msg}`);
  });

  bot.on('error', (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[telegram-lite] bot error: ${msg}`);
  });

  const shutdownPolling = () => {
    clearRetry();
    void bot.stopPolling().catch(() => undefined);
  };
  process.once('SIGINT', shutdownPolling);
  process.once('SIGTERM', shutdownPolling);

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
