# Bet Logging → Google Sheets

Mỗi lần người dùng **vào kèo** (chốt vé qua `TicketManager`), app sẽ tự ghi
một dòng vào Google Sheet. Khi chọn **kết quả** (Thắng / Thua / Hòa /
Thắng ½ / Thua ½), cùng dòng đó được cập nhật `ket_qua` và `lai_lo`.

Phía frontend chỉ gọi `/api/sheets/*` của AI server. Private key **không bao
giờ** xuất hiện trong bundle Vite.

---

## 1. Schema sheet

Tab mặc định: `Bets` (đổi qua `GOOGLE_SHEETS_TAB_NAME`). **Nếu file Google Sheets của bạn chỉ có tab "Sheet1" (hoặc tên khác), dữ liệu vẫn có thể được ghi vào một tab mới tên `Bets` do API tự tạo — hãy kéo thanh tab ở **cuối file** và chọn tab `Bets`.** Hoặc đặt `GOOGLE_SHEETS_TAB_NAME=Sheet1` (đúng tên tab hiện có) để ghi vào tab bạn đang mở.

Hàng 1 luôn là tiêu đề (server tự ghi nếu trống). Cột:

| # | Cột                  | Lúc tạo | Lúc cập nhật | Ghi chú |
|---|----------------------|---------|--------------|---------|
| A | `bet_id`             | UUID v4 | —            | Khoá đối chiếu khi cập nhật. |
| B | `timestamp_gmt7`     | ✅      | —            | `YYYY-MM-DD HH:mm:ss GMT+7`. |
| C | `giai_dau`           | ✅      | —            | League name. |
| D | `doi_nha`            | ✅      | —            |  |
| E | `doi_khach`          | ✅      | —            |  |
| F | `ty_so_luc_vao_keo`  | ✅      | —            | Vd `1-0`. |
| G | `keo_vao`            | ✅      | —            | Vd `Tài 2.5`, `Đội nhà -0.5 H1`. |
| H | `phut`               | ✅      | —            | Phút trận tại lúc vào kèo. |
| I | `ty_le_an`           | ✅      | —            | Decimal odds. |
| J | `so_tien_cuoc`       | ✅      | —            | Đơn vị tuỳ user. |
| K | `note`               | ✅      | —            | Tóm tắt API 2 đội + lịch sử chuông + cường độ giảm giá OU. |
| L | `ket_qua`            | ⏳      | ✅           | `won` / `lost` / `push` / `won_half` / `lost_half`. |
| M | `lai_lo`             | ⏳      | ✅           | Số dương = lãi ròng, âm = lỗ ròng. |
| N | `result_at_gmt7`     | ⏳      | ✅           | Timestamp khi update kết quả. |

Quy tắc PnL (xem `server/src/services/pnl.ts`, có unit test):

```
won        →  stake × (odds − 1)
lost       → −stake
push       →  0
won_half   →  stake × (odds − 1) / 2
lost_half  → −stake / 2
```

---

## 2. Tạo Service Account & share sheet

1. Vào https://console.cloud.google.com → tạo project (nếu chưa có).
2. **APIs & Services → Library** → tìm **Google Sheets API** → Enable.
3. **APIs & Services → Credentials → Create Credentials → Service account**.
   Đặt tên (vd `pfa-sheets-writer`), bỏ qua các quyền IAM (không cần trên
   project này).
4. Vào service account vừa tạo → tab **Keys → Add Key → JSON** → tải file
   `xxx.json`. Lưu vào ổ đĩa, **không commit lên Git**.
5. Mở Google Sheet đích → Share → dán email service account (kết thúc bằng
   `iam.gserviceaccount.com`) → quyền **Editor**.
6. Lấy `SPREADSHEET_ID` từ URL:
   `https://docs.google.com/spreadsheets/d/`**`<ID>`**`/edit`.

---

## 3. Cấu hình env

Sao chép `server/.env.example` thành `server/.env` rồi điền:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_SHEETS_TAB_NAME=Bets

# Cách A — đường dẫn tới file JSON:
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=D:/WORK/key/pfa-sheets-writer.json

# Cách B (12-factor) — đặt thẳng email + private key:
# GOOGLE_SERVICE_ACCOUNT_EMAIL=pfa-sheets-writer@xxx.iam.gserviceaccount.com
# GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> Cả `\n` literal trong PRIVATE_KEY đều được code tự convert thành newline.

Bật/tắt feature:

```env
FEATURE_SHEETS_LOGGING=true   # set false để tắt mà không xoá envs
```

---

## 4. Khởi động & kiểm tra

```powershell
# Server AI (cổng 3001)
cd server
npm install
npm run dev

# Web (cổng 5173) — terminal khác
cd ..
npm run dev
```

Smoke test endpoint:

