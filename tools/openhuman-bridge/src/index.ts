/**
 * OpenHuman ↔ PFA bridge — main loop.
 *
 *   poll PFA endpoints  →  render markdown  →  atomic-write vào vault `<root>/pfa/`
 *
 * Mỗi nguồn (bets/follows/alerts) độc lập: lỗi 1 nguồn không xoá file của nguồn khác.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pfaSubdir, atomicWrite, ensureDir } from './vault.js';
import {
  fetchBetTickets,
  fetchFollowSubscriptions,
  fetchAlertHistory,
  type PfaSourcesConfig,
} from './sources.js';
import {
  renderActiveBets,
  renderBetHistory,
  renderFollows,
  renderAlertsToday,
  renderSummary,
} from './render.js';

function loadDotEnv(): void {
  try {
    const dotenvPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(dotenvPath)) return;
    const lines = fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* ignore — bridge vẫn chạy với env có sẵn */
  }
}

interface BridgeConfig {
  baseUrl: string;
  userId: string;
  vaultDir: string;
  intervalMs: number;
}

function loadConfig(): BridgeConfig {
  loadDotEnv();
  const baseUrl = (process.env.PFA_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
  const userId = (process.env.PFA_USER_ID || '').trim();
  if (!userId) {
    console.error('[bridge] PFA_USER_ID is required. Set in .env (lấy từ localStorage `app_user_id`).');
    process.exit(1);
  }
  const vaultDir = pfaSubdir();
  const intervalMsRaw = Number(process.env.POLL_INTERVAL_MS || '45000');
  const intervalMs = Math.max(10_000, Number.isFinite(intervalMsRaw) ? intervalMsRaw : 45_000);
  return { baseUrl, userId, vaultDir, intervalMs };
}

async function tick(cfg: BridgeConfig): Promise<void> {
  const sourcesCfg: PfaSourcesConfig = { baseUrl: cfg.baseUrl, userId: cfg.userId };

  const [tickets, follows, alerts] = await Promise.all([
    fetchBetTickets(sourcesCfg),
    fetchFollowSubscriptions(sourcesCfg),
    fetchAlertHistory(sourcesCfg, 50),
  ]);

  const writes: Array<Promise<void>> = [];

  if (tickets) {
    writes.push(atomicWrite(path.join(cfg.vaultDir, 'bets-active.md'), renderActiveBets(tickets)));
    writes.push(atomicWrite(path.join(cfg.vaultDir, 'bets-history.md'), renderBetHistory(tickets)));
    writes.push(atomicWrite(path.join(cfg.vaultDir, 'summary.md'), renderSummary(tickets)));
  }
  if (follows) {
    writes.push(atomicWrite(path.join(cfg.vaultDir, 'follows.md'), renderFollows(follows)));
  }
  if (alerts) {
    writes.push(atomicWrite(path.join(cfg.vaultDir, 'alerts-today.md'), renderAlertsToday(alerts)));
  }

  const results = await Promise.allSettled(writes);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    for (const f of failed) console.warn('[bridge] write failed:', (f as PromiseRejectedResult).reason);
  }

  const stamp = new Date().toISOString();
  console.log(
    `[bridge] ${stamp} bets=${tickets?.length ?? 'n/a'} follows=${follows?.length ?? 'n/a'} alerts=${alerts?.length ?? 'n/a'} writes=${writes.length - failed.length}/${writes.length}`,
  );
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  await ensureDir(cfg.vaultDir);
  console.log(`[bridge] vault: ${cfg.vaultDir}`);
  console.log(`[bridge] PFA:   ${cfg.baseUrl} (user=${cfg.userId})`);
  console.log(`[bridge] poll:  every ${cfg.intervalMs}ms`);

  await tick(cfg);
  setInterval(() => {
    void tick(cfg).catch((e) => console.error('[bridge] tick error:', e));
  }, cfg.intervalMs);
}

void main().catch((err) => {
  console.error('[bridge] fatal:', err);
  process.exit(1);
});
