import React, { useEffect, useState } from 'react';
import { StickyNote, Trash2, Plus } from 'lucide-react';
import {
  loadMatchNotes,
  saveMatchNotes,
  MATCH_NOTES_UPDATED_EVENT,
  type MatchNote,
  type NoteVerdict,
} from '../services/match-notes';

/** Ô ghi chú nhận định riêng cho từng trận (lưu localStorage + xuất .md, kèm mốc phút/hiệp + YES/NO). */
export const MatchNotesPanel: React.FC<{
  matchId: string;
  /** Hiệp hiện tại của trận (để gắn mốc khi lưu). */
  half: 1 | 2;
  /** Phút hiện tại của trận (để gắn mốc khi lưu). */
  minute: number;
}> = ({ matchId, half, minute }) => {
  const [notes, setNotes] = useState<MatchNote[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setNotes(loadMatchNotes(matchId));
    setDraft('');
  }, [matchId]);

  useEffect(() => {
    const reload = (e: Event) => {
      const detail = (e as CustomEvent<{ matchId?: string }>).detail;
      if (detail?.matchId && detail.matchId !== matchId) return;
      setNotes(loadMatchNotes(matchId));
    };
    window.addEventListener(MATCH_NOTES_UPDATED_EVENT, reload);
    return () => window.removeEventListener(MATCH_NOTES_UPDATED_EVENT, reload);
  }, [matchId]);

  const persist = (next: MatchNote[]) => {
    setNotes(next);
    saveMatchNotes(matchId, next);
  };

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const note: MatchNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      half: half === 2 ? 2 : 1,
      minute: Number.isFinite(minute) ? minute : 0,
      ts: Date.now(),
      verdict: null,
    };
    persist([note, ...notes]); // mới nhất lên đầu
    setDraft('');
  };

  const removeNote = (id: string) => persist(notes.filter((n) => n.id !== id));

  /** Bấm YES/NO — bấm lại cùng ô để bỏ chọn. */
  const setVerdict = (id: string, v: 'yes' | 'no') =>
    persist(notes.map((n) => (n.id === id ? { ...n, verdict: (n.verdict === v ? null : v) as NoteVerdict } : n)));

  const fmtTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
          <StickyNote className="w-4 h-4 text-amber-500" /> Nhận định của tôi
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{notes.length} ghi chú</span>
      </div>

      {/* Soạn ghi chú — lưu kèm mốc H{half} {minute}' hiện tại */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            Ghi chú tại H{half} · {minute}'
          </span>
          <span className="text-[10px] text-slate-400">Ctrl/⌘ + Enter để lưu</span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="Nhập nhận định của bạn về trận này..."
          rows={2}
          className="w-full resize-y rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={addNote}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Lưu nhận định
          </button>
        </div>
      </div>

      {/* Danh sách nhận định đã lưu */}
      {notes.length === 0 ? (
        <p className="mt-3 text-xs text-center text-slate-400 dark:text-slate-500 py-2">
          Chưa có nhận định nào cho trận này.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 max-h-72 overflow-auto">
          {notes.map((n) => (
            <li
              key={n.id}
              className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      n.half === 2
                        ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    H{n.half} · {n.minute}'
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">{fmtTime(n.ts)}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {/* 2 ô tích YES / NO */}
                  <button
                    type="button"
                    onClick={() => setVerdict(n.id, 'yes')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      n.verdict === 'yes'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-emerald-400'
                    }`}
                    title="Đánh giá: YES"
                  >
                    ✓ YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerdict(n.id, 'no')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      n.verdict === 'no'
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-red-400'
                    }`}
                    title="Đánh giá: NO"
                  >
                    ✕ NO
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNote(n.id)}
                    className="ml-0.5 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
                    title="Xoá ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">
                {n.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
