# Trận đấu — Manukau United vs Fencibles United

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11548827` |
| Giải | New Zealand Northern League |
| Tỷ số | 1-1 |
| Thời điểm / trạng thái | 45' |
| viewedAt (Unix ms) | 1780041673024 |
| timer (raw) | `{"tm":45,"ts":48,"tt":"0","ta":0,"md":0}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "0",
    "0"
  ],
  "corners": [
    "3",
    "4"
  ],
  "corner_h": [
    "3",
    "4"
  ],
  "dangerous_attacks": [
    "0",
    "0"
  ],
  "goals": [
    "1",
    "1"
  ],
  "off_target": [
    "0",
    "0"
  ],
  "on_target": [
    "1",
    "1"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "redcards": [
    "0",
    "0"
  ],
  "substitutions": [
    "0",
    "0"
  ],
  "yellowcards": [
    "0",
    "1"
  ]
}
```

## Vé cược (betTickets)

_Không có vé cho trận này trong localStorage._

## Thống kê theo phút (statsHistory)

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|
| 24 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 25 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 26 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 27 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 28 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 29 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 30 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 31 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 32 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 2 / 0 | 0 / 1 | 0 / 0 |
| 39 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 3 | 0 / 1 | 0 / 0 |
| 40 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 3 | 0 / 1 | 0 / 0 |
| 41 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 3 | 0 / 1 | 0 / 0 |
| 42 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 3 | 0 / 1 | 0 / 0 |
| 43 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 3 | 0 / 1 | 0 / 0 |
| 44 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 3 | 0 / 1 | 0 / 0 |
| 45 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 3 / 4 | 0 / 1 | 0 / 0 |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 45 | 1 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm._

| Phút | Hiệp | GoalProb | Đoán nhãn | Chấm | Nguồn | Đúng/Sai | Heuristic | Ollama | GPT |
|------|------|----------|-----------|------|-------|----------|-----------|--------|-----|
| 25 | 1 | 52.5% | có | KHÔNG | auto | ✗ sai | GoalProb 15' 52% · 5' tới 39% · Xỉu drop 2 lần (-0.07) · Chủ AH drop 2 lần · Top feature: pressure_alert_count_3m=0.00 | GoalProb 52.5%, 3 phút gần đây có 2 cú sút trúng đích (tỷ số hiện 0-0), kèo Tài giảm, áp lực tăng trong 15p tới. | GoalProb 52.5%, 3 phút gần đây có 2 cú sút (2 trúng đích), tỷ số 0-0, kèo chấp nghiêng về chủ nhà — áp lực tấn công gia tăng. |
| 30 | 1 | 52.5% | có | KHÔNG | auto | ✗ sai | GoalProb 15' 53% · 5' tới 43% · Xỉu drop 2 lần (-0.13) · Chủ AH drop 2 lần · Top feature: pressure_alert_count_3m=0.00 | GoalProb 52.5%, 3 phút gần đây không có cú sút (1 trúng đích), tỷ số 0-0, kèo Tài giảm nhẹ — áp lực tăng trong 15p tới. | GoalProb 52.5%, 3 phút gần đây không có cú sút nào, nhưng có 2 tình huống lịch sử tương tự đã có bàn trong 15 phút sau — khả năng ghi bàn vẫn cao. |
| 40 | 1 | 52.4% | có | — | — | — | GoalProb 15' 52% · 5' tới 43% · Xỉu drop 3 lần (-0.15) · Chủ AH drop 4 lần · Top feature: pressure_alert_count_3m=0.00 | GoalProb 52.4%, 3 phút gần đây không có cú sút (trúng đích), tỷ số hiện tại 0-0, kèo Tài giảm -0.15 — xác suất có bàn trong 15p tới cao. | GoalProb 52.4%, 3 phút gần đây không có cú sút nào, nhưng 4 phạt góc cho thấy áp lực tấn công có thể gia tăng trong 15 phút tới. |

**Tổng số lần dự đoán:** 3
**Đã chấm:** 2 (2 auto · 0 tay) · **Đúng:** 0/2 (**0.0%**)

_Model: `v1` · AUC 0.506 · 265 trận train · trained 2026-05-24T18:58:34.665725_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 41 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 4 | 1.93 | 1.88 |
| 3 | 1 | 4 | 1.98 | 1.82 |
| 4 | 1 | 3.75 | 1.80 | 2.00 |
| 5 | 1 | 3.75 | 1.82 | 1.98 |
| 6 | 1 | 3.75 | 1.88 | 1.93 |
| 7 | 1 | 4.75 | 1.90 | 1.90 |
| 8 | 1 | 4.5 | 1.82 | 1.98 |
| 10 | 1 | 4.5 | 1.85 | 1.95 |
| 11 | 1 | 4.5 | 1.90 | 1.90 |
| 12 | 1 | 4.5 | 1.93 | 1.88 |
| 13 | 1 | 5.75 | 1.93 | 1.77 |
| 14 | 1 | 5.25 | 1.82 | 1.98 |
| 15 | 1 | 5.25 | 1.85 | 1.95 |
| 16 | 1 | 5.25 | 1.88 | 1.93 |
| 17 | 1 | 5.25 | 1.88 | 1.93 |
| 18 | 1 | 5.25 | 1.93 | 1.88 |
| 19 | 1 | 5.25 | 1.95 | 1.85 |
| 20 | 1 | 5.25 | 1.98 | 1.82 |
| 21 | 1 | 5 | 1.93 | 1.88 |
| 22 | 1 | 5 | 1.98 | 1.82 |
| 23 | 1 | 4.75 | 1.80 | 2.00 |
| 24 | 1 | 4.75 | 1.82 | 1.98 |
| 25 | 1 | 4.75 | 1.88 | 1.93 |
| 26 | 1 | 4.75 | 1.93 | 1.88 |
| 27 | 1 | 4.75 | 1.90 | 1.90 |
| 28 | 1 | 4.75 | 1.98 | 1.82 |
| 29 | 1 | 4.5 | 1.85 | 1.95 |
| 30 | 1 | 4.5 | 1.85 | 1.95 |
| 31 | 1 | 4.5 | 1.90 | 1.90 |
| 33 | 1 | 4.5 | 1.95 | 1.85 |
| 34 | 1 | 4.5 | 1.98 | 1.82 |
| 35 | 1 | 4.25 | 1.82 | 1.98 |
| 36 | 1 | 4.25 | 1.85 | 1.95 |
| 37 | 1 | 4.25 | 1.90 | 1.90 |
| 38 | 1 | 4.25 | 1.88 | 1.93 |
| 39 | 1 | 4.25 | 1.95 | 1.85 |
| 40 | 1 | 4.25 | 1.95 | 1.85 |
| 41 | 1 | 4.25 | 1.98 | 1.82 |
| 42 | 1 | 4.25 | 2.00 | 1.80 |
| 43 | 1 | 4 | 1.80 | 2.00 |
| 44 | 1 | 4 | 1.85 | 1.95 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 2 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.025
- **H1 — Xỉu:** 25 lần; tổng biên độ giảm 1.000; bước lớn nhất 0.075
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 41 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 2.25 | 1.93 | 1.77 |
| 2 | 1 | 2.5 | 1.77 | 1.93 |
| 3 | 1 | 2.25 | 1.95 | 1.85 |
| 4 | 1 | 2.25 | 1.93 | 1.88 |
| 5 | 1 | 2.25 | 1.88 | 1.93 |
| 6 | 1 | 2.25 | 1.85 | 1.95 |
| 7 | 1 | 2.25 | 1.82 | 1.98 |
| 8 | 1 | 2 | 1.88 | 1.93 |
| 9 | 1 | 2 | 1.88 | 1.93 |
| 10 | 1 | 2 | 1.85 | 1.95 |
| 11 | 1 | 2 | 1.80 | 2.00 |
| 12 | 1 | 1.75 | 1.95 | 1.85 |
| 13 | 1 | 1.75 | 1.90 | 1.90 |
| 14 | 1 | 2 | 1.75 | 1.95 |
| 15 | 1 | 2 | 1.82 | 1.98 |
| 16 | 1 | 1.75 | 1.98 | 1.82 |
| 17 | 1 | 1.75 | 1.95 | 1.85 |
| 18 | 1 | 1.75 | 1.90 | 1.90 |
| 19 | 1 | 1.75 | 1.85 | 1.95 |
| 21 | 1 | 1.5 | 1.93 | 1.88 |
| 22 | 1 | 1.5 | 1.85 | 1.95 |
| 24 | 1 | 1.5 | 1.80 | 2.00 |
| 25 | 1 | 1.5 | 1.82 | 1.98 |
| 26 | 1 | 1.25 | 1.95 | 1.85 |
| 27 | 1 | 1.25 | 1.90 | 1.90 |
| 28 | 1 | 1.25 | 1.85 | 1.95 |
| 29 | 1 | 1.25 | 1.88 | 1.93 |
| 30 | 1 | 1.25 | 1.82 | 1.98 |
| 31 | 1 | 1.25 | 1.85 | 1.95 |
| 32 | 1 | 1.25 | 1.82 | 1.98 |
| 33 | 1 | 1.25 | 1.85 | 1.95 |
| 34 | 1 | 1.25 | 1.80 | 2.00 |
| 35 | 1 | 1 | 1.90 | 1.90 |
| 36 | 1 | 1 | 1.88 | 1.93 |
| 37 | 1 | 1 | 1.85 | 1.95 |
| 38 | 1 | 1 | 1.82 | 1.98 |
| 39 | 1 | 1 | 1.80 | 2.00 |
| 40 | 1 | 1 | 1.85 | 1.95 |
| 42 | 1 | 1 | 1.82 | 1.98 |
| 43 | 1 | 1 | 1.80 | 2.00 |
| 44 | 1 | 1 | 1.73 | 1.98 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 24 lần; tổng biên độ giảm 0.950; bước lớn nhất 0.075
- **H1 — Khách:** 6 lần; tổng biên độ giảm 0.175; bước lớn nhất 0.050
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 42 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1.75 | 1.95 | 1.85 |
| 2 | 1 | 1.75 | 1.95 | 1.75 |
| 3 | 1 | 1.5 | 1.82 | 1.98 |
| 4 | 1 | 1.5 | 1.82 | 1.98 |
| 5 | 1 | 1.5 | 1.85 | 1.95 |
| 6 | 1 | 1.5 | 1.90 | 1.90 |
| 7 | 1 | 2.25 | 1.73 | 1.98 |
| 8 | 1 | 2.25 | 1.80 | 2.00 |
| 9 | 1 | 2.25 | 1.82 | 1.98 |
| 10 | 1 | 2.25 | 1.82 | 1.98 |
| 11 | 1 | 2.25 | 1.90 | 1.90 |
| 12 | 1 | 2.25 | 1.95 | 1.85 |
| 13 | 1 | 3.25 | 2.00 | 1.80 |
| 14 | 1 | 3.25 | 2.00 | 1.80 |
| 15 | 1 | 3.25 | 2.05 | 1.68 |
| 16 | 1 | 3 | 1.77 | 2.02 |
| 17 | 1 | 3 | 1.82 | 1.98 |
| 18 | 1 | 3 | 1.90 | 1.90 |
| 19 | 1 | 3 | 1.98 | 1.82 |
| 20 | 1 | 3 | 2.00 | 1.80 |
| 21 | 1 | 2.75 | 1.75 | 2.05 |
| 22 | 1 | 2.75 | 1.80 | 2.00 |
| 23 | 1 | 2.75 | 1.90 | 1.90 |
| 24 | 1 | 2.75 | 1.95 | 1.85 |
| 25 | 1 | 2.75 | 2.00 | 1.80 |
| 26 | 1 | 2.5 | 1.75 | 2.05 |
| 27 | 1 | 2.5 | 1.77 | 2.02 |
| 28 | 1 | 2.5 | 1.85 | 1.95 |
| 29 | 1 | 2.5 | 1.95 | 1.85 |
| 30 | 1 | 2.5 | 2.00 | 1.80 |
| 31 | 1 | 2.5 | 2.05 | 1.75 |
| 32 | 1 | 2.5 | 2.15 | 1.68 |
| 33 | 1 | 2.5 | 2.20 | 1.65 |
| 34 | 1 | 2.5 | 2.30 | 1.60 |
| 35 | 1 | 2.5 | 2.50 | 1.50 |
| 37 | 1 | 2.5 | 2.67 | 1.45 |
| 38 | 1 | 2.5 | 2.60 | 1.48 |
| 39 | 1 | 2.5 | 2.85 | 1.40 |
| 40 | 1 | 2.5 | 3.00 | 1.38 |
| 41 | 1 | 2.5 | 3.45 | 1.30 |
| 42 | 1 | 2.5 | 3.90 | 1.24 |
| 43 | 1 | 2.5 | 3.80 | 1.25 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 2 lần; tổng biên độ giảm 0.175; bước lớn nhất 0.100
- **H1 — Xỉu:** 29 lần; tổng biên độ giảm 1.760; bước lớn nhất 0.125
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 39 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1 | 1.98 | 1.82 |
| 3 | 1 | 1 | 1.90 | 1.90 |
| 4 | 1 | 1 | 1.80 | 2.00 |
| 5 | 1 | 1 | 1.75 | 2.05 |
| 6 | 1 | 0.75 | 2.05 | 1.75 |
| 7 | 1 | 0.75 | 1.98 | 1.82 |
| 8 | 1 | 0.75 | 1.93 | 1.88 |
| 9 | 1 | 0.75 | 1.90 | 1.90 |
| 11 | 1 | 0.75 | 1.80 | 2.00 |
| 12 | 1 | 0.75 | 1.77 | 2.02 |
| 13 | 1 | 0.5 | 2.00 | 1.80 |
| 14 | 1 | 0.75 | 1.73 | 1.98 |
| 15 | 1 | 0.5 | 2.00 | 1.80 |
| 17 | 1 | 0.5 | 1.95 | 1.85 |
| 18 | 1 | 0.5 | 1.93 | 1.88 |
| 19 | 1 | 0.5 | 1.85 | 1.95 |
| 20 | 1 | 0.5 | 1.82 | 1.98 |
| 21 | 1 | 0.5 | 1.77 | 2.02 |
| 22 | 1 | 0.5 | 1.73 | 2.08 |
| 23 | 1 | 0.25 | 2.10 | 1.70 |
| 24 | 1 | 0.25 | 2.10 | 1.70 |
| 25 | 1 | 0.25 | 2.05 | 1.75 |
| 26 | 1 | 0.25 | 2.02 | 1.77 |
| 27 | 1 | 0.25 | 1.98 | 1.82 |
| 28 | 1 | 0.25 | 1.88 | 1.93 |
| 29 | 1 | 0.25 | 1.80 | 2.00 |
| 30 | 1 | 0.25 | 1.77 | 2.02 |
| 31 | 1 | 0.25 | 1.73 | 2.08 |
| 32 | 1 | 0.25 | 1.70 | 2.10 |
| 33 | 1 | 0.25 | 1.68 | 2.15 |
| 34 | 1 | 0.25 | 1.60 | 2.30 |
| 35 | 1 | 0.25 | 1.52 | 2.42 |
| 36 | 1 | 0.25 | 1.50 | 2.50 |
| 37 | 1 | 0.25 | 1.52 | 2.42 |
| 38 | 1 | 0.25 | 1.50 | 2.50 |
| 39 | 1 | 0.25 | 1.43 | 2.75 |
| 41 | 1 | 0.25 | 1.38 | 3.00 |
| 42 | 1 | 0.25 | 1.35 | 3.10 |
| 43 | 1 | 0.25 | 1.35 | 3.10 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 30 lần; tổng biên độ giảm 1.550; bước lớn nhất 0.100
- **H1 — Khách:** 1 lần; tổng biên độ giảm 0.075; bước lớn nhất 0.075
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 27 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 38 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 38 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 43 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 4 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 5 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 7 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 8 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 9 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 11 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 12 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 17 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 18 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 19 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 20 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 21 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 22 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 25 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 26 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 27 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 28 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 29 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 31 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 32 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 33 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 34 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 35 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 36 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 38 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 39 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 41 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 42 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 4,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "425082636",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 4,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "425082743",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 3.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "425082821",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 3.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "425082843",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 3.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "425082906",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 4.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "425082951",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 4.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "425082997",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 4.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "425083079",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 4.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "425083158",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 4.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "425083212",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 13,
    "handicap": 5.75,
    "over": 1.925,
    "under": 1.775,
    "sourceId": "425083274",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 5.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "425083339",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 5.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "425083367",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 5.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "425083409",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 5.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "425083504",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 5.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "425083543",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 5.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "425083580",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 5.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "425083626",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "425083677",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "425083723",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 23,
    "handicap": 4.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "425083797",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 4.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "425083859",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 25,
    "handicap": 4.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "425083921",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 4.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "425083970",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 4.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "425084012",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 28,
    "handicap": 4.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "425084063",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 4.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "425084091",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 4.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "425084139",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 4.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "425084190",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 33,
    "handicap": 4.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "425084306",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 34,
    "handicap": 4.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "425084401",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 4.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "425084481",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 4.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "425084502",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 37,
    "handicap": 4.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "425084598",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 4.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "425084655",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 4.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "425084695",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 4.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "425084718",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 4.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "425084797",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 4.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "425084843",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 4,
    "over": 1.8,
    "under": 2,
    "sourceId": "425084910",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 44,
    "handicap": 4,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "425084970",
    "half": 1
  }
]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[
  {
    "marketId": "1_2",
    "minute": 1,
    "handicap": 2.25,
    "home": 1.925,
    "away": 1.775,
    "sourceId": "248944944",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": 2.5,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "248944968",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": 2.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248945020",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": 2.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248945055",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": 2.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248945078",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": 2.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945093",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": 2.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248945135",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": 2,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248945178",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": 2,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248945202",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": 2,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945218",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 11,
    "handicap": 2,
    "home": 1.8,
    "away": 2,
    "sourceId": "248945259",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": 1.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248945273",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 13,
    "handicap": 1.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248945343",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 14,
    "handicap": 2,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "248945379",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 15,
    "handicap": 2,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248945396",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": 1.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248945415",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": 1.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248945454",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": 1.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248945474",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": 1.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945502",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 21,
    "handicap": 1.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248945544",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 22,
    "handicap": 1.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945564",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 24,
    "handicap": 1.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "248945669",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 25,
    "handicap": 1.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248945683",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": 1.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248945722",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": 1.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248945742",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": 1.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945770",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": 1.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248945795",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 30,
    "handicap": 1.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248945818",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 31,
    "handicap": 1.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945848",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 32,
    "handicap": 1.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248945875",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 33,
    "handicap": 1.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248945919",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 34,
    "handicap": 1.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "248945954",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 35,
    "handicap": 1,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248945986",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": 1,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248946029",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 37,
    "handicap": 1,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248946046",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 38,
    "handicap": 1,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248946099",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": 1,
    "home": 1.8,
    "away": 2,
    "sourceId": "248946123",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 40,
    "handicap": 1,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248946129",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 42,
    "handicap": 1,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248946219",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 43,
    "handicap": 1,
    "home": 1.8,
    "away": 2,
    "sourceId": "248946262",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 44,
    "handicap": 1,
    "home": 1.725,
    "away": 1.975,
    "sourceId": "248946331",
    "half": 1
  }
]
```

