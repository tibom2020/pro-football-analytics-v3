/**
 * Chuỗi kèo màu + bucket cường độ giảm giá — đồng bộ với Dashboard (OddsDropChart / MomentumChart).
 */
import type {
  AsianHandicapMinuteSnapshot,
  ColoredHandicapPoint,
  MatchInfo,
  OverUnderMinuteSnapshot,
} from '../types';
import type { MatchHalf } from './matchTimeline';
import { resolveMatchHalfForUI } from './matchTimeline';

export function colorOddsSeriesForPressure(
  rawOdds: readonly (OverUnderMinuteSnapshot | AsianHandicapMinuteSnapshot)[],
): ColoredHandicapPoint[] {
  if (!rawOdds || rawOdds.length === 0) return [];

  const sortedPoints = [...rawOdds].sort((a, b) => a.minute - b.minute);

  const coloredPoints: ColoredHandicapPoint[] = sortedPoints.map((point, index) => {
    let color = '#94a3b8';
    let colorName = 'gray';
    const value = 'over' in point ? point.over : point.home;
    const prevPoint = index > 0 ? sortedPoints[index - 1] : null;
    const prevValue = prevPoint ? ('over' in prevPoint ? prevPoint.over : prevPoint.home) : null;

    if (prevPoint && prevValue !== null) {
      const diff = value - prevValue;
      const handicapDiff =
        (typeof point.handicap === 'number' ? point.handicap : parseFloat(String(point.handicap))) -
        (typeof prevPoint.handicap === 'number' ? prevPoint.handicap : parseFloat(String(prevPoint.handicap)));

      const isLineChanged = Math.abs(handicapDiff) > 0.001;

      if (diff < -0.001 && !isLineChanged) {
        color = '#ef4444';
        colorName = 'red';
      } else if (diff > 0.001 && !isLineChanged) {
        color = '#10b981';
        colorName = 'green';
      }
    }

    const handicapNum = typeof point.handicap === 'number' ? point.handicap : parseFloat(String(point.handicap));

    return {
      ...point,
      handicap: handicapNum,
      color,
      colorName,
      highlight: false,
    } as ColoredHandicapPoint;
  });

  for (let i = 0; i <= coloredPoints.length - 3; i++) {
    const [b1, b2, b3] = [coloredPoints[i], coloredPoints[i + 1], coloredPoints[i + 2]];
    const isAllRed = b1.colorName === 'red' && b2.colorName === 'red' && b3.colorName === 'red';
    const isWithinTime = b3.minute - b1.minute < 8;

    if (isAllRed && isWithinTime) {
      b1.highlight = b2.highlight = b3.highlight = true;
    }
  }

  return coloredPoints;
}

/**
 * Màu theo **giá Xỉu** (chỉ OU 1_3 / 1_6): bình thường Xỉu giảm → xanh; bất thường Xỉu tăng → đỏ.
 * `buildDropSeries` trên chuỗi này đếm số lần **tăng** Xỉu mỗi phút (colorName === 'red').
 */
export function colorOddsSeriesForUnderXiu(rawOdds: readonly OverUnderMinuteSnapshot[]): ColoredHandicapPoint[] {
  if (!rawOdds || rawOdds.length === 0) return [];

  const sortedPoints = [...rawOdds].sort((a, b) => a.minute - b.minute);

  const coloredPoints: ColoredHandicapPoint[] = sortedPoints.map((point, index) => {
    let color = '#94a3b8';
    let colorName = 'gray';
    const value = point.under;
    const prevPoint = index > 0 ? sortedPoints[index - 1] : null;
    const prevValue = prevPoint ? prevPoint.under : null;

    if (prevPoint && prevValue !== null && Number.isFinite(value) && Number.isFinite(prevValue)) {
      const diff = value - prevValue;
      const handicapDiff =
        (typeof point.handicap === 'number' ? point.handicap : parseFloat(String(point.handicap))) -
        (typeof prevPoint.handicap === 'number' ? prevPoint.handicap : parseFloat(String(prevPoint.handicap)));

      const isLineChanged = Math.abs(handicapDiff) > 0.001;

      if (diff > 0.001 && !isLineChanged) {
        color = '#ef4444';
        colorName = 'red';
      } else if (diff < -0.001 && !isLineChanged) {
        color = '#10b981';
        colorName = 'green';
      }
    }

    const handicapNum = typeof point.handicap === 'number' ? point.handicap : parseFloat(String(point.handicap));

    return {
      ...point,
      handicap: handicapNum,
      color,
      colorName,
      highlight: false,
    } as ColoredHandicapPoint;
  });

  for (let i = 0; i <= coloredPoints.length - 3; i++) {
    const [b1, b2, b3] = [coloredPoints[i], coloredPoints[i + 1], coloredPoints[i + 2]];
    const isAllRed = b1.colorName === 'red' && b2.colorName === 'red' && b3.colorName === 'red';
    const isWithinTime = b3.minute - b1.minute < 8;

    if (isAllRed && isWithinTime) {
      b1.highlight = b2.highlight = b3.highlight = true;
    }
  }

  return coloredPoints;
}

