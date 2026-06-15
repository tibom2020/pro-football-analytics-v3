import { EventEmitter } from 'events';
import { OddsAlert, OddsSubscription, OddsSnapshot } from '../ai-assistant-core/types.js';
import { TelegramSender, type OddsAlertTelegramExtras } from './telegram-sender.js';
import { logger } from '../index.js';

export interface InAppNotification {
  id: string;
  userId: string;
  type: 'alert' | 'evaluation' | 'info';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  timestamp: number;
}

/**
 * Central notification dispatcher.
 * Routes alerts to in-app SSE streams and Telegram.
 */
export class NotificationService extends EventEmitter {
  private inAppStore = new Map<string, InAppNotification[]>();
  private sseClients = new Map<string, Set<(data: string) => void>>();
  private telegramSender: TelegramSender | null = null;

  setTelegramSender(sender: TelegramSender): void {
    this.telegramSender = sender;
  }

  /**
   * Dispatch an odds alert to all relevant channels.
   */
  async dispatchAlert(
    alert: OddsAlert,
    subscriptions: OddsSubscription[],
    telegramExtras?: OddsAlertTelegramExtras,
  ): Promise<void> {
    const userIds = new Set(subscriptions.map(s => s.userId));

    for (const userId of userIds) {
      // In-app notification
      const notification: InAppNotification = {
        id: alert.id,
        userId,
        type: 'alert',
        title: `⚠️ ${alert.matchName}`,
        message: alert.message,
        data: { alert },
        read: false,
        timestamp: Date.now(),
      };

      this.addInAppNotification(userId, notification);
      this.sendSSE(userId, notification);

      // Telegram notification
      if (this.telegramSender) {
        try {
          await this.telegramSender.sendAlertToUser(userId, alert, telegramExtras);
        } catch (err) {
          logger.error(`Failed to send Telegram alert to ${userId}:`, err);
        }
      }
    }

    logger.info(`Alert dispatched to ${userIds.size} users: ${alert.message}`);
  }

  private addInAppNotification(userId: string, notification: InAppNotification): void {
    const existing = this.inAppStore.get(userId) || [];
    existing.push(notification);
    // Keep last 100 per user
    if (existing.length > 100) {
      this.inAppStore.set(userId, existing.slice(-100));
    } else {
      this.inAppStore.set(userId, existing);
    }
  }

  getNotifications(userId: string, unreadOnly = false): InAppNotification[] {
    const all = this.inAppStore.get(userId) || [];
    return unreadOnly ? all.filter(n => !n.read) : all;
  }

  markAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.inAppStore.get(userId);
    if (!notifications) return false;
    const n = notifications.find(x => x.id === notificationId);
    if (n) {
      n.read = true;
      return true;
    }
    return false;
  }

  /**
   * Register an SSE client for real-time push.
   */
  registerSSEClient(userId: string, sendFn: (data: string) => void): () => void {
    let clients = this.sseClients.get(userId);
    if (!clients) {
      clients = new Set();
      this.sseClients.set(userId, clients);
    }
    clients.add(sendFn);

    return () => {
      clients?.delete(sendFn);
      if (clients?.size === 0) {
        this.sseClients.delete(userId);
      }
    };
  }

  private sendSSE(userId: string, notification: InAppNotification): void {
    const clients = this.sseClients.get(userId);
    if (!clients) return;
    const data = JSON.stringify(notification);
    for (const send of clients) {
      try {
        send(`data: ${data}\n\n`);
      } catch {
        clients.delete(send);
      }
    }
  }
}
