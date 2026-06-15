import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Flame, Loader2, AlertCircle, Info, Check, X, Zap } from 'lucide-react';
import type {
  MatchInfo,
  ProcessedStats,
  OverUnderMinuteSnapshot,
  AsianHandicapMinuteSnapshot,
} from '../types';
import type { StoredAlert } from '../types';
import { resolveMatchClockContext, decodeStatTimelineKey, type MatchHalf } from '../services/matchTimeline';
import {
  fetchGoalPrediction,
  fetchGoalReason,
  fetchMatchDetail,
  fetchSimilarMatches,
  appendGoalProbEntry,
  loadPredictionSnapshots,
  appendPredictionSnapshot,
  updatePredictionSnapshotReasons,
  setPredictionSnapshotVerdict,
  setPredictionSnapshotVerdict30,
  autoScoreAllSnapshots,
  isLateGameAutoScoreMinute,
  markPredictionSheetVerdictSynced,
  markPredictionSheetVerdict30Synced,
  markPredictionSheetLogged,
  loadCloudAiEnabled,
  setCloudAiEnabled,
  PREDICTION_SNAPSHOTS_UPDATED_EVENT,
  type PredictGoalResult,
  type PredictGoalInput,
  type SimilarMatchFull,
  type CumulativeTotals,
  type PredictionSnapshot,
  type PredictionVerdict,
  type GoalPredictNotifyPayload,
  type SimilarMatchDetail,
} from '../services/goal-prediction';
import {
  buildGoalPredictionSheetPayload,
  fetchSheetsHealth,
  logGoalPredictionToSheet,
  updateGoalPredictionVerdictOnSheet,
  updateGoalPrediction30VerdictOnSheet,
} from '../services/goal-prediction-sheet-log';
import { Ou13ChartModal, type Ou13ChartBundle } from './Ou13ChartModal';
import { buildSimilarMatchTabUrl, SNAPSHOT_ROWS, INT, ODDS, HCAP } from './SimilarMatchTabPage';

interface GameEvent {
  minute: number;
  half: MatchHalf;
  type: 'goal' | 'corner';
}

interface GoalPredictionBadgeProps {
  liveMatch: MatchInfo;
  statsHistory: Record<number, ProcessedStats>;
  oddsHistory: OverUnderMinuteSnapshot[];
  homeOddsHistory: AsianHandicapMinuteSnapshot[];
  h1OuHistory?: OverUnderMinuteSnapshot[];
  h1AhHistory?: AsianHandicapMinuteSnapshot[];
  gameEvents: GameEvent[];
  alertHistory: StoredAlert[];
  /** Gửi Telegram / hook khác sau predict (tự động hoặc bấm tay). */
  onPredictNotify?: (payload: GoalPredictNotifyPayload) => void;
}

type ReasonColor = 'violet' | 'emerald' | 'sky';

const REASON_CARD_PALETTE: Record<ReasonColor, { wrap: string; label: string; text: string; err: string }> = {
  violet: {
    wrap: 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800',
    label: 'text-violet-700 dark:text-violet-300',
    text: 'text-violet-900 dark:text-violet-100',
    err: 'text-violet-600/70 dark:text-violet-300/70',
  },
  emerald: {
    wrap: 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800',
    label: 'text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-900 dark:text-emerald-100',
    err: 'text-emerald-600/70 dark:text-emerald-300/70',
  },
  sky: {
    wrap: 'bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800',
    label: 'text-sky-700 dark:text-sky-300',
    text: 'text-sky-900 dark:text-sky-100',
    err: 'text-sky-600/70 dark:text-sky-300/70',
  },
};

interface ReasonCardProps {
  label: string;
  color: ReasonColor;
  reason?: {
    reasonVi: string;
    latencyMs: number;
    error?: string;
    source?: 'llm' | 'heuristic_fallback';
    goalProb30Pct?: number | null;
  };
  loading: boolean;
  /** Hiển thị % dự đoán 30' từ LLM. */
  showGoalProb30?: boolean;
}

const ReasonCard: React.FC<ReasonCardProps> = ({ label, color, reason, loading, showGoalProb30 }) => {
  const c = REASON_CARD_PALETTE[color];
  const isFallback = reason?.source === 'heuristic_fallback' || (!!reason?.error && !!reason?.reasonVi);
  const prob30 =
    showGoalProb30 && typeof reason?.goalProb30Pct === 'number' ? reason.goalProb30Pct : null;
  return (
    <div className={`rounded-lg p-2.5 ${c.wrap}`}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${c.label}`}>{label}</span>
          {isFallback && (
            <span
              className="text-[9px] font-medium px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 whitespace-nowrap"
              title="LLM lỗi hoặc timeout — hiển thị nhận định rule-based giống Heuristic"
            >
              Fallback heuristic
            </span>
          )}
        </div>
        {reason?.latencyMs ? (
          <span className={`text-[10px] flex-shrink-0 ${c.err}`}>{reason.latencyMs}ms</span>
        ) : loading ? (
          <Loader2 className={`w-3 h-3 animate-spin flex-shrink-0 ${c.label}`} />
        ) : null}
      </div>
      {prob30 != null && (
        <p className={`text-sm font-bold mb-1 ${c.text}`}>
          Có bàn 30&apos;: {prob30}%
        </p>
      )}
      {reason?.reasonVi ? (
        <>
          <p className={`text-xs leading-snug ${c.text}`}>{reason.reasonVi}</p>
          {reason.error && (
            <p className={`text-[10px] italic mt-1 ${c.err}`} title={reason.error}>
              {reason.error}
            </p>
          )}
        </>
      ) : loading ? (
        <p className={`text-xs italic ${c.err}`}>Đang phân tích…</p>
      ) : reason?.error ? (
        <p className={`text-[11px] italic ${c.err}`}>{reason.error}</p>
      ) : null}
    </div>
  );
};

type SimilarMatchItem = PredictGoalResult['similarMatches'][number];

// Formatter + SNAPSHOT_ROWS dùng chung với trang tab riêng — xem SimilarMatchTabPage.tsx.

/** Popup riêng: chi tiết một tình huống tương tự + so sánh số liệu với trận đang xem. */
const SimilarMatchDetailDialog: React.FC<{
  sim: SimilarMatchItem;
  queryFeatures?: Record<string, number>;
  onClose: () => void;
}> = ({ sim, queryFeatures, onClose }) => {
  const [detail, setDetail] = useState<SimilarMatchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingDetail(true);
    void fetchMatchDetail(sim.matchId).then((d) => {
      if (!alive) return;
      setDetail(d);
      setLoadingDetail(false);
    });
    return () => {
      alive = false;
    };
  }, [sim.matchId]);

  const home = detail?.homeName || sim.home || '';
  const away = detail?.awayName || sim.away || '';
  const teamLine = home && away ? `${home} vs ${away}` : `Match ${sim.matchId}`;
  const ft = detail?.ftStatus || sim.ftStatus || '';
  const past = sim.features;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-t-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{teamLine}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {loadingDetail ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> đang tải thông tin trận…
                  </span>
                ) : (
                  <>
                    {detail?.league && <span>{detail.league}</span>}
                    {detail?.finalScore && <span> · CK {detail.finalScore}</span>}
                    {ft && <span> · {ft}</span>}
                    <span className="block sm:inline"> · Match {sim.matchId}</span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none flex-shrink-0">✕</button>
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              H{sim.half} · phút {sim.minute}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${sim.label === 1 ? 'bg-red-500 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-100'}`}>
              {sim.label === 1 ? '15p sau: CÓ BÀN' : '15p sau: không có bàn'}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                sim.label30 == null
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  : sim.label30 === 1
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-100'
              }`}
            >
              {sim.label30 == null ? '30p sau: chưa rõ' : sim.label30 === 1 ? '30p sau: CÓ BÀN' : '30p sau: không có bàn'}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">độ giống {sim.similarity.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-4">
          {past ? (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Chỉ số</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-right">Tình huống QK</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-orange-500 text-right">Trận đang xem</div>
                {SNAPSHOT_ROWS.map((row) => {
                  const pv = past[row.key];
                  const qv = queryFeatures?.[row.key];
                  if (pv == null && qv == null) return null;
                  const diff = typeof pv === 'number' && typeof qv === 'number' ? qv - pv : null;
                  return (
                    <React.Fragment key={row.key}>
                      <div className="text-gray-600 dark:text-gray-300 py-0.5">{row.label}</div>
                      <div className="text-right font-mono text-gray-800 dark:text-gray-200 py-0.5">
                        {typeof pv === 'number' ? row.fmt(pv) : '—'}
                      </div>
                      <div className="text-right font-mono py-0.5 text-gray-900 dark:text-gray-100">
                        {typeof qv === 'number' ? row.fmt(qv) : '—'}
                        {diff != null && Math.abs(diff) >= 0.005 && (
                          <span className={`ml-1 text-[10px] ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            ({diff > 0 ? '+' : ''}{row.fmt(diff)})
                          </span>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 leading-snug">
                Cột "Tình huống QK" là số liệu của trận tương tự tại đúng phút {sim.minute}; cột "Trận đang xem" là số liệu hiện tại của bạn. Chênh lệch trong ngoặc = trận đang xem so với quá khứ.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Không có snapshot số liệu cho tình huống này (server có thể chưa nạp dataset đầy đủ).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Các hàng feature (đọc từ feature record) trong bảng so sánh dạng cột của modal. */
