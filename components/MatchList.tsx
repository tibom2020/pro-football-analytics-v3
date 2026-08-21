import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MatchInfo, ViewedMatchHistory } from '../types';
import { Clock, Star, Activity, Eye } from 'lucide-react';
import { VIEWED_MATCHES_HISTORY_UPDATED_EVENT } from '../services/match-markdown-export';
import { fetchOpeningLinesForMatches, type MatchOpeningLines } from '../services/match-opening-lines';
import {
  formatOuOverLineDropDeltaLabel,
  isStrongNegDeltaHighlight,
} from '../services/ou-line-over-delta';
import { HCAP } from './SimilarMatchTabPage';

const ODDS_CARD_POLL_MS = 5 * 60_000;

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

function DeltaChip({
  delta,
  title,
}: {
  delta: number | undefined;
  title?: string;
}) {
  if (delta == null) return null;
  const hot = isStrongNegDeltaHighlight(delta);
  return (
    <span
      className={
        hot
          ? 'px-1.5 py-0.5 rounded-md bg-rose-600 text-white border border-rose-700 font-black text-[10px] shadow-sm ring-2 ring-rose-400/60 dark:ring-rose-500/50'
          : 'px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300/90 dark:border-rose-800 font-bold text-[10px]'
      }
      title={title ?? 'Δ = Tài đầu line mới − Tài cuối line cũ (âm mạnh nhất)'}
    >
      {formatOuOverLineDropDeltaLabel(delta)}
    </span>
  );
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
  const eventsByIdRef = useRef<Map<string, MatchInfo>>(new Map());
  const openingLinesMapRef = useRef(openingLinesMap);
  const fetchGenRef = useRef(0);

  const eventIdsKey = useMemo(
    () => events.map((e) => e.id).sort().join(','),
    [events],
  );

  useEffect(() => {
    eventsByIdRef.current = new Map(events.map((e) => [e.id, e]));
  }, [eventIdsKey, events]);

  useEffect(() => {
    openingLinesMapRef.current = openingLinesMap;
  }, [openingLinesMap]);

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

  const fetchOddsForMatches = useCallback(
    async (matches: MatchInfo[], opts?: { showLoading?: boolean }) => {
      if (!token || matches.length === 0) return;
      const gen = ++fetchGenRef.current;
      if (opts?.showLoading) setOpeningLinesLoading(true);
      try {
        await fetchOpeningLinesForMatches(token, matches, {
          concurrency: 1,
          onMatch: (id, lines) => {
            if (gen !== fetchGenRef.current) return;
            setOpeningLinesMap((prev) => ({ ...prev, [id]: lines }));
          },
        });
      } finally {
        if (opts?.showLoading && gen === fetchGenRef.current) {
          setOpeningLinesLoading(false);
        }
      }
    },
    [token],
  );

  // Trận mới chưa có data → fetch ngay
  useEffect(() => {
    if (!token || !eventIdsKey) {
      setOpeningLinesLoading(false);
      return;
    }
    const pending = eventIdsKey
      .split(',')
      .filter((id) => id && openingLinesMapRef.current[id] === undefined)
      .map((id) => eventsByIdRef.current.get(id))
      .filter((m): m is MatchInfo => m != null);
    if (pending.length === 0) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await fetchOddsForMatches(pending, { showLoading: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, eventIdsKey, fetchOddsForMatches]);

  // Poll toàn bộ trận live mỗi 5 phút (+ refresh khi tab hiện lại)
  useEffect(() => {
    if (!token) return;

    const refetchAll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const all = Array.from(eventsByIdRef.current.values());
      if (all.length === 0) return;
      void fetchOddsForMatches(all);
    };

    const id = window.setInterval(refetchAll, ODDS_CARD_POLL_MS);
    const onVis = () => {
      if (!document.hidden) refetchAll();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [token, fetchOddsForMatches]);

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
    const hasOpenLines =
      openLines != null &&
      (openLines.h1OpenOu13 != null ||
        openLines.h2OpenOu13 != null ||
        openLines.h1OpenOu16 != null ||
        openLines.h1StrongNegDelta13 != null ||
        openLines.h2StrongNegDelta13 != null ||
        openLines.h1StrongNegDelta16 != null);
    const openLinesPending = openLines === undefined && openingLinesLoading;
    const cardHot =
      isStrongNegDeltaHighlight(openLines?.h1StrongNegDelta13) ||
      isStrongNegDeltaHighlight(openLines?.h2StrongNegDelta13) ||
      isStrongNegDeltaHighlight(openLines?.h1StrongNegDelta16);

    const cardClass = cardHot
      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/50 shadow-md shadow-rose-500/10'
      : isFavorite
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/50'
        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600';

    return (
      <div
        key={event.id}
        onClick={() => onOpenAnalysisInNewTab(event)}
        className={`${cardClass} rounded-xl p-3 shadow-sm border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 relative flex flex-col group`}
      >
        {cardHot && (
          <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-rose-600 text-white">
            Δ mạnh
          </span>
        )}
        <button onClick={(e) => onToggleFavorite(event.id, e)} className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500 fill-yellow-500 opacity-100' : 'text-slate-300 dark:text-slate-500 hover:text-yellow-400'}`} />
        </button>
        {isFavorite && <Star className="absolute top-2 right-2 p-1 w-6 h-6 text-yellow-500 fill-yellow-500 md:hidden z-10" />}
        <div className={`mb-2 pr-6 ${cardHot ? 'pt-4' : ''}`}>
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
        <div className="mb-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-teal-200/90 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/35 px-1.5 py-1">
            <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wider bg-teal-600 text-white dark:bg-teal-500 dark:text-teal-950">
              1_3
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-teal-700/80 dark:text-teal-300/80 shrink-0">
              mở
            </span>
            {hasOpenLines ? (
              <>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300/90 dark:border-emerald-700 font-bold text-[10px]">
                  H1 {openLines!.h1OpenOu13 != null ? HCAP(openLines!.h1OpenOu13) : '—'}
                </span>
                <DeltaChip delta={openLines!.h1StrongNegDelta13} title="1_3 H1 · Δ âm mạnh nhất" />
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-900/45 text-cyan-800 dark:text-cyan-200 border border-cyan-300/90 dark:border-cyan-700 font-bold text-[10px]">
                  H2 {openLines!.h2OpenOu13 != null ? HCAP(openLines!.h2OpenOu13) : '—'}
                </span>
                <DeltaChip delta={openLines!.h2StrongNegDelta13} title="1_3 H2 · Δ âm mạnh nhất" />
              </>
            ) : (
              <span className="text-teal-600/70 dark:text-teal-400/70 text-[10px] font-medium">
                {openLinesPending ? 'Đang tải…' : '—'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-violet-200/90 dark:border-violet-800/70 bg-violet-50/70 dark:bg-violet-950/35 px-1.5 py-1">
            <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wider bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950">
              1_6
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80 shrink-0">
              mở
            </span>
            {hasOpenLines ? (
              <>
                <span
                  className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/45 text-amber-900 dark:text-amber-200 border border-amber-300/90 dark:border-amber-700 font-bold text-[10px]"
                  title="Kèo mở Tài/Xỉu hiệp 1 (1_6)"
                >
                  H1 {openLines!.h1OpenOu16 != null ? HCAP(openLines!.h1OpenOu16) : '—'}
                </span>
                <DeltaChip delta={openLines!.h1StrongNegDelta16} title="1_6 H1 · Δ âm mạnh nhất" />
              </>
            ) : (
              <span className="text-violet-600/70 dark:text-violet-400/70 text-[10px] font-medium">
                {openLinesPending ? 'Đang tải…' : '—'}
              </span>
            )}
          </div>
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
