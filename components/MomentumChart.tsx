import React, { useRef, useState, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, Scatter, XAxis, YAxis, Tooltip, Cell, Line, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ChartAlertMarker } from '../types';
export type { ChartAlertMarker } from '../types';
import { formatMinuteAxisTick } from './chartAxisFormat';

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
                            {secondaryLabel || 'Đội nhà'} HDP: {typeof secondaryData.handicap === 'number' ? secondaryData.handicap.toFixed(2) : '-'}
                        </p>
                        {typeof secondaryData.home === 'number' && (
                            <p className="text-gray-300">Odds Nhà: <span style={{ color: '#93c5fd' }}>{secondaryData.home.toFixed(3)}</span></p>
                        )}
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

const OddsColorLegent = ({
    underXiuMode,
    hasSecondary,
    secondaryLabel,
}: {
    underXiuMode?: boolean;
    hasSecondary?: boolean;
    secondaryLabel?: string;
}) => (
    <div className="flex flex-col gap-2 mt-3 px-4 py-2 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Thị trường (nến):</span>
            <div className="flex items-center gap-3 flex-wrap justify-end">
                {underXiuMode ? (
                    <>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-emerald-500 rounded-sm"></div>
                            <span>Giảm Xỉu</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-slate-400 rounded-sm"></div>
                            <span>Ổn định</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-red-500 rounded-sm"></div>
                            <span>Tăng Xỉu</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-emerald-500 rounded-sm"></div>
                            <span>Tăng</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-slate-400 rounded-sm"></div>
                            <span>Ổn định</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-red-500 rounded-sm"></div>
                            <span>Giảm (Hot)</span>
                        </div>
                    </>
                )}
                {hasSecondary ? (
                    <div className="flex items-center gap-1 pl-3 ml-1 border-l border-gray-200 dark:border-slate-700">
                        <div
                            className="w-3 h-3 rounded-full border"
                            style={{ borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.35)' }}
                        ></div>
                        <span style={{ color: '#3b82f6' }}>{secondaryLabel || 'Đội nhà'} (bong bóng)</span>
                    </div>
                ) : null}
            </div>
        </div>
        {underXiuMode ? (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic px-0">
                Xanh: giá Xỉu giảm (bình thường) · Đỏ: giá Xỉu tăng (bất thường)
            </p>
        ) : null}
        {hasSecondary ? (
            <p className="text-[10px] italic px-0" style={{ color: '#3b82f6' }}>
                {secondaryLabel || 'Đội nhà'}: bong bóng + đường đứt xanh, trục trái màu xanh — màu bong bóng vẫn theo quy tắc áp lực (xanh giảm · đỏ tăng · xám ổn định)
            </p>
        ) : null}
    </div>
);

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
    const { cx, cy, fill, payload, secondary } = props;
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
    // Bán kính vừa phải để dễ quan sát mà không che nến chính.
    if (secondary) {
        const r = 5.5;
        return (
            <g>
                <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.35} stroke={fill} strokeWidth={1.5} />
                <circle cx={cx} cy={cy} r={1.5} fill={fill} />
            </g>
        );
    }

    const width = payload.highlight ? 7 : 4;

    return (
        <g>
            <line x1={cx} y1={cy - height / 2 - 4} x2={cx} y2={cy + height / 2 + 4} stroke={fill} strokeWidth={1.5} opacity={0.6} />
            <rect x={cx - width / 2} y={cy - height / 2} width={width} height={height} fill={fill} stroke={payload.highlight ? "#fff" : "none"} strokeWidth={payload.highlight ? 1.5 : 0} rx={1} style={{ filter: payload.highlight ? 'drop-shadow(0px 0px 2px rgba(0,0,0,0.3))' : 'none' }} />
        </g>
    );
};

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
    return <>{Object.entries(shotsByMinute).map(([minute, types]) => (types as ('on' | 'off')[]).map((type, index) => (<div key={`${minute}-${index}`} className={`ball-icon ${type === 'on' ? 'ball-on' : 'ball-off'}`} style={{ left: `${calculateLeft(Number(minute))}px`, top: `${-10 + index * 24}px` }} title={`Shot ${type}-target at ${minute}'`}>⚽</div>)))}</>;
};

