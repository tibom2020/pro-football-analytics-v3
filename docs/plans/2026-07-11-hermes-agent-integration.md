# Hermes Agent × PFA v3 — Live Match Integration Plan

> **Goal:** Thêm nút "Kết nối Hermes Agent" trong PFA, khi bấm sẽ tạo session riêng theo dõi trận đấu và tự động phân tích khi có biến động (line kèo, bàn thắng, hết hiệp, sút trúng đích).

**Architecture:** PFA server thêm endpoint REST phục vụ snapshot match real-time. Frontend thêm nút kết nối. Hermes Agent chạy cron job poll snapshot, phát hiện thay đổi, tự động phân tích.

**Tech Stack:** Express.js (PFA server), React (PFA frontend), Hermes Agent cron/webhook (local polling)

---

## Phase 0 — Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────┐
│  PFA Frontend (React + Vite)                     │
│  ┌─────────────────────────────────────────────┐ │
│  │ Match Detail View     [Kết nối Hermes] 🔘  │ │
│  │   - Match stats, odds, chart               │ │
│  │   - Khi bấm → POST /api/hermes/subscribe  │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  PFA Server (Express, port 3001)                 │
│  ┌─────────────────────────────────────────────┐ │
│  │ /api/hermes/subscribe   ← Frontend gọi      │ │
│  │ /api/hermes/match/:id   ← Hermes poll       │ │
│  │ /api/hermes/events/:id  ← Event log         │ │
│  └─────────────────────────────────────────────┘ │
│  Feature detect: odds monitor, events, goals     │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼ localhost
┌─────────────────────────────────────────────────┐
│  Hermes Agent (local machine)                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ Cron job: poll /api/hermes/match/:id        │ │
│  │   - So sánh snapshot vs previous            │ │
│  │   - Phát hiện: line change, goal, HT/FT    │ │
│  │   - Tự động phân tích + gửi kết quả        │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Task 1: PFA Server — Match Snapshot API

**Objective:** Tạo endpoint trả về toàn bộ dữ liệu match tại thời điểm hiện tại (stats, odds, score, events).

**Files:**
- Create: `server/src/routes/hermes-bridge.ts`
- Modify: `server/src/index.ts` (mount route)

**Step 1: Tạo file routes**

```typescript
// server/src/routes/hermes-bridge.ts
import { Router, Request, Response } from 'express';
import { getMatchDetails, getMatchOdds, parseStats } from '../services/b365-api.js';
import { config } from '../config.js';

export function createHermesBridgeRouter(): Router {
  const router = Router();

  // GET /api/hermes/match/:id — Full snapshot cho Hermes poll
  router.get('/match/:id', async (req: Request, res: Response) => {
    const matchId = req.params.id;
    try {
      const match = await getMatchDetails(config.b365ApiToken, matchId);
      const odds = await getMatchOdds(config.b365ApiToken, matchId);
      
      // Parse stats helper
      const stats = match?.stats ? {
        attacks: match.stats.attacks,
        dangerous_attacks: match.stats.dangerous_attacks,
        on_target: match.stats.on_target,
        off_target: match.stats.off_target,
        corners: match.stats.corners,
        xg: match.stats.xg,
      } : null;

      res.json({
        matchId,
        minute: match?.time,
        timer: match?.timer,
        score: match?.ss,
        home: match?.home?.name,
        away: match?.away?.name,
        league: match?.league?.name,
        stats,
        odds: odds?.results?.odds,
        apiRating: match?.stats?.api_rating || null,
        fetchedAt: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/hermes/subscribe — Frontend báo Hermes muốn theo dõi trận này
  router.post('/subscribe', (req: Request, res: Response) => {
    const { matchId, home, away, league } = req.body;
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    // Lưu subscription vào in-memory store (hoặc file JSON)
    subscriptions.set(matchId, {
      matchId, home, away, league,
      subscribedAt: Date.now(),
      events: [],
    });
    res.json({ ok: true, matchId });
  });

  // GET /api/hermes/events/:id — Lấy event log cho Hermes
  router.get('/events/:id', (req: Request, res: Response) => {
    const matchId = req.params.id;
    const sub = subscriptions.get(matchId);
    res.json({ events: sub?.events || [] });
  });

  return router;
}
```

**Step 2: Mount trong index.ts**

```typescript
// server/src/index.ts — thêm dòng:
import { createHermesBridgeRouter } from './routes/hermes-bridge.js';
app.use('/api/hermes', createHermesBridgeRouter());
```

**Step 3: Lưu subscription state (in-memory)**

