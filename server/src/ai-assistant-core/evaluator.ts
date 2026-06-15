import {
  MatchData,
  MatchStats,
  OddsSnapshot,
  BetInput,
  BetEvaluation,
  EvaluationFactor,
  Recommendation,
  BetType,
} from './types.js';

const TOTAL_MATCH_MINUTES = 90;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Phút còn lại trong hiệp 1 (đồng hồ; bù H1 tới ~52'). half===2 → 0. */
function remainingMinutesFirstHalfServer(minute: number, half: 1 | 2): number {
  if (half === 2) return 0;
  const end = minute > 45 ? 52 : 45;
  return Math.max(0, end - minute);
}

function timeRemainingFactor(minute: number): number {
  const remaining = Math.max(0, TOTAL_MATCH_MINUTES - minute);
  return remaining / TOTAL_MATCH_MINUTES;
}

/**
 * Estimate expected additional goals based on current stats pressure.
 * Uses a weighted composite of shots, dangerous attacks, and corners
 * normalized per-minute to project forward.
 */
function estimateGoalRate(stats: MatchStats, minute: number): number {
  if (minute <= 0) return 0;
  const totalShots = stats.shotsOnTarget[0] + stats.shotsOnTarget[1]
    + stats.shotsOffTarget[0] + stats.shotsOffTarget[1];
  const totalDA = stats.dangerousAttacks[0] + stats.dangerousAttacks[1];
  const totalCorners = stats.corners[0] + stats.corners[1];

  // Historical avg: ~1 goal per 9 shots on target, ~1 per 30 DA, ~1 per 35 corners
  const goalEstimate =
    (stats.shotsOnTarget[0] + stats.shotsOnTarget[1]) / 9
    + totalDA / 120
    + totalCorners / 35;

  const ratePerMinute = goalEstimate / Math.max(minute, 1);
  return ratePerMinute;
}

function teamDominanceScore(stats: MatchStats, sideIndex: 0 | 1): number {
  const other = (sideIndex === 0 ? 1 : 0) as 0 | 1;
  const shots = stats.shotsOnTarget[sideIndex] + stats.shotsOffTarget[sideIndex];
  const opponentShots = stats.shotsOnTarget[other] + stats.shotsOffTarget[other];
  const da = stats.dangerousAttacks[sideIndex];
  const opponentDa = stats.dangerousAttacks[other];
  const corners = stats.corners[sideIndex];
  const opponentCorners = stats.corners[other];

  const shotRatio = opponentShots > 0 ? shots / opponentShots : shots > 0 ? 2 : 1;
  const daRatio = opponentDa > 0 ? da / opponentDa : da > 0 ? 2 : 1;
  const cornerRatio = opponentCorners > 0 ? corners / opponentCorners : corners > 0 ? 2 : 1;

  return (shotRatio * 0.5 + daRatio * 0.3 + cornerRatio * 0.2);
}

function analyzeOddsTrend(
  history: OddsSnapshot[],
  field: 'overOdds' | 'underOdds' | 'homeOdds' | 'awayOdds',
): { trend: 'dropping' | 'rising' | 'stable'; magnitude: number; recentDrops: number } {
  if (history.length < 2) {
    return { trend: 'stable', magnitude: 0, recentDrops: 0 };
  }

  const values = history
    .map(h => h[field])
    .filter((v): v is number => v !== undefined && v !== null);

  if (values.length < 2) {
    return { trend: 'stable', magnitude: 0, recentDrops: 0 };
  }

  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;

  let recentDrops = 0;
  const recentWindow = Math.min(5, values.length);
  for (let i = values.length - recentWindow; i < values.length - 1; i++) {
    if (i >= 0 && values[i + 1] < values[i]) recentDrops++;
  }

  if (Math.abs(diff) < 0.03) return { trend: 'stable', magnitude: 0, recentDrops };
  return {
    trend: diff < 0 ? 'dropping' : 'rising',
    magnitude: Math.abs(diff),
    recentDrops,
  };
}

function evaluateOverUnder(
  match: MatchData,
  bet: BetInput,
  oddsHistory: OddsSnapshot[],
  isOver: boolean,
): { factors: EvaluationFactor[]; risks: string[]; insufficient: string[] } {
  const factors: EvaluationFactor[] = [];
  const risks: string[] = [];
  const insufficient: string[] = [];

  const isH1Market = bet.betType.endsWith('_h1');
  const totalGoals = match.score[0] + match.score[1];
  const remainingFt = Math.max(0, TOTAL_MATCH_MINUTES - match.minute);
  const remainingH1 = remainingMinutesFirstHalfServer(match.minute, match.half);
  const rem = isH1Market ? remainingH1 : remainingFt;
  const effMinOu = isH1Market ? Math.min(match.minute, 52) : match.minute;
  const goalRate = estimateGoalRate(match.stats, effMinOu);
  const expectedAdditional = goalRate * rem;
  const projectedTotal = totalGoals + expectedAdditional;
  const gapToLine = bet.handicap - totalGoals;

  // Factor 1: Score vs Line gap
  const lineGapScore = isOver
    ? clamp(1 - (gapToLine / 3), 0, 1) * 100
    : clamp(gapToLine / 3, 0, 1) * 100;

  const lineExpl = isH1Market
    ? `Đang hiệp 1 — tổng bàn (H1): ${totalGoals}, line ${bet.handicap}. `
      + (isOver
        ? `Cần thêm ${gapToLine > 0 ? gapToLine : 0} bàn trước hết hiệp 1.`
        : `Cần giữ dưới ${bet.handicap} bàn trong H1.`)
    : `Tổng bàn hiện tại ${totalGoals}, line ${bet.handicap}. `
      + (isOver
        ? `Cần thêm ${gapToLine > 0 ? gapToLine : 0} bàn để thắng Tài.`
        : `Cần giữ dưới ${bet.handicap} bàn. Còn dư ${gapToLine > 0 ? gapToLine : 0} bàn.`);

  factors.push({
    name: 'Khoảng cách điểm so với line',
    value: lineGapScore,
    weight: 0.25,
    impact: lineGapScore > 60 ? 'positive' : lineGapScore < 40 ? 'negative' : 'neutral',
    explanation: lineExpl,
  });

  // Factor 2: Time remaining (kèo H1: chỉ trong hiệp 1)
  let timeFactor: number;
  let timeExpl: string;
  if (isH1Market) {
    if (isOver) {
      timeFactor = clamp(remainingH1 / 20, 0, 1) * 100;
    } else {
      timeFactor = clamp(1 - remainingH1 / 22, 0, 1) * 100;
    }
    timeExpl = `Còn khoảng ${Math.round(remainingH1)} phút trong hiệp 1 (ước). `
      + (isOver
        ? (remainingH1 > 15 ? 'Còn thời gian cho bàn trong H1.' : 'Thời gian H1 hạn hẹp.')
        : (remainingH1 < 8 ? 'Sắp hết H1 — lợi Xỉu H1.' : 'Vẫn còn phút trong H1.'));
  } else {
    timeFactor = isOver
      ? clamp(remainingFt / 45, 0, 1) * 100
      : clamp(1 - (remainingFt / 90), 0, 1) * 100;
    timeExpl = `Còn ${remainingFt} phút. `
      + (isOver
        ? (remainingFt > 30 ? 'Đủ thời gian cho thêm bàn thắng.' : 'Thời gian hạn hẹp.')
        : (remainingFt < 20 ? 'Sắp hết giờ — lợi thế cho Xỉu.' : 'Vẫn còn nhiều thời gian.'));
  }

  factors.push({
    name: isH1Market ? 'Thời gian còn lại (hiệp 1)' : 'Thời gian còn lại',
    value: timeFactor,
    weight: 0.20,
    impact: timeFactor > 60 ? 'positive' : timeFactor < 40 ? 'negative' : 'neutral',
    explanation: timeExpl,
  });

  // Factor 3: Stats pressure (goal-scoring momentum)
  const totalShots = match.stats.shotsOnTarget[0] + match.stats.shotsOnTarget[1];
  const totalDA = match.stats.dangerousAttacks[0] + match.stats.dangerousAttacks[1];
  const pressureScore = clamp((totalShots / Math.max(effMinOu / 5, 1)) * 30 + (totalDA / Math.max(effMinOu / 3, 1)) * 10, 0, 100);
  const pressFactor = isOver ? pressureScore : 100 - pressureScore;

  factors.push({
    name: 'Áp lực ghi bàn',
    value: pressFactor,
    weight: 0.20,
    impact: pressFactor > 60 ? 'positive' : pressFactor < 40 ? 'negative' : 'neutral',
    explanation: (isH1Market
      ? `${totalShots} sút trúng đích, ${totalDA} tấn công nguy hiểm (tích lũy đến phút ${match.minute}; kèo H1).`
      : `${totalShots} sút trúng đích, ${totalDA} tấn công nguy hiểm.`)
      + (pressureScore > 60 ? ' Áp lực rất cao.' : pressureScore > 40 ? ' Áp lực trung bình.' : ' Áp lực thấp.'),
  });

  // Factor 4: Odds trend
  const trendField = isOver ? 'overOdds' as const : 'underOdds' as const;
  const oddsTrend = analyzeOddsTrend(oddsHistory, trendField);
  let trendScore: number;
  if (oddsTrend.trend === 'dropping') {
    trendScore = clamp(70 + oddsTrend.magnitude * 100, 60, 95);
  } else if (oddsTrend.trend === 'rising') {
    trendScore = clamp(30 - oddsTrend.magnitude * 50, 10, 40);
  } else {
    trendScore = 50;
  }

  factors.push({
    name: isH1Market ? 'Xu hướng kèo H1' : 'Xu hướng tỷ lệ kèo',
    value: trendScore,
    weight: 0.20,
    impact: trendScore > 60 ? 'positive' : trendScore < 40 ? 'negative' : 'neutral',
    explanation: oddsTrend.trend === 'dropping'
      ? `Kèo ${isOver ? 'Tài' : 'Xỉu'} đang giảm (${oddsTrend.magnitude.toFixed(2)}) — thị trường ủng hộ.`
      : oddsTrend.trend === 'rising'
        ? `Kèo ${isOver ? 'Tài' : 'Xỉu'} đang tăng — thị trường không ủng hộ.`
        : 'Kèo ổn định, chưa có tín hiệu rõ ràng.',
  });

  // Factor 5: Projected outcome
  const projectionScore = isOver
    ? clamp((projectedTotal - bet.handicap + 1) * 30 + 30, 0, 100)
    : clamp((bet.handicap - projectedTotal + 1) * 30 + 30, 0, 100);

  factors.push({
    name: 'Dự phóng kết quả',
    value: projectionScore,
    weight: 0.15,
    impact: projectionScore > 60 ? 'positive' : projectionScore < 40 ? 'negative' : 'neutral',
    explanation: isH1Market
      ? `Dự kiến thêm ~${expectedAdditional.toFixed(1)} bàn trong phần còn lại hiệp 1 (tổng ~${projectedTotal.toFixed(1)}).`
      : `Dự kiến thêm ~${expectedAdditional.toFixed(1)} bàn (tổng ~${projectedTotal.toFixed(1)}).`,
  });

  // Risk assessment
  if (isOver && gapToLine > 2 && rem < 25) {
    risks.push('Cần nhiều bàn trong thời gian ngắn — rủi ro cao');
  }
  if (!isOver && pressureScore > 70 && rem > 12) {
    risks.push('Áp lực ghi bàn rất cao — rủi ro cho Xỉu');
  }
  if (match.stats.redCards[0] > 0 || match.stats.redCards[1] > 0) {
    const side = match.stats.redCards[0] > 0 ? 'đội nhà' : 'đội khách';
    risks.push(`Thẻ đỏ (${side}) — có thể thay đổi thế trận`);
    if (isOver && match.stats.redCards[0] + match.stats.redCards[1] > 0) {
      risks.push('Đội bị thẻ đỏ thường phòng thủ nhiều hơn');
    }
  }
  if (bet.odds < 1.5) {
    risks.push('Tỷ lệ cược thấp — value không cao');
  }
  if (oddsTrend.recentDrops >= 3) {
    risks.push('Kèo giảm liên tục — có thể nhà cái đã điều chỉnh đáng kể');
  }

  if (match.minute < 10) {
    insufficient.push('Trận mới bắt đầu — dữ liệu thống kê chưa đủ để phân tích chính xác');
  }
  if (isH1Market && match.minute < 15 && match.half === 1) {
    insufficient.push('Đầu hiệp 1 — kèo H1 còn nhiều biến động');
  }
  if (oddsHistory.length < 3) {
    insufficient.push('Chưa đủ lịch sử kèo để phân tích xu hướng');
  }

  return { factors, risks, insufficient };
}

function evaluateHandicap(
  match: MatchData,
  bet: BetInput,
  oddsHistory: OddsSnapshot[],
  isHome: boolean,
): { factors: EvaluationFactor[]; risks: string[]; insufficient: string[] } {
  const factors: EvaluationFactor[] = [];
  const risks: string[] = [];
  const insufficient: string[] = [];

  const sideIndex = isHome ? 0 : 1;
  const otherIndex = isHome ? 1 : 0;
  const sideName = isHome ? 'Đội nhà' : 'Đội khách';

  const isH1Market = bet.betType.endsWith('_h1');
  const scoreDiff = match.score[sideIndex] - match.score[otherIndex];
  const effectiveMargin = scoreDiff + bet.handicap;
  const remainingFt = Math.max(0, TOTAL_MATCH_MINUTES - match.minute);
  const remainingH1 = remainingMinutesFirstHalfServer(match.minute, match.half);
  const Rhc = isH1Market ? remainingH1 : remainingFt;
  const dominance = teamDominanceScore(match.stats, sideIndex as 0 | 1);

  // Factor 1: Effective margin
  const marginScore = clamp((effectiveMargin + 2) * 25, 0, 100);
  factors.push({
    name: 'Biên kèo thực tế',
    value: marginScore,
    weight: 0.30,
    impact: effectiveMargin > 0.5 ? 'positive' : effectiveMargin < -0.5 ? 'negative' : 'neutral',
    explanation: `Tỉ số ${match.score[0]}-${match.score[1]}, kèo ${bet.handicap > 0 ? '+' : ''}${bet.handicap}. `
      + `Biên thực tế: ${effectiveMargin > 0 ? '+' : ''}${effectiveMargin.toFixed(2)}. `
      + (effectiveMargin > 0.5 ? `${sideName} đang thắng kèo.` : effectiveMargin < -0.5 ? `${sideName} đang thua kèo.` : 'Kèo đang cân bằng.'),
  });

  // Factor 2: Team dominance
  const domScore = clamp(dominance * 50, 0, 100);
  factors.push({
    name: `Thống trị trận đấu (${sideName})`,
    value: domScore,
    weight: 0.25,
    impact: domScore > 60 ? 'positive' : domScore < 40 ? 'negative' : 'neutral',
    explanation: dominance > 1.3
      ? `${sideName} đang chơi vượt trội (chỉ số ${dominance.toFixed(2)}).`
      : dominance < 0.7
        ? `${sideName} đang bị lấn lướt (chỉ số ${dominance.toFixed(2)}).`
        : `Hai đội thi đấu cân bằng (chỉ số ${dominance.toFixed(2)}).`,
  });

  // Factor 3: Time remaining
  const timeFactor = effectiveMargin > 0
    ? clamp((1 - Rhc / (isH1Market ? 50 : 90)) * 100, 0, 100)
    : clamp((isH1Market ? Rhc / 20 : Rhc / 45) * 100, 0, 100);

  factors.push({
    name: isH1Market ? 'Thời gian còn lại (hiệp 1)' : 'Thời gian còn lại',
    value: timeFactor,
    weight: 0.20,
    impact: timeFactor > 60 ? 'positive' : timeFactor < 40 ? 'negative' : 'neutral',
    explanation: effectiveMargin > 0
      ? (isH1Market
        ? `${sideName} đang thắng kèo với khoảng ${Math.round(remainingH1)} phút còn lại trong hiệp 1.`
        : `${sideName} đang thắng kèo với ${remainingFt} phút còn lại.`)
      : (isH1Market
        ? `Còn khoảng ${Math.round(remainingH1)} phút hiệp 1 để ${sideName} lật ngược.`
        : `Còn ${remainingFt} phút để ${sideName} lật ngược.`),
  });

  // Factor 4: Odds trend
  const trendField = isHome ? 'homeOdds' as const : 'awayOdds' as const;
  const oddsTrend = analyzeOddsTrend(oddsHistory, trendField);
  let trendScore = 50;
  if (oddsTrend.trend === 'dropping') {
    trendScore = clamp(70 + oddsTrend.magnitude * 80, 60, 95);
  } else if (oddsTrend.trend === 'rising') {
    trendScore = clamp(30 - oddsTrend.magnitude * 40, 10, 40);
  }

  factors.push({
    name: isH1Market ? 'Xu hướng kèo chấp H1' : 'Xu hướng kèo chấp',
    value: trendScore,
    weight: 0.15,
    impact: trendScore > 60 ? 'positive' : trendScore < 40 ? 'negative' : 'neutral',
    explanation: oddsTrend.trend === 'dropping'
      ? `Kèo ${sideName} đang giảm — thị trường ủng hộ.`
      : oddsTrend.trend === 'rising'
        ? `Kèo ${sideName} đang tăng — thị trường không ủng hộ.`
        : 'Kèo ổn định.',
  });

  // Factor 5: Red card impact
  const ownReds = match.stats.redCards[sideIndex];
  const oppReds = match.stats.redCards[otherIndex];
  let redCardScore = 50;
  if (oppReds > 0) redCardScore = clamp(50 + oppReds * 20, 50, 85);
  if (ownReds > 0) redCardScore = clamp(50 - ownReds * 25, 15, 50);

  if (ownReds > 0 || oppReds > 0) {
    factors.push({
      name: 'Ảnh hưởng thẻ đỏ',
      value: redCardScore,
      weight: 0.10,
      impact: redCardScore > 60 ? 'positive' : redCardScore < 40 ? 'negative' : 'neutral',
      explanation: oppReds > 0
        ? `Đối thủ có ${oppReds} thẻ đỏ — lợi thế cho ${sideName}.`
        : `${sideName} có ${ownReds} thẻ đỏ — bất lợi.`,
    });
  }

  // Risks
  if (effectiveMargin < -1 && (isH1Market ? remainingH1 : remainingFt) < 18) {
    risks.push(`${sideName} thua kèo lớn với ít thời gian còn lại`);
  }
  if (dominance < 0.6 && effectiveMargin <= 0) {
    risks.push(`${sideName} đang bị lấn lướt và không dẫn kèo`);
  }
  if (ownReds > 0) {
    risks.push(`${sideName} thiếu người — bất lợi rõ ràng`);
  }
  if (bet.odds < 1.5) {
    risks.push('Tỷ lệ cược thấp — value không hấp dẫn');
  }

  if (match.minute < 10) {
    insufficient.push('Trận mới bắt đầu — chưa đủ dữ liệu');
  }
  if (isH1Market && match.minute < 15 && match.half === 1) {
    insufficient.push('Đầu hiệp 1 — kèo H1 còn nhiều biến động');
  }
  if (oddsHistory.length < 3) {
    insufficient.push('Chưa đủ lịch sử kèo');
  }

  return { factors, risks, insufficient };
}

function calculateWeightedScore(factors: EvaluationFactor[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return 50;
  const weighted = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
  return clamp(Math.round(weighted / totalWeight), 0, 100);
}

function scoreToRecommendation(score: number, confidence: number): { rec: Recommendation; text: string } {
  if (confidence < 30) {
    return { rec: 'hold', text: 'Chưa đủ dữ liệu để đánh giá chính xác. Nên chờ thêm.' };
  }
  if (score >= 80) {
    return { rec: 'strong_enter', text: 'Kèo rất hợp lý — tín hiệu mạnh để vào.' };
  }
  if (score >= 65) {
    return { rec: 'enter', text: 'Kèo hợp lý — có thể vào với stake vừa phải.' };
  }
  if (score >= 50) {
    return { rec: 'hold', text: 'Kèo trung bình — cân nhắc kỹ trước khi vào.' };
  }
  if (score >= 35) {
    return { rec: 'reduce_stake', text: 'Kèo không thuận lợi — nếu đã vào, giảm stake.' };
  }
  if (score >= 20) {
    return { rec: 'exit', text: 'Rủi ro cao — nên thoát kèo nếu có thể.' };
  }
  return { rec: 'no_enter', text: 'Không nên vào — tín hiệu tiêu cực rõ ràng.' };
}

function estimateWinProbability(
  score: number,
  factors: EvaluationFactor[],
  betType: BetType,
  match: MatchData,
  bet: BetInput,
): number {
  let base: number;

  const isOverUnder = betType.includes('over') || betType.includes('under');
  const isH1Bet = betType.endsWith('_h1');
  if (isOverUnder) {
    const isOver = betType.includes('over');
    const totalGoals = match.score[0] + match.score[1];
    const gap = bet.handicap - totalGoals;
    const remainingFt = Math.max(0, TOTAL_MATCH_MINUTES - match.minute);
    const remainingH1 = remainingMinutesFirstHalfServer(match.minute, match.half);
    const rem = isH1Bet ? remainingH1 : remainingFt;

    if (isOver) {
      if (isH1Bet) {
        if (gap <= 0) base = 85;
        else if (gap <= 1 && rem > 15) base = 48;
        else if (gap <= 1) base = 28;
        else if (gap <= 2 && rem > 12) base = 32;
        else base = 18;
      } else if (gap <= 0) base = 85;
      else if (gap <= 1 && rem > 30) base = 55;
      else if (gap <= 1 && rem <= 30) base = 35;
      else if (gap <= 2 && rem > 45) base = 40;
      else base = 20;
    } else if (isH1Bet) {
      if (gap >= 3 && rem < 12) base = 78;
      else if (gap >= 2) base = 55;
      else if (gap >= 1 && rem < 10) base = 62;
      else base = 42;
    } else {
      if (gap >= 3 && rem < 30) base = 80;
      else if (gap >= 2) base = 60;
      else if (gap >= 1 && rem < 20) base = 65;
      else base = 40;
    }
  } else {
    const isHome = betType.includes('home');
    const sideIndex = isHome ? 0 : 1;
    const otherIndex = isHome ? 1 : 0;
    const effectiveMargin = (match.score[sideIndex] - match.score[otherIndex]) + bet.handicap;

    if (effectiveMargin > 1.5) base = 75;
    else if (effectiveMargin > 0.5) base = 60;
    else if (effectiveMargin > -0.5) base = 45;
    else if (effectiveMargin > -1.5) base = 30;
    else base = 15;
  }

  // Adjust based on weighted factors
  const factorAdjust = (score - 50) * 0.3;
  return clamp(Math.round(base + factorAdjust), 5, 95);
}

export function evaluateBet(
  match: MatchData,
  bet: BetInput,
  oddsHistory: OddsSnapshot[],
): BetEvaluation {
  const betType = bet.betType;
  const isH1Bet = betType.endsWith('_h1');

  if (isH1Bet && match.half === 2) {
    return {
      matchId: match.id,
      betType,
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
          explanation: 'Sau hiệp 1, cần tỉ số từng hiệp; dữ liệu không tách H1/H2.',
        },
      ],
      insufficientData: ['Cần tỉ số hiệp 1 sau khi H1 kết thúc'],
      timestamp: Date.now(),
    };
  }

  const isOverUnder = betType.includes('over') || betType.includes('under');

  let result: { factors: EvaluationFactor[]; risks: string[]; insufficient: string[] };

  if (isOverUnder) {
    const isOver = betType.includes('over');
    result = evaluateOverUnder(match, bet, oddsHistory, isOver);
  } else {
    const isHome = betType.includes('home');
    result = evaluateHandicap(match, bet, oddsHistory, isHome);
  }

  const score = calculateWeightedScore(result.factors);

  // Confidence based on data availability
  let confidence = 70;
  if (match.minute < 10) confidence -= 25;
  if (match.minute >= 30 && match.minute < 45) confidence += 10;
  if (match.minute >= 50) confidence += 15;
  if (oddsHistory.length >= 5) confidence += 10;
  if (oddsHistory.length < 3) confidence -= 20;
  if (isH1Bet) {
    const rh1 = remainingMinutesFirstHalfServer(match.minute, match.half);
    if (rh1 > 0 && rh1 < 10) confidence -= 14;
  }
  if (result.insufficient.length > 0) confidence -= result.insufficient.length * 10;
  confidence = clamp(confidence, 10, 95);

  const winProbability = estimateWinProbability(score, result.factors, betType, match, bet);
  const { rec, text } = scoreToRecommendation(score, confidence);

  return {
    matchId: match.id,
    betType,
    score,
    winProbability,
    confidence,
    recommendation: rec,
    recommendationText: text,
    risks: result.risks,
    factors: result.factors,
    insufficientData: result.insufficient,
    timestamp: Date.now(),
  };
}
