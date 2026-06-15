# Pro Football Analytics v3 (Lite)

Bản nhẹ: Trực tiếp + Đã xem + Dashboard (stats, biểu đồ 1_3/1_2/API, RAG trận tương tự).

## Chạy local

### Frontend (root)
```bash
npm install
npm run dev
# http://localhost:5173
```

### Server (server/)
```bash
cd server
npm install
npm run dev
# http://localhost:3001
```

`.env.local` (root):
```
VITE_AI_SERVER_URL=http://localhost:3001
VITE_B365_SKIP_WORKER=true
```

`server/.env`:
```
PORT=3001
CORS_ORIGIN=http://localhost:5173
B365_API_TOKEN=your_token_from_b365api.com
```

### Đăng nhập B365

| Chế độ | Khi nào dùng | Cấu hình |
|--------|--------------|----------|
| **manual** (mặc định) | Dev, nhiều user tự nhập token | User nhập token trên màn login → server gọi `POST /api/auth/b365-verify` kiểm tra |
| **server** | Production Vercel | `VITE_B365_LOGIN_MODE=server` + `B365_API_TOKEN` trên Railway — token không lộ trên client |

Token lấy tại [b365api.com](https://b365api.com/).

---

## Deploy online (Vercel + Railway)

Kiến trúc: **Vercel** host frontend tĩnh, **Railway** (hoặc Render) host server Node + RAG.

```
Browser → Vercel (React) → Railway /api/* → B365 API
```

### Bước 1 — Deploy server (Railway)

1. Tạo project mới trên [railway.app](https://railway.app), connect repo GitHub.
2. **Root Directory**: `server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. Thêm **Variables** (Environment):

| Biến | Giá trị |
|------|---------|
| `PORT` | `3001` (Railway thường inject `PORT` tự động — có thể bỏ) |
| `CORS_ORIGIN` | `https://your-app.vercel.app` (URL Vercel sau bước 2) |
| `B365_API_TOKEN` | Token từ b365api.com |
| `CORS_ORIGIN` | `https://your-app.vercel.app,http://localhost:5173` |
| `PORT` | `8080` |

**Không set** `GOAL_DATASET_PATH` / `GOAL_HISTORY_DIR` trừ khi biết rõ — build tự copy `data/` + `History/` vào `server/`.

**Root Directory:** để **trống** (repo gốc). `railway.toml` đã cấu hình build/start.

6. Deploy → copy **Public URL** (vd `https://xxx.up.railway.app`).
7. Kiểm tra: mở `https://xxx.up.railway.app/api/health` → `{ "status": "ok", "ragLoaded": true }`.

> **Dữ liệu RAG vs History:** `data/goal-dataset*.jsonl` cho tìm trận tương tự (cosine). `History/*.md` cho biểu đồ kèo đầy đủ + stats timeline + tên giải/tỷ số — **cả hai đều cần trên server production**. Thư mục `History/` (~23MB) đã commit trong repo.

### Bước 2 — Deploy frontend (Vercel)

1. Import repo trên [vercel.com](https://vercel.com).
2. **Framework**: Vite — **Root Directory**: repo root (không phải `server/`).
3. Build đã cấu sẵn trong `vercel.json`: `npm run build` → `dist/`.
4. **Environment Variables** (Production):

| Biến | Giá trị |
|------|---------|
| `VITE_AI_SERVER_URL` | URL Railway bước 1 |
| `VITE_B365_SKIP_WORKER` | `true` |
| `VITE_B365_LOGIN_MODE` | `server` |

5. Deploy → lấy URL `https://your-app.vercel.app`.
6. Quay lại Railway, cập nhật `CORS_ORIGIN` = URL Vercel, redeploy server.

### Bước 3 — Kiểm tra

1. Mở app Vercel → tự đăng nhập (chế độ server) hoặc nhập token (manual).
2. Danh sách trận live hiện ra → mở 1 trận → biểu đồ + RAG hoạt động.
3. Nếu lỗi CORS: `CORS_ORIGIN` trên server phải khớp **chính xác** URL Vercel (https, không slash cuối).

### Deploy bằng Vercel CLI (tùy chọn)

```bash
npm i -g vercel
vercel login
vercel link
vercel env add VITE_AI_SERVER_URL
vercel env add VITE_B365_SKIP_WORKER
vercel env add VITE_B365_LOGIN_MODE
vercel --prod
```

---

## API v3 lite

| Route | Mô tả |
|-------|--------|
| `GET /api/health` | Health + RAG loaded |
| `GET /api/auth/b365-status` | Server đã cấu hình B365_API_TOKEN chưa |
| `POST /api/auth/b365-verify` | Kiểm tra token B365 |
| `GET /api/b365-proxy` | Proxy B365 |
| `POST /api/ai/predict-goal/similar` | Trận tương tự (RAG) |
| `GET /api/ai/predict-goal/match-detail` | Chi tiết trận |
| `GET /api/ai/predict-goal/odds-history` | Odds lịch sử 1_3 |
| `POST /api/history/save` | Lưu file .md |
