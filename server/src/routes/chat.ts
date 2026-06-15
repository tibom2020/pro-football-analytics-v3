import { Router, Request, Response } from 'express';
import { ChatOrchestrator } from '../chat-orchestrator/orchestrator.js';
import { MatchData, OddsSnapshot, ChatSession } from '../ai-assistant-core/types.js';
import { logger } from '../index.js';

export function createChatRouter(orchestrator: ChatOrchestrator): Router {
  const router = Router();

  /**
   * POST /api/chat/message
   * Send a chat message and get AI response.
   *
   * Body: {
   *   userId: string,
   *   sessionId?: string,
   *   message: string,
   *   matchContext?: { match: MatchData, oddsHistory: OddsSnapshot[] }
   * }
   */
  router.post('/message', async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, sessionId, message, matchContext } = req.body;

      if (!userId || !message) {
        res.status(400).json({ error: 'Missing required fields: userId, message' });
        return;
      }

      const response = await orchestrator.processMessage({
        userId,
        sessionId,
        message,
        matchContext,
      });

      res.json({
        success: true,
        sessionId: response.sessionId,
        message: response.message,
        evaluation: response.evaluation || null,
      });
    } catch (err) {
      logger.error('Chat error:', err);
      res.status(500).json({ error: 'Chat processing failed' });
    }
  });

  /**
   * GET /api/chat/sessions/:userId
   * Get chat sessions for a user.
   */
  router.get('/sessions/:userId', (req: Request, res: Response): void => {
    const sessions = (orchestrator as any).memory.getSessionsByUser(req.params.userId);
    res.json({
      success: true,
      sessions: sessions.map((s: ChatSession) => ({
        id: s.id,
        messageCount: s.messages.length,
        lastMessage: s.messages[s.messages.length - 1]?.content.slice(0, 100),
        updatedAt: s.updatedAt,
      })),
    });
  });

  /**
   * GET /api/chat/session/:sessionId
   * Get full chat session with messages.
   */
  router.get('/session/:sessionId', (req: Request, res: Response): void => {
    const session = (orchestrator as any).memory.getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ success: true, session });
  });

  return router;
}
