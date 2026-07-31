import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, GitCompare, Loader2 } from 'lucide-react';
import type { MatchInfo, ProcessedStats, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot } from '../types';
import type { PredictGoalInput } from '../services/goal-prediction';
import type { StoredAlert } from '../types';
import { AllSimilarMatchesModal } from './GoalPredictionBadge';
import { resolveMatchClockContext } from '../services/matchTimeline';
import type { MatchHalf } from '../services/matchTimeline';
import {
  formatAutoSimilarLabel,
  loadAutoSimilarOnLineChangeEnabled,
  loadSimilarMatchSnapshots,
  pendingAutoSimilarSlots,
  setAutoSimilarOnLineChangeEnabled,
  SIMILAR_MATCH_SNAPSHOTS_UPDATED_EVENT,
  type SimilarMatchSnapshot,
} from '../services/similar-match-snapshots';
import { useAutoSimilarCapture, useSessionJoinClock } from '../hooks/useAutoSimilarCapture';
import { useAutoSimilarOnLineChange } from '../hooks/useAutoSimilarOnLineChange';
import {
  catalogQueryHalf,
  catalogQueryOpenOu13,
  filterSimilarCatalogByOpenLine,
} from '../services/goal-prediction';

interface GameEvent {
  minute: number;
  half: MatchHalf;
  type: 'goal' | 'corner';
  team?: 'home' | 'away';
}

export interface SimilarMatchesPanelProps {
  liveMatch: MatchInfo;
  statsHistory: Record<number, ProcessedStats>;
  oddsHistory: OverUnderMinuteSnapshot[];
  homeOddsHistory: AsianHandicapMinuteSnapshot[];
  gameEvents: GameEvent[];
  alertHistory: StoredAlert[];
}

