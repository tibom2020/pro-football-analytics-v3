import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MatchInfo, ViewedMatchHistory } from '../types';
import { Clock, Star, Activity, Eye, EyeOff, Play, Square } from 'lucide-react';
import { VIEWED_MATCHES_HISTORY_UPDATED_EVENT } from '../services/match-markdown-export';
import { fetchOpeningLinesForMatches, type MatchOpeningLines } from '../services/match-opening-lines';
import { processStrongNegDeltaAlertsForMatch } from '../services/strong-neg-delta-alert';
import {
  formatOuOverLineDropDeltaLabel,
  isStrongNegDeltaRed,
  isStrongNegDeltaYellow,
} from '../services/ou-line-over-delta';
import { useElapsedSince } from '../hooks/useElapsedSince';
import { usePollCountdown } from '../hooks/usePollCountdown';
import {
  isMatchInOddsFetchWindow,
  oddsFetchWindowLabel,
} from '../services/match-odds-fetch-window';
import { RefreshCountdownItem, RefreshCountdownRow } from './RefreshCountdownDisplay';
import { HCAP } from './SimilarMatchTabPage';

const AUTO_REFRESH_MS = 3 * 60_000;

interface MatchListProps {
  events: MatchInfo[];
  token: string;
  onOpenAnalysisInNewTab: (match: MatchInfo) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  favorites: string[];
  onToggleFavorite: (matchId: string, e: React.MouseEvent) => void;
  onDismissMatch: (match: MatchInfo) => void;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  /** Refresh danh sách; trả về trận còn hiển thị (đã loại bỏ qua). */
  onRefreshList: () => Promise<MatchInfo[]>;
  listRefresh?: {
    label: string;
    paused: boolean;
    started: boolean;
    busy: boolean;
    onRefresh: () => void;
  };
}

