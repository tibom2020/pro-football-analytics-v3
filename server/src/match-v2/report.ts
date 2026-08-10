import type { MatchV2Meta, RawOddsRecord, StatsRow } from './types.js';
import { parseHandicap } from './parse-handicap.js';

function fmtUnix(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—';
  return `${sec} (UTC ${new Date(sec * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')})`;
}

/** Gom odds theo time_str để đọc — chỉ ở tầng báo cáo, file thô vẫn đầy đủ. */
function groupOddsByMinute(records: RawOddsRecord[]): Map<string, RawOddsRecord[]> {
  const map = new Map<string, RawOddsRecord[]>();
  for (const r of records) {
    const key = r.time_str == null || String(r.time_str).trim() === '' ? 'pre' : String(r.time_str);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return map;
}

function latestByMarket(rows: RawOddsRecord[]): Map<string, RawOddsRecord> {
  const m = new Map<string, RawOddsRecord>();
  for (const r of rows) {
    const prev = m.get(r.market);
    if (!prev) {
      m.set(r.market, r);
      continue;
    }
    const pa = Number(prev.add_time);
    const na = Number(r.add_time);
    if (Number.isFinite(na) && (!Number.isFinite(pa) || na >= pa)) m.set(r.market, r);
  }
  return m;
}

/**
 * Báo cáo người đọc — chỉ từ odds + stats + meta. Không gọi API.
 */
export function buildReportMarkdown(input: {
  meta: MatchV2Meta;
  odds: RawOddsRecord[];
  stats: StatsRow[];
}): string {
  const { meta, odds, stats } = input;
  const sc = meta.self_check;
  const lines: string[] = [];

  lines.push(`# ${meta.home || '?'} vs ${meta.away || '?'}`);
  lines.push('');
  lines.push(`- **match_id:** ${meta.match_id}`);
  lines.push(`- **league:** ${meta.league || '—'}`);
  lines.push(`- **kickoff_add_time:** ${fmtUnix(meta.kickoff_add_time)}`);
  lines.push(`- **collected:** ${fmtUnix(meta.collected_from)} → ${fmtUnix(meta.collected_to)}`);
  lines.push(`- **final_score:** ${meta.final_score ?? '—'}`);
  lines.push(`- **status_at_end:** ${meta.status_at_end ?? '—'}`);
  lines.push(`- **schema_version:** ${meta.schema_version}`);
  lines.push('');

  lines.push('## Bàn thắng (`goals_from_ss`)');
  lines.push('');
  if (meta.goals_from_ss.length === 0) {
    lines.push('_Không có thay đổi `ss` in-play._');
  } else {
    lines.push('| add_time | time_str | from → to | side | type |');
    lines.push('|---:|---:|---|---|---|');
    for (const g of meta.goals_from_ss) {
      lines.push(
        `| ${g.add_time} | ${g.time_str} | ${g.from} → ${g.to} | ${g.side} | ${g.type} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Khoá cược');
  lines.push('');
  if (meta.suspensions.length === 0) {
    lines.push('_Không có bản ghi khoá._');
  } else {
    lines.push('| add_time | time_str | market | ss |');
    lines.push('|---:|---:|---|---|');
    for (const s of meta.suspensions) {
      lines.push(
        `| ${s.add_time} | ${s.time_str ?? '—'} | ${s.market} | ${s.ss ?? '—'} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Tự kiểm (`self_check`)');
  lines.push('');
  lines.push('| Chỉ số | Giá trị |');
  lines.push('|---|---|');
  lines.push(`| polls | ${sc.polls} |`);
  lines.push(`| polls_failed | ${sc.polls_failed} |`);
  lines.push(`| truncation_detected | ${sc.truncation_detected} |`);
  lines.push(`| inplay_minutes_covered | ${sc.inplay_minutes_covered} |`);
  lines.push(`| ticks_per_minute_mean | ${sc.ticks_per_minute_mean} |`);
  lines.push(`| max_gap_seconds | ${sc.max_gap_seconds} |`);
  lines.push(`| gaps_over_180s | ${sc.gaps_over_180s} |`);
  lines.push(`| first_inplay_minute | ${sc.first_inplay_minute ?? '—'} |`);
  lines.push(`| last_inplay_minute | ${sc.last_inplay_minute ?? '—'} |`);
  lines.push(`| split_handicap_count | ${sc.split_handicap_count} |`);
  lines.push(`| suspended_record_count | ${sc.suspended_record_count} |`);
  lines.push(`| stats_rows | ${sc.stats_rows} |`);
  lines.push(
    `| records_by_market | ${Object.entries(sc.records_by_market)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ') || '—'} |`,
  );
  lines.push('');

  lines.push('## Odds theo phút (gom để đọc)');
  lines.push('');
  lines.push('_Gom từ `odds.jsonl` — bản thô không bị mất._');
  lines.push('');
  lines.push('| time_str | market | handicap | over/home | under/away | ss | ticks |');
  lines.push('|---:|---|---|---|---|---|---:|');

  const byMinute = groupOddsByMinute(odds);
  const minuteKeys = [...byMinute.keys()].sort((a, b) => {
    if (a === 'pre') return -1;
    if (b === 'pre') return 1;
    return Number(a) - Number(b);
  });

  for (const key of minuteKeys) {
    const rows = byMinute.get(key) ?? [];
    const latest = latestByMarket(rows);
    for (const [market, r] of [...latest.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const ticks = rows.filter((x) => x.market === market).length;
      const overOrHome = r.over_od ?? r.home_od ?? '—';
      const underOrAway = r.under_od ?? r.away_od ?? '—';
      const hc = r.handicap ?? '—';
      const hcNote = typeof hc === 'string' && hc.includes(',') ? ` (${parseHandicap(hc)})` : '';
      lines.push(
        `| ${key} | ${market} | ${hc}${hcNote} | ${overOrHome} | ${underOrAway} | ${r.ss ?? '—'} | ${ticks} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Thống kê cuối');
  lines.push('');
  if (stats.length === 0) {
    lines.push('_Chưa có `stats.jsonl`._');
  } else {
    const last = stats[stats.length - 1];
    lines.push(`- **add_time:** ${last.add_time}`);
    lines.push(`- **ss:** ${last.ss ?? '—'}`);
    lines.push(`- **timer_raw:** \`${JSON.stringify(last.timer_raw)}\``);
    lines.push('');
    lines.push('| Stat | Home | Away |');
    lines.push('|---|---:|---:|');
    for (const [key, val] of Object.entries(last.stats ?? {})) {
      if (Array.isArray(val) && val.length >= 2) {
        lines.push(`| ${key} | ${val[0]} | ${val[1]} |`);
      }
    }
  }
  lines.push('');

  return lines.join('\n');
}
