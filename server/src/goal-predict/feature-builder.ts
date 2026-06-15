/**
 * Tính feature vector cho một thời điểm (matchId, half, clockMinute) từ ParsedMatch.
 * Dùng chung cho extract dataset (offline) và live inference (online).
 */

import type {
  ParsedMatch,
  StatRow,
  OddsSnap,
  Half,
  AlertEntry,
  EventEntry,
} from './md-parser.js';

/**
 * Cửa sổ tương lai (phút) để gán nhãn "có bàn thắng trong tương lai".
 * Đổi giá trị này → phải re-extract dataset (`npm run extract-goal-data`)
 * và retrain model (notebook `train-goal-model.ipynb`) để ONNX khớp lại.
 */
export const GOAL_WINDOW_MIN = 15;

/** Cửa sổ ngắn — train model "goal-imminent-5min" song song. */
export const GOAL_WINDOW_MIN_SHORT = 5;

/** Cửa sổ dài — model CHÍNH "goal-imminent-30min" (tín hiệu mạnh nhất trong 3 cửa sổ). */
export const GOAL_WINDOW_MIN_LONG = 30;

/** Thứ tự cột — phải khớp với schema XGBoost / ONNX input. */
export const FEATURE_NAMES = [
  'minute',
  'half',
  'total_goals_so_far',
  // stats deltas (3-min window)
  'da_h_delta_3m',
  'da_a_delta_3m',
  'da_total_3m',
  'shots_total_delta_3m',
  'on_target_delta_3m',
  'corners_delta_3m',
  'yellow_delta_3m',
  // OU 1_3 (full match)
  'ou13_handicap',
  'ou13_over_odds',
  'ou13_under_odds',
  'ou13_under_rises_5m_count',
  'ou13_under_rises_5m_sum',
  'ou13_under_rises_max_step_5m',
  'ou13_over_drops_5m_count',
  'ou13_over_drops_5m_sum',
  'ou13_over_max_step_5m',
  // AH 1_2 (full match)
  'ah12_handicap',
  'ah12_home_odds',
  'ah12_away_odds',
  'ah12_home_drops_5m_count',
  'ah12_home_drops_5m_sum',
  'ah12_home_max_step_5m',
  // alerts
  'pressure_alert_count_3m',
  'pressure_alert_max_3m',
  // man-advantage (thẻ đỏ): >0 = chủ nhà hơn người, <0 = đội khách hơn người
  'man_advantage',
  // shot quality features (v3) — phân biệt "áp đảo ảo" vs "cơ hội thật"
  'shot_accuracy_3m',      // on_target_delta / shots_delta: NaN khi shots=0 (XGBoost xử lý missing)
  'on_target_acceleration', // đạo hàm bậc 2: tốc độ tăng on_target đang tăng tốc hay chậm lại
  'big_chance_missed_3m',  // shots_total_delta - on_target_delta: sút mà không trúng khung
  // v4 — fix "model 30' không có tín hiệu": market-implied + time-remaining + nhịp dài + level stats
  'expected_remaining_goals', // ou13_handicap - total_goals_so_far: số bàn thị trường còn kỳ vọng (NaN khi thiếu odds)
  'minutes_remaining',        // 95 - clockMinute (ước lượng, dùng cùng công thức ở extract & serve để tránh skew)
  'da_total_10m',             // delta dangerous attacks 10' — nhịp dài khớp horizon nhãn 30'
  'shots_total_delta_10m',    // delta tổng sút 10'
  'da_share_home',            // daH/(daH+daA) trong 3': NaN khi tổng = 0 (cùng pattern shot_accuracy_3m)
  'shots_total',              // level: tổng sút cả trận đến hiện tại (đo độ "mở" của trận)
  'corners_total',            // level: tổng phạt góc
  'da_total',                 // level: tổng dangerous attacks
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type FeatureVector = Record<FeatureName, number>;

export interface FeatureRow extends FeatureVector {
  match_id: string;
  /** Có bàn thắng trong `GOAL_WINDOW_MIN` phút tới (label kế thừa tên `goal_within_5min` để giữ tương thích dataset cũ). */
  goal_within_window: 0 | 1;
}

function statAt(stats: StatRow[], half: Half, minute: number): StatRow | null {
  const sameHalf = stats.filter((s) => s.half === half && s.clockMinute <= minute);
  if (sameHalf.length === 0) return null;
  return sameHalf.reduce((a, b) => (b.clockMinute >= a.clockMinute ? b : a));
}

/**
 * Stat row "back" phút trước (half, minute) — TÍNH theo timeline cả trận, KHÔNG khóa trong hiệp.
 * Stat counters là cumulative cả trận: ở đầu hiệp 2, lookback trong-hiệp trả null nên delta_3m bị
 * tính nhầm = tổng tích lũy cả trận. Hàm này cho phép bắc qua ranh giới hiệp (lấy row cuối hiệp 1)
 * để delta phản ánh đúng ~3 phút gần nhất.
 */
function statAtLookback(stats: StatRow[], half: Half, minute: number, back: number): StatRow | null {
  const target = minute - back;
  const cands = stats.filter((s) => s.half < half || (s.half === half && s.clockMinute <= target));
  if (cands.length === 0) return null;
  return cands.reduce((a, b) => {
    if (b.half !== a.half) return b.half > a.half ? b : a;
    return b.clockMinute >= a.clockMinute ? b : a;
  });
}

function oddsAt(odds: OddsSnap[], marketId: OddsSnap['marketId'], half: Half, minute: number): OddsSnap | null {
  const filtered = odds.filter(
    (o) => o.marketId === marketId && (o.half === half || o.half === 2 || half === 2) && o.clockMinute <= minute,
  );
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => (b.clockMinute >= a.clockMinute ? b : a));
}

