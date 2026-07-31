import React, { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Loader2, Pin, PinOff } from 'lucide-react';
import {
    isChartPinned,
    togglePinnedChart,
    PINNED_CHARTS_UPDATED_EVENT,
    type PinnedChart,
} from '../services/pinned-charts';
import type {
    AsianHandicapMinuteSnapshot,
    ChartAlertMarker,
    OverUnderMinuteSnapshot,
    ProcessedStats,
} from '../types';
import {
    fetchOddsHistory13,
    type AhHistoryPoint,
    type MinuteStatRow,
    type OddsHistoryPoint,
    type UserNoteLite,
} from '../services/goal-prediction';
import {
    calculateOddsYAxisConfig,
    calculateAhChapYAxisConfig,
    colorOddsSeriesForPressure,
    colorOddsSeriesForAsianHandicapHome,
    halfChartDomainMax,
    minuteTicks,
} from '../services/odds-pressure-series';
import { calculateAPIScore } from '../services/traditionalFactors';
import {
    MomentumChart,
    nearestOddsPoint,
    crosshairLeftPx,
    getChartLeftGutter,
    uniqueSortedMinutes,
    type OddsSnap,
} from './MomentumChart';

type GameEventLite = { minute: number; half: 1 | 2; type: 'goal' | 'corner'; team?: 'home' | 'away' };
type ShotEventLite = { minute: number; half: 1 | 2; type: 'on' | 'off' };

/** Dữ liệu chuẩn hóa để vẽ chart — chung cho cả trận tương tự (server) lẫn trận đang xem (local). */
export interface Ou13ChartBundle {
    odds13: OddsHistoryPoint[];
    odds12: AhHistoryPoint[];
    /** OU hiệp 1 (1_6) — kèo riêng H1. */
    odds16?: OddsHistoryPoint[];
    /** AH hiệp 1 (1_5). */
    odds15?: AhHistoryPoint[];
    stats: MinuteStatRow[];
    events: GameEventLite[];
    alertMarkers: ChartAlertMarker[];
    homeName?: string;
    awayName?: string;
    /** Nhận định người dùng (từ .md của trận tương tự, hoặc localStorage của trận đang xem). */
    userNotes?: UserNoteLite[];
}

/** Counter lũy kế theo phút → ProcessedStats để tái dùng calculateAPIScore của Dashboard. */
function rowToProcessed(r: MinuteStatRow): ProcessedStats {
    return {
        attacks: r.attacks,
        dangerous_attacks: r.dangerous,
        on_target: r.onTarget,
        off_target: r.offTarget,
        corners: r.corners,
        yellowcards: [0, 0],
        redcards: [0, 0],
    };
}

/** Suy ra shot events (⚽ trên/lệch đích) từ delta counter lũy kế giữa 2 phút liền nhau cùng hiệp. */
function deriveShotEvents(stats: MinuteStatRow[]): ShotEventLite[] {
    const out: ShotEventLite[] = [];
    for (const half of [1, 2] as const) {
        const rows = stats.filter((r) => r.half === half).sort((a, b) => a.minute - b.minute);
        let prevOn = 0;
        let prevOff = 0;
        rows.forEach((r, i) => {
            const on = (r.onTarget[0] ?? 0) + (r.onTarget[1] ?? 0);
            const off = (r.offTarget[0] ?? 0) + (r.offTarget[1] ?? 0);
            if (i > 0) {
                for (let k = 0; k < on - prevOn; k++) out.push({ minute: r.minute, half, type: 'on' });
                for (let k = 0; k < off - prevOff; k++) out.push({ minute: r.minute, half, type: 'off' });
            }
            prevOn = on;
            prevOff = off;
        });
    }
    return out;
}

/** Props panel kèo riêng H1 (1_6 + 1_5) — giống Dashboard panel violet. */
function buildH1MarketsChartProps(bundle: Ou13ChartBundle) {
    const ou16Snaps: OverUnderMinuteSnapshot[] = (bundle.odds16 ?? []).map((o) => ({
        marketId: '1_6',
        minute: o.minute,
        half: 1 as const,
        handicap: o.handicap,
        over: o.over ?? NaN,
        under: o.under ?? NaN,
    }));
    const ah15Snaps: AsianHandicapMinuteSnapshot[] = (bundle.odds15 ?? []).map((o) => ({
        marketId: '1_5',
        minute: o.minute,
        half: 1 as const,
        handicap: o.handicap,
        home: o.home ?? NaN,
        away: o.away ?? NaN,
    }));

    const marketData = colorOddsSeriesForPressure(ou16Snaps);
    const sortedMarketData = [...marketData].sort((a, b) => a.minute - b.minute);
    const secondaryMarketData = colorOddsSeriesForAsianHandicapHome(ah15Snaps);
    const secondarySortedData = [...secondaryMarketData].sort((a, b) => a.minute - b.minute);

    const apiChartData = bundle.stats
        .filter((r) => r.half === 1)
        .sort((a, b) => a.minute - b.minute)
        .map((r) => {
            const ps = rowToProcessed(r);
            return { minute: r.minute, homeApi: calculateAPIScore(ps, 0), awayApi: calculateAPIScore(ps, 1) };
        });

    const shotEvents = deriveShotEvents(bundle.stats).filter((s) => s.half === 1);
    const gameEvents = bundle.events
        .filter((e) => e.half === 1)
        .map((e) => ({ minute: e.minute, type: e.type, team: e.team }));
    const alertMarkers = bundle.alertMarkers.filter((m) => (m.half ?? 1) === 1);

    const maxMinute = Math.max(
        45,
        ...marketData.map((p) => p.minute),
        ...secondaryMarketData.map((p) => p.minute),
        ...apiChartData.map((p) => p.minute),
    );
    const domainMax = halfChartDomainMax(1, maxMinute);
    const xDomain: [number, number] = [0, domainMax];
    const xTicks = minuteTicks(0, domainMax, 5);

    return {
        marketData,
        sortedMarketData,
        secondaryMarketData,
        secondarySortedData,
        apiChartData,
        shotEvents,
        gameEvents,
        alertMarkers,
        xDomain,
        xTicks,
        yAxisConfig: calculateOddsYAxisConfig(marketData, 0.5),
        secondaryYAxisConfig: calculateAhChapYAxisConfig(secondaryMarketData, secondaryMarketData),
        secondaryOddsField: 'chapOdds' as const,
        isEmpty: marketData.length === 0 && secondaryMarketData.length === 0,
        homeTeamName: bundle.homeName,
        awayTeamName: bundle.awayName,
    };
}

