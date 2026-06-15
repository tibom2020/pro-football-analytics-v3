const LS_APP_USER_ID = 'app_user_id';

function newUserId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Khi cả LS/SS đều lỗi — một id cho cả phiên tab (không đổi mỗi lần gọi). */
let memoryOnlyUserId: string | null = null;

/**
 * Định danh ổn định trên trình duyệt (map tới Telegram / theo dõi trận trên server).
 * Trước đây `catch` trả `anon_${Date.now()}` → mỗi request một userId khác → theo dõi luôn lỗi.
 */
export function getAppUserId(): string {
  try {
    let id = localStorage.getItem(LS_APP_USER_ID);
    if (!id || id.length < 8) {
      id = newUserId();
      localStorage.setItem(LS_APP_USER_ID, id);
    }
    return id;
  } catch {
    /* private mode / chặn cookie: thử sessionStorage rồi bộ nhớ tạm */
  }
  try {
    let id = sessionStorage.getItem(LS_APP_USER_ID);
    if (!id || id.length < 8) {
      id = newUserId();
      sessionStorage.setItem(LS_APP_USER_ID, id);
    }
    return id;
  } catch {
    /* ignore */
  }
  if (!memoryOnlyUserId) memoryOnlyUserId = newUserId();
  return memoryOnlyUserId;
}
