import type { ProcessedStats } from '../types';
import {
  chartMinuteForHalf,
  decodeStatTimelineKey,
  detectH2ClockMode,
  type H2ClockMode,
  type MatchHalf,
} from './matchTimeline';

export interface DerivedShotEvent {
  minute: number;
  type: 'on' | 'off';
  half: MatchHalf;
}

type TimelineRow = { half: MatchHalf; minute: number; stats: ProcessedStats };

function sumShots(s: ProcessedStats): { on: number; off: number } {
  return {
    on: (s.on_target[0] ?? 0) + (s.on_target[1] ?? 0),
    off: (s.off_target[0] ?? 0) + (s.off_target[1] ?? 0),
  };
}

function buildTimeline(statsHistory: Record<number, ProcessedStats>): TimelineRow[] {
  return Object.keys(statsHistory)
    .map(Number)
    .map((k) => ({ ...decodeStatTimelineKey(k), stats: statsHistory[k]! }))
    .filter((row): row is TimelineRow => !!row.stats)
    .sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
}

/** H2 dùng đồng hồ reset hay liên tục — từ lịch sử stats đã lưu. */
export function resolveH2ClockModeFromStatsHistory(
  statsHistory: Record<number, ProcessedStats>,
): H2ClockMode {
  const mins = buildTimeline(statsHistory)
    .filter((r) => r.half === 2)
    .map((r) => r.minute);
  return detectH2ClockMode(mins);
}

/**
 * Baseline counter trước mốc H2 đầu tiên được vẽ lên chart.
 * - Bỏ qua mốc reset 0–44 khi feed đã chuyển đồng hồ liên tục.
 * - Nếu có mốc reset ngay trước mốc liên tục → lấy counter đó (tránh dồn bóng phút 45).
 */
function h2ShotBaseline(
  h1Rows: TimelineRow[],
  h2Rows: TimelineRow[],
  h2Mode: H2ClockMode,
): { on: number; off: number; startIdx: number } {
  const startIdx = h2Rows.findIndex((r) => !(h2Mode === 'continuous' && r.minute < 45));
  if (startIdx < 0) return { on: 0, off: 0, startIdx: 0 };

  const first = h2Rows[startIdx]!;
  const firstT = sumShots(first.stats);

  if (startIdx > 0 && h2Mode === 'continuous') {
    return { ...sumShots(h2Rows[startIdx - 1]!.stats), startIdx };
  }

  const lastH1 = h1Rows[h1Rows.length - 1];
  if (!lastH1?.stats) return { on: 0, off: 0, startIdx };
  const h1 = sumShots(lastH1.stats);
  if (firstT.on < h1.on || firstT.off < h1.off) return { on: 0, off: 0, startIdx };
  return { ...h1, startIdx };
}

/** Suy bóng sút từ lịch sử stats — delta theo từng hiệp. */
export function deriveShotEventsFromStatsHistory(
  statsHistory: Record<number, ProcessedStats>,
): DerivedShotEvent[] {
  const timeline = buildTimeline(statsHistory);
  const h2Mode = detectH2ClockMode(timeline.filter((r) => r.half === 2).map((r) => r.minute));
  const h1Rows = timeline.filter((r) => r.half === 1);
  const h2Rows = timeline.filter((r) => r.half === 2);

  const out: DerivedShotEvent[] = [];
  for (const half of [1, 2] as const) {
    const rows = half === 1 ? h1Rows : h2Rows;
    let startIdx = 0;
    let prevOn = 0;
    let prevOff = 0;
    if (half === 2) {
      const baseline = h2ShotBaseline(h1Rows, h2Rows, h2Mode);
      prevOn = baseline.on;
      prevOff = baseline.off;
      startIdx = baseline.startIdx;
    }
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i]!;
      if (half === 2 && h2Mode === 'continuous' && row.minute < 45) continue;
      const { on, off } = sumShots(row.stats);
      const dOn = Math.max(0, on - prevOn);
      const dOff = Math.max(0, off - prevOff);
      const chartMin = chartMinuteForHalf(half, row.minute, half === 2 ? h2Mode : 'reset');
      for (let j = 0; j < dOn; j++) out.push({ minute: chartMin, type: 'on', half });
      for (let j = 0; j < dOff; j++) out.push({ minute: chartMin, type: 'off', half });
      prevOn = on;
      prevOff = off;
    }
  }
  return out;
}

/** Map phút sự kiện live (goal/corner) lên trục chart — dùng chung logic H2. */
export function chartMinuteForLiveEvent(
  half: MatchHalf,
  minute: number,
  statsHistory: Record<number, ProcessedStats>,
): number {
  const h2Mode =
    half === 2 ? resolveH2ClockModeFromStatsHistory(statsHistory) : 'reset';
  return chartMinuteForHalf(half, minute, h2Mode);
}
