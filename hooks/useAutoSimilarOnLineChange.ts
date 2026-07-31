/**
 * Tự gọi /similar/evaluate khi line kèo 1_3 đổi (vd 3 → 2.75).
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { MatchInfo, OverUnderMinuteSnapshot } from '../types';
import type { PredictGoalInput } from '../services/goal-prediction';
import { fetchSimilarMatchesWithAi } from '../services/goal-prediction';
import { advanceOu13LineBaseline, lineChangeSlot, type Ou13LatestLine, type Ou13LineChange } from '../services/ou13-line-change';
import {
  appendSimilarMatchSnapshot,
  hasAutoSimilarForSlot,
  loadSimilarMatchSnapshots,
  type AutoSimilarSlot,
} from '../services/similar-match-snapshots';

function bumpBusy(
  busyCountRef: MutableRefObject<number>,
  setBusy: (v: boolean) => void,
  delta: number,
): void {
  busyCountRef.current = Math.max(0, busyCountRef.current + delta);
  setBusy(busyCountRef.current > 0);
}

export function useAutoSimilarOnLineChange(
  matchId: string,
  liveMatch: MatchInfo,
  input: PredictGoalInput,
  oddsHistory: OverUnderMinuteSnapshot[],
  enabled: boolean,
): { busy: boolean } {
  const inputRef = useRef(input);
  inputRef.current = input;
  const liveMatchRef = useRef(liveMatch);
  liveMatchRef.current = liveMatch;

  const baselineRef = useRef<Map<1 | 2, Ou13LatestLine>>(new Map());
  const busySlotsRef = useRef<Set<AutoSimilarSlot>>(new Set());
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const busyCountRef = useRef(0);
  const [busy, setBusy] = useState(false);

  const runCapture = useCallback(
    async (change: Ou13LineChange, slot: AutoSimilarSlot): Promise<void> => {
      const existing = loadSimilarMatchSnapshots(matchId);
      if (hasAutoSimilarForSlot(existing, slot)) {
        busySlotsRef.current.delete(slot);
        return;
      }

      bumpBusy(busyCountRef, setBusy, 1);
      try {
        const r = await fetchSimilarMatchesWithAi(
          inputRef.current,
          5,
          undefined,
          undefined,
          {
            trigger: 'ou_line_change',
            half: change.half,
            minute: change.minute,
            lineChange: {
              prevHandicap: change.prevHandicap,
              newHandicap: change.newHandicap,
            },
          },
        );
        const ts = Date.now();
        const score = liveMatchRef.current.ss || '0-0';
        const payload = {
          autoSlot: slot,
          trigger: 'ou_line_change' as const,
          lineChange: {
            prevHandicap: change.prevHandicap,
            newHandicap: change.newHandicap,
          },
          half: change.half,
          minute: change.minute,
          ts,
          score,
        };

        if (r.ok === false) {
          const { saved } = appendSimilarMatchSnapshot(matchId, { ...payload, error: r.error });
          if (!saved) busySlotsRef.current.delete(slot);
          return;
        }

        const { saved } = appendSimilarMatchSnapshot(matchId, { ...payload, data: r.data });
        if (!saved) busySlotsRef.current.delete(slot);
      } finally {
        bumpBusy(busyCountRef, setBusy, -1);
      }
    },
    [matchId],
  );

  useEffect(() => {
    baselineRef.current.clear();
    busySlotsRef.current.clear();
    chainRef.current = Promise.resolve();
    busyCountRef.current = 0;
    setBusy(false);
  }, [matchId]);

  useEffect(() => {
    if (!enabled) {
      baselineRef.current.clear();
      busySlotsRef.current.clear();
      chainRef.current = Promise.resolve();
      busyCountRef.current = 0;
      setBusy(false);
      return;
    }

    const ttStr = String(liveMatch.timer?.tt ?? '');
    if (ttStr === '3' || ttStr === '4') return;

    const changes = advanceOu13LineBaseline(baselineRef.current, oddsHistory);
    if (changes.length === 0) return;

    const snapshots = loadSimilarMatchSnapshots(matchId);
    for (const change of changes) {
      const slot = lineChangeSlot(change.half, change.newHandicap);
      if (hasAutoSimilarForSlot(snapshots, slot)) continue;
      if (busySlotsRef.current.has(slot)) continue;
      busySlotsRef.current.add(slot);

      chainRef.current = chainRef.current
        .then(() => runCapture(change, slot))
        .catch((e) => {
          busySlotsRef.current.delete(slot);
          console.warn('[auto-similar-line] capture failed', slot, e);
        });
    }
  }, [matchId, oddsHistory, liveMatch.timer?.tt, runCapture, enabled]);

  return { busy };
}
