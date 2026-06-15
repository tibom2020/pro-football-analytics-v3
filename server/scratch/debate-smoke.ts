/**
 * Smoke test debate-client.ts ↔ Python sidecar.
 *
 * Run:
 *   1) cd ../agent-debate-service && .\.venv\Scripts\python main.py     (terminal A)
 *   2) cd ../server && npx tsx scratch/debate-smoke.ts                  (terminal B)
 *
 * Không cần API keys — sidecar sẽ trả mock response khi không có client config.
 */
import { config } from '../src/config.js';
import { callDebateSidecar } from '../src/live-agent/debate-client.js';
import type { AgentLLMContext } from '../src/live-agent/types.js';

const ctx: AgentLLMContext = {
  providerLabel: 'DEBATE',
  matchId: 'smoke-1',
  matchName: 'Team A vs Team B',
  leagueName: 'Test League',
  snapshot: {
    matchId: 'smoke-1',
    minute: 35,
    score: '0-0',
    ouLine: 2.25,
    overOdds: 1.95,
    underOdds: 1.85,
    handicap: -0.5,
    homeOdds: 1.9,
    awayOdds: 1.9,
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    timestamp: Date.now(),
  } as any,
  recentAlerts: [],
  oddsHistoryTail: [],
  constraints: {
    stakeVnd: 500_000,
    maxOrdersPerMatch: 3,
    ordersAlready: 0,
    allowedBetTypes: ['over', 'under', 'home', 'away'],
    executionMode: 'paper',
  },
  userPrompt: process.argv[2], // pass qua CLI arg: npx tsx scratch/debate-smoke.ts "Đánh giá kèo Tài H1"
};

(async () => {
  console.log(`Calling sidecar at ${config.agent.debateSidecarUrl}/debate ...`);
  const t0 = Date.now();
  const res = await callDebateSidecar(config, ctx);
  console.log(`Took ${Date.now() - t0}ms — requestId=${res.requestId}`);
  console.log(JSON.stringify(res, null, 2));
  if (!res.ok) process.exit(1);
})();