/**
 * Áp lực kèo Tài/Xỉu theo quy tắc nghiệp vụ:
 * CHỈ coi là **áp lực** (đỏ) khi **giá Tài giảm** HOẶC **giá Xỉu tăng** so với
 * điểm trước. Bình thường giá Xỉu giảm dần theo thời gian (trận không có bàn) →
 * KHÔNG tính là áp lực (để xanh). Bỏ qua khi line (handicap) thay đổi.
 *
 * Khác với `colorOddsSeriesForPressure` (chỉ nhìn giá Tài) và
 * `colorOddsSeriesForUnderXiu` (chỉ nhìn giá Xỉu) — hàm này gộp cả hai chiều.
 */
export function colorOddsSeriesForOuPressure(
  rawOdds: readonly OverUnderMinuteSnapshot[],
): ColoredHandicapPoint[] {
  if (!rawOdds || rawOdds.length === 0) return [];

  const sortedPoints = [...rawOdds].sort((a, b) => a.minute - b.minute);

  const coloredPoints: ColoredHandicapPoint[] = sortedPoints.map((point, index) => {
    let color = '#94a3b8';
    let colorName = 'gray';
    const over = point.over;
    const under = point.under;
    const prevPoint = index > 0 ? sortedPoints[index - 1] : null;

    if (prevPoint) {
      const handicapDiff =
        (typeof point.handicap === 'number' ? point.handicap : parseFloat(String(point.handicap))) -
        (typeof prevPoint.handicap === 'number'
          ? prevPoint.handicap
          : parseFloat(String(prevPoint.handicap)));
      const isLineChanged = Math.abs(handicapDiff) > 0.001;

      if (!isLineChanged) {
        const overDropped =
          Number.isFinite(over) &&
          Number.isFinite(prevPoint.over) &&
          (over as number) - (prevPoint.over as number) < -0.001;
        const underRose =
          Number.isFinite(under) &&
          Number.isFinite(prevPoint.under) &&
          (under as number) - (prevPoint.under as number) > 0.001;

        if (overDropped || underRose) {
          color = '#ef4444';
          colorName = 'red';
        } else {
          // Xỉu giảm / Tài tăng (hoặc đứng yên) = diễn biến bình thường → xanh.
          const overRose =
            Number.isFinite(over) &&
            Number.isFinite(prevPoint.over) &&
            (over as number) - (prevPoint.over as number) > 0.001;
          const underDropped =
            Number.isFinite(under) &&
            Number.isFinite(prevPoint.under) &&
            (under as number) - (prevPoint.under as number) < -0.001;
          if (overRose || underDropped) {
            color = '#10b981';
            colorName = 'green';
          }
        }
      }
    }

    const handicapNum =
      typeof point.handicap === 'number' ? point.handicap : parseFloat(String(point.handicap));

    return {
      ...point,
      handicap: handicapNum,
      color,
      colorName,
      highlight: false,
    } as ColoredHandicapPoint;
  });

  for (let i = 0; i <= coloredPoints.length - 3; i++) {
    const [b1, b2, b3] = [coloredPoints[i], coloredPoints[i + 1], coloredPoints[i + 2]];
    const isAllRed = b1.colorName === 'red' && b2.colorName === 'red' && b3.colorName === 'red';
    const isWithinTime = b3.minute - b1.minute < 8;
    if (isAllRed && isWithinTime) {
      b1.highlight = b2.highlight = b3.highlight = true;
    }
  }

  return coloredPoints;
}

