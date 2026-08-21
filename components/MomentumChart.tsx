import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveContainer, ComposedChart, Scatter, XAxis, YAxis, Tooltip, Cell, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ChartAlertMarker } from '../types';
export type { ChartAlertMarker } from '../types';
import { formatMinuteAxisTick } from './chartAxisFormat';
import { OU_LINE_DROP_PRICE_MAX } from '../services/ou-line-drop-alert';
import {
    computeOuOverLineRunAvgs,
    detectOuOverLineDropDeltas,
    formatOuOverLineDropDeltaLabel,
    formatOuOverLineRunAvgLabel,
} from '../services/ou-line-over-delta';
import {
    TYPICAL_MINUTE_RANGE,
    type MinuteAgg,
} from '../services/odds-tick-chart-data';

/**
 * Đoạn nối nến: màu theo giá nến (Tài `over` / Xỉu `under`).
 * Tăng > 0.025 → xanh; giảm / đứng / tăng ≤ 0.025 → đỏ.
 * Làm tròn 3 chữ số để tránh float (1.725−1.700 = 0.025000000000000133 → vẫn ≤ 0.025).
 */
const CANDLE_LINK_RISE_TO_GREEN = 0.025;
const CANDLE_LINK_RED = '#ef4444';
const CANDLE_LINK_GREEN = '#10b981';

function candleOddsForLink(
    point: {
        over?: number;
        under?: number;
        home?: number;
        chapOdds?: number;
        __candleOddsValue?: number;
    },
    underXiuMode: boolean,
    ahChapMode = false,
): number | null {
    if (ahChapMode) {
        if (typeof point.chapOdds === 'number' && Number.isFinite(point.chapOdds)) return point.chapOdds;
        if (typeof point.__candleOddsValue === 'number' && Number.isFinite(point.__candleOddsValue)) {
            return point.__candleOddsValue;
        }
        return null;
    }
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

/** true khi tăng giá nến > 0.025 (sau làm tròn 3 chữ số). */
function candleLinkRoseEnough(prev: number, curr: number): boolean {
    const diff = Number((curr - prev).toFixed(3));
    return diff > CANDLE_LINK_RISE_TO_GREEN;
}

/** Nến Tài ≤ ngưỡng — dễ tách khỏi đỏ/xanh áp lực. */
const LOW_OVER_CANDLE_FILL = '#f59e0b';
const LOW_OVER_CANDLE_STROKE = '#b45309';
const LOW_OVER_LABEL_FILL = '#b45309';

/** Nến Tài peak (giá cao nhất/phút) — vàng khi ≤ 1.775. */
export const OU_HIGH_OVER_YELLOW_PRICE_MAX = 1.775;

/** So sánh odds với ngưỡng sau làm tròn 3 chữ số (tránh float). */
function isOddsAtOrBelow(odds: number, max: number): boolean {
    return Number(odds.toFixed(3)) <= Number(max.toFixed(3));
}

// --- Shared Helper Components ---

const CustomTooltip = ({ active, payload, label, underXiuMode, ahChapMode, secondaryLabel }: any) => {
    if (active && payload && payload.length) {
        const minute = label;
        const handicapEntries = payload.filter((p: any) => p.dataKey === 'handicap' && p.payload);
        if (ahChapMode) {
            const chap = handicapEntries[0]?.payload;
            if (!chap) return null;
            const oddsColor =
                chap.colorName === 'red'
                    ? 'text-red-400'
                    : chap.colorName === 'green'
                      ? 'text-green-400'
                      : 'text-white';
            const sideLabel = chap.chapSide === 'away' ? 'Đội khách' : 'Đội nhà';
            return (
                <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg border border-slate-700 z-50">
                    <p className="font-bold border-b border-slate-600 mb-1 pb-1">Phút: {minute}'</p>
                    <p className="font-semibold text-sky-300">
                        {secondaryLabel || 'Đội chấp'} · {sideLabel}
                    </p>
                    <p className="font-semibold text-yellow-400">
                        HDP: {typeof chap.handicap === 'number' ? chap.handicap.toFixed(2) : '-'}
                    </p>
                    <p className="text-gray-300">
                        Odds chấp:{' '}
                        <span className={oddsColor}>
                            {typeof chap.chapOdds === 'number' ? chap.chapOdds.toFixed(3) : '-'}
                        </span>
                    </p>
                </div>
            );
        }
        // Khi gộp 2 kèo, có thể có 2 entry dataKey="handicap" → phân biệt bằng field:
        // OU luôn có over/under, AH luôn có home/away (không bao giờ trùng — xem types.ts).
        const marketData = handicapEntries.find((p: any) => 'over' in p.payload || 'under' in p.payload)?.payload
            ?? handicapEntries.find((p: any) => !('home' in p.payload))?.payload;
        const secondaryData = handicapEntries.find(
            (p: any) => 'home' in p.payload && !('over' in p.payload) && !('under' in p.payload),
        )?.payload;

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
            </div>
        );
    }
    return null;
};

