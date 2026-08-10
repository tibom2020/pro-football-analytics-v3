import React, { Component, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Scatter,
} from 'recharts';
import type { Tick } from '../services/odds-tick-series';
import {
  CANDLE_ZOOM_SPAN_MINUTES,
  buildTickChartPoints,
  withHalfGapNulls,
  buildSuspendedBands,
  detectScoreEvents,
  detectHandicapChanges,
  buildEffCandles,
  xSpanMinutes,
  filterTicksByHalf,
  type TickChartPoint,
} from '../services/odds-tick-chart-data';

export type OddsTickVolatilityChartProps = {
  ticks: Tick[];
  prematch?: Tick[];
  mode: 'ou' | 'ah';
  title?: string;
  betMarks?: { minute: number; half?: 1 | 2; label: string }[];
};

const SYNC_ID = 'odds-tick-volatility';

/** Bắt lỗi chart — không làm sập cả Dashboard. */
class ChartPaneErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[OddsTickVolatilityChart]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200">
          Lỗi biểu đồ biến động tick: {this.state.error.message}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => this.setState({ error: null })}
          >
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatLocalTime(tMs: number): string {
  if (!Number.isFinite(tMs)) return '—';
  try {
    return new Date(tMs).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(tMs);
  }
}

function formatScore(score: [number, number] | undefined | null): string {
  if (!score || !Array.isArray(score)) return '—';
  const a = score[0];
  const b = score[1];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '—';
  return `${a}-${b}`;
}

function CandleShape(props: {
  cx?: number;
  payload?: { open?: number; high?: number; low?: number; close?: number };
  yAxis?: { scale?: (v: number) => number };
}): React.ReactElement | null {
  const { cx, payload, yAxis } = props;
  const scale = yAxis?.scale;
  if (cx == null || !payload || !scale) return null;
  const { open, high, low, close } = payload;
  if (
    open == null ||
    high == null ||
    low == null ||
    close == null ||
    ![open, high, low, close].every(Number.isFinite)
  ) {
    return null;
  }
  const yHigh = scale(high);
  const yLow = scale(low);
  const yOpen = scale(open);
  const yClose = scale(close);
  if (![yHigh, yLow, yOpen, yClose].every(Number.isFinite)) return null;
  const up = close >= open;
  const color = up ? '#10b981' : '#ef4444';
  const bodyTop = Math.min(yOpen, yClose);
  const bodyBot = Math.max(yOpen, yClose);
  const bodyH = Math.max(bodyBot - bodyTop, 1);
  const halfW = 3;
  return (
    <g>
      <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
      <rect x={cx - halfW} y={bodyTop} width={halfW * 2} height={bodyH} fill={color} stroke={color} />
    </g>
  );
}

function TickTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TickChartPoint | Record<string, unknown> }>;
  mode: 'ou' | 'ah';
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row || typeof row !== 'object') return null;

  const hint =
    mode === 'ou'
      ? 'Tăng = khả năng có bàn cao hơn'
      : 'Âm hơn = đội nhà mạnh hơn';

  const tick = row as TickChartPoint;
  return (
    <div className="bg-slate-800 text-white text-[11px] p-2 rounded shadow-lg border border-slate-700 max-w-xs z-50">
      <p className="font-bold border-b border-slate-600 mb-1 pb-1">
        {formatLocalTime(tick.t)} · {tick.minute}&apos; (H{tick.half})
      </p>
      <p>Tỷ số: {formatScore(tick.score)}</p>
      <p>Kèo thô: {tick.handicapRaw ?? '—'}</p>
      {tick.suspended ? (
        <p className="text-amber-300 font-semibold">Khoá cược</p>
      ) : (
        <>
          {mode === 'ou' ? (
            <p>
              Tài {tick.overOd ?? '—'} / Xỉu {tick.underOd ?? '—'}
            </p>
          ) : (
            <p>
              Nhà {tick.homeOd ?? '—'} / Khách {tick.awayOd ?? '—'}
            </p>
          )}
          <p>Eff: {tick.eff == null ? '—' : Number(tick.eff).toFixed(3)}</p>
        </>
      )}
      {tick.dtPrevMs != null && Number.isFinite(tick.dtPrevMs) ? (
        <p className="text-slate-400">Δ tick trước: {(tick.dtPrevMs / 1000).toFixed(1)}s</p>
      ) : null}
      <p className="text-slate-400 mt-1 text-[10px]">{hint}</p>
    </div>
  );
}

function BurstDot(props: {
  cx?: number;
  cy?: number;
  payload?: TickChartPoint;
}): React.ReactElement | null {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload || payload.eff == null) return null;
  const r = payload.burst ? 4.5 : 2.5;
  return <circle cx={cx} cy={cy} r={r} fill="#6366f1" stroke="#312e81" strokeWidth={1} />;
}

