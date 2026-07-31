import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Flame, Loader2, AlertCircle, Info, Check, X, Zap, Link2 } from 'lucide-react';
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
  fetchSimilarMatchesWithAi,
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
  type AiSimilarEvaluation,
  type Label30Stats,
  type HalfGoalStats,
  type HalfGoalMatchRef,
  type SimilarMatchesData,
  filterSimilarCatalogByOpenLine,
  catalogQueryHalf,
  catalogQueryOpenOu13,
} from '../services/goal-prediction';
import {
  appendSimilarMatchSnapshot,
  type SimilarMatchSnapshotData,
} from '../services/similar-match-snapshots';
import { loadMatchNotes } from '../services/match-notes';
import {
  loadSimilarMatchLinks,
  saveSimilarMatchLink,
  removeSimilarMatchLink,
  mergeSimilarMatchLinksFromServer,
  isSimilarMatchLinked,
  SIMILAR_MATCH_LINKS_UPDATED_EVENT,
  TIER_LABEL,
  formatSimilarLinkTime,
  type SimilarMatchLinkRecord,
  type SimilarMatchLinkTier,
} from '../services/similar-match-links';
import { fetchSimilarMatchLinksFromHistory } from '../services/similar-match-links-api';
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
  team?: 'home' | 'away';
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
  /** Khi mở chồng lên AllSimilarMatchesModal (z-70). */
  zClass?: string;
}> = ({ sim, queryFeatures, onClose, zClass = 'z-[60]' }) => {
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
      className={`fixed inset-0 ${zClass} bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4`}
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
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                sim.labelHalf == null
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  : sim.labelHalf === 1
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-100'
              }`}
            >
              {sim.labelHalf == null ? 'đến hết hiệp: chưa rõ' : sim.labelHalf === 1 ? 'đến hết hiệp: CÓ BÀN' : 'đến hết hiệp: không có bàn'}
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
function sortOpenLineForDisplay<T extends { matchId: string | number; minute: number; similarity: number }>(
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

/** Catalog: chỉ hiển thị vạch mở 1_3/1_2 của hiệp đang so (H1↔H1 hoặc H2↔H2). */
function formatCatalogOpenLineForHalf(c: ComparisonColumn, queryHalf: 1 | 2): string {
  const hLabel = queryHalf === 1 ? 'H1' : 'H2';
  const ou13 = queryHalf === 1 ? c.h1OpenOu13 : c.h2OpenOu13;
  const ah12 = queryHalf === 1 ? c.h1OpenAh12 : c.h2OpenAh12;
  return [
    ou13 != null ? `1_3 ${hLabel} ${HCAP(ou13)}` : null,
    ah12 != null ? `1_2 ${hLabel} ${HCAP(ah12)}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || '—';
}

function formatCatalogOpenLineMatch(c: ComparisonColumn, queryHalf: 1 | 2): string {
  const ou13 = queryHalf === 1 ? c.h1OpenOu13 : c.h2OpenOu13;
  const hLabel = queryHalf === 1 ? 'H1' : 'H2';
  const linePart = ou13 != null ? `1_3 ${hLabel} ${HCAP(ou13)}` : `${hLabel} —`;
  const note = c.openAh12MismatchNote;
  return note ? `${linePart} · ${note}` : linePart;
}

/** Hướng dẫn 3 tầng tìm trận tương tự — HDP 1_3 mở hiệp bắt buộc trùng. */
const SimilarMatchHowItWorks: React.FC<{
  queryHalf: 1 | 2;
  queryOpenOu13?: number;
}> = ({ queryHalf, queryOpenOu13 }) => {
  const hLabel = queryHalf === 1 ? 'H1' : 'H2';
  const lineLabel = queryOpenOu13 != null ? HCAP(queryOpenOu13) : '—';
  return (
    <details className="mx-2 mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300">
      <summary className="cursor-pointer select-none px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
        Cách tìm trận tương tự
      </summary>
      <div className="px-3 pb-2.5 space-y-1.5 leading-snug border-t border-slate-200/80 dark:border-slate-700/80 pt-2">
        <p>
          <strong>Điều kiện bắt buộc:</strong> vạch mở kèo Tài/Xỉu cả trận (<code className="font-mono text-[10px]">1_3</code>)
          {' '}đầu hiệp đang xem phải <strong>trùng tuyệt đối</strong> — đang xem {hLabel} thì so với vạch mở {hLabel} của trận lịch sử (H1↔H1, H2↔H2).
          {queryOpenOu13 != null && (
            <span className="block mt-0.5 text-indigo-700 dark:text-indigo-300">
              Trận này: 1_3 {hLabel} mở = {lineLabel}
            </span>
          )}
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li><span className="text-indigo-700 dark:text-indigo-300 font-medium">Top vạch mở (indigo):</span> top-N trận giống nhất về chỉ số thế trận, trong nhóm đã khớp vạch mở 1_3 cùng hiệp.</li>
          <li><span className="text-emerald-700 dark:text-emerald-300 font-medium">Catalog (xanh lá):</span> mọi trận trong dataset có vạch mở 1_3 cùng hiệp trùng (1_2 mở khác vẫn giữ, kèm ghi chú).</li>
          <li><span className="text-sky-700 dark:text-sky-300 font-medium">Catalog + thời gian vạch (xanh dương):</span> catalog trên + pattern thời gian giữ từng vạch 1_3 gần giống (vd. 2.5×5p · 2.25×6p).</li>
        </ul>
        <p className="text-slate-500 dark:text-slate-400">
          Tự chụp similar: phút <strong>10</strong> H1 và phút <strong>52</strong> H2 (hoặc phút mở trận nếu vào muộn).
        </p>
      </div>
    </details>
  );
};

function toComparisonColumns(
  matches: SimilarMatchFull[],
  prefix: 'open' | 'catalog' | 'catalogRuns',
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
    labelHalf: s.labelHalf,
    similarity: s.similarity,
    feats: s.features,
    totals: s.totals,
    prob30: s.prob30,
    matchedOpenHalves: s.matchedOpenHalves,
    h1OpenOu13: s.h1OpenOu13,
    h2OpenOu13: s.h2OpenOu13,
    h1OpenAh12: s.h1OpenAh12,
    h2OpenAh12: s.h2OpenAh12,
    openAh12MismatchNote: s.openAh12MismatchNote,
    ou13LineRuns: s.ou13LineRuns,
    lineRunsScore: s.lineRunsScore,
  }));
}

