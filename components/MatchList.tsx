import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MatchInfo, ViewedMatchHistory } from '../types';
import { Clock, Star, Activity, Eye } from 'lucide-react';
import { VIEWED_MATCHES_HISTORY_UPDATED_EVENT } from '../services/match-markdown-export';
import { fetchOpeningLinesForMatches, type MatchOpeningLines } from '../services/match-opening-lines';
import { HCAP } from './SimilarMatchTabPage';

interface MatchListProps {
  events: MatchInfo[];
  token: string;
  onOpenAnalysisInNewTab: (match: MatchInfo) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  favorites: string[];
  onToggleFavorite: (matchId: string, e: React.MouseEvent) => void;
}

export const MatchList: React.FC<MatchListProps> = ({
  events,
  token,
  onOpenAnalysisInNewTab,
  isLoading,
  favorites,
  onToggleFavorite,
  searchQuery,
}) => {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [openingLinesMap, setOpeningLinesMap] = useState<Record<string, MatchOpeningLines>>({});
  const [openingLinesLoading, setOpeningLinesLoading] = useState(false);
  const fetchedOpeningLineIdsRef = useRef<Set<string>>(new Set());
  const eventsByIdRef = useRef<Map<string, MatchInfo>>(new Map());

  const eventIdsKey = useMemo(
    () => events.map((e) => e.id).sort().join(','),
    [events],
  );

  useEffect(() => {
    eventsByIdRef.current = new Map(events.map((e) => [e.id, e]));
  }, [eventIdsKey, events]);

  const refreshViewedIds = useCallback(() => {
    try {
      const raw = localStorage.getItem('viewedMatchesHistory');
      const history = raw ? (JSON.parse(raw) as ViewedMatchHistory) : {};
      setViewedIds(new Set(Object.keys(history)));
    } catch {
      setViewedIds(new Set());
    }
  }, []);

  useEffect(() => {
    refreshViewedIds();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'viewedMatchesHistory' || e.key === null) refreshViewedIds();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(VIEWED_MATCHES_HISTORY_UPDATED_EVENT, refreshViewedIds);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(VIEWED_MATCHES_HISTORY_UPDATED_EVENT, refreshViewedIds);
    };
  }, [refreshViewedIds]);

  useEffect(() => {
    const liveIds = new Set(eventIdsKey.split(',').filter(Boolean));
    for (const id of fetchedOpeningLineIdsRef.current) {
      if (!liveIds.has(id)) fetchedOpeningLineIdsRef.current.delete(id);
    }
    setOpeningLinesMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        if (!liveIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [eventIdsKey]);

  useEffect(() => {
    if (!token || !eventIdsKey) {
      setOpeningLinesLoading(false);
      return;
    }

    const pendingIds = eventIdsKey
      .split(',')
      .filter((id) => id && !fetchedOpeningLineIdsRef.current.has(id));
    if (pendingIds.length === 0) return;

    let cancelled = false;
    setOpeningLinesLoading(true);

    void (async () => {
      const pending = pendingIds
        .map((id) => eventsByIdRef.current.get(id))
        .filter((m): m is MatchInfo => m != null);
      if (pending.length === 0) {
        if (!cancelled) setOpeningLinesLoading(false);
        return;
      }

      try {
        await fetchOpeningLinesForMatches(token, pending, {
          concurrency: 4,
          onMatch: (id, lines) => {
            if (cancelled) return;
            fetchedOpeningLineIdsRef.current.add(id);
            setOpeningLinesMap((prev) => ({ ...prev, [id]: lines }));
          },
        });
        if (cancelled) return;
      } finally {
        if (!cancelled) setOpeningLinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, eventIdsKey]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400 animate-pulse font-medium">Đang tải dữ liệu trực tiếp...</div>;
  }

  const processedEvents = events.map((match) => {
    let tm = match.timer?.tm || 0;
    if (tm === 0 && match.time) {
      const parsed = parseInt(match.time.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) tm = parsed;
    }
    return { ...match, parsedTm: tm };
  });

  const sortedEvents = processedEvents.sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return b.parsedTm - a.parsedTm;
  });

  const renderCard = (event: MatchInfo) => {
    const isFavorite = favorites.includes(event.id);
    const isViewed = viewedIds.has(event.id);
    const openLines = openingLinesMap[event.id];
    const hasOpenLines = openLines != null && (openLines.h1OpenOu13 != null || openLines.h2OpenOu13 != null);
    const openLinesPending = openLines === undefined && openingLinesLoading;
    return (
      <div
        key={event.id}
        onClick={() => onOpenAnalysisInNewTab(event)}
        className={`${isFavorite ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/50' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'} rounded-xl p-3 shadow-sm border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 relative flex flex-col group`}
      >
        <button onClick={(e) => onToggleFavorite(event.id, e)} className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500 fill-yellow-500 opacity-100' : 'text-slate-300 dark:text-slate-500 hover:text-yellow-400'}`} />
        </button>
        {isFavorite && <Star className="absolute top-2 right-2 p-1 w-6 h-6 text-yellow-500 fill-yellow-500 md:hidden z-10" />}
        <div className="mb-2 pr-6">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider line-clamp-1">{event.league.name}</span>
        </div>
        <div className="space-y-1.5 mb-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[13px] text-red-600 dark:text-red-400 line-clamp-1 pr-2 flex-1">{event.home.name}</span>
            <span className="font-bold text-sm bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-900 dark:text-white shrink-0">{event.ss ? event.ss.split('-')[0] : '0'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[13px] text-orange-600 dark:text-orange-400 line-clamp-1 pr-2 flex-1">{event.away.name}</span>
            <span className="font-bold text-sm bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-900 dark:text-white shrink-0">{event.ss ? event.ss.split('-')[1] : '0'}</span>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
          <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0">1_3 mở</span>
          {hasOpenLines ? (
            <>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                H1 {openLines!.h1OpenOu13 != null ? HCAP(openLines!.h1OpenOu13) : '—'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/25 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                H2 {openLines!.h2OpenOu13 != null ? HCAP(openLines!.h2OpenOu13) : '—'}
              </span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">
              {openLinesPending ? 'Đang tải…' : '—'}
            </span>
          )}
        </div>
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-slate-700/50 flex justify-between items-center gap-2">
          <div className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
            <Clock className="w-2.5 h-2.5 mr-1" />{event.timer?.tm || event.time || '0'}'
          </div>
          {isViewed && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold normal-case bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 shrink-0"
              title="Bạn đã mở trận này trong tab phân tích"
            >
              <Eye className="w-3 h-3" /> Đã mở
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="bg-[#FDFCF8] dark:bg-slate-800 p-4 rounded-2xl border border-gray-300 dark:border-slate-600 shadow-sm flex items-center justify-between max-w-xs">
        <div>
          <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Trận trực tiếp</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{events.length}</div>
        </div>
        <Activity className="w-6 h-6 text-blue-500" />
      </div>

      {sortedEvents.length === 0 && searchQuery ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-300 dark:border-slate-700">
          <p className="font-semibold text-lg">Không tìm thấy trận đấu</p>
          <p className="text-sm mt-1">Thử từ khóa khác thay cho &quot;{searchQuery}&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedEvents.map(renderCard)}
        </div>
      )}
    </div>
  );
};
