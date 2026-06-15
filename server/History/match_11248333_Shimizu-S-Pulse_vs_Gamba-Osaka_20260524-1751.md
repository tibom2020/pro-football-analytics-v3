# Trận đấu — Shimizu S-Pulse vs Gamba Osaka

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11248333` |
| Giải | Japan J-League |
| Tỷ số | 1-2 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1779615679950 |
| timer (raw) | `{"tm":76,"ts":36,"tt":"1","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "action_areas": [
    "21.60",
    "24.80"
  ],
  "attacks": [
    "90",
    "95"
  ],
  "ball_safe": [
    "21",
    "23"
  ],
  "corners": [
    "4",
    "1"
  ],
  "corner_h": [
    "3",
    "0"
  ],
  "crosses": [
    "14",
    "8"
  ],
  "crossing_accuracy": [
    "0.36",
    "0.38"
  ],
  "dangerous_attacks": [
    "49",
    "42"
  ],
  "fouls": [
    "2",
    "3"
  ],
  "goalattempts": [
    "2",
    "0"
  ],
  "goals": [
    "1",
    "2"
  ],
  "injuries": [
    "1",
    "0"
  ],
  "key_passes": [
    "9",
    "8"
  ],
  "offsides": [
    "0",
    "0"
  ],
  "off_target": [
    "9",
    "7"
  ],
  "on_target": [
    "2",
    "4"
  ],
  "passing_accuracy": [
    "0.79",
    "0.81"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "44",
    "56"
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
    "2"
  ],
  "substitutions": [
    "5",
    "3"
  ],
  "xg": [
    "0.90",
    "0.70"
  ],
  "yellowcards": [
    "1",
    "1"
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
| 584 | 87 / 92 | 49 / 42 | 2 / 3 | 9 / 7 | 4 / 1 | 1 / 1 | 0 / 0 |
| 585 | 90 / 92 | 49 / 42 | 2 / 3 | 9 / 7 | 4 / 1 | 1 / 1 | 0 / 0 |
| 586 | 90 / 95 | 49 / 42 | 2 / 4 | 9 / 7 | 4 / 1 | 1 / 1 | 0 / 0 |
| 587 | 90 / 95 | 49 / 42 | 2 / 4 | 9 / 7 | 4 / 1 | 1 / 1 | 0 / 0 |
| 588 | 90 / 95 | 49 / 42 | 2 / 4 | 9 / 7 | 4 / 1 | 1 / 1 | 0 / 0 |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 74 | 2 | goal |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm._

| Phút | Hiệp | GoalProb | Đoán nhãn | Chấm | Nguồn | Đúng/Sai | Heuristic | Ollama | GPT |
|------|------|----------|-----------|------|-------|----------|-----------|--------|-----|
| 73 | 2 | 46.3% | không | CÓ | auto | ✗ sai | GoalProb 15' 46% · 5' tới 45% · DA tổng +91 (3p) · Xỉu drop 4 lần (-0.15) · Top feature: ah12_handicap=0.00 | GoalProb 15' 46% · DA tổng +91 (3p) · Xỉu drop 4 lần (-0.15) · Top feature: ah12_handicap=0.00 | OpenAI disabled (OPENAI_API_KEY chưa cấu hình) |
| 74 | 2 | 48.8% | không | — | — | — | GoalProb 15' 49% · 5' tới 44% · DA tổng +91 (3p) · Xỉu drop 5 lần (-0.15) · Top feature: ah12_handicap=0.00 | Hiệp 2 phút 74, tổng bàn thắng hiện tại là 1. Trong 3 phút gần đây có 6 cú sút trúng đích và 5 quả phạt góc, thể hiện sự tích cực tấn công của cả hai đội. Lịch sử tương tự cho thấy khả năng ghi bàn trong 15p tới khá cao. | OpenAI disabled (OPENAI_API_KEY chưa cấu hình) |

**Tổng số lần dự đoán:** 2
**Đã chấm:** 1 (1 auto · 0 tay) · **Đúng:** 0/1 (**0.0%**)

_Model: `v1` · AUC 0.506 · 255 trận train · trained 2026-05-20T13:05:54.961475_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 66 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 2 | 1.77 | 2.02 |
| 3 | 1 | 2 | 1.80 | 2.00 |
| 4 | 1 | 2 | 1.82 | 1.98 |
| 5 | 1 | 2 | 1.82 | 1.98 |
| 6 | 1 | 2 | 1.88 | 1.93 |
| 7 | 1 | 2 | 1.90 | 1.90 |
| 8 | 1 | 2 | 1.93 | 1.88 |
| 9 | 1 | 2 | 1.88 | 1.93 |
| 11 | 1 | 2 | 1.90 | 1.90 |
| 12 | 1 | 2 | 1.93 | 1.88 |
| 15 | 1 | 2 | 1.93 | 1.88 |
| 16 | 1 | 2 | 1.98 | 1.82 |
| 18 | 1 | 2 | 1.98 | 1.82 |
| 20 | 1 | 2 | 1.98 | 1.82 |
| 21 | 1 | 2 | 1.98 | 1.82 |
| 22 | 1 | 1.75 | 1.77 | 2.02 |
| 23 | 1 | 1.75 | 1.75 | 2.05 |
| 24 | 1 | 1.75 | 1.75 | 2.05 |
| 25 | 1 | 1.75 | 1.77 | 2.02 |
| 26 | 1 | 1.75 | 1.80 | 2.00 |
| 27 | 1 | 1.75 | 1.85 | 1.95 |
| 28 | 1 | 1.75 | 1.93 | 1.88 |
| 29 | 1 | 1.75 | 1.93 | 1.88 |
| 30 | 1 | 1.75 | 1.95 | 1.85 |
| 31 | 1 | 1.75 | 2.00 | 1.80 |
| 32 | 1 | 1.5 | 1.80 | 2.00 |
| 33 | 1 | 1.5 | 1.82 | 1.98 |
| 34 | 1 | 1.5 | 1.85 | 1.95 |
| 35 | 1 | 1.5 | 1.88 | 1.93 |
| 36 | 1 | 1.5 | 1.90 | 1.90 |
| 37 | 1 | 1.5 | 1.93 | 1.88 |
| 38 | 1 | 1.5 | 1.95 | 1.85 |
| 39 | 1 | 1.5 | 1.98 | 1.82 |
| 40 | 1 | 1.5 | 2.00 | 1.80 |
| 41 | 1 | 1.5 | 2.00 | 1.80 |
| 42 | 1 | 1.5 | 2.05 | 1.75 |
| 43 | 1 | 1.25 | 1.75 | 2.05 |
| 44 | 1 | 1.25 | 1.77 | 2.02 |
| 45 | 2 | 1.25 | 1.95 | 1.85 |
| 46 | 2 | 1.25 | 1.93 | 1.88 |
| 47 | 2 | 1.25 | 1.98 | 1.82 |
| 48 | 2 | 1.25 | 2.00 | 1.80 |
| 49 | 2 | 1.25 | 2.02 | 1.77 |
| 50 | 2 | 1.25 | 2.08 | 1.73 |
| 51 | 2 | 1 | 1.73 | 2.08 |
| 52 | 2 | 1 | 1.80 | 2.00 |
| 53 | 2 | 1 | 1.88 | 1.93 |
| 54 | 2 | 1 | 1.95 | 1.85 |
| 56 | 2 | 1 | 2.02 | 1.77 |
| 57 | 2 | 1 | 2.05 | 1.75 |
| 59 | 2 | 1.75 | 1.73 | 2.08 |
| 61 | 2 | 2.75 | 1.82 | 1.98 |
| 62 | 2 | 2.75 | 1.88 | 1.93 |
| 63 | 2 | 2.75 | 1.95 | 1.85 |
| 64 | 2 | 2.75 | 2.02 | 1.77 |
| 65 | 2 | 2.5 | 1.75 | 2.05 |
| 67 | 2 | 2.5 | 1.80 | 2.00 |
| 68 | 2 | 2.5 | 1.82 | 1.98 |
| 69 | 2 | 2.5 | 1.88 | 1.93 |
| 70 | 2 | 2.5 | 1.90 | 1.90 |
| 71 | 2 | 2.5 | 1.93 | 1.88 |
| 72 | 2 | 2.5 | 1.98 | 1.82 |
| 73 | 2 | 2.5 | 2.00 | 1.80 |
| 74 | 2 | 2.5 | 2.02 | 1.77 |
| 75 | 2 | 3.5 | 2.08 | 1.73 |
| 76 | 2 | 3.5 | 2.05 | 1.75 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 2 lần; tổng biên độ giảm 0.075; bước lớn nhất 0.050
- **H1 — Xỉu:** 24 lần; tổng biên độ giảm 0.775; bước lớn nhất 0.075
- **H2 — Tài:** 2 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.025
- **H2 — Xỉu:** 20 lần; tổng biên độ giảm 0.950; bước lớn nhất 0.075

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 57 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0 | 1.90 | 1.90 |
| 3 | 1 | 0 | 1.90 | 1.90 |
| 4 | 1 | 0 | 1.90 | 1.90 |
| 5 | 1 | 0 | 1.85 | 1.95 |
| 6 | 1 | 0 | 1.88 | 1.93 |
| 7 | 1 | 0 | 1.88 | 1.93 |
| 8 | 1 | 0 | 1.90 | 1.90 |
| 9 | 1 | 0 | 1.93 | 1.88 |
| 11 | 1 | 0 | 1.90 | 1.90 |
| 12 | 1 | 0 | 1.88 | 1.93 |
| 16 | 1 | 0 | 1.85 | 1.95 |
| 18 | 1 | 0 | 1.85 | 1.95 |
| 20 | 1 | 0 | 1.85 | 1.95 |
| 21 | 1 | 0 | 1.88 | 1.93 |
| 22 | 1 | 0 | 1.90 | 1.90 |
| 23 | 1 | 0 | 1.93 | 1.88 |
| 26 | 1 | 0 | 1.95 | 1.85 |
| 27 | 1 | 0 | 1.93 | 1.88 |
| 28 | 1 | 0 | 1.95 | 1.85 |
| 29 | 1 | 0 | 2.00 | 1.80 |
| 30 | 1 | 0 | 2.02 | 1.77 |
| 32 | 1 | 0 | 2.00 | 1.80 |
| 33 | 1 | 0 | 2.02 | 1.77 |
| 34 | 1 | 0 | 2.05 | 1.75 |
| 35 | 1 | 0 | 2.08 | 1.73 |
| 36 | 1 | 0 | 2.05 | 1.75 |
| 37 | 1 | 0 | 2.08 | 1.73 |
| 39 | 1 | 0 | 2.05 | 1.75 |
| 40 | 1 | 0 | 2.02 | 1.77 |
| 41 | 1 | 0 | 2.00 | 1.80 |
| 42 | 1 | 0 | 2.02 | 1.77 |
| 43 | 1 | 0 | 2.02 | 1.77 |
| 44 | 1 | 0 | 2.00 | 1.80 |
| 45 | 2 | 0 | 1.90 | 1.90 |
| 46 | 2 | 0 | 1.98 | 1.82 |
| 49 | 2 | 0 | 1.93 | 1.88 |
| 50 | 2 | 0 | 1.95 | 1.85 |
| 51 | 2 | 0 | 1.93 | 1.88 |
| 52 | 2 | 0 | 1.90 | 1.90 |
| 53 | 2 | 0 | 1.90 | 1.90 |
| 54 | 2 | 0 | 1.90 | 1.90 |
| 56 | 2 | 0 | 1.93 | 1.88 |
| 57 | 2 | 0 | 1.95 | 1.85 |
| 59 | 2 | 0 | 2.15 | 1.68 |
| 61 | 2 | 0 | 1.73 | 2.08 |
| 62 | 2 | 0 | 1.73 | 2.08 |
| 63 | 2 | 0 | 1.80 | 2.00 |
| 64 | 2 | 0 | 1.82 | 1.98 |
| 66 | 2 | 0 | 1.85 | 1.95 |
| 67 | 2 | 0 | 1.88 | 1.93 |
| 68 | 2 | 0 | 1.90 | 1.90 |
| 69 | 2 | 0 | 1.95 | 1.85 |
| 70 | 2 | 0 | 1.98 | 1.82 |
| 73 | 2 | 0 | 1.98 | 1.82 |
| 74 | 2 | 0 | 2.00 | 1.80 |
| 75 | 2 | 0 | 1.75 | 2.05 |
| 76 | 2 | 0 | 1.70 | 2.10 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 11 lần; tổng biên độ giảm 0.300; bước lớn nhất 0.050
- **H1 — Khách:** 15 lần; tổng biên độ giảm 0.400; bước lớn nhất 0.050
- **H2 — Chủ:** 6 lần; tổng biên độ giảm 0.825; bước lớn nhất 0.425
- **H2 — Khách:** 13 lần; tổng biên độ giảm 0.600; bước lớn nhất 0.175

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 39 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0.75 | 1.85 | 1.95 |
| 2 | 1 | 0.75 | 1.90 | 1.90 |
| 3 | 1 | 0.75 | 1.93 | 1.88 |
| 4 | 1 | 0.75 | 1.98 | 1.82 |
| 5 | 1 | 0.75 | 1.90 | 1.90 |
| 6 | 1 | 0.75 | 2.00 | 1.80 |
| 7 | 1 | 0.75 | 2.05 | 1.75 |
| 9 | 1 | 0.75 | 2.05 | 1.75 |
| 10 | 1 | 0.5 | 1.75 | 2.05 |
| 11 | 1 | 0.5 | 1.77 | 2.02 |
| 12 | 1 | 0.5 | 1.80 | 2.00 |
| 13 | 1 | 0.5 | 1.82 | 1.98 |
| 15 | 1 | 0.5 | 1.90 | 1.90 |
| 18 | 1 | 0.5 | 1.95 | 1.85 |
| 20 | 1 | 0.5 | 2.00 | 1.80 |
| 21 | 1 | 0.5 | 2.02 | 1.77 |
| 22 | 1 | 0.5 | 2.08 | 1.73 |
| 23 | 1 | 0.5 | 2.10 | 1.70 |
| 24 | 1 | 0.5 | 2.15 | 1.68 |
| 25 | 1 | 0.5 | 2.20 | 1.65 |
| 26 | 1 | 0.5 | 2.25 | 1.63 |
| 27 | 1 | 0.5 | 2.30 | 1.60 |
| 28 | 1 | 0.5 | 2.42 | 1.52 |
| 30 | 1 | 0.5 | 2.60 | 1.48 |
| 31 | 1 | 0.5 | 2.67 | 1.45 |
| 32 | 1 | 0.5 | 2.75 | 1.43 |
| 33 | 1 | 0.5 | 3.00 | 1.38 |
| 35 | 1 | 0.5 | 3.30 | 1.32 |
| 36 | 1 | 0.5 | 3.55 | 1.27 |
| 38 | 1 | 0.5 | 3.70 | 1.26 |
| 39 | 1 | 0.5 | 4.25 | 1.21 |
| 40 | 1 | 0.5 | 4.40 | 1.20 |
| 41 | 1 | 0.5 | 5.25 | 1.16 |
| 42 | 1 | 0.5 | 5.50 | 1.15 |
| 43 | 1 | 0.5 | 6.60 | 1.11 |
| 44 | 1 | 0.5 | 7.00 | 1.10 |
| 45 | 1 | 0.5 | 5.75 | 1.14 |
| 46 | 1 | 0.5 | 6.80 | 1.10 |
| 47 | 1 | 0.5 | 7.40 | 1.09 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 2 lần; tổng biên độ giảm 1.325; bước lớn nhất 1.250
- **H1 — Xỉu:** 34 lần; tổng biên độ giảm 1.270; bước lớn nhất 0.100
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 27 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 2 | 1 | 0 | 1.90 | 1.90 |
| 5 | 1 | 0 | 1.80 | 2.00 |
| 6 | 1 | 0 | 1.85 | 1.95 |
| 7 | 1 | 0 | 1.88 | 1.93 |
| 8 | 1 | 0 | 1.90 | 1.90 |
| 9 | 1 | 0 | 1.90 | 1.90 |
| 11 | 1 | 0 | 1.88 | 1.93 |
| 12 | 1 | 0 | 1.88 | 1.93 |
| 16 | 1 | 0 | 1.85 | 1.95 |
| 18 | 1 | 0 | 1.85 | 1.95 |
| 21 | 1 | 0 | 1.90 | 1.90 |
| 23 | 1 | 0 | 1.93 | 1.88 |
| 28 | 1 | 0 | 1.95 | 1.85 |
| 30 | 1 | 0 | 2.00 | 1.80 |
| 31 | 1 | 0 | 1.98 | 1.82 |
| 32 | 1 | 0 | 2.00 | 1.80 |
| 33 | 1 | 0 | 2.00 | 1.80 |
| 34 | 1 | 0 | 2.05 | 1.75 |
| 36 | 1 | 0 | 2.02 | 1.77 |
| 37 | 1 | 0 | 2.05 | 1.75 |
| 38 | 1 | 0 | 2.10 | 1.70 |
| 39 | 1 | 0 | 2.10 | 1.70 |
| 40 | 1 | 0 | 1.93 | 1.88 |
| 41 | 1 | 0 | 1.90 | 1.90 |
| 42 | 1 | 0 | 2.00 | 1.80 |
| 43 | 1 | 0 | 2.00 | 1.80 |
| 46 | 1 | 0 | 1.98 | 1.82 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 8 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.175
- **H1 — Khách:** 12 lần; tổng biên độ giảm 0.500; bước lớn nhất 0.100
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 9 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 23 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 46 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 76 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 5 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 45 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 5 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 11 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 16 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 31 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 36 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 40 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 41 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 46 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 2,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424575742",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 2,
    "over": 1.8,
    "under": 2,
    "sourceId": "424575826",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 2,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424575889",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 2,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424575999",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 2,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424576051",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424576146",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 2,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424576172",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 2,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424576300",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424576455",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 2,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424576548",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 2,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424576750",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 2,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424576816",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 2,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424577029",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 2,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424577163",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 2,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424577283",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 1.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424577351",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 23,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "424577401",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "424577486",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 25,
    "handicap": 1.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424577532",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 1.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "424577576",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 1.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424577657",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 28,
    "handicap": 1.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424577741",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 1.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424577840",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 1.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424577920",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 1.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "424578031",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 32,
    "handicap": 1.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "424578103",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 33,
    "handicap": 1.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424578210",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 34,
    "handicap": 1.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424578281",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 1.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424578380",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 1.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424578413",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 37,
    "handicap": 1.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424578472",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 1.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424578578",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 1.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424578670",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 1.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "424578802",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 1.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "424578859",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 1.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424578938",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 1.25,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "424579004",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 44,
    "handicap": 1.25,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424579056",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 1.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424580346",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 1.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424580414",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 1.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424580497",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 48,
    "handicap": 1.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "424580551",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 49,
    "handicap": 1.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424580583",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 50,
    "handicap": 1.25,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "424580679",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 51,
    "handicap": 1,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "424580760",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 52,
    "handicap": 1,
    "over": 1.8,
    "under": 2,
    "sourceId": "424580797",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 53,
    "handicap": 1,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424580947",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 54,
    "handicap": 1,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424581033",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 56,
    "handicap": 1,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424581178",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 57,
    "handicap": 1,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424581232",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 59,
    "handicap": 1.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "424581442",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 61,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424581564",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 62,
    "handicap": 2.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424581615",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 63,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424581698",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 64,
    "handicap": 2.75,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424581806",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 65,
    "handicap": 2.5,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "424581894",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 67,
    "handicap": 2.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "424582050",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 68,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424582107",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 69,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424582221",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 70,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424582306",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 71,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424582381",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 72,
    "handicap": 2.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424582495",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 73,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "424582532",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 74,
    "handicap": 2.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424582590",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 75,
    "handicap": 3.5,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "424582767",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 76,
    "handicap": 3.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424582830",
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
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248642468",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248642528",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248642608",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248642661",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248642678",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248642735",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248642781",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248642837",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 11,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248642918",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248643008",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248643180",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248643276",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 20,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248643397",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 21,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248643451",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 22,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248643501",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 23,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248643547",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248643673",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248643706",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248643770",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "248643832",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 30,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248643866",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 32,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "248644014",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 33,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248644072",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 34,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248644107",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 35,
    "handicap": 0,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "248644166",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248644254",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 37,
    "handicap": 0,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "248644297",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248644444",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 40,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248644503",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 41,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "248644538",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 42,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248644602",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 43,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248644678",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 44,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "248644711",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248645250",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 46,
    "handicap": 0,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248644808",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 49,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248645693",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 50,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248645770",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 51,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248645805",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 52,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248645850",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 53,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248645897",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 54,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248645946",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 56,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248645990",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 57,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248646062",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 59,
    "handicap": 0,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "248646143",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 61,
    "handicap": 0,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "248646260",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 62,
    "handicap": 0,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "248646315",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 63,
    "handicap": 0,
    "home": 1.8,
    "away": 2,
    "sourceId": "248646378",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 64,
    "handicap": 0,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248646429",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 66,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248646510",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 67,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248646615",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 68,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248646624",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 69,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248646709",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 70,
    "handicap": 0,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248646790",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 73,
    "handicap": 0,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248646949",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 74,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "248646977",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 75,
    "handicap": 0,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "248647069",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 76,
    "handicap": 0,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "248647090",
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
    "handicap": 0.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184471007",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 0.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184471029",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 0.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "184471046",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 0.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "184471107",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 0.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184471135",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 0.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "184471143",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 0.75,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "184471194",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 0.75,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "184471259",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 0.5,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184471284",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 0.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184471304",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 0.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "184471333",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 0.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184471398",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 0.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184471460",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 0.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184471573",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 0.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "184471616",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 0.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "184471633",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 0.5,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "184471661",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 23,
    "handicap": 0.5,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "184471677",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 0.5,
    "over": 2.15,
    "under": 1.675,
    "sourceId": "184471700",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 25,
    "handicap": 0.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "184471718",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 0.5,
    "over": 2.25,
    "under": 1.625,
    "sourceId": "184471730",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 0.5,
    "over": 2.3,
    "under": 1.6,
    "sourceId": "184471760",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 0.5,
    "over": 2.425,
    "under": 1.525,
    "sourceId": "184471799",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 0.5,
    "over": 2.6,
    "under": 1.475,
    "sourceId": "184471887",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 0.5,
    "over": 2.675,
    "under": 1.45,
    "sourceId": "184471914",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 0.5,
    "over": 2.75,
    "under": 1.425,
    "sourceId": "184471934",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 0.5,
    "over": 3,
    "under": 1.375,
    "sourceId": "184471952",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 0.5,
    "over": 3.3,
    "under": 1.325,
    "sourceId": "184471999",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 36,
    "handicap": 0.5,
    "over": 3.55,
    "under": 1.275,
    "sourceId": "184472023",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 0.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "184472064",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 0.5,
    "over": 4.25,
    "under": 1.21,
    "sourceId": "184472103",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 0.5,
    "over": 4.4,
    "under": 1.2,
    "sourceId": "184472130",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 0.5,
    "over": 5.25,
    "under": 1.16,
    "sourceId": "184472145",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 0.5,
    "over": 5.5,
    "under": 1.15,
    "sourceId": "184472162",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 43,
    "handicap": 0.5,
    "over": 6.6,
    "under": 1.11,
    "sourceId": "184472196",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 44,
    "handicap": 0.5,
    "over": 7,
    "under": 1.1,
    "sourceId": "184472203",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 45,
    "handicap": 0.5,
    "over": 5.75,
    "under": 1.14,
    "sourceId": "184472238",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 46,
    "handicap": 0.5,
    "over": 6.8,
    "under": 1.105,
    "sourceId": "184472267",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 47,
    "handicap": 0.5,
    "over": 7.4,
    "under": 1.095,
    "sourceId": "184472273",
    "half": 1
  }
]
```

### Phụ lục JSON: 1_5 (AH hiệp 1)

```json
[
  {
    "marketId": "1_5",
    "minute": 2,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103519081",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": 0,
    "home": 1.8,
    "away": 2,
    "sourceId": "103519153",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "103519177",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "103519187",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103519194",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103519226",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "103519262",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 12,
    "handicap": 0,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "103519273",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 16,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "103519365",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 0,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "103519412",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 21,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103519462",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 23,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "103519486",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 28,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "103519564",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 30,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "103519626",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 31,
    "handicap": 0,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "103519650",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 32,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "103519657",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "103519666",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 34,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103519681",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 36,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "103519709",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103519723",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103519733",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 39,
    "handicap": 0,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103519751",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 40,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "103519779",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 41,
    "handicap": 0,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "103519784",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 42,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "103519794",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 43,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "103519808",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 46,
    "handicap": 0,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "103519833",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._