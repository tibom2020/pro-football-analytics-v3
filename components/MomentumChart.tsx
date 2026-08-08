import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveContainer, ComposedChart, Scatter, XAxis, YAxis, Tooltip, Cell, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ChartAlertMarker } from '../types';
export type { ChartAlertMarker } from '../types';
import { formatMinuteAxisTick } from './chartAxisFormat';
import { OU_LINE_DROP_PRICE_MAX } from '../services/ou-line-drop-alert';

/** Đoạn nối nến: tăng giá nến > ngưỡng → xanh; còn lại (giảm / đứng / tăng ≤ ngưỡng) → đỏ. */
const CANDLE_LINK_RISE_TO_GREEN = 0.025;
const CANDLE_LINK_RED = '#ef4444';
const CANDLE_LINK_GREEN = '#10b981';

function candleOddsForLink(point: {
    over?: number;
    under?: number;
    home?: number;
    __candleOddsValue?: number;
}, underXiuMode: boolean): number | null {
    if (underXiuMode) {
        if (typeof point.under === 'number' && Number.isFinite(point.under)) return point.under;
    } else if (typeof point.over === 'number' && Number.isFinite(point.over)) {
        return point.over;
    }
    if (typeof point.__candleOddsValue === 'number' && Number.isFinite(point.__candleOddsValue)) {
        return point.__candleOddsValue;
    }
    if (typeof point.home === 'number' && Number.isFinite(point.home)) return point.home;
    return null;
}

/** Nến Tài ≤ ngưỡng — dễ tách khỏi đỏ/xanh áp lực. */
const LOW_OVER_CANDLE_FILL = '#f59e0b';
const LOW_OVER_CANDLE_STROKE = '#b45309';
const LOW_OVER_LABEL_FILL = '#b45309';

// --- Shared Helper Components ---

const CustomTooltip = ({ active, payload, label, underXiuMode, secondaryLabel }: any) => {
    if (active && payload && payload.length) {
        const minute = label;
        // Khi gộp 2 kèo, có thể có 2 entry dataKey="handicap" → phân biệt bằng field:
        // OU luôn có over/under, AH luôn có home/away (không bao giờ trùng — xem types.ts).
        const handicapEntries = payload.filter((p: any) => p.dataKey === 'handicap' && p.payload);
        const marketData = handicapEntries.find((p: any) => 'over' in p.payload || 'under' in p.payload)?.payload
            ?? handicapEntries.find((p: any) => !('home' in p.payload))?.payload;
        const secondaryData = handicapEntries.find(
            (p: any) => 'home' in p.payload && !('over' in p.payload) && !('under' in p.payload),
        )?.payload;
        const homeApiData = payload.find((p: any) => p.dataKey === 'homeApi');
        const awayApiData = payload.find((p: any) => p.dataKey === 'awayApi');

        return (
            <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg border border-slate-700 z-50">
                <p className="font-bold border-b border-slate-600 mb-1 pb-1">Phút: {minute}'</p>
                {marketData && (
                    <>
                        <p className="font-semibold text-yellow-400">HDP: {typeof marketData.handicap === 'number' ? marketData.handicap.toFixed(2) : '-'}</p>
                        {underXiuMode && marketData.under !== undefined && (
                            <p className="text-gray-300">
                                Odds Xỉu:{' '}
                                <span
                                    className={
                                        marketData.colorName === 'red'
                                            ? 'text-red-400'
                                            : marketData.colorName === 'green'
                                              ? 'text-green-400'
                                              : 'text-white'
                                    }
                                >
                                    {typeof marketData.under === 'number' ? marketData.under.toFixed(3) : '-'}
                                </span>
                            </p>
                        )}
                        {!underXiuMode && marketData.over !== undefined && (
                            <p className="text-gray-300">Odds Tài: <span className={marketData.colorName === 'red' ? 'text-red-400' : marketData.colorName === 'green' ? 'text-green-400' : 'text-white'}>{typeof marketData.over === 'number' ? marketData.over.toFixed(3) : '-'}</span></p>
                        )}
                        {!underXiuMode && marketData.over === undefined && marketData.home !== undefined && (
                            <p className="text-gray-300">Odds Nhà: <span className={marketData.colorName === 'red' ? 'text-red-400' : marketData.colorName === 'green' ? 'text-green-400' : 'text-white'}>{typeof marketData.home === 'number' ? marketData.home.toFixed(3) : '-'}</span></p>
                        )}
                    </>
                )}
                {secondaryData && (
                    <>
                        <p className="font-semibold mt-1 pt-1 border-t border-slate-700" style={{ color: '#60a5fa' }}>
                            {secondaryLabel || 'Đội chấp'} HDP: {typeof secondaryData.handicap === 'number' ? secondaryData.handicap.toFixed(2) : '-'}
                        </p>
                        {typeof secondaryData.chapOdds === 'number' ? (
                            <p className="text-gray-300">
                                Odds chấp:{' '}
                                <span
                                    className={
                                        secondaryData.colorName === 'red'
                                            ? 'text-red-400'
                                            : secondaryData.colorName === 'green'
                                              ? 'text-green-400'
                                              : 'text-sky-300'
                                    }
                                >
                                    {secondaryData.chapOdds.toFixed(3)}
                                </span>
                            </p>
                        ) : typeof secondaryData.home === 'number' ? (
                            <p className="text-gray-300">Odds Nhà: <span style={{ color: '#93c5fd' }}>{secondaryData.home.toFixed(3)}</span></p>
                        ) : null}
                    </>
                )}
                {homeApiData && homeApiData.value !== undefined && (
                    <p style={{ color: homeApiData.stroke }}>API Đội nhà: {homeApiData.value.toFixed(1)}</p>
                )}
                {awayApiData && awayApiData.value !== undefined && (
                    <p style={{ color: awayApiData.stroke }}>API Đội khách: {awayApiData.value.toFixed(1)}</p>
                )}
            </div>
        );
    }
    return null;
};

