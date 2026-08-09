/**
 * Nhận định người dùng tự ghi cho từng trận — lưu localStorage, xuất vào .md (RAG sau này),
 * và hiển thị lại ở bảng so sánh. Mỗi nhận định gắn mốc hiệp/phút + đánh giá YES/NO.
 * Cũng nhận note tự động từ cảnh báo hạ line Tài / bàn thắng trên tab trận.
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

/** Panel nhận định reload list khi Dashboard append note từ toast. */
export const MATCH_NOTES_UPDATED_EVENT = 'match-notes-updated';

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

function dispatchNotesUpdated(matchId: string): void {
  try {
    window.dispatchEvent(new CustomEvent(MATCH_NOTES_UPDATED_EVENT, { detail: { matchId } }));
  } catch {
    /* ignore */
  }
}

/**
 * Thêm note vào đầu danh sách trận (mới nhất trước).
 * `dedupeKey` → id ổn định `auto-…` để không ghi trùng khi refresh.
 */
export function appendMatchNote(
  matchId: string,
  input: {
    text: string;
    half: 1 | 2;
    minute: number;
    /** Khóa chống trùng (vd. fireKey hạ line / score+phút bàn). */
    dedupeKey?: string;
  },
): MatchNote | null {
  const text = input.text.trim();
  if (!text) return null;
  const half = input.half === 2 ? 2 : 1;
  const minute = Number.isFinite(input.minute) ? Math.max(0, Math.round(input.minute)) : 0;
  const prev = loadMatchNotes(matchId);

  const id = input.dedupeKey
    ? `auto-${input.dedupeKey.replace(/[^a-zA-Z0-9:_.,>-]/g, '_').slice(0, 80)}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (prev.some((n) => n.id === id)) return null;
  if (
    !input.dedupeKey &&
    prev.some(
      (n) => n.half === half && n.minute === minute && n.text === text && Date.now() - n.ts < 60_000,
    )
  ) {
    return null;
  }

  const note: MatchNote = {
    id,
    text,
    half,
    minute,
    ts: Date.now(),
    verdict: null,
  };
  saveMatchNotes(matchId, [note, ...prev]);
  dispatchNotesUpdated(matchId);
  return note;
}
