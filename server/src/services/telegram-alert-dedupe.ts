/**
 * Tránh gửi trùng cùng một bản ghi Nhật ký (theo khóa ổn định).
 * Khóa ví dụ: `nj:${subscriptionId}:${alertId}` → mỗi `alert.id` (UUID) một lần gửi Telegram.
 */

const TTL_MS = 120_000;
const store = new Map<string, number>(); // key -> expiryAt

function prune(now: number): void {
  for (const [k, exp] of store) {
    if (exp <= now) store.delete(k);
  }
}

export function tryReserveDedupeKey(key: string): boolean {
  const now = Date.now();
  prune(now);
  if (store.has(key)) return false;
  store.set(key, now + TTL_MS);
  return true;
}