```typescript
// server/src/routes/hermes-bridge.ts — đầu file thêm:
import { createHash } from 'node:crypto';

interface HermesSubscription {
  matchId: string;
  home?: string;
  away?: string;
  league?: string;
  subscribedAt: number;
  events: HermesEvent[];
}
interface HermesEvent {
  type: 'line_change' | 'goal' | 'half_time' | 'full_time' | 'on_target' | 'red_card' | 'corner';
  minute: number;
  half: 1 | 2;
  data: Record<string, unknown>;
  ts: number;
  id: string;
}

const subscriptions = new Map<string, HermesSubscription>();
```

---

## Task 2: PFA Server — Event Detection Engine

**Objective:** Khi một match đang được Hermes theo dõi, server tự động detect các sự kiện quan trọng và ghi vào event log.

**Files:**
- Modify: `server/src/routes/hermes-bridge.ts`

**Step 1: Thêm cơ chế snapshot comparison**

```typescript
// Lưu snapshot trước để so sánh
const previousSnapshots = new Map<string, {
  score: string;
  odds: Record<string, unknown>;
  onTarget: [number, number];
  minute: number;
}>();

function detectEvents(
  matchId: string,
  current: { score: string; minute: number; half: number; onTarget: [number, number]; odds: any },
): HermesEvent[] {
  const events: HermesEvent[] = [];
  const prev = previousSnapshots.get(matchId);

  // 1. Phát hiện bàn thắng
  if (prev && current.score !== prev.score) {
    events.push({
      type: 'goal',
      minute: current.minute,
      half: current.half,
      data: { prevScore: prev.score, newScore: current.score },
      ts: Date.now(),
      id: crypto.randomUUID(),
    });
  }

  // 2. Phát hiện hết hiệp (timer.tt === 1 → 2 hoặc 2 → 3)
  // (Cần parse timer)

  // 3. Phát hiện sút trúng đích mới
  if (prev && (
    current.onTarget[0] > prev.onTarget[0] ||
    current.onTarget[1] > prev.onTarget[1]
  )) {
    events.push({
      type: 'on_target',
      minute: current.minute,
      half: current.half,
      data: { home: current.onTarget[0], away: current.onTarget[1] },
      ts: Date.now(),
      id: crypto.randomUUID(),
    });
  }

  // 4. Phát hiện line change (so sánh odds 1_3)
  // TODO: So sánh handicap values

  previousSnapshots.set(matchId, {
    score: current.score,
    odds: current.odds,
    onTarget: current.onTarget,
    minute: current.minute,
  });

  return events;
}
```

**Step 2: Gắn detect vào endpoint snapshot**

Khi Hermes poll `/api/hermes/match/:id`, nếu match đang được subscribe, tự động chạy detectEvents và append vào event log.

---

## Task 3: PFA Frontend — Button "Kết nối Hermes"

**Objective:** Thêm nút trong Match Detail view, khi bấm gọi `/api/hermes/subscribe` và hiển thị trạng thái "Đang theo dõi".

**Files:**
- Create: `components/HermesConnectButton.tsx`
- Modify: `App.tsx` (hoặc `MatchDetail.tsx` nếu có component match detail riêng)

**Step 1: Tạo component button**

```tsx
// components/HermesConnectButton.tsx
import React, { useState } from 'react';

interface Props {
  matchId: string;
  matchName: string;
  leagueName?: string;
  serverUrl: string; // từ env VITE_AI_SERVER_URL
}

export const HermesConnectButton: React.FC<Props> = ({
  matchId, matchName, leagueName, serverUrl
}) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async () => {
    setStatus('connecting');
    setErrorMsg('');
    try {
      const res = await fetch(`${serverUrl}/api/hermes/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          home: matchName.split(' vs ')[0],
          away: matchName.split(' vs ')[1],
          league: leagueName,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('connected');
    } catch (e) {
      setStatus('error');
      setErrorMsg(String(e));
    }
  };

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 text-sm border border-green-700">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Hermes đang theo dõi
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={status === 'connecting'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm transition-colors"
    >
      {status === 'connecting' ? (
        <>⏳ Đang kết nối...</>
      ) : (
        <>
          <span>🤖</span> Kết nối Hermes Agent
        </>
      )}
    </button>
  );
};
```

**Step 2: Chèn button vào match view**

Trong component hiển thị match detail (Dashboard.tsx hoặc tương tự), thêm:

```tsx
<HermesConnectButton
  matchId={matchId}
  matchName={`${homeName} vs ${awayName}`}
  leagueName={leagueName}
  serverUrl={import.meta.env.VITE_AI_SERVER_URL}
/>
```

---

## Task 4: Hermes Cron Job — Match Watcher

**Objective:** Hermes Agent chạy cron job poll snapshot từ PFA mỗi 30-60s, phát hiện thay đổi, tự động phân tích trận đấu.

**Files:**
- Hermes: Dùng tool `cronjob` để tạo job

**Cron job logic (prompt):**

```
Bạn là Tí Nị — trợ lý phân tích bóng đá.
Theo dõi trận đấu matchId={MATCH_ID} ({HOME} vs {AWAY}).

