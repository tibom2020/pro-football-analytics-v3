/**
 * HermesConnectButton — Nút kết nối Hermes Agent (Tí Nị) trong PFA.
 *
 * Khi bấm:
 *   1. Gọi POST /api/hermes/subscribe → PFA server bắt đầu theo dõi trận
 *   2. Hiển thị trạng thái "Đang theo dõi" với indicator xanh
 *   3. Có thể ngừng theo dõi bất cứ lúc nào
 *
 * Hermes Agent sẽ tự động poll snapshot mỗi 45s và phân tích khi có biến động.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AI_SERVER_URL } from '../services/ai-service';

interface Props {
  matchId: string;
  homeName?: string;
  awayName?: string;
  leagueName?: string;
}

type Status = 'idle' | 'connecting' | 'connected' | 'error';

export const HermesConnectButton: React.FC<Props> = ({ matchId, homeName, awayName, leagueName }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lấy B365 token từ storage
  const getB365Token = useCallback((): string => {
    try {
      return localStorage.getItem('b365_token') || sessionStorage.getItem('b365_token') || '';
    } catch {
      return '';
    }
  }, []);

  // Poll event log khi đang connected
  useEffect(() => {
    if (status !== 'connected') {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const pollEvents = async () => {
      try {
        const res = await fetch(`${AI_SERVER_URL}/api/hermes/events/${matchId}`);
        if (!res.ok) return;
        const data = await res.json() as { events: Array<{ type: string; minute: number; data: Record<string, unknown> }> };
        const events = data.events;
        if (events.length > 0) {
          const latest = events[events.length - 1];
          const labels: Record<string, string> = {
            goal: '⚽ Bàn thắng',
            on_target: '🎯 Sút trúng đích',
            red_card: '🔴 Thẻ đỏ',
            corner: '📐 Phạt góc',
            line_change: '📉 Line change',
            half_time: '🔄 Hết hiệp 1',
            full_time: '🏁 Kết thúc',
          };
          setLastEvent(`${labels[latest.type] ?? latest.type} (phút ${latest.minute}')`);
        }
      } catch {
        // silent
      }
    };

    pollEvents();
    pollRef.current = setInterval(pollEvents, 10000); // poll event mỗi 10s

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, matchId]);

  const handleConnect = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');
    try {
      const b365Token = getB365Token();
      const res = await fetch(`${AI_SERVER_URL}/api/hermes/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          home: homeName,
          away: awayName,
          league: leagueName,
          b365Token: b365Token || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setStatus('connected');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [matchId, homeName, awayName, leagueName]);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch(`${AI_SERVER_URL}/api/hermes/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
    } catch {
      // silent
    }
    setStatus('idle');
    setLastEvent(null);
  }, [matchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── RENDER ────────────────────────────────────────────────

  if (status === 'connected') {
    return (
      <div className="group relative">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/30 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-sm border border-green-500/30 dark:border-green-700/50">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs font-medium">Hermes</span>
          {lastEvent && (
            <span className="text-[10px] text-green-600 dark:text-green-500 truncate max-w-[100px]">
              {lastEvent}
            </span>
          )}
        </div>
        {/* Tooltip disconnect */}
        <button
          onClick={handleDisconnect}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Ngừng theo dõi"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={status === 'connecting'}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors shrink-0"
      title={errorMsg || 'Kết nối Hermes Agent để tự động phân tích trận đấu'}
    >
      {status === 'connecting' ? (
        <>
          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Đang kết nối...
        </>
      ) : status === 'error' ? (
        <>
          <span className="text-red-300">⚠️</span>
          Thử lại
        </>
      ) : (
        <>
          <span className="text-base leading-none">🤖</span>
          Hermes
        </>
      )}
    </button>
  );
};