/** Props 1 panel MomentumChart cho 1 hiệp — dựng giống Dashboard (nến + kèo phụ 1_2 + API timeline). */
function buildHalfChartProps(bundle: Ou13ChartBundle, half: 1 | 2) {
    const ou13Snaps: OverUnderMinuteSnapshot[] = bundle.odds13.map((o) => ({
        marketId: '1_3',
        minute: o.minute,
        half: o.half,
        handicap: o.handicap,
        over: o.over ?? NaN,
        under: o.under ?? NaN,
    }));
    const ah12Snaps: AsianHandicapMinuteSnapshot[] = bundle.odds12.map((o) => ({
        marketId: '1_2',
        minute: o.minute,
        half: o.half,
        handicap: o.handicap,
        home: o.home ?? NaN,
        away: o.away ?? NaN,
    }));

    const coloredOu = colorOddsSeriesForPressure(ou13Snaps);
    const coloredAh = colorOddsSeriesForAsianHandicapHome(ah12Snaps);

    const marketData = coloredOu.filter((p) => (p.half ?? 1) === half);
    const sortedMarketData = [...marketData].sort((a, b) => a.minute - b.minute);
    const secondaryMarketData = coloredAh.filter((p) => (p.half ?? 1) === half);
    const secondarySortedData = [...secondaryMarketData].sort((a, b) => a.minute - b.minute);

    const apiChartData = bundle.stats
        .filter((r) => r.half === half)
        .sort((a, b) => a.minute - b.minute)
        .map((r) => {
            const ps = rowToProcessed(r);
            return { minute: r.minute, homeApi: calculateAPIScore(ps, 0), awayApi: calculateAPIScore(ps, 1) };
        });

    const shotEvents = deriveShotEvents(bundle.stats).filter((s) => s.half === half);
    const gameEvents = bundle.events
        .filter((e) => e.half === half)
        .map((e) => ({ minute: e.minute, type: e.type, team: e.team }));
    const alertMarkers = bundle.alertMarkers.filter((m) => (m.half ?? 1) === half);

    // Trục X — H1 tối đa CHART_H1_MINUTE_MAX, H2 tối đa CHART_H2_MINUTE_MAX (bù giờ WC 2026).
    const maxMinute = Math.max(
        half === 1 ? 45 : 90,
        ...marketData.map((p) => p.minute),
        ...secondaryMarketData.map((p) => p.minute),
        ...apiChartData.map((p) => p.minute),
    );
    const domainMax = halfChartDomainMax(half, maxMinute);
    const xDomain: [number, number] = half === 1 ? [0, domainMax] : [45, domainMax];
    const xTicks = minuteTicks(half === 1 ? 0 : 45, domainMax, 5);

    return {
        marketData,
        sortedMarketData,
        secondaryMarketData,
        secondarySortedData,
        apiChartData,
        shotEvents,
        gameEvents,
        alertMarkers,
        xDomain,
        xTicks,
        yAxisConfig: calculateOddsYAxisConfig(marketData, 0.5),
        secondaryYAxisConfig: calculateAhChapYAxisConfig(secondaryMarketData, coloredAh),
        secondaryOddsField: 'chapOdds' as const,
        isEmpty: marketData.length === 0 && apiChartData.length === 0,
        homeTeamName: bundle.homeName,
        awayTeamName: bundle.awayName,
    };
}