/** Vạch mở hiệp — snapshot sớm nhất của market trong half (line đầu H1/H2). */
export function openingLineAt(
  odds: OddsSnap[],
  marketId: OddsSnap['marketId'],
  half: Half,
): { handicap: number; minute: number } | null {
  const filtered = odds
    .filter((o) => o.marketId === marketId && o.half === half && Number.isFinite(o.handicap))
    .sort((a, b) => a.clockMinute - b.clockMinute);
  if (filtered.length === 0) return null;
  const first = filtered[0];
  return { handicap: first.handicap, minute: first.clockMinute };
}

/** Vạch mở 1_3 + 1_2 đầu H1/H2 — dùng xếp hạng trận tương tự theo line đầu hiệp. */
export interface OpeningLinesRef {
  h1OpenOu13?: number;
  h2OpenOu13?: number;
  h1OpenAh12?: number;
  h2OpenAh12?: number;
}

export function buildOpeningLinesRef(parsed: ParsedMatch): OpeningLinesRef {
  const h1 = openingLineAt(parsed.odds, '1_3', 1);
  const h2 = openingLineAt(parsed.odds, '1_3', 2);
  const h1ah = openingLineAt(parsed.odds, '1_2', 1);
  const h2ah = openingLineAt(parsed.odds, '1_2', 2);
  return {
    h1OpenOu13: h1?.handicap,
    h2OpenOu13: h2?.handicap,
    h1OpenAh12: h1ah?.handicap,
    h2OpenAh12: h2ah?.handicap,
  };
}

interface DropStats {
  count: number;
  sumAmt: number;
  maxStep: number;
}

/**
 * Đếm số lần giá kèo dịch chuyển theo `direction` trong cửa sổ:
 *  - 'drop' = giá GIẢM (step = prev - cur > 0)
 *  - 'rise' = giá TĂNG (step = cur - prev > 0)
 * Theo quy tắc áp lực có bàn: phía Tài tính 'drop' (Tài giảm), phía Xỉu tính 'rise'
 * (Xỉu tăng) — vì giá Xỉu giảm dần theo thời gian là diễn biến BÌNH THƯỜNG.
 */
