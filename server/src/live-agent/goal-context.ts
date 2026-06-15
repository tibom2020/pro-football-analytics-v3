import type { OddsAlert, OddsSnapshot } from '../ai-assistant-core/types.js';
import {
  FEATURE_NAMES,
  GOAL_WINDOW_MIN,
  GOAL_WINDOW_MIN_SHORT,
  type FeatureVector,
} from '../goal-predict/feature-builder.js';
import { predictGoalProb, getTopContributingFeatures } from '../goal-predict/onnx-service.js';
import { topK } from '../goal-predict/rag-store.js';
import type { SimilarMatchEntry } from './types.js';

export interface LiveAgentGoalContext {
  goalProb15: number | null;
  goalProb5: number | null;
  similarMatches: SimilarMatchEntry[];
  topFeatures: Array<{ name: string; value: number; importance: number }>;
  featureQuality: 'full-ish' | 'odds-only';
}

interface ParsedLiveStats {
  dangerous: [number, number];
  shotsTotal: [number, number];
  onTarget: [number, number];
  corners: [number, number];
  yellow: [number, number];
  red: [number, number];
}

function emptyFeatures(): FeatureVector {
  return Object.fromEntries(FEATURE_NAMES.map((name) => [name, 0])) as FeatureVector;
}

function pairFromLine(line: string): [number, number] | null {
  const normalized = line.replace(/[–—]/g, '-');
  const m = normalized.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function parseLiveStats(lines: string[] | undefined): ParsedLiveStats | null {
  if (!lines?.length) return null;
  const out: ParsedLiveStats = {
    dangerous: [0, 0],
    shotsTotal: [0, 0],
    onTarget: [0, 0],
    corners: [0, 0],
    yellow: [0, 0],
    red: [0, 0],
  };
  let seen = false;
  for (const raw of lines) {
    const line = raw.toLowerCase();
    const pair = pairFromLine(raw);
    if (!pair) continue;
    if (line.includes('tấn công nguy hiểm') || line.includes('dangerous')) {
      out.dangerous = pair;
      seen = true;
    } else if (line.includes('sút')) {
      out.shotsTotal = pair;
      const onTarget = raw.match(/\((\d+)\s*-\s*(\d+)\)/);
      if (onTarget) out.onTarget = [Number(onTarget[1]), Number(onTarget[2])];
      seen = true;
    } else if (line.includes('phạt góc') || line.includes('corner')) {
      out.corners = pair;
      seen = true;
    } else if (line.includes('thẻ đỏ') || line.includes('red')) {
      // Xét 'thẻ đỏ' TRƯỚC 'thẻ' để không bị nhánh thẻ vàng nuốt.
      out.red = pair;
      seen = true;
    } else if (line.includes('thẻ') || line.includes('yellow')) {
      out.yellow = pair;
      seen = true;
    }
  }
  return seen ? out : null;
}

function countMinutesInWindow(raw: string | undefined, minute: number, windowMin: number): number {
  if (!raw) return 0;
  const nums = raw.match(/\d+/g)?.map(Number) ?? [];
  return nums.filter((m) => m >= minute - windowMin && m <= minute).length;
}

function oddsDrops(
  history: OddsSnapshot[],
  field: 'overOdds' | 'underOdds' | 'homeOdds',
  minute: number,
  windowMin: number,
  direction: 'drop' | 'rise' = 'drop',
): { count: number; sum: number; max: number } {
  const tail = history
    .filter((s) => s.minute >= minute - windowMin && s.minute <= minute)
    .sort((a, b) => a.minute - b.minute);
  let count = 0;
  let sum = 0;
  let max = 0;
  for (let i = 1; i < tail.length; i++) {
    const prev = tail[i - 1][field];
    const cur = tail[i][field];
    if (typeof prev !== 'number' || typeof cur !== 'number') continue;
    const step = direction === 'drop' ? prev - cur : cur - prev;
    if (step > 0) {
      count++;
      sum += step;
      max = Math.max(max, step);
    }
  }
  return { count, sum, max };
}

function scoreGoals(score: string | undefined): number {
  const m = score?.match(/(\d+)\s*-\s*(\d+)/);
  return m ? Number(m[1]) + Number(m[2]) : 0;
}

function buildLiveFeatureVector(args: {
  snapshot: OddsSnapshot;
  oddsHistoryTail: OddsSnapshot[];
  recentAlerts: OddsAlert[];
  telegramStatsLines?: string[];
  telegramPressureBell?: string;
}): { features: FeatureVector; quality: LiveAgentGoalContext['featureQuality'] } {
  const { snapshot, oddsHistoryTail, recentAlerts, telegramStatsLines, telegramPressureBell } = args;
  const stats = parseLiveStats(telegramStatsLines);
  const minute = Number(snapshot.minute) || 0;
  // Áp lực OU: Tài GIẢM (drop) hoặc Xỉu TĂNG (rise). Xỉu giảm dần = bình thường → không tính.
  const ouUnderRises = oddsDrops(oddsHistoryTail, 'underOdds', minute, 5, 'rise');
  const ouOverDrops = oddsDrops(oddsHistoryTail, 'overOdds', minute, 5, 'drop');
  const ahHomeDrops = oddsDrops(oddsHistoryTail, 'homeOdds', minute, 5, 'drop');
  const alertCount = recentAlerts.filter((a) => a.minute >= minute - 3 && a.minute <= minute).length;
  const pressureBellCount = countMinutesInWindow(telegramPressureBell, minute, 3);

  const fv = emptyFeatures();
  fv.minute = minute;
  fv.half = minute > 45 ? 2 : 1;
  fv.total_goals_so_far = scoreGoals(snapshot.score);
  fv.da_h_delta_3m = stats?.dangerous[0] ?? 0;
  fv.da_a_delta_3m = stats?.dangerous[1] ?? 0;
  fv.da_total_3m = fv.da_h_delta_3m + fv.da_a_delta_3m;
  fv.shots_total_delta_3m = stats ? stats.shotsTotal[0] + stats.shotsTotal[1] : 0;
  fv.on_target_delta_3m = stats ? stats.onTarget[0] + stats.onTarget[1] : 0;
  fv.corners_delta_3m = stats ? stats.corners[0] + stats.corners[1] : 0;
  fv.yellow_delta_3m = stats ? stats.yellow[0] + stats.yellow[1] : 0;
  // Level thiếu → NaN (khớp train: XGBoost native missing). Count/sum drop = 0 hợp lệ.
  fv.ou13_handicap = snapshot.handicap ?? NaN;
  fv.ou13_over_odds = snapshot.overOdds ?? NaN;
  fv.ou13_under_odds = snapshot.underOdds ?? NaN;
  fv.ou13_under_rises_5m_count = ouUnderRises.count;
  fv.ou13_under_rises_5m_sum = ouUnderRises.sum;
  fv.ou13_under_rises_max_step_5m = ouUnderRises.max;
  fv.ou13_over_drops_5m_count = ouOverDrops.count;
  fv.ou13_over_drops_5m_sum = ouOverDrops.sum;
  fv.ou13_over_max_step_5m = ouOverDrops.max;
  fv.ah12_handicap = snapshot.handicapAH ?? NaN;
  fv.ah12_home_odds = snapshot.homeOdds ?? NaN;
  fv.ah12_away_odds = snapshot.awayOdds ?? NaN;
  fv.ah12_home_drops_5m_count = ahHomeDrops.count;
  fv.ah12_home_drops_5m_sum = ahHomeDrops.sum;
  fv.ah12_home_max_step_5m = ahHomeDrops.max;
  fv.pressure_alert_count_3m = Math.max(alertCount, pressureBellCount);
  fv.pressure_alert_max_3m = fv.pressure_alert_count_3m > 0 ? 1 : 0;
  // man-advantage theo thẻ đỏ (khớp offline): red khách − red chủ. Thiếu data → 0.
  fv.man_advantage = stats ? stats.red[1] - stats.red[0] : 0;
  return { features: fv, quality: stats ? 'full-ish' : 'odds-only' };
}

export async function buildGoalContextForLiveAgent(args: {
  snapshot: OddsSnapshot;
  oddsHistoryTail: OddsSnapshot[];
  recentAlerts: OddsAlert[];
  telegramStatsLines?: string[];
  telegramPressureBell?: string;
}): Promise<LiveAgentGoalContext> {
  const { features, quality } = buildLiveFeatureVector(args);
  const [goalProb15, goalProb5] = await Promise.all([
    predictGoalProb(features, GOAL_WINDOW_MIN),
    predictGoalProb(features, GOAL_WINDOW_MIN_SHORT),
  ]);
  return {
    goalProb15,
    goalProb5,
    similarMatches: topK(features, 5, false),
    topFeatures: getTopContributingFeatures(features, 5, GOAL_WINDOW_MIN),
    featureQuality: quality,
  };
}
