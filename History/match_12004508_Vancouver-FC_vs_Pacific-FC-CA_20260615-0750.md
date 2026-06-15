# Trận đấu — Vancouver FC vs Pacific FC (CA)

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `12004508` |
| Giải | Canada Premier League |
| Tỷ số | 2-1 |
| xG đội nhà (snapshot) | 1.45 |
| xG đội khách (snapshot) | 0.57 |
| Thời điểm / trạng thái | 90' |
| viewedAt (Unix ms) | 1781482489896 |
| timer (raw) | `{"tm":90,"ts":0,"tt":"0","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "action_areas": [
    "20.10",
    "33.40"
  ],
  "attacks": [
    "96",
    "103"
  ],
  "ball_safe": [
    "58",
    "70"
  ],
  "corners": [
    "10",
    "1"
  ],
  "corner_f": [
    "10",
    "1"
  ],
  "corner_h": [
    "3",
    "0"
  ],
  "crosses": [
    "13",
    "13"
  ],
  "crossing_accuracy": [
    "0.38",
    "0.23"
  ],
  "dangerous_attacks": [
    "48",
    "30"
  ],
  "fouls": [
    "8",
    "7"
  ],
  "goalattempts": [
    "14",
    "4"
  ],
  "goals": [
    "2",
    "1"
  ],
  "injuries": [
    "0",
    "0"
  ],
  "key_passes": [
    "19",
    "4"
  ],
  "offsides": [
    "1",
    "0"
  ],
  "off_target": [
    "14",
    "3"
  ],
  "on_target": [
    "6",
    "1"
  ],
  "passing_accuracy": [
    "0.87",
    "0.92"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "39",
    "61"
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
    "6",
    "2"
  ],
  "substitutions": [
    "5",
    "5"
  ],
  "xg": [
    "1.45",
    "0.57"
  ],
  "yellowcards": [
    "0",
    "2"
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

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A | xG nhà | xG khách |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|----------|----------|
| 602 | 96 / 103 | 48 / 30 | 6 / 1 | 14 / 3 | 10 / 1 | 0 / 2 | 0 / 0 | 1.45 | 0.57 |
| 608 | 93 / 101 | 45 / 30 | 6 / 1 | 14 / 3 | 10 / 0 | 0 / 2 | 0 / 0 | 1.49 | 0.57 |
| 609 | 94 / 103 | 46 / 30 | 6 / 1 | 14 / 3 | 10 / 0 | 0 / 2 | 0 / 0 | 1.49 | 0.57 |
| 610 | 96 / 103 | 48 / 30 | 6 / 1 | 14 / 3 | 10 / 1 | 0 / 2 | 0 / 0 | 1.49 | 0.57 |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 98 | 2 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._

**Tổng số lần dự đoán:** 1

### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)

| Phút | Hiệp | GoalProb 30' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 97 | 2 | 28.3% | không | KHÔNG | auto | ✓ đúng |

**Đã chấm (30'):** 1 (1 auto · 0 tay) · **Đúng:** 1/1 (**100.0%**)

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 97 | 2 | 40.0% | không | KHÔNG | auto | ✓ đúng |

**Đã chấm (15'):** 1 (1 auto · 0 tay) · **Đúng:** 1/1 (**100.0%**)

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 97 | 2 | Khả năng có bàn trong 30' tới đang ở mức thấp (~28%), bóng nguy hiểm dồn dập (+75 trong 3 phút), có 7 cú dứt điểm trúng đích gần đây. | Sức ép trận này đang dồn dập với nhiều tình huống nguy hiểm và phạt góc. Tuy nhiên, trong 20 tình huống tương tự, chỉ có 11/20 có bàn sau 30 phút. Nhà cái cũng chưa đẩy mạnh kèo Tài/Xỉu. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |

_Model (30'): `v3` · AUC 0.560 · 296 trận train · trained 2026-06-11T20:03:13.957737_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 88 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 3 | 1.95 | 1.85 |
| 2 | 1 | 3 | 1.98 | 1.82 |
| 3 | 1 | 2.75 | 1.75 | 1.95 |
| 4 | 1 | 2.75 | 1.82 | 1.98 |
| 5 | 1 | 2.75 | 1.90 | 1.90 |
| 6 | 1 | 2.75 | 1.95 | 1.85 |
| 7 | 1 | 2.75 | 1.98 | 1.82 |
| 8 | 1 | 2.5 | 1.85 | 1.95 |
| 10 | 1 | 2.5 | 1.90 | 1.90 |
| 11 | 1 | 2.5 | 1.93 | 1.88 |
| 14 | 1 | 2.5 | 1.95 | 1.85 |
| 15 | 1 | 2.5 | 1.95 | 1.75 |
| 16 | 1 | 2.25 | 1.82 | 1.98 |
| 17 | 1 | 2.25 | 1.90 | 1.90 |
| 18 | 1 | 2.25 | 1.90 | 1.90 |
| 19 | 1 | 2.25 | 1.93 | 1.88 |
| 20 | 1 | 3.25 | 1.75 | 1.95 |
| 26 | 1 | 2 | 1.85 | 1.95 |
| 27 | 1 | 2 | 1.82 | 1.98 |
| 29 | 1 | 2 | 1.90 | 1.90 |
| 30 | 1 | 2 | 1.88 | 1.93 |
| 31 | 1 | 2 | 1.95 | 1.85 |
| 32 | 1 | 2 | 2.02 | 1.77 |
| 33 | 1 | 2 | 2.02 | 1.77 |
| 34 | 1 | 3 | 1.88 | 1.93 |
| 35 | 1 | 3 | 1.95 | 1.85 |
| 36 | 1 | 3 | 1.98 | 1.82 |
| 37 | 1 | 3 | 2.02 | 1.77 |
| 38 | 1 | 2.75 | 1.73 | 1.98 |
| 39 | 1 | 2.75 | 1.77 | 2.02 |
| 40 | 1 | 2.75 | 1.82 | 1.98 |
| 41 | 1 | 2.75 | 1.80 | 2.00 |
| 42 | 1 | 2.75 | 1.85 | 1.95 |
| 43 | 1 | 2.75 | 1.88 | 1.93 |
| 44 | 1 | 2.75 | 1.90 | 1.90 |
| 45 | 1 | 2.75 | 1.93 | 1.88 |
| 46 | 1 | 2.75 | 1.95 | 1.85 |
| 47 | 1 | 2.75 | 2.00 | 1.80 |
| 48 | 1 | 2.5 | 1.80 | 2.00 |
| 49 | 1 | 2.5 | 1.85 | 1.95 |
| 50 | 1 | 2.5 | 1.85 | 1.95 |
| 51 | 1 | 2.5 | 1.93 | 1.88 |
| 45 | 2 | 2.5 | 1.98 | 1.82 |
| 46 | 2 | 2.5 | 2.00 | 1.80 |
| 47 | 2 | 2.5 | 2.02 | 1.77 |
| 49 | 2 | 2.5 | 2.05 | 1.75 |
| 50 | 2 | 2.25 | 1.75 | 2.05 |
| 51 | 2 | 2.25 | 1.88 | 1.93 |
| 53 | 2 | 2.25 | 1.93 | 1.88 |
| 54 | 2 | 2.25 | 1.98 | 1.82 |
| 56 | 2 | 2.25 | 2.05 | 1.75 |
| 57 | 2 | 2.25 | 2.08 | 1.73 |
| 58 | 2 | 2 | 1.70 | 2.10 |
| 59 | 2 | 3 | 1.77 | 2.02 |
| 60 | 2 | 3 | 1.95 | 1.85 |
| 61 | 2 | 3 | 1.98 | 1.82 |
| 62 | 2 | 3 | 2.00 | 1.80 |
| 63 | 2 | 3 | 2.05 | 1.75 |
| 64 | 2 | 3 | 2.10 | 1.70 |
| 65 | 2 | 2.75 | 1.70 | 2.10 |
| 66 | 2 | 2.75 | 1.70 | 2.10 |
| 67 | 2 | 2.75 | 1.75 | 2.05 |
| 68 | 2 | 2.75 | 1.85 | 1.95 |
| 69 | 2 | 2.75 | 1.88 | 1.93 |
| 70 | 2 | 2.75 | 1.95 | 1.85 |
| 71 | 2 | 2.75 | 2.02 | 1.77 |
| 72 | 2 | 2.5 | 1.75 | 2.05 |
| 74 | 2 | 2.5 | 1.82 | 1.98 |
| 75 | 2 | 2.5 | 1.85 | 1.95 |
| 76 | 2 | 3.5 | 2.02 | 1.77 |
| 77 | 2 | 3.5 | 1.85 | 1.95 |
| 78 | 2 | 3.5 | 2.02 | 1.77 |
| 79 | 2 | 3.5 | 2.10 | 1.70 |
| 80 | 2 | 3.5 | 2.20 | 1.65 |
| 81 | 2 | 3.5 | 2.30 | 1.60 |
| 82 | 2 | 3.5 | 2.38 | 1.55 |
| 83 | 2 | 3.5 | 2.50 | 1.50 |
| 84 | 2 | 3.5 | 2.60 | 1.48 |
| 85 | 2 | 3.5 | 2.85 | 1.40 |
| 86 | 2 | 3.5 | 3.30 | 1.32 |
| 88 | 2 | 3.5 | 3.90 | 1.24 |
| 89 | 2 | 3.5 | 4.25 | 1.21 |
| 90 | 2 | 3.5 | 3.80 | 1.25 |
| 91 | 2 | 3.5 | 4.25 | 1.21 |
| 92 | 2 | 3.5 | 4.80 | 1.18 |
| 93 | 2 | 3.5 | 5.50 | 1.15 |
| 94 | 2 | 3.5 | 6.25 | 1.12 |
| 95 | 2 | 3.5 | 8.75 | 1.07 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 3 lần; tổng biên độ giảm 0.075; bước lớn nhất 0.025
- **H1 — Xỉu:** 25 lần; tổng biên độ giảm 1.225; bước lớn nhất 0.100
- **H2 — Tài:** 2 lần; tổng biên độ giảm 0.625; bước lớn nhất 0.450
- **H2 — Xỉu:** 36 lần; tổng biên độ giảm 2.065; bước lớn nhất 0.175

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 61 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.5 | 1.98 | 1.82 |
| 2 | 1 | -0.5 | 2.00 | 1.80 |
| 4 | 1 | -0.25 | 1.80 | 2.00 |
| 5 | 1 | -0.25 | 1.80 | 2.00 |
| 7 | 1 | -0.25 | 1.82 | 1.98 |
| 10 | 1 | -0.25 | 1.85 | 1.95 |
| 12 | 1 | -0.25 | 1.88 | 1.93 |
| 13 | 1 | -0.25 | 1.93 | 1.88 |
| 16 | 1 | -0.25 | 1.95 | 1.85 |
| 18 | 1 | -0.25 | 1.93 | 1.88 |
| 19 | 1 | -0.25 | 1.98 | 1.82 |
| 20 | 1 | 0 | 1.82 | 1.98 |
| 26 | 1 | -0.25 | 2.02 | 1.77 |
| 27 | 1 | -0.25 | 1.90 | 1.90 |
| 28 | 1 | -0.25 | 1.98 | 1.82 |
| 30 | 1 | -0.25 | 1.95 | 1.85 |
| 33 | 1 | -0.25 | 1.98 | 1.82 |
| 34 | 1 | -0.25 | 2.00 | 1.80 |
| 35 | 1 | -0.25 | 2.00 | 1.80 |
| 36 | 1 | -0.25 | 2.02 | 1.77 |
| 37 | 1 | -0.25 | 1.93 | 1.88 |
| 38 | 1 | -0.25 | 1.90 | 1.90 |
| 39 | 1 | -0.25 | 1.90 | 1.90 |
| 41 | 1 | -0.25 | 1.85 | 1.95 |
| 42 | 1 | -0.25 | 1.82 | 1.98 |
| 43 | 1 | -0.25 | 1.82 | 1.98 |
| 46 | 1 | -0.25 | 1.80 | 2.00 |
| 47 | 1 | -0.25 | 1.77 | 2.02 |
| 50 | 1 | -0.25 | 1.80 | 2.00 |
| 51 | 1 | -0.25 | 1.82 | 1.98 |
| 45 | 2 | -0.25 | 1.80 | 2.00 |
| 49 | 2 | -0.25 | 1.77 | 2.02 |
| 50 | 2 | -0.25 | 1.80 | 2.00 |
| 51 | 2 | -0.25 | 1.80 | 2.00 |
| 54 | 2 | -0.25 | 1.80 | 2.00 |
| 57 | 2 | -0.25 | 1.77 | 2.02 |
| 58 | 2 | -0.25 | 1.80 | 2.00 |
| 59 | 2 | -0.25 | 1.90 | 1.90 |
| 60 | 2 | -0.25 | 1.98 | 1.82 |
| 61 | 2 | -0.25 | 2.00 | 1.80 |
| 62 | 2 | -0.25 | 2.00 | 1.80 |
| 63 | 2 | -0.25 | 2.02 | 1.77 |
| 64 | 2 | -0.25 | 2.02 | 1.77 |
| 66 | 2 | -0.25 | 2.02 | 1.77 |
| 68 | 2 | -0.25 | 2.05 | 1.75 |
| 69 | 2 | -0.25 | 2.02 | 1.77 |
| 70 | 2 | -0.25 | 2.05 | 1.75 |
| 71 | 2 | -0.25 | 2.08 | 1.73 |
| 72 | 2 | -0.25 | 2.10 | 1.70 |
| 73 | 2 | -0.25 | 2.10 | 1.70 |
| 74 | 2 | -0.25 | 2.15 | 1.68 |
| 75 | 2 | -0.25 | 2.20 | 1.65 |
| 76 | 2 | -0.25 | 2.20 | 1.65 |
| 77 | 2 | -0.25 | 2.35 | 1.57 |
| 78 | 2 | 0 | 1.50 | 2.40 |
| 79 | 2 | 0 | 1.52 | 2.42 |
| 80 | 2 | 0 | 1.55 | 2.38 |
| 83 | 2 | 0 | 1.52 | 2.42 |
| 88 | 2 | 0 | 1.52 | 2.42 |
| 94 | 2 | 0 | 1.40 | 2.85 |
| 95 | 2 | 0 | 1.52 | 2.42 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 9 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.125
- **H1 — Khách:** 13 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.075
- **H2 — Chủ:** 5 lần; tổng biên độ giảm 0.225; bước lớn nhất 0.125
- **H2 — Khách:** 15 lần; tổng biên độ giảm 0.975; bước lớn nhất 0.425

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 42 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1.25 | 1.95 | 1.85 |
| 2 | 1 | 1.25 | 1.98 | 1.82 |
| 3 | 1 | 1.25 | 2.05 | 1.75 |
| 4 | 1 | 1 | 1.75 | 2.05 |
| 5 | 1 | 1 | 1.77 | 2.02 |
| 6 | 1 | 1 | 1.85 | 1.95 |
| 7 | 1 | 1 | 1.90 | 1.90 |
| 8 | 1 | 1 | 1.98 | 1.82 |
| 9 | 1 | 1 | 2.02 | 1.77 |
| 10 | 1 | 1 | 2.05 | 1.75 |
| 11 | 1 | 0.75 | 1.73 | 2.08 |
| 13 | 1 | 0.75 | 1.77 | 2.02 |
| 14 | 1 | 0.75 | 1.80 | 2.00 |
| 15 | 1 | 0.75 | 1.85 | 1.95 |
| 16 | 1 | 0.75 | 1.90 | 1.90 |
| 17 | 1 | 0.75 | 1.95 | 1.85 |
| 18 | 1 | 0.75 | 1.98 | 1.82 |
| 19 | 1 | 0.5 | 1.75 | 2.05 |
| 20 | 1 | 1.75 | 2.00 | 1.80 |
| 26 | 1 | 0.5 | 2.02 | 1.77 |
| 27 | 1 | 0.5 | 2.08 | 1.73 |
| 28 | 1 | 0.5 | 2.15 | 1.68 |
| 29 | 1 | 0.5 | 2.25 | 1.63 |
| 30 | 1 | 0.5 | 2.30 | 1.60 |
| 31 | 1 | 0.5 | 2.35 | 1.57 |
| 32 | 1 | 0.5 | 2.38 | 1.55 |
| 33 | 1 | 0.5 | 2.42 | 1.52 |
| 34 | 1 | 1.5 | 2.20 | 1.65 |
| 35 | 1 | 1.5 | 2.35 | 1.57 |
| 36 | 1 | 1.5 | 2.42 | 1.52 |
| 37 | 1 | 1.5 | 2.85 | 1.40 |
| 38 | 1 | 1.5 | 3.00 | 1.38 |
| 39 | 1 | 1.5 | 3.30 | 1.32 |
| 40 | 1 | 1.5 | 3.70 | 1.26 |
| 41 | 1 | 1.5 | 3.90 | 1.24 |
| 42 | 1 | 1.5 | 4.50 | 1.19 |
| 43 | 1 | 1.5 | 5.50 | 1.15 |
| 44 | 1 | 1.5 | 6.25 | 1.12 |
| 45 | 1 | 1.5 | 4.25 | 1.21 |
| 46 | 1 | 1.5 | 4.50 | 1.19 |
| 47 | 1 | 1.5 | 5.75 | 1.14 |
| 48 | 1 | 1.5 | 6.25 | 1.12 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 1 lần; tổng biên độ giảm 2.000; bước lớn nhất 2.000
- **H1 — Xỉu:** 34 lần; tổng biên độ giảm 1.520; bước lớn nhất 0.125
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 25 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.25 | 2.08 | 1.73 |
| 4 | 1 | -0.25 | 2.10 | 1.70 |
| 5 | 1 | -0.25 | 2.10 | 1.70 |
| 6 | 1 | -0.25 | 2.15 | 1.68 |
| 7 | 1 | -0.25 | 2.20 | 1.65 |
| 8 | 1 | 0 | 1.65 | 2.20 |
| 11 | 1 | 0 | 1.63 | 2.25 |
| 12 | 1 | 0 | 1.65 | 2.20 |
| 13 | 1 | 0 | 1.68 | 2.15 |
| 18 | 1 | 0 | 1.70 | 2.10 |
| 20 | 1 | 0 | 1.82 | 1.98 |
| 26 | 1 | 0 | 1.77 | 2.02 |
| 27 | 1 | 0 | 1.70 | 2.10 |
| 28 | 1 | 0 | 1.73 | 2.08 |
| 30 | 1 | 0 | 1.70 | 2.10 |
| 33 | 1 | 0 | 1.73 | 2.08 |
| 34 | 1 | 0 | 1.70 | 2.10 |
| 35 | 1 | 0 | 1.65 | 2.20 |
| 37 | 1 | 0 | 1.65 | 2.20 |
| 38 | 1 | 0 | 1.57 | 2.35 |
| 39 | 1 | 0 | 1.68 | 2.15 |
| 41 | 1 | 0 | 1.65 | 2.20 |
| 44 | 1 | 0 | 1.63 | 2.25 |
| 46 | 1 | 0 | 1.52 | 2.42 |
| 47 | 1 | 0 | 1.60 | 2.30 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 10 lần; tổng biên độ giảm 0.475; bước lớn nhất 0.100
- **H1 — Khách:** 11 lần; tổng biên độ giảm 0.725; bước lớn nhất 0.200
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 27 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 41 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 48 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 50 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 77 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 90 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 45 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 11 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 26 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 27 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 34 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 35 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 38 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 41 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 44 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 46 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 3,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427028858",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "427028929",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 2.75,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "427028962",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "427029045",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "427029127",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427029196",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 2.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "427029279",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427029361",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "427029484",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "427029533",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427029675",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.75,
    "sourceId": "427029778",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "427029814",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "427029886",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "427029954",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "427030004",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 3.25,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "427030048",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 2,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427030542",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 2,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "427030619",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "427030738",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 2,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "427030786",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427030885",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 32,
    "handicap": 2,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427030942",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 33,
    "handicap": 2,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427031011",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 34,
    "handicap": 3,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "427031029",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 3,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427031132",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "427031165",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 37,
    "handicap": 3,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427031259",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 2.75,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "427031281",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 2.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "427031304",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "427031370",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "427031462",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427031501",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 2.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "427031578",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 44,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "427031689",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 2.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "427031694",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427031753",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 2.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "427031792",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 48,
    "handicap": 2.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "427031831",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 49,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427031883",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 50,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427031953",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 51,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "427031993",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 2.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "427033009",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "427033071",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 2.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427033142",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 49,
    "handicap": 2.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "427033277",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 50,
    "handicap": 2.25,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "427033362",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 51,
    "handicap": 2.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "427033448",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 53,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "427033566",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 54,
    "handicap": 2.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "427033635",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 56,
    "handicap": 2.25,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "427033750",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 57,
    "handicap": 2.25,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "427033809",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 58,
    "handicap": 2,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "427033879",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 59,
    "handicap": 3,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "427033942",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 60,
    "handicap": 3,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427034004",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 61,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "427034077",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 62,
    "handicap": 3,
    "over": 2,
    "under": 1.8,
    "sourceId": "427034139",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 63,
    "handicap": 3,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "427034206",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 64,
    "handicap": 3,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "427034294",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 65,
    "handicap": 2.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "427034326",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 66,
    "handicap": 2.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "427034437",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 67,
    "handicap": 2.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "427034517",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 68,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427034603",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 69,
    "handicap": 2.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "427034663",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 70,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427034695",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 71,
    "handicap": 2.75,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427034770",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 72,
    "handicap": 2.5,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "427034853",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 74,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "427035016",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 75,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427035053",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 76,
    "handicap": 3.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427035166",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 77,
    "handicap": 3.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "427035193",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 78,
    "handicap": 3.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "427035265",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 79,
    "handicap": 3.5,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "427035342",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 80,
    "handicap": 3.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "427035415",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 81,
    "handicap": 3.5,
    "over": 2.3,
    "under": 1.6,
    "sourceId": "427035465",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 82,
    "handicap": 3.5,
    "over": 2.375,
    "under": 1.55,
    "sourceId": "427035522",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 83,
    "handicap": 3.5,
    "over": 2.5,
    "under": 1.5,
    "sourceId": "427035623",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 84,
    "handicap": 3.5,
    "over": 2.6,
    "under": 1.475,
    "sourceId": "427035708",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 85,
    "handicap": 3.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "427035761",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 86,
    "handicap": 3.5,
    "over": 3.3,
    "under": 1.325,
    "sourceId": "427035808",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 88,
    "handicap": 3.5,
    "over": 3.9,
    "under": 1.24,
    "sourceId": "427035913",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 89,
    "handicap": 3.5,
    "over": 4.25,
    "under": 1.21,
    "sourceId": "427035965",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 90,
    "handicap": 3.5,
    "over": 3.8,
    "under": 1.25,
    "sourceId": "427036012",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 91,
    "handicap": 3.5,
    "over": 4.25,
    "under": 1.21,
    "sourceId": "427036072",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 92,
    "handicap": 3.5,
    "over": 4.8,
    "under": 1.175,
    "sourceId": "427036137",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 93,
    "handicap": 3.5,
    "over": 5.5,
    "under": 1.15,
    "sourceId": "427036179",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 94,
    "handicap": 3.5,
    "over": 6.25,
    "under": 1.12,
    "sourceId": "427036260",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 95,
    "handicap": 3.5,
    "over": 8.75,
    "under": 1.075,
    "sourceId": "427036308",
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
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250086755",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "250086806",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250086874",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250086924",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250087037",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": -0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250087162",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": -0.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250087230",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 13,
    "handicap": -0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250087277",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": -0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250087370",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": -0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250087443",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": -0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250087476",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 20,
    "handicap": 0,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250087502",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "250087779",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": -0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250087800",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": -0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250087824",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 30,
    "handicap": -0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250087902",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 33,
    "handicap": -0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250088004",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 34,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "250088057",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 35,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "250088105",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "250088153",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 37,
    "handicap": -0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250088182",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 38,
    "handicap": -0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250088210",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": -0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250088273",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 41,
    "handicap": -0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250088349",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 42,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250088401",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 43,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250088425",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 46,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250088526",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 47,
    "handicap": -0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "250088565",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 50,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250088647",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 51,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250088674",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250089250",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 49,
    "handicap": -0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "250089426",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 50,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250089451",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 51,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250089476",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 54,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250089609",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 57,
    "handicap": -0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "250089696",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 58,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250089741",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 59,
    "handicap": -0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250089767",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 60,
    "handicap": -0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250089811",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 61,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "250089844",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 62,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "250089874",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 63,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "250089921",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 64,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "250089975",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 66,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "250090067",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 68,
    "handicap": -0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "250090168",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 69,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "250090209",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 70,
    "handicap": -0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "250090215",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 71,
    "handicap": -0.25,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "250090260",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 72,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "250090276",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 73,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "250090360",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 74,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "250090368",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 75,
    "handicap": -0.25,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "250090420",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 76,
    "handicap": -0.25,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "250090472",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 77,
    "handicap": -0.25,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "250090487",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 78,
    "handicap": 0,
    "home": 1.5,
    "away": 2.4,
    "sourceId": "250090551",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 79,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "250090565",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 80,
    "handicap": 0,
    "home": 1.55,
    "away": 2.375,
    "sourceId": "250090605",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 83,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "250090727",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 88,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "250090875",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 94,
    "handicap": 0,
    "home": 1.4,
    "away": 2.85,
    "sourceId": "250091075",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 95,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "250091097",
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
    "sourceId": "185570446",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185570452",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1.25,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185570525",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185570571",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "185570612",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185570641",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185570658",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 1,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185570725",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 1,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185570755",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 1,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185570780",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 0.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "185570815",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 0.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "185570881",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 0.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "185570896",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 0.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185570944",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 0.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185570959",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 0.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185570975",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 0.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185571025",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 0.5,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185571058",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 1.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "185571087",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 0.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185571367",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 0.5,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "185571395",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 0.5,
    "over": 2.15,
    "under": 1.675,
    "sourceId": "185571418",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 0.5,
    "over": 2.25,
    "under": 1.625,
    "sourceId": "185571469",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 0.5,
    "over": 2.3,
    "under": 1.6,
    "sourceId": "185571507",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 0.5,
    "over": 2.35,
    "under": 1.575,
    "sourceId": "185571534",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 0.5,
    "over": 2.375,
    "under": 1.55,
    "sourceId": "185571563",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 0.5,
    "over": 2.425,
    "under": 1.525,
    "sourceId": "185571640",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 34,
    "handicap": 1.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "185571662",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 1.5,
    "over": 2.35,
    "under": 1.575,
    "sourceId": "185571726",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 36,
    "handicap": 1.5,
    "over": 2.425,
    "under": 1.525,
    "sourceId": "185571757",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 37,
    "handicap": 1.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "185571798",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 1.5,
    "over": 3,
    "under": 1.375,
    "sourceId": "185571817",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 1.5,
    "over": 3.3,
    "under": 1.325,
    "sourceId": "185571828",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 1.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "185571865",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 1.5,
    "over": 3.9,
    "under": 1.24,
    "sourceId": "185571886",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 1.5,
    "over": 4.5,
    "under": 1.19,
    "sourceId": "185571915",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 43,
    "handicap": 1.5,
    "over": 5.5,
    "under": 1.15,
    "sourceId": "185571937",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 44,
    "handicap": 1.5,
    "over": 6.25,
    "under": 1.12,
    "sourceId": "185571954",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 45,
    "handicap": 1.5,
    "over": 4.25,
    "under": 1.21,
    "sourceId": "185571981",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 46,
    "handicap": 1.5,
    "over": 4.5,
    "under": 1.19,
    "sourceId": "185571997",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 47,
    "handicap": 1.5,
    "over": 5.75,
    "under": 1.14,
    "sourceId": "185572009",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 48,
    "handicap": 1.5,
    "over": 6.25,
    "under": 1.12,
    "sourceId": "185572023",
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
    "handicap": -0.25,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "104150620",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 4,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "104150702",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "104150735",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "104150751",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": -0.25,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "104150774",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": 0,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "104150800",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": 0,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "104150854",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 12,
    "handicap": 0,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "104150872",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 13,
    "handicap": 0,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "104150900",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 0,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "104150980",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 20,
    "handicap": 0,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104151013",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "104151172",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "104151185",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 28,
    "handicap": 0,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "104151198",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 30,
    "handicap": 0,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "104151240",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "104151307",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 34,
    "handicap": 0,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "104151334",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 35,
    "handicap": 0,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "104151355",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "104151398",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0,
    "home": 1.575,
    "away": 2.35,
    "sourceId": "104151408",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 39,
    "handicap": 0,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "104151431",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 41,
    "handicap": 0,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "104151456",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 44,
    "handicap": 0,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "104151485",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 46,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "104151514",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 47,
    "handicap": 0,
    "home": 1.6,
    "away": 2.3,
    "sourceId": "104151528",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._