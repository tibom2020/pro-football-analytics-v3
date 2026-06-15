/**
 * Wrap các GET endpoint của PFA server. Tất cả best-effort: lỗi mạng/HTTP trả null,
 * caller xử lý partial-state (giữ nguyên file vault cũ thay vì xoá).
 */

const FETCH_TIMEOUT_MS = 5_000;

export interface PersistedBetTicket {
  id: string;
  matchId: string;
  matchName: string;
  betType: string;
  handicap: string;
  odds: number;
  stake: number;
  minute: number;
  scoreAtBet?: string;
  status: 'pending' | 'won' | 'lost' | 'push' | 'won_half' | 'lost_half';
  createdAt: number;
  notes?: string;
  betId?: string;
  sheetSynced?: boolean;
  leagueName?: string;
  noteSnapshot?: string;
}

export interface OddsSubscription {
  id: string;
  userId: string;
  matchId: string;
  matchName: string;
  leagueName?: string;
  markets?: string[];
  threshold?: number;
  active: boolean;
  createdAt: number;
}

export interface OddsAlert {
  id: string;
  matchId: string;
  matchName: string;
  alertType?: string;
  market?: string;
  changePercent?: number;
  message?: string;
  minute?: number;
  timestamp: number;
}

export interface AuditEntry {
  type?: string;
  userId?: string;
  matchId?: string;
  data?: unknown;
  timestamp: number;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      console.warn(`[bridge] ${url} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[bridge] ${url} failed:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface PfaSourcesConfig {
  baseUrl: string;
  userId: string;
}

export async function fetchBetTickets(
  cfg: PfaSourcesConfig,
): Promise<PersistedBetTicket[] | null> {
  const r = await fetchJson<{ success?: boolean; tickets?: PersistedBetTicket[] }>(
    `${cfg.baseUrl}/api/bets/sync/${encodeURIComponent(cfg.userId)}`,
  );
  return r?.tickets ?? null;
}

export async function fetchFollowSubscriptions(
  cfg: PfaSourcesConfig,
): Promise<OddsSubscription[] | null> {
  const r = await fetchJson<{ success?: boolean; subscriptions?: OddsSubscription[] }>(
    `${cfg.baseUrl}/api/odds/subscriptions/${encodeURIComponent(cfg.userId)}`,
  );
  return r?.subscriptions ?? null;
}

export async function fetchAlertHistory(
  cfg: PfaSourcesConfig,
  limit = 50,
): Promise<OddsAlert[] | null> {
  const r = await fetchJson<{ success?: boolean; alerts?: OddsAlert[] }>(
    `${cfg.baseUrl}/api/odds/alerts?limit=${limit}`,
  );
  return r?.alerts ?? null;
}

export async function fetchAuditLog(
  cfg: PfaSourcesConfig,
  limit = 200,
): Promise<AuditEntry[] | null> {
  const r = await fetchJson<{ success?: boolean; entries?: AuditEntry[] }>(
    `${cfg.baseUrl}/api/ai/audit?limit=${limit}`,
  );
  return r?.entries ?? null;
}
