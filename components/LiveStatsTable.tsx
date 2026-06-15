
import React, { useMemo } from 'react';
import { MatchInfo, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot } from '../types';
import { parseStats } from '../services/api';

interface LiveStatsTableProps {
  liveMatch: MatchInfo;
  oddsHistory: OverUnderMinuteSnapshot[];
  homeOddsHistory: AsianHandicapMinuteSnapshot[];
  apiChartData: { minute: number; homeApi: number; awayApi: number; half?: number }[];
  h1HomeOddsHistory: AsianHandicapMinuteSnapshot[];
  h1OverUnderOddsHistory: OverUnderMinuteSnapshot[];
}

/** Ưu tiên hiệp sau + phút lớn hơn (H2 từ 45' tách khỏi bù giờ H1). */
const getLatestOdd = <T extends { minute: number; half?: number }>(history: T[]): T | null => {
  if (!history || history.length === 0) return null;
  const rank = (x: T) => (x.half === 2 ? 200 : 0) + x.minute;
  return history.reduce((latest, current) => (rank(current) >= rank(latest) ? current : latest), history[0]);
};

export const LiveStatsTable: React.FC<LiveStatsTableProps> = ({
  liveMatch,
  oddsHistory,
  homeOddsHistory,
  apiChartData,
  h1HomeOddsHistory,
  h1OverUnderOddsHistory,
}) => {
  
  const latestOdds = useMemo(() => getLatestOdd(oddsHistory), [oddsHistory]);
  const latestHomeOdds = useMemo(() => getLatestOdd(homeOddsHistory), [homeOddsHistory]);
  const latestH1HomeOdds = useMemo(() => getLatestOdd(h1HomeOddsHistory), [h1HomeOddsHistory]);
  const latestH1OverUnderOdds = useMemo(() => getLatestOdd(h1OverUnderOddsHistory), [h1OverUnderOddsHistory]);

  const latestApiScores = useMemo(() => {
    if (apiChartData.length === 0) return null;
    return apiChartData[apiChartData.length - 1]; // ApiChartData is usually sorted by time in dashboard
  }, [apiChartData]);

  const liveParsedStats = useMemo(() => parseStats(liveMatch.stats), [liveMatch.stats]);

  const formatOdds = (handicap: string | number | undefined, odds: number | undefined) => {
    if (handicap === undefined || handicap === null || odds === undefined) return '-';
    const h = typeof handicap === 'number' ? handicap : parseFloat(handicap);
    if (!Number.isFinite(h) || !Number.isFinite(odds)) return '-';
    return `${h.toFixed(2)} (${odds.toFixed(2)})`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 mt-4 transition-colors duration-300">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Thống kê trực tiếp</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <StatItem label="HDP Đội nhà" value={formatOdds(latestHomeOdds?.handicap, latestHomeOdds?.home)} />
        <StatItem label="HDP Tài/Xỉu" value={formatOdds(latestOdds?.handicap, latestOdds?.over)} />
        <StatItem label="HDP Đội nhà H1" value={formatOdds(latestH1HomeOdds?.handicap, latestH1HomeOdds?.home)} />
        <StatItem label="HDP T/X H1" value={formatOdds(latestH1OverUnderOdds?.handicap, latestH1OverUnderOdds?.over)} />
        <StatItem label="API Đội nhà" value={latestApiScores?.homeApi ? latestApiScores.homeApi.toFixed(1) : '-'} color="text-blue-600 dark:text-blue-400" />
        <StatItem label="API Đội khách" value={latestApiScores?.awayApi ? latestApiScores.awayApi.toFixed(1) : '-'} color="text-orange-600 dark:text-orange-400" />
        <StatItem
          label="xG đội nhà"
          value={liveParsedStats.xg != null ? liveParsedStats.xg[0].toFixed(2) : '—'}
          color="text-emerald-700 dark:text-emerald-400"
        />
        <StatItem
          label="xG đội khách"
          value={liveParsedStats.xg != null ? liveParsedStats.xg[1].toFixed(2) : '—'}
          color="text-teal-700 dark:text-teal-400"
        />
        <StatItem
          label="Sút không trúng đích (nhà)"
          value={String(liveParsedStats.off_target[0])}
          color="text-slate-700 dark:text-slate-300"
        />
        <StatItem
          label="Sút không trúng đích (khách)"
          value={String(liveParsedStats.off_target[1])}
          color="text-slate-700 dark:text-slate-300"
        />
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 last:border-b-0 py-1">
    <span className="text-gray-500 dark:text-gray-400 font-medium">{label}:</span>
    <span className={`font-bold ${color || 'text-gray-800 dark:text-gray-200'}`}>{value}</span>
  </div>
);