const CustomApiDot = (props: any) => {
    const { cx, cy, stroke, index, data } = props;
    if (index !== data.length - 1) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r={6} fill="white" stroke={stroke} strokeWidth={3} style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.3))' }} />
            <circle cx={cx} cy={cy} r={2} fill={stroke} />
        </g>
    );
};

const CustomCandle = (props: any) => {
    const { cx, cy, fill, payload, secondary, underXiuMode } = props;
    const oddsValue = payload.__candleOddsValue ?? payload.over ?? payload.home ?? payload.under ?? 1.9;

    let height = 12;
    if (oddsValue > 1.4) {
        const base = 1.6;
        const diff = Math.max(0, oddsValue - base);
        height = 10 + (diff * 100);
    } else {
        const base = 0.6;
        const diff = Math.max(0, oddsValue - base);
        height = 10 + (diff * 100);
    }
    height = Math.max(10, Math.min(height, 55));

    // Kèo phụ (Đội nhà): dạng bong bóng — màu vẫn theo quy tắc áp lực (fill = e.color).
    // Bán kính vừa đủ để dễ quan sát mà không che nến chính.
    if (secondary) {
        const r = 5.5;
        return (
            <g>
                <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.35} stroke={fill} strokeWidth={1.5} />
                <circle cx={cx} cy={cy} r={1.5} fill={fill} />
            </g>
        );
    }

    const over =
        typeof payload.over === 'number' && Number.isFinite(payload.over) ? payload.over : null;
    const isLowOver =
        !underXiuMode && over != null && over <= OU_LINE_DROP_PRICE_MAX;

    const candleFill = isLowOver ? LOW_OVER_CANDLE_FILL : fill;
    const wickStroke = isLowOver ? LOW_OVER_CANDLE_STROKE : fill;
    const width = payload.highlight ? 7 : isLowOver ? 6 : 4;
    const topY = cy - height / 2;

    return (
        <g>
            <line
                x1={cx}
                y1={topY - 4}
                x2={cx}
                y2={cy + height / 2 + 4}
                stroke={wickStroke}
                strokeWidth={isLowOver ? 2 : 1.5}
                opacity={0.75}
            />
            <rect
                x={cx - width / 2}
                y={topY}
                width={width}
                height={height}
                fill={candleFill}
                stroke={payload.highlight ? '#fff' : isLowOver ? LOW_OVER_CANDLE_STROKE : 'none'}
                strokeWidth={payload.highlight || isLowOver ? 1.5 : 0}
                rx={1}
                style={{
                    filter: payload.highlight || isLowOver
                        ? 'drop-shadow(0px 0px 3px rgba(245,158,11,0.55))'
                        : 'none',
                }}
            />
            {isLowOver && over != null && (
                <text
                    x={cx}
                    y={topY - 8}
                    textAnchor="middle"
                    fill={LOW_OVER_LABEL_FILL}
                    fontSize={9}
                    fontWeight={700}
                    style={{ pointerEvents: 'none' }}
                >
                    {over.toFixed(3)}
                </text>
            )}
        </g>
    );
};

// --- Crosshair (modal so sánh trận tương tự) ---

type OddsSnap = {
    minute: number;
    handicap?: number;
    over?: number;
    under?: number;
    home?: number;
    away?: number;
    colorName?: string;
};

const CHART_RIGHT_GUTTER = 35;
const CHART_TOP_GUTTER = 10;
const CHART_BOTTOM_GUTTER = 68;

function nearestOddsPoint(data: OddsSnap[], minute: number): OddsSnap | null {
    if (!data.length) return null;
    return data.reduce((best, p) =>
        Math.abs(p.minute - minute) < Math.abs(best.minute - minute) ? p : best,
    );
}

