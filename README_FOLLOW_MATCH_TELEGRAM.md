# Theo dõi trận đấu → Telegram (Nhật ký Cảnh báo)

Tài liệu ngắn cho tính năng **Theo dõi trận đấu**, đồng bộ **Nhật ký Cảnh báo** trên màn phân tích với **Telegram**.

## Biến môi trường (server)

| Biến | Mô tả |
|------|--------|
| `TELEGRAM_BOT_TOKEN` | Token bot từ [@BotFather](https://t.me/BotFather). Bắt buộc để gửi tin. |
| `PORT` | Cổng API AI (mặc định `3001`). |
| `CORS_ORIGIN` | Origin web app (vd `http://localhost:5173`). |

Frontend (Vite):

| Biến | Mô tả |
|------|--------|
| `VITE_AI_SERVER_URL` | URL server AI, ví dụ `http://localhost:3001`. |

## Định danh người dùng (`userId`)

Trình duyệt tạo và lưu `app_user_id` (UUID) trong `localStorage`. Cùng một trình duyệt dùng một `userId` cho:

- Theo dõi trận (`POST /api/odds/subscribe`)
- Liên kết Telegram (`POST /api/telegram/bind-code`)
- Chat AI (nếu dùng)

**Đăng nhập app:** cần có token B365 (hoặc demo) — nút **Theo dõi trận đấu** chỉ bật khi phiên hợp lệ (`sessionActive`).

## Liên kết Telegram (`chat_id`)

1. Gọi `POST /api/telegram/bind-code` với `{ "userId": "<cùng app_user_id>" }` (ứng dụng có thể gọi qua UI tích hợp sẵn trong panel AI nếu có).
2. Bot trả về mã; user gửi cho bot Telegram: `/bind <mã>` (hết hạn sau ~10 phút).
3. Server lưu map `userId → chat_id` trong bộ nhớ (khi restart server cần bind lại trừ khi bạn mở rộng lưu file/DB).

Chỉ **một** `chat_id` cho mỗi `userId` — tin cảnh báo chỉ tới Telegram của đúng user đã bind.

## Luồng theo dõi trận

1. Trên màn **phân tích trận**, bật **Theo dõi trận đấu** → `POST /api/odds/subscribe` với `userId`, `matchId`, `matchName`, `leagueName`.
2. Server tạo `OddsSubscription`, đăng ký trận trong `OddsMonitor`, ghi file `server/data/follow_subscriptions.json` (tạo thư mục khi cần).
3. Mỗi lần refresh dữ liệu trận, nếu đang theo dõi, client gửi `POST /api/odds/push` (snapshot kèo) để engine cảnh báo kèo phía server (nếu có kích hoạt).
4. Khi **Nhật ký Cảnh báo** có bản ghi mới (cảnh báo áp lực tự động trên Dashboard), client gọi `POST /api/follow-match/alert` với `subscriptionId` và snapshot trận (kèo + chỉ số). Server gửi Telegram nếu user đã bind bot.

## Không gửi trùng

- Mỗi bản ghi nhật ký có `id` (UUID). Server dùng khóa `nj:<subscriptionId>:<alert.id>` trong ~120 giây để không gửi hai lần cùng một sự kiện.

## Kiểm thử end-to-end (thủ công)

1. Cấu hình `TELEGRAM_BOT_TOKEN`, chạy server (`npm run dev` trong `server/`), chạy web (`npm run dev` ở root).
2. Đặt `VITE_AI_SERVER_URL` trỏ đúng server.
3. Mở app, đăng nhập token, mở một trận.
4. Lấy `userId` từ DevTools → Application → Local Storage → `app_user_id`.
5. Gọi bind-code (hoặc dùng UI), hoàn tất `/bind` trên Telegram.
6. Bật **Theo dõi trận đấu** cho trận đang mở.
7. Chờ điều kiện cảnh báo áp lực (hoặc mô phỏng bằng cách kiểm tra log) — phải nhận tin trên Telegram có dòng thời gian **GMT+7**, giải/trận, kèo, chỉ số, nội dung cảnh báo.
8. Tắt theo dõi, kích hoạt lại cảnh báo (nếu có thể) — không nhận tin cho trận đã tắt theo dõi.

## API liên quan

- `POST /api/odds/subscribe` — bật theo dõi (body gồm `leagueName` tùy chọn).
- `DELETE /api/odds/subscribe/:subId` — tắt.
- `GET /api/odds/subscriptions/:userId` — danh sách subscription.
- `POST /api/odds/push` — đẩy snapshot kèo (từ client khi đang theo dõi).
- `POST /api/follow-match/alert` — thông báo bản ghi Nhật ký Cảnh báo → Telegram.
- `POST /api/telegram/bind-code`, `GET /api/telegram/status/:userId` — liên kết bot.
