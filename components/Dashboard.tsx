import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MatchInfo, ProcessedStats, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot } from '../types';
import { parseStats, getMatchDetails, getMatchOdds } from '../services/api';
import { normalizeOverUnderSnapshots, normalizeAsianHandicapSnapshots } from '../services/oddsNormalize';
import {
    decodeStatTimelineKey,
    encodeStatTimelineKey,
    resolveMatchHalfForUI,
    resolveStatsHalfFromSnapshots,
    type MatchHalf,
} from '../services/matchTimeline';
import {
    colorOddsSeriesForPressure,
    applyHalfFromMinuteForFullMatchOdds,
    minuteTicks,
} from '../services/odds-pressure-series';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { LiveStatsTable } from './LiveStatsTable';
import { Ou13ChartModal } from './Ou13ChartModal';
import { PinnedChartsBar } from './PinnedChartsBar';
import { buildSimilarMatchTabUrl } from './SimilarMatchTabPage';
import { buildLocalChartBundle } from './GoalPredictionBadge';
import { SimilarMatchesPanel } from './SimilarMatchesPanel';
import {
    loadPinnedCharts,
    removePinnedChart,
    PINNED_CHARTS_UPDATED_EVENT,
    type PinnedChart,
} from '../services/pinned-charts';
import { calculateAPIScore } from '../services/traditionalFactors';
import { MomentumChart } from './MomentumChart';
import { StatBox } from './StatDisplay';
import { AH_KEY, OU_KEY, VIEWED_MATCHES_HISTORY_UPDATED_EVENT } from '../services/match-markdown-export';
import { safeSetItem } from '../services/safe-storage';

interface ShotEvent {
    minute: number;
    type: 'on' | 'off';
    half: MatchHalf;
}

interface GameEvent {
    minute: number;
    type: 'goal' | 'corner';
    half: MatchHalf;
}

/** Một hiệp + một phút đồng hồ chỉ một marker bàn (runtime log H4: duplicateHalfMinute). */
function dedupeGoalMarkersByHalfMinute(events: GameEvent[]): GameEvent[] {
    const seenGoal = new Set<string>();
    const out: GameEvent[] = [];
    for (const e of events) {
        if (e.type !== 'goal') {
            out.push(e);
            continue;
        }
        const h = e.half ?? 1;
        const k = `${h}-${e.minute}`;
        if (seenGoal.has(k)) continue;
        seenGoal.add(k);
        out.push(e);
    }
    return out;
}

function subtractProcessedStats(a: ProcessedStats, b: ProcessedStats): ProcessedStats {
    const sub = (x: [number, number], y: [number, number]): [number, number] => [
        Math.max(0, x[0] - y[0]),
        Math.max(0, x[1] - y[1]),
    ];
    const out: ProcessedStats = {
        attacks: sub(a.attacks, b.attacks),
        dangerous_attacks: sub(a.dangerous_attacks, b.dangerous_attacks),
        on_target: sub(a.on_target, b.on_target),
        off_target: sub(a.off_target, b.off_target),
        corners: sub(a.corners, b.corners),
        yellowcards: sub(a.yellowcards, b.yellowcards),
        redcards: sub(a.redcards, b.redcards),
    };
    if (a.xg != null && b.xg != null) {
        out.xg = sub(a.xg, b.xg);
    }
    return out;
}