Mỗi lần chạy:
1. Poll GET {PFA_SERVER}/api/hermes/match/{MATCH_ID}
2. So sánh với snapshot trước (lưu trong memory)
3. Nếu có thay đổi:
   - Bàn thắng: Phân tích diễn biến, ảnh hưởng đến kèo HDP và O/U
   - Line change: Phân tích hướng line movement, giá trị kèo
   - Hết hiệp: Tổng kết H1/H2, gợi ý kèo H2
   - On-target mới: Đánh giá độ nóng của trận, khả năng có bàn
4. Gửi phân tích cho user

Nếu không có thay đổi: im lặng (không gửi gì).
```

**Lịch chạy:** `every 45s` (có thể config theo ý user)

---

## Task 5: PFA Frontend — Event Visual Indicator

**Objective:** Khi Hermes đang kết nối, hiển thị indicator trực quan + lịch sử sự kiện đã gửi.

**Files:**
- Modify: `components/HermesConnectButton.tsx`

**Các trạng thái:**
- 🟢 Xanh + pulse: Đang kết nối
- 🟡 Vàng: Đã ngắt kết nối (có thể reconnect)
- 🔴 Đỏ: Lỗi
- ⏸️ Tạm dừng: User bấm ngừng theo dõi

**Thêm nút "Ngừng theo dõi":**
```tsx
// Khi connected, hiển thị thêm nút nhỏ
<button className="text-xs text-gray-400 hover:text-red-400">
  Ngừng theo dõi
</button>
```

---

## Task 6: Hermes — Tự động tạo Session riêng cho từng trận

**Objective:** Mỗi khi user bấm "Kết nối Hermes", PFA gửi request tạo session riêng trên Hermes.

**Cách hoạt động:**
1. PFA gọi POST /api/hermes/subscribe
2. PFA server ghi log subscription
3. **Hermes cron job** tự động phát hiện subscription mới khi poll
4. Hermes tạo session ảo trong câu trả lời:
   ```
   🤖 Hermes đã kết nối!
   Đang theo dõi: {HOME} vs {AWAY}
   Trạng thái: {score} - Phút {minute}'
   
   Sẵn sàng phân tích khi có biến động...
   ```

**Không cần code thêm** — cron job tự xử lý qua prompt.

---

## Task 7: Xử lý edge cases

| Tình huống | Cách xử lý |
|:-----------|:-----------|
| Trận đã kết thúc | Hermes tự ngừng poll, gửi tổng kết |
| Mất kết nối PFA server | Retry 3 lần, nếu fail báo user |
| Nhiều trận cùng lúc | Mỗi trận 1 cron job riêng biệt |
| User tắt tab PFA | Hermes vẫn poll — độc lập với PFA UI |
| Trận không có dữ liệu stats | Bỏ qua, không phân tích |

---

## Danh sách Task tổng hợp

| # | Task | File | Thời gian | Trạng thái |
|:-:|:-----|:-----|:---------:|:----------:|
| 1 | Tạo Hermes bridge route + snapshot API | `server/src/routes/hermes-bridge.ts` | ~15ph | ✅ **Done** |
| 2 | Mount route trong index.ts | `server/src/index.ts` | ~5ph | ✅ **Done** |
| 3 | Event detection engine (goal, on-target, line) | `server/src/routes/hermes-bridge.ts` | ~20ph | ✅ **Done** |
| 4 | Tạo HermesConnectButton component | `components/HermesConnectButton.tsx` | ~15ph | ✅ **Done** |
| 5 | Chèn button vào match view | `Dashboard.tsx` | ~10ph | ✅ **Done** |
| 6 | Tạo Hermes cron job (qua tool) | Hermes Agent CLI | ~5ph | ✅ **Done** |
| 7 | Test end-to-end: button → event → analysis | — | ~15ph | ⏳ Pending |
| **Tổng** | | | **~85ph** | **6/7 ✅** |

---

## Xác nhận thông tin (từ user)

| Câu hỏi | Trả lời |
|:--------|:--------|
| PFA server port | **3001** — `VITE_AI_SERVER_URL=http://localhost:3001` |
| Match detail view | **Dashboard.tsx** — chèn button ở đây |
| File B365 data | `365data.text` — format chuẩn B365 API response |
| Delivery | **Cả hai:** Hermes GUI chat + Telegram |

### B365 API Timer format (từ sample data)

