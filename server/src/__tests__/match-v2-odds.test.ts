import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MatchOddsCollector } from '../match-v2/collector.js';
import { buildGoalsFromSs } from '../match-v2/goals.js';
import {
  detectTruncation,
  flattenOddsResponse,
  selectNewOddsRecords,
} from '../match-v2/ingest.js';
import { buildMetaFromFiles, readMeta, writeMetaAtomic } from '../match-v2/meta.js';
import { appendOddsRecords, loadWrittenOddsIds } from '../match-v2/odds-store.js';
import { parseHandicap } from '../match-v2/parse-handicap.js';
import { resolveOrCreateMatchDir } from '../match-v2/paths.js';
import { buildReportMarkdown } from '../match-v2/report.js';
import { appendStatsRow } from '../match-v2/stats-store.js';
import { buildSuspensions } from '../match-v2/suspensions.js';
import type { B365OddsApiResponse, MatchV2Meta, RawOddsRecord, StatsRow } from '../match-v2/types.js';

const tempDirs: string[] = [];

async function makeTempRoot(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'match-v2-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (!dir) break;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

function sampleApi(): B365OddsApiResponse {
  return {
    success: 1,
    results: {
      odds: {
        '1_3': [
          {
            id: '433388581',
            add_time: '1786356029',
            time_str: '67',
            ss: '1-2',
            handicap: '3.75',
            over_od: '-',
            under_od: '-',
          },
          {
            id: '433388558',
            add_time: '1786356001',
            time_str: '66',
            ss: '1-2',
            handicap: '3.75',
            over_od: '1.950',
            under_od: '1.850',
          },
        ],
        '1_2': [
          {
            id: '284755885',
            add_time: '1786356001',
            time_str: '66',
            ss: '1-2',
            handicap: '-0.75',
            home_od: '1.925',
            away_od: '1.875',
          },
        ],
        '1_8': [],
      },
    },
  };
}

function mockFetchBoth(oddsPayload: B365OddsApiResponse, inplayEvent?: Record<string, unknown>) {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('event/odds')) {
      return new Response(JSON.stringify(oddsPayload), { status: 200 });
    }
    if (url.includes('events/inplay')) {
      return new Response(
        JSON.stringify({
          success: 1,
          results: inplayEvent
            ? [inplayEvent]
            : [
                {
                  id: '10577229',
                  ss: '1-2',
                  time: '1786349944',
                  time_status: '2',
                  league: { name: 'Germany Bundesliga I' },
                  home: { name: 'St Pauli' },
                  away: { name: 'Mainz' },
                  timer: { tm: 67, ts: 12, tt: '1', ta: 0, md: 1 },
                  stats: {
                    attacks: ['115', '96'],
                    on_target: ['3', '6'],
                  },
                },
              ],
        }),
        { status: 200 },
      );
    }
    return new Response('not found', { status: 404 });
  };
  return fetchImpl;
}

describe('parseHandicap', () => {
  it('parse các dạng handicap', () => {
    expect(parseHandicap('2.5')).toBe(2.5);
    expect(parseHandicap('2.0,2.5')).toBe(2.25);
    expect(parseHandicap('-0.75')).toBe(-0.75);
    expect(parseHandicap('abc')).toBeNaN();
    expect(parseHandicap('')).toBeNaN();
  });
});

describe('match-v2 ingest', () => {
  it('flatten giữ string thô + thêm market, bỏ market rỗng', () => {
    const rows = flattenOddsResponse(sampleApi());
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      market: '1_3',
      id: '433388581',
      handicap: '3.75',
      over_od: '-',
    });
    expect(typeof rows[0].handicap).toBe('string');
  });

  it('dedupe theo id: gọi hai lần cùng dữ liệu → không tăng bản ghi mới', () => {
    const ids = new Set<string>();
    const flat = flattenOddsResponse(sampleApi());
    expect(selectNewOddsRecords(flat, ids).appended).toHaveLength(3);
    expect(selectNewOddsRecords(flat, ids).appended).toHaveLength(0);
    expect(ids.size).toBe(3);
  });

  it('phát hiện cắt lịch sử khi oldest_add_time tăng', () => {
    const prev = { '1_3': '1786316578' };
    const next = { '1_3': '1786350000' };
    expect(detectTruncation(prev, next).truncationDetected).toBe(true);
    expect(detectTruncation(prev, prev).truncationDetected).toBe(false);
  });
});

