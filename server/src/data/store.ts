import { AuditLogEntry, BetEvaluation, OddsAlert } from '../ai-assistant-core/types.js';
import { v4 as uuidv4 } from 'uuid';

const MAX_AUDIT_LOG = 1000;
const MAX_EVALUATIONS_PER_MATCH = 50;

/**
 * In-memory data store.
 * For production, replace with a database (PostgreSQL, SQLite, etc.)
 */
class DataStore {
  private auditLog: AuditLogEntry[] = [];
  private evaluations = new Map<string, BetEvaluation[]>(); // matchId -> evaluations
  private alertLog: OddsAlert[] = [];

  addAuditEntry(type: AuditLogEntry['type'], data: Record<string, unknown>, userId?: string, matchId?: string): void {
    this.auditLog.push({
      id: uuidv4(),
      type,
      userId,
      matchId,
      data,
      timestamp: Date.now(),
    });
    if (this.auditLog.length > MAX_AUDIT_LOG) {
      this.auditLog = this.auditLog.slice(-MAX_AUDIT_LOG);
    }
  }

  getAuditLog(filter?: { type?: string; matchId?: string; limit?: number }): AuditLogEntry[] {
    let entries = this.auditLog;
    if (filter?.type) entries = entries.filter(e => e.type === filter.type);
    if (filter?.matchId) entries = entries.filter(e => e.matchId === filter.matchId);
    return entries.slice(-(filter?.limit || 50));
  }

  addEvaluation(evaluation: BetEvaluation): void {
    const existing = this.evaluations.get(evaluation.matchId) || [];
    existing.push(evaluation);
    if (existing.length > MAX_EVALUATIONS_PER_MATCH) {
      this.evaluations.set(evaluation.matchId, existing.slice(-MAX_EVALUATIONS_PER_MATCH));
    } else {
      this.evaluations.set(evaluation.matchId, existing);
    }

    this.addAuditEntry('evaluation', {
      score: evaluation.score,
      recommendation: evaluation.recommendation,
      winProbability: evaluation.winProbability,
      betType: evaluation.betType,
    }, undefined, evaluation.matchId);
  }

  getEvaluations(matchId: string): BetEvaluation[] {
    return this.evaluations.get(matchId) || [];
  }

  addAlert(alert: OddsAlert): void {
    this.alertLog.push(alert);
    if (this.alertLog.length > MAX_AUDIT_LOG) {
      this.alertLog = this.alertLog.slice(-MAX_AUDIT_LOG);
    }
    this.addAuditEntry('alert', {
      alertType: alert.alertType,
      market: alert.market,
      message: alert.message,
    }, undefined, alert.matchId);
  }

  getAlerts(matchId?: string, limit = 50): OddsAlert[] {
    let alerts = this.alertLog;
    if (matchId) alerts = alerts.filter(a => a.matchId === matchId);
    return alerts.slice(-limit);
  }
}

export const dataStore = new DataStore();
