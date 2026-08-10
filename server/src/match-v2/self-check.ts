import type {
  MatchV2SelfCheck,
  PollLogEntry,
  RawOddsRecord,
  StatsRow,
} from './types.js';
import { isSuspendedRecord } from './suspensions.js';

function inplayMinute(timeStr: string | null | undefined): number | null {
  if (timeStr == null || String(timeStr).trim() === '') return null;
  const n = Number(String(timeStr).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * self_check — lọc trận dùng được mà không mở từng file.
 * ticks_per_minute_mean: số bản ghi in-play / số phút distinct (time_str).
 */
export function computeSelfCheck(input: {
  odds: RawOddsRecord[];
  stats: StatsRow[];
  polls: PollLogEntry[];
  truncationDetected: boolean;
}): MatchV2SelfCheck {
  const { odds, stats, polls, truncationDetected } = input;

  const recordsByMarket: Record<string, number> = {};
  const inplayMinutes = new Set<number>();
  let inplayTicks = 0;
  let splitHandicapCount = 0;
  let suspendedRecordCount = 0;
  const inplayAddTimes: number[] = [];

  for (const r of odds) {
    const market = String(r.market);
    recordsByMarket[market] = (recordsByMarket[market] ?? 0) + 1;

    if (typeof r.handicap === 'string' && r.handicap.includes(',')) {
      splitHandicapCount += 1;
    }
    if (isSuspendedRecord(r)) suspendedRecordCount += 1;

    const minute = inplayMinute(r.time_str == null ? null : String(r.time_str));
    if (minute != null) {
      inplayMinutes.add(minute);
      inplayTicks += 1;
      const at = Number(r.add_time);
      if (Number.isFinite(at)) inplayAddTimes.push(at);
    }
  }

  inplayAddTimes.sort((a, b) => a - b);
  let maxGapSeconds = 0;
  let gapsOver180 = 0;

  // Ưu tiên gap theo poll_log (chu kỳ vận hành); fallback gap theo add_time odds in-play.
  const pollTimes = polls
    .map((p) => p.at)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const gapSource = pollTimes.length >= 2 ? pollTimes : inplayAddTimes;
  for (let i = 1; i < gapSource.length; i++) {
    const gap = gapSource[i] - gapSource[i - 1];
    if (gap > maxGapSeconds) maxGapSeconds = gap;
    if (gap > 180) gapsOver180 += 1;
  }

  const minutesCovered = inplayMinutes.size;
  const ticksPerMinuteMean =
    minutesCovered > 0 ? Math.round((inplayTicks / minutesCovered) * 100) / 100 : 0;

  const sortedMinutes = [...inplayMinutes].sort((a, b) => a - b);

  return {
    polls: polls.length,
    polls_failed: polls.filter((p) => !p.ok).length,
    truncation_detected: truncationDetected,
    records_by_market: recordsByMarket,
    inplay_minutes_covered: minutesCovered,
    ticks_per_minute_mean: ticksPerMinuteMean,
    max_gap_seconds: maxGapSeconds,
    gaps_over_180s: gapsOver180,
    first_inplay_minute: sortedMinutes.length ? sortedMinutes[0] : null,
    last_inplay_minute: sortedMinutes.length ? sortedMinutes[sortedMinutes.length - 1] : null,
    split_handicap_count: splitHandicapCount,
    suspended_record_count: suspendedRecordCount,
    stats_rows: stats.length,
  };
}
