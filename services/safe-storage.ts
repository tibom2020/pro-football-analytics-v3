/**
 * Bọc `localStorage.setItem` để xử lý `QuotaExceededError`: dọn dữ liệu của các trận
 * đã xem cũ nhất (theo `viewedMatchesHistory`) rồi thử ghi lại, tránh crash UI.
 *
 * Lưu ý: quota localStorage do trình duyệt cố định (~5–10 MB), app không tăng được.
 * Chỉ có thể dọn dữ liệu cũ / giữ ít trận hơn để còn chỗ ghi trận mới.
 */

/** Prefix key per-match — khi prune sẽ xoá `${prefix}${matchId}`. */
const PER_MATCH_KEY_PREFIXES: ReadonlyArray<string> = [
  'statsHistory_',
  'gameEvents_',
  'alertHistory_',
  'ouSnapshots_',
  'ahSnapshots_',
  'ouSnapshots1_6_',
  'ouUnderSnapshots_',
  'ouUnderSnapshots1_6_',
  'ouHighOverSnapshots_',
  'ouHighOverSnapshots1_6_',
  'ahSnapshots1_5_',
  'mlSnapshots1_1_',
  'goalPredictionSnapshots_',
  'similarMatchSnapshots_',
  'similarMatchLinks_',
  'goalProbHistory_',
  'goalCloudAiEnabled_',
  'matchNotes_',
  'matchLiveVideoUrl_',
  'matchMdAutoSaved_',
  'pinnedAiAnalysis_',
  'autoSimilarOnLineChange_',
  'pfa_tai_odds_watch_',
  'pfa_xiu_odds_watch_',
  'pfa_follow_sub_id_',
];

const VIEWED_HISTORY_KEY = 'viewedMatchesHistory';

/** Số trận cũ dọn mỗi lần gặp quota (mạnh hơn trước — trước chỉ 1 trận/lần). */
const PRUNE_BATCH_SIZE = 4;
/** Số lần thử lại sau khi dọn. */
const QUOTA_RETRY_ATTEMPTS = 16;

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

/** Xoá mọi key gắn với một matchId (prefix cố định + quét key chứa `_id` / `_id_`). */
export function removePerMatchKeys(matchId: string): void {
  const id = String(matchId).trim();
  if (!id) return;

  for (const prefix of PER_MATCH_KEY_PREFIXES) {
    try {
      localStorage.removeItem(`${prefix}${id}`);
    } catch {
      /* ignore */
    }
  }

  // Fire-hint: pfa_ouw_fire_${id}_tai|xiu
  try {
    localStorage.removeItem(`pfa_ouw_fire_${id}_tai`);
    localStorage.removeItem(`pfa_ouw_fire_${id}_xiu`);
  } catch {
    /* ignore */
  }

  const suffix = `_${id}`;
  const infix = `_${id}_`;
  const toRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k === VIEWED_HISTORY_KEY) continue;
      if (k.endsWith(suffix) || k.includes(infix)) toRemove.push(k);
    }
  } catch {
    /* ignore */
  }
  for (const k of toRemove) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Xoá dữ liệu nặng per-match của các trận cũ nhất (trừ `keepMatchId`).
 * KHÔNG xoá mục trong viewedMatchesHistory — tab "Đã xem" vẫn giữ danh sách trận.
 * Trả về số trận đã dọn dữ liệu.
 */
function pruneOldestMatchData(keepMatchId: string | undefined, batchSize = 1): number {
  const history = readViewedHistory();
  if (!history) return 0;

  const sorted = Object.entries(history)
    .filter(([id]) => id !== keepMatchId)
    .sort((a, b) => (a[1]?.viewedAt ?? 0) - (b[1]?.viewedAt ?? 0));

  if (sorted.length === 0) return 0;

  const n = Math.min(batchSize, sorted.length);
  for (let i = 0; i < n; i++) {
    removePerMatchKeys(sorted[i]![0]);
  }
  return n;
}

/**
 * Giữ dữ liệu odds/stats cho `keepRecent` trận xem gần nhất (+ `keepMatchId` nếu có);
 * dọn phần còn lại. Dùng nút "Dọn cache" trên UI.
 * Trả về số trận đã dọn.
 */
export function clearMatchCacheKeepingRecent(
  keepRecent = 20,
  keepMatchId?: string,
): number {
  const history = readViewedHistory();
  if (!history) return 0;

  const sortedNewestFirst = Object.entries(history).sort(
    (a, b) => (b[1]?.viewedAt ?? 0) - (a[1]?.viewedAt ?? 0),
  );

  const keep = new Set<string>();
  if (keepMatchId) keep.add(String(keepMatchId));
  for (const [id] of sortedNewestFirst.slice(0, Math.max(0, keepRecent))) {
    keep.add(id);
  }

  let cleared = 0;
  for (const [id] of sortedNewestFirst) {
    if (keep.has(id)) continue;
    removePerMatchKeys(id);
    cleared += 1;
  }
  return cleared;
}

/** Ước lượng dung lượng localStorage (bytes UTF-16 ≈ 2 × độ dài chuỗi). */
export function estimateLocalStorageBytes(): { bytes: number; keys: number } {
  let chars = 0;
  let keys = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      keys += 1;
      chars += k.length;
      const v = localStorage.getItem(k);
      if (v) chars += v.length;
    }
  } catch {
    /* ignore */
  }
  return { bytes: chars * 2, keys };
}

export interface SafeSetItemOptions {
  /** Match id hiện tại — sẽ không bị dọn khi prune. */
  keepMatchId?: string;
  /** Hàm log lỗi tuỳ biến (mặc định console.warn). */
  onError?: (err: unknown, key: string) => void;
}

/**
 * Ghi an toàn vào localStorage. Trả về `true` nếu ghi thành công.
 * Khi gặp quota, tự dọn dữ liệu trận cũ (theo lô) và thử lại.
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

  for (let attempt = 0; attempt < QUOTA_RETRY_ATTEMPTS; attempt++) {
    const pruned = pruneOldestMatchData(opts.keepMatchId, PRUNE_BATCH_SIZE);
    if (pruned === 0) break;
    try {
      localStorage.setItem(key, value);
      if (attempt > 0) {
        console.info(
          `[safeSetItem] Đã dọn cache trận cũ (lần ${attempt + 1}) rồi ghi lại key "${key}".`,
        );
      }
      return true;
    } catch (retryErr) {
      if (!isQuotaExceeded(retryErr)) {
        (opts.onError ?? defaultErrorLogger)(retryErr, key);
        return false;
      }
    }
  }

  console.warn(
    `[safeSetItem] Vượt quota localStorage cho key "${key}" dù đã dọn dữ liệu cũ. ` +
      `Quota trình duyệt ~5–10MB — hãy dùng "Dọn cache trận cũ" ở tab Đã xem, hoặc xoá site data.`,
  );
  return false;
}

function defaultErrorLogger(err: unknown, key: string): void {
  console.warn(`[safeSetItem] Lỗi ghi localStorage key "${key}":`, err);
}
