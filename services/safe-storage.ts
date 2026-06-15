/**
 * Bọc `localStorage.setItem` để xử lý `QuotaExceededError`: dọn dữ liệu của các trận
 * đã xem cũ nhất (theo `viewedMatchesHistory`) rồi thử ghi lại, tránh crash UI.
 */

/** Tất cả các prefix key per-match đang dùng trong app. */
const PER_MATCH_KEY_PREFIXES: ReadonlyArray<string> = [
  'statsHistory_',
  'gameEvents_',
  'alertHistory_',
  'ouSnapshots_',
  'ahSnapshots_',
  'ouSnapshots1_6_',
  'ahSnapshots1_5_',
  'mlSnapshots1_1_',
  'goalPredictionSnapshots_',
  'goalProbHistory_',
  'goalCloudAiEnabled_',
];

const VIEWED_HISTORY_KEY = 'viewedMatchesHistory';

function isQuotaExceeded(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'QuotaExceededError') return true;
  // Safari ném ra với name khác
  if ('code' in err && (err as { code?: number }).code === 22) return true;
  return /exceeded the quota|QuotaExceeded/i.test(err.message);
}

interface ViewedEntry {
  viewedAt?: number;
}

function readViewedHistory(): Record<string, ViewedEntry> | null {
  try {
    const raw = localStorage.getItem(VIEWED_HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ViewedEntry>) : null;
  } catch {
    return null;
  }
}

function removePerMatchKeys(matchId: string): void {
  for (const prefix of PER_MATCH_KEY_PREFIXES) {
    try {
      localStorage.removeItem(`${prefix}${matchId}`);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Xoá dữ liệu của các trận cũ nhất (trừ `keepMatchId`). Trả về số trận đã dọn.
 */
function pruneOldestMatches(keepMatchId: string | undefined): number {
  const history = readViewedHistory();
  if (!history) return 0;

  const sorted = Object.entries(history)
    .filter(([id]) => id !== keepMatchId)
    .sort((a, b) => (a[1]?.viewedAt ?? 0) - (b[1]?.viewedAt ?? 0));

  if (sorted.length === 0) return 0;

  // Dọn một nửa (tối thiểu 1) để khỏi phải retry nhiều lần.
  const removeCount = Math.max(1, Math.ceil(sorted.length / 2));
  const toRemove = sorted.slice(0, removeCount);

  for (const [id] of toRemove) {
    removePerMatchKeys(id);
    delete history[id];
  }

  try {
    localStorage.setItem(VIEWED_HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* nếu vẫn lỗi thì cứ kệ — caller sẽ retry hoặc fail mềm */
  }

  return toRemove.length;
}

export interface SafeSetItemOptions {
  /** Match id hiện tại — sẽ không bị dọn khi prune. */
  keepMatchId?: string;
  /** Hàm log lỗi tuỳ biến (mặc định console.warn). */
  onError?: (err: unknown, key: string) => void;
}

/**
 * Ghi an toàn vào localStorage. Trả về `true` nếu ghi thành công.
 * Khi gặp quota, tự dọn dữ liệu trận cũ và thử lại tối đa 3 lần.
 */
export function safeSetItem(key: string, value: string, opts: SafeSetItemOptions = {}): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaExceeded(err)) {
      (opts.onError ?? defaultErrorLogger)(err, key);
      return false;
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const pruned = pruneOldestMatches(opts.keepMatchId);
    if (pruned === 0) break;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      if (!isQuotaExceeded(retryErr)) {
        (opts.onError ?? defaultErrorLogger)(retryErr, key);
        return false;
      }
    }
  }

  console.warn(`[safeSetItem] Vượt quota localStorage cho key "${key}" dù đã dọn dữ liệu cũ.`);
  return false;
}

function defaultErrorLogger(err: unknown, key: string): void {
  console.warn(`[safeSetItem] Lỗi ghi localStorage key "${key}":`, err);
}
