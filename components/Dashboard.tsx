import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MatchInfo, ProcessedStats, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot } from '../types';
import { parseStats, getMatchDetails, getMatchOdds } from '../services/api';
import {
    normalizeOverUnderSnapshots,
    normalizeAsianHandicapSnapshots,
    mergeOuSnapshotsKeepLowestOver,
    mergeOuSnapshotsKeepHighestUnder,
} from '../services/oddsNormalize';
import {
    decodeStatTimelineKey,
    encodeStatTimelineKey,
    resolveMatchHalfForUI,
    resolveStatsHalfFromSnapshots,
    type MatchHalf,
} from '../services/matchTimeline';
import {
    colorOddsSeriesForPressure,
    colorOddsSeriesForUnderXiu,
    colorOddsSeriesForAsianHandicapHome,
    calculateAhChapYAxisConfig,
    applyHalfFromMinuteForFullMatchOdds,
    halfChartDomainMax,
    minuteTicks,
} from '../services/odds-pressure-series';
import { ArrowLeft, RefreshCw, Moon, Sun } from 'lucide-react';
import { LiveStatsTable } from './LiveStatsTable';
import { OuLowPriceTable } from './OuLowPriceTable';
import { Ou13ChartModal } from './Ou13ChartModal';
import { PinnedChartsBar } from './PinnedChartsBar';
import { PinnedMatchAiAnalysisPanel } from './PinnedMatchAiAnalysisPanel';
import { buildSimilarMatchTabUrl } from './SimilarMatchTabPage';
import { buildLocalChartBundle } from './GoalPredictionBadge';
import { SimilarMatchesPanel, SimilarMatchSnapshotsBar } from './SimilarMatchesPanel';
import { HermesConnectButton } from './HermesConnectButton';
import {
    loadPinnedCharts,
    removePinnedChart,
    PINNED_CHARTS_UPDATED_EVENT,
    pinnedChartKey,
    pinsForSourceMatch,
    type PinnedChart,
} from '../services/pinned-charts';
import {
    fetchPinnedMatchAnalysis,
    type PinnedAnalyzeResponse,
} from '../services/pinned-ai-analysis';
import {
    getPinnedAiAnalysis,
    loadPinnedAiAnalyses,
    PINNED_AI_ANALYSIS_UPDATED_EVENT,
    removePinnedAiAnalysisForPin,
    savePinnedAiAnalysis,
} from '../services/pinned-ai-analysis-store';
import { calculateAPIScore } from '../services/traditionalFactors';
import { MomentumChart } from './MomentumChart';
import { MatchNotesPanel } from './MatchNotesPanel';
import { ensureGoalNotifyPermission, notifyGoal } from '../services/goal-notify';
import {
    detectOuLineDrop,
    notifyOuLineDropInApp,
    postOuLineDropAlert,
    tipFromOuHistory,
    type OuLineDropHit,
    type OuTipSnapshot,
    OU_LINE_DROP_PRICE_MAX,
} from '../services/ou-line-drop-alert';
import { TelegramBindButton } from './TelegramBindButton';
import { StatBox } from './StatDisplay';
import {
    AH_KEY,
    OU_KEY,
    OU_H1_KEY,
    OU_UNDER_KEY,
    OU_UNDER_H1_KEY,
    AH_H1_KEY,
    VIEWED_MATCHES_HISTORY_UPDATED_EVENT,
} from '../services/match-markdown-export';
import { safeSetItem } from '../services/safe-storage';

function buildOuAlertStatsExtras(match: MatchInfo): {
  statsLines: string[];
  perTeamApiLines: string[];
} {
  const st = parseStats(match.stats);
  const homeApi = calculateAPIScore(st, 0);
  const awayApi = calculateAPIScore(st, 1);
  const statsLines = [
    `Attacks ${st.attacks[0]}-${st.attacks[1]}`,
    `Dangerous ${st.dangerous_attacks[0]}-${st.dangerous_attacks[1]}`,
    `On target ${st.on_target[0]}-${st.on_target[1]}`,
    `Corners ${st.corners[0]}-${st.corners[1]}`,
  ];
  const perTeamApiLines = [
    `API ${match.home.name}: ${homeApi.toFixed(1)} | ${match.away.name}: ${awayApi.toFixed(1)}`,
  ];
  return { statsLines, perTeamApiLines };
}

interface ShotEvent {
    minute: number;
    type: 'on' | 'off';
    half: MatchHalf;
}

type GoalScorerTeam = 'home' | 'away';

interface GameEvent {
    minute: number;
    type: 'goal' | 'corner';
    half: MatchHalf;
    /** Đội ghi bàn — chỉ có khi type === 'goal'. */
    team?: GoalScorerTeam;
}

