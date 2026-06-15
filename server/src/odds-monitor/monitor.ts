import { EventEmitter } from 'events';
import { OddsSnapshot, OddsAlert, OddsSubscription } from '../ai-assistant-core/types.js';
import { checkAlertRules } from './rules.js';
import { config } from '../config.js';
import { logger } from '../index.js';
import { saveFollowSubscriptions } from '../data/follow-subscriptions-persistence.js';


interface MonitoredMatch {
  matchId: string;
  matchName: string;
  oddsHistory: OddsSnapshot[];
  lastChecked: number;
}

/** Từ client khi POST /api/odds/push — dùng khi gửi CẢNH BÁO KÈO lên Telegram. */
export interface OddsPushTelegramContext {
  perTeamApiLines?: string[];
  statsLines?: string[];
  traditionalFactorsLines?: string[];
  pressureBellHistoryMinutes?: string;
  ouDropIntensityHistoryMinutes?: string;
}

export class OddsMonitor extends EventEmitter {
  private monitoredMatches = new Map<string, MonitoredMatch>();
  private subscriptions = new Map<string, OddsSubscription>();
  private alertHistory: OddsAlert[] = [];
  private lastTelegramContextByMatch = new Map<string, OddsPushTelegramContext>();
  private pollTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Khởi chạy dọn dẹp định kỳ (5 phút một lần)
    this.pollTimer = setInterval(() => this.cleanupStaleSubscriptions(), 5 * 60 * 1000);
  }

  addSubscription(sub: OddsSubscription): void {
    this.subscriptions.set(sub.id, sub);
    if (!this.monitoredMatches.has(sub.matchId)) {
      this.monitoredMatches.set(sub.matchId, {
        matchId: sub.matchId,
        matchName: sub.matchName,
        oddsHistory: [],
        lastChecked: Date.now(),
      });
    }
    logger.info(`Subscription added: ${sub.userId} -> ${sub.matchName}`);
  }

  /** Khôi phục từ DB/file — giữ nguyên `id`, không tạo bản ghi mới. */
  restoreSubscription(sub: OddsSubscription): void {
    if (!sub.active) return;
    this.subscriptions.set(sub.id, sub);
    if (!this.monitoredMatches.has(sub.matchId)) {
      this.monitoredMatches.set(sub.matchId, {
        matchId: sub.matchId,
        matchName: sub.matchName,
        oddsHistory: [],
        lastChecked: Date.now(),
      });
    }
    logger.info(`Subscription restored: ${sub.userId} -> ${sub.matchName} (${sub.id})`);
  }

  getSubscriptionById(subId: string): OddsSubscription | undefined {
    return this.subscriptions.get(subId);
  }

  removeSubscription(subId: string): boolean {
    const sub = this.subscriptions.get(subId);
    if (!sub) return false;
    this.subscriptions.delete(subId);

    const hasOtherSubs = Array.from(this.subscriptions.values())
      .some(s => s.matchId === sub.matchId && s.active);
    if (!hasOtherSubs) {
      this.monitoredMatches.delete(sub.matchId);
    }

    logger.info(`Subscription removed: ${subId}`);
    return true;
  }

  getSubscriptions(userId?: string): OddsSubscription[] {
    const all = Array.from(this.subscriptions.values());
    return userId ? all.filter(s => s.userId === userId) : all;
  }

  /**
   * Push new odds data from external source (e.g., API polling on the frontend or server).
   * Checks alert rules and emits events as needed.
   */
  /** Ngữ cảnh từ lần push gần nhất (cùng `matchId`) — gắn tin CẢNH BÁO KÈO. */
  getLastTelegramContext(matchId: string): OddsPushTelegramContext | undefined {
    return this.lastTelegramContextByMatch.get(matchId);
  }

  pushOddsUpdate(
    matchId: string,
    snapshot: OddsSnapshot,
    telegramContext?: OddsPushTelegramContext,
  ): OddsAlert[] {
    if (telegramContext) {
      this.lastTelegramContextByMatch.set(matchId, telegramContext);
    }

    let match = this.monitoredMatches.get(matchId);
    if (!match) {
      // Re-create match if we have active subscriptions
      const subs = Array.from(this.subscriptions.values()).filter(s => s.matchId === matchId && s.active);
      if (subs.length > 0) {
        match = {
          matchId,
          matchName: subs[0].matchName,
          oddsHistory: [],
          lastChecked: Date.now()
        };
        this.monitoredMatches.set(matchId, match);
      } else {
        return [];
      }
    }

    match.oddsHistory.push(snapshot);
    match.lastChecked = Date.now();

    // Keep history bounded (last 100 snapshots per match)
    if (match.oddsHistory.length > 100) {
      match.oddsHistory = match.oddsHistory.slice(-100);
    }

    const alerts = checkAlertRules(snapshot, match.oddsHistory.slice(0, -1), match.matchName, matchId);

    if (alerts.length > 0) {
      this.alertHistory.push(...alerts);
      // Keep global history bounded
      if (this.alertHistory.length > 500) {
        this.alertHistory = this.alertHistory.slice(-500);
      }

      const matchSubs = Array.from(this.subscriptions.values())
        .filter(s => s.matchId === matchId && s.active);

      for (const alert of alerts) {
        logger.info(`Alert triggered: ${alert.alertType} for ${alert.matchName} - ${alert.message}`);
        this.emit('alert', alert, matchSubs);
      }
    }

    /** Mỗi lần push kèo — Live Agent (hoặc module khác) có thể throttle để gọi LLM định kỳ. */
    this.emit('oddsPush', matchId, snapshot, match.matchName);

    return alerts;
  }

  getAlertHistory(matchId?: string, limit = 50): OddsAlert[] {
    let alerts = this.alertHistory;
    if (matchId) {
      alerts = alerts.filter(a => a.matchId === matchId);
    }
    return alerts.slice(-limit);
  }

  getOddsHistory(matchId: string): OddsSnapshot[] {
    return this.monitoredMatches.get(matchId)?.oddsHistory || [];
  }

  getLastOddsSnapshot(matchId: string): OddsSnapshot | undefined {
    const h = this.monitoredMatches.get(matchId)?.oddsHistory;
    if (!h?.length) return undefined;
    return h[h.length - 1];
  }

  /** Thời điểm nhận push kèo gần nhất (ms). Dùng để biết trận còn đang được theo dõi live hay không. */
  getLastOddsPushAt(matchId: string): number | undefined {
    return this.monitoredMatches.get(matchId)?.lastChecked;
  }

  getMonitoredMatches(): string[] {
    return Array.from(this.monitoredMatches.keys());
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Dọn dẹp các trận đã kết thúc hoặc quá lâu không có cập nhật.
   */
  public cleanupStaleSubscriptions(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 60 * 60 * 1000; // 60 phút không cập nhật (thay vì 15p)
    const FINISHED_MINUTE = 120; // Phút 120 được coi là đã xong (thay vì 100)

    const matchesToRemove: string[] = [];

    // Tìm các trận "stale"
    for (const [matchId, match] of this.monitoredMatches.entries()) {
      const lastSnapshot = match.oddsHistory[match.oddsHistory.length - 1];
      const isFinished = lastSnapshot && lastSnapshot.minute >= FINISHED_MINUTE;
      const isStale = (now - match.lastChecked) > STALE_THRESHOLD;

      if (isFinished || isStale) {
        matchesToRemove.push(matchId);
        logger.info(`Cleaning up match ${matchId} (${match.matchName}): isFinished=${isFinished}, isStale=${isStale}`);
      }
    }

    // Xóa các subscription liên quan (Chỉ khi trận đấu ĐÃ KẾT THÚC)
    for (const matchId of matchesToRemove) {
      const match = this.monitoredMatches.get(matchId);
      const lastSnapshot = match?.oddsHistory[match.oddsHistory.length - 1];
      const isActuallyFinished = lastSnapshot && lastSnapshot.minute >= FINISHED_MINUTE;

      if (isActuallyFinished) {
        // Nếu đã xong thực sự, xóa triệt để cả subscription
        const subIds = Array.from(this.subscriptions.keys()).filter(id => {
          const sub = this.subscriptions.get(id);
          return sub && sub.matchId === matchId;
        });

        for (const subId of subIds) {
          this.subscriptions.delete(subId);
        }
        logger.info(`Deleted subscriptions for finished match ${matchId}`);
      } else {
        // Nếu chỉ là stale (mất kết nối lâu), chỉ xóa khỏi monitoredMatches để giải phóng bộ nhớ
        // Nhưng GIỮ LẠI subscriptions trong Map để khi có dữ liệu mới sẽ tự phục hồi
        logger.info(`Clearing memory for stale match ${matchId}, keeping subscriptions active`);
      }
      
      this.monitoredMatches.delete(matchId);
      this.lastTelegramContextByMatch.delete(matchId);
    }
    
    if (matchesToRemove.length > 0) {
      logger.info(`Auto-cleanup completed: removed ${matchesToRemove.length} matches.`);
      saveFollowSubscriptions(this);
    }
  }
}
