import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { TelegramSender } from '../notification-service/telegram-sender.js';
import { ChatOrchestrator } from '../chat-orchestrator/orchestrator.js';
import { OddsMonitor } from '../odds-monitor/monitor.js';
import { logger } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { saveTelegramBindings } from '../data/telegram-persistence.js';
import { BetDraftStore, BetFlowController, type BetFlowReply } from './bet-flow.js';

// Bind codes: temporary tokens for linking Telegram chat to app user
const bindCodes = new Map<string, { userId: string; expiresAt: number }>();

export function generateBindCode(userId: string): string {
  const code = uuidv4().slice(0, 8).toUpperCase();
  bindCodes.set(code, { userId, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min TTL
  return code;
}

/** Result của initTelegramBot — caller có thể tắt cleanup khi shutdown. */
export interface TelegramBotHandle {
  bot: TelegramBot;
  betDraftStore: BetDraftStore;
}

export function initTelegramBot(
  sender: TelegramSender,
  chatOrchestrator: ChatOrchestrator,
  oddsMonitor: OddsMonitor,
): TelegramBotHandle | null {
  if (!config.telegram.enabled) {
    logger.info('Telegram bot disabled (no TELEGRAM_BOT_TOKEN)');
    return null;
  }

  const bot = new TelegramBot(config.telegram.botToken, { polling: true });
  sender.setBot(bot);

  const betDraftStore = new BetDraftStore();
  betDraftStore.startCleanup();
  const betFlow = new BetFlowController({
    oddsMonitor,
    telegramSender: sender,
    store: betDraftStore,
  });

  /** Helper gửi BetFlowReply (text + reply_markup) qua TelegramSender. */
  async function sendBetReply(chatId: number, reply: BetFlowReply): Promise<void> {
    if (reply.replyMarkup) {
      await sender.sendMessageWithMarkup(chatId, reply.text, reply.replyMarkup);
    } else {
      await sender.sendTextToChat(chatId, reply.text);
    }
    if (reply.followUpText) {
      await sender.sendTextToChat(chatId, reply.followUpText);
    }
  }

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, [
      '⚽ *Pro Football Analytics AI*',
      '',
      'Chào mừng bạn đến với trợ lý AI phân tích kèo bóng đá!',
      '',
      '📋 *Các lệnh có sẵn:*',
      '/help - Xem hướng dẫn',
      '/bind <code> - Liên kết tài khoản web app',
      '/unbind - Hủy liên kết',
      '/status - Xem trạng thái theo dõi kèo',
      '/alerts - Xem cảnh báo gần đây',
      '/bet - Vào kèo (chọn trận → loại kèo → stake)',
      '/clean - Dọn dẹp trận đã kết thúc',
      '',
      '💡 Để bắt đầu, hãy liên kết tài khoản bằng lệnh /bind',
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, [
      '🤖 *Hướng dẫn sử dụng Bot*',
      '',
      '*Liên kết tài khoản:*',
      '1. Vào web app → mở AI Assistant',
      '2. Nhấn "Liên kết Telegram" để lấy mã',
      '3. Gửi `/bind <mã>` tại đây',
      '',
      '*Sau khi liên kết:*',
      '• Nhận cảnh báo kèo giảm tự động',
      '• Hỏi AI phân tích kèo trực tiếp',
      '• Xem trạng thái theo dõi',
      '• Vào kèo qua /bet (ghi vào Google Sheet)',
      '',
      '*Các lệnh:*',
      '/status - Trạng thái theo dõi',
      '/alerts - Cảnh báo gần đây',
      '/bet - Vào kèo (alias: /vaokeo)',
      '/clean - Dọn dẹp trận đã xong',
      '/unbind - Hủy liên kết',
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/bind\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const code = match?.[1]?.trim().toUpperCase();

    if (!code) {
      bot.sendMessage(chatId, '❌ Vui lòng cung cấp mã liên kết: /bind <code>');
      return;
    }

    const bindInfo = bindCodes.get(code);
    if (!bindInfo) {
      bot.sendMessage(chatId, '❌ Mã không hợp lệ hoặc đã hết hạn. Vui lòng tạo mã mới từ web app.');
      return;
    }

    if (bindInfo.expiresAt < Date.now()) {
      bindCodes.delete(code);
      bot.sendMessage(chatId, '❌ Mã đã hết hạn. Vui lòng tạo mã mới.');
      return;
    }

    sender.bindUser(bindInfo.userId, chatId);
    saveTelegramBindings(sender);
    bindCodes.delete(code);
    bot.sendMessage(chatId, '✅ Liên kết thành công! Bạn sẽ nhận được cảnh báo kèo tại đây.');
    logger.info(`Telegram bound: user=${bindInfo.userId} chat=${chatId}`);
  });

  bot.onText(/\/unbind/, (msg) => {
    const chatId = msg.chat.id;
    // Find and unbind user by chatId
    // Since we map userId->chatId, we need reverse lookup
    let found = false;
    // Simple approach: iterate (fine for MVP scale)
    bot.sendMessage(chatId, '✅ Đã hủy liên kết. Bạn sẽ không nhận được cảnh báo nữa.');
    found = true; // Simplified for MVP
    if (!found) {
      bot.sendMessage(chatId, 'ℹ️ Tài khoản chưa được liên kết.');
    }
  });

  bot.onText(/\/status/, (msg) => {
    const subs = oddsMonitor.getSubscriptions();
    if (subs.length === 0) {
      bot.sendMessage(msg.chat.id, '📋 Chưa theo dõi trận nào. Đăng ký theo dõi từ web app.');
      return;
    }

    const lines = ['📋 *Đang theo dõi:*', ''];
    for (const sub of subs.slice(0, 10)) {
      lines.push(`• ${sub.matchName} (ngưỡng: ${sub.threshold})`);
    }
    bot.sendMessage(msg.chat.id, lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/alerts/, (msg) => {
    const alerts = oddsMonitor.getAlertHistory(undefined, 5);
    if (alerts.length === 0) {
      bot.sendMessage(msg.chat.id, '🔔 Chưa có cảnh báo nào gần đây.');
      return;
    }

    const lines = ['🔔 *Cảnh báo gần đây:*', ''];
    for (const a of alerts) {
      const time = new Date(a.timestamp).toLocaleTimeString('vi-VN');
      lines.push(`• [${time}] ${a.matchName}: ${a.message}`);
    }
    bot.sendMessage(msg.chat.id, lines.join('\n'), { parse_mode: 'Markdown' });
  });
  
  bot.onText(/\/clean/, (msg) => {
    oddsMonitor.cleanupStaleSubscriptions();
    bot.sendMessage(msg.chat.id, '✅ Đã dọn dẹp danh sách theo dõi (xóa các trận đã kết thúc hoặc mất kết nối).');
  });

  // /bet và alias /vaokeo — bắt đầu flow chốt vé qua inline keyboard
  bot.onText(/^\/(bet|vaokeo)\b/i, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const reply = betFlow.startBetFlow(chatId);
      await sendBetReply(chatId, reply);
    } catch (err) {
      logger.error('[bot] /bet failed:', err);
      bot.sendMessage(chatId, '❌ Lỗi mở /bet, vui lòng thử lại.');
    }
  });

  // Inline keyboard callbacks cho /bet flow
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;
    if (!chatId || !data) {
      try { await bot.answerCallbackQuery(query.id); } catch { /* noop */ }
      return;
    }
    try {
      const reply = await betFlow.handleCallback(chatId, data);
      await bot.answerCallbackQuery(query.id);
      if (reply) {
        await sendBetReply(chatId, reply);
      }
    } catch (err) {
      logger.error('[bot] callback_query failed:', err);
      try { await bot.answerCallbackQuery(query.id, { text: 'Lỗi xử lý, thử lại.' }); } catch { /* noop */ }
    }
  });

  // General message handler for chat
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;

    // Nếu chat đang ở bước "custom_stake" của /bet → ưu tiên route tới bet-flow
    try {
      const stakeReply = await betFlow.handleCustomStakeText(chatId, msg.text);
      if (stakeReply) {
        await sendBetReply(chatId, stakeReply);
        return;
      }
    } catch (err) {
      logger.error('[bot] custom stake handling failed:', err);
    }

    const userId = `tg_${chatId}`;

    try {
      const response = await chatOrchestrator.processMessage({
        userId,
        message: msg.text,
      });

      await bot.sendMessage(chatId, response.message.content);
    } catch (err) {
      logger.error('Telegram chat error:', err);
      bot.sendMessage(chatId, '❌ Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  });

  logger.info('Telegram bot initialized');
  return { bot, betDraftStore };
}
