# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a **two-package** project — a Vite/React frontend at the repo root and a separate Express/Node AI server under `server/`. Each has its own `package.json`, `tsconfig.json`, and `node_modules`. The frontend talks to the server over REST + SSE, and both share concepts (matches, odds, alerts) but **do not share code via imports** — types are duplicated where needed.

- Root: React 18 + Vite + Tailwind + CopilotKit + Recharts. Entry: `index.tsx` → `App.tsx`.
- `server/`: Express + TypeScript (ESM, `tsx` for dev). Entry: `server/src/index.ts`.
- `data/`: shared dataset files (`goal-dataset.jsonl`, `goal-dataset-meta.json`) consumed by the server's goal-prediction module via relative path `../data/...`.
- `notebooks/train-goal-model.ipynb`: trains the ONNX model that the server loads at startup (`server/models/goal-imminent-v1.onnx`).
- `worker.js`: standalone Cloudflare-style worker (separate from the Express server).

## Common commands

### Frontend (run from repo root)
```bash
npm install
npm run dev        # vite dev server, default http://localhost:5173
npm run build      # vite build → dist/
npm run preview
```

Frontend env (in `.env.local`): `GEMINI_API_KEY`, `VITE_AI_SERVER_URL` (defaults to `http://localhost:3001`).

### Server (run from `server/`)
```bash
cd server
npm install
npm run dev                 # tsx watch src/index.ts
npm run build               # tsc → server/dist/
npm start                   # node dist/index.js
npm test                    # vitest run
npm run test:watch
npm run extract-goal-data   # tsx src/scripts/extract-goal-dataset.ts (regenerates data/goal-dataset.jsonl)
```

Run a single test file: `npm test -- src/__tests__/evaluator.test.ts`
Run by name: `npm test -- -t "alert when odds drop"`

The server's CWD when running `npm run dev` is `repo-root/server/`. Paths in `server/src/config.ts` reflect this (`models/...`, `../data/...`).

## High-level architecture

### Server bootstrap (`server/src/index.ts`)
A small set of long-lived singletons are constructed at module load and wired together:
- `OddsMonitor` — polls B365 odds, emits `'alert'` events when drop/line-change thresholds trip.
- `NotificationService` + `TelegramSender` — receive alerts and fan out to in-app SSE + Telegram.
- `ConversationMemory` + `ChatOrchestrator` — chat history and request routing (OpenAI/Ollama).
- `LiveBetAgentRegistry` — per-match GPT/Gemini/Deepseek agents (PAPER mode by default), gated by `config.features.liveAgent`.
- On boot, `restoreFollowSubscriptions` and `restoreTelegramBindings` rehydrate persisted state from `server/data/`.
- Goal-prediction ONNX model + RAG store load **non-blocking** after `app.listen` — features must degrade gracefully if those fail.

All HTTP routes are mounted under `/api/*` and rate-limited (except `/api/b365-proxy`, which caches and is mounted **before** the rate-limit middleware). The order `predictGoalRouter` → `aiRouter` matters: predict-goal shares the `/api/ai/...` prefix and must be registered first to win Express matching.

### Feature flags
`config.features.*` (in `server/src/config.ts`) gates `aiEvaluation`, `oddsMonitor`, `telegramBot`, `chatAssistant`, `sheetsLogging`, `liveAgent`. Each flag is opt-out (`!== 'false'`). When adding a major subsystem, follow this pattern and check the flag at startup, not on every request.

### Live agent module
`server/src/live-agent/` runs **single-user** betting agents driven by LLMs (GPT, Gemini, Deepseek). `AGENT_LIVE_EXECUTION=true` enables real execution; default is paper. `oddsPushEvalMinMs` throttles LLM calls per-match to avoid burning tokens on odds churn.

Two **decision modes** controlled by `AGENT_DECISION_MODE` env var:
- `independent` (default) — 3 LLMs run in parallel via `Promise.allSettled`, each produces its own bet record.
- `debate` — calls Python sidecar `agent-debate-service/` (FastAPI :8088) which runs 2-round debate (opinion → rebuttal via `MsgHub`-style shared context) + a moderator LLM that synthesizes a consensus. The Node server still logs 3 per-agent records (PnL tracking per agent) **plus** 1 consensus record (`isConsensus=true` on `AgentOrderRecord`, separate `consensusRisk` state). On sidecar failure the flow falls back to `independent` mode unless `AGENT_DEBATE_FALLBACK_ON_ERROR=false`.

Debate mode env vars (all optional): `AGENT_DEBATE_SIDECAR_URL`, `AGENT_DEBATE_TIMEOUT_MS`, `AGENT_DEBATE_FALLBACK_ON_ERROR`, `AGENT_DEBATE_MODERATOR_MODEL`, `AGENT_DEBATE_CONSENSUS_STAKE_MULT`, `AGENT_DEBATE_ROUND2_ENABLED`. Sidecar setup + run instructions are in `agent-debate-service/README.md`.

### Frontend ↔ server contract
Most data flows: frontend polls B365 via `services/api.ts` (sometimes through `/api/b365-proxy`) and sends derived state (follow lists, bet history) to server endpoints. Real-time alerts flow server→client over SSE. CopilotKit (`useCopilotReadable` / `useCopilotAction` in `App.tsx`) exposes app state to the in-app AI assistant via the `/api/copilotkit` runtime route.

### Persistence
The server is **file-backed**, not DB-backed. State (follow subscriptions, telegram bindings, alert history, bet drafts) lives in `server/data/` as JSON, restored at boot and written incrementally. Treat these files as the source of truth; do not introduce a DB without aligning the persistence layer.

## Conventions worth knowing

- **ESM everywhere.** Server imports use `.js` extensions even when the source is `.ts` (TypeScript NodeNext resolution): `import { config } from './config.js'`.
- **No shared package.** When a type exists in both frontend (`types.ts`) and server, they are intentionally duplicated. Keep them in sync manually.
- **B365 proxy is the chokepoint** to the upstream odds provider. Heavy caching lives there; new odds-related features should reuse it rather than calling B365 directly from new code paths.
- **Vietnamese comments and log strings are common** in this codebase — don't translate them when editing nearby code.

## Reference docs in repo
- `README.md` — minimal frontend quickstart.
- `README_AI_ASSISTANT.md` — full architecture diagram, env var reference, Telegram bot setup.
- `README_FOLLOW_MATCH_TELEGRAM.md` — follow-match + Telegram binding flow.
- `README_GOOGLE_SHEETS.md` — sheets logging setup (`GOOGLE_SHEETS_*` env vars).
- `readme_AI_notebooks.md` — notebook + goal-model training workflow.
