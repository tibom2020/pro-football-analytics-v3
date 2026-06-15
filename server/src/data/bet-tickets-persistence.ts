import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/bet_tickets.json');

/**
 * Bet ticket mirror — frontend lưu chính ở localStorage; server chỉ giữ bản
 * snapshot mới nhất để các sidecar (ví dụ OpenHuman bridge) có thể đọc.
 * Schema phải khớp với BetTicket trong types.ts ở repo root.
 */
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

type Store = Record<string, PersistedBetTicket[]>;

let memory: Store = {};

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function restoreBetTickets(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Store;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      memory = parsed;
      const total = Object.values(memory).reduce((s, arr) => s + arr.length, 0);
      console.info(`[bet-tickets-persistence] Restored ${total} ticket(s) for ${Object.keys(memory).length} user(s)`);
    }
  } catch (e) {
    console.error('[bet-tickets-persistence] Failed to restore:', e);
  }
}

function persist(): void {
  try {
    ensureDir();
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(memory, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error('[bet-tickets-persistence] Failed to persist:', e);
  }
}

export function getBetTickets(userId: string): PersistedBetTicket[] {
  return memory[userId] ?? [];
}

export function getAllBetTickets(): Store {
  return memory;
}

/**
 * Replace full ticket list for a user. Frontend là source of truth (localStorage),
 * server chỉ mirror — nên upsert toàn bộ array đơn giản hơn diff từng ticket.
 */
export function replaceBetTickets(userId: string, tickets: PersistedBetTicket[]): number {
  memory[userId] = tickets;
  persist();
  return tickets.length;
}