function oddsMovesInWindow(
  odds: OddsSnap[],
  marketId: OddsSnap['marketId'],
  field: 'over' | 'under' | 'home' | 'away',
  half: Half,
  minuteFrom: number,
  minuteTo: number,
  direction: 'drop' | 'rise' = 'drop',
): DropStats {
  const series = odds
    .filter((o) => o.marketId === marketId && o.half === half && o.clockMinute >= minuteFrom && o.clockMinute <= minuteTo)
    .sort((a, b) => a.clockMinute - b.clockMinute);
  let count = 0;
  let sumAmt = 0;
  let maxStep = 0;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    if (prev.handicap !== cur.handicap) continue;
    const prevV = (prev as unknown as Record<string, unknown>)[field];
    const curV = (cur as unknown as Record<string, unknown>)[field];
    if (typeof prevV !== 'number' || typeof curV !== 'number') continue;
    const step = direction === 'drop' ? prevV - curV : curV - prevV;
    if (step > 0) {
      count++;
      sumAmt += step;
      if (step > maxStep) maxStep = step;
    }
  }
  return { count, sumAmt, maxStep };
}

function alertsInWindow(alerts: AlertEntry[], half: Half, minuteFrom: number, minuteTo: number) {
  const inWin = alerts.filter(
    (a) => a.half === half && a.clockMinute >= minuteFrom && a.clockMinute <= minuteTo,
  );
  const max = inWin.reduce((m, a) => Math.max(m, a.pressure), 0);
  return { count: inWin.length, max };
}

/**
 * Có bàn thắng trong cửa sổ (minuteFrom, minuteTo] tính theo game-clock LIÊN TỤC xuyên hiệp
 * (clockMinute H2 đã là 46–90). Trước đây khóa same-half → với window 30' trong hiệp 45',
 * dataset chỉ còn H1 phút 3–15 và H2 phút 46–60 (truncation bias, base rate ~62%).
 */
function goalInWindow(events: EventEntry[], minuteFrom: number, minuteTo: number): boolean {
  return events.some(
    (e) => e.type === 'goal' && e.clockMinute > minuteFrom && e.clockMinute <= minuteTo,
  );
}

function goalsSoFar(events: EventEntry[], half: Half, minute: number): number {
  return events.filter((e) => e.type === 'goal' && (e.half < half || (e.half === half && e.clockMinute <= minute))).length;
}

/**
 * Tính 1 feature vector tại (half, minute) cho match. Trả về null nếu thiếu data tối thiểu (stats không có).
 */
