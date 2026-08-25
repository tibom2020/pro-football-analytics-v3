import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/strong_neg_delta_sent.json');

type StoreFile = {
  keys: string[];
  updatedAt: number;
};

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): StoreFile {
  try {
    if (!fs.existsSync(DATA_FILE)) return { keys: [], updatedAt: 0 };
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as StoreFile;
    if (!parsed || !Array.isArray(parsed.keys)) return { keys: [], updatedAt: 0 };
    return { keys: parsed.keys.filter((k) => typeof k === 'string'), updatedAt: parsed.updatedAt ?? 0 };
  } catch {
    return { keys: [], updatedAt: 0 };
  }
}

function writeStore(store: StoreFile): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

/** Trả true nếu key mới (chưa gửi) — ghi file ngay. */
export function tryMarkStrongNegDeltaSent(key: string): boolean {
  const store = readStore();
  if (store.keys.includes(key)) return false;
  store.keys.push(key);
  store.updatedAt = Date.now();
  writeStore(store);
  return true;
}

/** Chỉ dùng trong test — xóa file dedupe. */
export function clearStrongNegDeltaSentForTests(): void {
  try {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  } catch {
    /* ignore */
  }
}

export function getStrongNegDeltaSentPathForTests(): string {
  return DATA_FILE;
}
