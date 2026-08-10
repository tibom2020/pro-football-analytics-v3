/**
 * Bản ghi odds thô — giữ nguyên kiểu string từ API.
 * Chỉ thêm field `market` (API để market làm khoá object cha).
 */
export type RawOddsRecord = {
  market: string;
  id: string;
  add_time?: string | null;
  time_str?: string | null;
  ss?: string | null;
  handicap?: string | null;
  over_od?: string | null;
  under_od?: string | null;
  home_od?: string | null;
  away_od?: string | null;
  draw_od?: string | null;
  /** Các field khác từ API — không lọc. */
  [key: string]: unknown;
};

/** Response tối thiểu từ B365 `v2/event/odds`. */
export type B365OddsApiResponse = {
  success?: number | string;
  results?: {
    odds?: Record<string, Array<Record<string, unknown>>>;
    update?: Record<string, unknown>;
  };
  error?: string;
};

/** Event trong list inplay — chỉ lấy field cần, giữ timer/stats thô. */
export type B365InplayEvent = {
  id?: string | number;
  ss?: string;
  time?: string | number;
  time_status?: string | number;
  league?: { name?: string };
  home?: { name?: string };
  away?: { name?: string };
  timer?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  [key: string]: unknown;
};

export type B365InplayApiResponse = {
  success?: number | string;
  results?: B365InplayEvent[];
  error?: string;
};

export type PollLogEntry = {
  at: number;
  ok: boolean;
  http?: number;
  ms: number;
  error?: string;
  new_records?: Record<string, number>;
  total_records?: Record<string, number>;
  oldest_add_time?: Record<string, string>;
  odds_update?: Record<string, number>;
  truncation: boolean;
  stats_written?: boolean;
};

export type IngestOddsResult = {
  appended: RawOddsRecord[];
  newRecordsByMarket: Record<string, number>;
  totalRecordsByMarket: Record<string, number>;
  oldestAddTimeByMarket: Record<string, string>;
  oddsUpdateByMarket: Record<string, number>;
  truncationDetected: boolean;
  truncatedMarkets: string[];
};

/** Một dòng stats.jsonl — timer_raw + stats giữ nguyên kiểu API. */
export type StatsRow = {
  add_time: number;
  timer_raw: Record<string, unknown> | null;
  ss: string | null;
  stats: Record<string, unknown>;
};

export type GoalFromSs = {
  add_time: number;
  time_str: string;
  from: string;
  to: string;
  side: 'home' | 'away' | 'unknown';
  type: 'goal' | 'cancelled';
};

export type SuspensionEvent = {
  add_time: number;
  time_str: string | null;
  market: string;
  ss: string | null;
};

export type MatchV2SelfCheck = {
  polls: number;
  polls_failed: number;
  truncation_detected: boolean;
  records_by_market: Record<string, number>;
  inplay_minutes_covered: number;
  ticks_per_minute_mean: number;
  max_gap_seconds: number;
  gaps_over_180s: number;
  first_inplay_minute: number | null;
  last_inplay_minute: number | null;
  split_handicap_count: number;
  suspended_record_count: number;
  stats_rows: number;
};

export type MatchV2Meta = {
  schema_version: 2;
  match_id: string;
  league: string;
  home: string;
  away: string;
  kickoff_add_time: number | null;
  collected_from: number | null;
  collected_to: number | null;
  final_score: string | null;
  status_at_end: string | null;
  goals_from_ss: GoalFromSs[];
  suspensions: SuspensionEvent[];
  truncation_detected?: boolean;
  truncation_first_seen_at?: number | null;
  self_check: MatchV2SelfCheck;
};