export function buildFeatureVector(
  match: ParsedMatch,
  half: Half,
  minute: number,
): FeatureVector | null {
  const cur = statAt(match.stats, half, minute);
  if (!cur) return null;
  const prev3 = statAtLookback(match.stats, half, minute, 3);
  const prev6 = statAtLookback(match.stats, half, minute, 6);
  const prev10 = statAtLookback(match.stats, half, minute, 10);

  const daH = cur.dangerous[0] - (prev3?.dangerous[0] ?? 0);
  const daA = cur.dangerous[1] - (prev3?.dangerous[1] ?? 0);

  const shotsCurH = cur.onTarget[0] + cur.offTarget[0];
  const shotsCurA = cur.onTarget[1] + cur.offTarget[1];
  const shotsPrevH = (prev3?.onTarget[0] ?? 0) + (prev3?.offTarget[0] ?? 0);
  const shotsPrevA = (prev3?.onTarget[1] ?? 0) + (prev3?.offTarget[1] ?? 0);
  const shotsTotalDelta3m = shotsCurH + shotsCurA - shotsPrevH - shotsPrevA;

  const onTargetCur = cur.onTarget[0] + cur.onTarget[1];
  const onTargetAtPrev3 = (prev3?.onTarget[0] ?? 0) + (prev3?.onTarget[1] ?? 0);
  const onTargetAtPrev6 = (prev6?.onTarget[0] ?? 0) + (prev6?.onTarget[1] ?? 0);
  const onTargetDelta = onTargetCur - onTargetAtPrev3;
  const onTargetDeltaEarlier = onTargetAtPrev3 - onTargetAtPrev6;
  const cornersDelta = cur.corners[0] + cur.corners[1] - ((prev3?.corners[0] ?? 0) + (prev3?.corners[1] ?? 0));
  const yellowDelta = cur.yellow[0] + cur.yellow[1] - ((prev3?.yellow[0] ?? 0) + (prev3?.yellow[1] ?? 0));

  const ou13 = oddsAt(match.odds, '1_3', half, minute);
  const ah12 = oddsAt(match.odds, '1_2', half, minute);

  const totalGoals = goalsSoFar(match.events, half, minute);
  const daTotal10m =
    cur.dangerous[0] + cur.dangerous[1] - ((prev10?.dangerous[0] ?? 0) + (prev10?.dangerous[1] ?? 0));
  const shotsPrev10 =
    (prev10?.onTarget[0] ?? 0) + (prev10?.offTarget[0] ?? 0) + (prev10?.onTarget[1] ?? 0) + (prev10?.offTarget[1] ?? 0);
  const shotsTotalDelta10m = shotsCurH + shotsCurA - shotsPrev10;
  const daDelta3mTotal = daH + daA;

  // Áp lực OU: Tài GIẢM (drop) hoặc Xỉu TĂNG (rise). Xỉu giảm dần = bình thường → không tính.
  const ouUnderRises = oddsMovesInWindow(match.odds, '1_3', 'under', half, minute - 5, minute, 'rise');
  const ouOverDrops = oddsMovesInWindow(match.odds, '1_3', 'over', half, minute - 5, minute, 'drop');
  const ahHomeDrops = oddsMovesInWindow(match.odds, '1_2', 'home', half, minute - 5, minute, 'drop');

  const alertWin = alertsInWindow(match.alerts, half, minute - 3, minute);

  return {
    minute,
    half,
    total_goals_so_far: totalGoals,
    da_h_delta_3m: daH,
    da_a_delta_3m: daA,
    da_total_3m: daH + daA,
    shots_total_delta_3m: shotsTotalDelta3m,
    on_target_delta_3m: onTargetDelta,
    corners_delta_3m: cornersDelta,
    yellow_delta_3m: yellowDelta,
    // Giá trị "level" (handicap/odds) thiếu → NaN để XGBoost xử lý như missing (default direction),
    // thay vì sentinel -1/0 trộn lẫn với giá trị thật. Count/sum của drop vẫn là 0 hợp lệ.
    ou13_handicap: ou13?.handicap ?? NaN,
    ou13_over_odds: ou13?.over ?? NaN,
    ou13_under_odds: ou13?.under ?? NaN,
    ou13_under_rises_5m_count: ouUnderRises.count,
    ou13_under_rises_5m_sum: ouUnderRises.sumAmt,
    ou13_under_rises_max_step_5m: ouUnderRises.maxStep,
    ou13_over_drops_5m_count: ouOverDrops.count,
    ou13_over_drops_5m_sum: ouOverDrops.sumAmt,
    ou13_over_max_step_5m: ouOverDrops.maxStep,
    ah12_handicap: ah12?.handicap ?? NaN,
    ah12_home_odds: ah12?.home ?? NaN,
    ah12_away_odds: ah12?.away ?? NaN,
    ah12_home_drops_5m_count: ahHomeDrops.count,
    ah12_home_drops_5m_sum: ahHomeDrops.sumAmt,
    ah12_home_max_step_5m: ahHomeDrops.maxStep,
    pressure_alert_count_3m: alertWin.count,
    pressure_alert_max_3m: alertWin.max,
    // thẻ đỏ: red[0]=chủ, red[1]=khách. >0 → chủ nhà hơn người (đối thủ bị đuổi nhiều hơn).
    man_advantage: cur.red[1] - cur.red[0],
    // shot quality (v3): NaN khi shots=0 để XGBoost xử lý missing (không dùng 0 tránh nhầm với "sút trượt hết")
    shot_accuracy_3m: shotsTotalDelta3m > 0 ? onTargetDelta / shotsTotalDelta3m : NaN,
    on_target_acceleration: onTargetDelta - onTargetDeltaEarlier,
    big_chance_missed_3m: shotsTotalDelta3m - onTargetDelta,
    // v4: market-implied số bàn còn lại — thị trường là nguồn tín hiệu mạnh nhất hiện có
    expected_remaining_goals: ou13 ? ou13.handicap - totalGoals : NaN,
    minutes_remaining: Math.max(0, 95 - minute),
    da_total_10m: daTotal10m,
    shots_total_delta_10m: shotsTotalDelta10m,
    da_share_home: daDelta3mTotal > 0 ? daH / daDelta3mTotal : NaN,
    shots_total: shotsCurH + shotsCurA,
    corners_total: cur.corners[0] + cur.corners[1],
    da_total: cur.dangerous[0] + cur.dangerous[1],
  };
}