function OddsTickVolatilityChartInner({
  ticks: ticksIn,
  prematch = [],
  mode,
  title,
  betMarks = [],
}: OddsTickVolatilityChartProps) {
  const [halfFilter, setHalfFilter] = useState<1 | 2 | 'all'>('all');

  const ticks = useMemo(
    () => filterTicksByHalf(ticksIn ?? [], halfFilter),
    [ticksIn, halfFilter],
  );

  const span = xSpanMinutes(ticks);
  const useCandles = span > CANDLE_ZOOM_SPAN_MINUTES;

  const points = useMemo(
    () => withHalfGapNulls(buildTickChartPoints(ticks)),
    [ticks],
  );
  const candles = useMemo(() => buildEffCandles(ticks), [ticks]);
  const bands = useMemo(
    () =>
      buildSuspendedBands(ticks).filter(
        (b) => Number.isFinite(b.x1) && Number.isFinite(b.x2) && b.x2 >= b.x1,
      ),
    [ticks],
  );
  const scoreEvents = useMemo(() => detectScoreEvents(ticks), [ticks]);
  const hcMarks = useMemo(() => detectHandicapChanges(ticks), [ticks]);

  const opening = prematch.length > 0 ? prematch[prematch.length - 1] : null;

  const effValues = useMemo(() => {
    const vals: number[] = [];
    for (const p of points) {
      if (p.eff != null && Number.isFinite(p.eff)) vals.push(p.eff);
    }
    for (const c of candles) {
      if (Number.isFinite(c.high)) vals.push(c.high);
      if (Number.isFinite(c.low)) vals.push(c.low);
    }
    return vals;
  }, [points, candles]);

  const yDomain = useMemo((): [number, number] => {
    if (effValues.length === 0) return [0, 1];
    const lo = Math.min(...effValues);
    const hi = Math.max(...effValues);
    const pad = Math.max((hi - lo) * 0.1, 0.05);
    return [lo - pad, hi + pad];
  }, [effValues]);

  const xDomain = useMemo((): [number, number] => {
    if (ticks.length === 0) return [0, 45];
    let min = Infinity;
    let max = -Infinity;
    for (const t of ticks) {
      if (!Number.isFinite(t.minuteFrac)) continue;
      if (t.minuteFrac < min) min = t.minuteFrac;
      if (t.minuteFrac > max) max = t.minuteFrac;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 45];
    return [Math.floor(min), Math.ceil(max + 0.5)];
  }, [ticks]);

  if (!ticksIn?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-500">
        Chưa có tick odds (poll B365 hoặc match-v2 odds.jsonl).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-white/60 dark:bg-slate-900/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            {title ??
              (mode === 'ou'
                ? 'Biến động kèo hiệu chỉnh · Tài/Xỉu'
                : 'Biến động kèo hiệu chỉnh · Chấp')}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Trục X = phút + phần lẻ suy từ add_time (không phải giây thi đấu thật)
            {useCandles ? ' · đang zoom xa → nến theo phút' : ' · từng tick (stepAfter)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {opening ? (
            <span className="text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
              Kèo mở: {opening.handicapRaw}
              {opening.eff != null ? ` · eff ${opening.eff.toFixed(2)}` : ''}
            </span>
          ) : null}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-[11px]">
            {([
              ['all', 'Cả trận'],
              [1, 'H1'],
              [2, 'H2'],
            ] as const).map(([v, label]) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setHalfFilter(v)}
                className={`px-2.5 py-1 font-semibold ${
                  halfFilter === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {ticks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Không có tick cho bộ lọc hiệp này.
        </div>
      ) : (
        <>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                syncId={SYNC_ID}
                data={useCandles ? candles : points}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
                <XAxis
                  type="number"
                  dataKey="minuteFrac"
                  domain={xDomain}
                  allowDataOverflow
                  tickFormatter={(v) => `${Math.floor(Number(v))}'`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis domain={yDomain} tick={{ fontSize: 10 }} width={42} />
                <Tooltip content={<TickTooltip mode={mode} />} />
                {bands.map((b, i) => (
                  <ReferenceArea
                    key={`sus-${i}`}
                    x1={b.x1}
                    x2={b.x2}
                    fill="#f59e0b"
                    fillOpacity={0.18}
                    ifOverflow="hidden"
                  />
                ))}
                {scoreEvents.map((ev, i) => (
                  <ReferenceLine
                    key={`sc-${i}`}
                    x={ev.minuteFrac}
                    stroke={ev.kind === 'goal' ? '#f97316' : '#a855f7'}
                    strokeDasharray={ev.kind === 'disallowed' ? '4 3' : undefined}
                    strokeWidth={ev.kind === 'goal' ? 1.5 : 1}
                    label={{
                      value: ev.label,
                      position: 'insideTopLeft',
                      fill: ev.kind === 'goal' ? '#fb923c' : '#c084fc',
                      fontSize: 9,
                    }}
                  />
                ))}
                {hcMarks.map((m, i) => (
                  <ReferenceLine
                    key={`hc-${i}`}
                    x={m.minuteFrac}
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                ))}
                {betMarks.map((b, i) => (
                  <ReferenceLine
                    key={`bet-${i}`}
                    x={(b.minute ?? 0) + 0.5}
                    stroke="#22d3ee"
                    strokeWidth={1}
                    label={{
                      value: b.label,
                      position: 'insideBottomLeft',
                      fontSize: 9,
                      fill: '#22d3ee',
                    }}
                  />
                ))}
                {useCandles ? (
                  <Scatter
                    data={candles}
                    dataKey="close"
                    shape={CandleShape}
                    isAnimationActive={false}
                  />
                ) : (
                  <>
                    <Line
                      type="stepAfter"
                      dataKey="eff"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                      name="eff"
                    />
                    <Scatter dataKey="eff" shape={BurstDot} isAnimationActive={false} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export const OddsTickVolatilityChart: React.FC<OddsTickVolatilityChartProps> = (props) => (
  <ChartPaneErrorBoundary>
    <OddsTickVolatilityChartInner {...props} />
  </ChartPaneErrorBoundary>
);
