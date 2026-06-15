import { describe, it, expect } from 'vitest';
import { evaluateBet } from '../ai-assistant-core/evaluator.js';
import { MatchData, BetInput, OddsSnapshot } from '../ai-assistant-core/types.js';

function makeMatch(overrides: Partial<MatchData> = {}): MatchData {
  return {
    id: 'test-1',
    league: 'Premier League',
    home: 'Man Utd',
    away: 'Liverpool',
    score: [1, 1],
    minute: 60,
    half: 2,
    stats: {
      attacks: [55, 60],
      dangerousAttacks: [30, 35],
      shotsOnTarget: [4, 5],
      shotsOffTarget: [3, 4],
      corners: [3, 4],
      yellowCards: [1, 2],
      redCards: [0, 0],
    },
    ...overrides,
  };
}

function makeOddsHistory(count: number, overOddsStart = 1.90, step = -0.02): OddsSnapshot[] {
  return Array.from({ length: count }, (_, i) => ({
    minute: 10 + i * 5,
    handicap: 2.5,
    overOdds: overOddsStart + i * step,
    underOdds: 1.90 - i * step,
    homeOdds: 1.85 + i * step * 0.5,
    awayOdds: 1.95 - i * step * 0.5,
  }));
}

describe('evaluateBet', () => {
  describe('Over/Under evaluation', () => {
    it('returns evaluation with all required fields', () => {
      const match = makeMatch();
      const bet: BetInput = { matchId: 'test-1', betType: 'over', handicap: 2.5, odds: 1.90, stake: 100 };
      const result = evaluateBet(match, bet, makeOddsHistory(5));

      expect(result.matchId).toBe('test-1');
      expect(result.betType).toBe('over');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.winProbability).toBeGreaterThanOrEqual(5);
      expect(result.winProbability).toBeLessThanOrEqual(95);
      expect(result.confidence).toBeGreaterThanOrEqual(10);
      expect(result.confidence).toBeLessThanOrEqual(95);
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendationText).toBeTruthy();
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('gives higher score for Over when total goals are close to line', () => {
      const matchNear = makeMatch({ score: [1, 1], minute: 50 }); // 2 goals, line 2.5
      const matchFar = makeMatch({ score: [0, 0], minute: 50 }); // 0 goals, line 2.5
      const bet: BetInput = { matchId: 'test-1', betType: 'over', handicap: 2.5, odds: 1.90, stake: 100 };
      const history = makeOddsHistory(5);

      const evalNear = evaluateBet(matchNear, bet, history);
      const evalFar = evaluateBet(matchFar, bet, history);

      expect(evalNear.score).toBeGreaterThan(evalFar.score);
    });

    it('gives higher score for Under when gap is large and time is running out', () => {
      const match = makeMatch({ score: [0, 0], minute: 80 }); // 0 goals at 80'
      const bet: BetInput = { matchId: 'test-1', betType: 'under', handicap: 2.5, odds: 1.90, stake: 100 };
      const result = evaluateBet(match, bet, makeOddsHistory(5, 1.90, 0.02));

      expect(result.score).toBeGreaterThan(60);
      expect(result.recommendation).toMatch(/enter|strong_enter/);
    });

    it('returns insufficient data warning for early matches', () => {
      const match = makeMatch({ minute: 5, half: 1 });
      const bet: BetInput = { matchId: 'test-1', betType: 'over', handicap: 2.5, odds: 1.90, stake: 100 };
      const result = evaluateBet(match, bet, []);

      expect(result.insufficientData.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(50);
    });
  });

  describe('Handicap evaluation', () => {
    it('gives higher score when team is winning with handicap coverage', () => {
      const winning = makeMatch({ score: [2, 0], minute: 70 });
      const losing = makeMatch({ score: [0, 2], minute: 70 });
      const bet: BetInput = { matchId: 'test-1', betType: 'home', handicap: -0.5, odds: 1.85, stake: 100 };
      const history = makeOddsHistory(5);

      const evalWin = evaluateBet(winning, bet, history);
      const evalLose = evaluateBet(losing, bet, history);

      expect(evalWin.score).toBeGreaterThan(evalLose.score);
    });

    it('considers red card impact', () => {
      const noRed = makeMatch();
      const oppRed = makeMatch({
        stats: {
          ...makeMatch().stats,
          redCards: [0, 1],
        },
      });
      const bet: BetInput = { matchId: 'test-1', betType: 'home', handicap: -0.5, odds: 1.85, stake: 100 };
      const history = makeOddsHistory(5);

      const evalNoRed = evaluateBet(noRed, bet, history);
      const evalOppRed = evaluateBet(oppRed, bet, history);

      expect(evalOppRed.factors.length).toBeGreaterThanOrEqual(evalNoRed.factors.length);
    });

    it('flags low odds as risk', () => {
      const match = makeMatch();
      const bet: BetInput = { matchId: 'test-1', betType: 'home', handicap: -0.5, odds: 1.30, stake: 100 };
      const result = evaluateBet(match, bet, makeOddsHistory(3));

      expect(result.risks.some(r => r.includes('value'))).toBe(true);
    });
  });

  describe('Recommendation mapping', () => {
    it('maps scores to correct recommendations', () => {
      const match = makeMatch({ score: [3, 0], minute: 85 });
      const betOver: BetInput = { matchId: 'test-1', betType: 'over', handicap: 2.5, odds: 1.90, stake: 100 };
      const resultOver = evaluateBet(match, betOver, makeOddsHistory(10, 1.90, -0.03));

      // 3 goals already over 2.5 at 85' → should recommend enter
      expect(['strong_enter', 'enter', 'hold']).toContain(resultOver.recommendation);

      const betUnder: BetInput = { matchId: 'test-1', betType: 'under', handicap: 2.5, odds: 3.50, stake: 100 };
      const resultUnder = evaluateBet(match, betUnder, makeOddsHistory(10, 1.90, 0.03));

      // Under 2.5 when 3 goals already → score should be low and not favorable
      expect(resultUnder.score).toBeLessThan(resultOver.score);
      expect(['exit', 'no_enter', 'reduce_stake', 'hold']).toContain(resultUnder.recommendation);
    });
  });
});