```powershell
curl http://localhost:3001/api/sheets/health
# { "success": true, "enabled": true, "spreadsheetId": "1AbCdE…", "tab": "Bets" }
```

Nếu `enabled` vẫn là `false`, JSON có thể kèm `hint` (thiếu biến env nào). Nguyên nhân hay gặp: tiến trình server cũ chưa restart sau khi sửa `.env`, hoặc trước đây `dotenv` chỉ đọc `.env` theo thư mục làm việc — bản hiện tại luôn nạp **`server/.env`** qua `server/src/load-env.ts` (không phụ thuộc bạn chạy lệnh từ đâu).

Manual round-trip:

```powershell
$body = @{
  giaiDau='Premier League'; doiNha='MU'; doiKhach='LIV';
  tySoLucVaoKeo='1-0'; keoVao='Tài 2.5'; phut=67; tyLeAn=1.95;
  soTienCuoc=100000; note='Test'
} | ConvertTo-Json
$res = Invoke-RestMethod -Uri http://localhost:3001/api/sheets/bet -Method Post -Body $body -ContentType 'application/json'
$res.betId
Invoke-RestMethod -Uri "http://localhost:3001/api/sheets/bet/$($res.betId)/result" -Method Patch -ContentType 'application/json' -Body (@{ ketQua='won'; soTienCuoc=100000; tyLeAn=1.95 } | ConvertTo-Json)
```

Mở Google Sheet → dòng vừa tạo phải có `ket_qua=won`, `lai_lo=95000`.

---

## 5. Hành vi khi lỗi

- **Server chưa chạy / sheet chưa share**: client gọi fail-soft —
  `console.warn(...)` nhưng vé vẫn lưu localStorage bình thường, UI không
  bị block.
- **`betId` đã tồn tại trên sheet**: server trả `deduped: true` thay vì
  append trùng (idempotent — an toàn khi user retry).
- **Update result mà không tìm thấy `betId`** (vd lúc tạo bị mất mạng):
  server trả `404` kèm `pnl` để client tự log.

---

## 6. Goal Prediction logging

