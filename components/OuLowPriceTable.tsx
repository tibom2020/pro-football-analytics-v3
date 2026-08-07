/**
 * Bảng các phút kèo 1_3 / 1_6 có odds Tài ≤ 1.725.
 */
import React, { useMemo } from 'react';
import type { OverUnderMinuteSnapshot, ProcessedStats } from '../types';
import { encodeStatTimelineKey } from '../services/matchTimeline';
import { listOuLowOverRows, OU_LINE_DROP_PRICE_MAX } from '../services/ou-line-drop-alert';

interface Props {
  oddsHistory: OverUnderMinuteSnapshot[];
  h1OuOddsHistory: OverUnderMinuteSnapshot[];
  statsHistory?: Record<number, ProcessedStats>;
  /** Mốc stats live — bổ sung khi history chưa kịp ghi / tab mới mở. */
  liveHalf?: 1 | 2;
  liveMinute?: number;
  liveStats?: ProcessedStats | null;
}

function fmtShot(n: number | null): string {
  return n == null ? '—' : String(n);
}

export const OuLowPriceTable: React.FC<Props> = ({
  oddsHistory,
  h1OuOddsHistory,
  statsHistory,
  liveHalf,
  liveMinute,
  liveStats,
}) => {
  const mergedHistory = useMemo(() => {
    const base: Record<number, ProcessedStats> = { ...(statsHistory ?? {}) };
    if (
      liveStats &&
      liveHalf != null &&
      liveMinute != null &&
      Number.isFinite(liveMinute)
    ) {
      const key = encodeStatTimelineKey(liveHalf, liveMinute);
      base[key] = liveStats;
    }
    return base;
  }, [statsHistory, liveHalf, liveMinute, liveStats]);

  const rows = useMemo(
    () => listOuLowOverRows(oddsHistory, h1OuOddsHistory, mergedHistory),
    [oddsHistory, h1OuOddsHistory, mergedHistory],
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
        Tài ≤ {OU_LINE_DROP_PRICE_MAX} · 1_3 / 1_6
      </h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
        Các phút có giá Tài đạt ngưỡng. OT / Sút = từ đầu hiệp tới phút đó (gần nhất trong
        stats đã ghi).
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
          Chưa có phút nào Tài ≤ {OU_LINE_DROP_PRICE_MAX}
        </p>
      ) : (
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-1.5 pr-2 font-semibold">Phút</th>
                <th className="py-1.5 pr-2 font-semibold">Market</th>
                <th className="py-1.5 pr-2 font-semibold">Line</th>
                <th className="py-1.5 pr-2 font-semibold">Giá Tài</th>
                <th className="py-1.5 pr-2 font-semibold" title="Sút trúng đích (2 đội) từ đầu hiệp">
                  OT
                </th>
                <th className="py-1.5 font-semibold" title="Tổng cú sút (on+off, 2 đội) từ đầu hiệp">
                  Sút
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800 dark:text-slate-200">
              {rows.map((r) => (
                <tr
                  key={`${r.marketId}-${r.half}-${r.minute}-${r.handicap}-${r.over}`}
                  className="border-b border-slate-50 dark:border-slate-800/80"
                >
                  <td className="py-1.5 pr-2 font-medium tabular-nums whitespace-nowrap">
                    H{r.half} · {r.minute}&apos;
                  </td>
                  <td className="py-1.5 pr-2">
                    <span
                      className={
                        r.marketId === '1_6'
                          ? 'text-violet-600 dark:text-violet-400 font-semibold'
                          : 'text-amber-700 dark:text-amber-400 font-semibold'
                      }
                    >
                      {r.marketId}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.handicap.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                    {r.over.toFixed(3)}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{fmtShot(r.onTarget)}</td>
                  <td className="py-1.5 tabular-nums">{fmtShot(r.totalShots)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
