import React from 'react';
import { Loader2, Pin, Sparkles, X } from 'lucide-react';
import { pinnedChartKey, type PinnedChart } from '../services/pinned-charts';

/**
 * Thanh ghim (dính dưới header Dashboard) — mỗi nút là 1 trận tương tự đã ghim.
 * Bấm thân nút → mở lại biểu đồ trận đó; bấm ✕ → bỏ ghim; bấm ✨ → xem/lưu AI phân tích.
 */
export const PinnedChartsBar: React.FC<{
  pins: PinnedChart[];
  openKeys?: Set<string>;
  analyzingKey?: string | null;
  savedAiByPinKey?: Record<string, { score?: number; ts: number }>;
  onOpen: (index: number) => void;
  onRemove: (pin: PinnedChart) => void;
  onAnalyze?: (pin: PinnedChart, forceRefresh?: boolean) => void;
}> = ({ pins, openKeys, analyzingKey, savedAiByPinKey, onOpen, onRemove, onAnalyze }) => {
  if (pins.length === 0) return null;
  return (
    <div className="bg-amber-50/95 dark:bg-slate-900/95 border-t border-amber-200 dark:border-slate-800 px-4 py-1.5">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <Pin className="w-3 h-3" fill="currentColor" />
          Đã ghim
        </span>
        {pins.map((p, i) => {
          const key = pinnedChartKey(p);
          const isOpen = openKeys?.has(key) ?? false;
          const isAnalyzing = analyzingKey === key;
          const savedAi = savedAiByPinKey?.[key];
          return (
          <div
            key={key}
            className={`flex-shrink-0 flex items-center rounded-md border overflow-hidden ${
              isOpen
                ? 'border-amber-500 dark:border-amber-400 ring-1 ring-amber-400/60 bg-amber-50 dark:bg-amber-950/40'
                : 'border-amber-300 dark:border-slate-600 bg-white dark:bg-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => onOpen(i)}
              className={`flex flex-col items-start px-2 py-1 max-w-[180px] ${
                isOpen
                  ? 'hover:bg-amber-100/80 dark:hover:bg-amber-900/30'
                  : 'hover:bg-amber-100 dark:hover:bg-slate-700'
              }`}
              title={isOpen ? `Đang mở — bấm để đóng: ${p.team}` : `Mở biểu đồ Tài/Xỉu (1_3): ${p.team}`}
            >
              <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[170px]">
                {p.team}
              </span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400">
                {p.half != null ? `H${p.half} · ${p.minute ?? '—'}'` : '—'}
                {p.ft ? ` · CK ${p.ft}` : ''}
              </span>
            </button>
            {onAnalyze && (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={(e) => onAnalyze(p, e.shiftKey)}
                className={`relative px-1.5 self-stretch flex items-center gap-0.5 border-l border-amber-200 dark:border-slate-600 disabled:opacity-60 ${
                  savedAi
                    ? 'text-violet-600 dark:text-violet-300 bg-violet-50/80 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40'
                    : 'text-violet-500 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                }`}
                title={
                  savedAi
                    ? `Xem bản AI đã lưu${savedAi.score != null ? ` (${savedAi.score}%)` : ''} · Shift+bấm phân tích lại`
                    : 'DeepSeek phân tích độ giống trận ghim vs trận đang xem (kèo, line chạy, áp lực, sút…)'
                }
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    {savedAi?.score != null && (
                      <span className="text-[8px] font-bold leading-none">{savedAi.score}</span>
                    )}
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(p)}
              className="px-1.5 self-stretch flex items-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 border-l border-amber-200 dark:border-slate-600"
              title="Bỏ ghim"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
};
