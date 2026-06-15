import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TelegramSender } from '../notification-service/telegram-sender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/telegram_bindings.json');

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Saves Telegram user -> chat mappings to disk.
 */
export function saveTelegramBindings(sender: TelegramSender): void {
  try {
    ensureDir();
    const bindings = sender.getBindings();
    fs.writeFileSync(DATA_FILE, JSON.stringify(bindings, null, 2), 'utf8');
  } catch (e) {
    console.error('[telegram-persistence] Failed to save bindings:', e);
  }
}

/**
 * Restores Telegram user -> chat mappings from disk.
 */
export function restoreTelegramBindings(sender: TelegramSender): void {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.info('[telegram-persistence] No existing bindings found');
      return;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (parsed && typeof parsed === 'object') {
      sender.setBindings(parsed);
      const count = Object.keys(parsed).length;
      console.info(`[telegram-persistence] Restored ${count} Telegram binding(s) from disk`);
    }
  } catch (e) {
    console.error('[telegram-persistence] Failed to restore bindings:', e);
  }
}
