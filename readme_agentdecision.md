# Agent Decision Modes — Independent vs Debate

Hướng dẫn cấu hình và chạy 2 mode quyết định bet cho `server/src/live-agent/`:

- **`independent`** (default) — 3 LLM (GPT, Gemini, DeepSeek) chạy song song độc lập, mỗi cái tự ra quyết định + log riêng. Đây là behavior cũ, không cần làm gì thêm.
- **`debate`** — 3 agent debate 2 round (opinion → rebuttal) qua Python sidecar, một moderator LLM tổng hợp ra consensus. Vẫn log 3 record per-agent để track PnL từng cái + 1 record consensus.

Cả 2 mode đều hỗ trợ **prompt tự do từ người dùng** — ô textarea trong UI `LiveAgentPanel` cho phép gõ câu hỏi cụ thể (vd "đánh giá kèo Tài H1", "có nên vào kèo chấp home không?"). Agent sẽ ưu tiên trả lời theo yêu cầu đó, vẫn giữ schema JSON skip/bet + reasonVi bám sát câu hỏi.

> Bật/tắt qua env var duy nhất `AGENT_DECISION_MODE`. Không bật → mặc định chạy `independent`, không ảnh hưởng gì.

---

## 1. Kiến trúc tổng thể

```
POST /api/live-agent/trigger {matchId}
       │
       ▼
service.ts:runAllProviders()
       │
       ├─ AGENT_DECISION_MODE=independent  ──► runOneProvider × 3 (song song, độc lập)
       │
       └─ AGENT_DECISION_MODE=debate       ──► debate-client.ts
                                                  │ POST http://127.0.0.1:8088/debate
                                                  ▼
                                           Python sidecar (FastAPI)
                                           agent-debate-service/
                                              ├─ Round 1: 3 agent ra opinion (parallel)
                                              ├─ Round 2: mỗi agent thấy 2 opinion kia → rebuttal
                                              └─ Moderator: tổng hợp 6 opinion → consensus JSON
                                                  │ response
                                                  ▼
                                           service.ts:runDebateMode()
                                              ├─ persist 3 per-agent records ([DEBATE])
                                              └─ persist 1 consensus record ([CONSENSUS])
```

**Failure mode**: sidecar down / timeout / parse-error → tự fallback về `independent` (trừ khi `AGENT_DEBATE_FALLBACK_ON_ERROR=false`).

---

## 2. Cài đặt sidecar (chỉ cần cho debate mode)

Trên Windows, mở PowerShell:

```powershell
cd d:\WORK\LINH\pro-football-analytics-v2\agent-debate-service

# Tạo virtual env (chỉ lần đầu)
python -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1
```

Nếu PowerShell chặn `Activate.ps1` với lỗi "running scripts is disabled":
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# Mở terminal mới và Activate lại
```
Hoặc dùng `cmd`:
```cmd
.venv\Scripts\activate.bat
```

Cài dependencies + tạo `.env`:
```powershell
pip install -r requirements.txt
copy .env.example .env
notepad .env
```

Trong `.env` điền 3 API key:
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
```

Các field còn lại có default sẵn, không cần đụng trừ khi muốn override model hoặc port.

---

## 3. Cấu hình Node server

Thêm vào `server/.env`:

```bash
# Bắt buộc để bật debate
AGENT_DECISION_MODE=debate

# Optional — defaults trong code đã ổn
AGENT_DEBATE_SIDECAR_URL=http://127.0.0.1:8088
AGENT_DEBATE_TIMEOUT_MS=45000
AGENT_DEBATE_FALLBACK_ON_ERROR=true
AGENT_DEBATE_MODERATOR_MODEL=gpt-4o-mini
AGENT_DEBATE_CONSENSUS_STAKE_MULT=1.0
AGENT_DEBATE_ROUND2_ENABLED=true
```

