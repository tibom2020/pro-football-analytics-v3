/**
 * Client-side AI service.
 * Communicates with the AI assistant server AND provides a standalone
 * client-side evaluator fallback when the server is unavailable.
 */

import { MatchInfo, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot, ProcessedStats, BetTicket } from '../types';
import { isSecondHalfTimer } from './matchTimeline';

/** Phút còn lại ước tính trong hiệp 1 (đồng hồ 0–45; bù H1 tới ~52'). */
function remainingMinutesFirstHalf(clockMinute: number, inSecondHalf: boolean): number {
  if (inSecondHalf) return 0;
  const end = clockMinute > 45 ? 52 : 45;
  return Math.max(0, end - clockMinute);
}

export const AI_SERVER_URL = normalizeServerUrl(import.meta.env.VITE_AI_SERVER_URL as string | undefined);

function normalizeServerUrl(raw: string | undefined): string {
  const base = (raw || 'http://localhost:3001').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(base)) return base;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) return `http://${base}`;
  return `https://${base}`;
}

// ---- Types (mirrored from server for client-side use) ----

export type BetType =
  | 'over' | 'under'
  | 'home' | 'away'
  | 'over_h1' | 'under_h1'
  | 'home_h1' | 'away_h1';

export type Recommendation =
  | 'strong_enter' | 'enter' | 'hold'
  | 'reduce_stake' | 'exit' | 'no_enter';

export interface EvaluationFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  evaluation?: BetEvaluation;
  timestamp: number;
}

// ---- Client-side evaluator (works without server) ----

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mapBetTypeToBetType(bt: BetTicket['betType']): BetType {
  const map: Record<string, BetType> = {
    'Tài': 'over', 'Xỉu': 'under',
    'Đội nhà': 'home', 'Đội khách': 'away',
    'Tài H1': 'over_h1', 'Xỉu H1': 'under_h1',
    'Đội nhà H1': 'home_h1', 'Đội khách H1': 'away_h1',
  };
  return map[bt] || 'over';
}

