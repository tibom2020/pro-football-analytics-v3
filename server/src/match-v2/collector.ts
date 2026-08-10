import { config } from '../config.js';
import { logger } from '../logger.js';
import { flattenOddsResponse, selectNewOddsRecords } from './ingest.js';
import { appendOddsRecords, loadWrittenOddsIds } from './odds-store.js';
import { buildMetaFromFiles, mapTimeStatus, readMeta, writeMetaAtomic } from './meta.js';
import { appendPollLog } from './poll-log.js';
import { resolveOrCreateMatchDir, type MatchV2Paths } from './paths.js';
import { buildReportMarkdown } from './report.js';
import { buildStatsRowFromEvent, appendStatsRow } from './stats-store.js';
import { readJsonlLines } from './jsonl.js';
import type {
  B365InplayApiResponse,
  B365InplayEvent,
  B365OddsApiResponse,
  PollLogEntry,
  RawOddsRecord,
  StatsRow,
} from './types.js';
import fs from 'node:fs/promises';

const B365_ODDS_URL = 'https://api.b365api.com/v2/event/odds';
const B365_INPLAY_URL = 'https://api.b365api.com/v3/events/inplay?sport_id=1';

export type MatchOddsCollectorStatus = {
  matchId: string;
  running: boolean;
  matchDir: string;
  writtenIds: number;
  polls: number;
  pollsFailed: number;
  statsRows: number;
  truncationDetected: boolean;
  truncationFirstSeenAt: number | null;
  lastPollAt: number | null;
  lastError: string | null;
  recordsByMarket: Record<string, number>;
};

