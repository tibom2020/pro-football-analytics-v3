import { useCallback, useEffect, useRef, useState } from 'react';
import { formatCountdownSeconds } from './usePollCountdown';

/**
 * Đếm thời gian đã trôi qua kể từ lần `markStart()` gần nhất.
 * Tab ẩn: tạm dừng (không cộng thời gian).
 */
export function useElapsedSince(options?: {
  enabled?: boolean;
  pauseWhenHidden?: boolean;
}) {
  const { enabled = true, pauseWhenHidden = true } = options ?? {};
  const startAtRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);

  const markStart = useCallback(() => {
    startAtRef.current = Date.now();
    hiddenAtRef.current = null;
    setStarted(true);
    setElapsedSec(0);
    setPaused(false);
  }, []);

  useEffect(() => {
    if (!enabled || !started || startAtRef.current == null) return;

    const sync = () => {
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        if (hiddenAtRef.current == null) hiddenAtRef.current = Date.now();
        setPaused(true);
        return;
      }

      if (hiddenAtRef.current != null) {
        startAtRef.current += Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
      }
      setPaused(false);
      setElapsedSec(Math.max(0, (Date.now() - startAtRef.current) / 1000));
    };

    sync();
    const id = window.setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [enabled, started, pauseWhenHidden]);

  return {
    elapsedSec,
    label: started ? formatCountdownSeconds(elapsedSec) : '—',
    paused,
    started,
    markStart,
  };
}
