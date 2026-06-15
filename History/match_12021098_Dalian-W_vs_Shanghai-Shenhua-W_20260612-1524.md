# Trận đấu — Dalian (W) vs Shanghai Shenhua (W)

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `12021098` |
| Giải | China League One Women |
| Tỷ số | 0-0 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1781162783697 |
| timer (raw) | `{"tm":70,"ts":17,"tt":"1","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "57",
    "26"
  ],
  "ball_safe": [
    "27",
    "22"
  ],
  "corners": [
    "6",
    "3"
  ],
  "corner_h": [
    "4",
    "0"
  ],
  "dangerous_attacks": [
    "37",
    "31"
  ],
  "fouls": [
    "1",
    "3"
  ],
  "goalattempts": [
    "2",
    "5"
  ],
  "goals": [
    "0",
    "0"
  ],
  "injuries": [
    "0",
    "0"
  ],
  "offsides": [
    "0",
    "0"
  ],
  "off_target": [
    "1",
    "4"
  ],
  "on_target": [
    "2",
    "2"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "redcards": [
    "0",
    "0"
  ],
  "saves": [
    "0",
    "0"
  ],
  "shots_blocked": [
    "0",
    "0"
  ],
  "substitutions": [
    "1",
    "1"
  ],
  "yellowcards": [
    "0",
    "0"
  ],
  "yellowred_cards": [
    "0",
    "0"
  ]
}
```

## Vé cược (betTickets)

_Không có vé cho trận này trong localStorage._

## Thống kê theo phút (statsHistory)

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|
| 570 | 50 / 23 | 33 / 26 | 1 / 2 | 1 / 4 | 5 / 2 | 0 / 0 | 0 / 0 |
| 571 | 50 / 23 | 33 / 26 | 1 / 2 | 1 / 4 | 5 / 2 | 0 / 0 | 0 / 0 |
| 579 | 56 / 26 | 36 / 30 | 2 / 2 | 1 / 4 | 6 / 3 | 0 / 0 | 0 / 0 |
| 580 | 56 / 26 | 37 / 30 | 2 / 2 | 1 / 4 | 6 / 3 | 0 / 0 | 0 / 0 |
| 581 | 57 / 26 | 37 / 31 | 2 / 2 | 1 / 4 | 6 / 3 | 0 / 0 | 0 / 0 |
| 582 | 57 / 26 | 37 / 31 | 2 / 2 | 1 / 4 | 6 / 3 | 0 / 0 | 0 / 0 |

## Sự kiện trận (goal, corner)

_Không có sự kiện lưu._

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._

**Tổng số lần dự đoán:** 2

### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)

| Phút | Hiệp | GoalProb 30' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 59 | 2 | 61.9% | có | — | — | — |
| 70 | 2 | 61.9% | có | — | — | — |

_Cửa sổ 30': chưa có verdict nào — chưa tính accuracy._

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 59 | 2 | 38.9% | không | — | — | — |
| 70 | 2 | 38.9% | không | — | — | — |

_Cửa sổ 15': chưa có verdict nào — chưa tính accuracy._

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 59 | 2 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~62%), bóng nguy hiểm dồn dập (+59 trong 3 phút), có 3 cú dứt điểm trúng đích gần đây. | — | — |
| 70 | 2 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~62%). | — | — |

_Model (30'): `v2` · AUC 0.485 · 277 trận train · trained 2026-06-10T09:29:07.991085_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

_Không có phút nào ghi nhận cường độ > 0 — cần đủ chuỗi odds trong localStorage hoặc chưa có bước giảm (đỏ) tại phút đó._

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

_Không có phút nào ghi nhận cường độ > 0 — cần đủ chuỗi odds trong localStorage hoặc chưa có bước giảm (đỏ) tại phút đó._

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

_Không có phút nào ghi nhận cường độ > 0 — cần đủ chuỗi odds trong localStorage hoặc chưa có bước giảm (đỏ) tại phút đó._

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[]
```

### Phụ lục JSON: 1_6 (OU hiệp 1)

```json
[]
```

### Phụ lục JSON: 1_5 (AH hiệp 1)

```json
[]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._