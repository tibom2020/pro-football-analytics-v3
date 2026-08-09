import React, { useEffect, useState } from 'react';
import { ExternalLink, Trash2, Video, ChevronDown, ChevronUp } from 'lucide-react';
import {
  clearMatchLiveVideoUrl,
  loadMatchLiveVideoUrl,
  openMatchLiveVideoWindow,
  saveMatchLiveVideoUrl,
} from '../services/match-live-video';

/** Ô dán link xem trực tiếp — thử iframe; trang chặn embed thì mở cửa sổ riêng. */
export const MatchLiveVideoPanel: React.FC<{ matchId: string }> = ({ matchId }) => {
  const [draft, setDraft] = useState('');
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const url = loadMatchLiveVideoUrl(matchId);
    setSavedUrl(url);
    setDraft(url ?? '');
    setExpanded(!!url);
    setSaveError(null);
  }, [matchId]);

  const handleSave = () => {
    const next = saveMatchLiveVideoUrl(matchId, draft);
    if (!next) {
      setSaveError('URL không hợp lệ.');
      return;
    }
    setSavedUrl(next);
    setDraft(next);
    setSaveError(null);
    setExpanded(true);
  };

  const handleClear = () => {
    clearMatchLiveVideoUrl(matchId);
    setSavedUrl(null);
    setDraft('');
    setSaveError(null);
  };

  const handleOpenWindow = () => {
    const url = savedUrl || draft;
    if (!url.trim()) {
      setSaveError('Chưa có URL.');
      return;
    }
    const opened = openMatchLiveVideoWindow(matchId, url);
    if (!opened) {
      setSaveError('Trình duyệt chặn popup — cho phép popup rồi thử lại.');
    } else {
      setSaveError(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
          <Video className="w-4 h-4 text-rose-500" /> Live video
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-1.5">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder="Dán link trang xem trực tiếp…"
          className="flex-1 min-w-0 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-rose-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={handleOpenWindow}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Mở cửa sổ video riêng (khuyên dùng khi trang chặn iframe)"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Cửa sổ
          </button>
          {savedUrl ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-500"
              title="Xóa link đã lưu"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <p className="mt-1.5 text-[11px] text-red-500">{saveError}</p>
      ) : (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          Nhiều trang chặn nhúng — dùng nút Cửa sổ để video chạy khi chuyển tab.
        </p>
      )}

      {expanded && savedUrl ? (
        <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black aspect-video max-h-64">
          <iframe
            key={savedUrl}
            src={savedUrl}
            title="Live video trận"
            className="w-full h-full min-h-[12rem]"
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
    </div>
  );
};
