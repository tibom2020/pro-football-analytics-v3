# Match data v2

Nguồn sự thật cho từng trận (không tương thích định dạng History `.md` cũ).

**Tách nguồn sự thật khỏi báo cáo:** `.jsonl` / `meta.json` là dữ liệu; `report.md` xoá đi rồi sinh lại được bất cứ lúc nào.

## Cấu trúc

```
data/v2/
  YYYY-MM-DD/          ← ngày bóng lăn theo giờ UTC
    <match_id>/
      odds.jsonl       ← bản ghi odds thô (append-only, dedupe theo id)
      stats.jsonl      ← snapshot thống kê theo thời gian (timer_raw nguyên bản)
      poll_log.jsonl   ← dấu vết mỗi lần gọi API
      meta.json        ← thông tin trận + goals_from_ss + self_check (ghi atomic)
      report.md        ← báo cáo người đọc (dựng lại từ 3 file thô + meta)
```

- Tên thư mục ngày dùng **UTC** (`YYYY-MM-DD` từ `Date.toISOString()`).
- Một trận một thư mục = `match_id` thuần. Restart giữa trận ghi tiếp vào cùng thư mục.
- Mọi timestamp trong file dữ liệu là Unix giây (số) hoặc string nguyên văn từ API — không lưu giờ địa phương.
- Không gom theo phút / không `parseFloat` ở tầng lưu.

## Thu thập live (tự động từ UI)

1. Chạy server AI: `cd server && npm run dev` (cần `B365_API_TOKEN` hoặc token từ frontend).
2. Chạy frontend: `npm run dev`.
3. **Mở một trận trên Dashboard** → tự `POST /api/match-v2/start`; header hiện **Đang lưu v2**.
4. **Back / đóng tab** → tự `stop`.

Local/`npm run dev` **bật mặc định**. VPS (`NODE_ENV=production` + build frontend) **tắt mặc định**.

Ghi đè (tuỳ chọn):

- `server/.env`: `FEATURE_MATCH_V2=true|false`
- root `.env.local`: `VITE_FEATURE_MATCH_V2=true|false`

Collector poll `v2/event/odds` + snapshot inplay mỗi **60 giây** (độc lập với refresh 15s của Dashboard).

Debug tay (không bắt buộc):

```bash
curl -X POST http://localhost:3001/api/match-v2/start -H "Content-Type: application/json" -d "{\"matchId\":\"10577229\"}"
curl http://localhost:3001/api/match-v2/status/10577229
curl -X POST http://localhost:3001/api/match-v2/stop -H "Content-Type: application/json" -d "{\"matchId\":\"10577229\"}"
```

## Sinh lại report (không gọi API)

```bash
cd server
npm run report -- --match 10577229
npm run report -- --all --since 2026-08-01
```

Hoặc `POST /api/match-v2/report` với `{ "matchId": "..." }`.

## Env

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `MATCH_V2_DATA_DIR` | `data/v2` | Thư mục gốc (relative tới repo root) |
| `MATCH_V2_POLL_INTERVAL_MS` | `60000` | Chu kỳ poll |
| `FEATURE_MATCH_V2` | local bật / prod tắt | `true`\|`false` ghi đè; không set → theo `NODE_ENV` |
| `VITE_FEATURE_MATCH_V2` | DEV bật / build tắt | `true`\|`false` ghi đè; không set → theo Vite `DEV` |

## Kiểm nhanh chất lượng thu

Sau vài phút in-play, xem `meta.json` → `self_check.ticks_per_minute_mean` quanh **~2.4** (nếu ~1.0 thì vẫn đang bị gom). `truncation_detected: true` chỉ để báo — không tự giảm chu kỳ.
