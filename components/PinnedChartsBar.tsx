import React from 'react';
import { Pin, X } from 'lucide-react';
import type { PinnedChart } from '../services/pinned-charts';

/**
 * Thanh ghim (dính dưới header Dashboard) — mỗi nút là 1 trận tương tự đã ghim.
 * Bấm thân nút → mở lại biểu đồ trận đó; bấm ✕ → bỏ ghim.
 */
export const PinnedChartsBar: React.FC<{
  pins: PinnedChart[];
  onOpen: (index: number) => void;
  onRemove: (pin: PinnedChart) => void;
}> = ({ pins, onOpen, onRemove }) => {
  if (pins.length === 0) return null;
  return (
    <div className="bg-amber-50/95 dark:bg-slate-900/95 border-t border-amber-200 dark:border-slate-800 px-4 py-1.5">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <Pin className="w-3 h-3" fill="currentColor" />
          Đã ghim
        </span>
        {pins.map((p, i) => (
          <div
            key={`${p.sourceMatchId ?? ''}-${p.matchId}`}
            className="flex-shrink-0 flex items-center rounded-md border border-amber-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onOpen(i)}
              className="flex flex-col items-start px-2 py-1 hover:bg-amber-100 dark:hover:bg-slate-700 max-w-[180px]"
              title={`Mở biểu đồ Tài/Xỉu (1_3): ${p.team}`}
            >
              <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[170px]">
                {p.team}
              </span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400">
                {p.half != null ? `H${p.half} · ${p.minute ?? '—'}'` : '—'}
                {p.ft ? ` · CK ${p.ft}` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(p)}
              className="px-1.5 self-stretch flex items-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 border-l border-amber-200 dark:border-slate-600"
              title="Bỏ ghim"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
