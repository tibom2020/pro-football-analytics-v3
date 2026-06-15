import React, { useMemo, useState } from 'react';
import { GitCompare } from 'lucide-react';
import type { MatchInfo, ProcessedStats, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot } from '../types';
import type { PredictGoalInput } from '../services/goal-prediction';
import type { StoredAlert } from '../types';
import { AllSimilarMatchesModal } from './GoalPredictionBadge';
import type { MatchHalf } from '../services/matchTimeline';

interface GameEvent {
  minute: number;
  half: MatchHalf;
  type: 'goal' | 'corner';
}

export interface SimilarMatchesPanelProps {
  liveMatch: MatchInfo;
  statsHistory: Record<number, ProcessedStats>;
  oddsHistory: OverUnderMinuteSnapshot[];
  homeOddsHistory: AsianHandicapMinuteSnapshot[];
  gameEvents: GameEvent[];
  alertHistory: StoredAlert[];
}

export const SimilarMatchesPanel: React.FC<SimilarMatchesPanelProps> = ({
  liveMatch,
  statsHistory,
  oddsHistory,
  homeOddsHistory,
  gameEvents,
  alertHistory,
}) => {
  const [open, setOpen] = useState(false);

  const input: PredictGoalInput = useMemo(
    () => ({
      matchId: liveMatch.id,
      liveMatch,
      statsHistory,
      oddsHistory,
      homeOddsHistory,
      gameEvents,
      alertHistory,
    }),
    [liveMatch, statsHistory, oddsHistory, homeOddsHistory, gameEvents, alertHistory],
  );

  const minute = liveMatch.timer?.tm ?? parseInt(liveMatch.time || '0', 10) ?? 0;
  const half: 1 | 2 = String(liveMatch.timer?.tt) === '2' || minute >= 45 ? 2 : 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        title="Xem tất cả tình huống tương tự (RAG)"
      >
        <GitCompare className="w-4 h-4" />
        <span className="hidden sm:inline">Tương tự</span>
      </button>
      {open && (
        <AllSimilarMatchesModal
          input={input}
          current={{
            home: liveMatch.home.name,
            away: liveMatch.away.name,
            score: liveMatch.ss || '0-0',
            half,
            minute,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