const CustomCandle = (props: any) => {
    const { cx, cy, fill, payload, secondary, underXiuMode, ahChapMode, lowOverPriceMax } = props;
    const hotMax =
        typeof lowOverPriceMax === 'number' && Number.isFinite(lowOverPriceMax)
            ? lowOverPriceMax
            : OU_LINE_DROP_PRICE_MAX;
    const oddsValue =
        payload.__candleOddsValue ??
        payload.chapOdds ??
        payload.over ??
        payload.home ??
        payload.under ??
        1.9;

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

    // Legacy overlay (bubble) — Dashboard/Modal Phase 1 không còn dùng secondary.
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
    const chapOdds =
        typeof payload.chapOdds === 'number' && Number.isFinite(payload.chapOdds)
            ? payload.chapOdds
            : typeof payload.__candleOddsValue === 'number' && Number.isFinite(payload.__candleOddsValue)
              ? payload.__candleOddsValue
              : null;
    const isLowHot =
        ahChapMode
            ? chapOdds != null && isOddsAtOrBelow(chapOdds, hotMax)
            : !underXiuMode && over != null && isOddsAtOrBelow(over, hotMax);
    const hotLabel = ahChapMode ? chapOdds : over;

    const candleFill = isLowHot ? LOW_OVER_CANDLE_FILL : fill;
    const wickStroke = isLowHot ? LOW_OVER_CANDLE_STROKE : fill;
    const width = payload.highlight ? 7 : isLowHot ? 6 : 4;
    const topY = cy - height / 2;

    return (
        <g>
            <line
                x1={cx}
                y1={topY - 4}
                x2={cx}
                y2={cy + height / 2 + 4}
                stroke={wickStroke}
                strokeWidth={isLowHot ? 2 : 1.5}
                opacity={0.75}
            />
            <rect
                x={cx - width / 2}
                y={topY}
                width={width}
                height={height}
                fill={candleFill}
                stroke={payload.highlight ? '#fff' : isLowHot ? LOW_OVER_CANDLE_STROKE : 'none'}
                strokeWidth={payload.highlight || isLowHot ? 1.5 : 0}
                rx={1}
                style={{
                    filter: payload.highlight || isLowHot
                        ? 'drop-shadow(0px 0px 3px rgba(245,158,11,0.55))'
                        : 'none',
                }}
            />
            {isLowHot && hotLabel != null && (
                <text
                    x={cx}
                    y={topY - 8}
                    textAnchor="middle"
                    fill={LOW_OVER_LABEL_FILL}
                    fontSize={9}
                    fontWeight={700}
                    style={{ pointerEvents: 'none' }}
                >
                    {hotLabel.toFixed(3)}
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
    chapOdds?: number;
    chapSide?: 'home' | 'away';
    homeLine?: number;
    colorName?: string;
};

const AH_CHAP_LOOKBACK_MINUTES = 5;

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
    ahChapMode?: boolean;
    secondaryLabel?: string;
    chapDelta?: number | null;
    chapLookbackMinute?: number | null;
}> = ({
    minute,
    ou,
    ah,
    underXiuMode,
    ahChapMode,
    secondaryLabel,
    chapDelta,
    chapLookbackMinute,
}) => {
    const overColor =
        ou?.colorName === 'red'
            ? 'text-red-400'
            : ou?.colorName === 'green'
              ? 'text-green-400'
              : 'text-slate-100';
    const fmtH = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '—');
    const fmtO = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(3) : '—');
    const fmtDelta = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;

    if (ahChapMode) {
        const chap = ou;
        const oddsColor =
            chap?.colorName === 'red'
                ? 'text-red-400'
                : chap?.colorName === 'green'
                  ? 'text-green-400'
                  : 'text-sky-300';
        const sideLabel = chap?.chapSide === 'away' ? 'Đội khách' : 'Đội nhà';
        return (
            <div className="w-full">
                <div className="bg-slate-900/95 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg border border-sky-400/60 backdrop-blur-sm">
                    <p className="font-bold text-sky-300 border-b border-slate-600 mb-1 pb-0.5">
                        Phút {minute}&apos; · {secondaryLabel || 'Đội chấp'}
                    </p>
                    {chap ? (
                        <div className="space-y-0.5">
                            <p className="text-slate-300">
                                Đang chấp: <span className="text-white font-semibold">{sideLabel}</span>
                            </p>
                            <p>
                                <span className="text-yellow-400 font-semibold">HDP:</span>{' '}
                                {fmtH(chap.handicap)}
                            </p>
                            <p className="text-gray-300">
                                Odds chấp: <span className={oddsColor}>{fmtO(chap.chapOdds)}</span>
                            </p>
                            {typeof chapDelta === 'number' && Number.isFinite(chapDelta) ? (
                                <p className="text-gray-400">
                                    Δ {AH_CHAP_LOOKBACK_MINUTES}′
                                    {chapLookbackMinute != null ? ` (từ ${chapLookbackMinute}')` : ''}:{' '}
                                    <span
                                        className={
                                            chapDelta > 0.001
                                                ? 'text-emerald-400'
                                                : chapDelta < -0.001
                                                  ? 'text-red-400'
                                                  : 'text-slate-300'
                                        }
                                    >
                                        {fmtDelta(chapDelta)}
                                    </span>
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic">Chưa có kèo chấp tại phút này</p>
                    )}
                </div>
            </div>
        );
    }

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
                        {typeof ah.chapOdds === 'number' && Number.isFinite(ah.chapOdds) ? (
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
                                    {fmtO(ah.chapOdds)}
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

/** Cùng trục Y OU+AH → chỉ một cột tick trái. */
export function getChartLeftGutter(_hasSecondary?: boolean): number {
    return 45;
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

const GameEventMarkers = ({
    events,
    containerWidth,
    xDomain,
    leftGutterPx = 45,
    rightGutterPx = 10,
}: {
    events: any[];
    containerWidth?: number;
    xDomain: [number, number];
    leftGutterPx?: number;
    rightGutterPx?: number;
}) => {
    if (!containerWidth || events.length === 0) return null;
    const calculateLeft = (minute: number) =>
        minuteToPlotLeftPx(minute, containerWidth, xDomain, leftGutterPx, rightGutterPx);
    return <>{events.map((event, i) => {
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

const SHOT_BALL_SLOT_PX = 22;
const GOAL_STACK_SLOT_PX = 38;
const SHOT_STRIP_COLLIDE_GAP_PX = 2;

type ShotGoalStripItem =
    | { kind: 'shot'; minute: number; index: number; on: boolean; leftPx: number; row: number }
    | { kind: 'goal'; minute: number; index: number; team?: 'home' | 'away'; leftPx: number; row: number };

function layoutShotGoalStripItems(
    shots: Array<{ minute?: number; type?: string }>,
    goals: Array<{ minute?: number; team?: 'home' | 'away' }>,
    containerWidth: number,
    xDomain: [number, number],
    leftGutterPx: number,
): { placed: ShotGoalStripItem[]; rowCount: number } {
    const pending: Array<Omit<ShotGoalStripItem, 'leftPx' | 'row'> & { width: number }> = [];
    shots.forEach((shot, index) => {
        const minute = Number(shot.minute);
        if (!Number.isFinite(minute)) return;
        pending.push({ kind: 'shot', minute, index, on: shot.type === 'on', width: SHOT_BALL_SLOT_PX });
    });
    goals.forEach((event, index) => {
        const minute = Number(event.minute);
        if (!Number.isFinite(minute)) return;
        pending.push({ kind: 'goal', minute, index, team: event.team, width: GOAL_STACK_SLOT_PX });
    });
    pending.sort((a, b) => a.minute - b.minute || (a.kind === b.kind ? a.index - b.index : a.kind === 'shot' ? -1 : 1));
    const rowRight: number[] = [];
    const placed: ShotGoalStripItem[] = [];
    for (const item of pending) {
        const leftPx = minuteToPlotLeftPx(item.minute, containerWidth, xDomain, leftGutterPx, 10);
        const half = item.width / 2;
        let row = 0;
        while (row < rowRight.length && rowRight[row]! + SHOT_STRIP_COLLIDE_GAP_PX > leftPx - half) {
            row += 1;
        }
        if (row === rowRight.length) rowRight.push(Number.NEGATIVE_INFINITY);
        rowRight[row] = leftPx + half;
        if (item.kind === 'shot') {
            placed.push({ kind: 'shot', minute: item.minute, index: item.index, on: item.on, leftPx, row });
        } else {
            placed.push({ kind: 'goal', minute: item.minute, index: item.index, team: item.team, leftPx, row });
        }
    }
    return { placed, rowCount: Math.max(1, rowRight.length) };
}

const ChartShotGoalStripHost: React.FC<{
    shots: any[];
    events: any[];
    xDomain: [number, number];
    leftGutterPx?: number;
    homeTeamName?: string;
    awayTeamName?: string;
}> = ({ shots, events, xDomain, leftGutterPx = 45, homeTeamName, awayTeamName }) => {
    const [ref, width] = useStripContainerWidth();
    const goals = events.filter((e) => e.type === 'goal');
    if (shots.length === 0 && goals.length === 0) return null;
    const layout =
        width > 0
            ? layoutShotGoalStripItems(shots, goals, width, xDomain, leftGutterPx)
            : { placed: [] as ShotGoalStripItem[], rowCount: 1 };
    const rowPx = goals.length > 0 ? GOAL_STACK_SLOT_PX : SHOT_BALL_SLOT_PX;
    const stripHeight = layout.rowCount * rowPx + 6;
    return (
        <div
            ref={ref}
            className="relative w-full mb-0.5 shrink-0 overflow-visible"
            style={{ height: stripHeight }}
        >
            {width > 0 ? (
                <ChartShotGoalStrip
                    placed={layout.placed}
                    rowPx={rowPx}
                    homeTeamName={homeTeamName}
                    awayTeamName={awayTeamName}
                />
            ) : null}
        </div>
    );
};

const ChartShotGoalStrip = ({
    placed,
    rowPx,
    homeTeamName,
    awayTeamName,
}: {
    placed: ShotGoalStripItem[];
    rowPx: number;
    homeTeamName?: string;
    awayTeamName?: string;
}) => {
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
    return (
        <>
            {placed.map((item) => {
                if (item.kind === 'shot') {
                    return (
                        <div
                            key={`shot-strip-${item.minute}-${item.index}`}
                            className={`ball-icon ${item.on ? 'ball-on' : 'ball-off'}`}
                            style={{ left: `${item.leftPx}px`, top: `${item.row * rowPx + 2}px` }}
                            title={`Sút ${item.on ? 'trúng đích' : 'lệch'} ${item.minute}'`}
                        >
                            ⚽
                        </div>
                    );
                }
                const label = goalTeamLabel(item.team);
                const teamCls =
                    item.team === 'home'
                        ? 'chart-goal-team-label--home'
                        : item.team === 'away'
                          ? 'chart-goal-team-label--away'
                          : 'chart-goal-team-label--unknown';
                return (
                    <div
                        key={`goal-strip-${item.minute}-${item.index}`}
                        className="game-event-goal-stack"
                        style={{
                            left: `${item.leftPx}px`,
                            top: `${item.row * rowPx}px`,
                            transform: 'translateX(-50%)',
                        }}
                        title={`Bàn thắng ${item.minute}' · ${label}`}
                    >
                        <span className={`chart-goal-team-label ${teamCls}`}>{label}</span>
                        <div className="chart-goal-ball flex items-center justify-center">⚽</div>
                    </div>
                );
            })}
        </>
    );
};

const TB_STRIP_ROW_HEIGHT_PX = 13;
const TB_STRIP_LABEL_GAP_PX = 3;

type StripMarkerInput = { minute: number; label: string };
type PlacedStripMarker = StripMarkerInput & { leftPx: number; row: number; orderIndex: number };

function minuteToPlotLeftPx(
    minute: number,
    containerWidth: number,
    xDomain: [number, number],
    leftGutterPx: number,
    rightGutterPx: number,
): number {
    const [xMin, xMax] = xDomain;
    const span = Math.max(xMax - xMin, 1e-6);
    const plotW = Math.max(containerWidth - leftGutterPx - rightGutterPx, 1);
    return leftGutterPx + ((minute - xMin) / span) * plotW;
}

function estimateTbStripLabelWidthPx(label: string): number {
    return Math.max(40, label.length * 5.8 + 6);
}

/** Xếp chip TB theo thứ tự thời gian; hàng thấp nhất còn chỗ, không chồng ngang. */
function layoutTbStripMarkers(
    markers: StripMarkerInput[],
    containerWidth: number,
    xDomain: [number, number],
    leftGutterPx: number,
    rightGutterPx = 10,
): { placed: PlacedStripMarker[]; rowCount: number } {
    if (markers.length === 0) return { placed: [], rowCount: 0 };

    const plotLeft = leftGutterPx;
    const plotRight = containerWidth - rightGutterPx;

    const withBounds = markers
        .map((m, orderIndex) => {
            const center = minuteToPlotLeftPx(m.minute, containerWidth, xDomain, leftGutterPx, rightGutterPx);
            const width = estimateTbStripLabelWidthPx(m.label);
            const halfW = width / 2;
            const leftPx = Math.max(plotLeft + halfW, Math.min(plotRight - halfW, center));
            return {
                ...m,
                orderIndex,
                leftPx,
                left: leftPx - halfW,
                right: leftPx + halfW,
            };
        })
        .sort((a, b) => a.minute - b.minute || a.orderIndex - b.orderIndex);

    const rows: Array<Array<{ left: number; right: number }>> = [];
    const placed: PlacedStripMarker[] = [];

    for (const m of withBounds) {
        let row = 0;
        for (;;) {
            if (row >= rows.length) {
                rows.push([]);
                break;
            }
            const overlaps = rows[row]!.some(
                (seg) => !(m.right + TB_STRIP_LABEL_GAP_PX <= seg.left || m.left >= seg.right + TB_STRIP_LABEL_GAP_PX),
            );
            if (!overlaps) break;
            row++;
        }
        rows[row]!.push({ left: m.left, right: m.right });
        placed.push({ minute: m.minute, label: m.label, leftPx: m.leftPx, row, orderIndex: m.orderIndex });
    }

    placed.sort((a, b) => a.minute - b.minute || a.orderIndex - b.orderIndex || a.row - b.row);
    return { placed, rowCount: rows.length };
}

function useStripContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const apply = () => setWidth(el.clientWidth);
        apply();
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) setWidth(entries[0].contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return [ref, width];
}

/** Nhãn Δ line-drop — HTML phía trên plot; giữ một hàng cố định, lệch nhẹ khi trùng phút. */
const OuLineDropDeltaStrip = ({
    markers,
    containerWidth,
    xDomain,
    leftGutterPx = 45,
    rightGutterPx = 10,
}: {
    markers: Array<{ minute: number; label: string; color: string }>;
    containerWidth?: number;
    xDomain: [number, number];
    leftGutterPx?: number;
    rightGutterPx?: number;
}) => {
    if (!containerWidth || markers.length === 0) return null;
    const leftOf = (minute: number) => minuteToPlotLeftPx(minute, containerWidth, xDomain, leftGutterPx, rightGutterPx);

    const stackAt: Record<number, number> = {};
    return (
        <>
            {markers.map((m, i) => {
                const stack = stackAt[m.minute] ?? 0;
                stackAt[m.minute] = stack + 1;
                return (
                    <span
                        key={`ou-delta-strip-${m.minute}-${i}-${m.label}`}
                        className="absolute z-30 pointer-events-none select-none rounded px-1 py-0.5 text-[10px] font-bold leading-none shadow-sm bg-amber-50 text-amber-900 border border-amber-600 dark:bg-amber-950/95 dark:text-amber-200 dark:border-amber-500"
                        style={{
                            left: `${leftOf(m.minute) + stack * 4}px`,
                            top: 0,
                            transform: 'translateX(-50%)',
                        }}
                        title={`Phút ${m.minute}' · ${m.label}`}
                    >
                        {m.label}
                    </span>
                );
            })}
        </>
    );
};

const OuLineDropDeltaStripHost: React.FC<{
    markers: Array<{ minute: number; label: string; color: string }>;
    xDomain: [number, number];
    leftGutterPx?: number;
}> = ({ markers, xDomain, leftGutterPx = 45 }) => {
    const [ref, width] = useStripContainerWidth();
    if (markers.length === 0) return null;
    return (
        <div ref={ref} className="relative h-5 w-full mb-0.5 shrink-0">
            {width > 0 ? (
                <OuLineDropDeltaStrip
                    markers={markers}
                    containerWidth={width}
                    xDomain={xDomain}
                    leftGutterPx={leftGutterPx}
                />
            ) : null}
        </div>
    );
};

const OuLineRunAvgStripHost: React.FC<{
    markers: Array<{ minute: number; label: string }>;
    xDomain: [number, number];
    leftGutterPx?: number;
}> = ({ markers, xDomain, leftGutterPx = 45 }) => {
    const [ref, width] = useStripContainerWidth();
    const layout = useMemo(
        () => (width > 0 ? layoutTbStripMarkers(markers, width, xDomain, leftGutterPx) : { placed: [], rowCount: 0 }),
        [markers, width, xDomain, leftGutterPx],
    );
    if (markers.length === 0) return null;
    const stripHeight = layout.rowCount * TB_STRIP_ROW_HEIGHT_PX + 1;
    return (
        <div
            ref={ref}
            className="relative w-full mb-0 shrink-0 overflow-visible"
            style={{ height: stripHeight > 0 ? stripHeight : TB_STRIP_ROW_HEIGHT_PX }}
        >
            {layout.placed.map((m) => (
                <span
                    key={`ou-run-avg-${m.orderIndex}-${m.minute}-${m.label}`}
                    className="absolute z-30 pointer-events-none select-none rounded px-0.5 py-px text-[10px] font-bold leading-none shadow-sm bg-sky-50 text-sky-900 border border-sky-600 dark:bg-sky-950/95 dark:text-sky-200 dark:border-sky-500 whitespace-nowrap"
                    style={{
                        left: `${m.leftPx}px`,
                        top: `${m.row * TB_STRIP_ROW_HEIGHT_PX}px`,
                        transform: 'translateX(-50%)',
                    }}
                    title={m.label}
                >
                    {m.label}
                </span>
            ))}
        </div>
    );
};

const AVG_BAR_ABOVE = '#f59e0b';
const AVG_BAR_BELOW = '#34d399';
const AVG_BAR_EQUAL = '#a78bfa';
const AVG_BAR_HALF_STROKE = '#38bdf8';

type VsAvg = 'above' | 'below' | 'equal';

function vsAvgRange(range: number, avg: number): VsAvg {
    if (Math.abs(range - avg) <= 1e-4) return 'equal';
    return range > avg ? 'above' : 'below';
}

function vsAvgCount(count: number, avg: number): VsAvg {
    if (Math.abs(count - avg) <= 0.05) return 'equal';
    return count > avg ? 'above' : 'below';
}

function fillForVsAvg(vs: VsAvg): string {
    if (vs === 'above') return AVG_BAR_ABOVE;
    if (vs === 'below') return AVG_BAR_BELOW;
    return AVG_BAR_EQUAL;
}

function mean(nums: number[]): number | null {
    if (nums.length === 0) return null;
    let s = 0;
    for (const n of nums) s += n;
    return s / nums.length;
}

function makeMinuteAggBarShape(opts: {
    valueKey: 'rangePlot' | 'tickCount';
    halfWidth: number;
    minBarPx: number;
    getFill: (payload: MinuteAgg & { rangePlot?: number }) => string;
}) {
    const { valueKey, halfWidth, minBarPx, getFill } = opts;
    return function Shape(props: {
        cx?: number;
        payload?: MinuteAgg & { rangePlot?: number };
        yAxis?: { scale?: (v: number) => number };
    }): React.ReactElement | null {
        const { cx, payload, yAxis } = props;
        const scale = yAxis?.scale;
        if (cx == null || !payload || !scale) return null;
        if (payload.hasGoal) return null;
        const value = Number(payload[valueKey] ?? 0);
        if (!Number.isFinite(value)) return null;
        const y0 = scale(0);
        const y1 = scale(value);
        if (!Number.isFinite(y0) || !Number.isFinite(y1)) return null;
        let top = Math.min(y0, y1);
        let h = Math.abs(y1 - y0);
        const floor = value > 0 ? minBarPx : 2;
        if (h < floor) {
            h = floor;
            top = y0 - h;
        }
        return (
            <rect
                x={cx - halfWidth}
                y={top}
                width={halfWidth * 2}
                height={h}
                fill={getFill(payload)}
                stroke={payload.isHalfBoundary ? AVG_BAR_HALF_STROKE : undefined}
                strokeWidth={payload.isHalfBoundary ? 1.25 : 0}
                rx={1.5}
            />
        );
    };
}

/** Đánh dấu phút bàn — không dùng cột cao (làm nhiễu thang biên độ). */
function GoalMinuteMark(props: {
    cx?: number;
    yAxis?: { scale?: (v: number) => number; domain?: [number, number] };
    payload?: MinuteAgg & { markY?: number };
}): React.ReactElement | null {
    const { cx, yAxis, payload } = props;
    if (cx == null || !payload?.hasGoal) return null;
    const scale = yAxis?.scale;
    const markY = payload.markY;
    const y =
        scale && markY != null && Number.isFinite(markY) ? scale(markY) : 14;
    if (!Number.isFinite(y)) return null;
    return (
        <g>
            <polygon
                points={`${cx},${y} ${cx - 5},${y + 9} ${cx + 5},${y + 9}`}
                fill="#f97316"
                stroke="#ea580c"
                strokeWidth={1}
            />
            <text x={cx} y={y - 3} textAnchor="middle" fontSize={10} fill="#fdba74">
                ⚽
            </text>
        </g>
    );
}

function MinuteAggTooltip({
    active,
    payload,
    avgRange,
    avgCount,
    mode,
}: {
    active?: boolean;
    payload?: Array<{ payload?: MinuteAgg }>;
    avgRange: number | null;
    avgCount: number | null;
    mode: 'range' | 'count';
}) {
    if (!active || !payload?.length) return null;
    const a = payload[0]?.payload;
    if (!a) return null;
    const avg = mode === 'range' ? avgRange : avgCount;
    const vs =
        a.hasGoal || avg == null
            ? null
            : mode === 'range'
              ? vsAvgRange(a.range || 0, avg)
              : vsAvgCount(a.tickCount || 0, avg);
    const vsLabel =
        vs === 'above' ? 'vượt' : vs === 'below' ? 'dưới' : vs === 'equal' ? 'bằng' : null;
    return (
        <div className="bg-slate-800 text-white text-[11px] p-2 rounded shadow-lg border border-slate-700 z-50">
            <p className="font-bold border-b border-slate-600 mb-1 pb-1">
                Phút {a.minute}&apos; · H{a.half}
            </p>
            <p>Biên độ: {Number(a.range ?? 0).toFixed(3)}</p>
            <p>Số lần đổi giá: {a.tickCount ?? 0}</p>
            {avg != null ? (
                <p className="text-slate-300">
                    TB live: {mode === 'range' ? avg.toFixed(3) : avg.toFixed(1)}
                    {vsLabel ? (
                        <span
                            className={
                                vs === 'above'
                                    ? ' text-amber-300'
                                    : vs === 'below'
                                      ? ' text-emerald-300'
                                      : ' text-violet-300'
                            }
                        >
                            {' '}
                            · so với TB: {vsLabel}
                        </span>
                    ) : null}
                </p>
            ) : null}
            {a.hasGoal ? (
                <p className="text-amber-300 mt-1">Chứa bàn thắng — không phải tín hiệu dự báo</p>
            ) : null}
            {a.isHalfBoundary ? (
                <p className="text-sky-300 mt-1">Mốc nghỉ / cuối hiệp — kèo viết lại</p>
            ) : null}
        </div>
    );
}

function MinuteVolatilityStrips({
    aggs,
    xDomain,
    xTicks,
    chartIdSuffix,
}: {
    aggs: MinuteAgg[];
    xDomain: [number, number];
    xTicks: number[];
    chartIdSuffix: string;
}) {
    // TB live: tính lại mỗi lần aggs đổi (poll / thêm phút) — bỏ phút bàn.
    const sample = aggs.filter((a) => !a.hasGoal);
    const avgRange = mean(sample.map((a) => a.range || 0));
    const avgCount = mean(sample.map((a) => a.tickCount || 0));

    const normalRanges = sample.map((a) => a.range || 0);
    const peakNormal = normalRanges.length > 0 ? Math.max(...normalRanges) : 0;
    const rangeCap = Math.max(
        0.2,
        peakNormal * 1.4,
        (avgRange ?? TYPICAL_MINUTE_RANGE) * 8,
        TYPICAL_MINUTE_RANGE * 8,
    );
    const rangePlotMax = Math.sqrt(rangeCap);
    const avgRangePlot = avgRange != null ? Math.sqrt(Math.max(0, avgRange)) : null;
    const markY = rangePlotMax * 0.92;
    const maxCount = Math.max(
        2,
        ...(avgCount != null ? [avgCount] : []),
        ...sample.map((a) => a.tickCount || 0),
        2,
    );

    const RangeShape = makeMinuteAggBarShape({
        valueKey: 'rangePlot',
        halfWidth: 6,
        minBarPx: 5,
        getFill: (p) => {
            if (avgRange == null) return AVG_BAR_BELOW;
            return fillForVsAvg(vsAvgRange(p.range || 0, avgRange));
        },
    });
    const CountShape = makeMinuteAggBarShape({
        valueKey: 'tickCount',
        halfWidth: 5.5,
        minBarPx: 3,
        getFill: (p) => {
            if (avgCount == null) return AVG_BAR_BELOW;
            return fillForVsAvg(vsAvgCount(p.tickCount || 0, avgCount));
        },
    });

    const rangeData = aggs.map((a) => ({
        ...a,
        rangePlot: a.hasGoal
            ? 0
            : Math.min(Math.sqrt(Math.max(0, a.range || 0)), rangePlotMax),
        markY,
    }));
    const goalMarks = rangeData.filter((a) => a.hasGoal);
    const countData = aggs.map((a) => ({
        ...a,
        markY: maxCount * 0.92,
    }));
    const syncId = `ou-minute-vol-${chartIdSuffix}`;

    return (
        <div className="mt-3 space-y-2 border-t border-slate-200/80 dark:border-slate-700/80 pt-3">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 px-1 leading-snug flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                    Biên độ / phút
                    {avgRange != null ? (
                        <>
                            {' '}
                            · TB live <span className="font-mono text-slate-200">{avgRange.toFixed(3)}</span>{' '}
                            (đổi theo trận)
                        </>
                    ) : null}
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: AVG_BAR_ABOVE }} /> vượt
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: AVG_BAR_BELOW }} /> dưới
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: AVG_BAR_EQUAL }} /> bằng
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="text-[12px]">⚽</span> bàn
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm border border-sky-400" /> nghỉ
                </span>
            </p>
            <div className="h-36 sm:h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart syncId={syncId} data={rangeData} margin={{ top: 14, right: 10, bottom: 4, left: -10 }}>
                        <CartesianGrid stroke="#f1f5f9" strokeOpacity={0.08} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            type="number"
                            dataKey="minute"
                            domain={xDomain}
                            ticks={xTicks}
                            tickFormatter={formatMinuteAxisTick}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                            tickLine={{ stroke: '#64748b' }}
                            axisLine={{ stroke: '#475569' }}
                            height={28}
                        />
                        <YAxis
                            domain={[0, rangePlotMax * 1.05]}
                            width={48}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickFormatter={(v) => {
                                const real = Number(v) * Number(v);
                                return real < 0.1 ? real.toFixed(2) : real.toFixed(1);
                            }}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                        />
                        <Tooltip
                            content={
                                <MinuteAggTooltip avgRange={avgRange} avgCount={avgCount} mode="range" />
                            }
                        />
                        {avgRangePlot != null ? (
                            <ReferenceLine
                                y={avgRangePlot}
                                stroke="#e2e8f0"
                                strokeDasharray="5 3"
                                strokeWidth={1.75}
                                label={{
                                    value: `TB ${avgRange!.toFixed(3)}`,
                                    position: 'insideTopRight',
                                    fill: '#e2e8f0',
                                    fontSize: 10,
                                    fontWeight: 600,
                                }}
                            />
                        ) : null}
                        <Scatter dataKey="rangePlot" shape={RangeShape} isAnimationActive={false} />
                        {goalMarks.length > 0 ? (
                            <Scatter
                                data={goalMarks}
                                dataKey="markY"
                                shape={GoalMinuteMark}
                                isAnimationActive={false}
                            />
                        ) : null}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 px-1">
                Số lần đổi giá / phút
                {avgCount != null ? (
                    <>
                        {' '}
                        · TB live <span className="font-mono text-slate-200">{avgCount.toFixed(1)}</span>{' '}
                        (đổi theo trận) · gộp theo id
                    </>
                ) : (
                    ' — gộp theo id'
                )}
            </p>
            <div className="h-32 sm:h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart syncId={syncId} data={countData} margin={{ top: 14, right: 10, bottom: 8, left: -10 }}>
                        <CartesianGrid stroke="#f1f5f9" strokeOpacity={0.08} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            type="number"
                            dataKey="minute"
                            domain={xDomain}
                            ticks={xTicks}
                            tickFormatter={formatMinuteAxisTick}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                            tickLine={{ stroke: '#64748b' }}
                            axisLine={{ stroke: '#475569' }}
                            height={28}
                        />
                        <YAxis
                            domain={[0, maxCount + 1]}
                            allowDecimals={false}
                            width={48}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                        />
                        <Tooltip
                            content={
                                <MinuteAggTooltip avgRange={avgRange} avgCount={avgCount} mode="count" />
                            }
                        />
                        {avgCount != null ? (
                            <ReferenceLine
                                y={avgCount}
                                stroke="#e2e8f0"
                                strokeDasharray="5 3"
                                strokeWidth={1.75}
                                label={{
                                    value: `TB ${avgCount.toFixed(1)}`,
                                    position: 'insideTopRight',
                                    fill: '#e2e8f0',
                                    fontSize: 10,
                                    fontWeight: 600,
                                }}
                            />
                        ) : null}
                        <Scatter dataKey="tickCount" shape={CountShape} isAnimationActive={false} />
                        {goalMarks.length > 0 ? (
                            <Scatter
                                data={goalMarks.map((g) => ({ ...g, markY: maxCount * 0.92 }))}
                                dataKey="markY"
                                shape={GoalMinuteMark}
                                isAnimationActive={false}
                            />
                        ) : null}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// --- Main MomentumChart Component ---


interface MomentumChartProps {
    title: string;
    iconColor: string;
    marketData: any[];
    sortedMarketData: any[];
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
    /** Biểu đồ kèo chấp riêng (1_2 / 1_5): nến ∝ chapOdds, marker đổi line, chip đội chấp. */
    ahChapMode?: boolean;
    // ---- Legacy: kèo phụ gộp chung trên OU (Phase 1 không còn dùng trên Dashboard) ----
    /** Nến kèo phụ (homeMarketChartData*). Khi không truyền → chart như cũ. */
    secondaryMarketData?: any[];
    /** Bản đã sort theo phút cho đường xu hướng kèo phụ. */
    secondarySortedData?: any[];
    /** Thang HDP kèo phụ — gộp vào domain trục trái chung với OU. */
    secondaryYAxisConfig?: { domain: number[]; ticks: number[] };
    /** Nhãn legend/tooltip cho kèo phụ / chart chấp, vd "Đội chấp (1_2)". */
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
    /** Biên độ + số lần đổi giá / phút (từ tick) — strip dưới nến OU. */
    minuteAggs?: MinuteAgg[];
    showMinuteVolatility?: boolean;
    /**
     * Ngưỡng nến vàng (Tài/chấp ≤ max). Mặc định 1.725 (line-drop).
     * Chart Tài peak: truyền `OU_HIGH_OVER_YELLOW_PRICE_MAX` (1.775).
     */
    lowOverPriceMax?: number;
}

export const MomentumChart: React.FC<MomentumChartProps> = ({
    title,
    iconColor,
    marketData,
    sortedMarketData,
    yAxisConfig,
    shotEvents,
    gameEvents,
    xDomain = [0, 90],
    xTicks = [0, 15, 30, 45, 60, 75, 90],
    chartIdSuffix = 'main',
    halfSubtitle,
    alertMarkers = [],
    underXiuMode = false,
    ahChapMode = false,
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
    minuteAggs,
    showMinuteVolatility = true,
    lowOverPriceMax = OU_LINE_DROP_PRICE_MAX,
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
    /** Gộp domain OU + AH trên một trục — tránh hai thang độc lập kéo giãn trùng đường nến. */
    const plotYAxisConfig = useMemo(() => {
        if (!hasSecondary || !secondaryYAxisConfig) return yAxisConfig;
        const lo = Math.min(yAxisConfig.domain[0] ?? 0, secondaryYAxisConfig.domain[0] ?? 0);
        const hi = Math.max(yAxisConfig.domain[1] ?? 2, secondaryYAxisConfig.domain[1] ?? 0);
        if (!(Number.isFinite(lo) && Number.isFinite(hi)) || lo >= hi) return yAxisConfig;
        const ticks: number[] = [];
        for (let i = lo; i <= hi + 1e-9; i = parseFloat((i + 0.25).toFixed(2))) {
            if (ticks.length > 120) break;
            ticks.push(i);
        }
        return { domain: [lo, hi], ticks: ticks.length > 1 ? ticks : yAxisConfig.ticks };
    }, [hasSecondary, yAxisConfig, secondaryYAxisConfig]);

    const leftGutterPx = 45;

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
            : ahChapMode
              ? marketData.map((e: any) => ({
                    ...e,
                    __candleOddsValue: typeof e.chapOdds === 'number' ? e.chapOdds : undefined,
                }))
              : marketData;
        return base.map((e: any) => ({
            ...e,
            highlight: (compareActive && selectedMinute === e.minute) || !!e.highlight,
        }));
    }, [underXiuMode, ahChapMode, marketData, compareActive, selectedMinute]);

    const secondaryDataForChart = hasSecondary
        ? secondaryMarketData!.map((e: any) => ({
              ...e,
              __candleOddsValue: typeof e[secondaryOddsField] === 'number' ? e[secondaryOddsField] : undefined,
          }))
        : [];
    const SECONDARY_TINT = '#3b82f6';
    const SECONDARY_CANDLE_FILL = '#60a5fa';

    /** Đoạn đường nối: màu theo giá nến (Tài/Xỉu/chapOdds). */
    const handicapLinkSegments = useMemo(() => {
        const pts = [...sortedMarketData].sort(
            (a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.half ?? 1) - (b.half ?? 1),
        );
        if (pts.length < 2) return [] as { key: string; color: string; data: typeof pts }[];
        const segs: { key: string; color: string; data: typeof pts }[] = [];
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]!;
            const curr = pts[i]!;
            const prevOdds = candleOddsForLink(prev, underXiuMode, ahChapMode);
            const currOdds = candleOddsForLink(curr, underXiuMode, ahChapMode);
            const lineKey = (p: any) =>
                typeof p.homeLine === 'number' && Number.isFinite(p.homeLine)
                    ? p.homeLine
                    : typeof p.handicap === 'number'
                      ? p.handicap
                      : null;
            const prevH = lineKey(prev);
            const currH = lineKey(curr);
            // Đổi line → không so giá giữa hai line khác nhau (giữ đỏ).
            const lineChanged =
                prevH != null && currH != null && Math.abs(currH - prevH) > 0.001;
            const roseEnough =
                !lineChanged &&
                prevOdds != null &&
                currOdds != null &&
                candleLinkRoseEnough(prevOdds, currOdds);
            segs.push({
                key: `hl-${prev.minute}-${curr.minute}-${i}`,
                color: roseEnough ? CANDLE_LINK_GREEN : CANDLE_LINK_RED,
                data: [prev, curr],
            });
        }
        return segs;
    }, [sortedMarketData, underXiuMode, ahChapMode]);

    /** Phase 2: vạch dọc khi đổi line chấp (homeLine). */
    const ahLineChangeMarkers = useMemo(() => {
        if (!ahChapMode) return [] as Array<{ minute: number; label: string; color: string }>;
        const pts = [...sortedMarketData].sort(
            (a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.half ?? 1) - (b.half ?? 1),
        );
        const out: Array<{ minute: number; label: string; color: string }> = [];
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]!;
            const curr = pts[i]!;
            const prevLine =
                typeof prev.homeLine === 'number'
                    ? prev.homeLine
                    : typeof prev.handicap === 'number'
                      ? prev.handicap
                      : null;
            const currLine =
                typeof curr.homeLine === 'number'
                    ? curr.homeLine
                    : typeof curr.handicap === 'number'
                      ? curr.handicap
                      : null;
            if (prevLine == null || currLine == null) continue;
            if (Math.abs(currLine - prevLine) <= 0.001) continue;
            const prevChap =
                typeof prev.handicap === 'number' ? prev.handicap.toFixed(2) : prevLine.toFixed(2);
            const currChap =
                typeof curr.handicap === 'number' ? curr.handicap.toFixed(2) : currLine.toFixed(2);
            out.push({
                minute: curr.minute,
                label: `${prevChap}→${currChap}`,
                color: '#a855f7',
            });
        }
        return out;
    }, [ahChapMode, sortedMarketData]);

    /** Vạch + nhãn Δ khi line OU giảm (Tài cuối line cũ → Tài đầu line mới). */
    const ouLineDropDeltaMarkers = useMemo(() => {
        if (ahChapMode || underXiuMode) {
            return [] as Array<{ minute: number; label: string; color: string }>;
        }
        const pts = sortedMarketData
            .filter(
                (p) =>
                    typeof p.minute === 'number' &&
                    typeof p.handicap === 'number' &&
                    typeof p.over === 'number',
            )
            .map((p) => ({
                minute: p.minute as number,
                handicap: p.handicap as number,
                over: p.over as number,
            }));
        return detectOuOverLineDropDeltas(pts).map((d) => ({
            minute: d.minute,
            label: formatOuOverLineDropDeltaLabel(d.delta),
            color: '#d97706',
        }));
    }, [ahChapMode, underXiuMode, sortedMarketData]);

    const ouLineRunAvgMarkers = useMemo(() => {
        if (ahChapMode || underXiuMode) {
            return [] as Array<{ minute: number; label: string }>;
        }
        const pts = sortedMarketData
            .filter(
                (p) =>
                    typeof p.minute === 'number' &&
                    typeof p.handicap === 'number' &&
                    typeof p.over === 'number' &&
                    Number.isFinite(p.over),
            )
            .map((p) => ({
                minute: p.minute as number,
                handicap: p.handicap as number,
                over: p.over as number,
            }));
        return computeOuOverLineRunAvgs(pts).map((r) => ({
            minute: (r.minuteStart + r.minuteEnd) / 2,
            label: formatOuOverLineRunAvgLabel(r),
        }));
    }, [ahChapMode, underXiuMode, sortedMarketData]);

    const latestChapPoint = useMemo(() => {
        if (!ahChapMode || sortedMarketData.length === 0) return null;
        return sortedMarketData[sortedMarketData.length - 1] as OddsSnap;
    }, [ahChapMode, sortedMarketData]);

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

    const chapHudDelta = useMemo(() => {
        if (!ahChapMode || selectedMinute == null || !selectedOu) {
            return { delta: null as number | null, lookbackMinute: null as number | null };
        }
        const target = selectedMinute - AH_CHAP_LOOKBACK_MINUTES;
        const earlier = [...sortedMarketData]
            .filter((p) => p.minute <= target)
            .sort((a, b) => b.minute - a.minute)[0];
        if (
            !earlier ||
            typeof selectedOu.chapOdds !== 'number' ||
            typeof earlier.chapOdds !== 'number'
        ) {
            return { delta: null, lookbackMinute: null };
        }
        return {
            delta: selectedOu.chapOdds - earlier.chapOdds,
            lookbackMinute: earlier.minute,
        };
    }, [ahChapMode, selectedMinute, selectedOu, sortedMarketData]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${iconColor}`} />
                {title}
            </h3>
            {ahChapMode && latestChapPoint ? (
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-2 py-1 text-[10px] font-semibold text-sky-800 dark:text-sky-200">
                        Đang chấp:{' '}
                        {latestChapPoint.chapSide === 'away'
                            ? awayTeamName || 'Đội khách'
                            : homeTeamName || 'Đội nhà'}
                        <span className="font-mono text-sky-600 dark:text-sky-300">
                            {typeof latestChapPoint.handicap === 'number'
                                ? latestChapPoint.handicap.toFixed(2)
                                : '—'}
                        </span>
                        <span className="text-sky-500">@</span>
                        <span className="font-mono">
                            {typeof latestChapPoint.chapOdds === 'number'
                                ? latestChapPoint.chapOdds.toFixed(3)
                                : '—'}
                        </span>
                    </span>
                </div>
            ) : null}
            {ahChapMode ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 bg-emerald-500" />
                        Xanh = giá chấp tăng
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 bg-red-500" />
                        Đỏ = giảm
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 bg-slate-400" />
                        Xám = đổi line
                    </span>
                    <span className="text-slate-400">· HDP≈0 đảo màu</span>
                    {marketData.some(
                        (e: any) =>
                            typeof e.chapOdds === 'number' && isOddsAtOrBelow(e.chapOdds, lowOverPriceMax),
                    ) ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <span
                                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: LOW_OVER_CANDLE_FILL }}
                            />
                            Vàng = chấp ≤ {lowOverPriceMax}
                        </span>
                    ) : null}
                    {ahLineChangeMarkers.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                            <span className="inline-block w-2.5 h-0.5 shrink-0 bg-violet-500" />
                            Vạch tím = đổi line
                        </span>
                    ) : null}
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
            <OuLineRunAvgStripHost
                markers={ouLineRunAvgMarkers}
                xDomain={xDomain}
                leftGutterPx={leftGutterPx}
            />
            <OuLineDropDeltaStripHost
                markers={ouLineDropDeltaMarkers}
                xDomain={xDomain}
                leftGutterPx={leftGutterPx}
            />
            <ChartShotGoalStripHost
                shots={shotEvents}
                events={gameEvents}
                xDomain={xDomain}
                leftGutterPx={leftGutterPx}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
            />
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
                    <ComposedChart margin={{ top: 20, right: 10, bottom: 36, left: -15 }}>
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
                            domain={plotYAxisConfig.domain}
                            ticks={plotYAxisConfig.ticks}
                            tickFormatter={(tick) => tick.toFixed(2)}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                            allowDecimals={true}
                        />
                        {!minuteCrosshair && (
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={
                                    <CustomTooltip
                                        underXiuMode={underXiuMode}
                                        ahChapMode={ahChapMode}
                                        secondaryLabel={secondaryLabel}
                                    />
                                }
                            />
                        )}
                        <Scatter
                            xAxisId={0}
                            yAxisId="left"
                            name="Thị trường"
                            data={marketDataForChart}
                            shape={(p: Record<string, unknown>) => (
                                <CustomCandle
                                    {...p}
                                    underXiuMode={underXiuMode}
                                    ahChapMode={ahChapMode}
                                    lowOverPriceMax={lowOverPriceMax}
                                />
                            )}
                            cursor={minuteCrosshair ? 'pointer' : undefined}
                            onClick={(pt: { payload?: { minute?: number } }) => handleCandleClick(pt?.payload)}
                        >
                            {marketDataForChart.map((e: any, i: number) => {
                                const low = ahChapMode
                                    ? typeof e.chapOdds === 'number' &&
                                      isOddsAtOrBelow(e.chapOdds, lowOverPriceMax)
                                    : !underXiuMode &&
                                      typeof e.over === 'number' &&
                                      isOddsAtOrBelow(e.over, lowOverPriceMax);
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
                                yAxisId="left"
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
                                yAxisId="left"
                                type="monotone"
                                data={secondarySortedData}
                                dataKey="handicap"
                                name={secondaryLabel || 'Đội nhà'}
                                stroke={SECONDARY_TINT}
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                activeDot={{ r: 4 }}
                                opacity={0.9}
                                isAnimationActive={false}
                            />
                        )}
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
                        {[...ahLineChangeMarkers, ...extraMarkers]
                            .filter((m) => typeof m.minute === 'number' && Number.isFinite(m.minute))
                            .map((m, i) => {
                                const isAh = ahLineChangeMarkers.some(
                                    (a) => a.minute === m.minute && a.label === m.label,
                                );
                                return (
                                <ReferenceLine
                                    key={`extra-${m.minute}-${i}-${m.label ?? ''}`}
                                    xAxisId={0}
                                    yAxisId="left"
                                    x={m.minute}
                                    stroke={m.color ?? '#f97316'}
                                    strokeWidth={isAh ? 1.5 : 2}
                                    strokeDasharray={isAh ? '3 3' : undefined}
                                    strokeOpacity={0.9}
                                    label={{
                                        value: m.label ?? '📍',
                                        position: 'insideTopRight',
                                        fill: m.color ?? '#f97316',
                                        fontSize: 10,
                                    }}
                                />
                                );
                            })}
                        {ouLineDropDeltaMarkers
                            .filter((m) => typeof m.minute === 'number' && Number.isFinite(m.minute))
                            .map((m, i) => (
                                <ReferenceLine
                                    key={`ou-delta-${m.minute}-${i}-${m.label}`}
                                    xAxisId={0}
                                    yAxisId="left"
                                    x={m.minute}
                                    stroke={m.color}
                                    strokeWidth={1.5}
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.9}
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
                    <GameEventMarkers
                        events={gameEvents}
                        xDomain={xDomain}
                        leftGutterPx={leftGutterPx}
                    />
                </OverlayContainer>
            </div>
            {showMinuteVolatility && minuteAggs && minuteAggs.length > 0 ? (
                <MinuteVolatilityStrips
                    aggs={minuteAggs}
                    xDomain={xDomain}
                    xTicks={xTicks}
                    chartIdSuffix={chartIdSuffix}
                />
            ) : null}
            {(showCrosshairHud || (minuteCrosshair && !suppressCrosshairHud)) && (
                <div className="mt-2 space-y-2">
                    {showCrosshairHud && (
                        <MinuteCrosshairHud
                            minute={selectedMinute!}
                            ou={selectedOu}
                            ah={selectedAh}
                            underXiuMode={underXiuMode}
                            ahChapMode={ahChapMode}
                            secondaryLabel={secondaryLabel}
                            chapDelta={chapHudDelta.delta}
                            chapLookbackMinute={chapHudDelta.lookbackMinute}
                        />
                    )}
                    {minuteCrosshair && !suppressCrosshairHud && (
                        <p className="text-[10px] text-indigo-600/90 dark:text-indigo-400/90 px-1 text-center">
                            {compareActive
                                ? '← → đổi phút · Esc thoát so sánh'
                                : ahChapMode
                                  ? 'Bấm/kéo trên biểu đồ hoặc nến chấp để so sánh theo phút'
                                  : 'Bấm/kéo trên biểu đồ hoặc nến T/X để bám vạch kèo so sánh theo phút'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