export type MatchOddsCollectorOptions = {
  matchId: string;
  v2Root: string;
  pollIntervalMs?: number;
  b365Token?: string;
  league?: string;
  home?: string;
  away?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Poll odds (60s) + snapshot stats từ inplay; ghi odds/stats/poll_log + meta atomic.
 * Khởi động lại: đọc lại odds.jsonl → Set id.
 */
export class MatchOddsCollector {
  readonly matchId: string;
  private readonly v2Root: string;
  private readonly pollIntervalMs: number;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  private paths: MatchV2Paths | null = null;
  private writtenIds = new Set<string>();
  private countsByMarket: Record<string, number> = {};
  private prevOldestAddTime: Record<string, string> | undefined;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inflight: Promise<void> | null = null;
  private stopped = true;

  private polls = 0;
  private pollsFailed = 0;
  private statsRows = 0;
  private truncationDetected = false;
  private truncationFirstSeenAt: number | null = null;
  private lastPollAt: number | null = null;
  private lastError: string | null = null;

  private league = '';
  private home = '';
  private away = '';
  private kickoffAddTime: number | null = null;

  constructor(opts: MatchOddsCollectorOptions) {
    this.matchId = opts.matchId;
    this.v2Root = opts.v2Root;
    this.pollIntervalMs = opts.pollIntervalMs ?? config.matchV2.pollIntervalMs;
    this.token = (opts.b365Token || config.b365.apiToken || '').trim();
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.league = opts.league ?? '';
    this.home = opts.home ?? '';
    this.away = opts.away ?? '';
  }

  getStatus(): MatchOddsCollectorStatus {
    return {
      matchId: this.matchId,
      running: !this.stopped,
      matchDir: this.paths?.matchDir ?? '',
      writtenIds: this.writtenIds.size,
      polls: this.polls,
      pollsFailed: this.pollsFailed,
      statsRows: this.statsRows,
      truncationDetected: this.truncationDetected,
      truncationFirstSeenAt: this.truncationFirstSeenAt,
      lastPollAt: this.lastPollAt,
      lastError: this.lastError,
      recordsByMarket: { ...this.countsByMarket },
    };
  }

  async start(): Promise<MatchOddsCollectorStatus> {
    if (!this.stopped) return this.getStatus();
    if (!this.token) {
      throw new Error('Thiếu B365_API_TOKEN — không thể thu odds v2');
    }

    this.paths = resolveOrCreateMatchDir(this.v2Root, this.matchId);
    const loaded = await loadWrittenOddsIds(this.paths.oddsJsonl);
    this.writtenIds = loaded.ids;
    this.countsByMarket = { ...loaded.countsByMarket };
    this.statsRows = (await readJsonlLines(this.paths.statsJsonl)).length;

    const prevMeta = await readMeta(this.paths.metaJson);
    if (prevMeta) {
      if (!this.league) this.league = prevMeta.league;
      if (!this.home) this.home = prevMeta.home;
      if (!this.away) this.away = prevMeta.away;
      if (this.kickoffAddTime == null) this.kickoffAddTime = prevMeta.kickoff_add_time;
      if (prevMeta.truncation_detected) {
        this.truncationDetected = true;
        this.truncationFirstSeenAt = prevMeta.truncation_first_seen_at ?? null;
      }
    }

    this.stopped = false;
    logger.info(
      `[match-v2] start match=${this.matchId} dir=${this.paths.matchDir} recoveredIds=${this.writtenIds.size}`,
    );

    void this.safePoll();
    this.timer = setInterval(() => void this.safePoll(), this.pollIntervalMs);
    if (typeof this.timer === 'object' && this.timer && 'unref' in this.timer) {
      this.timer.unref();
    }

    return this.getStatus();
  }

  async stop(): Promise<MatchOddsCollectorStatus> {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.inflight) {
      try {
        await this.inflight;
      } catch {
        // ignore
      }
    }
    if (this.paths) {
      try {
        await this.refreshMetaAndReport();
      } catch (err) {
        logger.warn(`[match-v2] refresh on stop failed: ${(err as Error).message}`);
      }
    }
    logger.info(`[match-v2] stop match=${this.matchId}`);
    return this.getStatus();
  }

  async pollOnce(): Promise<PollLogEntry> {
    if (!this.paths) {
      this.paths = resolveOrCreateMatchDir(this.v2Root, this.matchId);
      const loaded = await loadWrittenOddsIds(this.paths.oddsJsonl);
      this.writtenIds = loaded.ids;
      this.countsByMarket = { ...loaded.countsByMarket };
      this.statsRows = (await readJsonlLines(this.paths.statsJsonl)).length;
    }
    return this.runPoll();
  }

  private async safePoll(): Promise<void> {
    if (this.stopped) return;
    if (this.inflight) return;
    this.inflight = this.runPoll()
      .then(() => undefined)
      .catch((err) => {
        logger.warn(`[match-v2] poll error match=${this.matchId}: ${(err as Error).message}`);
      })
      .finally(() => {
        this.inflight = null;
      });
    await this.inflight;
  }

  private async fetchJson<T>(url: string): Promise<{ ok: boolean; http: number; ms: number; data?: T; error?: string }> {
    const started = Date.now();
    try {
      const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(20_000) });
      const ms = Date.now() - started;
      if (!res.ok) return { ok: false, http: res.status, ms, error: `http ${res.status}` };
      const data = (await res.json()) as T;
      return { ok: true, http: res.status, ms, data };
    } catch (err) {
      return { ok: false, http: 0, ms: Date.now() - started, error: (err as Error).message };
    }
  }

  private findInplayEvent(api: B365InplayApiResponse | undefined): B365InplayEvent | null {
    if (!api?.results?.length) return null;
    return api.results.find((m) => String(m.id) === this.matchId) ?? null;
  }

  private async refreshMetaAndReport(event?: B365InplayEvent | null): Promise<void> {
    if (!this.paths) return;
    if (event) {
      if (event.league?.name) this.league = String(event.league.name);
      if (event.home?.name) this.home = String(event.home.name);
      if (event.away?.name) this.away = String(event.away.name);
      if (this.kickoffAddTime == null && event.time != null) {
        const k = Number(event.time);
        if (Number.isFinite(k)) this.kickoffAddTime = k;
      }
    }

    const previous = await readMeta(this.paths.metaJson);
    const meta = await buildMetaFromFiles(this.paths, {
      matchId: this.matchId,
      league: this.league,
      home: this.home,
      away: this.away,
      kickoffAddTime: this.kickoffAddTime,
      finalScore: event?.ss != null ? String(event.ss) : undefined,
      statusAtEnd: event ? mapTimeStatus(event.time_status) : undefined,
      truncationDetected: this.truncationDetected,
      truncationFirstSeenAt: this.truncationFirstSeenAt,
      previous,
    });
    await writeMetaAtomic(this.paths.metaJson, meta);

    const [odds, stats] = await Promise.all([
      readJsonlLines<RawOddsRecord>(this.paths.oddsJsonl),
      readJsonlLines<StatsRow>(this.paths.statsJsonl),
    ]);
    const md = buildReportMarkdown({ meta, odds, stats });
    await fs.writeFile(this.paths.reportMd, md, 'utf8');
  }

  private async runPoll(): Promise<PollLogEntry> {
    if (!this.paths) throw new Error('collector chưa init paths');

    const at = Math.floor(Date.now() / 1000);
    const oddsUrl = `${B365_ODDS_URL}?event_id=${encodeURIComponent(this.matchId)}&token=${encodeURIComponent(this.token)}`;
    const inplayUrl = `${B365_INPLAY_URL}&token=${encodeURIComponent(this.token)}`;

    const [oddsFetch, inplayFetch] = await Promise.all([
      this.fetchJson<B365OddsApiResponse>(oddsUrl),
      this.fetchJson<B365InplayApiResponse>(inplayUrl),
    ]);

    const ms = Math.max(oddsFetch.ms, inplayFetch.ms);
    let entry: PollLogEntry;
    let event: B365InplayEvent | null = null;

    if (inplayFetch.ok && inplayFetch.data) {
      event = this.findInplayEvent(inplayFetch.data);
      if (event) {
        const row = buildStatsRowFromEvent(at, {
          timer: event.timer ?? null,
          ss: event.ss ?? null,
          stats: (event.stats as Record<string, unknown>) ?? null,
        });
        await appendStatsRow(this.paths.statsJsonl, row);
        this.statsRows += 1;
      }
    }

    if (!oddsFetch.ok || !oddsFetch.data) {
      this.polls += 1;
      this.pollsFailed += 1;
      this.lastPollAt = at;
      this.lastError = oddsFetch.error || 'odds fetch failed';
      entry = {
        at,
        ok: false,
        http: oddsFetch.http || undefined,
        ms,
        error: this.lastError,
        truncation: this.truncationDetected,
        stats_written: Boolean(event),
      };
      await appendPollLog(this.paths.pollLogJsonl, entry);
      try {
        await this.refreshMetaAndReport(event);
      } catch {
        // ignore meta errors on failed poll
      }
      return entry;
    }

    const api = oddsFetch.data;
    if (api.success === 0 || api.success === '0') {
      this.polls += 1;
      this.pollsFailed += 1;
      this.lastPollAt = at;
      this.lastError = api.error || 'success=0';
      entry = {
        at,
        ok: false,
        http: oddsFetch.http,
        ms,
        error: this.lastError,
        truncation: this.truncationDetected,
        stats_written: Boolean(event),
      };
      await appendPollLog(this.paths.pollLogJsonl, entry);
      try {
        await this.refreshMetaAndReport(event);
      } catch {
        // ignore
      }
      return entry;
    }

    const flattened = flattenOddsResponse(api);
    const ingest = selectNewOddsRecords(flattened, this.writtenIds, this.prevOldestAddTime);
    await appendOddsRecords(this.paths.oddsJsonl, ingest.appended);

    for (const [market, n] of Object.entries(ingest.newRecordsByMarket)) {
      this.countsByMarket[market] = (this.countsByMarket[market] ?? 0) + n;
    }

    if (Object.keys(ingest.oldestAddTimeByMarket).length > 0) {
      this.prevOldestAddTime = { ...ingest.oldestAddTimeByMarket };
    }

    if (ingest.truncationDetected) {
      if (!this.truncationDetected) {
        this.truncationDetected = true;
        this.truncationFirstSeenAt = at;
        console.warn(
          `[match-v2] truncation_detected match=${this.matchId} markets=${ingest.truncatedMarkets.join(',')}`,
        );
        logger.warn(
          `[match-v2] truncation_detected match=${this.matchId} markets=${ingest.truncatedMarkets.join(',')}`,
        );
      }
    }

    this.polls += 1;
    this.lastPollAt = at;
    this.lastError = null;

    entry = {
      at,
      ok: true,
      http: oddsFetch.http,
      ms,
      new_records: ingest.newRecordsByMarket,
      total_records: ingest.totalRecordsByMarket,
      oldest_add_time: ingest.oldestAddTimeByMarket,
      odds_update: ingest.oddsUpdateByMarket,
      truncation: this.truncationDetected,
      stats_written: Boolean(event),
    };
    await appendPollLog(this.paths.pollLogJsonl, entry);

    try {
      await this.refreshMetaAndReport(event);
    } catch (err) {
      logger.warn(`[match-v2] meta/report refresh failed: ${(err as Error).message}`);
    }

    return entry;
  }
}
