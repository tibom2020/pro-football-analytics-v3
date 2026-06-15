import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { OddsSubscription } from '../ai-assistant-core/types.js';
import type { OddsMonitor } from '../odds-monitor/monitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/follow_subscriptions.json');

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveFollowSubscriptions(monitor: OddsMonitor): void {
  try {
    ensureDir();
    const subs = monitor.getSubscriptions();
    fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2), 'utf8');
  } catch (e) {
    console.error('[follow-subscriptions-persistence] Failed to persist:', e);
  }
}

export function restoreFollowSubscriptions(monitor: OddsMonitor): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as OddsSubscription[];
    if (!Array.isArray(parsed)) return;
    for (const sub of parsed) {
      if (sub?.active && sub.id && sub.userId && sub.matchId) {
        monitor.restoreSubscription(sub);
      }
    }
    const n = parsed.filter(s => s.active).length;
    console.info(`[follow-subscriptions-persistence] Restored ${n} follow subscription(s) from disk`);
  } catch (e) {
    console.error('[follow-subscriptions-persistence] Failed to restore:', e);
  }
}
