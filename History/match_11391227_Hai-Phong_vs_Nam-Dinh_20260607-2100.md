# Trận đấu — Hai Phong vs Nam Dinh

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11391227` |
| Giải | Vietnam V-League |
| Tỷ số | 1-1 |
| Thời điểm / trạng thái | 90' |
| viewedAt (Unix ms) | 1780837141815 |
| timer (raw) | `{"tm":90,"ts":0,"tt":"0","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "32",
    "45"
  ],
  "corners": [
    "3",
    "6"
  ],
  "corner_f": [
    "3",
    "6"
  ],
  "corner_h": [
    "0",
    "2"
  ],
  "dangerous_attacks": [
    "27",
    "42"
  ],
  "goals": [
    "1",
    "1"
  ],
  "off_target": [
    "8",
    "5"
  ],
  "on_target": [
    "1",
    "3"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "50",
    "50"
  ],
  "redcards": [
    "0",
    "0"
  ],
  "substitutions": [
    "5",
    "5"
  ],
  "yellowcards": [
    "1",
    "2"
  ]
}
```

## Vé cược (betTickets)

_Không có vé cho trận này trong localStorage._

## Thống kê theo phút (statsHistory)

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|
| 594 | 32 / 38 | 26 / 33 | 1 / 3 | 8 / 4 | 3 / 4 | 1 / 1 | 0 / 0 |
| 595 | 32 / 39 | 26 / 34 | 1 / 3 | 8 / 4 | 3 / 5 | 1 / 1 | 0 / 0 |
| 596 | 32 / 39 | 26 / 35 | 1 / 3 | 8 / 4 | 3 / 5 | 1 / 1 | 0 / 0 |
| 597 | 32 / 40 | 26 / 36 | 1 / 3 | 8 / 4 | 3 / 5 | 1 / 1 | 0 / 0 |
| 598 | 32 / 41 | 26 / 38 | 1 / 3 | 8 / 4 | 3 / 5 | 1 / 1 | 0 / 0 |
| 599 | 32 / 42 | 26 / 38 | 1 / 3 | 8 / 5 | 3 / 5 | 1 / 1 | 0 / 0 |
| 600 | 32 / 42 | 26 / 40 | 1 / 3 | 8 / 5 | 3 / 6 | 1 / 1 | 0 / 0 |
| 601 | 32 / 42 | 26 / 41 | 1 / 3 | 8 / 5 | 3 / 6 | 1 / 1 | 0 / 0 |
| 602 | 32 / 45 | 27 / 42 | 1 / 3 | 8 / 5 | 3 / 6 | 1 / 2 | 0 / 0 |
| 603 | 32 / 43 | 26 / 41 | 1 / 3 | 8 / 5 | 3 / 6 | 1 / 1 | 0 / 0 |
| 604 | 32 / 43 | 27 / 41 | 1 / 3 | 8 / 5 | 3 / 6 | 1 / 2 | 0 / 0 |
| 605 | 32 / 45 | 27 / 42 | 1 / 3 | 8 / 5 | 3 / 6 | 1 / 2 | 0 / 0 |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 83 | 2 | corner |
| 84 | 2 | corner |
| 87 | 2 | corner |
| 88 | 2 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._

**Tổng số lần dự đoán:** 2

### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)

| Phút | Hiệp | GoalProb 30' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 83 | 2 | 71.1% | có | KHÔNG | auto | ✗ sai |
| 90 | 2 | 71.9% | có | KHÔNG | auto | ✗ sai |

**Đã chấm (30'):** 2 (2 auto · 0 tay) · **Đúng:** 0/2 (**0.0%**)

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 83 | 2 | 39.8% | không | KHÔNG | auto | ✓ đúng |
| 90 | 2 | 39.8% | không | KHÔNG | auto | ✓ đúng |

**Đã chấm (15'):** 2 (2 auto · 0 tay) · **Đúng:** 2/2 (**100.0%**)

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 83 | 2 | Khả năng có bàn trong 30' tới đang ở mức cao (~71%), bóng nguy hiểm dồn dập (+59 trong 3 phút), có 4 cú dứt điểm trúng đích gần đây. | Khả năng có bàn trong 30' tới đang ở mức cao (~71%), bóng nguy hiểm dồn dập (+59 trong 3 phút), có 4 cú dứt điểm trúng đích gần đây. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |
| 90 | 2 | Khả năng có bàn trong 30' tới đang ở mức cao (~72%). | Khả năng có bàn trong 30' tới đang ở mức cao (~72%). | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |

_Model (30'): `v2` · AUC 0.534 · 227 trận train · trained 2026-06-01T16:16:30.593558_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 89 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 3 | 1.90 | 1.90 |
| 2 | 1 | 3 | 1.98 | 1.82 |
| 3 | 1 | 3 | 2.00 | 1.80 |
| 4 | 1 | 3 | 1.95 | 1.75 |
| 5 | 1 | 3 | 2.00 | 1.80 |
| 6 | 1 | 2.75 | 1.80 | 2.00 |
| 7 | 1 | 2.75 | 1.82 | 1.98 |
| 8 | 1 | 2.75 | 1.85 | 1.95 |
| 9 | 1 | 2.75 | 1.88 | 1.93 |
| 10 | 1 | 2.75 | 1.90 | 1.90 |
| 11 | 1 | 2.75 | 1.93 | 1.88 |
| 12 | 1 | 2.75 | 1.95 | 1.85 |
| 13 | 1 | 2.75 | 1.98 | 1.82 |
| 14 | 1 | 2.75 | 1.93 | 1.77 |
| 15 | 1 | 2.5 | 1.82 | 1.98 |
| 17 | 1 | 2.5 | 1.88 | 1.93 |
| 18 | 1 | 2.5 | 1.88 | 1.93 |
| 19 | 1 | 2.5 | 1.90 | 1.90 |
| 20 | 1 | 2.5 | 1.95 | 1.85 |
| 21 | 1 | 2.5 | 1.98 | 1.82 |
| 22 | 1 | 2.5 | 2.00 | 1.80 |
| 23 | 1 | 2.25 | 1.82 | 1.98 |
| 24 | 1 | 2.25 | 1.85 | 1.95 |
| 25 | 1 | 2.25 | 1.88 | 1.93 |
| 26 | 1 | 2.25 | 1.93 | 1.88 |
| 27 | 1 | 2.25 | 1.95 | 1.85 |
| 28 | 1 | 2.25 | 1.98 | 1.82 |
| 29 | 1 | 2.25 | 2.00 | 1.80 |
| 30 | 1 | 2.25 | 1.98 | 1.73 |
| 31 | 1 | 2 | 1.77 | 2.02 |
| 32 | 1 | 2 | 1.80 | 2.00 |
| 33 | 1 | 2 | 1.82 | 1.98 |
| 34 | 1 | 2 | 1.85 | 1.95 |
| 35 | 1 | 2 | 1.90 | 1.90 |
| 36 | 1 | 2 | 1.98 | 1.82 |
| 37 | 1 | 2 | 2.02 | 1.77 |
| 38 | 1 | 3 | 1.93 | 1.88 |
| 39 | 1 | 3 | 1.98 | 1.82 |
| 40 | 1 | 2.75 | 1.73 | 1.98 |
| 41 | 1 | 2.75 | 1.80 | 2.00 |
| 42 | 1 | 2.75 | 1.85 | 1.95 |
| 43 | 1 | 2.75 | 1.90 | 1.90 |
| 44 | 1 | 2.75 | 1.93 | 1.88 |
| 45 | 1 | 2.75 | 1.98 | 1.82 |
| 46 | 1 | 3.5 | 1.82 | 1.98 |
| 45 | 2 | 3.5 | 1.80 | 2.00 |
| 46 | 2 | 3.5 | 1.82 | 1.98 |
| 47 | 2 | 3.5 | 1.85 | 1.95 |
| 48 | 2 | 3.5 | 1.93 | 1.88 |
| 49 | 2 | 3.5 | 1.95 | 1.85 |
| 50 | 2 | 3.5 | 2.00 | 1.80 |
| 52 | 2 | 3.5 | 2.05 | 1.75 |
| 53 | 2 | 3.25 | 1.75 | 2.05 |
| 54 | 2 | 3.25 | 1.82 | 1.98 |
| 55 | 2 | 3.25 | 1.85 | 1.95 |
| 56 | 2 | 3.25 | 1.93 | 1.88 |
| 57 | 2 | 3.25 | 1.98 | 1.82 |
| 58 | 2 | 3.25 | 2.02 | 1.77 |
| 59 | 2 | 3.25 | 2.08 | 1.73 |
| 60 | 2 | 3.25 | 2.08 | 1.73 |
| 61 | 2 | 3 | 1.73 | 2.08 |
| 62 | 2 | 3 | 1.75 | 2.05 |
| 63 | 2 | 3 | 1.90 | 1.90 |
| 64 | 2 | 3 | 1.93 | 1.88 |
| 65 | 2 | 3 | 2.05 | 1.75 |
| 66 | 2 | 2.75 | 1.70 | 2.10 |
| 67 | 2 | 2.75 | 1.75 | 2.05 |
| 68 | 2 | 2.75 | 1.75 | 2.05 |
| 69 | 2 | 2.75 | 1.82 | 1.98 |
| 70 | 2 | 2.75 | 1.85 | 1.95 |
| 71 | 2 | 2.75 | 1.95 | 1.85 |
| 72 | 2 | 2.75 | 2.02 | 1.77 |
| 74 | 2 | 2.5 | 1.77 | 2.02 |
| 75 | 2 | 2.5 | 1.82 | 1.98 |
| 76 | 2 | 2.5 | 1.85 | 1.95 |
| 77 | 2 | 2.5 | 1.95 | 1.85 |
| 78 | 2 | 2.5 | 2.00 | 1.80 |
| 79 | 2 | 2.5 | 2.02 | 1.77 |
| 80 | 2 | 2.5 | 2.10 | 1.70 |
| 81 | 2 | 2.5 | 2.20 | 1.65 |
| 82 | 2 | 2.5 | 2.35 | 1.57 |
| 83 | 2 | 2.5 | 2.42 | 1.52 |
| 84 | 2 | 2.5 | 2.60 | 1.48 |
| 85 | 2 | 2.5 | 2.85 | 1.40 |
| 86 | 2 | 2.5 | 3.10 | 1.35 |
| 87 | 2 | 2.5 | 3.45 | 1.30 |
| 88 | 2 | 2.5 | 3.70 | 1.26 |
| 89 | 2 | 2.5 | 4.10 | 1.23 |
| 90 | 2 | 2.5 | 6.60 | 1.11 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 3 lần; tổng biên độ giảm 0.125; bước lớn nhất 0.050
- **H1 — Xỉu:** 34 lần; tổng biên độ giảm 1.275; bước lớn nhất 0.075
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** 37 lần; tổng biên độ giảm 2.140; bước lớn nhất 0.150

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 60 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0.5 | 1.85 | 1.95 |
| 2 | 1 | 0.5 | 1.82 | 1.98 |
| 3 | 1 | 0.5 | 1.88 | 1.93 |
| 4 | 1 | 0.5 | 1.85 | 1.95 |
| 5 | 1 | 0.5 | 1.82 | 1.98 |
| 7 | 1 | 0.5 | 1.85 | 1.95 |
| 8 | 1 | 0.5 | 1.88 | 1.93 |
| 9 | 1 | 0.5 | 1.82 | 1.98 |
| 10 | 1 | 0.5 | 1.82 | 1.98 |
| 11 | 1 | 0.5 | 1.75 | 1.95 |
| 12 | 1 | 0.25 | 2.00 | 1.80 |
| 14 | 1 | 0.25 | 1.98 | 1.82 |
| 16 | 1 | 0.25 | 2.00 | 1.80 |
| 17 | 1 | 0.5 | 1.80 | 2.00 |
| 18 | 1 | 0.5 | 1.75 | 1.95 |
| 19 | 1 | 0.5 | 1.80 | 2.00 |
| 22 | 1 | 0.5 | 1.75 | 1.95 |
| 23 | 1 | 0.25 | 2.00 | 1.80 |
| 24 | 1 | 0.25 | 2.00 | 1.80 |
| 26 | 1 | 0.25 | 1.98 | 1.82 |
| 27 | 1 | 0.25 | 1.95 | 1.85 |
| 28 | 1 | 0.25 | 1.98 | 1.82 |
| 29 | 1 | 0.25 | 1.95 | 1.85 |
| 31 | 1 | 0.25 | 1.93 | 1.88 |
| 32 | 1 | 0.25 | 1.93 | 1.88 |
| 36 | 1 | 0.25 | 1.90 | 1.90 |
| 38 | 1 | 0.25 | 1.82 | 1.98 |
| 39 | 1 | 0.25 | 1.75 | 2.05 |
| 40 | 1 | 0 | 2.05 | 1.75 |
| 41 | 1 | 0.25 | 1.75 | 2.05 |
| 45 | 1 | 0.25 | 1.73 | 2.08 |
| 46 | 1 | 0 | 2.05 | 1.75 |
| 47 | 1 | 0.25 | 1.80 | 2.00 |
| 45 | 2 | 0.25 | 1.77 | 2.02 |
| 48 | 2 | 0.25 | 1.77 | 2.02 |
| 50 | 2 | 0.25 | 1.75 | 2.05 |
| 51 | 2 | 0.25 | 1.73 | 2.08 |
| 53 | 2 | 0.25 | 1.70 | 2.10 |
| 54 | 2 | 0 | 2.05 | 1.68 |
| 56 | 2 | 0.25 | 1.70 | 2.10 |
| 57 | 2 | 0.25 | 1.73 | 2.08 |
| 58 | 2 | 0.25 | 1.68 | 2.15 |
| 59 | 2 | 0.25 | 1.68 | 2.15 |
| 60 | 2 | 0.25 | 1.70 | 2.10 |
| 62 | 2 | 0.25 | 1.68 | 2.15 |
| 64 | 2 | 0.25 | 1.65 | 2.20 |
| 65 | 2 | 0.25 | 1.68 | 2.15 |
| 66 | 2 | 0.25 | 1.60 | 2.20 |
| 67 | 2 | 0.25 | 1.63 | 2.25 |
| 70 | 2 | 0.25 | 1.63 | 2.25 |
| 71 | 2 | 0.25 | 1.60 | 2.30 |
| 74 | 2 | 0 | 2.35 | 1.57 |
| 77 | 2 | 0 | 2.35 | 1.57 |
| 78 | 2 | 0 | 2.38 | 1.55 |
| 83 | 2 | 0 | 2.50 | 1.50 |
| 85 | 2 | 0 | 2.30 | 1.60 |
| 86 | 2 | 0 | 2.42 | 1.52 |
| 87 | 2 | 0 | 2.30 | 1.60 |
| 88 | 2 | 0 | 2.42 | 1.52 |
| 90 | 2 | 0 | 2.67 | 1.45 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 16 lần; tổng biên độ giảm 0.625; bước lớn nhất 0.075
- **H1 — Khách:** 8 lần; tổng biên độ giảm 0.275; bước lớn nhất 0.050
- **H2 — Chủ:** 10 lần; tổng biên độ giảm 0.600; bước lớn nhất 0.200
- **H2 — Khách:** 8 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.075

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 43 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1.25 | 1.95 | 1.85 |
| 2 | 1 | 1.25 | 2.02 | 1.77 |
| 3 | 1 | 1.25 | 2.05 | 1.75 |
| 4 | 1 | 1 | 1.68 | 2.05 |
| 5 | 1 | 1 | 1.73 | 2.08 |
| 6 | 1 | 1 | 1.77 | 2.02 |
| 7 | 1 | 1 | 1.80 | 2.00 |
| 8 | 1 | 1 | 1.82 | 1.98 |
| 9 | 1 | 1 | 1.90 | 1.90 |
| 10 | 1 | 1 | 1.95 | 1.85 |
| 11 | 1 | 1 | 2.02 | 1.77 |
| 12 | 1 | 1 | 2.05 | 1.75 |
| 13 | 1 | 1 | 2.10 | 1.70 |
| 14 | 1 | 0.75 | 1.70 | 2.10 |
| 15 | 1 | 0.75 | 1.75 | 2.05 |
| 17 | 1 | 0.75 | 1.85 | 1.95 |
| 18 | 1 | 0.75 | 1.90 | 1.90 |
| 19 | 1 | 0.75 | 1.95 | 1.85 |
| 20 | 1 | 0.75 | 1.98 | 1.82 |
| 21 | 1 | 0.75 | 2.02 | 1.77 |
| 22 | 1 | 0.75 | 2.00 | 1.70 |
| 23 | 1 | 0.5 | 1.77 | 2.02 |
| 24 | 1 | 0.5 | 1.82 | 1.98 |
| 25 | 1 | 0.5 | 1.90 | 1.90 |
| 26 | 1 | 0.5 | 1.95 | 1.85 |
| 27 | 1 | 0.5 | 2.00 | 1.80 |
| 28 | 1 | 0.5 | 2.05 | 1.75 |
| 29 | 1 | 0.5 | 2.10 | 1.70 |
| 30 | 1 | 0.5 | 2.20 | 1.65 |
| 31 | 1 | 0.5 | 2.25 | 1.63 |
| 32 | 1 | 0.5 | 2.35 | 1.57 |
| 33 | 1 | 0.5 | 2.42 | 1.52 |
| 34 | 1 | 0.5 | 2.50 | 1.50 |
| 35 | 1 | 0.5 | 2.67 | 1.45 |
| 36 | 1 | 0.5 | 2.85 | 1.40 |
| 37 | 1 | 0.5 | 3.10 | 1.35 |
| 38 | 1 | 1.5 | 3.10 | 1.35 |
| 39 | 1 | 1.5 | 3.70 | 1.26 |
| 40 | 1 | 1.5 | 3.80 | 1.25 |
| 41 | 1 | 1.5 | 4.25 | 1.21 |
| 42 | 1 | 1.5 | 5.25 | 1.16 |
| 43 | 1 | 1.5 | 5.90 | 1.13 |
| 44 | 1 | 1.5 | 6.60 | 1.11 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 1 lần; tổng biên độ giảm 0.025; bước lớn nhất 0.025
- **H1 — Xỉu:** 37 lần; tổng biên độ giảm 1.790; bước lớn nhất 0.100
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 28 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0.25 | 1.77 | 2.02 |
| 2 | 1 | 0.25 | 1.80 | 2.00 |
| 3 | 1 | 0.25 | 1.77 | 2.02 |
| 5 | 1 | 0.25 | 1.75 | 2.05 |
| 7 | 1 | 0.25 | 1.75 | 2.05 |
| 8 | 1 | 0.25 | 1.73 | 2.08 |
| 9 | 1 | 0.25 | 1.73 | 2.08 |
| 10 | 1 | 0.25 | 1.70 | 2.10 |
| 11 | 1 | 0.25 | 1.68 | 2.15 |
| 14 | 1 | 0.25 | 1.65 | 2.20 |
| 16 | 1 | 0.25 | 1.68 | 2.15 |
| 17 | 1 | 0.25 | 1.65 | 2.20 |
| 18 | 1 | 0.25 | 1.63 | 2.25 |
| 21 | 1 | 0.25 | 1.60 | 2.30 |
| 22 | 1 | 0.25 | 1.57 | 2.35 |
| 24 | 1 | 0.25 | 1.55 | 2.38 |
| 25 | 1 | 0.25 | 1.52 | 2.35 |
| 26 | 1 | 0 | 2.38 | 1.55 |
| 27 | 1 | 0 | 2.38 | 1.55 |
| 31 | 1 | 0 | 2.35 | 1.57 |
| 32 | 1 | 0 | 2.38 | 1.55 |
| 33 | 1 | 0 | 2.35 | 1.57 |
| 34 | 1 | 0 | 2.38 | 1.55 |
| 37 | 1 | 0 | 2.42 | 1.52 |
| 38 | 1 | 0 | 2.30 | 1.60 |
| 39 | 1 | 0 | 2.10 | 1.70 |
| 41 | 1 | 0 | 2.15 | 1.68 |
| 42 | 1 | 0 | 2.20 | 1.65 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 16 lần; tổng biên độ giảm 0.675; bước lớn nhất 0.200
- **H1 — Khách:** 8 lần; tổng biên độ giảm 0.225; bước lớn nhất 0.050
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 4 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 14 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 22 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 5 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 8 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 10 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 11 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 14 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 17 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 18 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 21 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 22 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 24 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 25 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 31 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 33 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 38 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 39 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 3,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426199469",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426199504",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 3,
    "over": 2,
    "under": 1.8,
    "sourceId": "426199638",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 3,
    "over": 1.95,
    "under": 1.75,
    "sourceId": "426199704",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 3,
    "over": 2,
    "under": 1.8,
    "sourceId": "426199826",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "426199888",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426199994",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426200055",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 2.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426200123",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426200246",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 2.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426200363",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426200428",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 13,
    "handicap": 2.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426200500",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 2.75,
    "over": 1.925,
    "under": 1.775,
    "sourceId": "426200550",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426200708",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426200891",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426200993",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426201078",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426201203",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 2.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426201229",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "426201309",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 23,
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426201508",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 2.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426201600",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 25,
    "handicap": 2.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426201687",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426201810",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426201946",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 28,
    "handicap": 2.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426201993",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 2.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "426202066",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 2.25,
    "over": 1.975,
    "under": 1.725,
    "sourceId": "426202215",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 2,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "426202385",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 32,
    "handicap": 2,
    "over": 1.8,
    "under": 2,
    "sourceId": "426202394",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 33,
    "handicap": 2,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426202557",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 34,
    "handicap": 2,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426202662",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426202785",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 2,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426202890",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 37,
    "handicap": 2,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "426202992",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 3,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426203074",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426203179",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 2.75,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "426203278",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "426203319",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426203386",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426203513",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 44,
    "handicap": 2.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426203564",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 2.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426203694",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 3.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426203770",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 3.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "426204202",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 3.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426204814",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 3.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426204949",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 48,
    "handicap": 3.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426205054",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 49,
    "handicap": 3.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426205120",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 50,
    "handicap": 3.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "426205192",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 52,
    "handicap": 3.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "426205448",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 53,
    "handicap": 3.25,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "426205538",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 54,
    "handicap": 3.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426205640",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 55,
    "handicap": 3.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426205682",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 56,
    "handicap": 3.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426205810",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 57,
    "handicap": 3.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426205936",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 58,
    "handicap": 3.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "426206025",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 59,
    "handicap": 3.25,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "426206123",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 60,
    "handicap": 3.25,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "426206176",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 61,
    "handicap": 3,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "426206254",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 62,
    "handicap": 3,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "426206338",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 63,
    "handicap": 3,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426206452",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 64,
    "handicap": 3,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426206594",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 65,
    "handicap": 3,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "426206668",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 66,
    "handicap": 2.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "426206824",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 67,
    "handicap": 2.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "426206970",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 68,
    "handicap": 2.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "426207059",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 69,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426207180",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 70,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426207342",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 71,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426207475",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 72,
    "handicap": 2.75,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "426207586",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 74,
    "handicap": 2.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "426207704",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 75,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426207817",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 76,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426207867",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 77,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426208027",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 78,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "426208119",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 79,
    "handicap": 2.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "426208179",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 80,
    "handicap": 2.5,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "426208312",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 81,
    "handicap": 2.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "426208397",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 82,
    "handicap": 2.5,
    "over": 2.35,
    "under": 1.575,
    "sourceId": "426208502",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 83,
    "handicap": 2.5,
    "over": 2.425,
    "under": 1.525,
    "sourceId": "426208634",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 84,
    "handicap": 2.5,
    "over": 2.6,
    "under": 1.475,
    "sourceId": "426208712",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 85,
    "handicap": 2.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "426208854",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 86,
    "handicap": 2.5,
    "over": 3.1,
    "under": 1.35,
    "sourceId": "426208911",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 87,
    "handicap": 2.5,
    "over": 3.45,
    "under": 1.3,
    "sourceId": "426209009",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 88,
    "handicap": 2.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "426209089",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 89,
    "handicap": 2.5,
    "over": 4.1,
    "under": 1.225,
    "sourceId": "426209163",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 90,
    "handicap": 2.5,
    "over": 6.6,
    "under": 1.11,
    "sourceId": "426209238",
    "half": 2
  }
]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[
  {
    "marketId": "1_2",
    "minute": 1,
    "handicap": 0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "249605871",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249605921",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": 0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "249605938",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": 0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "249606014",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249606078",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": 0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "249606207",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": 0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "249606252",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249606325",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249606384",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 11,
    "handicap": 0.5,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "249606458",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "249606497",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 14,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "249606564",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "249606674",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": 0.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "249606782",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": 0.5,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "249606850",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": 0.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "249606890",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 22,
    "handicap": 0.5,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "249607069",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 23,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "249607111",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 24,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "249607236",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "249607371",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "249607448",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "249607479",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "249607616",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 31,
    "handicap": 0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "249607702",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 32,
    "handicap": 0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "249607754",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": 0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "249608030",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 38,
    "handicap": 0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249608127",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "249608155",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 40,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "249608226",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 41,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "249608242",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "249608445",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 46,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "249608504",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 47,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "249608511",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "249608550",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 48,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "249609338",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 50,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "249609434",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 51,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "249609495",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 53,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "249609685",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 54,
    "handicap": 0,
    "home": 2.05,
    "away": 1.675,
    "sourceId": "249609755",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 56,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "249609828",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 57,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "249609886",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 58,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "249609987",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 59,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "249610047",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 60,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "249610076",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 62,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "249610162",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 64,
    "handicap": 0.25,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "249610271",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 65,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "249610342",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 66,
    "handicap": 0.25,
    "home": 1.6,
    "away": 2.2,
    "sourceId": "249610452",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 67,
    "handicap": 0.25,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "249610530",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 70,
    "handicap": 0.25,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "249610768",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 71,
    "handicap": 0.25,
    "home": 1.6,
    "away": 2.3,
    "sourceId": "249610790",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 74,
    "handicap": 0,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "249610996",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 77,
    "handicap": 0,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "249611159",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 78,
    "handicap": 0,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "249611223",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 83,
    "handicap": 0,
    "home": 2.5,
    "away": 1.5,
    "sourceId": "249611498",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 85,
    "handicap": 0,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "249611595",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 86,
    "handicap": 0,
    "home": 2.425,
    "away": 1.525,
    "sourceId": "249611676",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 87,
    "handicap": 0,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "249611713",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 88,
    "handicap": 0,
    "home": 2.425,
    "away": 1.525,
    "sourceId": "249611746",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 90,
    "handicap": 0,
    "home": 2.675,
    "away": 1.45,
    "sourceId": "249611833",
    "half": 2
  }
]
```