| Env var | Default | Ý nghĩa |
|---|---|---|
| `AGENT_DECISION_MODE` | `independent` | Set `debate` để bật mode mới. Bất kỳ giá trị khác (kể cả empty) đều coi như `independent`. |
| `AGENT_DEBATE_SIDECAR_URL` | `http://127.0.0.1:8088` | URL sidecar. Đổi nếu deploy khác máy. |
| `AGENT_DEBATE_TIMEOUT_MS` | `45000` | Timeout HTTP. 2 round + moderator ~10-16s, buffer rộng. |
| `AGENT_DEBATE_FALLBACK_ON_ERROR` | `true` | Sidecar fail → chạy `independent`. Set `false` để **không** fallback (skip toàn bộ trigger). |
| `AGENT_DEBATE_MODERATOR_MODEL` | `gpt-4o-mini` | Model dùng cho moderator. Có thể override sang `gemini-2.0-pro` hoặc `deepseek-chat`. Sidecar tự pick API key tương ứng. |
| `AGENT_DEBATE_CONSENSUS_STAKE_MULT` | `1.0` | Nhân stake cho consensus record. Vd `1.5` → consensus đặt 750k thay vì 500k. |
| `AGENT_DEBATE_ROUND2_ENABLED` | `true` | `false` → bỏ qua Round 2, chỉ R1 + moderator (~5-10s thay vì 8-16s, giảm cost ~30%). |

---

## 4. Chạy

**Terminal 1** — Python sidecar:
```powershell
cd d:\WORK\LINH\pro-football-analytics-v2\agent-debate-service
.\.venv\Scripts\Activate.ps1
python main.py
```
Kiểm tra:
```powershell
curl http://127.0.0.1:8088/health
# → {"ok":true,"service":"agent-debate-service","round2Enabled":true}

curl http://127.0.0.1:8088/models
# → {"gpt":{"model":"gpt-4o-mini","configured":true}, ...}
```

**Terminal 2** — Node server (như bình thường):
```powershell
cd d:\WORK\LINH\pro-football-analytics-v2\server
npm run dev
```

**Terminal 3** — Trigger 1 trận (đang live, đã có snapshot trong cache):
```powershell
curl -X POST http://localhost:3001/api/live-agent/trigger `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $env:AGENT_CONTROL_TOKEN" `
  -d '{\"matchId\":\"<ID-TRẬN-LIVE>\"}'
```

---

## 4.5. Prompt tự do từ người dùng

Trong panel `Live Agents` của UI có ô textarea **"Yêu cầu cho agents (tuỳ chọn)"**:

- Để trống → flow mặc định, agent tự phân tích theo signals (giống behavior cũ).
- Có nội dung → prompt được prepend vào đầu LLM context với header `[YÊU CẦU CỤ THỂ TỪ NGƯỜI DÙNG]`, **cả 3 agent + moderator** đều thấy. Agent ưu tiên trả lời theo câu hỏi, vẫn xuất schema JSON.
- Có sẵn 4 chip gợi ý: "Đánh giá kèo Tài H1 / FT", "Vào kèo chấp home được không?", "Nên vào Xỉu phút này không?", "Có signal cho khách thắng không?".
- Giới hạn 600 ký tự (cả frontend và route đều enforce).

Hoạt động ở **cả independent và debate mode**. Ví dụ payload:
```json
POST /api/live-agent/trigger
{ "matchId": "12345", "userPrompt": "Đánh giá kèo Tài H1" }
```

Agent reasonVi sẽ trả lời câu hỏi (vd: *"Theo yêu cầu đánh giá Tài H1: hiệp 1 hiện đang phút 35, tổng bàn 0, line OU 0.5. Tín hiệu chuông áp lực yếu → khả năng có bàn H1 thấp, nên skip"*). Nếu câu hỏi không khớp `allowedBetTypes` (vd hỏi phạt góc) → agent skip với reasonVi giải thích.

## 4.6. Goal Model/RAG cho 3 Live Agent

Live Agent `Tí Bơm`, `Tí Nị`, `Tuệ Tuệ` hiện nhận thêm block định lượng trước khi ra quyết định:

- `goalProb15`: xác suất có bàn trong 15 phút tới từ `train-goal-model.ipynb` / `server/models/goal-imminent-v1.onnx`.
- `goalProb5`: xác suất có bàn trong 5 phút tới từ `train-goal-model-5min.ipynb` / `server/models/goal-imminent-5min-v1.onnx`.
- `similarMatches`: top 5 tình huống lịch sử tương tự từ RAG store, cosine similarity trên feature vector.
- `goalTopFeatures`: top feature quan trọng theo model 15 phút.
- `goalFeatureQuality`: `full-ish` nếu server parse được stats text từ lần push live, `odds-only` nếu chỉ có odds/alert.

Số liệu train hiện tại:

| Model | Window | Train rows / matches | Test rows / matches | ROC-AUC | PR-AUC | Positive test |
|---|---:|---:|---:|---:|---:|---:|
| `goal-imminent-5min-v1` | 5 phút | 14,977 / 258 | 3,832 / 65 | 0.559 | 0.158 | 13.3% |
| `goal-imminent-v1` | 15 phút | 10,263 / 236 | 2,787 / 60 | 0.503 | 0.415 | 38.8% |

Top feature hiện tại:

| Model | Top feature |
|---|---|
| 5 phút | `half`, `ah12_away_odds`, `pressure_alert_count_3m`, `minute`, `ou13_over_drops_5m_count`, `ou13_handicap`, `total_goals_so_far`, `ah12_handicap`, `ou13_under_max_step_5m`, `ah12_home_odds` |
| 15 phút | `half`, `ou13_over_drops_5m_count`, `ah12_handicap`, `ou13_handicap`, `ah12_away_odds`, `total_goals_so_far`, `ah12_home_drops_5m_count`, `ah12_home_odds`, `ou13_under_max_step_5m`, `minute` |

Cách dùng trong prompt:

```text
Goal Model/RAG (train-goal-model 15min + train-goal-model-5min):
- Feature quality: full-ish
- Xác suất có bàn trong 15 phút tới: 42.7%
- Xác suất có bàn trong 5 phút tới: 18.4%
- Top feature 15': half=1.00, ou13_over_drops_5m_count=2.00, ah12_handicap=-0.25
- Trận/tình huống lịch sử tương tự:
  10307468 H1 p36: có bàn trong cửa sổ, sim=0.842
  10285547 H1 p39: không bàn trong cửa sổ, sim=0.817
