export interface MatchData {
  id: string;
  league: string;
  home: string;
  away: string;
  score: [number, number];
  minute: number;
  half: 1 | 2;
  stats: MatchStats;
}

export interface MatchStats {
  attacks: [number, number];
  dangerousAttacks: [number, number];
  shotsOnTarget: [number, number];
  shotsOffTarget: [number, number];
  corners: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
}

export interface OddsSnapshot {
  minute: number;
  handicap: number; // Thường là OU handicap
  handicapAH?: number; // Kèo chấp line
  score?: string; // Tỷ số hiện tại (ví dụ "1-0")
  overOdds?: number;
  underOdds?: number;
  homeOdds?: number;
  awayOdds?: number;
}

export type BetType =
  | 'over' | 'under'
  | 'home' | 'away'
  | 'over_h1' | 'under_h1'
  | 'home_h1' | 'away_h1';

export interface BetInput {
  matchId: string;
  betType: BetType;
  handicap: number;
  odds: number;
  stake: number;
}

export interface EvaluationFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

export type Recommendation =
  | 'strong_enter'
  | 'enter'
  | 'hold'
  | 'reduce_stake'
  | 'exit'
  | 'no_enter';

export interface BetEvaluation {
  matchId: string;
  betType: BetType;
  score: number;
  winProbability: number;
  confidence: number;
  recommendation: Recommendation;
  recommendationText: string;
  risks: string[];
  factors: EvaluationFactor[];
  insufficientData: string[];
  timestamp: number;
}

export interface OddsAlert {
  id: string;
  matchId: string;
  matchName: string;
  alertType: 'odds_drop' | 'line_change' | 'sharp_move';
  market: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  minute: number;
  message: string;
  timestamp: number;
}

export interface OddsSubscription {
  id: string;
  userId: string;
  matchId: string;
  matchName: string;
  /** Tên giải (hiển thị Telegram / UI). */
  leagueName?: string;
  markets: string[];
  threshold: number;
  active: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    matchId?: string;
    evaluation?: BetEvaluation;
    alerts?: OddsAlert[];
  };
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: {
    activeMatchId?: string;
    recentAlerts: OddsAlert[];
    recentEvaluations: BetEvaluation[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogEntry {
  id: string;
  type: 'evaluation' | 'alert' | 'chat' | 'telegram';
  userId?: string;
  matchId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}
