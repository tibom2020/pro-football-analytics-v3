# AI Assistant — Pro Football Analytics

## Tổng quan

Hệ thống AI Assistant tích hợp vào web app phân tích bóng đá, cung cấp:

1. **Phân tích kèo AI** — đánh giá mức hợp lý, xác suất thắng, rủi ro, khuyến nghị
2. **Theo dõi biến động kèo** — cảnh báo khi odds giảm mạnh hoặc line thay đổi
3. **Chat AI đa kênh** — trên web app và Telegram
4. **Hệ thống thông báo** — in-app (SSE) + Telegram push

## Kiến trúc

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)           │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ AIAssistant  │  │  Dashboard  │  │  Services   │  │
│  │    Panel     │  │ (existing)  │  │ ai-service  │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬─────┘  │
│         │                 │                │         │
│         └────────────┬────┴────────────────┘         │
│                      │ REST API / SSE                │
└──────────────────────┼───────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────┐
│              Server (Express + Node.js)              │
│  ┌───────────────┐  ┌──────────────┐                 │
│  │ AI Evaluator  │  │ Odds Monitor │                 │
│  │ (rule-based)  │  │ (alert rules)│                 │
│  └───────┬───────┘  └──────┬───────┘                 │
│          │                 │                         │
│  ┌───────┴───────┐  ┌─────┴─────────┐               │
│  │ Chat          │  │ Notification  │               │
│  │ Orchestrator  │  │ Service       │               │
│  └───────────────┘  └──────┬────────┘               │
│                            │                        │
│                     ┌──────┴────────┐               │
│                     │ Telegram Bot  │               │
│                     └───────────────┘               │
└─────────────────────────────────────────────────────┘
```

## Cài đặt & Chạy

### 1. Frontend (không thay đổi)

```bash
# Đã chạy sẵn
npm run dev
```

Thêm env var (tùy chọn) vào `.env.local`:
```
VITE_AI_SERVER_URL=http://localhost:3001
```

### 2. Server AI

```bash
cd server

# Cài dependencies
npm install

# Copy và cấu hình env
cp .env.example .env
# Chỉnh sửa .env theo cấu hình của bạn

# Chạy development
npm run dev