/** 1 cột trong bảng so sánh = 1 trận (trận đang xem hoặc 1 tình huống tương tự). */
interface ComparisonColumn {
  key: string;
  isCurrent: boolean;
  /** Nhóm xếp hạng — hiển thị 3 block cột trên bảng modal. */
  rankGroup?: 'open' | 'catalog' | 'catalogRuns';
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
  /** Kết cục "đến hết hiệp": 1 = có bàn, 0 = không, null/undefined = chưa rõ. */
  labelHalf?: 0 | 1;
  similarity?: number;
  feats?: Record<string, number>;
  /** Tổng lũy kế từ đầu trận đến phút này (DA/sút/trúng đích/phạt góc). */
  totals?: CumulativeTotals | null;
  /** Xác suất có bàn 30' theo model chính tại phút này (null = không có). */
  prob30?: number | null;
  /** Catalog vạch mở — cùng hiệp (H1↔H1 hoặc H2↔H2). */
  matchedOpenHalves?: 'H1' | 'H2';
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  h1OpenAh12?: number;
  h2OpenAh12?: number;
  openAh12MismatchNote?: string;
  ou13LineRuns?: string;
  lineRunsScore?: number;
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
/** Tên trận trong header bảng — bấm mở biểu đồ so sánh kèo 1_3. */
function SimColTeamName({
  c,
  onOpenChart,
}: {
  c: ComparisonColumn;
  onOpenChart?: (c: ComparisonColumn) => void;
}) {
  if (onOpenChart && c.matchId) {
    return (
      <button
        type="button"
        onClick={() => onOpenChart(c)}
        className="truncate max-w-full w-full text-left font-semibold hover:underline cursor-pointer"
        title={`Xem biểu đồ so sánh kèo 1_3 — ${c.team}`}
      >
        {c.team}
      </button>
    );
  }
  return (
    <div className="truncate" title={c.team}>
      {c.team}
    </div>
  );
}

function SimilarMatchLinksBanner({ links }: { links: SimilarMatchLinkRecord[] }) {
  if (links.length === 0) return null;
  return (
    <div className="m-2 text-xs leading-snug px-3 py-2 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800">
      <div className="font-semibold mb-1">
        Đã ghi chú {links.length} trận liên quan — sẽ có trong file .md khi export
      </div>
      <ul className="space-y-0.5 text-[11px] text-indigo-800 dark:text-indigo-200">
        {links.map((r) => (
          <li key={r.id} className="truncate" title={r.relatedTeam}>
            {r.relatedTeam} · H{r.relatedHalf} {r.relatedMinute}&apos; · {TIER_LABEL[r.tier]}
            {r.ts ? ` · ${formatSimilarLinkTime(r.ts)}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SimColNoteButton({
  linked,
  savedAt,
  onToggle,
}: {
  linked: boolean;
  savedAt?: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-[10px] px-1.5 py-0.5 rounded border font-sans inline-flex items-center gap-0.5 ${
        linked
          ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500'
          : 'border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
      }`}
      title={
        linked && savedAt
          ? `Đã ghi chú lúc ${formatSimilarLinkTime(savedAt)} — bấm để bỏ`
          : 'Ghi chú liên kết 2 trận (lưu .md khi export)'
      }
    >
      <Link2 className="w-3 h-3" />
      {linked ? 'Đã ghi' : 'Ghi chú'}
    </button>
  );
}

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
    odds16: (input.h1OuHistory ?? [])
      .filter((o) => o.marketId === '1_6' || !o.marketId)
      .map((o) => ({
        minute: o.minute,
        half: 1 as const,
        handicap: o.handicap,
        over: o.over,
        under: o.under,
      })),
    odds15: (input.h1AhHistory ?? [])
      .filter((o) => o.marketId === '1_5' || !o.marketId)
      .map((o) => ({
        minute: o.minute,
        half: 1 as const,
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
      ...(e.team ? { team: e.team } : {}),
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
    homeName: input.liveMatch.home.name,
    awayName: input.liveMatch.away.name,
    userNotes: loadMatchNotes(String(input.matchId)).map((n) => ({
      minute: n.minute,
      half: n.half,
      verdict: n.verdict ?? null,
      text: n.text,
    })),
  };
}

/** Modal "Xem tất cả tình huống tương tự" — bảng so sánh dạng cột. */
/** Nhãn + màu nghiêng Tài/Xỉu của đánh giá AI. */
function aiLeanDisplay(lean: AiSimilarEvaluation['lean']): { text: string; cls: string } {
  if (lean === 'over') return { text: 'Nghiêng TÀI', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700' };
  if (lean === 'under') return { text: 'Nghiêng XỈU', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' };
  return { text: 'Trung lập', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600' };
}

const CONF_LABEL: Record<AiSimilarEvaluation['confidence'], string> = {
  high: 'tin cậy cao',
  medium: 'tin cậy vừa',
  low: 'tin cậy thấp',
};

function label30Chip(stats?: Label30Stats): string | null {
  if (!stats || stats.total === 0) return null;
  return `${stats.hits}/${stats.total} có bàn 30' · ${Math.round(stats.rate * 100)}%`;
}

function labelHalfChip(stats?: Label30Stats): string | null {
  if (!stats || stats.total === 0) return null;
  return `${stats.hits}/${stats.total} có bàn đến hết hiệp · ${Math.round(stats.rate * 100)}%`;
}

/**
 * Panel RAG "% có bàn theo hiệp": lọc trận lịch sử theo vạch mở T/X hiệp đang xem
 * (+ điều kiện H1 khi hỏi H2, + kèo chấp mềm). Trả lời trực tiếp "H2 mở X → % có bàn".
 */
const SMALL_SAMPLE = 10;

/** Màu theo mức tỷ lệ có bàn: cao → xanh đậm, quanh 50% → hổ phách, thấp → xám. */
function rateTone(rate: number): { bar: string; text: string } {
  if (rate >= 0.6) return { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' };
  if (rate >= 0.45) return { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' };
  return { bar: 'bg-slate-400 dark:bg-slate-500', text: 'text-slate-600 dark:text-slate-300' };
}

const HalfGoalStatsPanel: React.FC<{
  stats?: HalfGoalStats;
  onMatchClick?: (m: HalfGoalMatchRef, half: 1 | 2, siblings: HalfGoalMatchRef[]) => void;
}> = ({ stats, onMatchClick }) => {
  const [showAhList, setShowAhList] = useState(false);
  const [showMainList, setShowMainList] = useState(true);
  if (!stats) return null;
  const pct = Math.round(stats.rate * 100);
  const hLabel = `H${stats.half}`;
  const halfNum = (stats.half === 2 ? 2 : 1) as 1 | 2;
  const priorG = stats.priorHalfGoals;
  const cond = stats.priorHalfUnknown
    ? 'H1 chưa rõ (mở trận muộn)'
    : stats.conditionedOnPriorHalf
      ? priorG && priorG > 0
        ? `H1 có ${priorG} bàn`
        : 'H1 không bàn'
      : null;

  // Header dùng chung.
  const header = (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        RAG số bàn theo hiệp
      </span>
      <span className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
        {hLabel} mở {HCAP(stats.openOu13)}
      </span>
      {cond && (
        <span className={`text-[10px] font-medium ${stats.priorHalfUnknown ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600/80 dark:text-emerald-400/80'}`}>
          {cond}
        </span>
      )}
    </div>
  );

  // Không có trận lịch sử nào cùng vạch mở (kể cả sau khi hạ điều kiện H1).
  if (stats.total === 0) {
    return (
      <div className="m-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
        {header}
        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          Chưa có trận lịch sử nào cùng vạch mở T/X {hLabel} = {HCAP(stats.openOu13)}
          {cond && !stats.priorHalfUnknown ? ` và ${cond}` : ''}. Vạch hiếm hoặc dữ liệu còn ít — thêm trận vào History rồi chạy lại extract để có mẫu.
        </p>
      </div>
    );
  }
  const ah = stats.ahSoft;
  // Khớp |HDP| — +0.25 và −0.25 cùng nhóm “Trùng kèo chấp” (mirror server openLineAhMagnitudeMatch).
  const ahMatches = ah
    ? stats.matches.filter(
        (m) => m.openAh12 != null && Math.abs(Math.abs(m.openAh12) - Math.abs(ah.openAh12)) < 1e-6,
      )
    : [];
  const ahIds = new Set(ahMatches.map((m) => m.matchId));
  const tone = rateTone(stats.rate);
  const smallMain = stats.total < SMALL_SAMPLE;

  // 1 dòng trận trong danh sách — tên bấm được → mở biểu đồ so sánh (điều hướng ◀▶ trong `siblings`).
  const renderMatchRow = (m: HalfGoalMatchRef, markChap: boolean, siblings: HalfGoalMatchRef[]) => (
    <li key={m.matchId} className="flex items-center gap-2 text-[11px]">
      <button
        type="button"
        onClick={() => onMatchClick?.(m, halfNum, siblings)}
        disabled={!onMatchClick}
        className={`truncate max-w-[15rem] text-left font-medium ${
          onMatchClick
            ? 'text-emerald-800 dark:text-emerald-200 hover:underline cursor-pointer'
            : 'text-slate-700 dark:text-slate-300'
        }`}
        title={onMatchClick ? `Xem biểu đồ so sánh kèo 1_3 — ${m.home} vs ${m.away}` : undefined}
      >
        {m.home && m.away ? `${m.home} vs ${m.away}` : `Match ${m.matchId}`}
      </button>
      {m.finalScore && <span className="text-[10px] text-slate-500 dark:text-slate-400">FT {m.finalScore}</span>}
      {markChap && ahIds.has(m.matchId) && (
        <span className="px-1 rounded bg-emerald-100 dark:bg-emerald-900/50 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
          chấp
        </span>
      )}
      <span
        className={`ml-auto shrink-0 text-[10px] font-semibold ${
          m.hasGoal === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {hLabel}: {m.hasGoal === 1 ? `${m.goals} bàn` : 'không'}
      </span>
    </li>
  );

  const d = stats.dist;
  const dTot = d.zero + d.one + d.twoPlus || 1;
  const segs = [
    { key: '0 bàn', n: d.zero, cls: 'bg-slate-300 dark:bg-slate-600', dot: 'bg-slate-400 dark:bg-slate-500' },
    { key: '1 bàn', n: d.one, cls: 'bg-emerald-400', dot: 'bg-emerald-400' },
    { key: '2+ bàn', n: d.twoPlus, cls: 'bg-emerald-600', dot: 'bg-emerald-600' },
  ];

  return (
    <div className="m-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2.5">
      {/* Tiêu đề + bối cảnh vạch/điều kiện */}
      {header}
      {stats.priorHalfNoMatch && (
        <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
          Không có trận cùng số bàn H1 — hiển thị thống kê chung cho vạch mở {hLabel}.
        </p>
      )}

      {/* Tỷ lệ CÓ BÀN — số lớn + thanh tiến trình */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            Tỷ lệ có bàn ở {hLabel}
          </span>
          <span className="flex items-baseline gap-1">
            <span className={`text-lg font-extrabold leading-none ${tone.text}`}>{pct}%</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{stats.hits}/{stats.total} trận</span>
          </span>
        </div>
        <div className="mt-1 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        {smallMain && (
          <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">⚠ Mẫu nhỏ — tham khảo dè dặt.</p>
        )}
      </div>

      {/* Danh sách đầy đủ pool — bấm tên trận để mở biểu đồ so sánh */}
      {stats.matches.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowMainList((v) => !v)}
            className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            {showMainList ? `Ẩn danh sách ${stats.matches.length} trận` : `Xem ${stats.matches.length} trận`}
          </button>
          {showMainList && (
            <ul className="mt-1 max-h-48 overflow-auto space-y-0.5 pl-1">
              {stats.matches.map((m) => renderMatchRow(m, true, stats.matches))}
            </ul>
          )}
        </div>
      )}

      {/* Kèo chấp trùng (ưu tiên mềm) — kèm danh sách trận bấm được để mở biểu đồ so sánh */}
      {ah && ah.total > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-600 dark:text-slate-300">Trùng kèo chấp {HCAP(ah.openAh12)}:</span>
            <div className="h-1.5 flex-1 max-w-[80px] rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(ah.rate * 100)}%` }} />
            </div>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{Math.round(ah.rate * 100)}%</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              ({ah.hits}/{ah.total}){ah.total < SMALL_SAMPLE ? ' · mẫu nhỏ' : ''}
            </span>
            {ahMatches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAhList((v) => !v)}
                className="ml-auto text-[10px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                {showAhList ? 'Ẩn danh sách' : `Xem ${ahMatches.length} trận`}
              </button>
            )}
          </div>
          {showAhList && ahMatches.length > 0 && (
            <ul className="mt-1.5 max-h-44 overflow-auto space-y-0.5 pl-1">
              {ahMatches.map((m) => renderMatchRow(m, false, ahMatches))}
            </ul>
          )}
        </div>
      )}

      {/* Phân bố số bàn — thanh xếp chồng + chú thích */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Phân bố số bàn {hLabel}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">TB {stats.goalsAvg.toFixed(2)} bàn/trận</span>
        </div>
        <div className="mt-1 flex h-2.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
          {segs.map((s) =>
            s.n > 0 ? <div key={s.key} className={s.cls} style={{ width: `${(s.n / dTot) * 100}%` }} title={`${s.key}: ${s.n}`} /> : null,
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {segs.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
              <span className={`inline-block w-2 h-2 rounded-sm ${s.dot}`} />
              {s.key}: <b className="font-semibold">{s.n}</b> ({Math.round((s.n / dTot) * 100)}%)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Panel đánh giá AI (DeepSeek) ở đầu modal — chỉ hiện khi snapshot chụp qua /similar/evaluate. */
const AiSimilarEvalPanel: React.FC<{
  ai?: AiSimilarEvaluation | null;
  disabledReason?: string;
  label30ByTier?: Record<'openLine' | 'catalog' | 'catalogRuns', Label30Stats>;
  labelHalfByTier?: Record<'openLine' | 'catalog' | 'catalogRuns', Label30Stats>;
  onTopMatchClick?: (matchId: string) => void;
}> = ({ ai, disabledReason, label30ByTier, labelHalfByTier, onTopMatchClick }) => {
  if (!ai) {
    if (!disabledReason) return null;
    return (
      <div className="m-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
        Đánh giá AI không khả dụng: {disabledReason}
      </div>
    );
  }
  const lean = aiLeanDisplay(ai.lean);
  const topRate = label30Chip(ai.topMatchesLabel30);
  const tierRate = label30ByTier ? label30Chip(label30ByTier.catalogRuns) ?? label30Chip(label30ByTier.catalog) : null;
  const topRateHalf = labelHalfChip(ai.topMatchesLabelHalf);
  const tierRateHalf = labelHalfByTier ? labelHalfChip(labelHalfByTier.catalogRuns) ?? labelHalfChip(labelHalfByTier.catalog) : null;
  return (
    <div className="m-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-2.5">
      <div className="flex items-center flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          <Zap className="w-3.5 h-3.5" /> Đánh giá AI (DeepSeek)
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${lean.cls}`}>{lean.text}</span>
        <span className="text-[10px] text-violet-600/80 dark:text-violet-400/80">{CONF_LABEL[ai.confidence]}</span>
        {topRate && (
          <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/50 border border-violet-200 dark:border-violet-800 text-[11px] font-semibold text-violet-800 dark:text-violet-200">
            Top đối chiếu: {topRate}
          </span>
        )}
        {topRateHalf && (
          <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/50 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
            Top đối chiếu: {topRateHalf}
          </span>
        )}
        {tierRate && (
          <span className="text-[10px] text-violet-600/70 dark:text-violet-400/70">nhóm catalog+vạch: {tierRate}</span>
        )}
        {tierRateHalf && (
          <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">nhóm catalog+vạch: {tierRateHalf}</span>
        )}
      </div>
      {ai.summaryVi && (
        <p className="mt-1.5 text-[12px] leading-snug text-violet-900 dark:text-violet-100">{ai.summaryVi}</p>
      )}
      {ai.council && (
        <details className="mt-2 text-[11px] text-violet-800 dark:text-violet-200">
          <summary className="cursor-pointer font-semibold text-violet-700 dark:text-violet-300">
            The Council — 5 góc nhìn
          </summary>
          <ul className="mt-1.5 space-y-1 pl-1">
            {ai.council.devilsAdvocate && (
              <li><span className="font-semibold">Phản biện:</span> {ai.council.devilsAdvocate}</li>
            )}
            {ai.council.firstPrinciples && (
              <li><span className="font-semibold">Nguyên lý:</span> {ai.council.firstPrinciples}</li>
            )}
            {ai.council.opportunityExpander && (
              <li><span className="font-semibold">Cơ hội:</span> {ai.council.opportunityExpander}</li>
            )}
            {ai.council.outsider && (
              <li><span className="font-semibold">Ngoài cuộc:</span> {ai.council.outsider}</li>
            )}
            {ai.council.executor && (
              <li><span className="font-semibold">Thực thi:</span> {ai.council.executor}</li>
            )}
          </ul>
        </details>
      )}
      {ai.topMatches.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">
            Top trận đối chiếu đáng tin
          </p>
          <ul className="mt-1 space-y-1">
            {ai.topMatches.map((m, i) => (
              <li
                key={`${m.matchId}-${i}`}
                className="text-[11px] leading-snug text-violet-900 dark:text-violet-100 flex flex-wrap items-center gap-x-2"
              >
                <button
                  type="button"
                  onClick={() => onTopMatchClick?.(m.matchId)}
                  disabled={!onTopMatchClick}
                  className={`font-semibold truncate max-w-[18rem] text-left ${
                    onTopMatchClick
                      ? 'text-violet-800 dark:text-violet-200 hover:underline cursor-pointer'
                      : ''
                  }`}
                  title={onTopMatchClick ? `Xem biểu đồ odds Tài/Xỉu (1_3) — ${m.team}` : m.team}
                >
                  {m.team}
                </button>
                <span
                  className={`shrink-0 font-semibold text-[10px] ${
                    m.label30 === 1
                      ? 'text-red-600 dark:text-red-400'
                      : m.label30 === 0
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-400'
                  }`}
                >
                  {m.label30 == null ? '30\' chưa rõ' : m.label30 === 1 ? 'CÓ BÀN' : 'không bàn'}
                </span>
                <span
                  className={`shrink-0 font-semibold text-[10px] ${
                    m.labelHalf === 1
                      ? 'text-amber-600 dark:text-amber-400'
                      : m.labelHalf === 0
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-400'
                  }`}
                >
                  {m.labelHalf == null ? 'hết hiệp: ?' : m.labelHalf === 1 ? 'hết hiệp: CÓ BÀN' : 'hết hiệp: không'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ai.caveats && ai.caveats.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {ai.caveats.map((c, i) => (
            <li key={i} className="text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Chuyển response /similar/evaluate → payload lưu snapshot. */
function similarDataForSnapshot(data: SimilarMatchesData): SimilarMatchSnapshotData {
  return {
    queryFeatures: data.queryFeatures,
    openingLines: data.openingLines,
    openingLineNotice: data.openingLineNotice,
    similarMatchesOpenLine: data.similarMatchesOpenLine,
    similarMatchesOpenLineCatalog: data.similarMatchesOpenLineCatalog,
    similarMatchesOpenLineCatalogRuns: data.similarMatchesOpenLineCatalogRuns,
    queryOu13LineRuns: data.queryOu13LineRuns,
    currentTotals: data.currentTotals,
    aiEvaluation: data.aiEvaluation,
    aiDisabledReason: data.aiDisabledReason,
    label30ByTier: data.label30ByTier,
    labelHalfByTier: data.labelHalfByTier,
    halfGoalStats: data.halfGoalStats,
  };
}

function captureHalfMinute(
  current: { half?: number; minute?: number },
  feats?: Record<string, number>,
): { half: 1 | 2; minute: number } {
  const half = current.half === 2 || feats?.half === 2 ? 2 : 1;
  const minute =
    typeof current.minute === 'number'
      ? current.minute
      : typeof feats?.minute === 'number'
        ? feats.minute
        : 0;
  return { half, minute };
}

export const AllSimilarMatchesModal: React.FC<{
  input: PredictGoalInput;
  current: { home: string; away: string; score: string; half?: number; minute?: number };
  queryFeatures?: Record<string, number>;
  openingLines?: import('../services/goal-prediction').OpeningLinesRef;
  /** Xác suất 30' của trận đang xem (hiển thị ở cột "Trận hiện tại"). */
  currentProb30?: number | null;
  /** Dữ liệu đã lưu — bỏ qua fetch (xem lại snapshot). */
  initialData?: import('../services/similar-match-snapshots').SimilarMatchSnapshotData;
  initialError?: string;
  /** Banner khi snapshot được kích hoạt bởi đổi line 1_3. */
  lineChangeBanner?: {
    half: 1 | 2;
    minute: number;
    prevHandicap: number;
    newHandicap: number;
  };
  /** Lưu vào localStorage sau fetch (mặc định: có, trừ khi xem lại snapshot). */
  persistSnapshot?: boolean;
  /** Mở sẵn biểu đồ so sánh kèo 1_3 cho trận tương tự (matchId). */
  initialChartMatchId?: string;
  onClose: () => void;
}> = ({
  input,
  current,
  queryFeatures,
  openingLines: openingLinesProp,
  currentProb30,
  initialData,
  initialError,
  lineChangeBanner,
  persistSnapshot: persistSnapshotProp,
  initialChartMatchId,
  onClose,
}) => {
  const hasCached = initialData != null || initialError != null;
  const persistSnapshot = persistSnapshotProp ?? !hasCached;
  const [loading, setLoading] = useState(!hasCached);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [matchesOpenLine, setMatchesOpenLine] = useState<SimilarMatchFull[]>(initialData?.similarMatchesOpenLine ?? []);
  const [matchesOpenLineCatalog, setMatchesOpenLineCatalog] = useState<SimilarMatchFull[]>(initialData?.similarMatchesOpenLineCatalog ?? []);
  const [matchesOpenLineCatalogRuns, setMatchesOpenLineCatalogRuns] = useState<SimilarMatchFull[]>(initialData?.similarMatchesOpenLineCatalogRuns ?? []);
  const [queryOu13LineRuns, setQueryOu13LineRuns] = useState<string | undefined>(initialData?.queryOu13LineRuns);
  const [qFeats, setQFeats] = useState<Record<string, number> | undefined>(initialData?.queryFeatures ?? queryFeatures);
  const [openingLines, setOpeningLines] = useState(initialData?.openingLines ?? openingLinesProp);
  const [openingLineNotice, setOpeningLineNotice] = useState(initialData?.openingLineNotice);
  const [currentTotals, setCurrentTotals] = useState<CumulativeTotals | null>(initialData?.currentTotals ?? null);
  const [aiEvaluation, setAiEvaluation] = useState(initialData?.aiEvaluation ?? null);
  const [aiDisabledReason, setAiDisabledReason] = useState(initialData?.aiDisabledReason);
  const [label30ByTier, setLabel30ByTier] = useState(initialData?.label30ByTier);
  const [labelHalfByTier, setLabelHalfByTier] = useState(initialData?.labelHalfByTier);
  const [halfGoalStats, setHalfGoalStats] = useState(initialData?.halfGoalStats);
  const [savedLinks, setSavedLinks] = useState<SimilarMatchLinkRecord[]>(() =>
    loadSimilarMatchLinks(input.matchId),
  );
  /** Cột đang mở biểu đồ odds Tài/Xỉu 1_3 (null = đóng). */
  const [chartCol, setChartCol] = useState<ComparisonColumn | null>(null);
  /** Phạm vi điều hướng ◀▶ trong modal biểu đồ. null = dùng danh sách tổng (bảng RAG + top AI).
   *  Khi mở từ 1 nhóm cụ thể (vd trùng kèo chấp) → ghim đúng nhóm đó để so sánh xoay vòng trong nhóm. */
  const [chartNav, setChartNav] = useState<ComparisonColumn[] | null>(null);
  /** Chỉ auto-mở biểu đồ từ initialChartMatchId một lần — tránh mở lại sau khi user đóng. */
  const initialChartOpenedRef = useRef(false);

  useEffect(() => {
    const refresh = () => setSavedLinks(loadSimilarMatchLinks(input.matchId));
    refresh();
    const ctrl = new AbortController();
    void fetchSimilarMatchLinksFromHistory(input.matchId, ctrl.signal).then((incoming) => {
      if (ctrl.signal.aborted || incoming.length === 0) return;
      mergeSimilarMatchLinksFromServer(input.matchId, incoming);
      refresh();
    });
    const onUpdated = (e: Event) => {
      const mid = (e as CustomEvent<{ matchId?: string }>).detail?.matchId;
      if (mid === input.matchId) refresh();
    };
    window.addEventListener(SIMILAR_MATCH_LINKS_UPDATED_EVENT, onUpdated);
    return () => {
      ctrl.abort();
      window.removeEventListener(SIMILAR_MATCH_LINKS_UPDATED_EVENT, onUpdated);
    };
  }, [input.matchId]);

  useEffect(() => {
    initialChartOpenedRef.current = false;
  }, [initialChartMatchId]);

  const closeChart = useCallback(() => {
    setChartCol(null);
    setChartNav(null);
  }, []);

  const handleClose = useCallback(() => {
    closeChart();
    onClose();
  }, [onClose, closeChart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (chartCol) closeChart();
      else handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chartCol, handleClose, closeChart]);

  const allSimilarById = useMemo(() => {
    const map = new Map<string, SimilarMatchFull>();
    for (const m of dedupeByMatchId([
      ...matchesOpenLine,
      ...matchesOpenLineCatalog,
      ...matchesOpenLineCatalogRuns,
    ])) {
      map.set(String(m.matchId), m);
    }
    return map;
  }, [matchesOpenLine, matchesOpenLineCatalog, matchesOpenLineCatalogRuns]);

  useEffect(() => {
    if (hasCached) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    void fetchSimilarMatchesWithAi(input, 20, ctrl.signal, queryFeatures).then((r) => {
      if (ctrl.signal.aborted) return;
      const ts = Date.now();
      const { half: capHalf, minute: capMinute } = captureHalfMinute(current, queryFeatures);
      const score = current.score || '0-0';
      if (r.ok === false) {
        setError(r.error);
        if (persistSnapshot) {
          appendSimilarMatchSnapshot(input.matchId, {
            half: capHalf,
            minute: capMinute,
            ts,
            score,
            error: r.error,
          });
        }
      } else {
        const catalog = r.data.similarMatchesOpenLineCatalog ?? [];
        const catalogRuns = r.data.similarMatchesOpenLineCatalogRuns ?? [];
        setMatchesOpenLine(r.data.similarMatchesOpenLine ?? []);
        setMatchesOpenLineCatalog(catalog);
        setMatchesOpenLineCatalogRuns(catalogRuns);
        setQueryOu13LineRuns(r.data.queryOu13LineRuns);
        const feats = r.data.queryFeatures ?? queryFeatures;
        if (feats) setQFeats(feats);
        if (r.data.openingLines) setOpeningLines(r.data.openingLines);
        setOpeningLineNotice(r.data.openingLineNotice);
        setCurrentTotals(r.data.currentTotals ?? null);
        setAiEvaluation(r.data.aiEvaluation ?? null);
        setAiDisabledReason(r.data.aiDisabledReason);
        setLabel30ByTier(r.data.label30ByTier);
        setLabelHalfByTier(r.data.labelHalfByTier);
        setHalfGoalStats(r.data.halfGoalStats);
        if (persistSnapshot) {
          const cm = captureHalfMinute(current, feats);
          appendSimilarMatchSnapshot(input.matchId, {
            half: cm.half,
            minute: cm.minute,
            ts,
            score,
            data: similarDataForSnapshot(r.data),
          });
        }
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
  const queryHalf = catalogQueryHalf(currentCol.half, qFeats);
  const queryOpenOu13 = catalogQueryOpenOu13(openingLines, queryHalf);
  const linkSourceHalf: 1 | 2 = currentCol.half === 2 ? 2 : 1;
  const linkSourceMinute =
    typeof currentCol.minute === 'number' ? currentCol.minute : 0;

  const getLinkRecord = useCallback(
    (col: ComparisonColumn): SimilarMatchLinkRecord | undefined => {
      if (!col.matchId) return undefined;
      const id = `${input.matchId}:${col.matchId}:${linkSourceHalf}:${linkSourceMinute}`;
      return savedLinks.find((r) => r.id === id);
    },
    [input.matchId, linkSourceHalf, linkSourceMinute, savedLinks],
  );

  const toggleSimilarLink = useCallback(
    (col: ComparisonColumn) => {
      if (!col.matchId) return;
      const relatedHalf: 1 | 2 = col.half === 2 ? 2 : 1;
      const relatedMinute = typeof col.minute === 'number' ? col.minute : 0;
      const tier: SimilarMatchLinkTier =
        col.rankGroup === 'open'
          ? 'openLine'
          : col.rankGroup === 'catalogRuns'
            ? 'catalogRuns'
            : 'catalog';
      if (
        isSimilarMatchLinked(
          input.matchId,
          col.matchId,
          linkSourceHalf,
          linkSourceMinute,
        )
      ) {
        removeSimilarMatchLink(
          input.matchId,
          col.matchId,
          linkSourceHalf,
          linkSourceMinute,
          relatedHalf,
          relatedMinute,
        );
      } else {
        saveSimilarMatchLink(input.matchId, {
          relatedMatchId: col.matchId,
          relatedTeam: col.team,
          relatedFt: col.ft,
          relatedHalf,
          relatedMinute,
          tier,
          similarity: col.similarity,
          label30: col.label30,
          sourceHalf: linkSourceHalf,
          sourceMinute: linkSourceMinute,
          sourceScore: currentCol.ft !== '—' ? currentCol.ft : undefined,
          sourceTeam: currentCol.team,
        });
      }
      setSavedLinks(loadSimilarMatchLinks(input.matchId));
    },
    [input.matchId, linkSourceHalf, linkSourceMinute, currentCol.ft, currentCol.team],
  );
  const curMin =
    current.minute ?? (typeof qFeats?.minute === 'number' ? qFeats.minute : null);
  const filteredOpenLine = useMemo(() => {
    const sorted = sortOpenLineForDisplay(matchesOpenLine, curMin);
    const deduped = dedupeByMatchId(sorted);
    return filterSimilarCatalogByOpenLine(deduped, openingLines, queryHalf);
  }, [matchesOpenLine, curMin, openingLines, queryHalf]);
  const filteredCatalog = useMemo(
    () => dedupeByMatchId(filterSimilarCatalogByOpenLine(matchesOpenLineCatalog, openingLines, queryHalf)),
    [matchesOpenLineCatalog, openingLines, queryHalf],
  );
  const filteredCatalogRuns = useMemo(
    () => dedupeByMatchId(filterSimilarCatalogByOpenLine(matchesOpenLineCatalogRuns, openingLines, queryHalf)),
    [matchesOpenLineCatalogRuns, openingLines, queryHalf],
  );
  const simColsOpenLine = toComparisonColumns(filteredOpenLine, 'open');
  const simColsCatalog = toComparisonColumns(filteredCatalog, 'catalog');
  const simColsCatalogRuns = toComparisonColumns(filteredCatalogRuns, 'catalogRuns');
  const hasAnySim =
    simColsOpenLine.length > 0
    || simColsCatalog.length > 0
    || simColsCatalogRuns.length > 0;

  const simHeadClass = (c: ComparisonColumn, firstInGroup: boolean) => {
    const base = `sticky top-0 z-20 w-28 min-w-[7rem] border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-center font-semibold ${headTint(c.label30)}`;
    if (c.rankGroup === 'open' && firstInGroup) {
      return `${base} border-l-2 border-l-indigo-400 dark:border-l-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40`;
    }
    if (c.rankGroup === 'catalog' && firstInGroup) {
      return `${base} border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40`;
    }
    if (c.rankGroup === 'catalogRuns' && firstInGroup) {
      return `${base} border-l-2 border-l-sky-400 dark:border-l-sky-500 bg-sky-50/80 dark:bg-sky-950/40`;
    }
    return base;
  };
  const simCellClass = (c: ComparisonColumn, firstInGroup: boolean) => {
    const base = `${simCell} ${colTint(c.label30)}`;
    if (c.rankGroup === 'open' && firstInGroup) {
      return `${base} border-l-2 border-l-indigo-400 dark:border-l-indigo-500`;
    }
    if (c.rankGroup === 'catalog' && firstInGroup) {
      return `${base} border-l-2 border-l-emerald-400 dark:border-l-emerald-500`;
    }
    if (c.rankGroup === 'catalogRuns' && firstInGroup) {
      return `${base} border-l-2 border-l-sky-400 dark:border-l-sky-500`;
    }
    return base;
  };

  // Dựng cột so sánh từ 1 trận "RAG số bàn theo hiệp" — ưu tiên cột RAG có sẵn (giàu dữ liệu),
  // nếu không thì cột tối thiểu (Ou13ChartModal tự fetch odds 1_3 theo matchId nên vẫn vẽ được).
  const buildHalfGoalCol = useCallback(
    (m: HalfGoalMatchRef, half: 1 | 2): ComparisonColumn => {
      const found = allSimilarById.get(m.matchId);
      if (found) {
        const built = toComparisonColumns([found], 'catalog')[0];
        if (built) return built;
      }
      return {
        key: `halfgoal-${m.matchId}`,
        isCurrent: false,
        rankGroup: 'catalog',
        matchId: m.matchId,
        team: m.home && m.away ? `${m.home} vs ${m.away}` : `Match ${m.matchId}`,
        ft: m.finalScore || m.ftStatus || '—',
        half,
        labelHalf: m.hasGoal,
      };
    },
    [allSimilarById],
  );

  // Danh sách cột để chuyển nhanh qua lại trong modal biểu đồ (trận đang xem + 3 nhóm RAG + pool số bàn theo hiệp).
  const chartNavCols = useMemo(() => {
    const base = [currentCol, ...simColsOpenLine, ...simColsCatalog, ...simColsCatalogRuns];
    const seen = new Set(base.map((c) => c.matchId).filter(Boolean));
    const half = (halfGoalStats?.half === 2 ? 2 : 1) as 1 | 2;
    const extra = (halfGoalStats?.matches ?? [])
      .filter((m) => m.matchId && !seen.has(m.matchId))
      .map((m) => buildHalfGoalCol(m, half));
    return [...base, ...extra];
  }, [currentCol, simColsOpenLine, simColsCatalog, simColsCatalogRuns, halfGoalStats, buildHalfGoalCol]);

  // Phạm vi điều hướng đang dùng: nhóm đã ghim (chartNav) hoặc danh sách tổng.
  const activeNav = chartNav ?? chartNavCols;

  /** Mở modal 📈 Xem cho trận trong top AI / bảng RAG — điều hướng theo danh sách tổng. */
  const openTopMatchChart = useCallback(
    (matchId: string) => {
      const inTable = chartNavCols.find((c) => c.matchId === matchId && !c.isCurrent);
      if (inTable) {
        setChartNav(null);
        setChartCol(inTable);
        return;
      }
      const found = allSimilarById.get(matchId);
      if (found) {
        const built = toComparisonColumns([found], 'catalog')[0];
        if (built) {
          setChartNav(null);
          setChartCol(built);
        }
      }
    },
    [chartNavCols, allSimilarById],
  );

  useEffect(() => {
    if (!initialChartMatchId || loading || initialChartOpenedRef.current) return;
    initialChartOpenedRef.current = true;
    openTopMatchChart(initialChartMatchId);
  }, [initialChartMatchId, loading, openTopMatchChart]);

  // Mở biểu đồ so sánh từ 1 danh sách "RAG số bàn theo hiệp" (pool đầy đủ HOẶC nhóm trùng kèo chấp).
  // GHIM điều hướng ◀▶ trong đúng `siblings` để so sánh xoay vòng chỉ trong nhóm đó.
  const openHalfGoalMatchChart = useCallback(
    (m: HalfGoalMatchRef, half: 1 | 2, siblings: HalfGoalMatchRef[]) => {
      const scope = siblings.map((s) => buildHalfGoalCol(s, half));
      const target = scope.find((c) => c.matchId === m.matchId) ?? buildHalfGoalCol(m, half);
      setChartNav(scope);
      setChartCol(target);
    },
    [buildHalfGoalCol],
  );

  /** Mở chart từ bảng RAG / cột trận đang xem — dùng danh sách điều hướng tổng (bỏ ghim nhóm). */
  const openChartGlobal = useCallback((c: ComparisonColumn) => {
    setChartNav(null);
    setChartCol(c);
  }, []);

  const renderSimTds = (render: (c: ComparisonColumn, cls: string) => React.ReactNode) => (
    <>
      {simColsOpenLine.map((c, i) => render(c, simCellClass(c, i === 0)))}
      {simColsCatalog.map((c, i) => render(c, simCellClass(c, i === 0)))}
      {simColsCatalogRuns.map((c, i) => render(c, simCellClass(c, i === 0)))}
    </>
  );
  const chartNavIdx = chartCol ? activeNav.findIndex((c) => c.key === chartCol.key) : -1;
  const gotoChart = (dir: -1 | 1) => {
    if (chartNavIdx < 0) return;
    const n = activeNav.length;
    setChartCol(activeNav[(chartNavIdx + dir + n) % n]);
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
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full sm:max-w-5xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-t-xl flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white">Tất cả tình huống tương tự</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span>Indigo: top vạch mở · xanh lá: catalog 1_3 cùng hiệp (note nếu 1_2 khác) · xanh dương: + thời gian vạch · kéo ngang</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-800 inline-block" /> CÓ BÀN</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-600 inline-block" /> không</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800 inline-block" /> chưa rõ</span>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none flex-shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {lineChangeBanner && (
            <div className="m-2 text-xs leading-snug px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800">
              <span className="font-semibold">Tự động khi đổi line 1_3:</span>{' '}
              H{lineChangeBanner.half} phút {lineChangeBanner.minute}&apos; — line{' '}
              {lineChangeBanner.prevHandicap} → {lineChangeBanner.newHandicap}. AI chọn top 5 trận
              khớp vạch mở + vạch tại thời điểm (1_3 và 1_2).
            </div>
          )}
          <SimilarMatchHowItWorks queryHalf={queryHalf} queryOpenOu13={queryOpenOu13} />
          <SimilarMatchLinksBanner links={savedLinks} />
          {openingLineNotice && (
            <div className="m-2 text-xs leading-snug px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="break-words">{openingLineNotice}</span>
            </div>
          )}
          <HalfGoalStatsPanel stats={halfGoalStats} onMatchClick={loading ? undefined : openHalfGoalMatchChart} />
          <AiSimilarEvalPanel
            ai={aiEvaluation}
            disabledReason={aiDisabledReason}
            label30ByTier={label30ByTier}
            labelHalfByTier={labelHalfByTier}
            onTopMatchClick={loading ? undefined : openTopMatchChart}
          />
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải tình huống tương tự và đánh giá AI…
            </div>
          ) : error ? (
            <div className="m-2 text-xs leading-snug px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          ) : !hasAnySim ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400 px-4">
              {openingLineNotice ?? 'Không tìm thấy tình huống tương tự (server có thể chưa nạp dataset).'}
            </div>
          ) : (
            <table className="border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th rowSpan={2} className={`${labelCell} sticky top-0 z-30 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 align-middle`}>Chỉ số</th>
                  <th rowSpan={2} className="sticky left-36 top-0 z-30 w-28 min-w-[7rem] bg-orange-100 dark:bg-orange-900/40 border-b border-r-2 border-orange-400 px-2 py-1 text-center text-orange-700 dark:text-orange-200 font-semibold align-middle">
                    <div className="truncate" title={currentCol.team}>{currentCol.team}</div>
                    <div className="text-[10px] font-normal">đang xem</div>
                  </th>
                  {simColsOpenLine.length > 0 && (
                    <th
                      colSpan={simColsOpenLine.length}
                      className="sticky top-0 z-[25] border-b border-l-2 border-l-indigo-400 dark:border-l-indigo-500 border-slate-200 dark:border-slate-700 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50"
                    >
                      Top {simColsOpenLine.length} · vạch mở hiệp 1_3
                      {queryOpenOu13 != null && (
                        <span className="block font-normal normal-case tracking-normal text-indigo-600/90 dark:text-indigo-400/90 mt-0.5">
                          Đang so {queryHalf === 1 ? 'H1' : 'H2'} mở {HCAP(queryOpenOu13)}
                          {' · '}{simColsOpenLine.length} trận · 1 cột/trận
                        </span>
                      )}
                    </th>
                  )}
                  {simColsCatalog.length > 0 && (
                    <th
                      colSpan={simColsCatalog.length}
                      className="sticky top-0 z-[25] border-b border-l-2 border-l-emerald-400 dark:border-l-emerald-500 border-slate-200 dark:border-slate-700 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50"
                    >
                      Tất cả trận · vạch mở 1_3 cùng hiệp
                      {queryOpenOu13 != null && (
                        <span className="block font-normal normal-case tracking-normal text-emerald-600/90 dark:text-emerald-400/90 mt-0.5">
                          Đang so {queryHalf === 1 ? 'H1' : 'H2'} mở {HCAP(queryOpenOu13)}
                          {' · '}{simColsCatalog.length} trận khớp
                          {' · '}chỉ hiện trận trùng vạch mở cùng hiệp
                        </span>
                      )}
                    </th>
                  )}
                  {simColsCatalogRuns.length > 0 && (
                    <th
                      colSpan={simColsCatalogRuns.length}
                      className="sticky top-0 z-[25] border-b border-l-2 border-l-sky-400 dark:border-l-sky-500 border-slate-200 dark:border-slate-700 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50"
                    >
                      Catalog + thời gian vạch gần giống
                      {queryOu13LineRuns && (
                        <span className="block font-normal normal-case tracking-normal text-sky-600/90 dark:text-sky-400/90 mt-0.5">
                          pattern {queryOu13LineRuns} · ±2p · {simColsCatalogRuns.length} trận
                        </span>
                      )}
                    </th>
                  )}
                </tr>
                <tr>
                  {simColsOpenLine.map((c, i) => (
                    <th key={c.key} className={simHeadClass(c, i === 0)}>
                      <div className="truncate" title={c.team}>{c.team}</div>
                      <div className="text-[10px] font-normal">30': {c.label30 == null ? 'chưa rõ' : c.label30 === 1 ? 'CÓ BÀN' : 'không'}</div>
                    </th>
                  ))}
                  {simColsCatalog.map((c, i) => (
                    <th key={c.key} className={simHeadClass(c, i === 0)}>
                      <div className="truncate" title={c.team}>{c.team}</div>
                      <div className="text-[10px] font-normal text-emerald-700 dark:text-emerald-300">
                        khớp {c.matchedOpenHalves ?? '—'}
                      </div>
                      {c.openAh12MismatchNote && (
                        <div
                          className="text-[9px] font-normal text-amber-700 dark:text-amber-300 mt-0.5 leading-tight"
                          title={c.openAh12MismatchNote}
                        >
                          ⚠ {c.openAh12MismatchNote}
                        </div>
                      )}
                    </th>
                  ))}
                  {simColsCatalogRuns.map((c, i) => (
                    <th key={c.key} className={simHeadClass(c, i === 0)}>
                      <SimColTeamName c={c} onOpenChart={loading ? undefined : openChartGlobal} />
                      <div className="text-[10px] font-normal text-sky-700 dark:text-sky-300">
                        Δ{c.lineRunsScore ?? '—'}p
                      </div>
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
                      onClick={() => openChartGlobal(currentCol)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-sans"
                      title="Xem biểu đồ odds Tài/Xỉu cả trận (1_3)"
                    >
                      📈 Xem
                    </button>
                  </td>
                  {renderSimTds((c, cls) => {
                    const rec = getLinkRecord(c);
                    return (
                      <td key={c.key} className={cls}>
                        {c.matchId ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              onClick={() => openChartGlobal(c)}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-sans"
                              title="Xem biểu đồ odds Tài/Xỉu cả trận (1_3)"
                            >
                              📈 Xem
                            </button>
                            <SimColNoteButton
                              linked={!!rec}
                              savedAt={rec?.ts}
                              onToggle={() => toggleSimilarLink(c)}
                            />
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    );
                  })}
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
                  <td className={labelCell}>Khớp vạch mở</td>
                  <td className={curCell}>
                    {openingLines
                      ? [
                          openingLines.h1OpenOu13 != null ? `1_3 H1 ${HCAP(openingLines.h1OpenOu13)}` : null,
                          openingLines.h2OpenOu13 != null ? `1_3 H2 ${HCAP(openingLines.h2OpenOu13)}` : null,
                          openingLines.h1OpenAh12 != null ? `1_2 H1 ${HCAP(openingLines.h1OpenAh12)}` : null,
                          openingLines.h2OpenAh12 != null ? `1_2 H2 ${HCAP(openingLines.h2OpenAh12)}` : null,
                        ].filter(Boolean).join(' · ') || '—'
                      : '—'}
                  </td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={cls}>
                      {formatCatalogOpenLineMatch(c, queryHalf)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={labelCell}>Vạch mở 1_3 / 1_2</td>
                  <td className={curCell}>—</td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={`${cls} text-[10px]`}>
                      {formatCatalogOpenLineForHalf(c, queryHalf)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={labelCell}>Thời gian vạch 1_3</td>
                  <td className={`${curCell} text-[10px]`}>{queryOu13LineRuns || '—'}</td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={`${cls} text-[10px]`}>
                      {c.rankGroup === 'catalogRuns' ? (c.ou13LineRuns ?? '—') : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={labelCell}>Độ giống (sim)</td>
                  <td className={curCell}>—</td>
                  {renderSimTds((c, cls) => (
                    <td key={c.key} className={`${cls} font-semibold`}>
                      {c.rankGroup === 'catalog' || c.rankGroup === 'catalogRuns'
                        ? '—'
                        : c.similarity != null
                          ? c.similarity.toFixed(2)
                          : '—'}
                    </td>
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
                <tr>
                  <td className={`${labelCell} text-amber-600 dark:text-amber-400 font-medium`}>Kết cục đến hết hiệp</td>
                  <td className={curCell}>—</td>
                  {renderSimTds((c, cls) => (
                    <td
                      key={c.key}
                      className={`${cls} font-semibold ${
                        c.labelHalf === 1
                          ? 'text-amber-600 dark:text-amber-400'
                          : c.labelHalf === 0
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {c.labelHalf == null ? 'chưa rõ' : c.labelHalf === 1 ? 'CÓ BÀN' : 'không'}
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
                  labelHalf: chartCol.labelHalf,
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
                  sourceMatchId: String(input.matchId),
                  team: chartCol.team,
                  ft: chartCol.ft,
                  half: chartCol.half === 2 ? 2 : chartCol.half === 1 ? 1 : undefined,
                  minute: chartCol.minute,
                  label: chartCol.label,
                  labelHalf: chartCol.labelHalf,
                  similarity: chartCol.similarity,
                  feats: chartCol.feats,
                  pinnedAt: 0,
                }
              : undefined
          }
          onPrev={activeNav.length > 1 ? () => gotoChart(-1) : undefined}
          onNext={activeNav.length > 1 ? () => gotoChart(1) : undefined}
          navPosition={chartNavIdx >= 0 ? { index: chartNavIdx, total: activeNav.length } : undefined}
          onClose={closeChart}
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
      matchId: String(p.liveMatch.id),
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

  const inlineSimilarQueryHalf = catalogQueryHalf(
    displayedHalf ?? displayResult?.queryFeatures?.half,
    displayResult?.queryFeatures,
  );
  const inlineSimilarOpenOu13 = catalogQueryOpenOu13(displayResult?.openingLines, inlineSimilarQueryHalf);
  const inlineSimilarMatches = useMemo(() => {
    if (!displayResult?.similarMatches.length) return [];
    return filterSimilarCatalogByOpenLine(
      displayResult.similarMatches as SimilarMatchFull[],
      displayResult.openingLines,
      inlineSimilarQueryHalf,
    );
  }, [displayResult?.similarMatches, displayResult?.openingLines, inlineSimilarQueryHalf]);

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

              {displayResult.openingLineNotice && (
                <div className="text-xs leading-snug px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  {displayResult.openingLineNotice}
                </div>
              )}

              {(inlineSimilarMatches.length > 0 || displayResult.openingLineNotice) && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Tình huống tương tự
                      <span className="ml-1 text-[10px] font-normal text-gray-400 dark:text-gray-500">
                        (1_3 {inlineSimilarQueryHalf === 1 ? 'H1' : 'H2'} mở
                        {inlineSimilarOpenOu13 != null ? ` ${HCAP(inlineSimilarOpenOu13)}` : ''} · bắt buộc trùng)
                      </span>
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
                  {inlineSimilarMatches.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Chưa có trận khớp vạch mở 1_3 cùng hiệp.</p>
                  ) : (
                  <div className="space-y-1">
                    {inlineSimilarMatches.slice(0, 5).map((s, i) => {
                      const openOu = inlineSimilarQueryHalf === 1 ? s.h1OpenOu13 : s.h2OpenOu13;
                      const openAh = inlineSimilarQueryHalf === 1 ? s.h1OpenAh12 : s.h2OpenAh12;
                      const sOu = s.features?.ou13_handicap;
                      const sAh = s.features?.ah12_handicap;
                      return (
                        <div key={i} className="flex justify-between items-center gap-2 text-xs bg-gray-50 dark:bg-slate-800 rounded px-2 py-1">
                          <span className="font-mono truncate min-w-0" title={`Match ${s.matchId}`}>
                            <span className="block truncate">
                              {s.home && s.away ? `${s.home} vs ${s.away}` : `Match ${s.matchId}`} · H{s.half} · phút {s.minute}
                            </span>
                            <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                              mở 1_3 {typeof openOu === 'number' ? HCAP(openOu) : '—'}
                              {typeof openAh === 'number' ? ` · 1_2 ${HCAP(openAh)}` : ''}
                              {' · '}T/X lúc đó {typeof sOu === 'number' ? HCAP(sOu) : '—'}
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
                  )}
                </div>
              )}

              {!displayResult.openingLineNotice && displayResult.similarMatches.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Không có tình huống tương tự (thiếu vạch mở 1_3 hoặc dataset trống).</p>
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