### Phụ lục JSON: 1_6 (OU hiệp 1)

```json
[
  {
    "marketId": "1_6",
    "minute": 1,
    "handicap": 1.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185201803",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185201865",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1.25,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185201886",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1,
    "over": 1.675,
    "under": 2.05,
    "sourceId": "185201963",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "185202022",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "185202091",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1,
    "over": 1.8,
    "under": 2,
    "sourceId": "185202146",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 1,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185202187",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 1,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185202248",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 1,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185202315",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 1,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185202412",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 1,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185202462",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 1,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "185202515",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 0.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "185202554",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 0.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185202636",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 0.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185202743",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 0.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185202815",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 0.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185202858",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 0.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185202921",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 0.75,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185202964",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 0.75,
    "over": 2,
    "under": 1.7,
    "sourceId": "185203066",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 23,
    "handicap": 0.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "185203118",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 0.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185203248",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 25,
    "handicap": 0.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185203276",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 0.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185203375",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 0.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "185203452",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 0.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185203485",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 0.5,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "185203592",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 0.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "185203640",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 0.5,
    "over": 2.25,
    "under": 1.625,
    "sourceId": "185203737",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 0.5,
    "over": 2.35,
    "under": 1.575,
    "sourceId": "185203793",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 0.5,
    "over": 2.425,
    "under": 1.525,
    "sourceId": "185203868",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 34,
    "handicap": 0.5,
    "over": 2.5,
    "under": 1.5,
    "sourceId": "185203937",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 0.5,
    "over": 2.675,
    "under": 1.45,
    "sourceId": "185203995",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 36,
    "handicap": 0.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "185204071",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 37,
    "handicap": 0.5,
    "over": 3.1,
    "under": 1.35,
    "sourceId": "185204154",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 1.5,
    "over": 3.1,
    "under": 1.35,
    "sourceId": "185204213",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 1.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "185204296",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 1.5,
    "over": 3.8,
    "under": 1.25,
    "sourceId": "185204339",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 1.5,
    "over": 4.25,
    "under": 1.21,
    "sourceId": "185204369",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 1.5,
    "over": 5.25,
    "under": 1.16,
    "sourceId": "185204405",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 43,
    "handicap": 1.5,
    "over": 5.9,
    "under": 1.13,
    "sourceId": "185204430",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 44,
    "handicap": 1.5,
    "over": 6.6,
    "under": 1.11,
    "sourceId": "185204447",
    "half": 1
  }
]
```