const MODAL_METRIC_ROWS: Array<{ key: string; label: string; fmt: (v: number) => string }> = [
  { key: 'ou13_handicap', label: 'Vạch Tài/Xỉu', fmt: HCAP },
  { key: 'ou13_over_odds', label: 'Odds Tài', fmt: ODDS },
  { key: 'ou13_under_odds', label: 'Odds Xỉu', fmt: ODDS },
  { key: 'ah12_handicap', label: 'Vạch chấp', fmt: HCAP },
  { key: 'ah12_home_odds', label: 'Odds chủ', fmt: ODDS },
  { key: 'ah12_away_odds', label: 'Odds khách', fmt: ODDS },
  { key: 'total_goals_so_far', label: 'Tổng bàn đã ghi', fmt: INT },
];

/** Các hàng TỔNG LŨY KẾ (từ đầu trận đến phút tương tự) — đọc từ column.totals. */
const MODAL_TOTALS_ROWS: Array<{ key: keyof CumulativeTotals; label: string }> = [
  { key: 'da', label: 'Tổng tình huống DA' },
  { key: 'shots', label: 'Tổng sút' },
  { key: 'onTarget', label: 'Tổng sút trúng đích' },
  { key: 'corners', label: 'Tổng phạt góc' },
];

/** Dedupe theo matchId — giữ lần xuất hiện đầu (thứ tự server). */
function dedupeByMatchId<T extends { matchId: string | number }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((m) => {
    const id = String(m.matchId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Cách cũ trên modal: ưu tiên phút gần trận đang xem, rồi sim (client, như trước). */
function sortLegacyForDisplay<T extends { matchId: string | number; minute: number; similarity: number }>(
  rows: T[],
  curMin: number | null,
): T[] {
  return [...rows].sort((a, b) => {
    if (curMin != null) {
      const da = Math.abs(a.minute - curMin);
      const db = Math.abs(b.minute - curMin);
      if (da !== db) return da - db;
    }
    return b.similarity - a.similarity;
  });
}

function toComparisonColumns(
  matches: SimilarMatchFull[],
  prefix: 'legacy' | 'open',
): ComparisonColumn[] {
  return matches.map((s, i) => ({
    key: `${prefix}-${s.matchId}-${i}`,
    isCurrent: false,
    rankGroup: prefix,
    matchId: String(s.matchId),
    team: s.home && s.away ? `${s.home} vs ${s.away}` : `Match ${s.matchId}`,
    ft: s.finalScore || '—',
    half: s.half,
    minute: s.minute,
    label: s.label,
    label30: s.label30,
    similarity: s.similarity,
    feats: s.features,
    totals: s.totals,
    prob30: s.prob30,
  }));
}

/** 1 cột trong bảng so sánh = 1 trận (trận đang xem hoặc 1 tình huống tương tự). */
interface ComparisonColumn {
  key: string;
  isCurrent: boolean;
  /** Nhóm xếp hạng — hiển thị 2 block cột trên bảng modal. */
  rankGroup?: 'legacy' | 'open';
  /** matchId của trận tương tự (current: undefined) — để fetch biểu đồ odds 1_3. */
  matchId?: string;
  team: string;
  ft: string;
  half?: number;
  minute?: number;
  /** Kết cục 15': 1 = có bàn, 0 = không. (current: undefined) */
  label?: 0 | 1;
  /** Kết cục 30': 1 = có bàn, 0 = không, null/undefined = chưa rõ. (current: undefined) */
  label30?: 0 | 1;
  similarity?: number;
  feats?: Record<string, number>;
  /** Tổng lũy kế từ đầu trận đến phút này (DA/sút/trúng đích/phạt góc). */
  totals?: CumulativeTotals | null;
  /** Xác suất có bàn 30' theo model chính tại phút này (null = không có). */
  prob30?: number | null;
}

const fmtCell = (feats: Record<string, number> | undefined, key: string, fmt: (v: number) => string): string => {
  const v = feats?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? fmt(v) : '—';
};

/** Nền cột tình huống tương tự theo kết cục 30' (Đỏ = có bàn, Xám = không). */
const colTint = (label30: 0 | 1 | undefined): string => {
  if (label30 === 1) return 'bg-red-50 dark:bg-red-900/20';
  if (label30 === 0) return 'bg-slate-50 dark:bg-slate-800/30';
  return 'bg-slate-50/40 dark:bg-slate-800/10';
};
/** Nền ô header (tên đội) — đậm hơn để nhìn nhanh có bàn / không. */
const headTint = (label30: 0 | 1 | undefined): string => {
  if (label30 === 1) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200';
  if (label30 === 0) return 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200';
  return 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500';
};

/** H1 gồm bù giờ (>45' vẫn H1) — chỉ suy ra từ phút khi snapshot cũ thiếu half. */
const halfFromMinute = (half: 1 | 2 | undefined, minute: number): 1 | 2 =>
  half === 2 ? 2 : half === 1 ? 1 : minute >= 46 ? 2 : 1;

/** Dữ liệu local của TRẬN ĐANG XEM → bundle vẽ MomentumChart trong Ou13ChartModal (không gọi server). */
export function buildLocalChartBundle(input: PredictGoalInput): Ou13ChartBundle {
  // Dedup chuông theo (hiệp, phút) — giữ bản mới nhất, giống chartAlertMarkers của Dashboard.
  const byKey = new Map<string, StoredAlert>();
  input.alertHistory.forEach((a) => {
    const k = `${a.half ?? 1}-${a.minute}`;
    const prev = byKey.get(k);
    if (!prev || a.timestamp > prev.timestamp) byKey.set(k, a);
  });
  return {
    odds13: input.oddsHistory
      .filter((o) => o.marketId === '1_3')
      .map((o) => ({
        minute: o.minute,
        half: halfFromMinute(o.half, o.minute),
        handicap: o.handicap,
        over: o.over,
        under: o.under,
      })),
    odds12: input.homeOddsHistory
      .filter((o) => o.marketId === '1_2')
      .map((o) => ({
        minute: o.minute,
        half: halfFromMinute(o.half, o.minute),
        handicap: o.handicap,
        home: o.home,
        away: o.away,
      })),
    stats: Object.keys(input.statsHistory)
      .map(Number)
      .map((k) => {
        const { half, minute } = decodeStatTimelineKey(k);
        const s = input.statsHistory[k];
        return {
          minute,
          half: (half === 2 ? 2 : 1) as 1 | 2,
          attacks: s.attacks,
          dangerous: s.dangerous_attacks,
          onTarget: s.on_target,
          offTarget: s.off_target,
          corners: s.corners,
        };
      }),
    events: input.gameEvents.map((e) => ({
      minute: e.minute,
      half: (e.half === 2 ? 2 : 1) as 1 | 2,
      type: e.type,
    })),
    alertMarkers: Array.from(byKey.values())
      .filter((a) => typeof a.minute === 'number' && Number.isFinite(a.minute) && a.minute >= 0 && a.minute <= 130)
      .sort((x, y) => (x.half ?? 1) - (y.half ?? 1) || x.minute - y.minute)
      .map((a) => ({
        id: String(a.id ?? `${a.half ?? 1}-${a.minute}-${a.timestamp}`),
        minute: Math.round(a.minute),
        half: a.half ?? 1,
        type: a.type,
        title: a.title ?? '',
        pressureLevel: a.pressureLevel,
      })),
  };
}

/** Modal "Xem tất cả tình huống tương tự" — bảng so sánh dạng cột. */
export const AllSimilarMatchesModal: React.FC<{
  input: PredictGoalInput;
  current: { home: string; away: string; score: string; half?: number; minute?: number };
  queryFeatures?: Record<string, number>;
  openingLines?: import('../services/goal-prediction').OpeningLinesRef;
  /** Xác suất 30' của trận đang xem (hiển thị ở cột "Trận hiện tại"). */
  currentProb30?: number | null;
  onClose: () => void;
}> = ({ input, current, queryFeatures, openingLines: openingLinesProp, currentProb30, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchesLegacy, setMatchesLegacy] = useState<SimilarMatchFull[]>([]);
  const [matchesOpenLine, setMatchesOpenLine] = useState<SimilarMatchFull[]>([]);
  const [qFeats, setQFeats] = useState<Record<string, number> | undefined>(queryFeatures);
  const [openingLines, setOpeningLines] = useState(openingLinesProp);
  const [currentTotals, setCurrentTotals] = useState<CumulativeTotals | null>(null);
  /** Cột đang mở biểu đồ odds Tài/Xỉu 1_3 (null = đóng). */
  const [chartCol, setChartCol] = useState<ComparisonColumn | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    void fetchSimilarMatches(input, 20, ctrl.signal, queryFeatures).then((r) => {
      if (ctrl.signal.aborted) return;
      if (r.ok === false) {
        setError(r.error);
      } else {
        const curMin =
          current.minute ??
          (typeof r.data.queryFeatures?.minute === 'number'
            ? r.data.queryFeatures.minute
            : typeof queryFeatures?.minute === 'number'
              ? queryFeatures.minute
              : null);
        const legacy = dedupeByMatchId(sortLegacyForDisplay(r.data.similarMatches, curMin));
        const openLine = dedupeByMatchId(r.data.similarMatchesOpenLine ?? []);
        setMatchesLegacy(legacy);
        setMatchesOpenLine(openLine);
        if (r.data.queryFeatures) setQFeats(r.data.queryFeatures);
        if (r.data.openingLines) setOpeningLines(r.data.openingLines);
        setCurrentTotals(r.data.currentTotals ?? null);
      }
      setLoading(false);
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCol: ComparisonColumn = {
    key: 'current',
    isCurrent: true,
    team: current.home && current.away ? `${current.home} vs ${current.away}` : 'Trận đang xem',
    ft: current.score || '—',
    half: current.half ?? (typeof qFeats?.half === 'number' ? qFeats.half : undefined),
    minute: current.minute ?? (typeof qFeats?.minute === 'number' ? qFeats.minute : undefined),
    feats: qFeats,
    totals: currentTotals,
    prob30: currentProb30,
  };
  const simColsLegacy = toComparisonColumns(matchesLegacy, 'legacy');
  const simColsOpenLine = toComparisonColumns(matchesOpenLine, 'open');
  const hasAnySim = simColsLegacy.length > 0 || simColsOpenLine.length > 0;

  const simHeadClass = (c: ComparisonColumn, firstInGroup: boolean) => {
    const base = `sticky top-0 z-20 w-28 min-w-[7rem] border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-center font-semibold ${headTint(c.label30)}`;
    if (c.rankGroup === 'open' && firstInGroup) {
      return `${base} border-l-2 border-l-indigo-400 dark:border-l-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40`;
    }
    return base;
  };
  const simCellClass = (c: ComparisonColumn, firstInGroup: boolean) => {
    const base = `${simCell} ${colTint(c.label30)}`;
    if (c.rankGroup === 'open' && firstInGroup) {
      return `${base} border-l-2 border-l-indigo-400 dark:border-l-indigo-500`;
    }
    return base;
  };

  // Danh sách cột để chuyển nhanh qua lại trong modal biểu đồ (trận đang xem + cả 2 nhóm).
  const chartNavCols: ComparisonColumn[] = [currentCol, ...simColsLegacy, ...simColsOpenLine];
  const renderSimTds = (render: (c: ComparisonColumn, cls: string) => React.ReactNode) => (
    <>
      {simColsLegacy.map((c) => render(c, simCellClass(c, false)))}
      {simColsOpenLine.map((c, i) => render(c, simCellClass(c, i === 0)))}
    </>
  );
  const chartNavIdx = chartCol ? chartNavCols.findIndex((c) => c.key === chartCol.key) : -1;
  const gotoChart = (dir: -1 | 1) => {
    if (chartNavIdx < 0) return;
    const n = chartNavCols.length;
    setChartCol(chartNavCols[(chartNavIdx + dir + n) % n]);
  };

  // Lớp sticky dùng chung cho 2 cột trái (nhãn + trận đang xem).
  const labelCell = 'sticky left-0 z-10 w-36 min-w-[9rem] bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 px-2 py-1 text-left text-gray-600 dark:text-gray-300';
  const curCell = 'sticky left-36 z-10 w-28 min-w-[7rem] bg-orange-50 dark:bg-orange-900/20 border-b border-r-2 border-orange-400 px-2 py-1 text-center font-mono text-gray-900 dark:text-gray-100';
  const simCell = 'w-28 min-w-[7rem] border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-center font-mono text-gray-800 dark:text-gray-200';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full sm:max-w-5xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-t-xl flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white">Tất cả tình huống tương tự</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span>Cột trái: cách cũ (vạch snapshot + sim) · cột phải: cách mới (vạch mở hiệp) · kéo ngang</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-800 inline-block" /> CÓ BÀN</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-600 inline-block" /> không</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800 inline-block" /> chưa rõ</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none flex-shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải tình huống tương tự…
            </div>
          ) : error ? (
            <div className="m-2 text-xs leading-snug px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          ) : !hasAnySim ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Không tìm thấy tình huống tương tự (server có thể chưa nạp dataset).</div>
          ) : (
            <table className="border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th rowSpan={2} className={`${labelCell} sticky top-0 z-30 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 align-middle`}>Chỉ số</th>
                  <th rowSpan={2} className="sticky left-36 top-0 z-30 w-28 min-w-[7rem] bg-orange-100 dark:bg-orange-900/40 border-b border-r-2 border-orange-400 px-2 py-1 text-center text-orange-700 dark:text-orange-200 font-semibold align-middle">
                    <div className="truncate" title={currentCol.team}>{currentCol.team}</div>
                    <div className="text-[10px] font-normal">đang xem</div>
                  </th>
                  {simColsLegacy.length > 0 && (
                    <th
                      colSpan={simColsLegacy.length}
                      className="sticky top-0 z-25 border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80"
                    >
                      Cách cũ · vạch T/X + chấp tại phút
                    </th>
                  )}
                  {simColsOpenLine.length > 0 && (
                    <th
                      colSpan={simColsOpenLine.length}
                      className="sticky top-0 z-25 border-b border-l-2 border-l-indigo-400 dark:border-l-indigo-500 border-slate-200 dark:border-slate-700 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50"
                    >
                      Cách mới · vạch mở hiệp 1_3
                      {openingLines && (openingLines.h1OpenOu13 != null || openingLines.h2OpenOu13 != null) && (
                        <span className="block font-normal normal-case tracking-normal text-indigo-600/90 dark:text-indigo-400/90 mt-0.5">
                          H1 mở {openingLines.h1OpenOu13 != null ? HCAP(openingLines.h1OpenOu13) : '—'}
                          {' · H2 mở '}
                          {openingLines.h2OpenOu13 != null ? HCAP(openingLines.h2OpenOu13) : '—'}
                        </span>
                      )}
                    </th>
                  )}
                </tr>
                <tr>
                  {simColsLegacy.map((c) => (
                    <th key={c.key} className={simHeadClass(c, false)}>
                      <div className="truncate" title={c.team}>{c.team}</div>
                      <div className="text-[10px] font-normal">30': {c.label30 == null ? 'chưa rõ' : c.label30 === 1 ? 'CÓ BÀN' : 'không'}</div>
                    </th>
                  ))}
                  {simColsOpenLine.map((c, i) => (
                    <th key={c.key} className={simHeadClass(c, i === 0)}>
                      <div className="truncate" title={c.team}>{c.team}</div>
                      <div className="text-[10px] font-normal">30': {c.label30 == null ? 'chưa rõ' : c.label30 === 1 ? 'CÓ BÀN' : 'không'}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={labelCell}>Tỷ số FT</td>
                  <td className={curCell}>{currentCol.ft}<div className="text-[9px] text-orange-500 font-sans">đang đá</div></td>
                  {renderSimTds((c, cls) => <td key={c.key} className={cls}>{c.ft}</td>)}
                </tr>
                <tr>
                  <td className={labelCell}>Hiệp / phút</td>
                  <td className={curCell}>{currentCol.half != null ? `H${currentCol.half} · ${currentCol.minute ?? '—'}'` : '—'}</td>
                  {renderSimTds((c, cls) => <td key={c.key} className={cls}>H{c.half} · {c.minute}'</td>)}
                </tr>
                <tr>
                  <td className={labelCell}>Kèo Tài 1_3</td>
                  <td className={curCell}>
                    <button
                      onClick={() => setChartCol(currentCol)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-sans"
                      title="Xem biểu đồ odds Tài/Xỉu cả trận (1_3)"
                    >
                      📈 Xem
                    </button>
                  </td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={cls}>
                      {c.matchId ? (
                        <button
                          onClick={() => setChartCol(c)}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-sans"
                          title="Xem biểu đồ odds Tài/Xỉu cả trận (1_3)"
                        >
                          📈 Xem
                        </button>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={labelCell}>Kết cục 15'</td>
                  <td className={curCell}>—</td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={`${cls} font-semibold ${c.label === 1 ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {c.label == null ? '—' : c.label === 1 ? 'CÓ BÀN' : 'không'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={labelCell}>Độ giống (sim)</td>
                  <td className={curCell}>—</td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={`${cls} font-semibold`}>{c.similarity != null ? c.similarity.toFixed(2) : '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className={`${labelCell} text-indigo-600 dark:text-indigo-400 font-medium`}>% Xác suất 30' (chính)</td>
                  <td className={`${curCell} font-semibold`}>{currentCol.prob30 != null ? `${(currentCol.prob30 * 100).toFixed(0)}%` : '—'}</td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={`${cls} font-semibold`}>
                      {c.prob30 != null ? `${(c.prob30 * 100).toFixed(0)}%` : '—'}
                    </td>
                  ))}
                </tr>
                {MODAL_METRIC_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td className={labelCell}>{row.label}</td>
                    <td className={curCell}>{fmtCell(currentCol.feats, row.key, row.fmt)}</td>
                    {renderSimTds((c, cls) => <td key={c.key} className={cls}>{fmtCell(c.feats, row.key, row.fmt)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td className={`${labelCell} text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500`}>Tổng từ đầu trận</td>
                  <td className={`${curCell} bg-orange-100/60 dark:bg-orange-900/30`}></td>
                  {renderSimTds((c, cls) => <td key={c.key} className={cls}></td>)}
                </tr>
                {MODAL_TOTALS_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td className={labelCell}>{row.label}</td>
                    <td className={curCell}>{currentCol.totals ? INT(currentCol.totals[row.key]) : '—'}</td>
                    {renderSimTds((c, cls) => (
                      <td key={c.key} className={cls}>{c.totals ? INT(c.totals[row.key]) : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {chartCol && (
        <Ou13ChartModal
          // Remount khi đổi trận để Ou13ChartContent nạp lại bundle (tránh giữ dữ liệu trận cũ).
          key={chartCol.key}
          matchId={chartCol.isCurrent ? undefined : chartCol.matchId}
          local={chartCol.isCurrent ? buildLocalChartBundle(input) : undefined}
          // Khi xem 1 trận tương tự: kèm thêm biểu đồ trận đang xem để so sánh xen kẽ theo hiệp.
          compareLocal={chartCol.isCurrent ? undefined : buildLocalChartBundle(input)}
          compareMarker={
            !chartCol.isCurrent && currentCol.half != null && currentCol.minute != null
              ? { half: (currentCol.half === 2 ? 2 : 1) as 1 | 2, minute: currentCol.minute }
              : undefined
          }
          primaryLabel={chartCol.isCurrent ? undefined : 'Trận tương tự'}
          compareLabel={chartCol.isCurrent ? undefined : `Trận đang xem · ${currentCol.team}`}
          title={chartCol.team}
          subtitle={`FT ${chartCol.ft}${chartCol.half != null ? ` · tình huống H${chartCol.half} · ${chartCol.minute ?? '—'}'` : ''}`}
          openHref={
            !chartCol.isCurrent && chartCol.matchId
              ? buildSimilarMatchTabUrl({
                  matchId: chartCol.matchId,
                  half: chartCol.half === 2 ? 2 : chartCol.half === 1 ? 1 : undefined,
                  minute: chartCol.minute,
                  team: chartCol.team,
                  ft: chartCol.ft,
                  label: chartCol.label,
                  label30: chartCol.label30,
                  similarity: chartCol.similarity,
                  feats: chartCol.feats,
                  queryFeats: qFeats,
                  openingLines,
                })
              : undefined
          }
          marker={
            chartCol.half != null && chartCol.minute != null
              ? { half: (chartCol.half === 2 ? 2 : 1) as 1 | 2, minute: chartCol.minute }
              : undefined
          }
          pin={
            !chartCol.isCurrent && chartCol.matchId
              ? {
                  matchId: chartCol.matchId,
                  sourceMatchId: input.matchId,
                  team: chartCol.team,
                  ft: chartCol.ft,
                  half: chartCol.half === 2 ? 2 : chartCol.half === 1 ? 1 : undefined,
                  minute: chartCol.minute,
                  label: chartCol.label,
                  label30: chartCol.label30,
                  similarity: chartCol.similarity,
                  feats: chartCol.feats,
                  pinnedAt: 0,
                }
              : undefined
          }
          onPrev={chartNavCols.length > 1 ? () => gotoChart(-1) : undefined}
          onNext={chartNavCols.length > 1 ? () => gotoChart(1) : undefined}
          navPosition={chartNavIdx >= 0 ? { index: chartNavIdx, total: chartNavCols.length } : undefined}
          onClose={() => setChartCol(null)}
        />
      )}
    </div>
  );
};

type DisplayThresholds = { warn: number; high: number; extreme: number };

function probColor(prob: number, t?: DisplayThresholds | null): string {
  // Ngưỡng màu ưu tiên lấy từ phân bố output THẬT của model (meta.displayThresholds);
  // fallback ngưỡng cũ nếu meta chưa có. Tránh hiển thị đỏ/cam mà model không bao giờ chạm tới.
  const warn = t?.warn ?? 0.5;
  const high = t?.high ?? 0.75;
  const extreme = t?.extreme ?? 0.85;
  if (prob >= extreme) return 'bg-red-600 text-white';
  if (prob >= high) return 'bg-orange-500 text-white';
  if (prob >= warn) return 'bg-yellow-400 text-gray-900';
  return 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200';
}

/** Mốc phút tự gọi predict-goal: H1 = 5/15/25/35/45, H2 = 50/60/70/80/90. */
const AUTO_PREDICT_MARKS = [5, 15, 25, 35, 45, 50, 60, 70, 80, 90] as const;

function probColor5(prob: number, t?: DisplayThresholds | null): string {
  const warn = t?.warn ?? 0.2;
  const high = t?.high ?? 0.3;
  const extreme = t?.extreme ?? 0.4;
  if (prob >= extreme) return 'text-red-600 dark:text-red-400';
  if (prob >= high) return 'text-orange-600 dark:text-orange-400';
  if (prob >= warn) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-500 dark:text-gray-400';
}

export const GoalPredictionBadge: React.FC<GoalPredictionBadgeProps> = ({
  liveMatch,
  statsHistory,
  oddsHistory,
  homeOddsHistory,
  h1OuHistory,
  h1AhHistory,
  gameEvents,
  alertHistory,
  onPredictNotify,
}) => {
  const [result, setResult] = useState<PredictGoalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetWarning, setSheetWarning] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const sheetsEnabledRef = useRef<boolean | null>(null);
  const inFlightRef = useRef(false);
  /** Mốc cao nhất đã auto-predict trong trận hiện tại — tránh gọi trùng. */
  const lastAutoMarkRef = useRef<number | null>(null);
  const [snapshots, setSnapshots] = useState<PredictionSnapshot[]>(() =>
    loadPredictionSnapshots(liveMatch.id),
  );
  /** ID của snapshot đang hiển thị; null = đang xem prediction mới nhất (`result`). */
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  /** Tình huống tương tự đang mở popup "Chi tiết"; null = không mở. */
  const [detailSim, setDetailSim] = useState<SimilarMatchItem | null>(null);
  /** Mở modal "Xem tất cả tình huống tương tự". */
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  /** Bật GPT + DeepSeek (Cloud AI, tốn token) cho trận này. Mặc định tắt → chỉ Ollama local. */
  const [cloudAiEnabled, setCloudAiEnabledState] = useState<boolean>(() =>
    loadCloudAiEnabled(liveMatch.id),
  );

  const liveMatchRef = useRef(liveMatch);
  liveMatchRef.current = liveMatch;

  useEffect(() => {
    void fetchSheetsHealth().then((h) => {
      sheetsEnabledRef.current = h.enabled;
      if (!h.enabled) {
        setSheetWarning(
          h.hint
            ? `Google Sheets tắt: ${h.hint}`
            : 'Google Sheets chưa bật trên server — kiểm tra server/.env và restart `npm run dev` trong server/.',
        );
      } else {
        setSheetWarning(null);
      }
    });
  }, []);

  const syncPredictionToSheet = useCallback(
    async (snapshot: PredictionSnapshot): Promise<boolean> => {
      if (snapshot.sheetLogged) return true;
      if (sheetsEnabledRef.current === false) return false;
      const payload = buildGoalPredictionSheetPayload(liveMatchRef.current, {
        predictionId: snapshot.id,
        half: snapshot.half,
        minute: snapshot.minute,
        result: snapshot.result,
        ts: snapshot.ts,
      });
      const r = await logGoalPredictionToSheet(payload);
      if (r.ok === false) {
        setSheetWarning(`Không ghi được Google Sheet: ${r.error}`);
        return false;
      }
      markPredictionSheetLogged(liveMatchRef.current.id, snapshot.id);
      setSheetWarning(null);
      return true;
    },
    [],
  );

  const syncAllUnloggedPredictions = useCallback(
    async (list: PredictionSnapshot[]) => {
      const pending = list.filter((s) => !s.sheetLogged);
      for (const s of pending) {
        await syncPredictionToSheet(s);
      }
    },
    [syncPredictionToSheet],
  );

  const syncSnapshotVerdictToSheet = useCallback(async (snapshot: PredictionSnapshot) => {
    const has15 = !!snapshot.verdict && !snapshot.sheetVerdictSynced;
    const has30 = !!snapshot.verdict30 && !snapshot.sheetVerdict30Synced;
    if (!has15 && !has30) return;
    if (!snapshot.sheetLogged) {
      await syncPredictionToSheet(snapshot);
    }
    let touched = false;
    let failed = false;

    if (has15 && snapshot.verdict) {
      const prob15 = snapshot.result.goalProb15 ?? snapshot.result.goalProb;
      const prob15Pct = typeof prob15 === 'number' ? Math.round(prob15 * 100) : undefined;
      const duDoan15 =
        typeof prob15 === 'number' ? (prob15 >= 0.5 ? 'cao' as const : 'thap' as const) : undefined;
      const ok = await updateGoalPredictionVerdictOnSheet(snapshot.id, snapshot.verdict, {
        verdictAuto: snapshot.verdictAuto === true,
        prob15Pct,
        duDoan15,
      });
      if (ok) {
        markPredictionSheetVerdictSynced(liveMatchRef.current.id, snapshot.id);
        touched = true;
      } else {
        failed = true;
      }
    }

    if (has30 && snapshot.verdict30) {
      const prob30 = snapshot.result.goalProb30;
      const prob30Pct = typeof prob30 === 'number' ? Math.round(prob30 * 100) : undefined;
      const duDoan30 =
        typeof prob30 === 'number' ? (prob30 >= 0.5 ? 'cao' as const : 'thap' as const) : undefined;
      const ok = await updateGoalPrediction30VerdictOnSheet(snapshot.id, snapshot.verdict30, {
        verdictAuto: snapshot.verdict30Auto === true,
        prob30Pct,
        duDoan30,
      });
      if (ok) {
        markPredictionSheetVerdict30Synced(liveMatchRef.current.id, snapshot.id);
        touched = true;
      } else {
        failed = true;
      }
    }

    if (touched) {
      setSnapshots(loadPredictionSnapshots(liveMatchRef.current.id));
    }
    if (failed) {
      setSheetWarning('Không cập nhật được kết quả lên Google Sheet (thiếu dòng hoặc server Sheets tắt).');
    } else if (touched) {
      setSheetWarning(null);
    }
  }, [syncPredictionToSheet]);

  const syncAllUnsyncedVerdicts = useCallback(async (list: PredictionSnapshot[]) => {
    const pending = list.filter(
      (s) => (s.verdict && !s.sheetVerdictSynced) || (s.verdict30 && !s.sheetVerdict30Synced),
    );
    for (const s of pending) {
      await syncSnapshotVerdictToSheet(s);
    }
  }, [syncSnapshotVerdictToSheet]);

  const statsKeyStrings = useMemo(() => Object.keys(statsHistory), [statsHistory]);
  const oddsHalfSnapshots = useMemo(
    () => [
      ...oddsHistory.map((o) => ({ minute: o.minute, half: o.half })),
      ...(h1OuHistory ?? []).map((o) => ({ minute: o.minute, half: o.half })),
    ],
    [oddsHistory, h1OuHistory],
  );

  const runAutoScore = useCallback(() => {
    const m = Number(liveMatch.timer?.tm ?? parseInt(String(liveMatch.time ?? '0'), 10) ?? 0);
    if (!Number.isFinite(m)) return;
    const ctx = resolveMatchClockContext(
      liveMatch.timer,
      m,
      oddsHalfSnapshots,
      statsKeyStrings,
    );
    const eventsForScore = gameEvents.map((e) => {
      let half: 1 | 2 =
        e.half === 1 || e.half === 2 ? e.half : e.minute >= 45 ? 2 : 1;
      if (e.type === 'goal' && half === 1 && e.minute >= 50) half = 2;
      return { minute: e.minute, half, type: e.type };
    });
    const changed = autoScoreAllSnapshots(liveMatch.id, eventsForScore, ctx);
    if (changed > 0) {
      const updated = loadPredictionSnapshots(liveMatch.id);
      setSnapshots(updated);
      void syncAllUnsyncedVerdicts(updated);
    }
  }, [
    liveMatch.id,
    liveMatch.timer,
    liveMatch.time,
    gameEvents,
    oddsHalfSnapshots,
    statsKeyStrings,
    syncAllUnsyncedVerdicts,
  ]);

  // Reload snapshots khi đổi trận hoặc khi tab khác cập nhật.
  useEffect(() => {
    const list = loadPredictionSnapshots(liveMatch.id);
    setSnapshots(list);
    setActiveSnapshotId(null);
    lastAutoMarkRef.current = null;
    void (async () => {
      await syncAllUnloggedPredictions(list);
      await syncAllUnsyncedVerdicts(loadPredictionSnapshots(liveMatch.id));
    })();
  }, [liveMatch.id, syncAllUnsyncedVerdicts, syncAllUnloggedPredictions]);

  // Auto-score verdict khi clock / sự kiện / FT đổi (snapshots p80+ chờ FT).
  useEffect(() => {
    runAutoScore();
  }, [runAutoScore]);

  useEffect(() => {
    function handler(ev: Event) {
      const detail = (ev as CustomEvent<{ matchId: string }>).detail;
      if (detail?.matchId === liveMatch.id) {
        setSnapshots(loadPredictionSnapshots(liveMatch.id));
      }
    }
    window.addEventListener(PREDICTION_SNAPSHOTS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PREDICTION_SNAPSHOTS_UPDATED_EVENT, handler);
  }, [liveMatch.id]);

  // Ref holds latest props — refresh() đọc từ ref nên giữ identity ổn định
  // (effect chỉ re-fire khi shouldPoll/pollIntervalMs đổi).
  const propsRef = useRef({
    liveMatch,
    statsHistory,
    oddsHistory,
    homeOddsHistory,
    h1OuHistory,
    h1AhHistory,
    gameEvents,
    alertHistory,
  });
  propsRef.current = {
    liveMatch,
    statsHistory,
    oddsHistory,
    homeOddsHistory,
    h1OuHistory,
    h1AhHistory,
    gameEvents,
    alertHistory,
  };

  /** AbortController cho /reason async — abort khi user predict lại hoặc unmount. */
  const reasonAbortRef = useRef<AbortController | null>(null);
  const onPredictNotifyRef = useRef(onPredictNotify);
  onPredictNotifyRef.current = onPredictNotify;
  const [reasonsLoading, setReasonsLoading] = useState(false);
  /** Ref giữ trạng thái Cloud AI mới nhất — handlePredict (deps []) đọc từ đây. */
  const cloudAiEnabledRef = useRef(cloudAiEnabled);
  cloudAiEnabledRef.current = cloudAiEnabled;

  // Đổi trận → nạp lại trạng thái Cloud AI của trận mới.
  useEffect(() => {
    setCloudAiEnabledState(loadCloudAiEnabled(liveMatch.id));
  }, [liveMatch.id]);

  /** Bật/tắt Cloud AI cho trận hiện tại và lưu localStorage. */
  const toggleCloudAi = useCallback(() => {
    setCloudAiEnabledState((prev) => {
      const next = !prev;
      setCloudAiEnabled(liveMatch.id, next);
      return next;
    });
  }, [liveMatch.id]);

  // Hủy reason request khi unmount hoặc đổi trận.
  useEffect(() => {
    return () => {
      reasonAbortRef.current?.abort();
    };
  }, [liveMatch.id]);

  /** Dựng PredictGoalInput từ props mới nhất — dùng chung cho handlePredict & modal. */
  const buildPredictInput = useCallback((): PredictGoalInput => {
    const p = propsRef.current;
    return {
      matchId: p.liveMatch.id,
      liveMatch: p.liveMatch,
      statsHistory: p.statsHistory,
      oddsHistory: p.oddsHistory,
      homeOddsHistory: p.homeOddsHistory,
      h1OuHistory: p.h1OuHistory,
      h1AhHistory: p.h1AhHistory,
      gameEvents: p.gameEvents,
      alertHistory: p.alertHistory,
    };
  }, []);

  const handlePredict = useCallback(async (opts: { force?: boolean } = {}): Promise<boolean> => {
    if (inFlightRef.current) return false;

    const p = propsRef.current;
    const clockMin = Number(p.liveMatch.timer?.tm ?? parseInt(String(p.liveMatch.time ?? '0'), 10) ?? 0);
    if (!Number.isFinite(clockMin) || clockMin < 5) {
      setError('Cần qua phút 5 mới dự đoán được');
      return false;
    }
    const oddsSnaps = [
      ...p.oddsHistory.map((o) => ({ minute: o.minute, half: o.half })),
      ...(p.h1OuHistory ?? []).map((o) => ({ minute: o.minute, half: o.half })),
    ];
    const { half: halfNow, minute: m } = resolveMatchClockContext(
      p.liveMatch.timer,
      clockMin,
      oddsSnaps,
      Object.keys(p.statsHistory),
    );
    const hasStatsForHalf = Object.keys(p.statsHistory).some((k) => {
      const key = Number(k);
      return halfNow === 2 ? key >= 512 : key < 512;
    });
    if (!hasStatsForHalf) {
      setError(`Chưa có stats cho hiệp ${halfNow}`);
      return false;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    const input = buildPredictInput();
    const ts = Date.now();
    const predictionId = `${halfNow}-${m}-${ts}`;
    const sheetLogMeta = {
      predictionId,
      giaiDau: p.liveMatch.league?.name || 'N/A',
      doiNha: p.liveMatch.home?.name || 'Home',
      doiKhach: p.liveMatch.away?.name || 'Away',
      tySoLucDuDoan: p.liveMatch.ss || 'N/A',
      timestampGmt7: undefined as string | undefined,
    };

    try {
      const r = await fetchGoalPrediction(input, {
        force: opts.force,
        sheetLog: sheetLogMeta,
      });
      if (r.ok === false) {
        setError(r.error);
        return false;
      }
      setResult(r.data);
      setOpen(true);
      setActiveSnapshotId(null); // luôn nhảy về snapshot mới nhất sau khi predict
      const prob15 = r.data.goalProb15 ?? r.data.goalProb;
      if (typeof prob15 === 'number') {
        appendGoalProbEntry(p.liveMatch.id, {
          minute: m,
          half: halfNow,
          prob: prob15,
          prob5: typeof r.data.goalProb5 === 'number' ? r.data.goalProb5 : undefined,
          prob30: typeof r.data.goalProb30 === 'number' ? r.data.goalProb30 : undefined,
          ts,
        });
      }
      const { snapshots: updatedSnapshots, saved } = appendPredictionSnapshot(p.liveMatch.id, {
        minute: m,
        half: halfNow,
        ts,
        result: r.data,
      });
      if (!saved) {
        setError('Không lưu được lịch sử dự đoán (localStorage đầy?)');
      }
      if (r.data.sheetLog?.ok) {
        markPredictionSheetLogged(p.liveMatch.id, predictionId);
      } else if (r.data.sheetLog?.ok === false && r.data.sheetLog.error) {
        setSheetWarning(`Không ghi được Google Sheet: ${r.data.sheetLog.error}`);
      }
      setSnapshots(loadPredictionSnapshots(p.liveMatch.id));
      onPredictNotifyRef.current?.({
        half: halfNow,
        minute: m,
        result: r.data,
        phase: 'predict',
      });

      // ---- Bước 2: fetch reason async (Ollama + GPT + DeepSeek song song) ----
      // Không await ở đây — UI đã hiển thị goalProb + heuristic.
      reasonAbortRef.current?.abort();
      const ctrl = new AbortController();
      reasonAbortRef.current = ctrl;
      setReasonsLoading(true);
      void fetchGoalReason(input, ctrl.signal, { force: opts.force, enableCloudAi: cloudAiEnabledRef.current })
        .then((rr) => {
          if (ctrl.signal.aborted) return;
          if (rr.ok === false) return; // im lặng — heuristic vẫn hiển thị
          const reasons = { ollama: rr.data.ollama, gpt: rr.data.gpt, deepseek: rr.data.deepseek };
          setResult((prev) => (prev ? { ...prev, reasons } : prev));
          updatePredictionSnapshotReasons(p.liveMatch.id, { half: halfNow, minute: m, ts }, reasons);
          onPredictNotifyRef.current?.({
            half: halfNow,
            minute: m,
            result: { ...r.data, reasons },
            phase: 'reason',
          });
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setReasonsLoading(false);
        });
      return true;
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  /** Tự gọi predict-goal tại các mốc 10, 20, …, 90 (phút trận). */
  useEffect(() => {
    const m = Number(liveMatch.timer?.tm ?? parseInt(String(liveMatch.time ?? '0'), 10) ?? 0);
    if (!Number.isFinite(m)) return;
    const ttStr = String(liveMatch.timer?.tt ?? '');
    if (ttStr === '3' || ttStr === '4') return;

    const minuteFloor = Math.floor(m);

    const hasSnapshotNearMark = (mark: number) =>
      snapshots.some((s) => Math.abs(s.minute - mark) <= 3);

    const reached = AUTO_PREDICT_MARKS.filter((mk) => minuteFloor >= mk);
    if (reached.length === 0) return;

    const highestReached = reached[reached.length - 1];

    const tryPredictAtMark = (mark: number): void => {
      if (hasSnapshotNearMark(mark) || inFlightRef.current) {
        lastAutoMarkRef.current = Math.max(lastAutoMarkRef.current ?? 0, mark);
        return;
      }
      void handlePredict().then((ok) => {
        if (ok) lastAutoMarkRef.current = mark;
      });
    };

    if (lastAutoMarkRef.current === null) {
      if (hasSnapshotNearMark(highestReached)) {
        lastAutoMarkRef.current = highestReached;
      } else if (minuteFloor >= 5) {
        tryPredictAtMark(highestReached);
      }
      return;
    }

    if (minuteFloor < (lastAutoMarkRef.current ?? 0)) {
      lastAutoMarkRef.current = highestReached;
      return;
    }

    for (const mark of AUTO_PREDICT_MARKS) {
      if (mark > (lastAutoMarkRef.current ?? 0) && minuteFloor >= mark) {
        tryPredictAtMark(mark);
        break;
      }
    }
  }, [
    liveMatch.id,
    liveMatch.timer?.tm,
    liveMatch.timer?.tt,
    liveMatch.time,
    snapshots,
    handlePredict,
  ]);

  // Snapshot đang hiển thị: ưu tiên tab được chọn → result phiên hiện tại → snapshot mới nhất từ localStorage.
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const explicitSnapshot = activeSnapshotId
    ? snapshots.find((s) => s.id === activeSnapshotId) ?? null
    : null;
  const fallbackSnapshot = explicitSnapshot == null && result == null ? latestSnapshot : null;
  const activeSnapshot = explicitSnapshot ?? fallbackSnapshot;
  const displayResult: PredictGoalResult | null = activeSnapshot?.result ?? result;
  const displayedMinute = activeSnapshot?.minute ?? null;
  const displayedHalf = activeSnapshot?.half ?? null;
  const displayedTs = activeSnapshot?.ts ?? null;

  const prob15 = displayResult?.goalProb15 ?? displayResult?.goalProb;
  const prob5 = displayResult?.goalProb5;
  const prob30 = displayResult?.goalProb30;
  // Cửa sổ CHÍNH = 30' (fallback 15' nếu model 30' chưa load). 15'/5' chỉ tham khảo.
  const mainProb = typeof prob30 === 'number' ? prob30 : prob15;
  const mainMeta = typeof prob30 === 'number' ? displayResult?.modelMeta30 : displayResult?.modelMeta;
  const pct = typeof mainProb === 'number' ? Math.round(mainProb * 100) : null;
  const pct15 = typeof prob15 === 'number' ? Math.round(prob15 * 100) : null;
  const pct5 = typeof prob5 === 'number' ? Math.round(prob5 * 100) : null;
  const colorCls = pct != null ? probColor(mainProb ?? 0, mainMeta?.displayThresholds) : 'bg-gray-100 dark:bg-slate-800 text-gray-500';

  // Badge ngoài (button thu nhỏ) luôn theo prediction mới nhất: result phiên hiện tại hoặc snapshot cuối.
  const latestSrc: PredictGoalResult | null = result ?? latestSnapshot?.result ?? null;
  const latestProb15 = latestSrc?.goalProb15 ?? latestSrc?.goalProb;
  const latestProb5 = latestSrc?.goalProb5;
  const latestProb30 = latestSrc?.goalProb30;
  const latestMainProb = typeof latestProb30 === 'number' ? latestProb30 : latestProb15;
  const latestMainMeta = typeof latestProb30 === 'number' ? latestSrc?.modelMeta30 : latestSrc?.modelMeta;
  const latestPct = typeof latestMainProb === 'number' ? Math.round(latestMainProb * 100) : null;
  const latestPct15 = typeof latestProb15 === 'number' ? Math.round(latestProb15 * 100) : null;
  const latestPct5 = typeof latestProb5 === 'number' ? Math.round(latestProb5 * 100) : null;
  const latestColorCls = latestPct != null ? probColor(latestMainProb ?? 0, latestMainMeta?.displayThresholds) : 'bg-gray-100 dark:bg-slate-800 text-gray-500';

  const shortReason = displayResult?.reasonVi || displayResult?.fallback || '';

  // Tabs: snapshot cũ nhất → mới nhất; tab cuối cùng tương ứng với prediction mới nhất.
  const tabs = snapshots;
  const latestTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
  const selectedTabId = activeSnapshotId ?? latestTabId;
  const selectedSnapshot = selectedTabId ? tabs.find((s) => s.id === selectedTabId) ?? null : null;
  const selectedVerdict: PredictionVerdict | null = selectedSnapshot?.verdict ?? null;
  const selectedVerdict30: PredictionVerdict | null = selectedSnapshot?.verdict30 ?? null;

  function handleSetVerdict(v: PredictionVerdict | null): void {
    if (!selectedTabId) return;
    // User chấm tay → auto=false → effect auto-score sẽ skip snapshot này về sau.
    setPredictionSnapshotVerdict(liveMatch.id, selectedTabId, v, { auto: false });
    const updated = loadPredictionSnapshots(liveMatch.id);
    setSnapshots(updated);
    const snap = updated.find((s) => s.id === selectedTabId);
    if (snap?.verdict) void syncSnapshotVerdictToSheet(snap);
  }

  function handleSetVerdict30(v: PredictionVerdict | null): void {
    if (!selectedTabId) return;
    // User chấm tay mốc 30' → auto=false → effect auto-score sẽ skip về sau.
    setPredictionSnapshotVerdict30(liveMatch.id, selectedTabId, v, { auto: false });
    const updated = loadPredictionSnapshots(liveMatch.id);
    setSnapshots(updated);
    const snap = updated.find((s) => s.id === selectedTabId);
    if (snap?.verdict30) void syncSnapshotVerdictToSheet(snap);
  }

  function formatTabTime(ts: number): string {
    try {
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  }

  function tabChipColor(p?: number | null, t?: DisplayThresholds | null): string {
    if (p == null) return 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300';
    const warn = t?.warn ?? 0.5;
    const high = t?.high ?? 0.75;
    const extreme = t?.extreme ?? 0.85;
    if (p >= extreme) return 'bg-red-600 text-white';
    if (p >= high) return 'bg-orange-500 text-white';
    if (p >= warn) return 'bg-yellow-400 text-gray-900';
    return 'bg-slate-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300';
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (result || snapshots.length > 0) setOpen(true);
              else void handlePredict();
            }}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all ${latestColorCls} hover:scale-105 cursor-pointer disabled:opacity-60 disabled:cursor-wait`}
            title={error || result?.reasonVi || result?.fallback || 'Bấm để dự đoán bàn thắng'}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : error ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Flame className="w-3.5 h-3.5" />
            )}
            <span className="flex flex-col items-start leading-tight">
              {latestPct != null ? (
                <>
                  <span>
                    30&apos;: {latestPct}%
                    {latestSnapshot ? ` · p${latestSnapshot.minute}` : ''}
                  </span>
                  <span className="text-[10px] font-semibold opacity-80">
                    tk 15&apos;: {latestPct15 ?? '—'}%
                    {latestPct5 != null && ` · 5': ${latestPct5}%`}
                  </span>
                </>
              ) : error ? (
                'AI lỗi'
              ) : (
                'Dự đoán'
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleCloudAi}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors ${
              cloudAiEnabled
                ? 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-300'
                : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={
              cloudAiEnabled
                ? 'Cloud AI BẬT — GPT + DeepSeek chạy tự động (tốn token). Bấm để tắt.'
                : 'Cloud AI TẮT — chỉ Ollama local chạy (tiết kiệm token). Bấm để bật GPT + DeepSeek cho trận này.'
            }
          >
            <Zap className={`w-3 h-3 ${cloudAiEnabled ? 'fill-amber-500' : ''}`} />
            GPT+DS {cloudAiEnabled ? 'ON' : 'OFF'}
          </button>
          {(result || error || snapshots.length > 0) && !loading && (
            <button
              type="button"
              onClick={() => void handlePredict({ force: true })}
              className="text-[10px] px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Gọi lại AI (bypass cache)"
            >
              ↻
            </button>
          )}
        </div>
        {error && (
          <div className="max-w-xs text-[11px] leading-snug px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}
        {sheetWarning && !error && (
          <div className="max-w-xs text-[11px] leading-snug px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{sheetWarning}</span>
          </div>
        )}
      </div>

      {open && displayResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-2"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {tabs.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto px-3 pt-3 pb-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 rounded-t-xl">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0">
                  Lịch sử
                </span>
                {tabs.map((s) => {
                  const isActive = s.id === selectedTabId;
                  const tabPct = typeof s.result.goalProb === 'number'
                    ? Math.round(s.result.goalProb * 100)
                    : null;
                  const verdictMark = s.verdict === 'yes'
                    ? <Check className="w-3 h-3 text-emerald-500" />
                    : s.verdict === 'no'
                    ? <X className="w-3 h-3 text-rose-500" />
                    : null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSnapshotId(s.id)}
                      className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                        isActive
                          ? `${tabChipColor(s.result.goalProb, s.result.modelMeta?.displayThresholds)} border-current shadow-sm scale-105`
                          : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500'
                      }`}
                      title={`H${s.half} · phút ${s.minute} · ${formatTabTime(s.ts)}${s.verdict ? ` · đã chấm: ${s.verdict === 'yes' ? 'CÓ bàn' : 'KHÔNG có bàn'}` : ''}`}
                    >
                      <span>p{s.minute}</span>
                      {tabPct != null && <span>· {tabPct}%</span>}
                      {verdictMark}
                    </button>
                  );
                })}
              </div>
            )}
            <div className={`px-4 py-3 ${tabs.length > 1 ? '' : 'rounded-t-xl'} ${colorCls}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  <div>
                    <div className="text-xs font-medium opacity-80">
                      Xác suất có bàn — 30&apos; tới (chính)
                      {displayedMinute != null && (
                        <span className="opacity-80">
                          {' · '}H{displayedHalf} phút {displayedMinute}
                          {displayedTs != null && ` · ${formatTabTime(displayedTs)}`}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold leading-none mt-0.5">
                      {pct != null ? `${pct}%` : '—'}
                      <span className="text-xs font-medium ml-2 opacity-80">
                        tham khảo 15&apos;: {pct15 ?? '—'}%
                        {pct5 != null && ` · 5': ${pct5}%`}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="text-current opacity-70 hover:opacity-100">✕</button>
              </div>
            </div>

            <div className="p-4 space-y-4 text-sm text-gray-800 dark:text-gray-200">
              {selectedSnapshot && (
                <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 border border-gray-200 dark:border-slate-700">
                  <div className="text-xs">
                    <div className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-500 text-white">15&apos;</span>
                      <span>Trong 15p sau phút {selectedSnapshot.minute} có bàn không?</span>
                      {selectedSnapshot.verdictAuto && selectedSnapshot.verdict && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                          auto
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {selectedSnapshot.verdictAuto && selectedSnapshot.verdict
                        ? 'Tự chấm từ sự kiện trận — bấm để chỉnh.'
                        : isLateGameAutoScoreMinute(selectedSnapshot.minute)
                          ? 'Mốc cuối trận — tự chấm khi trận kết thúc (FT), hoặc bấm tay.'
                          : `Tự chấm khi qua phút ${selectedSnapshot.minute + 15}, hoặc bấm tay.`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetVerdict(selectedVerdict === 'yes' ? null : 'yes')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                        selectedVerdict === 'yes'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                      }`}
                      title={selectedVerdict === 'yes' ? 'Bấm lại để bỏ đánh dấu' : 'Có bàn trong 15p'}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Có</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetVerdict(selectedVerdict === 'no' ? null : 'no')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                        selectedVerdict === 'no'
                          ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                      }`}
                      title={selectedVerdict === 'no' ? 'Bấm lại để bỏ đánh dấu' : 'Không có bàn trong 15p'}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Không</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedSnapshot && (
                <div className="flex items-center justify-between gap-2 bg-emerald-50/60 dark:bg-emerald-900/15 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-xs">
                    <div className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-600 text-white">30&apos;</span>
                      <span>Trong 30p sau phút {selectedSnapshot.minute} có bàn không?</span>
                      {selectedSnapshot.verdict30Auto && selectedSnapshot.verdict30 && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                          auto
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {selectedSnapshot.verdict30Auto && selectedSnapshot.verdict30
                        ? 'Tự chấm từ sự kiện trận — bấm để chỉnh.'
                        : isLateGameAutoScoreMinute(selectedSnapshot.minute)
                          ? 'Mốc cuối trận — tự chấm khi trận kết thúc (FT), hoặc bấm tay.'
                          : `Tự chấm khi qua phút ${selectedSnapshot.minute + 30}, hoặc bấm tay.`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetVerdict30(selectedVerdict30 === 'yes' ? null : 'yes')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                        selectedVerdict30 === 'yes'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                      }`}
                      title={selectedVerdict30 === 'yes' ? 'Bấm lại để bỏ đánh dấu' : 'Có bàn trong 30p'}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Có</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetVerdict30(selectedVerdict30 === 'no' ? null : 'no')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                        selectedVerdict30 === 'no'
                          ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                      }`}
                      title={selectedVerdict30 === 'no' ? 'Bấm lại để bỏ đánh dấu' : 'Không có bàn trong 30p'}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Không</span>
                    </button>
                  </div>
                </div>
              )}

              {shortReason && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-blue-900 dark:text-blue-100">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="leading-snug">
                      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">Heuristic</div>
                      <p>{shortReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {(displayResult.reasons?.ollama || displayResult.reasons?.gpt || displayResult.reasons?.deepseek || reasonsLoading) && (
                <div className="space-y-2">
                  <ReasonCard
                    label="Ollama (local)"
                    color="violet"
                    reason={displayResult.reasons?.ollama}
                    loading={reasonsLoading && !displayResult.reasons?.ollama}
                    showGoalProb30
                  />
                  <ReasonCard
                    label="GPT (OpenAI)"
                    color="emerald"
                    reason={displayResult.reasons?.gpt}
                    loading={reasonsLoading && !displayResult.reasons?.gpt}
                    showGoalProb30
                  />
                  <ReasonCard
                    label="DeepSeek (deepseek-v4-flash)"
                    color="sky"
                    reason={displayResult.reasons?.deepseek}
                    loading={reasonsLoading && !displayResult.reasons?.deepseek}
                    showGoalProb30
                  />
                </div>
              )}

              {displayResult.fallback && (
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-2 text-xs text-amber-900 dark:text-amber-200">
                  ⚠ {displayResult.fallback}
                </div>
              )}

              {displayResult.topFeatures.length > 0 && (
                <div>
                  <div className="font-semibold mb-2 text-gray-900 dark:text-white">Yếu tố hàng đầu</div>
                  <div className="space-y-1.5">
                    {displayResult.topFeatures.map((f) => (
                      <div key={f.name} className="flex justify-between items-center text-xs">
                        <span className="font-mono text-gray-600 dark:text-gray-400">{f.name}</span>
                        <span className="font-semibold">{f.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayResult.similarMatches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Tình huống tương tự
                      <span className="ml-1 text-[10px] font-normal text-gray-400 dark:text-gray-500">(cùng vạch T/X + chấp · xem bảng để so cách mới)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllSimilar(true)}
                      className="flex-shrink-0 text-[10px] px-2 py-1 rounded-md border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      title="Mở bảng so sánh tất cả tình huống tương tự (top 20)"
                    >
                      Xem tất cả (top 20)
                    </button>
                  </div>
                  <div className="space-y-1">
                    {displayResult.similarMatches.slice(0, 5).map((s, i) => {
                      const sOu = s.features?.ou13_handicap;
                      const sAh = s.features?.ah12_handicap;
                      const qOu = displayResult.queryFeatures?.ou13_handicap;
                      const qAh = displayResult.queryFeatures?.ah12_handicap;
                      const ouOff = typeof sOu === 'number' && typeof qOu === 'number' && Math.abs(sOu - qOu) >= 0.005;
                      const ahOff = typeof sAh === 'number' && typeof qAh === 'number' && Math.abs(sAh - qAh) >= 0.005;
                      const approx = ouOff || ahOff;
                      return (
                        <div key={i} className="flex justify-between items-center gap-2 text-xs bg-gray-50 dark:bg-slate-800 rounded px-2 py-1">
                          <span className="font-mono truncate min-w-0" title={`Match ${s.matchId}`}>
                            <span className="block truncate">
                              {s.home && s.away ? `${s.home} vs ${s.away}` : `Match ${s.matchId}`} · H{s.half} · phút {s.minute}
                            </span>
                            <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                              T/X {typeof sOu === 'number' ? HCAP(sOu) : '—'} · chấp {typeof sAh === 'number' ? HCAP(sAh) : '—'}
                              {approx && <span className="ml-1 text-amber-600 dark:text-amber-400">≈ xấp xỉ</span>}
                            </span>
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`font-bold ${
                                s.label30 === 1 ? 'text-red-500' : s.label30 === 0 ? 'text-gray-400' : 'text-gray-300 dark:text-gray-500'
                              }`}
                              title="Kết cục trong 30 phút sau tình huống"
                            >
                              {s.label30 == null ? 'chưa rõ' : s.label30 === 1 ? 'CÓ BÀN' : 'không'} · sim {s.similarity.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDetailSim(s)}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Xem chi tiết tình huống tương tự + so sánh số liệu"
                            >
                              Chi tiết
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(displayResult.modelMeta30 ?? displayResult.modelMeta) && (
                <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-800">
                  {(() => { const mm = displayResult.modelMeta30 ?? displayResult.modelMeta!; const win = displayResult.modelMeta30 ? 30 : 15; const auc = typeof mm.rocAuc === 'number' ? mm.rocAuc.toFixed(3) : '?'; return `Model ${win}' ${mm.version} · AUC ${auc} · ${mm.numTrainMatches ?? '?'} trận train`; })()} · ONNX {displayResult.latencyMs.onnx30 ?? displayResult.latencyMs.onnx}ms
                  {displayResult.reasons?.ollama?.latencyMs != null && ` · Ollama ${displayResult.reasons.ollama.latencyMs}ms`}
                  {displayResult.reasons?.gpt?.latencyMs != null && ` · GPT ${displayResult.reasons.gpt.latencyMs}ms`}
                  {displayResult.reasons?.deepseek?.latencyMs != null && ` · DeepSeek ${displayResult.reasons.deepseek.latencyMs}ms`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailSim && (
        <SimilarMatchDetailDialog
          sim={detailSim}
          queryFeatures={displayResult?.queryFeatures}
          onClose={() => setDetailSim(null)}
        />
      )}

      {showAllSimilar && (
        <AllSimilarMatchesModal
          input={buildPredictInput()}
          current={{
            home: liveMatch.home?.name || '',
            away: liveMatch.away?.name || '',
            score: liveMatch.ss || '',
          }}
          queryFeatures={displayResult?.queryFeatures}
          openingLines={displayResult?.openingLines}
          currentProb30={displayResult?.goalProb30}
          onClose={() => setShowAllSimilar(false)}
        />
      )}
    </>
  );
};
