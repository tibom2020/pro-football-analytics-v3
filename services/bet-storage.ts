import type { BetTicket } from '../types';
import { syncBetsToServer } from './ai-service';
import { getAppUserId } from './user-id';

const STORAGE_KEY = 'betTickets';

/**
 * Single sink ghi bet tickets vào localStorage + mirror lên server cho các
 * sidecar (ví dụ OpenHuman bridge) đọc qua `/api/bets/sync`.
 *
 * Best-effort: lỗi sync không chặn ghi local — localStorage vẫn là source of truth.
 */
export function saveBetTickets(tickets: BetTicket[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.error('[bet-storage] Failed to write localStorage:', err);
  }
  void syncBetsToServer(getAppUserId(), tickets).catch(() => {});
}