export function evaluateBetLocally(
  match: MatchInfo,
  stats: ProcessedStats,
  betType: BetTicket['betType'],
  handicap: number,
  odds: number,
  oddsHistory: OverUnderMinuteSnapshot[],
  homeOddsHistory: AsianHandicapMinuteSnapshot[],
): BetEvaluation {
  const minute = match.timer?.tm || parseInt(match.time || '0');
  const score = (match.ss || '0-0').split('-').map(Number);
  const totalGoals = score[0] + score[1];
  const remainingFt = Math.max(0, 90 - minute);
  const factors: EvaluationFactor[] = [];
  const risks: string[] = [];
  const insufficient: string[] = [];
  const mappedType = mapBetTypeToBetType(betType);

  const isH1Market = mappedType.endsWith('_h1');
  const inH2 = isSecondHalfTimer(match.timer);
  const remainingH1 = remainingMinutesFirstHalf(minute, inH2);
  const remForBet = isH1Market ? remainingH1 : remainingFt;

  const isOverUnder = mappedType.includes('over') || mappedType.includes('under');
  const isOver = mappedType.includes('over');
  const isHome = mappedType.includes('home');

  if (isH1Market && inH2) {
    return {
      matchId: match.id,
      betType: mappedType,
      score: 42,
      winProbability: 35,
      confidence: 22,
      recommendation: 'hold',
      recommendationText: 'Hiệp 1 đã kết thúc — không có tỉ số riêng hiệp 1 trong dữ liệu; không đánh giá được kèo H1.',
      risks: ['Tổng bàn hiện tại có thể gồm bàn hiệp 2 — không dùng cho kèo H1.'],
      factors: [
        {
          name: 'Phạm vi kèo H1',
          value: 25,
          weight: 1,
          impact: 'negative',
          explanation: 'Sau hiệp 1, cần tỉ số từng hiệp; API không cung cấp.',
        },
      ],
      insufficientData: ['Cần tỉ số hiệp 1 sau khi H1 kết thúc'],
      timestamp: Date.now(),
    };
  }

  if (isOverUnder) {
    const gapToLine = handicap - totalGoals;

    // Score vs line
    const lineGapScore = isOver
      ? clamp(1 - (gapToLine / 3), 0, 1) * 100
      : clamp(gapToLine / 3, 0, 1) * 100;

    const lineExpl = isH1Market
      ? `Đang hiệp 1 — tổng bàn (H1): ${totalGoals}, line ${handicap}. ${isOver ? `Cần thêm ${Math.max(0, gapToLine)} bàn trước hết hiệp 1.` : `Còn dư ${Math.max(0, gapToLine)} bàn so với line H1.`}`
      : `Tổng bàn ${totalGoals}, line ${handicap}. ${isOver ? `Cần thêm ${Math.max(0, gapToLine)} bàn.` : `Còn dư ${Math.max(0, gapToLine)} bàn.`}`;

    factors.push({
      name: 'Khoảng cách điểm so với line',
      value: lineGapScore, weight: 0.25,
      impact: lineGapScore > 60 ? 'positive' : lineGapScore < 40 ? 'negative' : 'neutral',
      explanation: lineExpl,
    });

    // Time — kèo H1: chỉ còn lại trong hiệp 1, không dùng 90 − phút
    let timeFactor: number;
    let timeExpl: string;
    if (isH1Market) {
      if (isOver) {
        timeFactor = clamp(remainingH1 / 20, 0, 1) * 100;
      } else {
        timeFactor = clamp(1 - remainingH1 / 22, 0, 1) * 100;
      }
      timeExpl = `Còn khoảng ${Math.round(remainingH1)} phút trong hiệp 1 (ước).`;
    } else {
      timeFactor = isOver
        ? clamp(remainingFt / 45, 0, 1) * 100
        : clamp(1 - remainingFt / 90, 0, 1) * 100;
      timeExpl = `Còn ${remainingFt} phút.`;
    }
    factors.push({
      name: isH1Market ? 'Thời gian còn lại (hiệp 1)' : 'Thời gian còn lại',
      value: timeFactor, weight: 0.20,
      impact: timeFactor > 60 ? 'positive' : timeFactor < 40 ? 'negative' : 'neutral',
      explanation: timeExpl,
    });

    // Stats pressure (kèo H1: tốc độ theo phút hiện tại trong H1)
    const effMinOu = isH1Market ? Math.min(minute, 52) : minute;
    const totalShots = stats.on_target[0] + stats.on_target[1];
    const totalDA = stats.dangerous_attacks[0] + stats.dangerous_attacks[1];
    const pressureScore = clamp((totalShots / Math.max(effMinOu / 5, 1)) * 30 + (totalDA / Math.max(effMinOu / 3, 1)) * 10, 0, 100);
    const pressFactor = isOver ? pressureScore : 100 - pressureScore;
    factors.push({
      name: 'Áp lực ghi bàn',
      value: pressFactor, weight: 0.20,
      impact: pressFactor > 60 ? 'positive' : pressFactor < 40 ? 'negative' : 'neutral',
      explanation: isH1Market
        ? `${totalShots} sút trúng đích, ${totalDA} tấn công nguy hiểm (tích lũy đến phút ${minute}; kèo H1).`
        : `${totalShots} sút trúng đích, ${totalDA} tấn công nguy hiểm.`,
    });

    // Odds trend
    let trendScore = 50;
    if (oddsHistory.length >= 3) {
      const recent = oddsHistory.slice(-5);
      const field = isOver ? 'over' : 'under';
      const first = recent[0]?.[field as keyof OverUnderMinuteSnapshot] as number;
      const last = recent[recent.length - 1]?.[field as keyof OverUnderMinuteSnapshot] as number;
      if (first && last) {
        const diff = last - first;
        trendScore = diff < -0.03 ? clamp(70 + Math.abs(diff) * 100, 60, 95) : diff > 0.03 ? clamp(30 - diff * 50, 10, 40) : 50;
      }
    }
    factors.push({
      name: isH1Market ? 'Xu hướng kèo H1' : 'Xu hướng kèo',
      value: trendScore, weight: 0.20,
      impact: trendScore > 60 ? 'positive' : trendScore < 40 ? 'negative' : 'neutral',
      explanation: trendScore > 60 ? 'Kèo đang giảm — thị trường ủng hộ.' : trendScore < 40 ? 'Kèo đang tăng — thị trường không ủng hộ.' : 'Kèo ổn định.',
    });

    // Projection — dùng thời gian còn lại đúng phạm vi (H1 vs cả trận)
    const goalRate = (totalShots / 9 + totalDA / 120) / Math.max(effMinOu, 1);
    const expectedAdd = goalRate * remForBet;
    const projectionScore = isOver
      ? clamp((totalGoals + expectedAdd - handicap + 1) * 30 + 30, 0, 100)
      : clamp((handicap - totalGoals - expectedAdd + 1) * 30 + 30, 0, 100);
    const projExpl = isH1Market
      ? `Dự kiến thêm ~${expectedAdd.toFixed(1)} bàn trong phần còn lại hiệp 1 (ước).`
      : `Dự kiến thêm ~${expectedAdd.toFixed(1)} bàn.`;
    factors.push({
      name: 'Dự phóng',
      value: projectionScore, weight: 0.15,
      impact: projectionScore > 60 ? 'positive' : projectionScore < 40 ? 'negative' : 'neutral',
      explanation: projExpl,
    });

    // Risks
    if (isOver && gapToLine > 2 && remForBet < 25) risks.push('Cần nhiều bàn trong thời gian ngắn');
    if (!isOver && pressureScore > 70 && remForBet > 12) risks.push('Áp lực ghi bàn cao — rủi ro cho Xỉu');
  } else {
    // Handicap evaluation
    const sideIdx = isHome ? 0 : 1;
    const otherIdx = isHome ? 1 : 0;
    const sideName = isHome ? 'Đội nhà' : 'Đội khách';
    const scoreDiff = score[sideIdx] - score[otherIdx];
    const effectiveMargin = scoreDiff + handicap;

    const marginScore = clamp((effectiveMargin + 2) * 25, 0, 100);
    factors.push({
      name: 'Biên kèo thực tế',
      value: marginScore, weight: 0.30,
      impact: effectiveMargin > 0.5 ? 'positive' : effectiveMargin < -0.5 ? 'negative' : 'neutral',
      explanation: `Tỉ số ${score[0]}-${score[1]}, kèo ${handicap > 0 ? '+' : ''}${handicap}. Biên: ${effectiveMargin > 0 ? '+' : ''}${effectiveMargin.toFixed(2)}.`,
    });

    // Dominance
    const shots = stats.on_target[sideIdx] + stats.off_target[sideIdx];
    const oppShots = stats.on_target[otherIdx] + stats.off_target[otherIdx];
    const dominance = oppShots > 0 ? shots / oppShots : shots > 0 ? 2 : 1;
    const domScore = clamp(dominance * 50, 0, 100);
    factors.push({
      name: `Thống trị (${sideName})`,
      value: domScore, weight: 0.25,
      impact: domScore > 60 ? 'positive' : domScore < 40 ? 'negative' : 'neutral',
      explanation: `Chỉ số thống trị: ${dominance.toFixed(2)}.`,
    });

    const Rhc = isH1Market ? remainingH1 : remainingFt;
    const timeFactor = effectiveMargin > 0
      ? clamp((1 - Rhc / (isH1Market ? 50 : 90)) * 100, 0, 100)
      : clamp((isH1Market ? Rhc / 20 : Rhc / 45) * 100, 0, 100);
    factors.push({
      name: isH1Market ? 'Thời gian còn lại (hiệp 1)' : 'Thời gian còn lại',
      value: timeFactor, weight: 0.20,
      impact: timeFactor > 60 ? 'positive' : timeFactor < 40 ? 'negative' : 'neutral',
      explanation: isH1Market
        ? `Còn khoảng ${Math.round(remainingH1)} phút trong hiệp 1 (ước).`
        : `Còn ${remainingFt} phút.`,
    });

    let trendScore = 50;
    if (homeOddsHistory.length >= 3) {
      const recent = homeOddsHistory.slice(-5);
      const field = isHome ? 'home' : 'away';
      const first = recent[0]?.[field as keyof AsianHandicapMinuteSnapshot] as number;
      const last = recent[recent.length - 1]?.[field as keyof AsianHandicapMinuteSnapshot] as number;
      if (first && last) {
        const diff = last - first;
        trendScore = diff < -0.03 ? clamp(70 + Math.abs(diff) * 80, 60, 95) : diff > 0.03 ? clamp(30 - diff * 40, 10, 40) : 50;
      }
    }
    factors.push({
      name: isH1Market ? 'Xu hướng kèo chấp H1' : 'Xu hướng kèo chấp',
      value: trendScore, weight: 0.25,
      impact: trendScore > 60 ? 'positive' : trendScore < 40 ? 'negative' : 'neutral',
      explanation: trendScore > 60 ? 'Kèo đang giảm — ủng hộ.' : trendScore < 40 ? 'Kèo tăng — không ủng hộ.' : 'Kèo ổn định.',
    });

    if (effectiveMargin < -1 && (isH1Market ? remainingH1 : remainingFt) < 18) {
      risks.push(`${sideName} thua kèo lớn với ít thời gian`);
    }
    if (dominance < 0.6) risks.push(`${sideName} đang bị lấn lướt`);
  }

  // Red cards
  if (stats.redcards[0] > 0 || stats.redcards[1] > 0) {
    risks.push(`Thẻ đỏ: ${stats.redcards[0]}-${stats.redcards[1]} — ảnh hưởng thế trận`);
  }
  if (odds < 1.5) risks.push('Tỷ lệ cược thấp — value không cao');

  if (minute < 10) insufficient.push('Trận mới bắt đầu — dữ liệu chưa đủ');
  if (isH1Market && minute < 15 && !inH2) insufficient.push('Đầu hiệp 1 — kèo H1 còn nhiều biến động');
  if (oddsHistory.length < 3 && homeOddsHistory.length < 3) insufficient.push('Chưa đủ lịch sử kèo');

  // Calculate weighted score
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedScore = totalWeight > 0
    ? clamp(Math.round(factors.reduce((s, f) => s + f.value * f.weight, 0) / totalWeight), 0, 100)
    : 50;

  // Confidence
  let confidence = 70;
  if (minute < 10) confidence -= 25;
  if (minute >= 30) confidence += 10;
  if (minute >= 50) confidence += 15;
  if (oddsHistory.length >= 5 || homeOddsHistory.length >= 5) confidence += 10;
  if (isH1Market && remainingH1 > 0 && remainingH1 < 10) confidence -= 14;
  if (insufficient.length > 0) confidence -= insufficient.length * 10;
  confidence = clamp(confidence, 10, 95);

  // Win probability
  let winProb: number;
  if (isOverUnder) {
    const gap = handicap - totalGoals;
    const rem = isH1Market ? remainingH1 : remainingFt;
    if (isOver) {
      if (isH1Market) {
        winProb = gap <= 0 ? 85
          : gap <= 1 && rem > 15 ? 48
          : gap <= 1 ? 28
          : gap <= 2 && rem > 12 ? 32
          : 18;
      } else {
        winProb = gap <= 0 ? 85 : gap <= 1 && rem > 30 ? 55 : gap <= 1 ? 35 : gap <= 2 && rem > 45 ? 40 : 20;
      }
    } else if (isH1Market) {
      winProb = gap >= 3 && rem < 12 ? 78 : gap >= 2 ? 55 : gap >= 1 && rem < 10 ? 62 : 42;
    } else {
      winProb = gap >= 3 && rem < 30 ? 80 : gap >= 2 ? 60 : gap >= 1 && rem < 20 ? 65 : 40;
    }
  } else {
    const sideIdx = isHome ? 0 : 1;
    const otherIdx = isHome ? 1 : 0;
    const margin = (score[sideIdx] - score[otherIdx]) + handicap;
    winProb = margin > 1.5 ? 75 : margin > 0.5 ? 60 : margin > -0.5 ? 45 : margin > -1.5 ? 30 : 15;
  }
  winProb = clamp(Math.round(winProb + (weightedScore - 50) * 0.3), 5, 95);

  // Recommendation
  let recommendation: Recommendation;
  let recommendationText: string;
  if (confidence < 30) { recommendation = 'hold'; recommendationText = 'Chưa đủ dữ liệu — nên chờ thêm.'; }
  else if (weightedScore >= 80) { recommendation = 'strong_enter'; recommendationText = 'Kèo rất hợp lý — tín hiệu mạnh.'; }
  else if (weightedScore >= 65) { recommendation = 'enter'; recommendationText = 'Kèo hợp lý — có thể vào.'; }
  else if (weightedScore >= 50) { recommendation = 'hold'; recommendationText = 'Kèo trung bình — cân nhắc kỹ.'; }
  else if (weightedScore >= 35) { recommendation = 'reduce_stake'; recommendationText = 'Không thuận lợi — giảm stake.'; }
  else if (weightedScore >= 20) { recommendation = 'exit'; recommendationText = 'Rủi ro cao — nên thoát kèo.'; }
  else { recommendation = 'no_enter'; recommendationText = 'Không nên vào — tín hiệu tiêu cực.'; }

  return {
    matchId: match.id,
    betType: mappedType,
    score: weightedScore,
    winProbability: winProb,
    confidence,
    recommendation,
    recommendationText,
    risks,
    factors,
    insufficientData: insufficient,
    timestamp: Date.now(),
  };
}