/**
 * Trục Y (HDP) cho MomentumChart — domain/ticks bậc 0.25 quanh các mức handicap thật.
 * Cùng logic với `calculateYAxisConfig` trong Dashboard (bản thuần, dùng lại cho modal biểu đồ trận tương tự).
 */
export function calculateOddsYAxisConfig(
  chartData: { handicap?: number }[],
  minDomainValue: number | null,
  domainFallback?: { handicap?: number }[],
): { domain: number[]; ticks: number[] } {
  const collectH = (rows: { handicap?: number }[]) =>
    rows.map((d) => d.handicap).filter((h): h is number => typeof h === 'number' && isFinite(h));

  let allHandicaps = collectH(chartData);
  if (allHandicaps.length === 0 && minDomainValue === null && domainFallback?.length) {
    allHandicaps = collectH(domainFallback);
  }

  const buildTicks = (lo: number, hi: number) => {
    const t: number[] = [];
    for (let i = lo; i <= hi; i = parseFloat((i + 0.25).toFixed(2))) {
      if (t.length > 100) break;
      t.push(i);
    }
    return t;
  };

  if (allHandicaps.length === 0) {
    const defaultMin = minDomainValue ?? 0;
    return { domain: [defaultMin, defaultMin + 2], ticks: buildTicks(defaultMin, defaultMin + 2) };
  }

  let minDomain: number;
  if (minDomainValue !== null) {
    minDomain = minDomainValue;
  } else {
    minDomain = Math.floor(Math.min(...allHandicaps) / 0.25) * 0.25;
  }
  let maxDomain = Math.ceil(Math.max(...allHandicaps) / 0.25) * 0.25;
  // Một mức HDP duy nhất → min === max → nới 2 phía để không fallback [0,2] vẽ sai.
  if (minDomain >= maxDomain) {
    minDomain -= 0.25;
    maxDomain += 0.25;
  }
  const ticks = buildTicks(minDomain, maxDomain);
  if (ticks.length <= 1) {
    const defaultMin = minDomainValue ?? 0;
    return { domain: [defaultMin, defaultMin + 2], ticks: buildTicks(defaultMin, defaultMin + 2) };
  }
  return { domain: [minDomain, maxDomain], ticks };
}

/** UI đã vào hiệp 2: kèo full trận (1_3/1_2) gắn half theo phút 45. */
export function applyHalfFromMinuteForFullMatchOdds<T extends { minute: number; half?: MatchHalf }>(
  rows: T[],
  inSecondHalf: boolean,
): T[] {
  if (!inSecondHalf || rows.length === 0) return rows;
  return rows.map((p) => ({
    ...p,
    half: (p.minute < 45 ? 1 : 2) as MatchHalf,
  }));
}

export function buildDropSeries(
  points: ColoredHandicapPoint[],
  xMin: number,
  xMax: number,
  capMinute: number,
): { minute: number; count: number }[] {
  const counts: Record<number, number> = {};
  points.forEach((p) => {
    if (p.colorName === 'red') counts[p.minute] = (counts[p.minute] || 0) + 1;
  });
  const hi = Math.min(xMax, capMinute);
  return Array.from({ length: hi - xMin + 1 }, (_, i) => ({
    minute: xMin + i,
    count: counts[xMin + i] || 0,
  })).filter((d) => d.minute <= hi);
}

function minuteTicks(lo: number, hi: number, step: number): number[] {
  if (hi < lo || step <= 0) return [];
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let t = start; t <= hi + 1e-9; t += step) {
    const x = Math.round(t * 100) / 100;
    if (x >= lo - 1e-9 && x <= hi + 1e-9) out.push(x);
  }
  return out;
}

function h1DomainMax(
  marketChartDataH1: ColoredHandicapPoint[],
  homeMarketChartDataH1: ColoredHandicapPoint[],
  apiMax: number,
  clockTm: number,
  inSecondHalf: boolean,
): number {
  const fromData = Math.max(
    45,
    ...marketChartDataH1.map((p) => p.minute),
    ...homeMarketChartDataH1.map((p) => p.minute),
    apiMax,
    !inSecondHalf ? clockTm : 0,
  );
  return Math.min(58, Math.max(45, fromData + 1));
}

function h2DomainMax(
  marketChartDataH2: ColoredHandicapPoint[],
  homeMarketChartDataH2: ColoredHandicapPoint[],
  apiMax: number,
  clockTm: number,
  inSecondHalf: boolean,
): number {
  const fromData = Math.max(
    90,
    ...marketChartDataH2.map((p) => p.minute),
    ...homeMarketChartDataH2.map((p) => p.minute),
    apiMax,
    inSecondHalf ? clockTm : 45,
  );
  return Math.min(105, Math.max(90, fromData + 2));
}

