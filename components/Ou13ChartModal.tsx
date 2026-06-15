import React, { useEffect, useMemo, useState } from 'react';
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
} from '../services/goal-prediction';
import {
    calculateOddsYAxisConfig,
    colorOddsSeriesForPressure,
    minuteTicks,
} from '../services/odds-pressure-series';
import { calculateAPIScore } from '../services/traditionalFactors';
import { MomentumChart } from './MomentumChart';

type GameEventLite = { minute: number; half: 1 | 2; type: 'goal' | 'corner' };
type ShotEventLite = { minute: number; half: 1 | 2; type: 'on' | 'off' };

/** Dữ liệu chuẩn hóa để vẽ chart — chung cho cả trận tương tự (server) lẫn trận đang xem (local). */
export interface Ou13ChartBundle {
    odds13: OddsHistoryPoint[];
    odds12: AhHistoryPoint[];
    stats: MinuteStatRow[];
    events: GameEventLite[];
    alertMarkers: ChartAlertMarker[];
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
    const coloredAh = colorOddsSeriesForPressure(ah12Snaps);

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
    const gameEvents = bundle.events.filter((e) => e.half === half).map((e) => ({ minute: e.minute, type: e.type }));
    const alertMarkers = bundle.alertMarkers.filter((m) => (m.half ?? 1) === half);

    // Trục X clamp giống Dashboard: H1 tối đa 58', H2 tối đa 105'.
    const maxMinute = Math.max(
        half === 1 ? 45 : 90,
        ...marketData.map((p) => p.minute),
        ...secondaryMarketData.map((p) => p.minute),
        ...apiChartData.map((p) => p.minute),
    );
    const domainMax = half === 1 ? Math.min(58, maxMinute + 1) : Math.min(105, maxMinute + 2);
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
        secondaryYAxisConfig: calculateOddsYAxisConfig(secondaryMarketData, null, coloredAh),
        isEmpty: marketData.length === 0 && apiChartData.length === 0,
    };
}

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
     */
    compareLocal?: Ou13ChartBundle;
    /** Mốc (hiệp, phút) hiện tại của trận đang xem — vạch cam 📍 trên panel so sánh. */
    compareMarker?: { half: 1 | 2; minute: number };
    /** Nhãn phân biệt panel khi so sánh (vd "Trận tương tự"). */
    primaryLabel?: string;
    /** Nhãn panel trận đang xem khi so sánh (vd "Trận đang xem"). */
    compareLabel?: string;
}

/** 1 panel MomentumChart cho 1 hiệp — dùng chung cho cả trận chính lẫn trận đang xem khi so sánh. */
const OuHalfPanel: React.FC<{
    props: ReturnType<typeof buildHalfChartProps>;
    half: 1 | 2;
    idSuffix: string;
    labelPrefix?: string;
    marker?: { half: 1 | 2; minute: number };
}> = ({ props, half, idSuffix, labelPrefix, marker }) => {
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
            title="Tài/Xỉu (1_3) + Đội nhà (1_2) & Dòng thời gian API"
            halfSubtitle={`${prefix}Hiệp ${half} — ${overtimeNote}`}
            iconColor="text-emerald-500"
            chartIdSuffix={idSuffix}
            secondaryLabel="Đội nhà (1_2)"
            {...chartProps}
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
    onClose: () => void;
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
}) => {
    const [loading, setLoading] = useState(!!matchId);
    const [error, setError] = useState<string | null>(null);
    const [bundle, setBundle] = useState<Ou13ChartBundle | null>(local ?? null);

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
                    stats: r.data.stats,
                    events: r.data.events,
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
    // Bundle trận đang xem (so sánh) — chỉ tính khi có compareLocal.
    const c1 = useMemo(() => (compareLocal ? buildHalfChartProps(compareLocal, 1) : null), [compareLocal]);
    const c2 = useMemo(() => (compareLocal ? buildHalfChartProps(compareLocal, 2) : null), [compareLocal]);

    return (
        <>
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
            ) : compareLocal && c1 && c2 ? (
                /* Chế độ so sánh: xen kẽ H1 trận chính → H1 trận đang xem → H2 trận chính → H2 trận đang xem. */
                <>
                    {h1 && <OuHalfPanel props={h1} half={1} idSuffix="sim-ou-h1" labelPrefix={primaryLabel} marker={marker} />}
                    <OuHalfPanel props={c1} half={1} idSuffix="cur-ou-h1" labelPrefix={compareLabel} marker={compareMarker} />
                    {h2 && <OuHalfPanel props={h2} half={2} idSuffix="sim-ou-h2" labelPrefix={primaryLabel} marker={marker} />}
                    <OuHalfPanel props={c2} half={2} idSuffix="cur-ou-h2" labelPrefix={compareLabel} marker={compareMarker} />
                    <p className="text-[10px] italic text-slate-500 dark:text-slate-400 px-1">
                        📍 vạch cam: phút của tình huống đang so sánh trên mỗi trận tương ứng
                        {marker ? ` (trận tương tự H${marker.half} · ${marker.minute}')` : ''}.
                    </p>
                </>
            ) : (
                <>
                    {h1 ? (
                        <OuHalfPanel props={h1} half={1} idSuffix="sim-ou-h1" marker={marker} />
                    ) : null}
                    {h2 ? (
                        <OuHalfPanel props={h2} half={2} idSuffix="sim-ou-h2" marker={marker} />
                    ) : null}
                    {marker && (
                        <p className="text-[10px] italic text-slate-500 dark:text-slate-400 px-1">
                            📍 vạch cam: phút của tình huống tương tự đang so sánh (H{marker.half} · {marker.minute}')
                        </p>
                    )}
                </>
            )}
        </>
    );
};

/** Nút Ghim/Bỏ ghim trận tương tự — đồng bộ trạng thái qua PINNED_CHARTS_UPDATED_EVENT. */
const PinToggleButton: React.FC<{ pin: PinnedChart }> = ({ pin }) => {
    const [pinned, setPinned] = useState(() => isChartPinned(pin.matchId, pin.sourceMatchId));
    useEffect(() => {
        const sync = () => setPinned(isChartPinned(pin.matchId, pin.sourceMatchId));
        sync();
        window.addEventListener(PINNED_CHARTS_UPDATED_EVENT, sync);
        return () => window.removeEventListener(PINNED_CHARTS_UPDATED_EVENT, sync);
    }, [pin.matchId, pin.sourceMatchId]);
    return (
        <button
            type="button"
            onClick={() => setPinned(togglePinnedChart(pin))}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                pinned
                    ? 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={pinned ? 'Bỏ ghim trận này' : 'Ghim trận này — hiện nút trên Dashboard để mở lại nhanh'}
        >
            {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            {pinned ? 'Bỏ ghim' : 'Ghim'}
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
    onClose,
}) => {
    // Điều hướng nhanh bằng phím ← / → khi có nút chuyển trận.
    useEffect(() => {
        if (!onPrev && !onNext) return;
        const onKey = (e: KeyboardEvent) => {
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

    return (
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
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-t-xl flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate" title={title}>
                            Kèo Tài/Xỉu (1_3) — {title}
                        </div>
                        {subtitle && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</div>
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

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <Ou13ChartContent
                        matchId={matchId}
                        local={local}
                        marker={marker}
                        compareLocal={compareLocal}
                        compareMarker={compareMarker}
                        primaryLabel={primaryLabel}
                        compareLabel={compareLabel}
                    />
                </div>
            </div>
        </div>
    );
};
