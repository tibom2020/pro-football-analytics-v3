# Tích hợp OpenHuman ↔ PFA

Tài liệu hướng dẫn dùng [OpenHuman](https://github.com/tinyhumansai/openhuman) (desktop app AI) để trò chuyện về kèo cược và trận đang theo dõi trong PFA.

## Tại sao không nhúng OpenHuman vào PFA?

OpenHuman là **desktop app CEF/Rust standalone**, license GPL-3.0, phân phối dưới dạng binary (DMG/EXE). Repo **không cung cấp** npm SDK, REST API công khai, hay iframe để nhúng vào web app khác.

Sau khi rà soát surface mở rộng (đã verify trực tiếp với bản v0.53.x cài local):

| Cách tích hợp | Hỗ trợ? | Quyết định |
|---|---|---|
| MCP server (Model Context Protocol) | ❌ Không (zero refs trong repo) | Loại |
| Local RPC `http://127.0.0.1:7788/rpc` | ⚠️ Undocumented; host **kill process** mà nó nghĩ là "stale core" | Loại — rủi ro cao |
| Obsidian-compatible wiki (`~/.openhuman/wiki/`) | ❌ Bản v0.53.x **đã bỏ** layout này (docs cũ) | Loại |
| Skill plugin (QuickJS, repo `openhuman-skills`) | ✅ Có nhưng cần build pipeline TS riêng | Phase 2 |
| **Drop markdown vào workspace + `file_read` tool** | ✅ `file_read` được auto-approved trong `config.toml` | ✅ **MVP** |

**Giải pháp đang dùng:** bridge sidecar poll PFA → render markdown → ghi atomic vào `~/.openhuman/users/<active>/workspace/pfa/`. OpenHuman có tool `file_read` được auto-approved (xem `[autonomy].auto_approve` trong `config.toml`) → bạn bảo OpenHuman *"đọc file `pfa/summary.md` và tóm tắt"* và nó truy xuất được trực tiếp.

> **Lưu ý:** Khác với Obsidian, OpenHuman v0.53.x **không tự index** folder để wiki search. Bạn phải gọi tên file cụ thể trong câu hỏi (vd: *"đọc `pfa/bets-active.md`"*) hoặc bảo nó liệt kê trước (`pfa/` folder).

## Kiến trúc

```
┌─────────────────┐       HTTP        ┌──────────────────┐
│  PFA frontend   │ ───── sync ─────▶ │   PFA server     │
│ (Vite, :5173)   │                   │  (Express, :3001)│
└─────────────────┘                   │                  │
                                      │  server/data/    │
                                      │  bet_tickets.json│
                                      └────────┬─────────┘
                                               │ GET
                                               ▼
                                      ┌──────────────────┐
                                      │ openhuman-bridge │
                                      │  (Node sidecar)  │
                                      └────────┬─────────┘
                                               │ atomic write
                                               ▼
                                      ┌──────────────────┐
                                      │ ~/.openhuman/    │
                                      │   users/<id>/    │
                                      │     workspace/   │
                                      │       pfa/*.md   │
                                      └────────┬─────────┘
                                               │ file_read tool
                                               │ (auto-approved)
                                               ▼
                                      ┌──────────────────┐
                                      │ OpenHuman desktop│
                                      │  (đọc on-demand  │
                                      │   theo tên file) │
                                      └──────────────────┘
```

## Thành phần đã thêm

### Server (PFA)
- `server/src/data/bet-tickets-persistence.ts` — mirror bet tickets vào `server/data/bet_tickets.json`.
- `server/src/routes/bets.ts` — endpoint mới:
  - `POST /api/bets/sync` — frontend sync toàn bộ ticket list (replace).
  - `GET /api/bets/sync/:userId` — bridge đọc ticket của user.
  - `GET /api/bets/sync` — bridge đọc toàn bộ.
- `server/src/index.ts` — mount router, restore on boot.

### Frontend
- `services/bet-storage.ts` — single sink `saveBetTickets()` gói `localStorage.setItem + syncBetsToServer`.
- `services/ai-service.ts` — thêm `syncBetsToServer(userId, tickets)`.
- 3 callsite ghi `betTickets` đã chuyển sang dùng helper:
  - `components/BetHistory.tsx`
  - `components/TicketManager.tsx`
  - `services/agent-tickets-merge.ts` (Live Agent)

Frontend giữ `localStorage` là source of truth; server chỉ là bản mirror.

### Bridge — `tools/openhuman-bridge/`
- `src/vault.ts` — resolve vault path theo OS, atomic write.
- `src/sources.ts` — wrap GET endpoints PFA (timeout 5s, fail-soft).
- `src/render.ts` — render markdown (YAML frontmatter + table).
- `src/index.ts` — main loop, per-source error isolation.

## File markdown bridge ghi vào `<vault>/pfa/`

| File | Nội dung |
|---|---|
| `bets-active.md` | Kèo đang `pending` (table) |
| `bets-history.md` | Kèo đã chốt — group theo ngày, kèm P/L từng ngày |
| `summary.md` | Tổng quan hôm nay / tuần này / tháng này (P/L, tỉ lệ thắng) |
| `follows.md` | Trận đang follow |
| `alerts-today.md` | Alert trong 24h gần nhất |

Mỗi file có YAML frontmatter (`source: pfa`, `updated_at`) để OpenHuman Memory Tree phân loại.

## Setup

### 1. Cài OpenHuman desktop
Tải bản phát hành mới nhất từ https://github.com/tinyhumansai/openhuman/releases và cài đặt.

**Đăng nhập lần đầu** (Google/GitHub/Twitter) để OpenHuman tạo workspace. Sau khi đăng nhập:
- Windows: `C:\Users\<you>\.openhuman\users\<hex-id>\workspace\`
- macOS / Linux: `~/.openhuman/users/<hex-id>/workspace/`

Bridge sẽ tự discover `<hex-id>` (folder mới nhất). Nếu có nhiều account, set `OPENHUMAN_USER_ID` trong `.env` để chỉ rõ folder nào.

### 2. Chạy PFA server
```bash
cd server
npm install
npm run dev
```

Đảm bảo server lắng nghe trên cổng (mặc định 3001).

### 3. Lấy `PFA_USER_ID`
Mở app PFA trong trình duyệt → DevTools (F12) → **Application** → **Local Storage** → `app_user_id`. Copy UUID đó.

### 4. Cài và chạy bridge
```bash
cd tools/openhuman-bridge
npm install
cp .env.example .env
# Mở .env, paste PFA_USER_ID
npm run dev
```

Output mẫu:
```
[bridge] vault: C:\Users\you\AppData\Roaming\openhuman\wiki\pfa
[bridge] PFA:   http://localhost:3001 (user=8f3a...)
[bridge] poll:  every 45000ms
[bridge] 2026-05-19T... bets=12 follows=3 alerts=5 writes=5/5
```

### 5. Verify
Output bridge sẽ log path đầy đủ, ví dụ:
```
[bridge] vault: C:\Users\phanv\.openhuman\users\6a0c078a4329bca3a2c861d3\workspace\pfa
```
Mở folder đó bằng Explorer → phải thấy 5 file `.md`. Mở `bets-active.md` bằng Notepad → table chứa các kèo `pending` đúng như UI BetHistory.

### 6. Dùng trong OpenHuman
Vì OpenHuman không tự index folder, bạn cần **chỉ rõ file** trong câu hỏi. Ví dụ tốt:

- *"Đọc file `pfa/summary.md` rồi cho tôi biết P/L tuần này"*
- *"Đọc `pfa/bets-active.md` — tôi đang chờ kèo nào?"*
- *"Liệt kê file trong folder `pfa/`, sau đó đọc file lịch sử kèo và tóm tắt 3 ngày gần nhất"*
- *"Đọc `pfa/alerts-today.md` — trận nào nên chú ý?"*

Câu hỏi quá generic *"kèo của tôi hôm nay"* có thể không trigger `file_read` — OpenHuman sẽ dùng memory/web search trước. Cứ nói rõ tên file trong những lần đầu.

Sau vài lần đọc, OpenHuman có thể tự nhớ "pfa/ chứa data bet" và proactively đọc — nhưng đừng dựa vào hành vi đó.

## Biến môi trường bridge (`tools/openhuman-bridge/.env`)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PFA_BASE_URL` | `http://localhost:3001` | URL PFA server |
| `PFA_USER_ID` | *(bắt buộc)* | UUID lấy từ `localStorage.app_user_id` |
| `OPENHUMAN_USER_ID` | *(auto-discover)* | Hex id của account trong `~/.openhuman/users/`. Để trống → bridge tự pick folder mới nhất. |
| `OPENHUMAN_VAULT` | *(auto)* | Override toàn bộ vault path nếu cần. Mặc định: `~/.openhuman/users/<active>/workspace/pfa/` |
| `POLL_INTERVAL_MS` | `45000` | Chu kỳ poll. Min 10000 (tự clamp). |

## Edge cases / behavior

- **PFA server down** → bridge log warn, file `.md` cũ giữ nguyên (per-source isolation), không crash.
- **Bet mới đặt qua TicketManager** → mirror lên server ngay (qua `saveBetTickets`); xuất hiện trong vault ở chu kỳ poll tiếp theo (≤ 45s mặc định).
- **Status chuyển `pending → won`** → ticket di chuyển từ `bets-active.md` sang `bets-history.md` ở chu kỳ poll tiếp theo.
- **Bet cũ trong localStorage** (trước khi cài bridge) → chỉ được mirror khi user mở tab **BetHistory** một lần (initial-load sync).
- **Restart bridge** → idempotent, không duplicate (server upsert toàn bộ array, file ghi atomic).
- **Multi-device** → bridge chạy trên máy nào, file vào OpenHuman trên máy đó. Mỗi máy cần `PFA_USER_ID` riêng (mỗi browser có UUID riêng trừ khi share `localStorage`).

## Bảo mật / privacy

- Bridge chỉ gọi HTTP đến `PFA_BASE_URL` (mặc định localhost). Không gửi data ra ngoài.
- OpenHuman có thể gọi external LLM theo cấu hình của bạn — bet data trong wiki sẽ qua LLM khi bạn chat. Xem [OpenHuman docs về privacy](https://tinyhumans.gitbook.io/openhuman) trước khi gắn API key cloud.
- File `.env` của bridge chứa `PFA_USER_ID` — không commit (đã có trong `.gitignore`).

## Phase 2 (chưa triển khai)

Các hướng mở rộng tiềm năng nếu muốn nâng cấp sau:

- **Skill thực sự cho OpenHuman**: viết QuickJS skill ở repo `openhuman-skills` gọi HTTP PFA on-demand thay vì poll → interactive hơn, không cần file trung gian.
- **Realtime push qua SSE**: PFA có sẵn SSE alert channel; bridge có thể subscribe để cập nhật `alerts-today.md` ngay khi có alert mới (thay vì đợi poll).
- **2-way**: cho OpenHuman ra lệnh ngược lại PFA (đặt kèo, hủy follow). Cần auth + write endpoints. Không khuyến nghị khi OpenHuman vẫn Early Beta.

## Tham khảo nội bộ

- Plan gốc: `C:\Users\phanv\.claude\plans\https-github-com-tinyhumansai-openhuman-gleaming-shore.md`
- README bridge ngắn: [tools/openhuman-bridge/README.md](tools/openhuman-bridge/README.md)
- README PFA chính: [README_AI_ASSISTANT.md](README_AI_ASSISTANT.md)
