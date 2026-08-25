import { useCallback, useEffect, useRef, useState } from 'react';

export function formatCountdownSeconds(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Đếm ngược tới lần poll tiếp theo. Gọi `markRefreshed()` sau mỗi lần fetch xong.
 * Tab ẩn: đóng băng đếm (khớp logic poll trang chủ).
 */
export function usePollCountdown(options: {
  intervalMs: number;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
}) {
  const { intervalMs, enabled = true, pauseWhenHidden = true } = options;
  const intervalSec = Math.max(1, Math.ceil(intervalMs / 1000));

  const deadlineRef = useRef(Date.now() + intervalMs);
  const hiddenAtRef = useRef<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(intervalSec);
  const [paused, setPaused] = useState(false);

  const markRefreshed = useCallback(() => {
    deadlineRef.current = Date.now() + intervalMs;
    setSecondsLeft(intervalSec);
    setPaused(false);
  }, [intervalMs, intervalSec]);

  useEffect(() => {
    if (!enabled) return;
    markRefreshed();
  }, [enabled, intervalMs, markRefreshed]);

  useEffect(() => {
    if (!enabled) return;

    const sync = () => {
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        if (hiddenAtRef.current == null) hiddenAtRef.current = Date.now();
        setPaused(true);
        return;
      }

      if (hiddenAtRef.current != null) {
        const hiddenMs = Date.now() - hiddenAtRef.current;
        deadlineRef.current += hiddenMs;
        hiddenAtRef.current = null;
      }
      setPaused(false);

      const left = Math.max(0, (deadlineRef.current - Date.now()) / 1000);
      setSecondsLeft(left);
    };

    sync();
    const id = window.setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [enabled, pauseWhenHidden]);

  const progress =
    intervalSec > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / intervalSec)) : 0;

  return {
    secondsLeft,
    label: formatCountdownSeconds(secondsLeft),
    progress,
    paused,
    markRefreshed,
    intervalSec,
  };
}