/** Yêu cầu tối thiểu data tương lai (phút) để 1 row được giữ — tránh label trên cửa sổ quá cụt. */
const MIN_LABEL_HORIZON_MIN = 10;

/**
 * Build full dataset (rows + labels) cho 1 trận.
 * Sample tại mọi clockMinute có stat row (cả 2 hiệp); nhãn tính trên game-clock LIÊN TỤC xuyên hiệp:
 * dương khi có bàn trong (m, min(m + windowMin, dataEnd)].
 *
 * Trước đây điều kiện `m + windowMin > maxMin (per-half)` loại sạch late-half rows — với window 30'
 * chỉ còn H1 phút 3–15 + H2 phút 46–60, gây truncation bias (model học base rate ~62%). Giờ giữ row
 * khi còn ≥ MIN_LABEL_HORIZON_MIN phút data; cửa sổ bị cắt ở cuối trận được model nhận biết qua
 * feature `minutes_remaining`.
 */
export function buildFeatureRows(match: ParsedMatch, windowMin: number = GOAL_WINDOW_MIN): FeatureRow[] {
  const out: FeatureRow[] = [];
  const sampledMinutes: Array<{ half: Half; minute: number }> = [];
  for (const half of [1, 2] as Half[]) {
    const stats = match.stats.filter((s) => s.half === half);
    if (stats.length === 0) continue;
    for (const m of new Set(stats.map((s) => s.clockMinute))) {
      sampledMinutes.push({ half, minute: m });
    }
  }
  if (sampledMinutes.length === 0) return out;
  // dataEnd = mốc cuối cùng còn quan sát được (stats hoặc event) — cap cửa sổ nhãn tại đây.
  const statsMax = Math.max(...sampledMinutes.map((x) => x.minute));
  const eventsMax = match.events.reduce((mx, e) => Math.max(mx, e.clockMinute), 0);
  const dataEnd = Math.max(statsMax, eventsMax);
  sampledMinutes.sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
  for (const { half, minute: m } of sampledMinutes) {
    if (m < 3) continue;
    if (dataEnd - m < MIN_LABEL_HORIZON_MIN) continue;
    const fv = buildFeatureVector(match, half, m);
    if (!fv) continue;
    const label = goalInWindow(match.events, m, Math.min(m + windowMin, dataEnd)) ? 1 : 0;
    out.push({ match_id: match.meta.matchId, goal_within_window: label, ...fv });
  }
  return out;
}