/** Hiển thị (chỉ đọc) nhận định người dùng đã ghi — dùng ở bảng so sánh. */
const NotesReadout: React.FC<{ title: string; notes?: UserNoteLite[] }> = ({ title, notes }) => {
    if (!notes || notes.length === 0) return null;
    return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">📝 {title}</div>
            <ul className="space-y-1">
                {notes.map((n, i) => (
                    <li key={i} className="text-[11px] text-slate-700 dark:text-slate-200 flex items-start gap-1.5">
                        <span className="shrink-0 px-1 rounded bg-white/70 dark:bg-slate-900/50 border border-amber-200 dark:border-amber-800 font-semibold">
                            H{n.half} {n.minute}'
                        </span>
                        {n.verdict && (
                            <span
                                className={`shrink-0 px-1 rounded text-[10px] font-bold ${
                                    n.verdict === 'yes' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                }`}
                            >
                                {n.verdict === 'yes' ? 'YES' : 'NO'}
                            </span>
                        )}
                        <span className="whitespace-pre-wrap break-words">{n.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export interface Ou13ChartContentProps {
    /** Trận tương tự — fetch dữ liệu từ server theo matchId. */
    matchId?: string;
    /** Trận đang xem — dữ liệu local, không gọi server. */
    local?: Ou13ChartBundle;
    /** Mốc (hiệp, phút) của tình huống tương tự — vẽ vạch dọc cam 📍 trên panel tương ứng. */
    marker?: { half: 1 | 2; minute: number };
    /**
     * Bundle TRẬN ĐANG XEM để so sánh — khi có thì render xen kẽ theo hiệp:
     * H1 trận chính → H1 trận đang xem → H2 trận chính → H2 trận đang xem.
     * Nếu trận đang xem còn H1 (chưa có dữ liệu H2) vẫn hiển thị biểu đồ H2 của trận tương tự.
     */
    compareLocal?: Ou13ChartBundle;
    /** Mốc (hiệp, phút) hiện tại của trận đang xem — vạch cam 📍 trên panel so sánh. */
    compareMarker?: { half: 1 | 2; minute: number };
    /** Nhãn phân biệt panel khi so sánh (vd "Trận tương tự"). */
    primaryLabel?: string;
    /** Nhãn panel trận đang xem khi so sánh (vd "Trận đang xem"). */
    compareLabel?: string;
    /** Vạch dọc + HUD HDP/giá — bấm nến để chọn phút so sánh. */
    minuteCrosshair?: boolean;
    /** Khóa ←/→ chuyển trận khi đang so sánh phút (ref từ modal). */
    compareNavLockRef?: React.MutableRefObject<boolean>;
}

type HalfChartProps = ReturnType<typeof buildHalfChartProps>;
type H1MarketsChartProps = ReturnType<typeof buildH1MarketsChartProps>;

const H1MarketsPanel: React.FC<{
    props: H1MarketsChartProps;
    idSuffix: string;
    labelPrefix?: string;
    marker?: { half: 1 | 2; minute: number };
    minuteCrosshair?: boolean;
}> = ({ props, idSuffix, labelPrefix, marker, minuteCrosshair }) => {
    const prefix = labelPrefix ? `${labelPrefix} · ` : '';
    if (props.isEmpty) return null;
    const { isEmpty: _omit, ...chartProps } = props;
    return (
        <div>
            <p className="text-[11px] font-bold text-violet-700/90 dark:text-violet-400/90 uppercase tracking-wide mb-2 px-1">
                {prefix}Kèo Hiệp 1 (1_6 + 1_5)
            </p>
            <MomentumChart
                title="Tài/Xỉu H1 (1_6) + Đội chấp H1 (1_5) & Dòng thời gian API"
                halfSubtitle={`${prefix}Kèo riêng hiệp 1 — không phải slice 1_3/1_2`}
                iconColor="text-violet-500"
                chartIdSuffix={idSuffix}
                secondaryLabel="Đội chấp H1 (1_5)"
                {...chartProps}
                minuteCrosshair={minuteCrosshair}
                extraMarkers={marker && marker.half === 1 ? [{ minute: marker.minute }] : []}
            />
        </div>
    );
};

function oddsAtMinute(props: HalfChartProps, minute: number): { ou: OddsSnap | null; ah: OddsSnap | null } {
    return {
        ou: nearestOddsPoint(props.sortedMarketData, minute),
        ah: props.secondarySortedData?.length
            ? nearestOddsPoint(props.secondarySortedData, minute)
            : null,
    };
}

const fmtH = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '—');
const fmtO = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(3) : '—');

/** Bảng HDP/giá 2 trận tại cùng phút — đặt trên 2 biểu đồ so sánh. */
const SyncedCompareInfoTable: React.FC<{
    minute: number;
    simLabel: string;
    curLabel: string;
    sim: { ou: OddsSnap | null; ah: OddsSnap | null };
    cur: { ou: OddsSnap | null; ah: OddsSnap | null };
}> = ({ minute, simLabel, curLabel, sim, cur }) => (
    <div className="w-full max-w-lg mx-auto mb-2">
        <div className="bg-slate-900/96 text-white text-[10px] rounded-lg shadow-xl border border-slate-500/70 overflow-hidden backdrop-blur-sm">
                <div className="bg-indigo-900/50 px-2.5 py-1 font-bold text-indigo-200 text-center border-b border-slate-600">
                    Phút {minute}&apos;
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                            <th className="text-left font-medium px-2 py-1 w-[38%]">Chỉ số</th>
                            <th className="text-center font-semibold px-1 py-1 text-amber-300">{simLabel}</th>
                            <th className="text-center font-semibold px-1 py-1 text-emerald-300">{curLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { label: 'T/X HDP', sim: fmtH(sim.ou?.handicap), cur: fmtH(cur.ou?.handicap) },
                            { label: 'Odds Tài', sim: fmtO(sim.ou?.over), cur: fmtO(cur.ou?.over) },
                            { label: 'Odds Xỉu', sim: fmtO(sim.ou?.under), cur: fmtO(cur.ou?.under) },
                            { label: 'Chấp HDP', sim: fmtH(sim.ah?.handicap), cur: fmtH(cur.ah?.handicap) },
                            {
                                label: 'Odds chấp',
                                sim: fmtO((sim.ah as { chapOdds?: number } | null)?.chapOdds),
                                cur: fmtO((cur.ah as { chapOdds?: number } | null)?.chapOdds),
                            },
                        ].map((row) => (
                            <tr key={row.label} className="border-b border-slate-800/80 last:border-0">
                                <td className="px-2 py-0.5 text-slate-400">{row.label}</td>
                                <td className="px-1 py-0.5 text-center font-mono text-slate-100">{row.sim}</td>
                                <td className="px-1 py-0.5 text-center font-mono text-slate-100">{row.cur}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
    </div>
);

/** Cặp biểu đồ trận tương tự + trận đang xem (cùng hiệp) — chọn phút bằng click nến. */
const SyncedHalfCompareGroup: React.FC<{
    half: 1 | 2;
    simProps: HalfChartProps | null;
    curProps: HalfChartProps;
    primaryLabel?: string;
    compareLabel?: string;
    marker?: { half: 1 | 2; minute: number };
    compareMarker?: { half: 1 | 2; minute: number };
    selectedMinute: number | null;
    onSelectMinute: (minute: number) => void;
}> = ({
    half,
    simProps,
    curProps,
    primaryLabel,
    compareLabel,
    marker,
    compareMarker,
    selectedMinute,
    onSelectMinute,
}) => {
    const groupRef = useRef<HTMLDivElement>(null);
    const topPlotRef = useRef<HTMLDivElement>(null);
    const bottomPlotRef = useRef<HTMLDivElement>(null);
    const [groupWidth, setGroupWidth] = useState(0);
    const [bridgeLine, setBridgeLine] = useState<{ x: number; top: number; height: number } | null>(null);

    const xDomain = simProps?.xDomain ?? curProps.xDomain;
    const leftGutter = getChartLeftGutter(true);
    const hasSimChart = !!simProps && !simProps.isEmpty;
    const compareActive = selectedMinute != null;

    useEffect(() => {
        if (!groupRef.current) return;
        const el = groupRef.current;
        const ro = new ResizeObserver((entries) => {
            if (entries[0]) setGroupWidth(entries[0].contentRect.width);
        });
        ro.observe(el);
        setGroupWidth(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    const updateBridgeLine = useCallback(() => {
        if (
            !compareActive ||
            !hasSimChart ||
            !groupRef.current ||
            !topPlotRef.current ||
            !bottomPlotRef.current
        ) {
            setBridgeLine(null);
            return;
        }
        const group = groupRef.current.getBoundingClientRect();
        const top = topPlotRef.current.getBoundingClientRect();
        const bottom = bottomPlotRef.current.getBoundingClientRect();
        const x = crosshairLeftPx(selectedMinute, group.width, xDomain, leftGutter);
        setBridgeLine({
            x,
            top: top.top - group.top,
            height: bottom.bottom - group.top - (top.top - group.top),
        });
    }, [compareActive, selectedMinute, xDomain, leftGutter, hasSimChart]);

    useLayoutEffect(() => {
        updateBridgeLine();
    }, [updateBridgeLine, groupWidth]);

    const simLabel = primaryLabel || 'Trận tương tự';
    const curLabel = compareLabel || 'Trận đang xem';
    const simOdds =
        compareActive && simProps ? oddsAtMinute(simProps, selectedMinute) : { ou: null, ah: null };
    const curOdds = compareActive ? oddsAtMinute(curProps, selectedMinute) : { ou: null, ah: null };

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide px-1">
                Hiệp {half}
            </p>
            {compareActive && (
                <SyncedCompareInfoTable
                    minute={selectedMinute}
                    simLabel={simLabel}
                    curLabel={curLabel}
                    sim={simOdds}
                    cur={curOdds}
                />
            )}
            <div ref={groupRef} className="relative space-y-1">
                {bridgeLine && (
                    <div
                        className="absolute pointer-events-none z-20 w-px bg-slate-400/55"
                        style={{
                            left: bridgeLine.x,
                            top: bridgeLine.top,
                            height: bridgeLine.height,
                        }}
                        aria-hidden
                    />
                )}
                {simProps && !simProps.isEmpty ? (
                    <OuHalfPanel
                        props={simProps}
                        half={half}
                        idSuffix={`sim-ou-h${half}`}
                        labelPrefix={primaryLabel}
                        marker={marker}
                        minuteCrosshair
                        syncedCrosshairMinute={selectedMinute}
                        onSyncedCrosshairChange={(m) => {
                            if (m != null) onSelectMinute(m);
                        }}
                        plotAreaRef={topPlotRef}
                        suppressCrosshairHud
                    />
                ) : null}
                {!curProps.isEmpty ? (
                    <OuHalfPanel
                        props={curProps}
                        half={half}
                        idSuffix={`cur-ou-h${half}`}
                        labelPrefix={compareLabel}
                        marker={compareMarker}
                        minuteCrosshair
                        syncedCrosshairMinute={selectedMinute}
                        onSyncedCrosshairChange={(m) => {
                            if (m != null) onSelectMinute(m);
                        }}
                        plotAreaRef={hasSimChart ? bottomPlotRef : topPlotRef}
                        suppressCrosshairHud
                    />
                ) : null}
            </div>
            <p className="text-[10px] text-indigo-600/90 dark:text-indigo-400/90 mt-1 mb-2 px-1 text-center">
                {compareActive
                    ? `Hiệp ${half}: ← → đổi phút · Esc thoát so sánh`
                    : `Hiệp ${half}: bấm/kéo biểu đồ hoặc nến T/X để bám vạch kèo so sánh 2 trận`}
            </p>
        </div>
    );
};

/** 1 panel MomentumChart cho 1 hiệp — dùng chung cho cả trận chính lẫn trận đang xem khi so sánh. */
const OuHalfPanel: React.FC<{
    props: HalfChartProps;
    half: 1 | 2;
    idSuffix: string;
    labelPrefix?: string;
    marker?: { half: 1 | 2; minute: number };
    minuteCrosshair?: boolean;
    syncedCrosshairMinute?: number | null;
    onSyncedCrosshairChange?: (minute: number | null) => void;
    plotAreaRef?: React.Ref<HTMLDivElement>;
    suppressCrosshairHud?: boolean;
}> = ({
    props,
    half,
    idSuffix,
    labelPrefix,
    marker,
    minuteCrosshair,
    syncedCrosshairMinute,
    onSyncedCrosshairChange,
    plotAreaRef,
    suppressCrosshairHud,
}) => {
    const prefix = labelPrefix ? `${labelPrefix} · ` : '';
    if (props.isEmpty) {
        return (
            <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                {prefix}Hiệp {half}: không có dữ liệu odds/stats.
            </p>
        );
    }
    const { isEmpty: _omit, ...chartProps } = props;
    const overtimeNote = half === 1 ? 'gồm bù giờ (trục có thể >45\')' : 'gồm bù giờ (trục có thể >90\')';
    return (
        <MomentumChart
            title="Tài/Xỉu (1_3) + Đội chấp (1_2) & Dòng thời gian API"
            halfSubtitle={`${prefix}Hiệp ${half} — ${overtimeNote}`}
            iconColor="text-emerald-500"
            chartIdSuffix={idSuffix}
            secondaryLabel="Đội chấp (1_2)"
            {...chartProps}
            minuteCrosshair={minuteCrosshair}
            syncedCrosshairMinute={syncedCrosshairMinute}
            onSyncedCrosshairChange={onSyncedCrosshairChange}
            plotAreaRef={plotAreaRef}
            suppressCrosshairHud={suppressCrosshairHud}
            extraMarkers={marker && marker.half === half ? [{ minute: marker.minute }] : []}
        />
    );
};

interface Ou13ChartModalProps extends Ou13ChartContentProps {
    /** "Home vs Away". */
    title: string;
    /** Vd: "FT 2-1 · tình huống H2 · 67'". */
    subtitle?: string;
    /** URL mở trang chi tiết trận tương tự ở tab mới (chỉ có với trận tương tự, không áp dụng trận đang xem). */
    openHref?: string;
    /** Payload để ghim trận tương tự (chỉ truyền cho trận tương tự) — có thì hiện nút Ghim/Bỏ ghim. */
    pin?: PinnedChart;
    /** Chuyển sang trận trước/sau trong danh sách (không cần đóng modal). Bấm nút hoặc phím ←/→. */
    onPrev?: () => void;
    onNext?: () => void;
    /** Vị trí trận hiện tại để hiển thị "n/total" trên header. */
    navPosition?: { index: number; total: number };
    /** overlay: full-screen tối (mặc định). floating: cửa sổ kéo/thu phóng, mở nhiều cái song song. */
    mode?: 'overlay' | 'floating';
    /** Offset xếp chồng ban đầu khi mode=floating. */
    stackIndex?: number;
    /** z-index tuỳ chỉnh (floating). */
    zIndex?: number;
    /** Đưa panel lên trước khi click/focus. */
    onFocus?: () => void;
    /** Floating: chỉ modal trên cùng mới đóng bằng Escape. */
    closeOnEscape?: boolean;
    onClose: () => void;
}

function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

function useFloatingPanel(enabled: boolean, stackIndex: number) {
    const [pos, setPos] = useState(() => ({
        x: Math.min(16 + stackIndex * 28, Math.max(8, window.innerWidth - 420)),
        y: Math.min(56 + stackIndex * 28, Math.max(8, window.innerHeight - 320)),
    }));
    const [size, setSize] = useState(() => ({
        w: Math.min(896, window.innerWidth - 32),
        h: Math.min(Math.round(window.innerHeight * 0.75), window.innerHeight - 96),
    }));
    const posRef = useRef(pos);
    const sizeRef = useRef(size);
    posRef.current = pos;
    sizeRef.current = size;

    const dragState = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
    const resizeState = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const onMove = (e: MouseEvent) => {
            if (dragState.current) {
                const { sx, sy, ox, oy } = dragState.current;
                setPos({
                    x: clamp(ox + e.clientX - sx, 0, window.innerWidth - 120),
                    y: clamp(oy + e.clientY - sy, 0, window.innerHeight - 80),
                });
            }
            if (resizeState.current) {
                const { sx, sy, ow, oh } = resizeState.current;
                const p = posRef.current;
                setSize({
                    w: clamp(ow + e.clientX - sx, 320, window.innerWidth - p.x - 8),
                    h: clamp(oh + e.clientY - sy, 480, window.innerHeight - p.y - 8),
                });
            }
        };
        const onUp = () => {
            dragState.current = null;
            resizeState.current = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [enabled]);

    const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, input')) return;
        dragState.current = {
            sx: e.clientX,
            sy: e.clientY,
            ox: posRef.current.x,
            oy: posRef.current.y,
        };
        e.preventDefault();
    }, []);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizeState.current = {
            sx: e.clientX,
            sy: e.clientY,
            ow: sizeRef.current.w,
            oh: sizeRef.current.h,
        };
    }, []);

    return { pos, size, onHeaderMouseDown, onResizeMouseDown };
}

/**
 * Phần nội dung biểu đồ kèo Tài/Xỉu cả trận (1_3) — fetch theo matchId hoặc nhận bundle local,
 * chia 2 panel Hiệp 1 / Hiệp 2. Dùng chung cho Ou13ChartModal và trang tab riêng SimilarMatchTabPage.
 */
export const Ou13ChartContent: React.FC<Ou13ChartContentProps> = ({
    matchId,
    local,
    marker,
    compareLocal,
    compareMarker,
    primaryLabel,
    compareLabel,
    minuteCrosshair = false,
    compareNavLockRef,
}) => {
    const [loading, setLoading] = useState(!!matchId);
    const [error, setError] = useState<string | null>(null);
    const [bundle, setBundle] = useState<Ou13ChartBundle | null>(local ?? null);
    /** Phút đang so sánh — chỉ init lúc mở modal; không reset khi refresh dữ liệu live. */
    const [comparePick, setComparePick] = useState<{ half: 1 | 2; minute: number } | null>(() => {
        if (compareLocal && marker?.half != null && marker.minute != null) {
            return { half: marker.half, minute: marker.minute };
        }
        return null;
    });

    useEffect(() => {
        if (!compareLocal) setComparePick(null);
    }, [compareLocal]);

    useEffect(() => {
        if (!matchId) return;
        const ctrl = new AbortController();
        setLoading(true);
        setError(null);
        void fetchOddsHistory13(matchId, ctrl.signal).then((r) => {
            if (ctrl.signal.aborted) return;
            if (r.ok === false) {
                setError(r.error);
            } else {
                setBundle({
                    odds13: r.data.odds,
                    odds12: r.data.odds12,
                    odds16: r.data.odds16 ?? [],
                    odds15: r.data.odds15 ?? [],
                    stats: r.data.stats,
                    events: r.data.events,
                    homeName: r.data.homeName,
                    awayName: r.data.awayName,
                    userNotes: r.data.userNotes ?? [],
                    // md chỉ parse được cảnh báo loại pressure (kèm mức 1/2) → dựng marker chuông vàng/đỏ.
                    alertMarkers: r.data.alerts.map((a, i) => ({
                        id: `md-${a.half}-${a.minute}-${i}`,
                        minute: a.minute,
                        half: a.half,
                        type: 'pressure' as const,
                        title: a.pressure === 2 ? '🔴 ÁP LỰC CỰC ĐẠI' : '🟡 ÁP LỰC GIA TĂNG',
                        pressureLevel: (a.pressure === 2 ? 2 : 1) as 1 | 2,
                    })),
                });
            }
            setLoading(false);
        });
        return () => ctrl.abort();
    }, [matchId]);

    const h1 = useMemo(() => (bundle ? buildHalfChartProps(bundle, 1) : null), [bundle]);
    const h2 = useMemo(() => (bundle ? buildHalfChartProps(bundle, 2) : null), [bundle]);
    const h1Markets = useMemo(() => (bundle ? buildH1MarketsChartProps(bundle) : null), [bundle]);
    // Bundle trận đang xem (so sánh) — chỉ tính khi có compareLocal.
    const c1 = useMemo(() => (compareLocal ? buildHalfChartProps(compareLocal, 1) : null), [compareLocal]);
    const c2 = useMemo(() => (compareLocal ? buildHalfChartProps(compareLocal, 2) : null), [compareLocal]);
    const c1Markets = useMemo(
        () => (compareLocal ? buildH1MarketsChartProps(compareLocal) : null),
        [compareLocal],
    );
    const currentHasH2 = !!c2 && !c2.isEmpty;

    useEffect(() => {
        if (compareNavLockRef) compareNavLockRef.current = comparePick != null;
    }, [comparePick, compareNavLockRef]);

    const compareMinuteSteps = useMemo(() => {
        if (!comparePick) return [];
        const sim = comparePick.half === 1 ? h1 : h2;
        const cur = comparePick.half === 1 ? c1 : c2;
        if (!cur) return [];
        return uniqueSortedMinutes(sim?.sortedMarketData ?? [], cur.sortedMarketData);
    }, [comparePick, h1, h2, c1, c2]);

    useEffect(() => {
        if (!comparePick || compareMinuteSteps.length === 0) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setComparePick(null);
                return;
            }
            const idx = compareMinuteSteps.indexOf(comparePick.minute);
            if (idx < 0) return;
            if (e.key === 'ArrowRight' && idx < compareMinuteSteps.length - 1) {
                e.preventDefault();
                e.stopPropagation();
                setComparePick({ ...comparePick, minute: compareMinuteSteps[idx + 1]! });
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                e.preventDefault();
                e.stopPropagation();
                setComparePick({ ...comparePick, minute: compareMinuteSteps[idx - 1]! });
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [comparePick, compareMinuteSteps]);

    return (
        <>
            {(compareLocal?.userNotes?.length || bundle?.userNotes?.length) ? (
                <div className="space-y-2 mb-3">
                    <NotesReadout title="Nhận định của bạn (trận đang xem)" notes={compareLocal?.userNotes} />
                    <NotesReadout title="Nhận định trận tương tự" notes={bundle?.userNotes} />
                </div>
            ) : null}
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu biểu đồ…
                </div>
            ) : error ? (
                <div className="text-xs leading-snug px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{error}</span>
                </div>
            ) : !bundle || (h1?.isEmpty && h2?.isEmpty) ? (
                <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Trận này chưa lưu dữ liệu odds 1_3 / stats theo phút.
                </div>
            ) : compareLocal && c1 ? (
                <div className="space-y-5">
                    {(marker?.half === 2
                        ? [
                              h2 && !h2.isEmpty ? (
                                  currentHasH2 ? (
                                      <SyncedHalfCompareGroup
                                          key="h2-compare"
                                          half={2}
                                          simProps={h2}
                                          curProps={c2!}
                                          primaryLabel={primaryLabel}
                                          compareLabel={compareLabel}
                                          marker={marker}
                                          compareMarker={compareMarker}
                                          selectedMinute={comparePick?.half === 2 ? comparePick.minute : null}
                                          onSelectMinute={(minute) => setComparePick({ half: 2, minute })}
                                      />
                                  ) : (
                                      <React.Fragment key="h2-preview">
                                          <OuHalfPanel
                                              props={h2}
                                              half={2}
                                              idSuffix="sim-ou-h2-preview"
                                              labelPrefix={primaryLabel}
                                              marker={marker?.half === 2 ? marker : undefined}
                                              minuteCrosshair={minuteCrosshair}
                                          />
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1 mb-2">
                                              Trận đang xem chưa vào hiệp 2 — xem trước diễn biến H2 của trận tương tự.
                                          </p>
                                      </React.Fragment>
                                  )
                              ) : null,
                              !c1.isEmpty ? (
                                  <SyncedHalfCompareGroup
                                      key="h1-compare"
                                      half={1}
                                      simProps={h1 && !h1.isEmpty ? h1 : null}
                                      curProps={c1}
                                      primaryLabel={primaryLabel}
                                      compareLabel={compareLabel}
                                      marker={marker}
                                      compareMarker={compareMarker}
                                      selectedMinute={comparePick?.half === 1 ? comparePick.minute : null}
                                      onSelectMinute={(minute) => setComparePick({ half: 1, minute })}
                                  />
                              ) : null,
                          ]
                        : [
                              !c1.isEmpty ? (
                                  <SyncedHalfCompareGroup
                                      key="h1-compare"
                                      half={1}
                                      simProps={h1 && !h1.isEmpty ? h1 : null}
                                      curProps={c1}
                                      primaryLabel={primaryLabel}
                                      compareLabel={compareLabel}
                                      marker={marker}
                                      compareMarker={compareMarker}
                                      selectedMinute={comparePick?.half === 1 ? comparePick.minute : null}
                                      onSelectMinute={(minute) => setComparePick({ half: 1, minute })}
                                  />
                              ) : null,
                              h2 && !h2.isEmpty ? (
                                  currentHasH2 ? (
                                      <SyncedHalfCompareGroup
                                          key="h2-compare"
                                          half={2}
                                          simProps={h2}
                                          curProps={c2!}
                                          primaryLabel={primaryLabel}
                                          compareLabel={compareLabel}
                                          marker={marker}
                                          compareMarker={compareMarker}
                                          selectedMinute={comparePick?.half === 2 ? comparePick.minute : null}
                                          onSelectMinute={(minute) => setComparePick({ half: 2, minute })}
                                      />
                                  ) : (
                                      <React.Fragment key="h2-preview">
                                          <OuHalfPanel
                                              props={h2}
                                              half={2}
                                              idSuffix="sim-ou-h2-preview"
                                              labelPrefix={primaryLabel}
                                              marker={marker?.half === 2 ? marker : undefined}
                                              minuteCrosshair={minuteCrosshair}
                                          />
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1 mb-2">
                                              Trận đang xem chưa vào hiệp 2 — xem trước diễn biến H2 của trận tương tự.
                                          </p>
                                      </React.Fragment>
                                  )
                              ) : null,
                          ]
                    ).filter(Boolean)}
                    {h1Markets && !h1Markets.isEmpty ? (
                        <H1MarketsPanel
                            props={h1Markets}
                            idSuffix="sim-ou-h1-markets-cmp"
                            labelPrefix={primaryLabel}
                            marker={marker}
                            minuteCrosshair={minuteCrosshair}
                        />
                    ) : null}
                    {c1Markets && !c1Markets.isEmpty ? (
                        <H1MarketsPanel
                            props={c1Markets}
                            idSuffix="cur-ou-h1-markets-cmp"
                            labelPrefix={compareLabel}
                            marker={compareMarker}
                            minuteCrosshair={minuteCrosshair}
                        />
                    ) : null}
                    <p className="text-[10px] italic text-slate-500 dark:text-slate-400 px-1">
                        📍 vạch cam: phút tình huống · bấm/kéo biểu đồ để bám vạch kèo so sánh · vạch xám nối 2 trận cùng phút
                        {marker ? ` (tương tự H${marker.half} · ${marker.minute}')` : ''}.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {h1 && !h1.isEmpty ? (
                        <div>
                            <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90 uppercase tracking-wide mb-2 px-1">
                                Hiệp 1 · cả trận (1_3 + 1_2)
                            </p>
                            <OuHalfPanel
                            props={h1}
                            half={1}
                            idSuffix="sim-ou-h1"
                            marker={marker}
                            minuteCrosshair={minuteCrosshair}
                        />
                        </div>
                    ) : null}
                    {h1Markets && !h1Markets.isEmpty ? (
                        <H1MarketsPanel
                            props={h1Markets}
                            idSuffix="sim-ou-h1-markets"
                            marker={marker}
                            minuteCrosshair={minuteCrosshair}
                        />
                    ) : null}
                    {h2 && !h2.isEmpty ? (
                        <div>
                            <p className="text-[11px] font-bold text-sky-700/90 dark:text-sky-400/90 uppercase tracking-wide mb-2 px-1">
                                Hiệp 2 · cả trận (1_3 + 1_2)
                            </p>
                            <OuHalfPanel
                            props={h2}
                            half={2}
                            idSuffix="sim-ou-h2"
                            marker={marker}
                            minuteCrosshair={minuteCrosshair}
                        />
                        </div>
                    ) : null}
                    {marker && (
                        <p className="text-[10px] italic text-slate-500 dark:text-slate-400 px-1">
                            📍 vạch cam: phút của tình huống tương tự đang so sánh (H{marker.half} · {marker.minute}')
                        </p>
                    )}
                </div>
            )}
        </>
    );
};

/** Nút Ghim/Bỏ ghim trận tương tự — đồng bộ trạng thái qua PINNED_CHARTS_UPDATED_EVENT. */
const PinToggleButton: React.FC<{ pin: PinnedChart }> = ({ pin }) => {
    const [pinned, setPinned] = useState(() => isChartPinned(pin.matchId, pin.sourceMatchId));
    const [saveError, setSaveError] = useState(false);
    useEffect(() => {
        const sync = () => {
            setPinned(isChartPinned(pin.matchId, pin.sourceMatchId));
            setSaveError(false);
        };
        sync();
        window.addEventListener(PINNED_CHARTS_UPDATED_EVENT, sync);
        return () => window.removeEventListener(PINNED_CHARTS_UPDATED_EVENT, sync);
    }, [pin.matchId, pin.sourceMatchId]);
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const intended = !pinned;
                const next = togglePinnedChart(pin);
                setPinned(next);
                setSaveError(next !== intended);
            }}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                pinned
                    ? 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={
                saveError
                    ? 'Không lưu được ghim (localStorage đầy hoặc thiếu ID trận đang xem)'
                    : pinned
                      ? 'Bỏ ghim trận này'
                      : 'Ghim trận này — hiện nút trên Dashboard để mở lại nhanh'
            }
        >
            {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            {saveError ? 'Lỗi ghim' : pinned ? 'Bỏ ghim' : 'Ghim'}
        </button>
    );
};

/**
 * Modal biểu đồ kèo Tài/Xỉu cả trận (1_3) — dùng đúng MomentumChart (nến) như Dashboard,
 * gồm kèo phụ Đội nhà (1_2), dòng thời gian API, ⚽/🚩 và chuông cảnh báo. Chia 2 panel Hiệp 1 / Hiệp 2.
 * Nằm trên modal Tất cả tình huống tương tự (z-[80]).
 */
export const Ou13ChartModal: React.FC<Ou13ChartModalProps> = ({
    matchId,
    local,
    title,
    subtitle,
    marker,
    compareLocal,
    compareMarker,
    primaryLabel,
    compareLabel,
    openHref,
    pin,
    onPrev,
    onNext,
    navPosition,
    mode = 'overlay',
    stackIndex = 0,
    zIndex = 80,
    onFocus,
    closeOnEscape = true,
    onClose,
}) => {
    const compareNavLockRef = useRef(false);
    const isFloating = mode === 'floating';
    const floating = useFloatingPanel(isFloating, stackIndex);

    // Điều hướng nhanh bằng phím ← / → khi có nút chuyển trận (trừ khi đang so sánh phút).
    useEffect(() => {
        if (!onPrev && !onNext) return;
        const onKey = (e: KeyboardEvent) => {
            if (compareNavLockRef.current) return;
            if (e.key === 'ArrowLeft' && onPrev) {
                e.preventDefault();
                onPrev();
            } else if (e.key === 'ArrowRight' && onNext) {
                e.preventDefault();
                onNext();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onPrev, onNext]);

    useEffect(() => {
        if (!isFloating || !closeOnEscape) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isFloating, closeOnEscape, onClose]);

    const headerBlock = (
        <div
            className={`px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-t-xl flex items-start justify-between gap-2 ${
                isFloating ? 'cursor-grab active:cursor-grabbing select-none' : ''
            }`}
            onMouseDown={isFloating ? floating.onHeaderMouseDown : undefined}
        >
            <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate" title={title}>
                    Kèo Tài/Xỉu (1_3) — {title}
                </div>
                {subtitle && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</div>
                )}
                {isFloating && (
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Kéo tiêu đề · thu phóng góc dưới-phải · bấm/kéo biểu đồ để so sánh vạch kèo
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {(onPrev || onNext) && (
                    <div className="flex items-center gap-0.5 mr-1">
                        <button
                            onClick={onPrev}
                            disabled={!onPrev}
                            className="p-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                            title="Trận trước (←)"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {navPosition && (
                            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 px-1 tabular-nums">
                                {navPosition.index + 1}/{navPosition.total}
                            </span>
                        )}
                        <button
                            onClick={onNext}
                            disabled={!onNext}
                            className="p-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                            title="Trận sau (→)"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {pin && <PinToggleButton pin={pin} />}
                {openHref && (
                    <a
                        href={openHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        title="Mở toàn bộ thông tin trận tương tự này sang tab mới — dễ quan sát & so sánh song song với trận đang xem"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Mở tab mới
                    </a>
                )}
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                >
                    ✕
                </button>
            </div>
        </div>
    );

    const bodyBlock = (
        <div className="flex-1 overflow-y-auto p-3 space-y-5 min-h-0">
            <Ou13ChartContent
                matchId={matchId}
                local={local}
                marker={marker}
                compareLocal={compareLocal}
                compareMarker={compareMarker}
                primaryLabel={primaryLabel}
                compareLabel={compareLabel}
                minuteCrosshair
                compareNavLockRef={compareNavLockRef}
            />
        </div>
    );

    if (isFloating) {
        return createPortal(
            <div
                role="dialog"
                aria-modal="false"
                className="fixed inset-0 pointer-events-none"
                style={{ zIndex }}
            >
                <div
                    className="pointer-events-auto absolute bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
                    style={{
                        left: floating.pos.x,
                        top: floating.pos.y,
                        width: floating.size.w,
                        height: floating.size.h,
                    }}
                    onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest('[data-ou-chart-plot], button, a, input')) return;
                        onFocus?.();
                    }}
                >
                    {headerBlock}
                    {bodyBlock}
                    <div
                        role="presentation"
                        aria-hidden
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
                        onMouseDown={floating.onResizeMouseDown}
                        title="Thu phóng"
                    >
                        <svg viewBox="0 0 16 16" className="w-full h-full text-slate-400 dark:text-slate-500">
                            <path
                                fill="currentColor"
                                d="M14 14L8 14L14 8M14 14L14 10M14 14L10 14"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-2 sm:p-4"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full sm:max-w-4xl max-h-[88vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {headerBlock}
                {bodyBlock}
            </div>
        </div>,
        document.body,
    );
};