### Phụ lục JSON: 1_5 (AH hiệp 1)

```json
[
  {
    "marketId": "1_5",
    "minute": 1,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "103941554",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 2,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "103941565",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 3,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "103941582",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "103941683",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "103941749",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "103941775",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "103941815",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "103941848",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "103941895",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 14,
    "handicap": 0.25,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "103941970",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 16,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "103942030",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 17,
    "handicap": 0.25,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "103942076",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 0.25,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "103942118",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 21,
    "handicap": 0.25,
    "home": 1.6,
    "away": 2.3,
    "sourceId": "103942195",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 22,
    "handicap": 0.25,
    "home": 1.575,
    "away": 2.35,
    "sourceId": "103942279",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 24,
    "handicap": 0.25,
    "home": 1.55,
    "away": 2.375,
    "sourceId": "103942391",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 25,
    "handicap": 0.25,
    "home": 1.525,
    "away": 2.35,
    "sourceId": "103942413",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "103942469",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "103942497",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 31,
    "handicap": 0,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "103942658",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 32,
    "handicap": 0,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "103942683",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "103942762",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 34,
    "handicap": 0,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "103942782",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0,
    "home": 2.425,
    "away": 1.525,
    "sourceId": "103942920",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "103942948",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 39,
    "handicap": 0,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103942965",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 41,
    "handicap": 0,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103942993",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 42,
    "handicap": 0,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "103943011",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._