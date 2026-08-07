/**
 * Tự gọi /similar/evaluate tại mốc H1 10' và H2 52' (hoặc chụp muộn khi mở trận).
 * Hiện tắt qua `AUTO_SIMILAR_CLOCK_ENABLED` trong similar-match-snapshots.
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { MatchInfo } from '../types';
import type { PredictGoalInput } from '../services/goal-prediction';
import { fetchSimilarMatchesWithAi } from '../services/goal-prediction';
import { resolveMatchClockContext } from '../services/matchTimeline';
import {
  appendSimilarMatchSnapshot,
  hasAutoSimilarForSlot,
  loadSimilarMatchSnapshots,
  planAutoSimilarCaptures,
  type AutoSimilarCapturePlan,
  type AutoSimilarSlot,
  type SessionJoinClock,
} from '../services/similar-match-snapshots';

export function useSessionJoinClock(
  matchId: string,
  clock: { half: 1 | 2; minute: number },
): MutableRefObject<SessionJoinClock | null> {
  const joinRef = useRef<SessionJoinClock | null>(null);
  const matchRef = useRef<string | null>(null);
  if (matchRef.current !== matchId) {
    matchRef.current = matchId;
    joinRef.current = { half: clock.half, minute: clock.minute };
  }
  return joinRef;
}

function bumpBusy(
  busyCountRef: MutableRefObject<number>,
  setBusy: (v: boolean) => void,
  delta: number,
): void {
  busyCountRef.current = Math.max(0, busyCountRef.current + delta);
  setBusy(busyCountRef.current > 0);
}

export function useAutoSimilarCapture(
  matchId: string,
  liveMatch: MatchInfo,
  input: PredictGoalInput,
  clockCtx: ReturnType<typeof resolveMatchClockContext>,
  sessionJoinRef: MutableRefObject<SessionJoinClock | null>,
): { busy: boolean } {
  const inputRef = useRef(input);
  inputRef.current = input;
  const liveMatchRef = useRef(liveMatch);
  liveMatchRef.current = liveMatch;

  /** Slot đang fetch hoặc đã kick off — tránh gọi lặp khi poll stats/odds cùng phút. */
  const busySlotsRef = useRef<Set<AutoSimilarSlot>>(new Set());
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const busyCountRef = useRef(0);
  const [busy, setBusy] = useState(false);

  const runPlan = useCallback(
    async (plan: AutoSimilarCapturePlan): Promise<void> => {
      const existing = loadSimilarMatchSnapshots(matchId);
      if (hasAutoSimilarForSlot(existing, plan.slot)) {
        busySlotsRef.current.delete(plan.slot);
        return;
      }

      bumpBusy(busyCountRef, setBusy, 1);
      try {
        const r = await fetchSimilarMatchesWithAi(inputRef.current, 20);
        const ts = Date.now();
        const score = liveMatchRef.current.ss || '0-0';
        const payload = {
          autoSlot: plan.slot,
          trigger: 'clock' as const,
          scheduledHalf: plan.scheduledHalf,
          scheduledMinute: plan.scheduledMinute,
          lateCapture: plan.lateCapture,
          half: plan.captureHalf,
          minute: plan.captureMinute,
          ts,
          score,
        };

        if (r.ok === false) {
          const { saved } = appendSimilarMatchSnapshot(matchId, { ...payload, error: r.error });
          if (!saved) busySlotsRef.current.delete(plan.slot);
          return;
        }

        const { saved } = appendSimilarMatchSnapshot(matchId, { ...payload, data: r.data });
        if (!saved) busySlotsRef.current.delete(plan.slot);
      } finally {
        bumpBusy(busyCountRef, setBusy, -1);
      }
    },
    [matchId],
  );

  useEffect(() => {
    busySlotsRef.current.clear();
    chainRef.current = Promise.resolve();
    busyCountRef.current = 0;
    setBusy(false);
  }, [matchId]);

  useEffect(() => {
    const ttStr = String(liveMatch.timer?.tt ?? '');
    if (ttStr === '3' || ttStr === '4' || clockCtx.isFt) return;

    const snapshots = loadSimilarMatchSnapshots(matchId);
    const plans = planAutoSimilarCaptures(clockCtx, sessionJoinRef.current, snapshots);
    if (plans.length === 0) return;

    for (const plan of plans) {
      if (hasAutoSimilarForSlot(snapshots, plan.slot)) continue;
      if (busySlotsRef.current.has(plan.slot)) continue;
      busySlotsRef.current.add(plan.slot);

      chainRef.current = chainRef.current
        .then(() => runPlan(plan))
        .catch((e) => {
          busySlotsRef.current.delete(plan.slot);
          console.warn('[auto-similar] capture failed', plan.slot, e);
        });
    }
  }, [
    matchId,
    liveMatch.timer?.tt,
    clockCtx.half,
    clockCtx.minute,
    clockCtx.isFt,
    runPlan,
    sessionJoinRef,
  ]);

  return { busy };
}
