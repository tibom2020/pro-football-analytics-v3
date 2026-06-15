# OpenHuman ↔ PFA bridge

Sidecar Node script: poll PFA server → render markdown → ghi vào Obsidian wiki vault của OpenHuman desktop. Sau khi file vào vault, OpenHuman tự index qua wiki search + Memory Tree.

## Tại sao bridge chứ không nhúng?

OpenHuman là desktop app Tauri/Rust standalone (GPL-3.0). Không có npm SDK / REST API / iframe để nhúng vào web app PFA. Kênh tích hợp duy nhất được document chính thức là **drop markdown vào Obsidian-compatible vault** ở `~/.openhuman/wiki/`.

## Setup

```bash
cd tools/openhuman-bridge
npm install
cp .env.example .env
# Mở .env, set PFA_USER_ID (DevTools → Application → Local Storage → app_user_id)
npm run dev
```

PFA server (`cd server && npm run dev`) phải đang chạy trên `PFA_BASE_URL`.

## Output

Bridge ghi 5 file `.md` vào `<vault>/pfa/`:

- `bets-active.md` — kèo `pending`
- `bets-history.md` — kèo đã chốt (won/lost/push/won_half/lost_half)
- `follows.md` — match đang follow
- `alerts-today.md` — alert trong 24h gần nhất
- `summary.md` — P/L tổng + tỉ lệ thắng

Mặc định vault path (override bằng `OPENHUMAN_VAULT`):
- Windows: `%APPDATA%\openhuman\wiki`
- macOS: `~/Library/Application Support/openhuman/wiki`
- Linux: `~/.config/openhuman/wiki`

## Dùng trong OpenHuman

Mở OpenHuman → hỏi tự nhiên:
- *"Hôm nay tôi cược những kèo nào?"*
- *"Tóm tắt lãi/lỗ tuần này từ wiki PFA"*
- *"Trận nào tôi đang follow có alert?"*

OpenHuman tìm trong wiki vault → trả lời dựa trên các file `.md` bridge ghi.

## Gỡ rối

- Bridge ghi tmp file rồi rename atomic → OpenHuman không đọc file dở.
- Server down → bridge log warn, file cũ giữ nguyên, không crash.
- Bet ticket mới chưa xuất hiện → đảm bảo frontend BetHistory hoặc TicketManager đã save (xem mục `services/bet-storage.ts`).