export const SimilarMatchesPanel: React.FC<SimilarMatchesPanelProps> = ({
  liveMatch,
  statsHistory,
  oddsHistory,
  homeOddsHistory,
  gameEvents,
  alertHistory,
}) => {
  const [open, setOpen] = useState(false);

  const input: PredictGoalInput = useMemo(
    () => ({
      matchId: String(liveMatch.id),
      liveMatch,
      statsHistory,
      oddsHistory,
      homeOddsHistory,
      gameEvents,
      alertHistory,
    }),
    [liveMatch, statsHistory, oddsHistory, homeOddsHistory, gameEvents, alertHistory],
  );

  const oddsHalfSnapshots = useMemo(
    () => [...oddsHistory, ...homeOddsHistory],
    [oddsHistory, homeOddsHistory],
  );

  const clockCtx = useMemo(
    () =>
      resolveMatchClockContext(
        liveMatch.timer,
        liveMatch.timer?.tm ?? (parseInt(liveMatch.time || '0', 10) || 0),
        oddsHalfSnapshots,
        Object.keys(statsHistory),
      ),
    [liveMatch.timer, liveMatch.time, oddsHalfSnapshots, statsHistory],
  );

  const minute = clockCtx.minute;
  const half: 1 | 2 = clockCtx.half;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        title="Xem tất cả tình huống tương tự + đánh giá AI (DeepSeek) tại phút hiện tại"
      >
        <GitCompare className="w-4 h-4" />
        <span className="hidden sm:inline">Tương tự</span>
      </button>
      {open && (
        <AllSimilarMatchesModal
          input={input}
          current={{
            home: liveMatch.home.name,
            away: liveMatch.away.name,
            score: liveMatch.ss || '0-0',
            half,
            minute,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

function formatSnapshotTime(ts: number): string {
  try {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function snapshotSummary(snap: SimilarMatchSnapshot): string {
  if (snap.error) return 'Lỗi';
  const catalogRuns = snap.data?.similarMatchesOpenLineCatalogRuns?.length ?? 0;
  const n =
    (snap.data?.similarMatchesOpenLine?.length ?? 0) +
    (snap.data?.similarMatchesOpenLineCatalog?.length ?? 0) +
    catalogRuns;
  if (n === 0) return 'Không có kết quả';
  const open = snap.data?.similarMatchesOpenLine?.length ?? 0;
  const base = open > 0 ? `${open} top · ${n} tổng` : `${n} trận`;
  return catalogRuns > 0 ? `${base} · ${catalogRuns} catalog+vạch` : base;
}

function formatLabel30(label30?: 0 | 1): string {
  if (label30 == null) return 'chưa rõ';
  return label30 === 1 ? 'CÓ BÀN' : 'không';
}

/** Nhãn + màu cho nghiêng Tài/Xỉu của đánh giá AI. */
export function aiLeanDisplay(lean?: 'over' | 'under' | 'neutral'): { text: string; cls: string } {
  if (lean === 'over') return { text: 'Tài', cls: 'text-red-600 dark:text-red-400' };
  if (lean === 'under') return { text: 'Xỉu', cls: 'text-blue-600 dark:text-blue-400' };
  return { text: 'Trung lập', cls: 'text-slate-500 dark:text-slate-400' };
}

/** Ghi chú Dashboard khi có trận thuộc nhóm catalog + pattern vạch 1_3 gần giống. */
function catalogRunsDashboardNote(snap: SimilarMatchSnapshot): {
  pattern?: string;
  queryHalf: 1 | 2;
  queryOpenOu13?: number;
  total: number;
  items: Array<{
    matchId: string;
    team: string;
    ft: string;
    lineRunsScore?: number;
    ou13LineRuns?: string;
    label30?: 0 | 1;
  }>;
} | null {
  const openingLines = snap.data?.openingLines;
  const queryHalf = catalogQueryHalf(snap.half, snap.data?.queryFeatures);
  const runs = filterSimilarCatalogByOpenLine(
    snap.data?.similarMatchesOpenLineCatalogRuns ?? [],
    openingLines,
    queryHalf,
  );
  if (!runs.length) return null;
  const qLine = catalogQueryOpenOu13(openingLines, queryHalf);
  return {
    pattern: snap.data?.queryOu13LineRuns,
    queryHalf,
    queryOpenOu13: qLine,
    total: runs.length,
    items: runs.slice(0, 5).map((s) => ({
      matchId: String(s.matchId),
      team: s.home && s.away ? `${s.home} vs ${s.away}` : `Match ${s.matchId}`,
      ft: s.finalScore || '—',
      lineRunsScore: s.lineRunsScore,
      ou13LineRuns: s.ou13LineRuns,
      label30: s.label30,
    })),
  };
}

/** Thanh xem lại các snapshot similar tự động trên Dashboard. */
export const SimilarMatchSnapshotsBar: React.FC<{
  matchId: string;
  liveMatch: MatchInfo;
  statsHistory: Record<number, ProcessedStats>;
  oddsHistory: OverUnderMinuteSnapshot[];
  homeOddsHistory: AsianHandicapMinuteSnapshot[];
  gameEvents: GameEvent[];
  alertHistory: StoredAlert[];
}> = ({
  matchId,
  liveMatch,
  statsHistory,
  oddsHistory,
  homeOddsHistory,
  gameEvents,
  alertHistory,
}) => {
  const [snapshots, setSnapshots] = useState<SimilarMatchSnapshot[]>(() => loadSimilarMatchSnapshots(matchId));
  const [viewSnap, setViewSnap] = useState<SimilarMatchSnapshot | null>(null);
  const [chartMatchId, setChartMatchId] = useState<string | undefined>();
  const [autoRunning, setAutoRunning] = useState(false);
  const [showCatalogNotes, setShowCatalogNotes] = useState(false);
  const [lineChangeAutoEnabled, setLineChangeAutoEnabled] = useState(() =>
    loadAutoSimilarOnLineChangeEnabled(matchId),
  );

  useEffect(() => {
    setShowCatalogNotes(false);
    setLineChangeAutoEnabled(loadAutoSimilarOnLineChangeEnabled(matchId));
  }, [matchId]);

  const toggleLineChangeAuto = useCallback(() => {
    setLineChangeAutoEnabled((prev) => {
      const next = !prev;
      setAutoSimilarOnLineChangeEnabled(matchId, next);
      return next;
    });
  }, [matchId]);

  const oddsHalfSnapshots = useMemo(
    () => [...oddsHistory, ...homeOddsHistory],
    [oddsHistory, homeOddsHistory],
  );

  const clockCtx = useMemo(
    () =>
      resolveMatchClockContext(
        liveMatch.timer,
        liveMatch.timer?.tm ?? (parseInt(liveMatch.time || '0', 10) || 0),
        oddsHalfSnapshots,
        Object.keys(statsHistory),
      ),
    [liveMatch.timer, liveMatch.time, oddsHalfSnapshots, statsHistory],
  );

  const sessionJoinRef = useSessionJoinClock(matchId, clockCtx);

  const input: PredictGoalInput = useMemo(
    () => ({
      matchId: String(liveMatch.id),
      liveMatch,
      statsHistory,
      oddsHistory,
      homeOddsHistory,
      gameEvents,
      alertHistory,
    }),
    [liveMatch, statsHistory, oddsHistory, homeOddsHistory, gameEvents, alertHistory],
  );

  const { busy: clockCaptureBusy } = useAutoSimilarCapture(matchId, liveMatch, input, clockCtx, sessionJoinRef);
  const { busy: lineChangeBusy } = useAutoSimilarOnLineChange(
    matchId,
    liveMatch,
    input,
    oddsHistory,
    lineChangeAutoEnabled,
  );

  useEffect(() => {
    const sync = (ev?: Event) => {
      const detail = (ev as CustomEvent<{ matchId?: string }> | undefined)?.detail;
      if (detail?.matchId && String(detail.matchId) !== String(matchId)) return;
      setSnapshots(loadSimilarMatchSnapshots(matchId));
    };
    window.addEventListener(SIMILAR_MATCH_SNAPSHOTS_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SIMILAR_MATCH_SNAPSHOTS_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [matchId]);

  /** Spinner khi đang chờ mốc hoặc đang chụp muộn / đúng giờ. */
  useEffect(() => {
    const ttStr = String(liveMatch.timer?.tt ?? '');
    if (ttStr === '3' || ttStr === '4' || clockCtx.isFt) {
      setAutoRunning(false);
      return;
    }
    const waiting = pendingAutoSimilarSlots(clockCtx, snapshots);
    setAutoRunning(waiting.length > 0 || clockCaptureBusy || lineChangeBusy);
  }, [liveMatch.timer?.tt, clockCtx, snapshots, clockCaptureBusy, lineChangeBusy]);

  const waitingLabels = pendingAutoSimilarSlots(clockCtx, snapshots).map((slot) =>
    slot === 'h1-10' ? 'chờ H1 10\'' : 'chờ H2 52\'',
  );

  const catalogNotes = snapshots
    .map((snap) => ({ snap, note: catalogRunsDashboardNote(snap) }))
    .filter((x): x is { snap: SimilarMatchSnapshot; note: NonNullable<ReturnType<typeof catalogRunsDashboardNote>> } => x.note != null);

  return (
    <>
      <div className="px-4 py-2 border-b border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 shrink-0">
            Tương tự (tự động)
          </span>
          <button
            type="button"
            onClick={toggleLineChangeAuto}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
              lineChangeAutoEnabled
                ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-200'
                : 'border-slate-300 bg-white/80 text-slate-500 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title={
              lineChangeAutoEnabled
                ? 'Đang BẬT — tự chụp similar mỗi lần đổi line 1_3. Bấm để tắt (tiết kiệm localStorage).'
                : 'Đang TẮT — không tự chụp khi đổi line 1_3. Bấm để bật cho trận này.'
            }
          >
            Line 1_3 {lineChangeAutoEnabled ? 'ON' : 'OFF'}
          </button>
          {catalogNotes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCatalogNotes((v) => !v)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700 bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50"
              title={showCatalogNotes ? 'Ẩn catalog + vạch gần giống' : 'Hiện catalog + vạch gần giống'}
            >
              {showCatalogNotes ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Catalog+vạch ({catalogNotes.length})
            </button>
          )}
          {autoRunning && (
            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {waitingLabels.length > 0 ? waitingLabels.join(' · ') : 'đang chụp…'}
            </span>
          )}
          {snapshots.map((snap) => {
            const hasCatalogRuns = (snap.data?.similarMatchesOpenLineCatalogRuns?.length ?? 0) > 0;
            const isLineChange = snap.trigger === 'ou_line_change';
            const label = formatAutoSimilarLabel(snap);
            const ai = snap.data?.aiEvaluation;
            const aiLean = ai ? aiLeanDisplay(ai.lean) : null;
            const aiRate = ai?.topMatchesLabel30;
            const aiRateHalf = ai?.topMatchesLabelHalf;
            const lineTooltip = isLineChange && snap.lineChange
              ? `Line 1_3: ${snap.lineChange.prevHandicap}→${snap.lineChange.newHandicap}`
              : '';
            return (
            <button
              key={snap.id}
              type="button"
              onClick={() => {
                setChartMatchId(undefined);
                setViewSnap(snap);
              }}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                snap.error
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : isLineChange
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : hasCatalogRuns
                    ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 hover:bg-sky-100 dark:hover:bg-sky-900/50'
                    : 'border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
              }`}
              title={`Xem lại similar ${label} · ${snap.score} · ${formatSnapshotTime(snap.ts)}${lineTooltip ? ` · ${lineTooltip}` : ''}${hasCatalogRuns ? ' · có catalog+vạch gần giống' : ''}`}
            >
              <GitCompare className="w-3 h-3 shrink-0" />
              <span>{label}</span>
              <span className={hasCatalogRuns ? 'text-sky-600 dark:text-sky-400' : 'text-indigo-500 dark:text-indigo-400'}>{snap.score}</span>
              <span className="text-[10px] opacity-75">{snapshotSummary(snap)}</span>
              {hasCatalogRuns && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                  catalog+vạch
                </span>
              )}
              {aiLean && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${aiLean.cls}`}>
                  AI: {aiLean.text}
                  {aiRate && aiRate.total > 0 && (
                    <span className="opacity-80">· {Math.round(aiRate.rate * 100)}% bàn 30&apos;</span>
                  )}
                  {aiRateHalf && aiRateHalf.total > 0 && (
                    <span className="opacity-80">· {Math.round(aiRateHalf.rate * 100)}% hết hiệp</span>
                  )}
                </span>
              )}
              <span className="text-[9px] text-gray-400">{formatSnapshotTime(snap.ts)}</span>
            </button>
            );
          })}
        </div>
        {catalogNotes.length > 0 && showCatalogNotes && (
          <div className="mt-2 space-y-2">
            {catalogNotes.map(({ snap, note }) => (
              <div
                key={`catalog-note-${snap.id}`}
                className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/50 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-[11px] font-bold text-sky-800 dark:text-sky-200">
                    Catalog + thời gian vạch gần giống · {formatAutoSimilarLabel(snap)} · {snap.score}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setChartMatchId(undefined);
                      setViewSnap(snap);
                    }}
                    className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 hover:underline shrink-0"
                  >
                    Xem bảng
                  </button>
                </div>
                {note.pattern && (
                  <p className="text-[10px] text-sky-700/90 dark:text-sky-300/90 mt-0.5">
                    Pattern vạch trận đang xem: <span className="font-mono">{note.pattern}</span>
                  </p>
                )}
                <ul className="mt-1.5 space-y-1">
                  {note.items.map((item, i) => (
                    <li
                      key={`${snap.id}-cr-${i}`}
                      className="text-[10px] leading-snug text-sky-900 dark:text-sky-100 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setChartMatchId(item.matchId);
                          setViewSnap(snap);
                        }}
                        className="font-medium truncate max-w-[14rem] sm:max-w-none text-left hover:underline text-sky-900 dark:text-sky-100"
                        title={`Xem biểu đồ so sánh kèo 1_3 — ${item.team}`}
                      >
                        {item.team}
                      </button>
                      <span className="text-sky-600 dark:text-sky-400">FT {item.ft}</span>
                      {item.lineRunsScore != null && (
                        <span className="font-mono text-sky-700 dark:text-sky-300">Δ{item.lineRunsScore}p</span>
                      )}
                      {item.ou13LineRuns && (
                        <span className="font-mono text-sky-600/80 dark:text-sky-400/80">{item.ou13LineRuns}</span>
                      )}
                      <span
                        className={`font-semibold ${
                          item.label30 === 1
                            ? 'text-red-600 dark:text-red-400'
                            : item.label30 === 0
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-slate-400'
                        }`}
                      >
                        30&apos;: {formatLabel30(item.label30)}
                      </span>
                    </li>
                  ))}
                </ul>
                {note.total > note.items.length && (
                  <p className="text-[9px] text-sky-600/80 dark:text-sky-400/80 mt-1">
                    + {note.total - note.items.length} trận khác trong nhóm catalog+vạch — bấm &quot;Xem bảng&quot; để xem đủ.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 mt-1">
          Tự chạy H1 10&apos; / H2 52&apos;
          {lineChangeAutoEnabled ? ' và mỗi lần đổi line 1_3' : ''} (top 5 + AI). Nút &quot;Tương tự&quot; gọi thủ công (kèm AI) và lưu lại mỗi lần bấm.
        </p>
      </div>
      {viewSnap && (
        <AllSimilarMatchesModal
          input={input}
          current={{
            home: liveMatch.home.name,
            away: liveMatch.away.name,
            score: viewSnap.score,
            half: viewSnap.half,
            minute: viewSnap.minute,
          }}
          queryFeatures={viewSnap.data?.queryFeatures}
          openingLines={viewSnap.data?.openingLines}
          initialData={viewSnap.data}
          initialError={viewSnap.error}
          lineChangeBanner={
            viewSnap.trigger === 'ou_line_change' && viewSnap.lineChange
              ? {
                  half: viewSnap.half,
                  minute: viewSnap.minute,
                  prevHandicap: viewSnap.lineChange.prevHandicap,
                  newHandicap: viewSnap.lineChange.newHandicap,
                }
              : undefined
          }
          persistSnapshot={false}
          initialChartMatchId={chartMatchId}
          onClose={() => {
            setViewSnap(null);
            setChartMatchId(undefined);
          }}
        />
      )}
    </>
  );
};