function parseMatchScores(ss: string): [number, number] {
    const parts = (ss || '0-0').split('-').map((x) => parseInt(x, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0];
}

/** Một hiệp + một phút + một đội chỉ một marker bàn (tránh duplicate khi refresh). */
function dedupeGoalMarkersByHalfMinute(events: GameEvent[]): GameEvent[] {
    const seenGoal = new Set<string>();
    const out: GameEvent[] = [];
    for (const e of events) {
        if (e.type !== 'goal') {
            out.push(e);
            continue;
        }
        const h = e.half ?? 1;
        const k = `${h}-${e.minute}-${e.team ?? '?'}`;
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
    theme?: 'light' | 'dark';
    onToggleTheme?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, match, onBack, theme = 'dark', onToggleTheme }) => {
    const AUTO_REFRESH_INTERVAL_MS = 15_000;
    const [liveMatch, setLiveMatch] = useState<MatchInfo>(() => ({ ...match, id: String(match.id) }));
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [oddsHistory, setOddsHistory] = useState<OverUnderMinuteSnapshot[]>([]);
    /** Nến Xỉu 1_3 — mỗi phút giữ giá under cao nhất (tách khỏi lịch sử Tài). */
    const [underOddsHistory, setUnderOddsHistory] = useState<OverUnderMinuteSnapshot[]>([]);
    const [homeOddsHistory, setHomeOddsHistory] = useState<AsianHandicapMinuteSnapshot[]>([]);
    /** Kèo hiệp 1: T/X H1 (1_6) + chấp Đội nhà H1 (1_5) — thường ngừng cập nhật sau giờ nghỉ. */
    const [h1OuOddsHistory, setH1OuOddsHistory] = useState<OverUnderMinuteSnapshot[]>([]);
    /** Nến Xỉu 1_6 — mỗi phút giữ giá under cao nhất. */
    const [h1UnderOddsHistory, setH1UnderOddsHistory] = useState<OverUnderMinuteSnapshot[]>([]);
    const [h1HomeOddsHistory, setH1HomeOddsHistory] = useState<AsianHandicapMinuteSnapshot[]>([]);
    /** Toast trong app khi có bàn thắng ở trận đang mở. */
    const [goalToast, setGoalToast] = useState<
        { home: string; away: string; score: string; half: 1 | 2; minute: number; scorer?: string } | null
    >(null);
    /** Toast khi hạ line 1_3/1_6 + Tài ≤ ngưỡng. */
    const [ouLineDropToast, setOuLineDropToast] = useState<{
        market: '1_3' | '1_6';
        prevLine: number;
        currLine: number;
        overOdds: number;
        matchLabel: string;
    } | null>(null);
    const lastOuTipRef = useRef<Partial<Record<'1_3' | '1_6', OuTipSnapshot>>>({});
    const ouDropFiredRef = useRef<Set<string>>(new Set());
    const [statsHistory, setStatsHistory] = useState<Record<number, ProcessedStats>>({});
    const [shotEvents, setShotEvents] = useState<ShotEvent[]>([]);
    const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);

    const statsHistoryRef = useRef(statsHistory);
    const gameEventsRef = useRef(gameEvents);
    const liveMatchRef = useRef(liveMatch);
    useEffect(() => {
        statsHistoryRef.current = statsHistory;
    }, [statsHistory]);
    useEffect(() => {
        gameEventsRef.current = gameEvents;
    }, [gameEvents]);
    useEffect(() => {
        liveMatchRef.current = liveMatch;
    }, [liveMatch]);

    const maxGoalsSeen = useRef<number | null>(null);
    const maxCornersSeen = useRef<number | null>(null);
    const prevHomeScore = useRef<number | null>(null);
    const prevAwayScore = useRef<number | null>(null);

    const [pinnedCharts, setPinnedCharts] = useState<PinnedChart[]>(() => loadPinnedCharts());
    /** Các ghim đang mở — có thể mở nhiều cửa sổ so sánh song song. */
    const [openPinKeys, setOpenPinKeys] = useState<Set<string>>(() => new Set());
    /** Thứ tự z-index: phần tử cuối = trên cùng. */
    const [pinStackOrder, setPinStackOrder] = useState<string[]>([]);
    const [analyzingPinKey, setAnalyzingPinKey] = useState<string | null>(null);
    const [analysisPin, setAnalysisPin] = useState<PinnedChart | null>(null);
    const [analysisData, setAnalysisData] = useState<PinnedAnalyzeResponse | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisSavedAt, setAnalysisSavedAt] = useState<number | null>(null);
    const [pinnedAiRevision, setPinnedAiRevision] = useState(0);
    const analysisAbortRef = useRef<AbortController | null>(null);
    const matchPins = useMemo(
        () => pinsForSourceMatch(pinnedCharts, liveMatch.id),
        [pinnedCharts, liveMatch.id],
    );

    const savedAiByPinKey = useMemo(() => {
        void pinnedAiRevision;
        const list = loadPinnedAiAnalyses(String(liveMatch.id));
        const map: Record<string, { score?: number; ts: number }> = {};
        for (const r of list) {
            if (r.data != null || r.error) {
                map[r.pinKey] = {
                    score: r.data?.analysis?.similarityScore,
                    ts: r.ts,
                };
            }
        }
        return map;
    }, [liveMatch.id, pinnedAiRevision]);

    useEffect(() => {
        setOpenPinKeys(new Set());
        setPinStackOrder([]);
        setAnalysisPin(null);
        setAnalysisData(null);
        setAnalysisError(null);
        setAnalysisSavedAt(null);
        setAnalyzingPinKey(null);
        analysisAbortRef.current?.abort();
    }, [liveMatch.id]);

    useEffect(() => {
        const onAiSaved = (e: Event) => {
            const detail = (e as CustomEvent<{ sourceMatchId?: string }>).detail;
            if (detail?.sourceMatchId === String(liveMatch.id)) {
                setPinnedAiRevision((v) => v + 1);
            }
        };
        window.addEventListener(PINNED_AI_ANALYSIS_UPDATED_EVENT, onAiSaved);
        return () => window.removeEventListener(PINNED_AI_ANALYSIS_UPDATED_EVENT, onAiSaved);
    }, [liveMatch.id]);

    const togglePinOpen = useCallback((index: number) => {
        const pin = matchPins[index];
        if (!pin) return;
        const key = pinnedChartKey(pin);
        setOpenPinKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
                setPinStackOrder((order) => order.filter((k) => k !== key));
            } else {
                next.add(key);
                setPinStackOrder((order) => [...order.filter((k) => k !== key), key]);
            }
            return next;
        });
    }, [matchPins]);

    const closePin = useCallback((key: string) => {
        setOpenPinKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
        setPinStackOrder((order) => order.filter((k) => k !== key));
    }, []);

    const focusPin = useCallback((key: string) => {
        setPinStackOrder((order) => [...order.filter((k) => k !== key), key]);
    }, []);

    const runPinnedAnalysis = useCallback(
        async (pin: PinnedChart, forceRefresh = false) => {
            const key = pinnedChartKey(pin);
            const sourceMatchId = String(liveMatch.id);

            if (!forceRefresh) {
                const saved = getPinnedAiAnalysis(sourceMatchId, pin);
                if (saved && (saved.data != null || saved.error)) {
                    setAnalysisPin(pin);
                    setAnalysisData(saved.data ?? null);
                    setAnalysisError(saved.error ?? null);
                    setAnalysisSavedAt(saved.ts);
                    setAnalyzingPinKey(null);
                    return;
                }
            }

            analysisAbortRef.current?.abort();
            const ctrl = new AbortController();
            analysisAbortRef.current = ctrl;
            setAnalyzingPinKey(key);
            setAnalysisPin(pin);
            setAnalysisData(null);
            setAnalysisError(null);
            setAnalysisSavedAt(null);
            try {
                const r = await fetchPinnedMatchAnalysis(
                    {
                        matchId: sourceMatchId,
                        liveMatch,
                        statsHistory,
                        oddsHistory,
                        homeOddsHistory,
                        gameEvents,
                    },
                    pin,
                    ctrl.signal,
                );
                if (ctrl.signal.aborted) return;
                const sourceScore = liveMatch.ss || '0-0';
                if (r.ok === false) {
                    setAnalysisError(r.error);
                    savePinnedAiAnalysis(sourceMatchId, pin, {
                        error: r.error,
                        sourceScore,
                    });
                    setAnalysisSavedAt(Date.now());
                } else {
                    setAnalysisData(r.data);
                    savePinnedAiAnalysis(sourceMatchId, pin, {
                        data: r.data,
                        sourceScore,
                    });
                    setAnalysisSavedAt(Date.now());
                }
            } finally {
                if (!ctrl.signal.aborted) setAnalyzingPinKey(null);
            }
        },
        [liveMatch, statsHistory, oddsHistory, homeOddsHistory, gameEvents],
    );

    const closePinnedAnalysis = useCallback(() => {
        analysisAbortRef.current?.abort();
        setAnalysisPin(null);
        setAnalysisData(null);
        setAnalysisError(null);
        setAnalysisSavedAt(null);
        setAnalyzingPinKey(null);
    }, []);

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

    // Xin quyền thông báo trình duyệt sớm (1 lần) để lần có bàn đầu đã sẵn quyền.
    useEffect(() => {
        ensureGoalNotifyPermission();
    }, []);

    // Tự ẩn toast bàn thắng sau vài giây.
    useEffect(() => {
        if (!goalToast) return;
        const id = window.setTimeout(() => setGoalToast(null), 8000);
        return () => window.clearTimeout(id);
    }, [goalToast]);

    // Tự ẩn toast hạ line OU.
    useEffect(() => {
        if (!ouLineDropToast) return;
        const id = window.setTimeout(() => setOuLineDropToast(null), 12_000);
        return () => window.clearTimeout(id);
    }, [ouLineDropToast]);

    // Đổi trận → reset baseline tip (tránh so sánh sai giữa 2 trận).
    useEffect(() => {
        lastOuTipRef.current = {};
        ouDropFiredRef.current = new Set();
    }, [liveMatch.id]);

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
        setH1OuOddsHistory(safeParse<OverUnderMinuteSnapshot[]>(localStorage.getItem(OU_H1_KEY(match.id)), []));
        setH1UnderOddsHistory(safeParse<OverUnderMinuteSnapshot[]>(localStorage.getItem(OU_UNDER_H1_KEY(match.id)), []));
        setH1HomeOddsHistory(safeParse<AsianHandicapMinuteSnapshot[]>(localStorage.getItem(AH_H1_KEY(match.id)), []));
        setOddsHistory(safeParse<OverUnderMinuteSnapshot[]>(localStorage.getItem(OU_KEY(match.id)), []));
        setUnderOddsHistory(safeParse<OverUnderMinuteSnapshot[]>(localStorage.getItem(OU_UNDER_KEY(match.id)), []));
        setHomeOddsHistory(safeParse<AsianHandicapMinuteSnapshot[]>(localStorage.getItem(AH_KEY(match.id)), []));
        setGoalToast(null);
        maxGoalsSeen.current = null;
        maxCornersSeen.current = null;
        prevHomeScore.current = null;
        prevAwayScore.current = null;
    }, [match.id]);

    useEffect(() => {
        try {
            const historyStr = localStorage.getItem('viewedMatchesHistory');
            const history = historyStr ? JSON.parse(historyStr) : {};
            const prev = history[match.id] as { viewedAt?: number } | undefined;
            history[match.id] = {
                match: liveMatch,
                viewedAt: prev?.viewedAt ?? Date.now(),
            };
            safeSetItem('viewedMatchesHistory', JSON.stringify(history), { keepMatchId: match.id });
            window.dispatchEvent(new CustomEvent(VIEWED_MATCHES_HISTORY_UPDATED_EVENT));
        } catch (e) {
            console.error('Failed to update viewed matches history:', e);
        }
        // Chỉ cập nhật snapshot khi đổi trận hoặc tỷ số/trạng thái — không gắn statsHistory (gây ghi liên tục → quota → mất lịch sử).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [match.id, liveMatch.ss, liveMatch.time, liveMatch.timer?.tm, liveMatch.timer?.tt]);

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
        if (underOddsHistory.length > 0) {
            safeSetItem(OU_UNDER_KEY(match.id), JSON.stringify(underOddsHistory), { keepMatchId: match.id });
        }
    }, [underOddsHistory, match.id]);

    useEffect(() => {
        if (homeOddsHistory.length > 0) {
            safeSetItem(AH_KEY(match.id), JSON.stringify(homeOddsHistory), { keepMatchId: match.id });
        }
    }, [homeOddsHistory, match.id]);

    useEffect(() => {
        if (h1OuOddsHistory.length > 0) {
            safeSetItem(OU_H1_KEY(match.id), JSON.stringify(h1OuOddsHistory), { keepMatchId: match.id });
        }
    }, [h1OuOddsHistory, match.id]);

    useEffect(() => {
        if (h1UnderOddsHistory.length > 0) {
            safeSetItem(OU_UNDER_H1_KEY(match.id), JSON.stringify(h1UnderOddsHistory), { keepMatchId: match.id });
        }
    }, [h1UnderOddsHistory, match.id]);

    useEffect(() => {
        if (h1HomeOddsHistory.length > 0) {
            safeSetItem(AH_H1_KEY(match.id), JSON.stringify(h1HomeOddsHistory), { keepMatchId: match.id });
        }
    }, [h1HomeOddsHistory, match.id]);

    const marketChartData = useMemo(
        () => applyHalfFromMinuteForFullMatchOdds(colorOddsSeriesForPressure(oddsHistory), inSecondHalf),
        [oddsHistory, inSecondHalf],
    );
    const homeMarketChartData = useMemo(
        () => applyHalfFromMinuteForFullMatchOdds(colorOddsSeriesForAsianHandicapHome(homeOddsHistory), inSecondHalf),
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

    /** Giá Xỉu 1_3 — mỗi phút under cao nhất; cùng half-split với Tài. */
    const underMarketChartData = useMemo(
        () => applyHalfFromMinuteForFullMatchOdds(colorOddsSeriesForUnderXiu(underOddsHistory), inSecondHalf),
        [underOddsHistory, inSecondHalf],
    );
    const underMarketChartDataH1 = useMemo(
        () => underMarketChartData.filter((p) => (p.half ?? 1) === 1),
        [underMarketChartData],
    );
    const underMarketChartDataH2 = useMemo(
        () => underMarketChartData.filter((p) => p.half === 2),
        [underMarketChartData],
    );
    const sortedUnderMarketChartDataH1 = useMemo(
        () => [...underMarketChartDataH1].sort((a, b) => a.minute - b.minute),
        [underMarketChartDataH1],
    );
    const sortedUnderMarketChartDataH2 = useMemo(
        () => [...underMarketChartDataH2].sort((a, b) => a.minute - b.minute),
        [underMarketChartDataH2],
    );

    /** Kèo riêng H1: 1_6 (OU) + 1_5 (AH) — không slice từ 1_3/1_2. */
    const h1MarketsOuChartData = useMemo(
        () => colorOddsSeriesForPressure(h1OuOddsHistory),
        [h1OuOddsHistory],
    );
    const h1MarketsUnderChartData = useMemo(
        () => colorOddsSeriesForUnderXiu(h1UnderOddsHistory),
        [h1UnderOddsHistory],
    );
    const h1MarketsAhChartData = useMemo(
        () => colorOddsSeriesForAsianHandicapHome(h1HomeOddsHistory),
        [h1HomeOddsHistory],
    );
    const sortedH1MarketsOuChartData = useMemo(
        () => [...h1MarketsOuChartData].sort((a, b) => a.minute - b.minute),
        [h1MarketsOuChartData],
    );
    const sortedH1MarketsUnderChartData = useMemo(
        () => [...h1MarketsUnderChartData].sort((a, b) => a.minute - b.minute),
        [h1MarketsUnderChartData],
    );
    const sortedH1MarketsAhChartData = useMemo(
        () => [...h1MarketsAhChartData].sort((a, b) => a.minute - b.minute),
        [h1MarketsAhChartData],
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
            ...h1MarketsOuChartData.map((p) => p.minute),
            ...h1MarketsAhChartData.map((p) => p.minute),
            ...apiChartDataH1.map((p) => p.minute),
            !inSecondHalf ? clockTm : 0,
        );
        return halfChartDomainMax(1, fromData);
    }, [
        marketChartDataH1,
        homeMarketChartDataH1,
        h1MarketsOuChartData,
        h1MarketsAhChartData,
        apiChartDataH1,
        clockTm,
        inSecondHalf,
    ]);

    const h2DomainMax = useMemo(() => {
        const fromData = Math.max(
            90,
            ...marketChartDataH2.map((p) => p.minute),
            ...homeMarketChartDataH2.map((p) => p.minute),
            ...apiChartDataH2.map((p) => p.minute),
            inSecondHalf ? clockTm : 45,
        );
        return halfChartDomainMax(2, fromData);
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
        () => calculateAhChapYAxisConfig(homeMarketChartDataH1, homeMarketChartData),
        [homeMarketChartDataH1, homeMarketChartData],
    );
    const homeAwayYAxisConfigH2 = useMemo(
        () => calculateAhChapYAxisConfig(homeMarketChartDataH2, homeMarketChartData),
        [homeMarketChartDataH2, homeMarketChartData],
    );
    const h1MarketsOuYAxisConfig = useMemo(
        () => calculateYAxisConfig(h1MarketsOuChartData, 0.5),
        [h1MarketsOuChartData, calculateYAxisConfig],
    );
    const h1MarketsAhYAxisConfig = useMemo(
        () => calculateAhChapYAxisConfig(h1MarketsAhChartData, h1MarketsAhChartData),
        [h1MarketsAhChartData],
    );

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const details = await getMatchDetails(token, liveMatch.id);
            if (details) setLiveMatch({ ...details, id: String(details.id) });

            const odds = await getMatchOdds(token, liveMatch.id);
            const timerForOdds = details?.timer;
            let normalizedOu: OverUnderMinuteSnapshot[] = [];
            let normalizedAh: AsianHandicapMinuteSnapshot[] = [];
            let normalizedH1Ou: OverUnderMinuteSnapshot[] = [];
            if (odds?.results?.odds) {
                const o = odds.results.odds;
                normalizedOu = normalizeOverUnderSnapshots(o['1_3'], '1_3', { matchTimer: timerForOdds });
                const normalizedOuUnder = normalizeOverUnderSnapshots(o['1_3'], '1_3', {
                    matchTimer: timerForOdds,
                    minutePick: 'highestUnder',
                });
                normalizedAh = normalizeAsianHandicapSnapshots(o['1_2'], '1_2', { matchTimer: timerForOdds });
                // Giữ giá Tài thấp nhất từng thấy theo phút — fetch sau không ghi đè nến bằng giá cao hơn.
                setOddsHistory((prev) => mergeOuSnapshotsKeepLowestOver(prev, normalizedOu));
                // Nến Xỉu: mỗi phút giữ giá under cao nhất từng thấy.
                setUnderOddsHistory((prev) => mergeOuSnapshotsKeepHighestUnder(prev, normalizedOuUnder));
                setHomeOddsHistory(normalizedAh);
                // Kèo hiệp 1 (1_6 T/X H1, 1_5 chấp H1): feed thường ngừng trả sau giờ nghỉ →
                // chỉ ghi đè khi có dữ liệu mới, giữ giá trị H1 cuối cùng xuyên suốt H2.
                normalizedH1Ou = normalizeOverUnderSnapshots(o['1_6'], '1_6', { matchTimer: timerForOdds });
                const normalizedH1OuUnder = normalizeOverUnderSnapshots(o['1_6'], '1_6', {
                    matchTimer: timerForOdds,
                    minutePick: 'highestUnder',
                });
                const normalizedH1Ah = normalizeAsianHandicapSnapshots(o['1_5'], '1_5', { matchTimer: timerForOdds });
                if (normalizedH1Ou.length > 0) {
                    setH1OuOddsHistory((prev) => mergeOuSnapshotsKeepLowestOver(prev, normalizedH1Ou));
                }
                if (normalizedH1OuUnder.length > 0) {
                    setH1UnderOddsHistory((prev) => mergeOuSnapshotsKeepHighestUnder(prev, normalizedH1OuUnder));
                }
                if (normalizedH1Ah.length > 0) setH1HomeOddsHistory(normalizedH1Ah);

                // Cảnh báo hạ line 1_3 / 1_6 + Tài ≤ ngưỡng (tab đang mở).
                const hits: OuLineDropHit[] = [];
                const tip13 = tipFromOuHistory(normalizedOu);
                const hit13 = detectOuLineDrop(lastOuTipRef.current['1_3'], tip13, '1_3');
                if (tip13) lastOuTipRef.current['1_3'] = tip13;
                if (hit13) hits.push(hit13);

                if (normalizedH1Ou.length > 0) {
                    const tip16 = tipFromOuHistory(normalizedH1Ou);
                    const hit16 = detectOuLineDrop(lastOuTipRef.current['1_6'], tip16, '1_6');
                    if (tip16) lastOuTipRef.current['1_6'] = tip16;
                    if (hit16) hits.push(hit16);
                }

                if (hits.length > 0) {
                    const m = details ?? liveMatchRef.current;
                    const matchLabel = `${m.home.name} vs ${m.away.name}`;
                    const score = m.ss || '0-0';
                    const minute =
                        m.timer?.tm ??
                        (parseInt(String(m.time || '0'), 10) || 0);
                    const { statsLines, perTeamApiLines } = buildOuAlertStatsExtras(m);
                    const leagueName = m.league?.name || '—';

                    for (const hit of hits) {
                        const fireKey = `${hit.market}:${hit.prev.handicap.toFixed(2)}>${hit.curr.handicap.toFixed(2)}`;
                        if (ouDropFiredRef.current.has(fireKey)) continue;
                        ouDropFiredRef.current.add(fireKey);

                        notifyOuLineDropInApp(hit, matchLabel);
                        setOuLineDropToast({
                            market: hit.market,
                            prevLine: hit.prev.handicap,
                            currLine: hit.curr.handicap,
                            overOdds: hit.curr.over,
                            matchLabel,
                        });

                        const marketLabel =
                            hit.market === '1_3' ? 'Tài/Xỉu FT (1_3)' : 'Tài/Xỉu H1 (1_6)';
                        void postOuLineDropAlert({
                            matchId: String(liveMatch.id),
                            matchName: matchLabel,
                            leagueName,
                            score,
                            minute: hit.curr.minute || minute,
                            market: hit.market,
                            prevLine: hit.prev.handicap,
                            currLine: hit.curr.handicap,
                            overOdds: hit.curr.over,
                            underOdds: hit.curr.under,
                            statsLines,
                            perTeamApiLines,
                            oddsTwoTeamLines: [
                                `${marketLabel}: ${hit.prev.handicap.toFixed(2)} → ${hit.curr.handicap.toFixed(2)} | Tài @${hit.curr.over.toFixed(3)} | Xỉu @${hit.curr.under.toFixed(3)}`,
                            ],
                        });
                    }
                }
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
        const getS = (m: MatchInfo) => parseMatchScores(m.ss).reduce((a, b) => a + b, 0);
        const getC = (m: MatchInfo) => {
            const st = parseStats(m.stats);
            return st.corners[0] + st.corners[1];
        };
        const goals = getS(liveMatch);
        const corners = getC(liveMatch);
        const [homeNow, awayNow] = parseMatchScores(liveMatch.ss);

        if (maxGoalsSeen.current === null) {
            maxGoalsSeen.current = goals;
            maxCornersSeen.current = corners;
            prevHomeScore.current = homeNow;
            prevAwayScore.current = awayNow;
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
            const prevH = prevHomeScore.current ?? homeNow;
            const prevA = prevAwayScore.current ?? awayNow;
            const homeDiff = Math.max(0, homeNow - prevH);
            const awayDiff = Math.max(0, awayNow - prevA);
            for (let i = 0; i < homeDiff; i++) newE.push({ minute: min, type: 'goal', half, team: 'home' });
            for (let i = 0; i < awayDiff; i++) newE.push({ minute: min, type: 'goal', half, team: 'away' });
            const assigned = homeDiff + awayDiff;
            const remaining = goals - maxGoalsSeen.current - assigned;
            for (let i = 0; i < remaining; i++) newE.push({ minute: min, type: 'goal', half });
            maxGoalsSeen.current = goals;
            prevHomeScore.current = homeNow;
            prevAwayScore.current = awayNow;

            // Thông báo bàn thắng cho trận đang mở (beep + Notification trình duyệt + toast in-app).
            const scorerTeam: 'home' | 'away' | undefined =
                homeDiff > 0 && awayDiff === 0 ? 'home' : awayDiff > 0 && homeDiff === 0 ? 'away' : undefined;
            const score = `${homeNow}-${awayNow}`;
            const halfNum = (half === 2 ? 2 : 1) as 1 | 2;
            notifyGoal({
                matchId: String(liveMatch.id),
                home: liveMatch.home.name,
                away: liveMatch.away.name,
                score,
                half: halfNum,
                minute: min,
                scorerTeam,
            });
            setGoalToast({
                home: liveMatch.home.name,
                away: liveMatch.away.name,
                score,
                half: halfNum,
                minute: min,
                scorer: scorerTeam === 'home' ? liveMatch.home.name : scorerTeam === 'away' ? liveMatch.away.name : undefined,
            });
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
            {ouLineDropToast && (
                <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
                    <button
                        type="button"
                        onClick={() => setOuLineDropToast(null)}
                        className="w-full text-left rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-500 text-white shadow-lg px-4 py-3"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📉</span>
                            <div className="min-w-0">
                                <div className="font-extrabold text-sm truncate">
                                    HẠ LINE {ouLineDropToast.market} — Tài ≤ {OU_LINE_DROP_PRICE_MAX}
                                </div>
                                <div className="text-[11px] opacity-90 truncate">
                                    {ouLineDropToast.matchLabel}: {ouLineDropToast.prevLine.toFixed(2)} →{' '}
                                    {ouLineDropToast.currLine.toFixed(2)} · Tài @{ouLineDropToast.overOdds.toFixed(3)}
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            )}
            {goalToast && (
                <div className={`fixed ${ouLineDropToast ? 'top-24' : 'top-3'} left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md`}>
                    <button
                        type="button"
                        onClick={() => setGoalToast(null)}
                        className="w-full text-left rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-500 text-white shadow-lg px-4 py-3 animate-pulse"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⚽</span>
                            <div className="min-w-0">
                                <div className="font-extrabold text-sm truncate">
                                    BÀN THẮNG — {goalToast.home} {goalToast.score} {goalToast.away}
                                </div>
                                <div className="text-[11px] opacity-90">
                                    H{goalToast.half} · {goalToast.minute}'
                                    {goalToast.scorer ? ` — ${goalToast.scorer} ghi bàn` : ''}
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            )}
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
                        {onToggleTheme && (
                            <button
                                type="button"
                                onClick={onToggleTheme}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                                title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
                            >
                                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </button>
                        )}
                        <TelegramBindButton />
                        <HermesConnectButton
                            matchId={liveMatch.id}
                            homeName={liveMatch.home.name}
                            awayName={liveMatch.away.name}
                            leagueName={liveMatch.league?.name}
                        />
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
                <SimilarMatchSnapshotsBar
                    matchId={liveMatch.id}
                    liveMatch={liveMatch}
                    statsHistory={statsHistory}
                    oddsHistory={oddsHistory}
                    homeOddsHistory={homeOddsHistory}
                    gameEvents={gameEvents}
                    alertHistory={emptyAlertHistory}
                />
                <PinnedChartsBar
                    pins={matchPins}
                    openKeys={openPinKeys}
                    analyzingKey={analyzingPinKey}
                    savedAiByPinKey={savedAiByPinKey}
                    onOpen={togglePinOpen}
                    onAnalyze={runPinnedAnalysis}
                    onRemove={(pin) => {
                        removePinnedChart(pin);
                        removePinnedAiAnalysisForPin(String(liveMatch.id), pin);
                        setPinnedCharts(loadPinnedCharts());
                        closePin(pinnedChartKey(pin));
                        if (analysisPin && pinnedChartKey(analysisPin) === pinnedChartKey(pin)) {
                            closePinnedAnalysis();
                        }
                    }}
                />
            </div>

            <div className="px-4 mt-4 space-y-6">
                <LiveStatsTable
                    liveMatch={liveMatch}
                    oddsHistory={oddsHistory}
                    homeOddsHistory={homeOddsHistory}
                    apiChartData={apiChartDataFull}
                    h1HomeOddsHistory={h1HomeOddsHistory}
                    h1OverUnderOddsHistory={h1OuOddsHistory}
                />

                <OuLowPriceTable
                    oddsHistory={oddsHistory}
                    h1OuOddsHistory={h1OuOddsHistory}
                    statsHistory={statsHistory}
                    liveHalf={inSecondHalf ? (2 as const) : (1 as const)}
                    liveMinute={clockTm}
                    liveStats={parseStats(liveMatch.stats)}
                />

                <MatchNotesPanel
                    matchId={String(liveMatch.id)}
                    half={inSecondHalf ? 2 : 1}
                    minute={clockTm}
                />

                {(() => {
                    const showH1Chart = marketChartDataH1.length > 0 || apiChartDataH1.length > 0;
                    const showH2Chart =
                        inSecondHalf && (marketChartDataH2.length > 0 || apiChartDataH2.length > 0);
                    const showH1UnderChart =
                        underMarketChartDataH1.length > 0 || apiChartDataH1.length > 0;
                    const showH2UnderChart =
                        inSecondHalf && (underMarketChartDataH2.length > 0 || apiChartDataH2.length > 0);
                    const showH1MarketsChart =
                        h1MarketsOuChartData.length > 0 || h1MarketsAhChartData.length > 0;
                    const showH1MarketsUnderChart =
                        h1MarketsUnderChartData.length > 0 || h1MarketsAhChartData.length > 0;
                    return (
                        <div className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-1">
                                    <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90 uppercase tracking-wide px-3 pt-2 pb-1">
                                        Biểu đồ Hiệp 1 · cả trận (1_3 + 1_2)
                                    </p>
                                    {showH1Chart ? (
                                        <MomentumChart
                                            title="Tài/Xỉu (1_3) + Đội chấp (1_2) & Dòng thời gian API"
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
                                            secondaryLabel="Đội chấp (1_2)"
                                            secondaryOddsField="chapOdds"
                                            shotEvents={shotEventsH1}
                                            gameEvents={gameEventsH1}
                                            homeTeamName={liveMatch.home.name}
                                            awayTeamName={liveMatch.away.name}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-56 text-xs text-slate-400 dark:text-slate-500">
                                            Chưa có dữ liệu Hiệp 1
                                        </div>
                                    )}
                                </section>
                                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-1">
                                    <p className="text-[11px] font-bold text-sky-700/90 dark:text-sky-400/90 uppercase tracking-wide px-3 pt-2 pb-1">
                                        Biểu đồ Hiệp 2 · cả trận (1_3 + 1_2)
                                    </p>
                                    {showH2Chart ? (
                                        <MomentumChart
                                            title="Tài/Xỉu (1_3) + Đội chấp (1_2) & Dòng thời gian API"
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
                                            secondaryLabel="Đội chấp (1_2)"
                                            secondaryOddsField="chapOdds"
                                            shotEvents={shotEventsH2}
                                            gameEvents={gameEventsH2}
                                            homeTeamName={liveMatch.home.name}
                                            awayTeamName={liveMatch.away.name}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-56 text-xs text-slate-400 dark:text-slate-500">
                                            {inSecondHalf ? 'Chưa có dữ liệu Hiệp 2' : 'Hiệp 2 chưa bắt đầu'}
                                        </div>
                                    )}
                                </section>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-1">
                                    <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90 uppercase tracking-wide px-3 pt-2 pb-1">
                                        Giá Xỉu Hiệp 1 · cả trận (1_3 + 1_2)
                                    </p>
                                    {showH1UnderChart ? (
                                        <MomentumChart
                                            title="Giá Xỉu (1_3) + Đội chấp (1_2) & Dòng thời gian API"
                                            halfSubtitle="Hiệp 1 — gồm bù giờ (trục có thể >45')"
                                            iconColor="text-rose-500"
                                            chartIdSuffix="ou-under-h1"
                                            underXiuMode
                                            xDomain={xDomainH1}
                                            xTicks={ticksH1Memo}
                                            marketData={underMarketChartDataH1}
                                            sortedMarketData={sortedUnderMarketChartDataH1}
                                            apiChartData={apiChartDataH1}
                                            yAxisConfig={overUnderYAxisConfigH1}
                                            secondaryMarketData={homeMarketChartDataH1}
                                            secondarySortedData={sortedHomeMarketChartDataH1}
                                            secondaryYAxisConfig={homeAwayYAxisConfigH1}
                                            secondaryLabel="Đội chấp (1_2)"
                                            secondaryOddsField="chapOdds"
                                            shotEvents={shotEventsH1}
                                            gameEvents={gameEventsH1}
                                            homeTeamName={liveMatch.home.name}
                                            awayTeamName={liveMatch.away.name}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-56 text-xs text-slate-400 dark:text-slate-500">
                                            Chưa có dữ liệu Xỉu Hiệp 1
                                        </div>
                                    )}
                                </section>
                                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-1">
                                    <p className="text-[11px] font-bold text-sky-700/90 dark:text-sky-400/90 uppercase tracking-wide px-3 pt-2 pb-1">
                                        Giá Xỉu Hiệp 2 · cả trận (1_3 + 1_2)
                                    </p>
                                    {showH2UnderChart ? (
                                        <MomentumChart
                                            title="Giá Xỉu (1_3) + Đội chấp (1_2) & Dòng thời gian API"
                                            halfSubtitle="Hiệp 2 — đồng hồ từ 45'"
                                            iconColor="text-rose-500"
                                            chartIdSuffix="ou-under-h2"
                                            underXiuMode
                                            xDomain={xDomainH2}
                                            xTicks={ticksH2Memo}
                                            marketData={underMarketChartDataH2}
                                            sortedMarketData={sortedUnderMarketChartDataH2}
                                            apiChartData={apiChartDataH2}
                                            yAxisConfig={overUnderYAxisConfigH2}
                                            secondaryMarketData={homeMarketChartDataH2}
                                            secondarySortedData={sortedHomeMarketChartDataH2}
                                            secondaryYAxisConfig={homeAwayYAxisConfigH2}
                                            secondaryLabel="Đội chấp (1_2)"
                                            secondaryOddsField="chapOdds"
                                            shotEvents={shotEventsH2}
                                            gameEvents={gameEventsH2}
                                            homeTeamName={liveMatch.home.name}
                                            awayTeamName={liveMatch.away.name}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-56 text-xs text-slate-400 dark:text-slate-500">
                                            {inSecondHalf ? 'Chưa có dữ liệu Xỉu Hiệp 2' : 'Hiệp 2 chưa bắt đầu'}
                                        </div>
                                    )}
                                </section>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <section className="rounded-xl border border-violet-200 dark:border-violet-900/50 bg-white/50 dark:bg-slate-900/30 p-1">
                                    <p className="text-[11px] font-bold text-violet-700/90 dark:text-violet-400/90 uppercase tracking-wide px-3 pt-2 pb-1">
                                        Biểu đồ kèo Hiệp 1 (1_6 + 1_5)
                                    </p>
                                    {showH1MarketsChart ? (
                                        <MomentumChart
                                            title="Tài/Xỉu H1 (1_6) + Đội chấp H1 (1_5) & Dòng thời gian API"
                                            halfSubtitle="Kèo riêng hiệp 1 — không phải slice 1_3/1_2"
                                            iconColor="text-violet-500"
                                            chartIdSuffix="ou-h1-markets"
                                            xDomain={xDomainH1}
                                            xTicks={ticksH1Memo}
                                            marketData={h1MarketsOuChartData}
                                            sortedMarketData={sortedH1MarketsOuChartData}
                                            apiChartData={apiChartDataH1}
                                            yAxisConfig={h1MarketsOuYAxisConfig}
                                            secondaryMarketData={h1MarketsAhChartData}
                                            secondarySortedData={sortedH1MarketsAhChartData}
                                            secondaryYAxisConfig={h1MarketsAhYAxisConfig}
                                            secondaryLabel="Đội chấp H1 (1_5)"
                                            secondaryOddsField="chapOdds"
                                            shotEvents={shotEventsH1}
                                            gameEvents={gameEventsH1}
                                            homeTeamName={liveMatch.home.name}
                                            awayTeamName={liveMatch.away.name}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-56 text-xs text-slate-400 dark:text-slate-500">
                                            Chưa có dữ liệu kèo H1 (1_6 / 1_5)
                                        </div>
                                    )}
                                </section>
                                <section className="rounded-xl border border-violet-200 dark:border-violet-900/50 bg-white/50 dark:bg-slate-900/30 p-1">
                                    <p className="text-[11px] font-bold text-violet-700/90 dark:text-violet-400/90 uppercase tracking-wide px-3 pt-2 pb-1">
                                        Giá Xỉu kèo Hiệp 1 (1_6 + 1_5)
                                    </p>
                                    {showH1MarketsUnderChart ? (
                                        <MomentumChart
                                            title="Giá Xỉu H1 (1_6) + Đội chấp H1 (1_5) & Dòng thời gian API"
                                            halfSubtitle="Kèo riêng hiệp 1 — không phải slice 1_3/1_2"
                                            iconColor="text-rose-500"
                                            chartIdSuffix="ou-under-h1-markets"
                                            underXiuMode
                                            xDomain={xDomainH1}
                                            xTicks={ticksH1Memo}
                                            marketData={h1MarketsUnderChartData}
                                            sortedMarketData={sortedH1MarketsUnderChartData}
                                            apiChartData={apiChartDataH1}
                                            yAxisConfig={h1MarketsOuYAxisConfig}
                                            secondaryMarketData={h1MarketsAhChartData}
                                            secondarySortedData={sortedH1MarketsAhChartData}
                                            secondaryYAxisConfig={h1MarketsAhYAxisConfig}
                                            secondaryLabel="Đội chấp H1 (1_5)"
                                            secondaryOddsField="chapOdds"
                                            shotEvents={shotEventsH1}
                                            gameEvents={gameEventsH1}
                                            homeTeamName={liveMatch.home.name}
                                            awayTeamName={liveMatch.away.name}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-56 text-xs text-slate-400 dark:text-slate-500">
                                            Chưa có dữ liệu Xỉu H1 (1_6 / 1_5)
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    );
                })()}

                <div className="grid gap-4 lg:grid-cols-2 items-start">
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

            {matchPins.map((pin, idx) => {
                const key = pinnedChartKey(pin);
                if (!openPinKeys.has(key)) return null;
                const stackIdx = pinStackOrder.indexOf(key);
                const isTopMost = pinStackOrder[pinStackOrder.length - 1] === key;
                const compareLocal = buildLocalChartBundle({
                    matchId: liveMatch.id,
                    liveMatch,
                    statsHistory,
                    oddsHistory,
                    homeOddsHistory,
                    h1OuHistory: h1OuOddsHistory,
                    h1AhHistory: h1HomeOddsHistory,
                    gameEvents,
                    alertHistory: [],
                });
                return (
                    <Ou13ChartModal
                        key={key}
                        mode="floating"
                        stackIndex={stackIdx >= 0 ? stackIdx : idx}
                        zIndex={80 + (stackIdx >= 0 ? stackIdx : idx)}
                        onFocus={() => focusPin(key)}
                        closeOnEscape={isTopMost}
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
                        onClose={() => closePin(key)}
                    />
                );
            })}

            {analysisPin && (
                <PinnedMatchAiAnalysisPanel
                    pin={analysisPin}
                    loading={analyzingPinKey != null}
                    error={analysisError}
                    data={analysisData}
                    savedAt={analysisSavedAt}
                    onClose={closePinnedAnalysis}
                    onRefresh={() => runPinnedAnalysis(analysisPin, true)}
                />
            )}
        </div>
    );
};
