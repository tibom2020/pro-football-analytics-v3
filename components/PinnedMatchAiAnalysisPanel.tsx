import React from 'react';
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import type { PinnedChart } from '../services/pinned-charts';
import {
  PINNED_DIM_LABEL,
  SIMILARITY_LEVEL_LABEL,
  type PinnedAnalyzeResponse,
} from '../services/pinned-ai-analysis';
import { formatPinnedAnalysisTime } from '../services/pinned-ai-analysis-store';

const LEVEL_CLS: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600',
};

function scoreBar(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-slate-400';
}

export const PinnedMatchAiAnalysisPanel: React.FC<{
  pin: PinnedChart;
  loading?: boolean;
  error?: string | null;
  data?: PinnedAnalyzeResponse | null;
  savedAt?: number | null;
  onClose: () => void;
  onRefresh?: () => void;
}> = ({ pin, loading, error, data, savedAt, onClose, onRefresh }) => {
  const analysis = data?.analysis;
  const disabled = data?.aiDisabledReason;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[85] bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
              AI phân tích trận ghim
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={pin.team}>
              {pin.team}
              {pin.half != null ? ` · H${pin.half} ${pin.minute ?? '—'}'` : ''}
              {savedAt && !loading && (
                <span className="text-violet-500 dark:text-violet-400">
                  {' · '}đã lưu {formatPinnedAnalysisTime(savedAt)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onRefresh && !loading && (
              <button
                type="button"
                onClick={onRefresh}
                className="text-[10px] px-2 py-1 rounded-md border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30"
                title="Gọi DeepSeek phân tích lại (ghi đè bản đã lưu)"
              >
                Phân tích lại
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              DeepSeek đang so sánh kèo, line chạy, áp lực, sút bóng…
            </div>
          )}

          {!loading && error && (
            <div className="text-xs leading-snug px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {!loading && !error && disabled && !analysis && (
            <div className="text-xs px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              Đánh giá AI không khả dụng: {disabled}
            </div>
          )}

          {!loading && data && (data.source.scoreAtMinute || data.pinned.scoreAtMinute) && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Tổng bàn tại H{data.source.half} {data.source.minute}′
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span>
                  <span className="text-slate-500 dark:text-slate-400">Đang xem: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {data.source.scoreAtMinute ?? '—'}
                  </span>
                </span>
                <span>
                  <span className="text-slate-500 dark:text-slate-400">Ghim: </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {data.pinned.scoreAtMinute ?? '—'}
                  </span>
                  {data.pinned.ftScore && (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      {' '}(FT {data.pinned.ftScore})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {!loading && data?.quantitative && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1 px-1">
              {data.quantitative.openLineMatch != null && (
                <span>Vạch mở 1_3: {data.quantitative.openLineMatch ? 'trùng' : 'khác'}</span>
              )}
              {data.quantitative.lineRunsMatch != null && (
                <span>Line chạy: {data.quantitative.lineRunsMatch ? 'khớp' : 'lệch'}</span>
              )}
              {data.quantitative.lineRunsScore != null && Number.isFinite(data.quantitative.lineRunsScore) && (
                <span>Δ pattern: {data.quantitative.lineRunsScore}p</span>
              )}
              {data.quantitative.ragSimilarity != null && (
                <span>sim RAG: {data.quantitative.ragSimilarity.toFixed(2)}</span>
              )}
            </div>
          )}

          {!loading && analysis && (
            <>
              <div className="flex items-center gap-3">
                <div
                  className={`text-3xl font-bold tabular-nums ${
                    analysis.similarityLevel === 'high'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : analysis.similarityLevel === 'medium'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {analysis.similarityScore}
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${LEVEL_CLS[analysis.similarityLevel]}`}
                >
                  {SIMILARITY_LEVEL_LABEL[analysis.similarityLevel]}
                </span>
              </div>

              {analysis.dimensions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Theo từng khía cạnh
                  </div>
                  {analysis.dimensions.map((d, i) => (
                    <div key={`${d.key}-${i}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {PINNED_DIM_LABEL[d.key] ?? d.key}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{d.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${scoreBar(d.score)}`} style={{ width: `${d.score}%` }} />
                      </div>
                      <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">{d.summaryVi}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.highlightsVi.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">
                    Điểm giống
                  </div>
                  <ul className="text-[11px] leading-snug text-slate-700 dark:text-slate-300 space-y-0.5 list-disc pl-4">
                    {analysis.highlightsVi.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.differencesVi.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
                    Điểm khác
                  </div>
                  <ul className="text-[11px] leading-snug text-slate-700 dark:text-slate-300 space-y-0.5 list-disc pl-4">
                    {analysis.differencesVi.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-1">
                  Kết luận
                </div>
                <p className="text-[12px] leading-snug text-violet-900 dark:text-violet-100">{analysis.conclusionVi}</p>
              </div>

              {analysis.model && (
                <div className="text-[9px] text-slate-400 dark:text-slate-500 text-right">
                  {analysis.model}
                  {analysis.durationMs != null ? ` · ${analysis.durationMs}ms` : ''}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
