import React from 'react';
import { MatchInfo } from '../types';
import { Clock, Star, Activity } from 'lucide-react';

interface MatchListProps {
  events: MatchInfo[];
  onOpenAnalysisInNewTab: (match: MatchInfo) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  favorites: string[];
  onToggleFavorite: (matchId: string, e: React.MouseEvent) => void;
}

export const MatchList: React.FC<MatchListProps> = ({
  events,
  onOpenAnalysisInNewTab,
  isLoading,
  favorites,
  onToggleFavorite,
  searchQuery,
}) => {
  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400 animate-pulse font-medium">Đang tải dữ liệu trực tiếp...</div>;
  }

  const processedEvents = events.map((match) => {
    let tm = match.timer?.tm || 0;
    if (tm === 0 && match.time) {
      const parsed = parseInt(match.time.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) tm = parsed;
    }
    return { ...match, parsedTm: tm };
  });

  const sortedEvents = processedEvents.sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return b.parsedTm - a.parsedTm;
  });

  const renderCard = (event: MatchInfo) => {
    const isFavorite = favorites.includes(event.id);
    return (
      <div
        key={event.id}
        onClick={() => onOpenAnalysisInNewTab(event)}
        className={`${isFavorite ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/50' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'} rounded-xl p-3 shadow-sm border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 relative flex flex-col group`}
      >
        <button onClick={(e) => onToggleFavorite(event.id, e)} className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500 fill-yellow-500 opacity-100' : 'text-slate-300 dark:text-slate-500 hover:text-yellow-400'}`} />
        </button>
        {isFavorite && <Star className="absolute top-2 right-2 p-1 w-6 h-6 text-yellow-500 fill-yellow-500 md:hidden z-10" />}
        <div className="mb-2 pr-6">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider line-clamp-1">{event.league.name}</span>
        </div>
        <div className="space-y-1.5 mb-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[13px] text-red-600 dark:text-red-400 line-clamp-1 pr-2 flex-1">{event.home.name}</span>
            <span className="font-bold text-sm bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-900 dark:text-white shrink-0">{event.ss ? event.ss.split('-')[0] : '0'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[13px] text-orange-600 dark:text-orange-400 line-clamp-1 pr-2 flex-1">{event.away.name}</span>
            <span className="font-bold text-sm bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-900 dark:text-white shrink-0">{event.ss ? event.ss.split('-')[1] : '0'}</span>
          </div>
        </div>
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
            <Clock className="w-2.5 h-2.5 mr-1" />{event.timer?.tm || event.time || '0'}'
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="bg-[#FDFCF8] dark:bg-slate-800 p-4 rounded-2xl border border-gray-300 dark:border-slate-600 shadow-sm flex items-center justify-between max-w-xs">
        <div>
          <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Trận trực tiếp</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{events.length}</div>
        </div>
        <Activity className="w-6 h-6 text-blue-500" />
      </div>

      {sortedEvents.length === 0 && searchQuery ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-300 dark:border-slate-700">
          <p className="font-semibold text-lg">Không tìm thấy trận đấu</p>
          <p className="text-sm mt-1">Thử từ khóa khác thay cho &quot;{searchQuery}&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedEvents.map(renderCard)}
        </div>
      )}
    </div>
  );
};