### Phụ lục JSON: 1_6 (OU hiệp 1)

```json
[
  {
    "marketId": "1_6",
    "minute": 1,
    "handicap": 1.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184696586",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1.75,
    "over": 1.95,
    "under": 1.75,
    "sourceId": "184696636",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184696669",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184696679",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184696701",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184696722",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 2.25,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "184696743",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 2.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "184696772",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184696787",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184696828",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184696865",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184696876",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 3.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "184696927",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 3.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "184696962",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 3.25,
    "over": 2.05,
    "under": 1.675,
    "sourceId": "184696974",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 3,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184696996",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 3,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184697045",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 3,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184697070",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "184697123",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 3,
    "over": 2,
    "under": 1.8,
    "sourceId": "184697135",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 2.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184697174",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "184697208",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 23,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184697244",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184697271",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 25,
    "handicap": 2.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "184697299",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 2.5,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184697313",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 2.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184697320",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184697355",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184697369",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "184697411",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 2.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "184697438",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 2.5,
    "over": 2.15,
    "under": 1.675,
    "sourceId": "184697499",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 2.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "184697550",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 34,
    "handicap": 2.5,
    "over": 2.3,
    "under": 1.6,
    "sourceId": "184697591",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 2.5,
    "over": 2.5,
    "under": 1.5,
    "sourceId": "184697622",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 37,
    "handicap": 2.5,
    "over": 2.675,
    "under": 1.45,
    "sourceId": "184697656",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 2.5,
    "over": 2.6,
    "under": 1.475,
    "sourceId": "184697681",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 2.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "184697701",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 2.5,
    "over": 3,
    "under": 1.375,
    "sourceId": "184697711",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 2.5,
    "over": 3.45,
    "under": 1.3,
    "sourceId": "184697756",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 2.5,
    "over": 3.9,
    "under": 1.24,
    "sourceId": "184697772",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 43,
    "handicap": 2.5,
    "over": 3.8,
    "under": 1.25,
    "sourceId": "184697794",
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
    "handicap": 1,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "103651309",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 3,
    "handicap": 1,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103651363",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 4,
    "handicap": 1,
    "home": 1.8,
    "away": 2,
    "sourceId": "103651376",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": 1,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "103651388",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": 0.75,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103651406",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "103651418",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "103651441",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103651453",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": 0.75,
    "home": 1.8,
    "away": 2,
    "sourceId": "103651492",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 12,
    "handicap": 0.75,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "103651509",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 13,
    "handicap": 0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "103651532",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 14,
    "handicap": 0.75,
    "home": 1.725,
    "away": 1.975,
    "sourceId": "103651543",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 15,
    "handicap": 0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "103651558",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 17,
    "handicap": 0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "103651572",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "103651579",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 19,
    "handicap": 0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "103651593",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 20,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "103651604",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 21,
    "handicap": 0.5,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "103651634",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 22,
    "handicap": 0.5,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "103651643",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 23,
    "handicap": 0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103651677",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 24,
    "handicap": 0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103651702",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 25,
    "handicap": 0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103651713",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "103651725",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "103651733",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 28,
    "handicap": 0.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "103651758",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 29,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "103651765",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 30,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "103651778",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 31,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "103651801",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 32,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "103651821",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "103651854",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 34,
    "handicap": 0.25,
    "home": 1.6,
    "away": 2.3,
    "sourceId": "103651873",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 35,
    "handicap": 0.25,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "103651893",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 36,
    "handicap": 0.25,
    "home": 1.5,
    "away": 2.5,
    "sourceId": "103651913",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0.25,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "103651924",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0.25,
    "home": 1.5,
    "away": 2.5,
    "sourceId": "103651941",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 39,
    "handicap": 0.25,
    "home": 1.425,
    "away": 2.75,
    "sourceId": "103651947",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 41,
    "handicap": 0.25,
    "home": 1.375,
    "away": 3,
    "sourceId": "103651963",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 42,
    "handicap": 0.25,
    "home": 1.35,
    "away": 3.1,
    "sourceId": "103651975",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 43,
    "handicap": 0.25,
    "home": 1.35,
    "away": 3.1,
    "sourceId": "103651985",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._