describe('goals_from_ss', () => {
  it('0-0, 0-1, 0-1, 0-2 → 2 bàn', () => {
    const rows: RawOddsRecord[] = [
      { market: '1_3', id: '1', add_time: '10', time_str: '1', ss: '0-0' },
      { market: '1_3', id: '2', add_time: '20', time_str: '18', ss: '0-1' },
      { market: '1_3', id: '3', add_time: '21', time_str: '19', ss: '0-1' },
      { market: '1_3', id: '4', add_time: '50', time_str: '51', ss: '0-2' },
    ];
    const goals = buildGoalsFromSs(rows);
    expect(goals).toHaveLength(2);
    expect(goals[0]).toMatchObject({ from: '0-0', to: '0-1', side: 'away', type: 'goal' });
    expect(goals[1]).toMatchObject({ from: '0-1', to: '0-2', side: 'away', type: 'goal' });
  });

  it('0-0, 0-1, 0-0 → 1 bàn + 1 huỷ', () => {
    const rows: RawOddsRecord[] = [
      { market: '1_3', id: '1', add_time: '10', time_str: '1', ss: '0-0' },
      { market: '1_3', id: '2', add_time: '20', time_str: '18', ss: '0-1' },
      { market: '1_3', id: '3', add_time: '25', time_str: '20', ss: '0-0' },
    ];
    const goals = buildGoalsFromSs(rows);
    expect(goals).toHaveLength(2);
    expect(goals[0].type).toBe('goal');
    expect(goals[1]).toMatchObject({ from: '0-1', to: '0-0', type: 'cancelled', side: 'away' });
  });
});

describe('match-v2 odds-store recovery', () => {
  it('đọc odds.jsonl → Set id đúng, ghi tiếp không trùng', async () => {
    const root = await makeTempRoot();
    const oddsPath = path.join(root, 'odds.jsonl');
    await appendOddsRecords(oddsPath, [
      { market: '1_3', id: 'a1', add_time: '100', time_str: '1', ss: '0-0', handicap: '2.5' },
      { market: '1_3', id: 'a2', add_time: '101', time_str: '1', ss: '0-0', handicap: '2.5' },
    ]);
    const loaded = await loadWrittenOddsIds(oddsPath);
    expect(loaded.ids.size).toBe(2);
    const selected = selectNewOddsRecords(
      [
        { market: '1_3', id: 'a1', add_time: '100', time_str: '1', ss: '0-0' },
        { market: '1_2', id: 'b1', add_time: '102', time_str: '2', ss: '0-0' },
      ],
      loaded.ids,
    );
    expect(selected.appended.map((r) => r.id)).toEqual(['b1']);
  });
});

describe('meta.json atomic write', () => {
  it('crash giữa lúc ghi tmp → file meta cũ vẫn đọc được', async () => {
    const root = await makeTempRoot();
    const metaPath = path.join(root, 'meta.json');
    const good: MatchV2Meta = {
      schema_version: 2,
      match_id: '1',
      league: 'L',
      home: 'H',
      away: 'A',
      kickoff_add_time: 1,
      collected_from: 1,
      collected_to: 2,
      final_score: '0-0',
      status_at_end: 'LIVE',
      goals_from_ss: [],
      suspensions: [],
      self_check: {
        polls: 1,
        polls_failed: 0,
        truncation_detected: false,
        records_by_market: {},
        inplay_minutes_covered: 0,
        ticks_per_minute_mean: 0,
        max_gap_seconds: 0,
        gaps_over_180s: 0,
        first_inplay_minute: null,
        last_inplay_minute: null,
        split_handicap_count: 0,
        suspended_record_count: 0,
        stats_rows: 0,
      },
    };
    await writeMetaAtomic(metaPath, good);

    // Giả lập crash: ghi file .tmp dở dang, không rename
    await fs.writeFile(`${metaPath}.crash.tmp`, '{"schema_version":2,"broken":', 'utf8');

    const loaded = await readMeta(metaPath);
    expect(loaded?.home).toBe('H');
    expect(loaded?.final_score).toBe('0-0');
  });
});

