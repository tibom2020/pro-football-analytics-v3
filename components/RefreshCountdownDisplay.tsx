import React from 'react';
import { Loader2, Pause, RefreshCw, Timer } from 'lucide-react';

export interface RefreshCountdownItemProps {
  title: string;
  subtitle?: string;
  label: string;
  progress?: number;
  paused?: boolean;
  busy?: boolean;
  accent?: 'blue' | 'violet';
  /** Ẩn thanh progress (vd. chế độ đếm thời gian đã trôi). */
  hideProgress?: boolean;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  refreshLabel?: string;
}

export const RefreshCountdownItem: React.FC<RefreshCountdownItemProps> = ({
  title,
  subtitle,
  label,
  progress = 0,
  paused = false,
  busy = false,
  accent = 'blue',
  hideProgress = false,
  onRefresh,
  refreshDisabled = false,
  refreshLabel = 'Refresh Odds & Δ',
}) => {
  const bar =
    accent === 'violet'
      ? 'bg-violet-500 dark:bg-violet-400'
      : 'bg-blue-500 dark:bg-blue-400';
  const ring =
    accent === 'violet'
      ? 'border-violet-200 dark:border-violet-800/80'
      : 'border-blue-200 dark:border-blue-800/80';
  const text =
    accent === 'violet'
      ? 'text-violet-700 dark:text-violet-300'
      : 'text-blue-700 dark:text-blue-300';

  return (
    <div
      className={`flex-1 min-w-[140px] rounded-2xl border ${ring} bg-white/80 dark:bg-slate-900/50 px-3 py-2.5 shadow-sm`}
      title={subtitle ?? title}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </div>
          {subtitle ? (
            <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{subtitle}</div>
          ) : null}
        </div>
        {busy ? (
          <Loader2 className={`w-3.5 h-3.5 shrink-0 animate-spin ${text}`} />
        ) : paused ? (
          <Pause className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        ) : (
          <Timer className={`w-3.5 h-3.5 shrink-0 ${text}`} />
        )}
      </div>
      <div className={`font-mono text-xl font-black tabular-nums leading-none ${text}`}>
        {label}
      </div>
      {!hideProgress ? (
        <div className="mt-2 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${bar}`}
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </div>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshDisabled || busy}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            accent === 'violet'
              ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-300 dark:border-violet-700 hover:bg-violet-200/80 dark:hover:bg-violet-900/60'
              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700 hover:bg-blue-200/80 dark:hover:bg-blue-900/60'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          {refreshLabel}
        </button>
      ) : null}
      {paused ? (
        <div className="mt-1 text-[9px] font-medium text-slate-400 dark:text-slate-500">Tab ẩn · tạm dừng</div>
      ) : null}
    </div>
  );
};

export const RefreshCountdownRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col sm:flex-row gap-3 w-full">{children}</div>
);
