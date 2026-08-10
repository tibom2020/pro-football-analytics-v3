import { config } from '../config.js';
import { MatchOddsCollector, type MatchOddsCollectorStatus } from './collector.js';
import { resolveV2Root } from './paths.js';

/**
 * Registry collector theo matchId — một trận một collector.
 * Restart process: gọi lại start(matchId) sẽ khôi phục Set id từ odds.jsonl.
 */
export class MatchV2Registry {
  private readonly collectors = new Map<string, MatchOddsCollector>();
  private readonly v2Root: string;

  constructor(v2Root?: string) {
    this.v2Root = resolveV2Root(v2Root ?? config.matchV2.dataDir);
  }

  get root(): string {
    return this.v2Root;
  }

  list(): MatchOddsCollectorStatus[] {
    return [...this.collectors.values()].map((c) => c.getStatus());
  }

  get(matchId: string): MatchOddsCollector | undefined {
    return this.collectors.get(String(matchId));
  }

  async start(
    matchId: string,
    opts?: { b365Token?: string; league?: string; home?: string; away?: string },
  ): Promise<MatchOddsCollectorStatus> {
    const id = String(matchId);
    let collector = this.collectors.get(id);
    if (!collector) {
      collector = new MatchOddsCollector({
        matchId: id,
        v2Root: this.v2Root,
        pollIntervalMs: config.matchV2.pollIntervalMs,
        b365Token: opts?.b365Token,
        league: opts?.league,
        home: opts?.home,
        away: opts?.away,
      });
      this.collectors.set(id, collector);
    }
    return collector.start();
  }

  async stop(matchId: string): Promise<MatchOddsCollectorStatus | null> {
    const id = String(matchId);
    const collector = this.collectors.get(id);
    if (!collector) return null;
    const status = await collector.stop();
    this.collectors.delete(id);
    return status;
  }

  async stopAll(): Promise<void> {
    const ids = [...this.collectors.keys()];
    await Promise.all(ids.map((id) => this.stop(id)));
  }
}

/** Singleton dùng trong process server. */
export const matchV2Registry = new MatchV2Registry();