describe('match-v2 collector pollOnce', () => {
  it('hai lần poll cùng payload → odds không tăng; có stats + meta', async () => {
    const root = await makeTempRoot();
    const collector = new MatchOddsCollector({
      matchId: '10577229',
      v2Root: root,
      b365Token: 'test-token',
      fetchImpl: mockFetchBoth(sampleApi()),
    });

    const first = await collector.pollOnce();
    expect(first.ok).toBe(true);
    expect(first.stats_written).toBe(true);

    const second = await collector.pollOnce();
    expect(second.new_records).toEqual({});

    const status = collector.getStatus();
    const oddsLines = (await fs.readFile(path.join(status.matchDir, 'odds.jsonl'), 'utf8'))
      .trim()
      .split('\n');
    expect(oddsLines).toHaveLength(3);

    const statsLines = (await fs.readFile(path.join(status.matchDir, 'stats.jsonl'), 'utf8'))
      .trim()
      .split('\n');
    expect(statsLines).toHaveLength(2);
    const statsRow = JSON.parse(statsLines[0]) as StatsRow;
    expect(statsRow.timer_raw).toMatchObject({ tm: 67 });
    expect(statsRow.stats.attacks).toEqual(['115', '96']);

    const meta = await readMeta(path.join(status.matchDir, 'meta.json'));
    expect(meta?.home).toBe('St Pauli');
    expect(meta?.self_check.stats_rows).toBe(2);
    expect(meta?.self_check.suspended_record_count).toBeGreaterThanOrEqual(1);

    const report = await fs.readFile(path.join(status.matchDir, 'report.md'), 'utf8');
    expect(report).toContain('St Pauli');
    expect(report).toContain('self_check');
  });

  it('oldest_add_time tăng → truncation=true', async () => {
    const root = await makeTempRoot();
    let call = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('events/inplay')) {
        return new Response(JSON.stringify({ success: 1, results: [] }), { status: 200 });
      }
      call += 1;
      const oldest = call === 1 ? '1000' : '2000';
      return new Response(
        JSON.stringify({
          success: 1,
          results: {
            odds: {
              '1_3': [
                {
                  id: `id-${call}`,
                  add_time: oldest,
                  time_str: '10',
                  ss: '0-0',
                  handicap: '2.5',
                  over_od: '1.9',
                  under_od: '1.9',
                },
              ],
            },
          },
        }),
        { status: 200 },
      );
    };

    const collector = new MatchOddsCollector({
      matchId: 'trunc-1',
      v2Root: root,
      b365Token: 'test-token',
      fetchImpl,
    });

    expect((await collector.pollOnce()).truncation).toBe(false);
    expect((await collector.pollOnce()).truncation).toBe(true);
  });
});

describe('report rebuild from raw', () => {
  it('buildReportMarkdown chỉ dùng odds+stats+meta', async () => {
    const root = await makeTempRoot();
    const paths = resolveOrCreateMatchDir(root, '99');
    const odds: RawOddsRecord[] = [
      {
        market: '1_3',
        id: '1',
        add_time: '100',
        time_str: '18',
        ss: '0-0',
        handicap: '2.0,2.5',
        over_od: '1.9',
        under_od: '1.9',
      },
      {
        market: '1_3',
        id: '2',
        add_time: '110',
        time_str: '18',
        ss: '0-1',
        handicap: '2.5',
        over_od: '-',
        under_od: '-',
      },
    ];
    await appendOddsRecords(paths.oddsJsonl, odds);
    await appendStatsRow(paths.statsJsonl, {
      add_time: 120,
      timer_raw: { tm: 18, ts: 0, tt: '1', ta: 0, md: 1 },
      ss: '0-1',
      stats: { corners: ['1', '2'] },
    });
    await fs.writeFile(
      paths.pollLogJsonl,
      `${JSON.stringify({ at: 100, ok: true, ms: 10, truncation: false })}\n`,
      'utf8',
    );

    const meta = await buildMetaFromFiles(paths, {
      matchId: '99',
      league: 'Test',
      home: 'Home',
      away: 'Away',
    });
    await writeMetaAtomic(paths.metaJson, meta);

    expect(meta.goals_from_ss).toHaveLength(1);
    expect(buildSuspensions(odds)).toHaveLength(1);
    expect(meta.self_check.split_handicap_count).toBe(1);

    const md = buildReportMarkdown({ meta, odds, stats: [JSON.parse((await fs.readFile(paths.statsJsonl, 'utf8')).trim())] });
    expect(md).toContain('Home vs Away');
    expect(md).toContain('0-0 → 0-1');
    expect(md).toContain('corners');
  });
});