function DeltaChip({
  delta,
  title,
}: {
  delta: number | undefined;
  title?: string;
}) {
  if (delta == null) return null;
  const yellow = isStrongNegDeltaYellow(delta);
  const red = isStrongNegDeltaRed(delta);
  const className = yellow
    ? 'px-1.5 py-0.5 rounded-md bg-yellow-400 text-yellow-950 border border-yellow-500 font-black text-[10px] shadow-sm ring-2 ring-yellow-300 dark:bg-yellow-400 dark:text-yellow-950 dark:border-yellow-300 dark:ring-yellow-500/70'
    : red
      ? 'px-1.5 py-0.5 rounded-md bg-rose-600 text-white border border-rose-700 font-black text-[10px] shadow-sm ring-2 ring-rose-400/60 dark:ring-rose-500/50'
      : 'px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300/90 dark:border-rose-800 font-bold text-[10px]';
  return (
    <span
      className={className}
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
  onDismissMatch,
  searchQuery,
  listRefresh,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  onRefreshList,
}) => {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [openingLinesMap, setOpeningLinesMap] = useState<Record<string, MatchOpeningLines>>({});
  const [oddsPollBusy, setOddsPollBusy] = useState(false);
  const [oddsProgress, setOddsProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const eventsByIdRef = useRef<Map<string, MatchInfo>>(new Map());
  const openingLinesMapRef = useRef(openingLinesMap);
  const fetchGenRef = useRef(0);
  /** Khóa sự kiện drop đã biết — baseline lần đầu, sau đó chỉ gửi Δ mới. */
  const knownDropKeysRef = useRef<Map<string, Set<string>>>(new Map());
  const baselinedMatchIdsRef = useRef<Set<string>>(new Set());

  const cleanupMatchOddsState = useCallback((matchId: string) => {
    setOpeningLinesMap((prev) => {
      if (prev[matchId] === undefined) return prev;
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
    knownDropKeysRef.current.delete(matchId);
    baselinedMatchIdsRef.current.delete(matchId);
  }, []);

  const handleDismissClick = useCallback(
    (match: MatchInfo, e: React.MouseEvent) => {
      e.stopPropagation();
      cleanupMatchOddsState(match.id);
      onDismissMatch(match);
    },
    [cleanupMatchOddsState, onDismissMatch],
  );

  const oddsElapsed = useElapsedSince({ enabled: !!token && !autoRefreshEnabled });
  const autoCountdown = usePollCountdown({
    intervalMs: AUTO_REFRESH_MS,
    enabled: !!token && autoRefreshEnabled,
  });
  const cycleBusyRef = useRef(false);
  const onRefreshListRef = useRef(onRefreshList);
  const fetchOddsRef = useRef<(matches: MatchInfo[]) => Promise<void>>(async () => {});
  const markAutoCountdownRef = useRef(autoCountdown.markRefreshed);
  const markOddsElapsedRef = useRef(oddsElapsed.markStart);

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
    for (const id of [...knownDropKeysRef.current.keys()]) {
      if (!liveIds.has(id)) {
        knownDropKeysRef.current.delete(id);
        baselinedMatchIdsRef.current.delete(id);
      }
    }
  }, [eventIdsKey]);

  const fetchOddsForMatches = useCallback(
    async (matches: MatchInfo[]) => {
      if (!token || matches.length === 0) return;
      const gen = ++fetchGenRef.current;
      setOddsPollBusy(true);
      setOddsProgress({ done: 0, total: matches.length, label: '…' });
      try {
        await fetchOpeningLinesForMatches(token, matches, {
          delayBetweenMatchesMs: 2_000,
          onProgress: (done, total, match) => {
            if (gen !== fetchGenRef.current) return;
            setOddsProgress({
              done: Math.min(done + 1, total),
              total,
              label: `${match.home.name} vs ${match.away.name}`,
            });
          },
          onMatch: (id, result, match) => {
            if (gen !== fetchGenRef.current) return;
            setOpeningLinesMap((prev) => ({ ...prev, [id]: result.lines }));
            const isBaseline = !baselinedMatchIdsRef.current.has(id);
            if (isBaseline) baselinedMatchIdsRef.current.add(id);
            void processStrongNegDeltaAlertsForMatch({
              match,
              snaps13Low: result.snaps13Low,
              snaps13High: result.snaps13High,
              snaps16Low: result.snaps16Low,
              snaps16High: result.snaps16High,
              openLines: result.lines,
              knownKeysByMatch: knownDropKeysRef.current,
              isBaseline,
            });
          },
        });
      } finally {
        if (gen === fetchGenRef.current) {
          setOddsPollBusy(false);
          setOddsProgress(null);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    onRefreshListRef.current = onRefreshList;
  }, [onRefreshList]);

  useEffect(() => {
    fetchOddsRef.current = fetchOddsForMatches;
  }, [fetchOddsForMatches]);

  useEffect(() => {
    markAutoCountdownRef.current = autoCountdown.markRefreshed;
  }, [autoCountdown.markRefreshed]);

  useEffect(() => {
    markOddsElapsedRef.current = oddsElapsed.markStart;
  }, [oddsElapsed.markStart]);

  const handleManualOddsRefresh = useCallback(async () => {
    if (!token) return;
    const all = Array.from(eventsByIdRef.current.values());
    if (all.length === 0) return;
    /** Chỉ fetch trận trong khung phút H1 15–30 / H2 55–70 và chưa có odds. */
    const pending = all.filter(
      (m) => openingLinesMapRef.current[m.id] === undefined && isMatchInOddsFetchWindow(m),
    );
    if (pending.length === 0) return;

    oddsElapsed.markStart();
    await fetchOddsForMatches(pending);
  }, [token, fetchOddsForMatches, oddsElapsed]);

  const runAutoCycle = useCallback(async () => {
    if (!token) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    /** Luôn refresh danh sách trận trước (kể cả khi odds cycle trước còn chạy). */
    let visible: MatchInfo[] = [];
    try {
      visible = await onRefreshListRef.current();
    } catch {
      visible = Array.from(eventsByIdRef.current.values());
    }

    if (cycleBusyRef.current) {
      markAutoCountdownRef.current();
      return;
    }

    cycleBusyRef.current = true;
    try {
      const eligible = visible.filter(isMatchInOddsFetchWindow);
      markOddsElapsedRef.current();
      if (eligible.length > 0) {
        await fetchOddsRef.current(eligible);
      }
      markAutoCountdownRef.current();
    } finally {
      cycleBusyRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!token || !autoRefreshEnabled) return;

    /** Bật Auto / có token → chạy ngay: refresh list rồi odds trong khung phút. */
    void runAutoCycle();
    const id = window.setInterval(() => {
      void runAutoCycle();
    }, AUTO_REFRESH_MS);

    return () => {
      clearInterval(id);
    };
  }, [token, autoRefreshEnabled, runAutoCycle]);

  const oddsPendingCount = useMemo(
    () =>
      events.filter(
        (m) => openingLinesMap[m.id] === undefined && isMatchInOddsFetchWindow(m),
      ).length,
    [events, openingLinesMap],
  );

  const oddsEligibleCount = useMemo(
    () => events.filter((m) => isMatchInOddsFetchWindow(m)).length,
    [events],
  );

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

    const aInWindow = isMatchInOddsFetchWindow(a);
    const bInWindow = isMatchInOddsFetchWindow(b);
    if (aInWindow && !bInWindow) return -1;
    if (!aInWindow && bInWindow) return 1;

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
    const d13h1 = openLines?.h1StrongNegDelta13;
    const d13h2 = openLines?.h2StrongNegDelta13;
    const d16h1 = openLines?.h1StrongNegDelta16;
    const cardYellow =
      isStrongNegDeltaYellow(d13h1) || isStrongNegDeltaYellow(d13h2) || isStrongNegDeltaYellow(d16h1);
    const cardRed =
      !cardYellow &&
      (isStrongNegDeltaRed(d13h1) || isStrongNegDeltaRed(d13h2) || isStrongNegDeltaRed(d16h1));

    const cardClass = cardYellow
      ? 'bg-yellow-200 dark:bg-yellow-500/25 border-yellow-400 dark:border-yellow-400 ring-2 ring-yellow-400 dark:ring-yellow-300/70 shadow-md shadow-yellow-400/20'
      : cardRed
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
        {cardYellow && (
          <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-yellow-400 text-yellow-950 border border-yellow-500">
            Δ ≤ −0.40
          </span>
        )}
        {cardRed && (
          <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-rose-600 text-white">
            Δ ≤ −0.35
          </span>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
          <button
            type="button"
            onClick={(e) => handleDismissClick(event, e)}
            className="p-1 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Bỏ qua — chuyển sang tab Bỏ qua"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => onToggleFavorite(event.id, e)}
            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500 fill-yellow-500 opacity-100' : 'text-slate-300 dark:text-slate-500 hover:text-yellow-400'}`} />
          </button>
        </div>
        {isFavorite && <Star className="absolute top-2 right-2 p-1 w-6 h-6 text-yellow-500 fill-yellow-500 md:hidden z-10 pointer-events-none" />}
        <div className={`mb-2 pr-14 ${cardYellow || cardRed ? 'pt-4' : ''}`}>
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
                <DeltaChip delta={openLines!.h1StrongNegDelta13} title="1_3 H1 · Δ âm mạnh nhất (đáy + đỉnh)" />
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-900/45 text-cyan-800 dark:text-cyan-200 border border-cyan-300/90 dark:border-cyan-700 font-bold text-[10px]">
                  H2 {openLines!.h2OpenOu13 != null ? HCAP(openLines!.h2OpenOu13) : '—'}
                </span>
                <DeltaChip delta={openLines!.h2StrongNegDelta13} title="1_3 H2 · Δ âm mạnh nhất (đáy + đỉnh)" />
              </>
            ) : (
              <span className="text-teal-600/70 dark:text-teal-400/70 text-[10px] font-medium">—</span>
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
                <DeltaChip delta={openLines!.h1StrongNegDelta16} title="1_6 H1 · Δ âm mạnh nhất (đáy + đỉnh)" />
              </>
            ) : (
              <span className="text-violet-600/70 dark:text-violet-400/70 text-[10px] font-medium">—</span>
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
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="bg-[#FDFCF8] dark:bg-slate-800 p-4 rounded-2xl border border-gray-300 dark:border-slate-600 shadow-sm flex items-center justify-between shrink-0 xl:w-48">
          <div>
            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Trận trực tiếp</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{events.length}</div>
          </div>
          <Activity className="w-6 h-6 text-blue-500" />
        </div>

        <RefreshCountdownRow>
          {listRefresh ? (
            <RefreshCountdownItem
              title="Danh sách trận"
              subtitle={
                autoRefreshEnabled
                  ? 'Auto: refresh danh sách ngay + mỗi 3 phút'
                  : listRefresh.started
                    ? `Đã ${listRefresh.label} kể từ lần refresh`
                    : 'Bấm Refresh để tải danh sách trận'
              }
              label={autoRefreshEnabled ? autoCountdown.label : listRefresh.label}
              progress={autoRefreshEnabled ? autoCountdown.progress : undefined}
              hideProgress={!autoRefreshEnabled}
              paused={autoRefreshEnabled ? autoCountdown.paused : listRefresh.paused}
              busy={listRefresh.busy}
              accent="blue"
              onRefresh={listRefresh.onRefresh}
              refreshDisabled={!token || listRefresh.busy || oddsPollBusy}
              refreshLabel="Refresh danh sách"
            />
          ) : null}
          <RefreshCountdownItem
            title="Odds & Δ"
            subtitle={
              oddsPollBusy && oddsProgress
                ? `Trận ${oddsProgress.done}/${oddsProgress.total} · ${oddsProgress.label}`
                : autoRefreshEnabled
                  ? `Auto · chỉ ${oddsFetchWindowLabel()}`
                  : oddsElapsed.started
                    ? `Đã ${oddsElapsed.label} kể từ lần refresh`
                    : oddsPendingCount > 0
                      ? `Còn ${oddsPendingCount} trận · ${oddsFetchWindowLabel()}`
                      : oddsEligibleCount === 0
                        ? `Chỉ tải ${oddsFetchWindowLabel()}`
                        : 'Đã tải odds các trận trong khung phút'
            }
            label={autoRefreshEnabled ? autoCountdown.label : oddsElapsed.label}
            progress={autoRefreshEnabled ? autoCountdown.progress : undefined}
            hideProgress={!autoRefreshEnabled}
            paused={autoRefreshEnabled ? autoCountdown.paused : oddsElapsed.paused}
            busy={oddsPollBusy}
            accent="violet"
            onRefresh={() => void handleManualOddsRefresh()}
            refreshDisabled={!token || events.length === 0 || oddsPollBusy || listRefresh?.busy || oddsPendingCount === 0}
            refreshLabel={
              oddsPollBusy
                ? `Đang tải ${oddsProgress ? `${oddsProgress.done}/${oddsProgress.total}` : '…'}`
                : oddsPendingCount > 0
                  ? `Tải odds (${oddsPendingCount} trận)`
                  : 'Đã tải hết'
            }
          />
        </RefreshCountdownRow>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const enabling = !autoRefreshEnabled;
            if (enabling) {
              /** Tránh kẹt cycleBusy từ lần trước — bật Auto luôn refresh list ngay. */
              cycleBusyRef.current = false;
            }
            onToggleAutoRefresh();
          }}
          disabled={!token}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
            autoRefreshEnabled
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
          title={
            autoRefreshEnabled
              ? `Tắt auto — đang tải list + odds (${oddsFetchWindowLabel()}) mỗi 3 phút`
              : `Bật auto — refresh danh sách ngay, rồi mỗi 3 phút tải list + odds (${oddsFetchWindowLabel()})`
          }
        >
          {autoRefreshEnabled ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {autoRefreshEnabled ? 'Auto ON · 3 phút' : 'Auto OFF'}
        </button>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Odds chỉ H1 15–30' · H2 55–70'
        </span>
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
