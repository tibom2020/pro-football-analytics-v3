/**
 * Nhận định người dùng tự ghi cho từng trận — lưu localStorage, xuất vào .md (RAG sau này),
 * và hiển thị lại ở bảng so sánh. Mỗi nhận định gắn mốc hiệp/phút + đánh giá YES/NO.
 */
import { safeSetItem } from './safe-storage';

export type NoteVerdict = 'yes' | 'no' | null;

export interface MatchNote {
  id: string;
  text: string;
  half: 1 | 2;
  minute: number;
  /** Unix ms lúc lưu. */
  ts: number;
  /** Người dùng tự đánh giá đúng/sai: YES / NO / chưa chọn. */
  verdict?: NoteVerdict;
}

export const MATCH_NOTES_KEY = (matchId: string): string => `matchNotes_${matchId}`;

export function loadMatchNotes(matchId: string): MatchNote[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MATCH_NOTES_KEY(matchId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as MatchNote[]) : [];
  } catch {
    return [];
  }
}

export function saveMatchNotes(matchId: string, notes: MatchNote[]): void {
  try {
    safeSetItem(MATCH_NOTES_KEY(matchId), JSON.stringify(notes), { keepMatchId: matchId });
  } catch {
    // quota — bỏ qua, state phiên hiện tại vẫn còn
  }
}