/** apiChartData H1/H2 optional — khi export không có API timeline, truyền 0. */
export interface DropSeriesContext {
  match: MatchInfo;
  ou1_3: OverUnderMinuteSnapshot[];
  ah1_2: AsianHandicapMinuteSnapshot[];
  ou1_6: OverUnderMinuteSnapshot[];
  ah1_5: AsianHandicapMinuteSnapshot[];
  statsKeys: string[];
  /** Phút tối đa trên trục API H1 (nếu không có thì 0). */
  apiH1MaxMinute?: number;
  apiH2MaxMinute?: number;
}

export interface OuDropIntensityPack {
  drops1_3H1: { minute: number; count: number }[];
  drops1_3H2: { minute: number; count: number }[];
  drops1_6: { minute: number; count: number }[];
  drops1_5Home: { minute: number; count: number }[];
}

/**
 * Tính bucket cường độ giảm giá (số nét đỏ / phút) giống OddsDropChart.
 */
export function computeOuDropIntensityPack(ctx: DropSeriesContext): OuDropIntensityPack {
  const { match, ou1_3, ah1_2, ou1_6, ah1_5, statsKeys } = ctx;
  const apiH1 = ctx.apiH1MaxMinute ?? 0;
  const apiH2 = ctx.apiH2MaxMinute ?? 0;

  const clockTm = match.timer?.tm ?? (parseInt(match.time || '0', 10) || 0);
  const oddsSnaps = [...ou1_3, ...ah1_2];
  const inSecondHalf = resolveMatchHalfForUI(match.timer, clockTm, oddsSnaps, statsKeys) === 2;

  const marketChartData = applyHalfFromMinuteForFullMatchOdds(colorOddsSeriesForPressure(ou1_3), inSecondHalf);
  const homeMarketChartData = applyHalfFromMinuteForFullMatchOdds(
    colorOddsSeriesForPressure(ah1_2),
    inSecondHalf,
  );

  const marketChartDataH1 = marketChartData.filter((p) => (p.half ?? 1) === 1);
  const marketChartDataH2 = marketChartData.filter((p) => p.half === 2);
  const homeMarketChartDataH1 = homeMarketChartData.filter((p) => (p.half ?? 1) === 1);
  const homeMarketChartDataH2 = homeMarketChartData.filter((p) => p.half === 2);

  const h1Dom = h1DomainMax(marketChartDataH1, homeMarketChartDataH1, apiH1, clockTm, inSecondHalf);
  const h2Dom = h2DomainMax(marketChartDataH2, homeMarketChartDataH2, apiH2, clockTm, inSecondHalf);

  const isFt = String(match.timer?.tt) === '1';
  const capH1 = isFt || inSecondHalf ? h1Dom : clockTm;
  const capH2 = isFt || !inSecondHalf ? h2Dom : clockTm;

  const drops1_3H1 = buildDropSeries(marketChartDataH1, 0, h1Dom, capH1);
  const drops1_3H2 = buildDropSeries(marketChartDataH2, 45, h2Dom, capH2);

  const halfMarketOu = colorOddsSeriesForPressure(ou1_6);
  const halfMarketAh = colorOddsSeriesForPressure(ah1_5);
  const ouMaxH = halfMarketOu.length > 0 ? Math.max(...halfMarketOu.map((p) => p.minute)) : 0;
  const ahMaxH = halfMarketAh.length > 0 ? Math.max(...halfMarketAh.map((p) => p.minute)) : 0;
  const h1HalfDom = Math.min(
    58,
    Math.max(45, Math.max(ouMaxH, ahMaxH, apiH1, !inSecondHalf ? clockTm : 0) + 1),
  );
  const capHalf = isFt ? h1HalfDom : !inSecondHalf ? clockTm : h1HalfDom;

  const drops1_6 = buildDropSeries(halfMarketOu, 0, h1HalfDom, capHalf);
  const drops1_5Home = buildDropSeries(halfMarketAh, 0, h1HalfDom, capHalf);

  return { drops1_3H1, drops1_3H2, drops1_6, drops1_5Home };
}

export { minuteTicks };
