import { useEffect, useState } from 'react';
import { startMatchV2Capture, stopMatchV2Capture } from '../services/match-v2-capture';
import { isMatchV2CaptureEnabled } from '../services/match-v2-feature';

export type MatchV2CaptureUiStatus = 'idle' | 'starting' | 'saving' | 'error' | 'disabled';

/**
 * Mở tab trận → POST /api/match-v2/start (local DEV bật mặc định; prod tắt).
 * Đóng tab / đổi trận → stop matchId trước đó.
 * Production: không gọi API trừ khi VITE_FEATURE_MATCH_V2=true.
 */
export function useMatchV2AutoCapture(input: {
  matchId: string;
  home?: string;
  away?: string;
  league?: string;
  b365Token?: string;
}): { status: MatchV2CaptureUiStatus; error: string | null } {
  const enabled = isMatchV2CaptureEnabled();
  const [status, setStatus] = useState<MatchV2CaptureUiStatus>(enabled ? 'idle' : 'disabled');
  const [error, setError] = useState<string | null>(null);

  const matchId = String(input.matchId || '');
  const home = input.home ?? '';
  const away = input.away ?? '';
  const league = input.league ?? '';
  const b365Token = input.b365Token ?? '';

  useEffect(() => {
    if (!enabled || !matchId) {
      setStatus(enabled ? 'idle' : 'disabled');
      setError(null);
      return;
    }

    let cancelled = false;
    setStatus('starting');
    setError(null);

    void (async () => {
      const result = await startMatchV2Capture({
        matchId,
        home: home || undefined,
        away: away || undefined,
        league: league || undefined,
        b365Token: b365Token || undefined,
      });
      if (cancelled) {
        // Đã unmount / đổi trận — dừng collector vừa start (nếu thành công).
        if (result.ok) void stopMatchV2Capture(matchId);
        return;
      }
      if (result.ok) {
        setStatus('saving');
        setError(null);
      } else {
        setStatus('error');
        setError(result.error);
      }
    })();

    return () => {
      cancelled = true;
      void stopMatchV2Capture(matchId);
    };
    // Chỉ re-run khi đổi trận / token — tên đội ổn định theo matchId lúc mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid restart on every live name tick
  }, [enabled, matchId, b365Token]);

  return { status, error };
}
