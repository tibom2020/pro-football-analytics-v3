import { AI_SERVER_URL } from './ai-service';
import type { RawTick } from './odds-tick-series';

/** Đọc ticks đã lưu từ match-v2 odds.jsonl (404 nếu chưa có). */
export async function fetchMatchV2OddsTicks(
  matchId: string,
  market?: string,
): Promise<RawTick[]> {
  const qs = market ? `?market=${encodeURIComponent(market)}` : '';
  const url = `${AI_SERVER_URL}/api/match-v2/odds/${encodeURIComponent(matchId)}${qs}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      records?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(data.records)) return [];
    return data.records.map((row) => ({
      market: String(row.market ?? market ?? ''),
      id: String(row.id ?? ''),
      add_time: String(row.add_time ?? ''),
      time_str:
        row.time_str == null || row.time_str === ''
          ? null
          : String(row.time_str),
      ss: row.ss == null ? null : String(row.ss),
      handicap: String(row.handicap ?? ''),
      over_od: row.over_od != null ? String(row.over_od) : undefined,
      under_od: row.under_od != null ? String(row.under_od) : undefined,
      home_od: row.home_od != null ? String(row.home_od) : undefined,
      away_od: row.away_od != null ? String(row.away_od) : undefined,
    }));
  } catch {
    return [];
  }
}