```json
// Match đang H1 (in-play, phút 71)
{ "tm": 71, "ts": 2, "tt": "1", "ta": 0, "md": 1, "time_status": "1" }

// Match nghỉ giữa hiệp (HT, phút 45)
{ "tm": 45, "ts": 0, "tt": "0", "ta": 0, "md": 1, "time_status": "1" }

// Match chưa kickoff
{ "tm": 0, "ts": 28, "tt": "1", "ta": 0, "md": 0 }

// Match đang H1 (phút 32)
{ "tm": 32, "ts": 40, "tt": "1", "ta": 0, "md": 0 }
```

**Logic giải mã:**
- `tt: "1"` = match đang active (H1 hoặc H2). **Không phân biệt H1/H2 qua tt.**
- `tt: "0"` = giữa hiệp (HT) hoặc chưa bắt đầu
- Phân biệt H1/H2 bằng cách check `scores` object: có `scores.2` + thời gian > 45' → H2
- `tm` = phút, `ts` = giây, `ta` = bù giờ
- `md: 1` = có dữ liệu stats, `md: 0` = chưa có stats
- `time_status: "1"` = in-play (theo B365)

**Stats mapping** (từ sample data):
```typescript
interface B365Stats {
  attacks: [string, string];   // home, away
  dangerous_attacks: [string, string];
  on_target: [string, string];
  off_target: [string, string];
  corners: [string, string];
  goals: [string, string];
  xg?: [string, string];       // optional, không phải trận nào cũng có
  possession_rt?: [string, string];
  yellowcards?: [string, string];
  redcards?: [string, string];
  penalties?: [string, string];
}
```

---

## Task details update — dựa trên thông tin thực tế

### Task 1: Snapshot API — route `GET /api/hermes/match/:id`

Dùng `services/b365-api.ts` có sẵn (`getMatchDetails`, `getMatchOdds`). Parse B365 response theo format ở trên.

**Xác định half:**
```typescript
function getHalf(match: MatchInfo): 1 | 2 | 0 {
  const tm = match.timer?.tm ?? 0;
  const hasH2Scores = match.scores?.['2'] !== undefined;
  if (hasH2Scores && tm >= 45) return 2;  // Đã có H2 scores + phút >= 45
  if (tm > 0) return 1;                    // Đang H1
  return 0;                                 // Chưa bắt đầu
}
```

### Task 2: Event detection engine

**Phát hiện dựa trên so sánh snapshot:**

| Event | Cách detect |
|:------|:------------|
| **Goal** | `current.ss !== prev.ss` |
| **Half-time** | `prev.tt === "1" && current.tt === "0" && current.tm >= 45` |
| **Full-time** | Score không đổi + `current.time_status` chuyển từ "1" → khác |
| **On-target** | `current.stats.on_target[0] > prev.stats.on_target[0]` hoặc away |
| **Line change** | So sánh odds `1_3` handicap (O/U) và `1_2` handicap (AH) |
| **Red card** | `current.stats.redcards[0] > prev.stats.redcards[0]` |
| **Corner** | `current.stats.corners[0] > prev.stats.corners[0]` |

### Task 4: Hermes Cron Job

**Cron schedule:** `every 45s`

**Prompt cho cron job:**
```
Bạn là Tí Nị — trợ lý phân tích bóng đá. Theo dõi trận đấu matchId={MATCH_ID} ({HOME} vs {AWAY}).

Mỗi lần chạy:
1. Poll GET http://localhost:3001/api/hermes/match/{MATCH_ID}
2. So sánh với snapshot trước (lưu trong memory)
3. Nếu có thay đổi:
   - ⚽ Bàn thắng → Phân tích diễn biến, ảnh hưởng HDP & O/U
   - 📉 Line change → Hướng movement, giá trị kèo
   - 🔄 Hết hiệp → Tổng kết H1/H2, gợi ý kèo
   - 🎯 On-target mới → Đánh giá độ nóng, khả năng có bàn
   - 🔴 Thẻ đỏ → Tác động đến thế trận
4. Gửi phân tích cho user (BOTH Hermes chat + Telegram)

Nếu không có thay đổi: im lặng.
```

### Task 7: Delivery — dual channel

Khi có event, Hermes gửi phân tích qua:
1. **Hermes GUI chat** — trả lời trong session hiện tại
2. **Telegram** — dùng service có sẵn của PFA (`telegram-sender.ts` hoặc Hermes Telegram integration)

PFA server cần thêm endpoint `POST /api/hermes/notify` cho Hermes gửi kết quả về:

```typescript
// PFA server nhận notification từ Hermes
router.post('/notify', (req: Request, res: Response) => {
  const { matchId, analysis, event } = req.body;
  // Lưu vào subscription events
  // Forward lên Telegram nếu cần
  res.json({ ok: true });
});
```

---

*Plan generated by Tí Nị — Hermes Agent | 2026-07-11 (GMT+7) | Updated with B365 API format & user answers*