const GameEventMarkers = ({ events, containerWidth, xDomain, leftGutterPx = 45, rightGutterPx = 35 }: { events: any[]; containerWidth?: number; xDomain: [number, number]; leftGutterPx?: number; rightGutterPx?: number }) => {
    if (!containerWidth || events.length === 0) return null;
    const [xMin, xMax] = xDomain;
    const span = Math.max(xMax - xMin, 1e-6);
    const calculateLeft = (minute: number) => {
        const chartAreaWidth = containerWidth - leftGutterPx - rightGutterPx;
        const leftOffset = leftGutterPx;
        return leftOffset + ((minute - xMin) / span) * chartAreaWidth;
    };
    const goalsAtMinute: Record<string, number> = {};
    return <>{events.map((event, i) => {
        if (event.type === 'goal') {
            const key = String(event.minute);
            const stack = goalsAtMinute[key] ?? 0;
            goalsAtMinute[key] = stack + 1;
            const offsetPx = stack * 14;
            return (
                <div
                    key={`goal-${event.minute}-${i}`}
                    className="game-event-icon game-event-goal chart-goal-ball"
                    style={{ left: `${calculateLeft(event.minute) + offsetPx}px`, top: '6px', bottom: 'auto', transform: 'translateX(-50%)' }}
                    title={`Bàn thắng ${event.minute}'`}
                >
                    ⚽
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
    secondaryOddsField?: 'home' | 'away';
    /** Vạch dọc tùy ý (vd: 📍 mốc phút tình huống tương tự trong modal so sánh). */
    extraMarkers?: Array<{ minute: number; label?: string; color?: string }>;
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
}) => {
    const gid = (base: string) => `${base}-${chartIdSuffix.replace(/[^a-zA-Z0-9_-]/g, '') || 'main'}`;
    const marketDataForChart = underXiuMode
        ? marketData.map((e: any) => ({
              ...e,
              __candleOddsValue: typeof e.under === 'number' ? e.under : undefined,
          }))
        : marketData;

    const hasSecondary =
        Array.isArray(secondaryMarketData) && secondaryMarketData.length > 0 && !!secondaryYAxisConfig;
    const secondaryDataForChart = hasSecondary
        ? secondaryMarketData!.map((e: any) => ({
              ...e,
              __candleOddsValue: typeof e[secondaryOddsField] === 'number' ? e[secondaryOddsField] : undefined,
          }))
        : [];
    // Trục trái thứ hai (~40px) + margin trái đổi -15→0 (~+15px) → overlay phải bù lại.
    const leftGutterPx = hasSecondary ? 45 + 40 + 15 : 45;
    const SECONDARY_TINT = '#3b82f6';
    const SECONDARY_CANDLE_FILL = '#60a5fa';
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${iconColor}`} />
                {title}
            </h3>
            {halfSubtitle ? (
                <p className="text-[10px] font-semibold text-amber-600/90 dark:text-amber-400/90 mb-2 uppercase tracking-wide">{halfSubtitle}</p>
            ) : null}
            <div className="relative h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 10, right: 10, bottom: 28, left: hasSecondary ? 0 : -15 }}>
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
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip underXiuMode={underXiuMode} secondaryLabel={secondaryLabel} />} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Scatter xAxisId={0} yAxisId="left" name="Thị trường" data={marketDataForChart} shape={<CustomCandle />}>
                            {marketDataForChart.map((e: any, i: number) => (<Cell key={`c-${i}`} fill={e.color} />))}
                        </Scatter>
                        <Line xAxisId={0} yAxisId="left" type="monotone" data={sortedMarketData} dataKey="handicap" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} opacity={0.8} />
                        {hasSecondary && (
                            <Scatter
                                xAxisId={0}
                                yAxisId="leftSecondary"
                                name={secondaryLabel || 'Đội nhà'}
                                data={secondaryDataForChart}
                                shape={<CustomCandle secondary />}
                                legendType="none"
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
                    </ComposedChart>
                </ResponsiveContainer>
                <OverlayContainer>
                    <ShotBalls shots={shotEvents} xDomain={xDomain} leftGutterPx={leftGutterPx} />
                    <GameEventMarkers events={gameEvents} xDomain={xDomain} leftGutterPx={leftGutterPx} />
                </OverlayContainer>
                <OddsColorLegent underXiuMode={underXiuMode} hasSecondary={hasSecondary} secondaryLabel={secondaryLabel} />
                {gameEvents.some((e) => e.type === 'goal') && (
                    <p className="text-[10px] text-red-600/90 dark:text-red-400/85 mt-2 px-1 text-center">
                        ⚽ Viền đỏ trên biểu đồ: bàn thắng · 🚩 dưới trục: phạt góc
                    </p>
                )}
                {alertMarkers.length > 0 && (
                    <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 mt-2 px-1 text-center">
                        🔔 Đường dọc: cảnh báo Nhật ký — <span className="text-amber-600">vàng</span> gia tăng ·{' '}
                        <span className="text-red-600 dark:text-red-400">đỏ cực đại</span>
                        {alertMarkers.some((m) => m.type === 'composite') ? (
                            <>
                                {' · '}
                                <span className="text-emerald-600 dark:text-emerald-400">xanh kết hợp OU + áp lực</span>
                            </>
                        ) : null}{' '}
                        ({alertMarkers.length} điểm)
                    </p>
                )}
            </div>
        </div>
    );
};