# Chạy tests
npm test
```

### 3. Cấu hình Telegram Bot

1. Mở [@BotFather](https://t.me/BotFather) trên Telegram
2. Gửi `/newbot`, đặt tên và username
3. Copy token vào `server/.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```
4. Khởi động server — bot sẽ tự kết nối
5. Trên web app, mở AI Assistant → nhấn liên kết Telegram → gửi `/bind <code>` cho bot

### 4. Env Vars cần thiết

| Variable | Bắt buộc | Mô tả |
|----------|----------|-------|
| `PORT` | Không | Port server (mặc định: 3001) |
| `CORS_ORIGIN` | Không | Frontend origin (mặc định: http://localhost:5173) |
| `B365_PROXY_URL` | Không | URL proxy B365 (dùng cho server-side polling) |
| `B365_API_TOKEN` | Không | Token B365 API |
| `TELEGRAM_BOT_TOKEN` | Không | Token Telegram bot (bật Telegram) |
| `OPENAI_API_KEY` | Không | OpenAI API key (bật chat AI nâng cao) |
| `OPENAI_MODEL` | Không | Model OpenAI (mặc định: gpt-4o-mini) |
| `ODDS_DROP_THRESHOLD` | Không | Ngưỡng cảnh báo giảm kèo (mặc định: 0.15) |
| `RATE_LIMIT_MAX_REQUESTS` | Không | Rate limit (mặc định: 30/phút) |

## API Contract

### 1. Đánh giá kèo

```
POST /api/ai/evaluate
```

**Request:**
```json
{
  "match": {
    "id": "123",
    "league": "Premier League",
    "home": "Man Utd",
    "away": "Liverpool",
    "score": [1, 1],
    "minute": 65,
    "half": 2,
    "stats": {
      "attacks": [55, 60],
      "dangerousAttacks": [30, 35],
      "shotsOnTarget": [4, 5],
      "shotsOffTarget": [3, 4],
      "corners": [3, 4],
      "yellowCards": [1, 2],
      "redCards": [0, 0]
    }
  },
  "bet": {
    "matchId": "123",
    "betType": "over",
    "handicap": 2.5,
    "odds": 1.90,
    "stake": 100
  },
  "oddsHistory": [
    { "minute": 50, "handicap": 2.5, "overOdds": 1.95, "underOdds": 1.85 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "evaluation": {
    "matchId": "123",
    "betType": "over",
    "score": 72,
    "winProbability": 63,
    "confidence": 85,
    "recommendation": "enter",
    "recommendationText": "Kèo hợp lý — có thể vào với stake vừa phải.",
    "risks": ["Áp lực ghi bàn rất cao — rủi ro cho Xỉu"],
    "factors": [
      {
        "name": "Khoảng cách điểm so với line",
        "value": 78,
        "weight": 0.25,
        "impact": "positive",
        "explanation": "Tổng bàn 2, line 2.5. Cần thêm 0.5 bàn."
      }
    ],
    "insufficientData": [],
    "timestamp": 1713100000000
  }
}
```

### 2. Chat

```
POST /api/chat/message
```

**Request:**
```json
{
  "userId": "user_123",
  "sessionId": "optional_session_id",
  "message": "Phân tích Tài 2.5",
  "matchContext": { "match": {...}, "oddsHistory": [...] }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "message": {
    "id": "msg_uuid",
    "role": "assistant",
    "content": "🟢 Kèo hợp lý...",
    "timestamp": 1713100000000
  },
  "evaluation": null
}
```

### 3. Đăng ký theo dõi kèo

```
POST /api/odds/subscribe
```

**Request:**
```json
{
  "userId": "user_123",
  "matchId": "match_456",
  "matchName": "MU vs Liverpool",
  "threshold": 0.15
}
```

### 4. Push odds update

```
POST /api/odds/push
```

**Request:**
```json
{
  "matchId": "match_456",
  "snapshot": {
    "minute": 65,
    "handicap": 2.5,
    "overOdds": 1.78,
    "underOdds": 2.02
  }
}
```

### 5. SSE Stream

```
GET /api/odds/notifications/stream?userId=user_123
```

### 6. Telegram bind code

```
POST /api/telegram/bind-code
Body: { "userId": "user_123" }
Response: { "success": true, "code": "AB12CD34", "instruction": "..." }
```

## Data Model

### In-memory (MVP)

```typescript
// Evaluation audit log
interface AuditLogEntry {
  id: string;
  type: 'evaluation' | 'alert' | 'chat' | 'telegram';
  userId?: string;
  matchId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Odds subscription
interface OddsSubscription {
  id: string;
  userId: string;
  matchId: string;
  matchName: string;
  markets: string[];
  threshold: number;
  active: boolean;
  createdAt: number;
}

// Chat session
interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: { activeMatchId?: string; recentAlerts: []; recentEvaluations: [] };
  createdAt: number;
  updatedAt: number;
}
```

**Migration path:** Replace `data/store.ts` with PostgreSQL/SQLite adapter. Schema:
- `ai_evaluations(id, match_id, bet_type, score, recommendation, factors_json, created_at)`
- `odds_subscriptions(id, user_id, match_id, markets, threshold, active, created_at)`
- `odds_alerts(id, match_id, alert_type, market, prev_value, current_value, message, created_at)`
- `chat_sessions(id, user_id, messages_json, context_json, created_at, updated_at)`

## Test End-to-End

### 1. Frontend AI Panel (không cần server)

1. Chạy `npm run dev`
2. Nhập token hoặc Demo Mode
3. Mở một trận đấu
4. Nhấn nút Bot (góc phải dưới) → AI Assistant mở
5. Chọn loại kèo → "Phân tích ngay"
6. Xem kết quả: score, xác suất, rủi ro, khuyến nghị

### 2. Server + Chat

1. Chạy `cd server && npm run dev`
2. Mở AI Assistant → tab Chat
3. Gõ "help" → xem hướng dẫn
4. Gõ "phân tích Tài 2.5" → AI phân tích

### 3. Telegram

1. Cấu hình `TELEGRAM_BOT_TOKEN` trong `server/.env`
2. Chạy server
3. Mở Telegram, tìm bot
4. `/start` → xem hướng dẫn
5. Từ web app, lấy bind code → `/bind <code>`
6. Đăng ký theo dõi kèo → nhận push alert

### 4. Vào kèo qua Telegram (`/bet`)

Bot hỗ trợ chốt vé trực tiếp từ Telegram, ghi 1 dòng vào Google Sheet đúng schema với nút "Vào kèo" trên web app — dùng chung pipeline `POST /api/sheets/bet` qua service `bet-logger.ts`.

**Yêu cầu:**
- Đã `/bind` tài khoản web app
- Đang theo dõi ít nhất 1 trận từ web app (`/status` để kiểm tra)
- **Danh sách `/bet` chỉ gồm trận *live*:** có feed kèo từ web (đang polling, cập nhật trong ~45 phút gần nhất) và phút trận &lt; 120 trên snapshot. Trận đã xong hoặc đã tắt tab không hiện — `/clean` rồi mở lại trận đang đá.
- `GOOGLE_SHEETS_*` đã cấu hình và `FEATURE_SHEETS_LOGGING != false`

**Luồng 4 bước (inline keyboard):**

```
You: /bet
Bot: 🎫 Vào kèo qua Telegram
     _Chỉ trận đang có feed live từ web_
     Chọn trận bạn muốn vào kèo:
     [⚽ MU vs Liverpool · Premier League]
     [⚽ Chelsea vs Nottm Forest · Premier League]
     [❌ Hủy]

You: (bấm trận)
Bot: 🎫 MU vs Liverpool
     🏆 Premier League
     📍 Tỷ số: 1-0 | Phút 65'
     Chọn loại kèo:
     [📈 Tài 2.5 @1.90]   [📉 Xỉu 2.5 @1.95]
     [🏠 Chủ -0.50 @1.85] [✈️ Khách +0.50 @2.05]
     [❌ Hủy]

You: (bấm Tài 2.5)
Bot: 💰 Tài 2.5 @1.90
     Chọn mức stake:
     [50] [100] [200]
     [500] [1000]
     [✏️ Tự nhập] [❌ Hủy]

You: (bấm 100, hoặc bấm "Tự nhập" rồi gõ "100k")
Bot: 🎫 VÉ CHUẨN BỊ VÀO KÈO
     🏆 Premier League
     ⚽ MU vs Liverpool
     📍 Tỷ số: 1-0 | Phút 65'
     💰 Tài 2.5 @1.90
     💵 Stake: 100
     [✅ Vào kèo] [❌ Hủy]

You: (bấm Vào kèo)
Bot: ✅ Đã vào kèo!
     🆔 betId: 7c1f-...
     📄 Sheet row: 47
```

**Đặc tả kỹ thuật:**

- Lệnh: `/bet` (alias `/vaokeo`)
- State được lưu trong `BetDraftStore` (in-memory, TTL 10 phút, cleanup mỗi 60s)
- Snapshot kèo được khoá tại lúc chọn trận để tránh đổi giá giữa flow
- Stake hỗ trợ: số nguyên, suffix `k` (×1000), `tr`/`m` (×1000000), dấu `,` thay `.`
- Idempotent qua `betId` (UUID lock từ đầu — retry an toàn)
- V1 chỉ hỗ trợ kèo full-match (Tài/Xỉu/Đội nhà/Đội khách); H1 sẽ bổ sung sau

**Smoke test sau khi triển khai:**

1. Đảm bảo `server/.env` có `TELEGRAM_BOT_TOKEN`, `GOOGLE_SHEETS_SPREADSHEET_ID`, và service-account credentials
2. Chạy `cd server && npm run dev`
3. Trên web app: mở 1 trận live → bật theo dõi (subscription)
4. Trên Telegram: `/bind <code>` (lấy code từ web app), rồi `/bet`
5. Đi qua flow chọn trận → loại kèo → stake → confirm
6. Kiểm tra Google Sheet `Bets` tab — dòng mới có cột `note` chứa `[via Telegram]`

## Kế hoạch triển khai

### Phase 1 — MVP (Hiện tại) ✅

- [x] AI evaluator rule-based (explainable)
- [x] Odds monitor với alert rules engine
- [x] In-app notification (SSE)
- [x] Chat widget trong web app
- [x] Telegram bot cơ bản
- [x] Rate limiting
- [x] Audit logging
- [x] Unit tests

### Phase 2 — Improve

- [ ] OpenAI/Claude integration cho chat tự nhiên
- [ ] Persistent database (PostgreSQL/SQLite)
- [ ] User authentication (JWT)
- [ ] Historical analysis (pattern recognition)
- [ ] Telegram inline keyboards
- [ ] Push notification (web push API)

### Phase 3 — Advanced

- [ ] ML-based prediction model
- [ ] Multi-match portfolio analysis
- [ ] A/B testing cho evaluation weights
- [ ] Real-time WebSocket thay vì SSE
- [ ] Dashboard analytics cho AI performance

## Đề xuất tính năng bổ sung

### 1. Portfolio Risk Manager
- **Why:** Người dùng thường đặt nhiều kèo cùng lúc. Phân tích rủi ro tổng thể portfolio giúp quản lý vốn tốt hơn.
- **Effort:** M
- **Priority:** P1
- **Risk:** Cần thêm state management phức tạp hơn (Zustand/Redux)
- **Sketch:** Tạo `PortfolioAnalyzer` tổng hợp tất cả `BetTicket` pending, tính correlation risk, max drawdown, suggested position sizing theo Kelly Criterion.

### 2. Pre-match Analysis Bot
- **Why:** Phân tích trước trận dựa trên H2H, form, league standings giúp user chuẩn bị tốt hơn.
- **Effort:** L
- **Priority:** P2
- **Risk:** Cần thêm API nguồn dữ liệu lịch sử (football-data.org, API-Football)
- **Sketch:** Thêm module `pre-match-analyzer` fetch dữ liệu H2H, tính expected goals (xG), so sánh form 5 trận gần nhất, output JSON chuẩn hóa render trên frontend.

### 3. Smart Stake Calculator
- **Why:** Tính toán stake tối ưu dựa trên bankroll, win probability, và Kelly Criterion — giảm risk of ruin.
- **Effort:** S
- **Priority:** P1
- **Risk:** Thấp — logic thuần toán
- **Sketch:** `kellyStake(bankroll, winProb, odds) = bankroll * ((winProb * (odds-1) - (1-winProb)) / (odds-1))` với cap 5% bankroll. Tích hợp vào TicketManager form.

### 4. Odds Pattern Recognition
- **Why:** Phát hiện pattern lặp lại (ví dụ: odds drop liên tục 3 lần → 80% trường hợp có goal trong 10 phút) giúp dự đoán chính xác hơn.
- **Effort:** L
- **Priority:** P2
- **Risk:** Cần thu thập đủ data lịch sử; risk of overfitting
- **Sketch:** Collect odds snapshots vào time-series DB, build feature vectors (drop_count, drop_magnitude, minute, score_diff), train logistic regression hoặc decision tree. Export patterns thành rules cho `odds-monitor`.

### 5. Live Commentary Feed
- **Why:** Tóm tắt diễn biến trận đấu bằng AI giúp user không cần xem trực tiếp vẫn nắm được tình hình.
- **Effort:** M
- **Priority:** P3
- **Risk:** Phụ thuộc vào chất lượng stats API; cần LLM cho natural language generation
- **Sketch:** Mỗi polling cycle, so sánh stats delta, detect events (goal, card, momentum shift), generate text summary. Push qua SSE và Telegram.
