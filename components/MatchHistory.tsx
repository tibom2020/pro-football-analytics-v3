import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MatchInfo, ViewedMatchHistory, HistoryItem } from '../types';
import { Clock, ChevronRight, Trash2, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { VIEWED_MATCHES_HISTORY_UPDATED_EVENT, matchMdAutosavedKey } from '../services/match-markdown-export';
import { saveMatchMarkdown } from '../services/save-match-history-md';

interface MatchHistoryProps {
  onSelectMatch: (match: MatchInfo) => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onSelectMatch }) => {
  const [history, setHistory] = useState<ViewedMatchHistory>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());

  const refreshExportedIds = useCallback(() => {
    const ids = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('matchMdAutoSaved_') || !localStorage.getItem(k)) continue;
      ids.add(k.slice('matchMdAutoSaved_'.length));
    }
    setExportedIds(ids);
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      const storedHistory = localStorage.getItem('viewedMatchesHistory');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (error) {
      console.error('Failed to load history', error);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    refreshExportedIds();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'viewedMatchesHistory' || e.key === null) loadFromStorage();
      if (!e.key || e.key.startsWith('matchMdAutoSaved_')) refreshExportedIds();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(VIEWED_MATCHES_HISTORY_UPDATED_EVENT, loadFromStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(VIEWED_MATCHES_HISTORY_UPDATED_EVENT, loadFromStorage);
    };
  }, [loadFromStorage, refreshExportedIds]);

  const sortedHistory = useMemo(
    () => Object.values(history).sort((a: HistoryItem, b: HistoryItem) => b.viewedAt - a.viewedAt),
    [history],
  );

  const handleClearHistory = () => {
    if (window.confirm('Xóa toàn bộ lịch sử các trận đã xem?')) {
      localStorage.removeItem('viewedMatchesHistory');
      setHistory({});
    }
  };

  const handleExportMd = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    setSavingId(matchId);
    try {
      const { ok } = await saveMatchMarkdown(matchId);
      if (!ok) {
        window.alert('Không có dữ liệu lịch sử. Hãy mở trận trong phân tích trước.');
        return;
      }
      try { localStorage.setItem(matchMdAutosavedKey(matchId), '1'); } catch { /* ignore */ }
      refreshExportedIds();
    } finally {
      setSavingId(null);
    }
  };

  if (sortedHistory.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p className="font-semibold">Lịch sử trống</p>
        <p className="text-sm mt-1">Các trận bạn xem phân tích sẽ được lưu tại đây.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      <div className="flex justify-end mb-4">
        <button onClick={handleClearHistory} className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 px-3 py-1.5 rounded-md font-semibold">
          <Trash2 className="w-3.5 h-3.5" /> Xóa lịch sử
        </button>
      </div>
      {sortedHistory.map(({ match, viewedAt }) => {
        const isLive = match.timer && parseInt(match.timer.tt) !== 1;
        return (
          <div key={match.id} onClick={() => onSelectMatch(match)} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md truncate max-w-[70%]">{match.league.name}</span>
              <div className={`flex items-center text-xs font-bold ${isLive ? 'text-red-500' : 'text-gray-500'}`}>
                <Clock className="w-3 h-3 mr-1" />{isLive ? `${match.timer?.tm || match.time}'` : 'FT'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-right pr-3"><div className="font-bold text-gray-900 dark:text-white">{match.home.name}</div></div>
              <div className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-lg font-mono font-bold text-lg">{match.ss || '0-0'}</div>
              <div className="flex-1 text-left pl-3"><div className="font-bold text-gray-900 dark:text-white">{match.away.name}</div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 justify-between items-center text-[10px] text-gray-400 uppercase tracking-wider">
              <span>Đã xem: {new Date(viewedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="flex items-center gap-2 ml-auto">
                {exportedIds.has(match.id) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold normal-case bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Đã xuất
                  </span>
                )}
                <button type="button" onClick={(e) => void handleExportMd(e, match.id)} disabled={savingId === match.id} className="flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold normal-case text-[11px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 disabled:opacity-50">
                  {savingId === match.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {isLive ? 'Lưu .md' : exportedIds.has(match.id) ? 'Xuất lại' : 'Xuất .md'}
                </button>
                <span className="flex items-center font-semibold text-blue-500 normal-case cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectMatch(match); }}>
                  Mở lại <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