// ---- Server communication ----
// Nhiều tab cùng host → trình duyệt giới hạn ~6 kết nối HTTP/1.1 tới một origin: tab 7+ có thể
// bị treo/timeout. Retry + backoff giảm tỷ lệ lỗi khi slot trống ra sau vài trăm ms.

const FETCH_AI_MAX_ATTEMPTS = 4;
const FETCH_AI_BACKOFF_MS = 400;
/** Mỗi lần thử: tránh treo vô hạn khi hết slot kết nối / server chậm. */
const FETCH_AI_TIMEOUT_MS = 20_000;

function fetchAISignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(FETCH_AI_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

async function fetchAI<T>(path: string, options?: RequestInit): Promise<T | null> {
  for (let attempt = 0; attempt < FETCH_AI_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, FETCH_AI_BACKOFF_MS * attempt));
    }
    try {
      const res = await fetch(`${AI_SERVER_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        signal: fetchAISignal(),
      });
      if (res.ok) {
        try {
          const data = (await res.json()) as T;
          return data;
        } catch {
          continue;
        }
      }
      const st = res.status;
      if (st === 429 || st >= 500) continue;
      return null;
    } catch {
      continue;
    }
  }
  return null;
}

export async function sendChatMessage(
  userId: string,
  message: string,
  sessionId?: string,
  matchContext?: unknown,
): Promise<{ sessionId: string; message: ChatMessage } | null> {
  return fetchAI('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ userId, message, sessionId, matchContext }),
  });
}

export async function subscribeOddsAlert(
  userId: string,
  matchId: string,
  matchName: string,
  threshold?: number,
  leagueName?: string,
): Promise<{ success?: boolean; subscription?: { id: string } } | null> {
  return fetchAI('/api/odds/subscribe', {
    method: 'POST',
    body: JSON.stringify({ userId, matchId, matchName, threshold, leagueName }),
  });
}

export async function fetchOddsSubscriptions(userId: string): Promise<{
  success?: boolean;
  subscriptions?: Array<{ id: string; matchId: string; active: boolean; matchName: string }>;
} | null> {
  return fetchAI(`/api/odds/subscriptions/${encodeURIComponent(userId)}`);
}

export async function deleteOddsSubscription(subId: string): Promise<boolean> {
  const url = `${AI_SERVER_URL}/api/odds/subscribe/${encodeURIComponent(subId)}`;
  for (let attempt = 0; attempt < FETCH_AI_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, FETCH_AI_BACKOFF_MS * attempt));
    }
    try {
      const res = await fetch(url, { method: 'DELETE', signal: fetchAISignal() });
      if (res.ok) return true;
      if (res.status === 429 || res.status >= 500) continue;
      return false;
    } catch {
      continue;
    }
  }
  return false;
}

export async function getTelegramBindCode(userId: string): Promise<{ code: string; instruction: string } | null> {
  const res = await fetchAI<{ success: boolean; code: string; instruction: string }>('/api/telegram/bind-code', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  return res?.success ? { code: res.code, instruction: res.instruction } : null;
}

export async function checkTelegramStatus(userId: string): Promise<boolean> {
  const res = await fetchAI<{ success: boolean; bound: boolean }>(`/api/telegram/status/${encodeURIComponent(userId)}`);
  return res?.bound ?? false;
}

/**
 * Mirror toàn bộ bet ticket list của user lên server (snapshot, replace).
 * Server lưu vào `server/data/bet_tickets.json` cho các sidecar đọc.
 * Best-effort: fail silent — frontend localStorage vẫn là source of truth.
 */
export async function syncBetsToServer(
  userId: string,
  tickets: BetTicket[],
): Promise<boolean> {
  const res = await fetchAI<{ success: boolean }>('/api/bets/sync', {
    method: 'POST',
    body: JSON.stringify({ userId, tickets }),
  });
  return res?.success === true;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
