import { Router, Request, Response } from 'express';
import { evaluateBet } from '../ai-assistant-core/evaluator.js';
import { MatchData, BetInput, OddsSnapshot } from '../ai-assistant-core/types.js';
import { dataStore } from '../data/store.js';
import { logger } from '../index.js';

export const aiRouter = Router();

/**
 * POST /api/ai/evaluate
 * Evaluate a bet with match context and odds history.
 *
 * Body: {
 *   match: MatchData,
 *   bet: BetInput,
 *   oddsHistory: OddsSnapshot[]
 * }
 */
aiRouter.post('/evaluate', (req: Request, res: Response): void => {
  try {
    const { match, bet, oddsHistory } = req.body as {
      match: MatchData;
      bet: BetInput;
      oddsHistory: OddsSnapshot[];
    };

    if (!match || !bet) {
      res.status(400).json({ error: 'Missing required fields: match, bet' });
      return;
    }

    if (!match.id || !match.home || !match.away || match.score === undefined) {
      res.status(400).json({ error: 'Invalid match data: requires id, home, away, score' });
      return;
    }

    if (!bet.betType || bet.handicap === undefined || bet.odds === undefined) {
      res.status(400).json({ error: 'Invalid bet data: requires betType, handicap, odds' });
      return;
    }

    const evaluation = evaluateBet(match, bet, oddsHistory || []);
    dataStore.addEvaluation(evaluation);

    logger.info(`Evaluation: match=${match.id} bet=${bet.betType} score=${evaluation.score} rec=${evaluation.recommendation}`);

    res.json({
      success: true,
      evaluation,
    });
  } catch (err) {
    logger.error('Evaluation error:', err);
    res.status(500).json({ error: 'Evaluation failed', message: (err as Error).message });
  }
});

/**
 * GET /api/ai/evaluations/:matchId
 * Get evaluation history for a specific match.
 */
aiRouter.get('/evaluations/:matchId', (req: Request, res: Response): void => {
  const matchId = String(req.params.matchId);
  const evaluations = dataStore.getEvaluations(matchId);
  res.json({ success: true, evaluations });
});

/**
 * GET /api/ai/audit
 * Get audit log entries.
 */
aiRouter.get('/audit', (req: Request, res: Response): void => {
  const type = String(req.query.type || '');
  const matchId = String(req.query.matchId || '');
  const limitStr = String(req.query.limit || '');
  const entries = dataStore.getAuditLog({
    type: type || undefined,
    matchId: matchId || undefined,
    limit: limitStr ? parseInt(limitStr, 10) : 50,
  });
  res.json({ success: true, entries });
});