function minuteFromPointer(
    clientX: number,
    rect: DOMRect,
    xDomain: [number, number],
    leftGutter: number,
): number {
    const plotW = Math.max(rect.width - leftGutter - CHART_RIGHT_GUTTER, 1);
    const x = clientX - rect.left - leftGutter;
    const ratio = Math.max(0, Math.min(1, x / plotW));
    const [xMin, xMax] = xDomain;
    return xMin + ratio * (xMax - xMin);
}

function crosshairLeftPx(
    minute: number,
    containerWidth: number,
    xDomain: [number, number],
    leftGutter: number,
): number {
    const plotW = Math.max(containerWidth - leftGutter - CHART_RIGHT_GUTTER, 1);
    const [xMin, xMax] = xDomain;
    const ratio = (minute - xMin) / Math.max(xMax - xMin, 1e-6);
    return leftGutter + ratio * plotW;
}

const MinuteCrosshairHud: React.FC<{
    minute: number;
    ou: OddsSnap | null;
    ah: OddsSnap | null;
    underXiuMode?: boolean;
    secondaryLabel?: string;
}> = ({ minute, ou, ah, underXiuMode, secondaryLabel }) => {
    const overColor =
        ou?.colorName === 'red'
            ? 'text-red-400'
            : ou?.colorName === 'green'
              ? 'text-green-400'
              : 'text-slate-100';
    const fmtH = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '—');
    const fmtO = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(3) : '—');

    return (
        <div className="w-full">
            <div className="bg-slate-900/95 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg border border-indigo-400/60 backdrop-blur-sm">
                <p className="font-bold text-indigo-300 border-b border-slate-600 mb-1 pb-0.5">
                    Phút {minute}&apos;
                </p>
                {ou ? (
                    <div className="space-y-0.5">
                        <p>
                            <span className="text-yellow-400 font-semibold">T/X HDP:</span>{' '}
                            {fmtH(ou.handicap)}
                        </p>
                        {underXiuMode ? (
                            <p className="text-gray-300">
                                Odds Xỉu:{' '}
                                <span className={overColor}>{fmtO(ou.under)}</span>
                            </p>
                        ) : (
                            <>
                                <p className="text-gray-300">
                                    Odds Tài: <span className={overColor}>{fmtO(ou.over)}</span>
                                </p>
                                {typeof ou.under === 'number' && Number.isFinite(ou.under) && (
                                    <p className="text-gray-400">
                                        Odds Xỉu: {fmtO(ou.under)}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-400 italic">Chưa có kèo T/X tại phút này</p>
                )}
                {ah && (
                    <div className="mt-1 pt-1 border-t border-slate-700 space-y-0.5">
                        <p className="text-sky-400 font-semibold">
                            {secondaryLabel || 'Đội chấp'} HDP: {fmtH(ah.handicap)}
                        </p>
                        {typeof (ah as { chapOdds?: number }).chapOdds === 'number' &&
                        Number.isFinite((ah as { chapOdds?: number }).chapOdds) ? (
                            <p className="text-gray-300">
                                Odds chấp:{' '}
                                <span
                                    className={
                                        ah.colorName === 'red'
                                            ? 'text-red-400'
                                            : ah.colorName === 'green'
                                              ? 'text-green-400'
                                              : 'text-sky-300'
                                    }
                                >
                                    {fmtO((ah as { chapOdds?: number }).chapOdds)}
                                </span>
                            </p>
                        ) : typeof ah.home === 'number' && Number.isFinite(ah.home) ? (
                            <p className="text-gray-300">
                                Odds Nhà: <span className="text-sky-300">{fmtO(ah.home)}</span>
                            </p>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

export type { OddsSnap };
export { nearestOddsPoint, crosshairLeftPx, CHART_RIGHT_GUTTER };

export function getChartLeftGutter(hasSecondary: boolean): number {
    return hasSecondary ? 45 + 40 + 15 : 45;
}

/** Danh sách phút có nến — dùng cho ← / →. */
export function uniqueSortedMinutes(...lists: Array<Array<{ minute: number }>>): number[] {
    const mins = new Set<number>();
    for (const list of lists) {
        for (const p of list) {
            if (typeof p.minute === 'number' && Number.isFinite(p.minute)) mins.add(p.minute);
        }
    }
    return [...mins].sort((a, b) => a - b);
}

// --- Overlay Components ---

interface OverlayProps {
    children?: React.ReactNode;
}

const OverlayContainer: React.FC<OverlayProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            if (entries[0]) setWidth(entries[0].contentRect.width);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {width > 0 && React.Children.map(children, child =>
                React.isValidElement(child) ? React.cloneElement(child, { containerWidth: width } as any) : child
            )}
        </div>
    );
};

const ShotBalls = ({ shots, containerWidth, xDomain, leftGutterPx = 45, rightGutterPx = 35 }: { shots: any[]; containerWidth?: number; xDomain: [number, number]; leftGutterPx?: number; rightGutterPx?: number }) => {
    if (!containerWidth || shots.length === 0) return null;
    const [xMin, xMax] = xDomain;
    const span = Math.max(xMax - xMin, 1e-6);
    const calculateLeft = (minute: number) => {
        const chartAreaWidth = containerWidth - leftGutterPx - rightGutterPx;
        const leftOffset = leftGutterPx;
        return leftOffset + ((minute - xMin) / span) * chartAreaWidth - 10;
    };
    const shotsByMinute = shots.reduce((acc: Record<number, ('on' | 'off')[]>, shot) => {
        if (!acc[shot.minute]) acc[shot.minute] = [];
        acc[shot.minute].push(shot.type);
        return acc;
    }, {} as Record<number, ('on' | 'off')[]>);
    return <>{Object.entries(shotsByMinute).map(([minute, types]) => (types as ('on' | 'off')[]).map((type, index) => (<div key={`${minute}-${index}`} className={`ball-icon ${type === 'on' ? 'ball-on' : 'ball-off'}`} style={{ left: `${calculateLeft(Number(minute))}px`, top: `${4 + index * 22}px` }} title={`Shot ${type}-target at ${minute}'`}>⚽</div>)))}</>;
};

const GameEventMarkers = ({
    events,
    containerWidth,
    xDomain,
    leftGutterPx = 45,
    rightGutterPx = 35,
    homeTeamName,
    awayTeamName,
}: {
    events: any[];
    containerWidth?: number;
    xDomain: [number, number];
    leftGutterPx?: number;
    rightGutterPx?: number;
    homeTeamName?: string;
    awayTeamName?: string;
}) => {
    if (!containerWidth || events.length === 0) return null;
    const [xMin, xMax] = xDomain;
    const span = Math.max(xMax - xMin, 1e-6);
    const calculateLeft = (minute: number) => {
        const chartAreaWidth = containerWidth - leftGutterPx - rightGutterPx;
        const leftOffset = leftGutterPx;
        return leftOffset + ((minute - xMin) / span) * chartAreaWidth;
    };
    const shortTeamName = (name?: string, max = 10) => {
        const t = (name ?? '').trim();
        if (!t) return '';
        return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
    };
    const goalTeamLabel = (team?: 'home' | 'away') => {
        if (team === 'home') return shortTeamName(homeTeamName) || 'Nhà';
        if (team === 'away') return shortTeamName(awayTeamName) || 'Khách';
        return '?';
    };
    const goalsAtMinute: Record<string, number> = {};
    return <>{events.map((event, i) => {
        if (event.type === 'goal') {
            const teamKey = event.team ?? '?';
            const key = `${event.minute}-${teamKey}`;
            const stack = goalsAtMinute[key] ?? 0;
            goalsAtMinute[key] = stack + 1;
            const offsetPx = stack * 14;
            const label = goalTeamLabel(event.team);
            const teamCls =
                event.team === 'home'
                    ? 'chart-goal-team-label--home'
                    : event.team === 'away'
                      ? 'chart-goal-team-label--away'
                      : 'chart-goal-team-label--unknown';
            return (
                <div
                    key={`goal-${event.minute}-${teamKey}-${i}`}
                    className="game-event-goal-stack"
                    style={{ left: `${calculateLeft(event.minute) + offsetPx}px`, top: '2px', transform: 'translateX(-50%)' }}
                    title={`Bàn thắng ${event.minute}' · ${label}`}
                >
                    <span className={`chart-goal-team-label ${teamCls}`}>{label}</span>
                    <div className="chart-goal-ball flex items-center justify-center">⚽</div>
                </div>
            );
        }
        if (event.type === 'corner') {
            return (
                <div
                    key={`corner-${event.minute}-${i}`}
                    className="game-event-icon game-event-corner"
                    style={{ left: `${calculateLeft(event.minute)}px` }}
                    title={`Phạt góc ${event.minute}'`}
                >
                    🚩
                </div>
            );
        }
        return null;
    })}</>;
};

// --- Main MomentumChart Component ---

interface MomentumChartProps {
    title: string;
    iconColor: string;
    marketData: any[];
    sortedMarketData: any[];
    apiChartData: any[];
    yAxisConfig: { domain: number[]; ticks: number[] };
    shotEvents: any[];
    gameEvents: any[];
    /** Trục phút (H1 thường 0…>45; H2 luôn 45…90+). */
    xDomain?: [number, number];
    xTicks?: number[];
    /** Hậu tố id SVG filter để tránh trùng khi vẽ 2 chart. */
    chartIdSuffix?: string;
    /** Dòng phụ dưới tiêu đề (vd: Hiệp 1 / Hiệp 2). */
    halfSubtitle?: string;
    /** Đánh dấu thời điểm có chuông cảnh báo (đồng bộ Nhật ký cảnh báo) */
    alertMarkers?: ChartAlertMarker[];
    /** Biểu đồ giá Xỉu: nến/tooltip/chú thích theo `under`, màu đỏ = tăng Xỉu. */
    underXiuMode?: boolean;
    // ---- Kèo phụ gộp chung (Đội nhà 1_2/1_5) — vẽ trên trục trái thứ hai ----
    /** Nến kèo phụ (homeMarketChartData*). Khi không truyền → chart như cũ. */
    secondaryMarketData?: any[];
    /** Bản đã sort theo phút cho đường xu hướng kèo phụ. */
    secondarySortedData?: any[];
    /** Trục Y riêng cho kèo phụ (thang HDP khác OU). */
    secondaryYAxisConfig?: { domain: number[]; ticks: number[] };
    /** Nhãn legend/tooltip cho kèo phụ, vd "Đội nhà (1_2)". */
    secondaryLabel?: string;
    /** Trường odds dùng cho chiều cao nến phụ — mặc định 'home'. */
    secondaryOddsField?: 'home' | 'away' | 'chapOdds';
    /** Vạch dọc tùy ý (vd: 📍 mốc phút tình huống tương tự trong modal so sánh). */
    extraMarkers?: Array<{ minute: number; label?: string; color?: string }>;
    /** Bật so sánh theo phút — bấm nến để chọn, ←/→ đổi phút, Esc thoát. */
    minuteCrosshair?: boolean;
    /** Phút đang chọn (đồng bộ parent — so sánh 2 biểu đồ). */
    syncedCrosshairMinute?: number | null;
    onSyncedCrosshairChange?: (minute: number | null) => void;
    /** Ref vùng vẽ biểu đồ (để parent nối vạch giữa 2 chart). */
    plotAreaRef?: React.Ref<HTMLDivElement>;
    /** Ẩn HUD dưới trục X (parent tự render bảng so sánh). */
    suppressCrosshairHud?: boolean;
    /** Tên đội — hiển thị phía trên bóng đỏ khi ghi bàn. */
    homeTeamName?: string;
    awayTeamName?: string;
}

export const MomentumChart: React.FC<MomentumChartProps> = ({
    title,
    iconColor,
    marketData,
    sortedMarketData,
    apiChartData,
    yAxisConfig,
    shotEvents,
    gameEvents,
    xDomain = [0, 90],
    xTicks = [0, 15, 30, 45, 60, 75, 90],
    chartIdSuffix = 'main',
    halfSubtitle,
    alertMarkers = [],
    underXiuMode = false,
    secondaryMarketData,
    secondarySortedData,
    secondaryYAxisConfig,
    secondaryLabel,
    secondaryOddsField = 'home',
    extraMarkers = [],
    minuteCrosshair = false,
    syncedCrosshairMinute,
    onSyncedCrosshairChange,
    plotAreaRef,
    suppressCrosshairHud = false,
    homeTeamName,
    awayTeamName,
}) => {
    const chartAreaRef = useRef<HTMLDivElement>(null);
    const [localSelectedMinute, setLocalSelectedMinute] = useState<number | null>(null);

    const isSyncedCrosshair = onSyncedCrosshairChange !== undefined;
    const selectedMinute = isSyncedCrosshair ? (syncedCrosshairMinute ?? null) : localSelectedMinute;
    const setSelectedMinute = isSyncedCrosshair ? onSyncedCrosshairChange! : setLocalSelectedMinute;
    const showCrosshairHud = minuteCrosshair && !suppressCrosshairHud && !isSyncedCrosshair && selectedMinute != null;
    const compareActive = minuteCrosshair && selectedMinute != null;

    const setPlotRef = useCallback(
        (el: HTMLDivElement | null) => {
            (chartAreaRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (plotAreaRef) {
                if (typeof plotAreaRef === 'function') plotAreaRef(el);
                else (plotAreaRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }
        },
        [plotAreaRef],
    );

    const gid = (base: string) => `${base}-${chartIdSuffix.replace(/[^a-zA-Z0-9_-]/g, '') || 'main'}`;

    const handleCandleClick = useCallback(
        (payload: { minute?: number } | undefined) => {
            if (!minuteCrosshair || !payload || typeof payload.minute !== 'number') return;
            setSelectedMinute(payload.minute);
        },
        [minuteCrosshair, setSelectedMinute],
    );

    const minuteSteps = useMemo(
        () => uniqueSortedMinutes(sortedMarketData),
        [sortedMarketData],
    );

    const hasSecondary =
        Array.isArray(secondaryMarketData) && secondaryMarketData.length > 0 && !!secondaryYAxisConfig;
    const leftGutterPx = hasSecondary ? 45 + 40 + 15 : 45;

    const scrubbingRef = useRef(false);

    const snapMinuteFromClientX = useCallback(
        (clientX: number): number | null => {
            if (!minuteCrosshair || !chartAreaRef.current) return null;
            const rect = chartAreaRef.current.getBoundingClientRect();
            const raw = minuteFromPointer(clientX, rect, xDomain, leftGutterPx);
            if (minuteSteps.length === 0) return Math.round(raw);
            return minuteSteps.reduce((best, m) =>
                Math.abs(m - raw) < Math.abs(best - raw) ? m : best,
            minuteSteps[0]!);
        },
        [minuteCrosshair, xDomain, leftGutterPx, minuteSteps],
    );

    const applyPlotPointer = useCallback(
        (clientX: number) => {
            const minute = snapMinuteFromClientX(clientX);
            if (minute != null) setSelectedMinute(minute);
        },
        [snapMinuteFromClientX, setSelectedMinute],
    );

    const onPlotPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!minuteCrosshair || e.button !== 0) return;
            scrubbingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            applyPlotPointer(e.clientX);
        },
        [minuteCrosshair, applyPlotPointer],
    );

    const onPlotPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!scrubbingRef.current) return;
            applyPlotPointer(e.clientX);
        },
        [applyPlotPointer],
    );

    const onPlotPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        scrubbingRef.current = false;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* pointer already released */
        }
    }, []);

    useEffect(() => {
        if (isSyncedCrosshair || !minuteCrosshair || selectedMinute == null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedMinute(null);
                return;
            }
            const idx = minuteSteps.indexOf(selectedMinute);
            if (idx < 0) return;
            if (e.key === 'ArrowRight' && idx < minuteSteps.length - 1) {
                e.preventDefault();
                setSelectedMinute(minuteSteps[idx + 1]!);
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                e.preventDefault();
                setSelectedMinute(minuteSteps[idx - 1]!);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isSyncedCrosshair, minuteCrosshair, selectedMinute, minuteSteps, setSelectedMinute]);

    const marketDataForChart = useMemo(() => {
        const base = underXiuMode
            ? marketData.map((e: any) => ({
                  ...e,
                  __candleOddsValue: typeof e.under === 'number' ? e.under : undefined,
              }))
            : marketData;
        return base.map((e: any) => ({
            ...e,
            highlight: compareActive && selectedMinute === e.minute,
        }));
    }, [underXiuMode, marketData, compareActive, selectedMinute]);

    const secondaryDataForChart = hasSecondary
        ? secondaryMarketData!.map((e: any) => ({
              ...e,
              __candleOddsValue: typeof e[secondaryOddsField] === 'number' ? e[secondaryOddsField] : undefined,
          }))
        : [];
    const SECONDARY_TINT = '#3b82f6';
    const SECONDARY_CANDLE_FILL = '#60a5fa';

    /** Đoạn đường nối handicap: màu theo biến động giá nến (Tài/Xỉu). */
    const handicapLinkSegments = useMemo(() => {
        const pts = sortedMarketData;
        if (pts.length < 2) return [] as { key: string; color: string; data: typeof pts }[];
        const segs: { key: string; color: string; data: typeof pts }[] = [];
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]!;
            const curr = pts[i]!;
            const prevOdds = candleOddsForLink(prev, underXiuMode);
            const currOdds = candleOddsForLink(curr, underXiuMode);
            const roseEnough =
                prevOdds != null &&
                currOdds != null &&
                currOdds - prevOdds > CANDLE_LINK_RISE_TO_GREEN;
            segs.push({
                key: `hl-${prev.minute}-${curr.minute}-${i}`,
                color: roseEnough ? CANDLE_LINK_GREEN : CANDLE_LINK_RED,
                data: [prev, curr],
            });
        }
        return segs;
    }, [sortedMarketData, underXiuMode]);

    const selectedOu = useMemo(
        () => (selectedMinute != null ? nearestOddsPoint(sortedMarketData, selectedMinute) : null),
        [selectedMinute, sortedMarketData],
    );
    const selectedAh = useMemo(
        () =>
            selectedMinute != null && secondarySortedData?.length
                ? nearestOddsPoint(secondarySortedData, selectedMinute)
                : null,
        [selectedMinute, secondarySortedData],
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${iconColor}`} />
                {title}
            </h3>
            {!underXiuMode && marketData.some((e: any) => typeof e.over === 'number' && e.over <= OU_LINE_DROP_PRICE_MAX) ? (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                    <span
                        className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: LOW_OVER_CANDLE_FILL }}
                    />
                    Nến vàng = Tài ≤ {OU_LINE_DROP_PRICE_MAX} (có ghi giá phía trên)
                </p>
            ) : null}
            {underXiuMode ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 bg-red-500" />
                        Đỏ = Xỉu tăng
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 bg-emerald-500" />
                        Xanh = Xỉu giảm (cùng line)
                    </span>
                </p>
            ) : null}
            {halfSubtitle ? (
                <p className="text-[10px] font-semibold text-amber-600/90 dark:text-amber-400/90 mb-2 uppercase tracking-wide">{halfSubtitle}</p>
            ) : null}
            <div
                ref={setPlotRef}
                data-ou-chart-plot
                className={`relative h-72 sm:h-80 w-full ${minuteCrosshair ? 'cursor-crosshair touch-none' : ''}`}
                onPointerDown={minuteCrosshair ? onPlotPointerDown : undefined}
                onPointerMove={minuteCrosshair ? onPlotPointerMove : undefined}
                onPointerUp={minuteCrosshair ? onPlotPointerUp : undefined}
                onPointerCancel={minuteCrosshair ? onPlotPointerUp : undefined}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 36, right: 10, bottom: 36, left: hasSecondary ? 0 : -15 }}>
                        <defs>
                            <filter id={gid('glowHome')} x="-40%" y="-40%" width="180%" height="180%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id={gid('glowAway')} x="-40%" y="-40%" width="180%" height="180%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <CartesianGrid stroke="#f1f5f9" strokeOpacity={0.1} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            xAxisId={0}
                            type="number"
                            dataKey="minute"
                            name="Phút"
                            domain={xDomain}
                            ticks={xTicks}
                            tickFormatter={formatMinuteAxisTick}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                            tickLine={{ stroke: '#64748b' }}
                            axisLine={{ stroke: '#475569' }}
                            label={{
                                value: 'Phút',
                                position: 'insideBottom',
                                offset: -18,
                                fill: '#64748b',
                                fontSize: 11,
                                fontWeight: 600,
                            }}
                            height={40}
                            interval={0}
                            minTickGap={0}
                        />
                        <YAxis
                            yAxisId="left"
                            dataKey="handicap"
                            name="HDP"
                            width={45}
                            domain={yAxisConfig.domain}
                            ticks={yAxisConfig.ticks}
                            tickFormatter={(tick) => tick.toFixed(2)}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                            allowDecimals={true}
                        />
                        {hasSecondary && (
                            <YAxis
                                yAxisId="leftSecondary"
                                orientation="left"
                                dataKey="handicap"
                                name={secondaryLabel || 'Đội nhà HDP'}
                                width={40}
                                domain={secondaryYAxisConfig!.domain}
                                ticks={secondaryYAxisConfig!.ticks}
                                tickFormatter={(tick) => tick.toFixed(2)}
                                tick={{ fontSize: 10, fill: SECONDARY_TINT }}
                                tickLine={false}
                                axisLine={{ stroke: SECONDARY_TINT }}
                                allowDecimals={true}
                            />
                        )}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                            width={35}
                            domain={['dataMin - 5', 'dataMax + 10']}
                        />
                        {!minuteCrosshair && (
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={<CustomTooltip underXiuMode={underXiuMode} secondaryLabel={secondaryLabel} />}
                            />
                        )}
                        <Scatter
                            xAxisId={0}
                            yAxisId="left"
                            name="Thị trường"
                            data={marketDataForChart}
                            shape={(p: Record<string, unknown>) => (
                                <CustomCandle {...p} underXiuMode={underXiuMode} />
                            )}
                            cursor={minuteCrosshair ? 'pointer' : undefined}
                            onClick={(pt: { payload?: { minute?: number } }) => handleCandleClick(pt?.payload)}
                        >
                            {marketDataForChart.map((e: any, i: number) => {
                                const low =
                                    !underXiuMode &&
                                    typeof e.over === 'number' &&
                                    e.over <= OU_LINE_DROP_PRICE_MAX;
                                return (
                                    <Cell key={`c-${i}`} fill={low ? LOW_OVER_CANDLE_FILL : e.color} />
                                );
                            })}
                        </Scatter>
                        {handicapLinkSegments.map((seg) => (
                            <Line
                                key={seg.key}
                                xAxisId={0}
                                yAxisId="left"
                                type="linear"
                                data={seg.data}
                                dataKey="handicap"
                                stroke={seg.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={false}
                                opacity={0.85}
                                isAnimationActive={false}
                                legendType="none"
                            />
                        ))}
                        {hasSecondary && (
                            <Scatter
                                xAxisId={0}
                                yAxisId="leftSecondary"
                                name={secondaryLabel || 'Đội nhà'}
                                data={secondaryDataForChart}
                                shape={<CustomCandle secondary />}
                                legendType="none"
                                cursor={minuteCrosshair ? 'pointer' : undefined}
                                onClick={(pt: { payload?: { minute?: number } }) => handleCandleClick(pt?.payload)}
                            >
                                {secondaryDataForChart.map((e: any, i: number) => (
                                    <Cell key={`sc-${i}`} fill={e.color || SECONDARY_CANDLE_FILL} />
                                ))}
                            </Scatter>
                        )}
                        {hasSecondary && (
                            <Line
                                xAxisId={0}
                                yAxisId="leftSecondary"
                                type="monotone"
                                data={secondarySortedData}
                                dataKey="handicap"
                                name={secondaryLabel || 'Đội nhà'}
                                stroke={SECONDARY_TINT}
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                activeDot={{ r: 4 }}
                                opacity={0.85}
                            />
                        )}
                        <Line
                            xAxisId={0}
                            yAxisId="right"
                            type="monotone"
                            data={apiChartData}
                            dataKey="homeApi"
                            name="API Đội nhà"
                            stroke="#2dd4bf"
                            strokeWidth={4}
                            dot={<CustomApiDot data={apiChartData} />}
                            style={{ filter: `url(#${gid('glowHome')})` }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Line
                            xAxisId={0}
                            yAxisId="right"
                            type="monotone"
                            data={apiChartData}
                            dataKey="awayApi"
                            name="API Đội khách"
                            stroke="#8b5cf6"
                            strokeWidth={4}
                            dot={<CustomApiDot data={apiChartData} />}
                            style={{ filter: `url(#${gid('glowAway')})` }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        {alertMarkers
                            .filter((a) => typeof a.minute === 'number' && Number.isFinite(a.minute))
                            .map((a) => {
                                if (a.type === 'composite') {
                                    const strokeCol = '#059669'; // emerald-600
                                    return (
                            <ReferenceLine
                                key={a.id}
                                xAxisId={0}
                                yAxisId="left"
                                x={a.minute}
                                stroke={strokeCol}
                                strokeDasharray="4 4"
                                strokeOpacity={0.75}
                                label={{
                                    value: '🔔',
                                    position: 'insideTop',
                                    fill: strokeCol,
                                    fontSize: 12,
                                }}
                            />
                                    );
                                }
                                const extreme =
                                    a.pressureLevel === 2 ||
                                    (a.type === 'pressure' && (a.title.includes('CỰC ĐẠI') || a.title.includes('🔴')));
                                const strokeCol = extreme ? '#dc2626' : '#f59e0b';
                                return (
                            <ReferenceLine
                                key={a.id}
                                xAxisId={0}
                                yAxisId="left"
                                x={a.minute}
                                stroke={strokeCol}
                                strokeDasharray="4 4"
                                strokeOpacity={0.65}
                                label={{
                                    value: '🔔',
                                    position: 'insideTop',
                                    fill: strokeCol,
                                    fontSize: 12,
                                }}
                            />
                                );
                            })}
                        {extraMarkers
                            .filter((m) => typeof m.minute === 'number' && Number.isFinite(m.minute))
                            .map((m, i) => (
                                <ReferenceLine
                                    key={`extra-${m.minute}-${i}`}
                                    xAxisId={0}
                                    yAxisId="left"
                                    x={m.minute}
                                    stroke={m.color ?? '#f97316'}
                                    strokeWidth={2}
                                    strokeOpacity={0.9}
                                    label={{
                                        value: m.label ?? '📍',
                                        position: 'insideTopRight',
                                        fill: m.color ?? '#f97316',
                                        fontSize: 12,
                                    }}
                                />
                            ))}
                        {compareActive && (
                            <ReferenceLine
                                xAxisId={0}
                                yAxisId="left"
                                x={selectedMinute!}
                                stroke={isSyncedCrosshair ? '#94a3b8' : '#6366f1'}
                                strokeWidth={isSyncedCrosshair ? 1 : 1.5}
                                strokeDasharray={isSyncedCrosshair ? undefined : '5 4'}
                                strokeOpacity={isSyncedCrosshair ? 0.55 : 0.85}
                                ifOverflow="extendDomain"
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
                <OverlayContainer>
                    <ShotBalls shots={shotEvents} xDomain={xDomain} leftGutterPx={leftGutterPx} />
                    <GameEventMarkers
                        events={gameEvents}
                        xDomain={xDomain}
                        leftGutterPx={leftGutterPx}
                        homeTeamName={homeTeamName}
                        awayTeamName={awayTeamName}
                    />
                </OverlayContainer>
            </div>
            {(showCrosshairHud || (minuteCrosshair && !suppressCrosshairHud)) && (
                <div className="mt-2 space-y-2">
                    {showCrosshairHud && (
                        <MinuteCrosshairHud
                            minute={selectedMinute!}
                            ou={selectedOu}
                            ah={selectedAh}
                            underXiuMode={underXiuMode}
                            secondaryLabel={secondaryLabel}
                        />
                    )}
                    {minuteCrosshair && !suppressCrosshairHud && (
                        <p className="text-[10px] text-indigo-600/90 dark:text-indigo-400/90 px-1 text-center">
                            {compareActive
                                ? '← → đổi phút · Esc thoát so sánh'
                                : 'Bấm/kéo trên biểu đồ hoặc nến T/X để bám vạch kèo so sánh theo phút'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
