import { ChatMessage, ChatSession, OddsAlert, BetEvaluation } from '../ai-assistant-core/types.js';
import { v4 as uuidv4 } from 'uuid';

const MAX_SESSION_MESSAGES = 50;
const MAX_CONTEXT_ALERTS = 10;
const MAX_CONTEXT_EVALUATIONS = 5;

export class ConversationMemory {
  private sessions = new Map<string, ChatSession>();

  getOrCreateSession(userId: string, sessionId?: string): ChatSession {
    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (existing && existing.userId === userId) return existing;
    }

    const id = sessionId || uuidv4();
    const session: ChatSession = {
      id,
      userId,
      messages: [],
      context: {
        recentAlerts: [],
        recentEvaluations: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(id, session);
    return session;
  }

  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp'>): ChatMessage {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const msg: ChatMessage = {
      ...message,
      id: uuidv4(),
      sessionId,
      timestamp: Date.now(),
    };

    session.messages.push(msg);
    if (session.messages.length > MAX_SESSION_MESSAGES) {
      // Keep system messages + most recent
      const systemMsgs = session.messages.filter(m => m.role === 'system');
      const nonSystem = session.messages.filter(m => m.role !== 'system');
      session.messages = [...systemMsgs, ...nonSystem.slice(-MAX_SESSION_MESSAGES + systemMsgs.length)];
    }

    session.updatedAt = Date.now();
    return msg;
  }

  setActiveMatch(sessionId: string, matchId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context.activeMatchId = matchId;
      session.updatedAt = Date.now();
    }
  }

  addContextAlert(sessionId: string, alert: OddsAlert): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.context.recentAlerts.push(alert);
    if (session.context.recentAlerts.length > MAX_CONTEXT_ALERTS) {
      session.context.recentAlerts = session.context.recentAlerts.slice(-MAX_CONTEXT_ALERTS);
    }
  }

  addContextEvaluation(sessionId: string, evaluation: BetEvaluation): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.context.recentEvaluations.push(evaluation);
    if (session.context.recentEvaluations.length > MAX_CONTEXT_EVALUATIONS) {
      session.context.recentEvaluations = session.context.recentEvaluations.slice(-MAX_CONTEXT_EVALUATIONS);
    }
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionsByUser(userId: string): ChatSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  buildContextString(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';

    const parts: string[] = [];

    if (session.context.activeMatchId) {
      parts.push(`Trận đang theo dõi: ${session.context.activeMatchId}`);
    }

    if (session.context.recentAlerts.length > 0) {
      parts.push(`\nCảnh báo gần đây:`);
      for (const alert of session.context.recentAlerts.slice(-3)) {
        parts.push(`- ${alert.matchName}: ${alert.message} (phút ${alert.minute}')`);
      }
    }

    if (session.context.recentEvaluations.length > 0) {
      parts.push(`\nĐánh giá AI gần đây:`);
      for (const ev of session.context.recentEvaluations.slice(-2)) {
        parts.push(`- ${ev.betType}: Score ${ev.score}/100, Win ${ev.winProbability}%, Khuyến nghị: ${ev.recommendationText}`);
      }
    }

    return parts.join('\n');
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
