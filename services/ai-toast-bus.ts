/**
 * AI Assistant Toast Bus
 * --------------------------------------------------------------------------
 * Bus phát/nhận cảnh báo "suy nghĩ" hiển thị dạng bong bóng cạnh nút Bot AI.
 *
 * - Cùng tab: dùng `window.dispatchEvent(CustomEvent)` để mọi component cùng
 *   tab nhận tức thời.
 * - Khác tab (cùng origin): dùng `BroadcastChannel` để mở nhiều trận khác nhau
 *   trên các tab vẫn thấy cảnh báo của nhau (mỗi toast gắn `matchLabel`).
 * - Mỗi toast mặc định tự mờ và biến mất sau ~10s ở phía hiển thị.
 */

export type AiToastType = 'pressure' | 'tai' | 'xiu' | 'line_change' | 'info';

export interface AiToastPayload {
  /** ID duy nhất để render và tránh trùng giữa các tab. */
  id: string;
  /** Trận phát ra (dùng để lọc + hiển thị nhãn ở tab khác). */
  matchId: string | number;
  /** Nhãn ngắn gọn của trận, vd: "Arsenal vs Chelsea (37')". */
  matchLabel: string;
  /** Loại cảnh báo (đổi màu/icon ở UI). */
  type: AiToastType;
  /** Tiêu đề bong bóng. */
  title: string;
  /** Nội dung phụ ngắn (1–2 dòng). */
  body?: string;
  /** Nội dung chi tiết đa dòng (giữ \n) — render ở chế độ "Xem chi tiết". */
  bodyLong?: string;
  /** Thời điểm phát (ms epoch). */
  timestamp: number;
  /** Phút đồng hồ trận khi phát (nếu có) — để hiển thị ngữ cảnh. */
  minute?: number;
  /** Tab nguồn (random per page) — bỏ qua nếu trùng tab nhận. */
  source?: string;
}

const CHANNEL_NAME = 'pfa-ai-toast-bus';
const WINDOW_EVENT = 'pfa:ai-toast';

/** ID phiên tab này (đặt một lần khi module load). */
const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab_${Math.random().toString(36).slice(2)}_${Date.now()}`;

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (channel) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev) => {
      const data = ev?.data as AiToastPayload | undefined;
      if (!data || typeof data !== 'object') return;
      // Bỏ qua message do chính tab này phát — đã nhận qua window event.
      if (data.source && data.source === TAB_ID) return;
      window.dispatchEvent(new CustomEvent<AiToastPayload>(WINDOW_EVENT, { detail: data }));
    };
  } catch {
    channel = null;
  }
  return channel;
}

/** Sinh ID toast ổn định, ưu tiên randomUUID. */
function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Phát một toast: cùng tab + tất cả tab khác cùng origin. */
export function publishAiToast(
  input: Omit<AiToastPayload, 'id' | 'timestamp' | 'source'> & { id?: string; timestamp?: number },
): AiToastPayload {
  const payload: AiToastPayload = {
    id: input.id ?? makeId(),
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    type: input.type,
    title: input.title,
    body: input.body,
    bodyLong: input.bodyLong,
    minute: input.minute,
    timestamp: input.timestamp ?? Date.now(),
    source: TAB_ID,
  };

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent<AiToastPayload>(WINDOW_EVENT, { detail: payload }));
    } catch {
      /* ignore */
    }
  }
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(payload);
    } catch {
      /* ignore */
    }
  }
  return payload;
}

/** Đăng ký nhận toast (cả nội bộ + từ tab khác). Trả về hàm huỷ. */
export function subscribeAiToasts(handler: (toast: AiToastPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // Đảm bảo channel khởi tạo để forward message từ tab khác.
  getChannel();
  const wrapped = (ev: Event) => {
    const ce = ev as CustomEvent<AiToastPayload>;
    if (ce?.detail) handler(ce.detail);
  };
  window.addEventListener(WINDOW_EVENT, wrapped);
  return () => window.removeEventListener(WINDOW_EVENT, wrapped);
}

/** ID tab hiện tại (debug / phân biệt nguồn phát). */
export function getAiToastTabId(): string {
  return TAB_ID;
}
