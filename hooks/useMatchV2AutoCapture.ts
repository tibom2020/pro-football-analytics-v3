import { useEffect, useState } from 'react';
import { startMatchV2Capture, stopMatchV2Capture } from '../services/match-v2-capture';

export type MatchV2CaptureUiStatus = 'idle' | 'starting' | 'saving' | 'error';

/**
 * Mở tab trận → POST /api/match-v2/start.
 * Đóng tab / đổi trận → stop matchId trước đó.
 * Không chặn UI nếu server AI tắt.
 */
export function useMatchV2AutoCapture(input: {
  matchId: string;
  home?: string;
  away?: string;
  league?: string;
  b365Token?: string;
}): { status: MatchV2CaptureUiStatus; error: string | null } {
  const [status, setStatus] = useState<MatchV2CaptureUiStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const matchId = String(input.matchId || '');
  const home = input.home ?? '';
  const away = input.away ?? '';
  const league = input.league ?? '';
  const b365Token = input.b365Token ?? '';

  useEffect(() => {
    if (!matchId) return;

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
  }, [matchId, b365Token]);

  return { status, error };
}