interface DashboardProps {
    token: string;
    match: MatchInfo;
    onBack: () => void;
    /** Giữ tương thích App.tsx — không dùng trong bản rút gọn. */
    sessionActive?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, match, onBack }) => {
    const AUTO_REFRESH_INTERVAL_MS = 15_000;
    const [liveMatch, setLiveMatch] = useState<MatchInfo>(match);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [oddsHistory, setOddsHistory] = useState<OverUnderMinuteSnapshot[]>([]);
    const [homeOddsHistory, setHomeOddsHistory] = useState<AsianHandicapMinuteSnapshot[]>([]);
    const [statsHistory, setStatsHistory] = useState<Record<number, ProcessedStats>>({});
    const [shotEvents, setShotEvents] = useState<ShotEvent[]>([]);
    const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);

    const statsHistoryRef = useRef(statsHistory);
    const gameEventsRef = useRef(gameEvents);
    useEffect(() => {
        statsHistoryRef.current = statsHistory;
    }, [statsHistory]);
    useEffect(() => {
        gameEventsRef.current = gameEvents;
    }, [gameEvents]);

    const maxGoalsSeen = useRef<number | null>(null);
    const maxCornersSeen = useRef<number | null>(null);

    const [pinnedCharts, setPinnedCharts] = useState<PinnedChart[]>(() => loadPinnedCharts());
    const [openPinIdx, setOpenPinIdx] = useState<number | null>(null);
    const matchPins = useMemo(
        () => pinnedCharts.filter((p) => p.sourceMatchId === liveMatch.id),
        [pinnedCharts, liveMatch.id],
    );

    useEffect(() => {
        setOpenPinIdx(null);
    }, [liveMatch.id]);

    useEffect(() => {
        const sync = () => setPinnedCharts(loadPinnedCharts());
        window.addEventListener(PINNED_CHARTS_UPDATED_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(PINNED_CHARTS_UPDATED_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const clockTm =
        liveMatch.timer?.tm ?? (parseInt(liveMatch.time || '0', 10) || 0);

    useEffect(() => {
        const home = liveMatch.home.name;
        const away = liveMatch.away.name;
        const score = liveMatch.ss || '0-0';
        const minuteRaw = liveMatch.timer?.tm || liveMatch.time;
        const minuteLabel =
            minuteRaw !== undefined && minuteRaw !== null && String(minuteRaw) !== ''
                ? String(minuteRaw)
                : '—';
        document.title = `${home} vs ${away} (${minuteLabel}') ${score}`;
        return () => {
            document.title = 'Pro Football Analytics';
        };
    }, [
        liveMatch.home.name,
        liveMatch.away.name,
        liveMatch.ss,
        liveMatch.timer?.tm,
        liveMatch.time,
    ]);

    const oddsHalfSnapshots = useMemo(
        () => [...oddsHistory, ...homeOddsHistory],
        [oddsHistory, homeOddsHistory],
    );

    const inSecondHalf = useMemo(
        () => resolveMatchHalfForUI(liveMatch.timer, clockTm, oddsHalfSnapshots, Object.keys(statsHistory)) === 2,
        [liveMatch.timer, clockTm, oddsHalfSnapshots, statsHistory],
    );

    /** Tách chỉ số tích lũy hiệp 1 vs hiệp 2 (H2 = hiện tại trừ mốc cuối H1 trong lịch sử). */
    const halfPeriodStats = useMemo(() => {
        const cur = parseStats(liveMatch.stats);
        const inH2 = inSecondHalf;
        const timeline = Object.keys(statsHistory)
            .map(Number)
            .map((k) => ({ ...decodeStatTimelineKey(k), stats: statsHistory[k] }))
            .sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
        const h1Snaps = timeline.filter((e) => e.half === 1);
        const lastH1 = h1Snaps[h1Snaps.length - 1];
        if (!inH2) {
            return { h1: cur, h2: null as ProcessedStats | null, hasH1Anchor: !!lastH1 };
        }
        if (!lastH1?.stats) {
            return { h1: null as ProcessedStats | null, h2: cur, hasH1Anchor: false };
        }
        return {
            h1: lastH1.stats,
            h2: subtractProcessedStats(cur, lastH1.stats),
            hasH1Anchor: true,
        };
    }, [liveMatch.stats, statsHistory, inSecondHalf]);

    useEffect(() => {
        const safeParse = <T,>(raw: string | null, fallback: T): T => {
            if (!raw) return fallback;
            try {
                return JSON.parse(raw) as T;
            } catch {
                console.warn(`[Dashboard] Bỏ qua dữ liệu localStorage không hợp lệ cho trận ${match.id}`);
                return fallback;
            }
        };
        setStatsHistory(safeParse<Record<number, ProcessedStats>>(localStorage.getItem(`statsHistory_${match.id}`), {}));
        const hydratedGe = safeParse<GameEvent[]>(localStorage.getItem(`gameEvents_${match.id}`), []).map((e) => {
            let half: MatchHalf = e.half ?? 1;
            if (e.type === 'goal' && half === 1 && e.minute >= 50) half = 2;
            return { ...e, half };
        });
        setGameEvents(dedupeGoalMarkersByHalfMinute(hydratedGe));
        maxGoalsSeen.current = null;
        maxCornersSeen.current = null;
    }, [match.id]);

    useEffect(() => {
        try {
            const historyStr = localStorage.getItem('viewedMatchesHistory');
            const history = historyStr ? JSON.parse(historyStr) : {};
            history[match.id] = { match: liveMatch, viewedAt: Date.now() };
            safeSetItem('viewedMatchesHistory', JSON.stringify(history), { keepMatchId: match.id });
            window.dispatchEvent(new CustomEvent(VIEWED_MATCHES_HISTORY_UPDATED_EVENT));
        } catch (e) {
            console.error('Failed to update viewed matches history:', e);
        }
    }, [match.id, liveMatch, statsHistory]);

    useEffect(() => {
        if (Object.keys(statsHistory).length > 0) {
            safeSetItem(`statsHistory_${match.id}`, JSON.stringify(statsHistory), { keepMatchId: match.id });
        }
    }, [statsHistory, match.id]);

    useEffect(() => {
        if (gameEvents.length > 0) {
            safeSetItem(`gameEvents_${match.id}`, JSON.stringify(gameEvents), { keepMatchId: match.id });
        }
    }, [gameEvents, match.id]);

    useEffect(() => {
        if (oddsHistory.length > 0) safeSetItem(OU_KEY(match.id), JSON.stringify(oddsHistory), { keepMatchId: match.id });
    }, [oddsHistory, match.id]);

    useEffect(() => {
        if (homeOddsHistory.length > 0) {
            safeSetItem(AH_KEY(match.id), JSON.stringify(homeOddsHistory), { keepMatchId: match.id });
        }
    }, [homeOddsHistory, match.id]);

    const marketChartData = useMemo(
        () => applyHalfFromMinuteForFullMatchOdds(colorOddsSeriesForPressure(oddsHistory), inSecondHalf),
        [oddsHistory, inSecondHalf],
    );
    const homeMarketChartData = useMemo(
        () => applyHalfFromMinuteForFullMatchOdds(colorOddsSeriesForPressure(homeOddsHistory), inSecondHalf),
        [homeOddsHistory, inSecondHalf],
    );

    const marketChartDataH1 = useMemo(
        () => marketChartData.filter((p) => (p.half ?? 1) === 1),
        [marketChartData],
    );
    const marketChartDataH2 = useMemo(() => marketChartData.filter((p) => p.half === 2), [marketChartData]);
    const homeMarketChartDataH1 = useMemo(
        () => homeMarketChartData.filter((p) => (p.half ?? 1) === 1),
        [homeMarketChartData],
    );
    const homeMarketChartDataH2 = useMemo(
        () => homeMarketChartData.filter((p) => p.half === 2),
        [homeMarketChartData],
    );

    const sortedMarketChartDataH1 = useMemo(
        () => [...marketChartDataH1].sort((a, b) => a.minute - b.minute),
        [marketChartDataH1],
    );
    const sortedMarketChartDataH2 = useMemo(
        () => [...marketChartDataH2].sort((a, b) => a.minute - b.minute),
        [marketChartDataH2],
    );
    const sortedHomeMarketChartDataH1 = useMemo(
        () => [...homeMarketChartDataH1].sort((a, b) => a.minute - b.minute),
        [homeMarketChartDataH1],
    );
    const sortedHomeMarketChartDataH2 = useMemo(
        () => [...homeMarketChartDataH2].sort((a, b) => a.minute - b.minute),
        [homeMarketChartDataH2],
    );

    const timelineStatEntries = useMemo(
        () =>
            Object.keys(statsHistory)
                .map(Number)
                .map((k) => ({ key: k, ...decodeStatTimelineKey(k), stats: statsHistory[k] }))
                .sort((a, b) => (a.half - b.half) || (a.minute - b.minute)),
        [statsHistory],
    );

    const apiChartDataH1 = useMemo(
        () =>
            timelineStatEntries
                .filter((e) => e.half === 1)
                .map((e) => ({
                    minute: e.minute,
                    homeApi: calculateAPIScore(e.stats, 0),
                    awayApi: calculateAPIScore(e.stats, 1),
                })),
        [timelineStatEntries],
    );

    const apiChartDataH2 = useMemo(
        () =>
            timelineStatEntries
                .filter((e) => e.half === 2)
                .map((e) => ({
                    minute: e.minute,
                    homeApi: calculateAPIScore(e.stats, 0),
                    awayApi: calculateAPIScore(e.stats, 1),
                })),
        [timelineStatEntries],
    );

    const apiChartDataFull = useMemo(
        () =>
            timelineStatEntries.map((e) => ({
                minute: e.minute,
                half: e.half,
                homeApi: calculateAPIScore(e.stats, 0),
                awayApi: calculateAPIScore(e.stats, 1),
            })),
        [timelineStatEntries],
    );

    const h1DomainMax = useMemo(() => {
        const fromData = Math.max(
            45,
            ...marketChartDataH1.map((p) => p.minute),
            ...homeMarketChartDataH1.map((p) => p.minute),
            ...apiChartDataH1.map((p) => p.minute),
            !inSecondHalf ? clockTm : 0,
        );
        return Math.min(58, Math.max(45, fromData + 1));
    }, [marketChartDataH1, homeMarketChartDataH1, apiChartDataH1, clockTm, inSecondHalf]);

    const h2DomainMax = useMemo(() => {
        const fromData = Math.max(
            90,
            ...marketChartDataH2.map((p) => p.minute),
            ...homeMarketChartDataH2.map((p) => p.minute),
            ...apiChartDataH2.map((p) => p.minute),
            inSecondHalf ? clockTm : 45,
        );
        return Math.min(105, Math.max(90, fromData + 2));
    }, [marketChartDataH2, homeMarketChartDataH2, apiChartDataH2, clockTm, inSecondHalf]);

    const xDomainH1: [number, number] = [0, h1DomainMax];
    const xDomainH2: [number, number] = [45, h2DomainMax];
    const ticksH1Memo = useMemo(() => minuteTicks(0, h1DomainMax, 5), [h1DomainMax]);
    const ticksH2Memo = useMemo(() => minuteTicks(45, h2DomainMax, 5), [h2DomainMax]);

    const calculateYAxisConfig = useCallback(
        (
            chartData: { handicap?: number }[],
            minDomainValue: number | null,
            domainFallback?: { handicap?: number }[],
        ) => {
            const collectH = (rows: { handicap?: number }[]) =>
                rows.map((d) => d.handicap).filter((h): h is number => typeof h === 'number' && isFinite(h));

            let allHandicaps = collectH(chartData);
            if (allHandicaps.length === 0 && minDomainValue === null && domainFallback?.length) {
                allHandicaps = collectH(domainFallback);
            }

            if (allHandicaps.length === 0) {
                const defaultMin = minDomainValue ?? 0;
                const defaultTicks = [];
                for (let i = defaultMin; i <= defaultMin + 2; i = parseFloat((i + 0.25).toFixed(2))) {
                    if (defaultTicks.length > 100) break;
                    defaultTicks.push(i);
                }
                return { domain: [defaultMin, defaultMin + 2], ticks: defaultTicks };
            }
            let minDomain: number;
            if (minDomainValue !== null) {
                minDomain = minDomainValue;
            } else {
                const minVal = Math.min(...allHandicaps);
                minDomain = Math.floor(minVal / 0.25) * 0.25;
            }
            const maxVal = Math.max(...allHandicaps);
            let maxDomain = Math.ceil(maxVal / 0.25) * 0.25;
            if (minDomain >= maxDomain) {
                minDomain -= 0.25;
                maxDomain += 0.25;
            }
            const buildTicks = (lo: number, hi: number) => {
                const t: number[] = [];
                for (let i = lo; i <= hi; i = parseFloat((i + 0.25).toFixed(2))) {
                    if (t.length > 100) break;
                    t.push(i);
                }
                return t;
            };
            let ticks = buildTicks(minDomain, maxDomain);
            if (ticks.length <= 1 && allHandicaps.length > 0) {
                const minV = Math.min(...allHandicaps);
                const maxV = Math.max(...allHandicaps);
                if (minDomainValue !== null) {
                    minDomain = minDomainValue;
                } else {
                    minDomain = Math.floor(minV / 0.25) * 0.25;
                }
                maxDomain = Math.ceil(maxV / 0.25) * 0.25;
                if (minDomain >= maxDomain) {
                    minDomain -= 0.25;
                    maxDomain += 0.25;
                }
                ticks = buildTicks(minDomain, maxDomain);
            }
            if (ticks.length <= 1) {
                const defaultMin = minDomainValue ?? 0;
                const defaultTicks = [];
                for (let i = defaultMin; i <= defaultMin + 2; i = parseFloat((i + 0.25).toFixed(2))) {
                    if (defaultTicks.length > 100) break;
                    defaultTicks.push(i);
                }
                return { domain: [defaultMin, defaultMin + 2], ticks: defaultTicks };
            }
            return { domain: [minDomain, maxDomain], ticks };
        },
        [],
    );

    const overUnderYAxisConfigH1 = useMemo(
        () => calculateYAxisConfig(marketChartDataH1, 0.5),
        [marketChartDataH1, calculateYAxisConfig],
    );
    const overUnderYAxisConfigH2 = useMemo(
        () => calculateYAxisConfig(marketChartDataH2, 0.5),
        [marketChartDataH2, calculateYAxisConfig],
    );
    const homeAwayYAxisConfigH1 = useMemo(
        () => calculateYAxisConfig(homeMarketChartDataH1, null, homeMarketChartData),
        [homeMarketChartDataH1, homeMarketChartData, calculateYAxisConfig],
    );
    const homeAwayYAxisConfigH2 = useMemo(
        () => calculateYAxisConfig(homeMarketChartDataH2, null, homeMarketChartData),
        [homeMarketChartDataH2, homeMarketChartData, calculateYAxisConfig],
    );

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const details = await getMatchDetails(token, liveMatch.id);
            if (details) setLiveMatch(details);

            const odds = await getMatchOdds(token, liveMatch.id);
            const timerForOdds = details?.timer;
            let normalizedOu: OverUnderMinuteSnapshot[] = [];
            let normalizedAh: AsianHandicapMinuteSnapshot[] = [];
            if (odds?.results?.odds) {
                const o = odds.results.odds;
                normalizedOu = normalizeOverUnderSnapshots(o['1_3'], '1_3', { matchTimer: timerForOdds });
                normalizedAh = normalizeAsianHandicapSnapshots(o['1_2'], '1_2', { matchTimer: timerForOdds });
                setOddsHistory(normalizedOu);
                setHomeOddsHistory(normalizedAh);
            }

            if (details) {
                const t = details.timer?.tm;
                if (t != null && t !== undefined && details.stats) {
                    const snapSource =
                        normalizedOu.length > 0 ? normalizedOu : normalizedAh.length > 0 ? normalizedAh : [];
                    const half = resolveStatsHalfFromSnapshots(details.timer, t, snapSource);
                    const statKey = encodeStatTimelineKey(half, t);
                    const parsedStats = parseStats(details.stats);
                    setStatsHistory((prev) => ({
                        ...prev,
                        [statKey]: parsedStats,
                    }));
                }
            }
        } catch (e) {
            console.error('Error during data refresh:', e);
        } finally {
            setIsRefreshing(false);
        }
    }, [token, liveMatch.id]);

    useEffect(() => {
        handleRefresh();
        const id = window.setInterval(handleRefresh, AUTO_REFRESH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [handleRefresh, AUTO_REFRESH_INTERVAL_MS]);

    useEffect(() => {
        const timeline = Object.keys(statsHistory)
            .map(Number)
            .map((k) => ({ key: k, ...decodeStatTimelineKey(k), stats: statsHistory[k] }))
            .sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
        if (timeline.length < 2) return;
        const newS: ShotEvent[] = [];
        for (let i = 1; i < timeline.length; i++) {
            if (timeline[i].half !== timeline[i - 1].half) continue;
            const t = timeline[i].minute;
            const pt = timeline[i - 1].minute;
            if (t - pt > 5) continue;
            const s = timeline[i].stats;
            const ps = timeline[i - 1].stats;
            if (!s || !ps) continue;
            const dOn = (s.on_target[0] + s.on_target[1]) - (ps.on_target[0] + ps.on_target[1]);
            const dOff = (s.off_target[0] + s.off_target[1]) - (ps.off_target[0] + ps.off_target[1]);
            const h = timeline[i].half;
            for (let j = 0; j < dOn; j++) newS.push({ minute: t, type: 'on', half: h });
            for (let j = 0; j < dOff; j++) newS.push({ minute: t, type: 'off', half: h });
        }
        setShotEvents(newS);
    }, [statsHistory]);

    useEffect(() => {
        const getS = (m: MatchInfo) => (m.ss || '0-0').split('-').map(Number).reduce((a, b) => a + b, 0);
        const getC = (m: MatchInfo) => {
            const st = parseStats(m.stats);
            return st.corners[0] + st.corners[1];
        };
        const goals = getS(liveMatch);
        const corners = getC(liveMatch);

        if (maxGoalsSeen.current === null) {
            maxGoalsSeen.current = goals;
            maxCornersSeen.current = corners;
            return;
        }

        const min = liveMatch.timer?.tm || parseInt(liveMatch.time || '0');
        if (!min) return;
        const half: MatchHalf = resolveMatchHalfForUI(
            liveMatch.timer,
            min,
            oddsHistory,
            Object.keys(statsHistory),
        );
        const newE: GameEvent[] = [];
        if (goals > maxGoalsSeen.current) {
            for (let i = 0; i < goals - maxGoalsSeen.current; i++) newE.push({ minute: min, type: 'goal', half });
            maxGoalsSeen.current = goals;
        }
        const prevCorners = maxCornersSeen.current ?? 0;
        if (corners > prevCorners) {
            for (let i = 0; i < corners - prevCorners; i++) newE.push({ minute: min, type: 'corner', half });
            maxCornersSeen.current = corners;
        }
        if (newE.length > 0) {
            setGameEvents((prev) => dedupeGoalMarkersByHalfMinute([...prev, ...newE]));
        }
    }, [liveMatch, oddsHistory, statsHistory]);

    const shotEventsH1 = useMemo(() => shotEvents.filter((s) => s.half === 1), [shotEvents]);
    const shotEventsH2 = useMemo(() => shotEvents.filter((s) => s.half === 2), [shotEvents]);
    const gameEventsH1 = useMemo(() => gameEvents.filter((e) => e.half === 1), [gameEvents]);
    const gameEventsH2 = useMemo(() => gameEvents.filter((e) => e.half === 2), [gameEvents]);

    const scoreParts = (liveMatch.ss || '0-0').split('-');
    const emptyAlertHistory: never[] = [];

    return (
        <div className="pb-10 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
            <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full shrink-0"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center min-w-0">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">PHÂN TÍCH TRỰC TIẾP</span>
                        <span className="text-red-500 dark:text-red-400 font-bold flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            {liveMatch.timer?.tm || liveMatch.time}'
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <SimilarMatchesPanel
                            liveMatch={liveMatch}
                            statsHistory={statsHistory}
                            oddsHistory={oddsHistory}
                            homeOddsHistory={homeOddsHistory}
                            gameEvents={gameEvents}
                            alertHistory={emptyAlertHistory}
                        />
                        <button
                            type="button"
                            onClick={() => void handleRefresh()}
                            disabled={isRefreshing}
                            className="p-2 -mr-2 text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-slate-800 rounded-full"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center px-6 pb-4 text-gray-800 dark:text-white">
                    <div className="flex flex-col items-center w-1/3">
                        <div className="font-bold text-lg text-center leading-tight mb-1">{liveMatch.home.name}</div>
                        <div className="text-xs text-gray-400">Đội nhà</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-800 dark:text-white">{scoreParts[0]}</span>
                        <span className="text-gray-300 dark:text-slate-600 text-2xl font-light">-</span>
                        <span className="text-4xl font-black text-slate-800 dark:text-white">{scoreParts[1]}</span>
                    </div>
                    <div className="flex flex-col items-center w-1/3">
                        <div className="font-bold text-lg text-center leading-tight mb-1">{liveMatch.away.name}</div>
                        <div className="text-xs text-gray-400">Đội khách</div>
                    </div>
                </div>
                <PinnedChartsBar
                    pins={matchPins}
                    onOpen={setOpenPinIdx}
                    onRemove={removePinnedChart}
                />
            </div>

            <div className="px-4 mt-4 space-y-4">
                <LiveStatsTable
                    liveMatch={liveMatch}
                    oddsHistory={oddsHistory}
                    homeOddsHistory={homeOddsHistory}
                    apiChartData={apiChartDataFull}
                    h1HomeOddsHistory={[]}
                    h1OverUnderOddsHistory={[]}
                />

                {(marketChartDataH1.length > 0 || apiChartDataH1.length > 0) && (
                    <MomentumChart
                        title="Tài/Xỉu (1_3) + Đội nhà (1_2) & Dòng thời gian API"
                        halfSubtitle="Hiệp 1 — gồm bù giờ (trục có thể >45')"
                        iconColor="text-emerald-500"
                        chartIdSuffix="ou-h1"
                        xDomain={xDomainH1}
                        xTicks={ticksH1Memo}
                        marketData={marketChartDataH1}
                        sortedMarketData={sortedMarketChartDataH1}
                        apiChartData={apiChartDataH1}
                        yAxisConfig={overUnderYAxisConfigH1}
                        secondaryMarketData={homeMarketChartDataH1}
                        secondarySortedData={sortedHomeMarketChartDataH1}
                        secondaryYAxisConfig={homeAwayYAxisConfigH1}
                        secondaryLabel="Đội nhà (1_2)"
                        shotEvents={shotEventsH1}
                        gameEvents={gameEventsH1}
                    />
                )}

                {inSecondHalf && (marketChartDataH2.length > 0 || apiChartDataH2.length > 0) && (
                    <MomentumChart
                        title="Tài/Xỉu (1_3) + Đội nhà (1_2) & Dòng thời gian API"
                        halfSubtitle="Hiệp 2 — đồng hồ từ 45'"
                        iconColor="text-emerald-500"
                        chartIdSuffix="ou-h2"
                        xDomain={xDomainH2}
                        xTicks={ticksH2Memo}
                        marketData={marketChartDataH2}
                        sortedMarketData={sortedMarketChartDataH2}
                        apiChartData={apiChartDataH2}
                        yAxisConfig={overUnderYAxisConfigH2}
                        secondaryMarketData={homeMarketChartDataH2}
                        secondarySortedData={sortedHomeMarketChartDataH2}
                        secondaryYAxisConfig={homeAwayYAxisConfigH2}
                        secondaryLabel="Đội nhà (1_2)"
                        shotEvents={shotEventsH2}
                        gameEvents={gameEventsH2}
                    />
                )}

                <div className="space-y-4">
                    <div>
                        <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90 uppercase tracking-wide mb-2">
                            Hiệp 1 {inSecondHalf ? ' (đã kết thúc)' : ' (đang diễn ra)'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <StatBox
                                label="Tấn công"
                                home={halfPeriodStats.h1?.attacks[0] ?? 0}
                                away={halfPeriodStats.h1?.attacks[1] ?? 0}
                                empty={inSecondHalf && !halfPeriodStats.h1}
                            />
                            <StatBox
                                label="Nguy hiểm"
                                home={halfPeriodStats.h1?.dangerous_attacks[0] ?? 0}
                                away={halfPeriodStats.h1?.dangerous_attacks[1] ?? 0}
                                highlight
                                empty={inSecondHalf && !halfPeriodStats.h1}
                            />
                            <StatBox
                                label="Trúng đích"
                                home={halfPeriodStats.h1?.on_target[0] ?? 0}
                                away={halfPeriodStats.h1?.on_target[1] ?? 0}
                                highlight
                                empty={inSecondHalf && !halfPeriodStats.h1}
                            />
                            <StatBox
                                label="Phạt góc"
                                home={halfPeriodStats.h1?.corners[0] ?? 0}
                                away={halfPeriodStats.h1?.corners[1] ?? 0}
                                empty={inSecondHalf && !halfPeriodStats.h1}
                            />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-sky-700/90 dark:text-sky-400/90 uppercase tracking-wide mb-2">
                            Hiệp 2 {inSecondHalf ? ' (đang diễn ra)' : ' (chưa bắt đầu)'}
                        </p>
                        {!inSecondHalf ? (
                            <p className="text-xs text-center text-slate-500 dark:text-slate-400 py-3 px-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
                                Số liệu hiệp 2 sẽ hiển thị sau giờ nghỉ (chỉ số trong H2, không gồm H1).
                            </p>
                        ) : (
                            <>
                                {!halfPeriodStats.hasH1Anchor && (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
                                        * Chưa có mốc thống kê cuối hiệp 1 trong phiên này — cột Hiệp 2 đang dùng tổng trận làm gần đúng.
                                    </p>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <StatBox label="Tấn công" home={halfPeriodStats.h2!.attacks[0]} away={halfPeriodStats.h2!.attacks[1]} />
                                    <StatBox label="Nguy hiểm" home={halfPeriodStats.h2!.dangerous_attacks[0]} away={halfPeriodStats.h2!.dangerous_attacks[1]} highlight />
                                    <StatBox label="Trúng đích" home={halfPeriodStats.h2!.on_target[0]} away={halfPeriodStats.h2!.on_target[1]} highlight />
                                    <StatBox label="Phạt góc" home={halfPeriodStats.h2!.corners[0]} away={halfPeriodStats.h2!.corners[1]} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {openPinIdx != null && matchPins[openPinIdx] && (() => {
                const pin = matchPins[openPinIdx];
                const goto = (dir: -1 | 1) => {
                    const n = matchPins.length;
                    setOpenPinIdx((openPinIdx + dir + n) % n);
                };
                const compareLocal = buildLocalChartBundle({
                    matchId: liveMatch.id,
                    liveMatch,
                    statsHistory,
                    oddsHistory,
                    homeOddsHistory,
                    h1OuHistory: [],
                    h1AhHistory: [],
                    gameEvents,
                    alertHistory: [],
                });
                return (
                    <Ou13ChartModal
                        key={pin.matchId}
                        matchId={pin.matchId}
                        title={pin.team}
                        subtitle={`FT ${pin.ft ?? '—'}${pin.half != null ? ` · tình huống H${pin.half} · ${pin.minute ?? '—'}'` : ''}`}
                        marker={
                            pin.half != null && pin.minute != null
                                ? { half: pin.half, minute: pin.minute }
                                : undefined
                        }
                        compareLocal={compareLocal}
                        compareMarker={
                            Number.isFinite(clockTm) && clockTm > 0
                                ? { half: inSecondHalf ? 2 : 1, minute: Math.round(clockTm) }
                                : undefined
                        }
                        primaryLabel="Trận tương tự"
                        compareLabel={`Trận đang xem · ${liveMatch.home.name} vs ${liveMatch.away.name}`}
                        pin={pin}
                        openHref={buildSimilarMatchTabUrl({
                            matchId: pin.matchId,
                            half: pin.half,
                            minute: pin.minute,
                            team: pin.team,
                            ft: pin.ft,
                            label: pin.label,
                            label30: pin.label30,
                            similarity: pin.similarity,
                            feats: pin.feats,
                        })}
                        onPrev={matchPins.length > 1 ? () => goto(-1) : undefined}
                        onNext={matchPins.length > 1 ? () => goto(1) : undefined}
                        navPosition={
                            matchPins.length > 1
                                ? { index: openPinIdx, total: matchPins.length }
                                : undefined
                        }
                        onClose={() => setOpenPinIdx(null)}
                    />
                );
            })()}
        </div>
    );
};
