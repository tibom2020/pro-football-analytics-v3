import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MatchInfo } from '../types';
import { Clock, EyeOff, RotateCcw, Trash2, ExternalLink } from 'lucide-react';
import {
  clearDismissed,
  DISMISSED_MATCHES_UPDATED_EVENT,
  loadDismissed,
  restoreMatch,
  type DismissedMatchMap,
} from '../services/dismissed-matches';

interface DismissedMatchesPanelProps {
  liveEvents: MatchInfo[];
  onOpenAnalysisInNewTab: (match: MatchInfo) => void;
  onDismissedChange?: (map: DismissedMatchMap) => void;
}

function formatDismissedAt(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DismissedMatchesPanel: React.FC<DismissedMatchesPanelProps> = ({
  liveEvents,
  onOpenAnalysisInNewTab,
  onDismissedChange,
}) => {
  const [dismissedMap, setDismissedMap] = useState<DismissedMatchMap>(() => loadDismissed());

  const liveById = useMemo(() => new Map(liveEvents.map((e) => [e.id, e])), [liveEvents]);

  const reload = useCallback(() => {
    const map = loadDismissed();
    setDismissedMap(map);
    onDismissedChange?.(map);
  }, [onDismissedChange]);

  useEffect(() => {
    reload();
    const onUpdated = () => reload();
    window.addEventListener(DISMISSED_MATCHES_UPDATED_EVENT, onUpdated);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'dismissedLiveMatches') reload();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DISMISSED_MATCHES_UPDATED_EVENT, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const sortedEntries = useMemo(
    () => Object.values(dismissedMap).sort((a, b) => b.dismissedAt - a.dismissedAt),
    [dismissedMap],
  );

  const handleRestore = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    const map = restoreMatch(matchId);
    setDismissedMap(map);
    onDismissedChange?.(map);
  };

  const handleClearAll = () => {
    if (!window.confirm('Xóa toàn bộ danh sách trận đã bỏ qua?')) return;
    const map = clearDismissed();
    setDismissedMap(map);
    onDismissedChange?.(map);
  };

  if (sortedEntries.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-300 dark:border-slate-700 max-w-[1400px] mx-auto">
        <EyeOff className="w-10 h-10 mx-auto mb-3 text-slate-400" />
        <p className="font-semibold text-lg">Chưa có trận nào bị bỏ qua</p>
        <p className="text-sm mt-1">Trên tab Trực tiếp, bấm biểu tượng mắt gạch để ẩn trận không cần theo dõi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {sortedEntries.length} trận · không fetch Odds &amp; Δ khi bỏ qua
        </p>
        <button
          type="button"
          onClick={handleClearAll}
          className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-md font-semibold"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
        </button>
      </div>

      {sortedEntries.map(({ match, dismissedAt }) => {
        const live = liveById.get(match.id);
        const isLive = live != null;
        const display = live ?? match;
        const scoreHome = display.ss ? display.ss.split('-')[0] : '0';
        const scoreAway = display.ss ? display.ss.split('-')[1] : '0';

        return (
          <div
            key={match.id}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800"
          >
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md truncate max-w-[70%]">
                {match.league.name}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                    isLive
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isLive ? 'Đang live' : 'Đã kết thúc'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Bỏ qua {formatDismissedAt(dismissedAt)}
                </span>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-red-600 dark:text-red-400 line-clamp-1 pr-2">
                  {match.home.name}
                </span>
                <span className="font-bold text-sm bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {scoreHome}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-orange-600 dark:text-orange-400 line-clamp-1 pr-2">
                  {match.away.name}
                </span>
                <span className="font-bold text-sm bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {scoreAway}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3 mr-1" />
                {isLive ? `${display.timer?.tm || display.time || '0'}'` : 'FT'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAnalysisInNewTab(match);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 px-2.5 py-1.5 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Phân tích
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRestore(e, match.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
