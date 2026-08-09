/**
 * URL trang xem trực tiếp do user dán cho từng trận — lưu localStorage theo matchId.
 */
import { safeSetItem } from './safe-storage';

export const MATCH_LIVE_VIDEO_KEY = (matchId: string): string => `matchLiveVideoUrl_${matchId}`;

/** Chuẩn hóa URL: trim; thiếu scheme → https:// */
export function normalizeLiveVideoUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  // Không nhận chuỗi không giống URL
  if (!/^[a-z0-9.-]+\.[a-z]{2,}/i.test(t) && !t.includes('/')) return null;
  return `https://${t}`;
}

export function loadMatchLiveVideoUrl(matchId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MATCH_LIVE_VIDEO_KEY(matchId));
    if (!raw) return null;
    return normalizeLiveVideoUrl(raw);
  } catch {
    return null;
  }
}

export function saveMatchLiveVideoUrl(matchId: string, url: string): string | null {
  const normalized = normalizeLiveVideoUrl(url);
  if (!normalized) return null;
  try {
    safeSetItem(MATCH_LIVE_VIDEO_KEY(matchId), normalized, { keepMatchId: matchId });
  } catch {
    /* quota */
  }
  return normalized;
}

export function clearMatchLiveVideoUrl(matchId: string): void {
  try {
    localStorage.removeItem(MATCH_LIVE_VIDEO_KEY(matchId));
  } catch {
    /* ignore */
  }
}

/** Mở / focus cửa sổ video riêng theo trận (tên cố định → không mở trùng). */
export function openMatchLiveVideoWindow(matchId: string, url: string): Window | null {
  const normalized = normalizeLiveVideoUrl(url);
  if (!normalized) return null;
  return window.open(
    normalized,
    `pfa-video-${matchId}`,
    'noopener,noreferrer,width=960,height=540',
  );
}