```

Quy tắc đọc cho agent:

- `goalProb5` cao giúp nhận diện nhịp rất gần, hợp với tín hiệu chuông/OU drop liên tục.
- `goalProb15` dùng làm nền xác suất cho quyết định Tài/Xỉu trong cửa sổ rộng hơn.
- `similarMatches` không phải bằng chứng tuyệt đối; nếu các tình huống tương tự chia 50/50 hoặc similarity thấp thì giảm confidence.
- Nếu `goalFeatureQuality=odds-only`, agent phải coi xác suất model là phụ vì thiếu stats delta thật.
- Nếu model/RAG mâu thuẫn mạnh với DA, sút trúng đích, odds drop hoặc alert mới nhất thì ưu tiên `skip` hoặc giảm confidence.

## 5. Verify

Sau 1 trigger ở debate mode, kiểm tra:

### Google Sheets (tab `Bets`)
Phải có **4 rows** mới với cùng `matchId`:

| providerLabel | note prefix |
|---|---|
| Tí Bơm | `[DEBATE] ...` |
| Tí Nị | `[DEBATE] ...` |
| Tuệ Tuệ | `[DEBATE] ...` |
| **Consensus** | `[CONSENSUS] vote=2/3 over | ...` |

> Nếu 1-2 agent ra `skip` thì chỉ những agent `bet` mới có row Sheets. Consensus chỉ có row khi `consensus.action=bet`.

### Telegram
Nhận tối đa 4 message với header tag:
- `🤖 *Live Agent Tí Bơm · PAPER · DEBATE-AGENT*` (hoặc `DEBATE-AGENT-R2` nếu agent đã update ở Round 2)
- `🤖 *Live Agent Consensus · PAPER · CONSENSUS*` + thêm dòng `🗳 *Vote:* 2/3 bet over (Tí Bơm, Tí Nị); Tuệ Tuệ skip`

### Server log
```
[LiveAgent debate] reqId=<uuid> match=<id> consensus=bet/over vote="2/3 bet over ..." timings={"round1Ms":4200,"round2Ms":3800,"moderatorMs":2100,"totalMs":10100}
[LiveAgent Tí Bơm] ORDER paper over match=<id> betId=<uuid>
[LiveAgent Tí Nị] ORDER paper over match=<id> betId=<uuid>
[LiveAgent Tuệ Tuệ [CONSENSUS]] ORDER paper over match=<id> betId=<uuid>   ← consensus dùng provider field placeholder
```

### Fallback (sidecar down)
Tắt Terminal 1 (Ctrl+C) → trigger lại → log:
```
[LiveAgent] Debate failed → fallback independent: TypeError: fetch failed
```
Sheets vẫn có 3 row (independent flow), không có row consensus.

### Test programmatic (không cần trận live)
Có sẵn smoke script:
```powershell
cd d:\WORK\LINH\pro-football-analytics-v2\server
npx tsx scratch/debate-smoke.ts
```
Gọi sidecar local với mock match data, in JSON response. Hữu ích để verify wiring sau khi thay đổi `debate-client.ts` hoặc schema.

---

## 6. Chi phí & latency

| | Independent (cũ) | Debate (R1+R2+Mod) | Debate (R1+Mod) |
|---|---|---|---|
| LLM calls / trigger | 3 | **7** | **4** |
| Latency dự kiến | 3-6s | **8-16s** | 5-10s |
| Cost / trigger (≈) | $0.0015 | $0.006 | $0.003 |
| 50 trigger/ngày | $9/tháng | $9/tháng (debate) | n/a |

Round 2 đáng giá khi đề ra rebuttal có chiều sâu (đặc biệt khi 3 agent disagree). Nếu thấy cost cao → set `AGENT_DEBATE_ROUND2_ENABLED=false`, vẫn có moderator vote tổng hợp.

---

## 7. Troubleshooting

**`fetch failed` / `ECONNREFUSED 127.0.0.1:8088`**
- Sidecar chưa chạy. Mở Terminal 1, run `python main.py`.

**`HTTP 500: insufficient_agents`**
- <2 agent ra opinion. Thường do API key sai/hết quota. Check `/models`:
  ```
  curl http://127.0.0.1:8088/models
  ```
  Field `configured: false` nghĩa là env var chưa load. Restart sidecar sau khi sửa `.env`.

**Sidecar nói "Không có LLM client nào configured → trả mock data"**
- Sidecar không thấy API key nào. Check file `.env` (phải nằm trong `agent-debate-service/`, không phải `server/.env`).

**Mode vẫn ra independent dù đã set `AGENT_DECISION_MODE=debate`**
- Reload server: `npm run dev` cần restart sau khi sửa `.env`.
- Check log boot: `[LiveAgent debate]` chỉ xuất hiện khi mode=debate. Nếu không thấy log đó sau trigger → env chưa load.

**Tests Python**
```powershell
cd d:\WORK\LINH\pro-football-analytics-v2\agent-debate-service
.\.venv\Scripts\python.exe -m pytest tests/ -v
```
11 test cover: all-agree / 2v1 / all-skip / partial-error / insufficient / moderator-fallback / allowed-bet-types / round2-disabled.

**Tests Node**
```powershell
cd d:\WORK\LINH\pro-football-analytics-v2\server
npm test
```
Live-agent tests (parse + risk) phải pass. Test `rules.test.ts > handicap_line_change` là failing pre-existing không liên quan đến debate mode.

---

## 8. Sync giữa Node và Python

Một số phần phải sync 2 chiều khi sửa schema/prompt:

| Node | Python |
|---|---|
| [server/src/live-agent/prompt.ts](server/src/live-agent/prompt.ts) `SYSTEM` | [agent-debate-service/prompts.py](agent-debate-service/prompts.py) `SYSTEM_R1` |
| [server/src/live-agent/parse-decision.ts](server/src/live-agent/parse-decision.ts) | [agent-debate-service/parse_decision.py](agent-debate-service/parse_decision.py) |
| [server/src/live-agent/types.ts](server/src/live-agent/types.ts) `AgentLLMContext` | [agent-debate-service/schemas.py](agent-debate-service/schemas.py) `DebateRequest` |
| [server/src/telegram/bet-flow.ts](server/src/telegram/bet-flow.ts) `FlowBetType` | `schemas.py:BetType` |

Khi thêm bet type mới (vd `corner`, `card`), nhớ update **cả 2 phía** + thêm test case.

---

## 9. Files quan trọng

- [agent-debate-service/](agent-debate-service/) — Python sidecar
- [agent-debate-service/README.md](agent-debate-service/README.md) — chi tiết sidecar
- [server/src/live-agent/service.ts](server/src/live-agent/service.ts) — `runDebateMode`, `persistDecisionAndSideEffects`, `persistConsensusDecision`
- [server/src/live-agent/debate-client.ts](server/src/live-agent/debate-client.ts) — HTTP client + request shape
- [server/src/config.ts](server/src/config.ts) — env vars debate
- [server/scratch/debate-smoke.ts](server/scratch/debate-smoke.ts) — Node↔sidecar wiring smoke
- [CLAUDE.md](CLAUDE.md) §"Live agent module" — high-level note cho future Claude sessions