Mỗi lần **GoalPredictionBadge** gọi predict (tự động ~10' hoặc bấm tay), app ghi
1 dòng vào tab `GoalPredictions`. Khi có kết quả **có/không bàn trong 15p**
(auto từ sự kiện trận hoặc chấm tay), server cập nhật cùng dòng.

Tab tổng hợp `GoalPredictSummary` dùng công thức Google Sheets theo **khoảng
10 phút** (`0-9`, `10-19`, …) — sort cột `ty_le_chinh_xac_pct` để xem bucket
nào model đoán đúng nhất.

Tab **`GoalPredictByDuDoan`** tương tự nhưng tách theo **`du_doan_15`**
(`cao` = prob ≥ 50%, `thap` = prob &lt; 50%) × `khoang_10` — so sánh độ chính
xác khi model báo cao vs thấp theo từng mốc phút.

**Cửa sổ 30' (cửa sổ CHÍNH).** Cùng dòng `GoalPredictions` còn ghi thêm block
dự đoán 30' (`prob_30_pct`, `du_doan_30`, `ket_qua_30`, `chinh_xac_30`, …) —
append ở cuối (cột **U–AA**) nên không xê dịch cột 15' cũ. Kết quả `ket_qua_30`
auto-chấm theo cửa sổ **30 phút** (song song với 15'). Hai tab tổng hợp
**`GoalPredictSummary30`** và **`GoalPredictByDuDoan30`** dùng đúng cấu trúc như
bản 15' nhưng tính trên block cột 30'.

Env thêm (cùng spreadsheet, cùng service account):

```env
GOOGLE_SHEETS_GOAL_TAB_NAME=GoalPredictions
GOOGLE_SHEETS_GOAL_SUMMARY_TAB_NAME=GoalPredictSummary
GOOGLE_SHEETS_GOAL_LEVEL_TAB_NAME=GoalPredictByDuDoan
GOOGLE_SHEETS_GOAL_SUMMARY_30_TAB_NAME=GoalPredictSummary30
GOOGLE_SHEETS_GOAL_LEVEL_30_TAB_NAME=GoalPredictByDuDoan30
# Tuỳ chọn — ngưỡng "cao/thấp" cho cột du_doan_15/du_doan_30 (mặc định 0.5 = 50%)
# GOAL_PREDICT_SHEET_THRESHOLD=0.5
```

### Tab `GoalPredictions` (raw)

| Cột | Ghi chú |
|-----|---------|
| `prediction_id` | `{half}-{minute}-{ts}` — khóa PATCH verdict |
| `timestamp_gmt7` | Lúc predict |
| `match_id`, `giai_dau`, `doi_nha`, `doi_khach` | Trận |
| `hieu`, `phut` | Hiệp + phút predict |
| `khoang_10` | Bucket 10' (vd `10-19`) |
| `ty_so_luc_du_doan` | Tỷ số lúc predict |
| `prob_15_pct`, `prob_5_pct` | % ONNX |
| `du_doan_15` | `cao` / `thap` (prob ≥ 50%) |
| `ket_qua_15` | `yes` / `no` — cập nhật sau |
| `chinh_xac_15` | `dung` / `sai` |
| `verdict_auto`, `verdict_at_gmt7` | Auto vs user |
| `model_15`, `onnx_ms`, `reason_heuristic` | Meta |
| `prob_30_pct` (U) | % ONNX cửa sổ 30' (cửa sổ CHÍNH) |
| `du_doan_30` (V) | `cao` / `thap` (prob 30' ≥ 50%) |
| `ket_qua_30` (W) | `yes` / `no` — auto-chấm theo cửa sổ 30' |
| `chinh_xac_30` (X) | `dung` / `sai` |
| `verdict_auto_30` (Y), `verdict_at_gmt7_30` (Z) | Auto vs user (30') |
| `model_30` (AA) | Version model 30' |

### Tab `GoalPredictSummary`

Cột: `khoang_10`, `so_du_doan`, `so_co_ket_qua`, `so_dung`,
`ty_le_chinh_xac_pct`, `ty_le_co_ban_pct`, `prob_tb_khi_co_ban` — server seed
công thức lần đầu.

### Tab `GoalPredictByDuDoan`

Tách theo **dự báo cao/thấp** (`du_doan_15`) và **khoảng 10 phút** — 20 dòng
(10 bucket × 2 mức: `cao`, `thap`).

| Cột | Ghi chú |
|-----|---------|
| `du_doan_15` | `cao` (prob ≥ 50%) hoặc `thap` |
| `khoang_10` | `0-9`, `10-19`, … `90+` |
| `so_du_doan` … `prob_tb_khi_co_ban` | Giống `GoalPredictSummary`, lọc thêm cột M |

Sort/filter cột A để so sánh: *khi model báo cao ở phút 60-69, tỷ lệ đúng bao
nhiêu?* vs *khi báo thấp cùng bucket*.

Cột còn lại giống `GoalPredictSummary`.

### Tab `GoalPredictSummary30` / `GoalPredictByDuDoan30`

Giống hệt hai tab 15' ở trên nhưng công thức tính trên block cột 30'
(`prob_30_pct` = U, `du_doan_30` = V, `ket_qua_30` = W, `chinh_xac_30` = X).
Dùng để so sánh độ chính xác của model 30' theo từng mốc phút và mức `cao/thap`.

### API

| Method | Path |
|--------|------|
| `POST` | `/api/sheets/goal-prediction` |
| `PATCH` | `/api/sheets/goal-prediction/:predictionId/verdict` |

Ví dụ curl:

```powershell
$body = @{
  predictionId='2-45-1710000000000'; matchId='123'; giaiDau='EPL';
  doiNha='MU'; doiKhach='LIV'; hieu=2; phut=45; tySoLucDuDoan='1-0';
  prob15Pct=72; prob5Pct=28; prob30Pct=81
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/api/sheets/goal-prediction -Method Post -Body $body -ContentType 'application/json'

# Verdict 15' (mặc định)
Invoke-RestMethod -Uri 'http://localhost:3001/api/sheets/goal-prediction/2-45-1710000000000/verdict' -Method Patch -ContentType 'application/json' -Body (@{ ketQua15='yes'; verdictAuto=$true; prob15Pct=72 } | ConvertTo-Json)

# Verdict 30' — truyền window=30 (ghi block cột V–Z)
Invoke-RestMethod -Uri 'http://localhost:3001/api/sheets/goal-prediction/2-45-1710000000000/verdict' -Method Patch -ContentType 'application/json' -Body (@{ window=30; ketQua30='yes'; verdictAuto=$true; prob30Pct=81 } | ConvertTo-Json)
```

`GET /api/sheets/health` trả thêm `goalTab`, `goalSummaryTab`, `goalLevelSummaryTab`.

---

## 7. Files liên quan

| Phía     | File                                              |
|----------|---------------------------------------------------|
| Server   | `server/src/services/google-sheets.ts`            |
| Server   | `server/src/services/pnl.ts` + test               |
| Server   | `server/src/routes/sheets.ts`                     |
| Server   | `server/src/services/goal-prediction-sheets.ts`   |
| Frontend | `services/bet-sheet-log.ts`                       |
| Frontend | `services/goal-prediction-sheet-log.ts`           |
| Frontend | `components/TicketManager.tsx`, `BetHistory.tsx`  |
| Frontend | `components/GoalPredictionBadge.tsx`            |
| Frontend | `components/Dashboard.tsx` (truyền `sheetNoteContext`) |
