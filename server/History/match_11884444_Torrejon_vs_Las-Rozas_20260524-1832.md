# Trận đấu — Torrejon vs Las Rozas

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11884444` |
| Giải | Spain Tercera - Play-Offs |
| Tỷ số | 0-2 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1779621135454 |
| timer (raw) | `{"tm":80,"ts":20,"tt":"1","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "92",
    "69"
  ],
  "ball_safe": [
    "34",
    "38"
  ],
  "corners": [
    "11",
    "7"
  ],
  "corner_h": [
    "4",
    "6"
  ],
  "dangerous_attacks": [
    "39",
    "28"
  ],
  "fouls": [
    "5",
    "4"
  ],
  "goalattempts": [
    "5",
    "10"
  ],
  "goals": [
    "0",
    "2"
  ],
  "injuries": [
    "0",
    "1"
  ],
  "offsides": [
    "0",
    "1"
  ],
  "off_target": [
    "10",
    "8"
  ],
  "on_target": [
    "5",
    "9"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "55",
    "45"
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
    "3",
    "3"
  ],
  "substitutions": [
    "5",
    "3"
  ],
  "yellowcards": [
    "2",
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
| 589 | 89 / 68 | 37 / 28 | 5 / 9 | 10 / 8 | 11 / 7 | 1 / 1 | 0 / 0 |
| 590 | 91 / 68 | 38 / 28 | 5 / 9 | 10 / 8 | 11 / 7 | 1 / 1 | 0 / 0 |
| 591 | 91 / 69 | 38 / 28 | 5 / 9 | 10 / 8 | 11 / 7 | 2 / 1 | 0 / 0 |
| 592 | 92 / 69 | 39 / 28 | 5 / 9 | 10 / 8 | 11 / 7 | 2 / 1 | 0 / 0 |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 77 | 2 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm._

| Phút | Hiệp | GoalProb | Đoán nhãn | Chấm | Nguồn | Đúng/Sai | Heuristic | Ollama | GPT |
|------|------|----------|-----------|------|-------|----------|-----------|--------|-----|
| 77 | 2 | 52.0% | có | — | — | — | GoalProb 15' 52% · 5' tới 51% · DA tổng +64 (3p) · Top feature: ah12_handicap=0.00 | Hiệp 2 phút 77, tỷ số vẫn là 0-0 với áp lực tấn công tăng cao từ cả hai đội trong 3p gần đây (home +36, away +28). Kèo OU 1_3 nghiêng về chủ nhà -1 tạo động lực ghi bàn. | OpenAI disabled (OPENAI_API_KEY chưa cấu hình) |
| 78 | 2 | 48.3% | không | — | — | — | GoalProb 15' 48% · 5' tới 47% · DA tổng +65 (3p) · Xỉu drop 3 lần (-0.13) · Chủ AH drop 2 lần · Top feature: ah12_handicap=-0.25 | GoalProb 15' 48% · DA tổng +65 (3p) · Xỉu drop 3 lần (-0.13) · Chủ AH drop 2 lần · Top feature: ah12_handicap=-0.25 | OpenAI disabled (OPENAI_API_KEY chưa cấu hình) |

**Tổng số lần dự đoán:** 2
_Chưa có verdict nào — chưa tính accuracy._

_Model: `v1` · AUC 0.506 · 255 trận train · trained 2026-05-20T13:05:54.961475_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 77 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 2.25 | 1.85 | 1.95 |
| 2 | 1 | 2.25 | 1.85 | 1.95 |
| 3 | 1 | 2.25 | 1.85 | 1.95 |
| 4 | 1 | 2.25 | 1.90 | 1.90 |
| 5 | 1 | 2.25 | 1.93 | 1.88 |
| 6 | 1 | 3.5 | 1.95 | 1.85 |
| 7 | 1 | 3.25 | 1.90 | 1.90 |
| 8 | 1 | 3.25 | 1.82 | 1.98 |
| 9 | 1 | 3.25 | 1.85 | 1.95 |
| 10 | 1 | 3.25 | 1.88 | 1.93 |
| 11 | 1 | 3.25 | 1.90 | 1.90 |
| 12 | 1 | 3.25 | 1.93 | 1.88 |
| 13 | 1 | 3.25 | 1.95 | 1.85 |
| 14 | 1 | 3.25 | 1.95 | 1.85 |
| 15 | 1 | 3.25 | 1.93 | 1.88 |
| 16 | 1 | 3.25 | 1.95 | 1.85 |
| 17 | 1 | 3.25 | 1.98 | 1.82 |
| 18 | 1 | 3.25 | 2.02 | 1.77 |
| 19 | 1 | 3 | 1.82 | 1.98 |
| 20 | 1 | 3 | 1.85 | 1.95 |
| 21 | 1 | 3 | 1.88 | 1.93 |
| 22 | 1 | 3 | 1.90 | 1.90 |
| 23 | 1 | 3 | 1.95 | 1.85 |
| 24 | 1 | 3 | 1.98 | 1.82 |
| 26 | 1 | 3 | 2.00 | 1.80 |
| 27 | 1 | 3 | 2.00 | 1.80 |
| 28 | 1 | 3 | 2.02 | 1.77 |
| 29 | 1 | 3 | 2.02 | 1.77 |
| 30 | 1 | 2.75 | 1.73 | 1.98 |
| 31 | 1 | 2.75 | 1.77 | 2.02 |
| 32 | 1 | 2.75 | 1.82 | 1.98 |
| 33 | 1 | 2.75 | 1.80 | 2.00 |
| 35 | 1 | 2.75 | 1.85 | 1.95 |
| 36 | 1 | 2.75 | 1.90 | 1.90 |
| 37 | 1 | 2.75 | 1.90 | 1.90 |
| 38 | 1 | 2.5 | 1.88 | 1.93 |
| 39 | 1 | 2.5 | 1.88 | 1.93 |
| 40 | 1 | 2.5 | 1.88 | 1.93 |
| 41 | 1 | 2.5 | 1.90 | 1.90 |
| 42 | 1 | 2.5 | 1.90 | 1.90 |
| 43 | 1 | 2.5 | 1.95 | 1.85 |
| 45 | 2 | 2.25 | 1.82 | 1.98 |
| 46 | 2 | 2.25 | 1.85 | 1.95 |
| 47 | 2 | 2.25 | 1.80 | 2.00 |
| 48 | 2 | 2.25 | 1.93 | 1.88 |
| 49 | 2 | 2.25 | 1.95 | 1.85 |
| 50 | 2 | 2.25 | 1.98 | 1.82 |
| 51 | 2 | 2.25 | 2.02 | 1.77 |
| 52 | 2 | 2.25 | 2.05 | 1.75 |
| 53 | 2 | 2 | 1.68 | 2.05 |
| 54 | 2 | 2 | 1.73 | 2.08 |
| 55 | 2 | 2 | 1.77 | 2.02 |
| 56 | 2 | 2 | 1.80 | 2.00 |
| 57 | 2 | 2 | 1.85 | 1.95 |
| 58 | 2 | 2 | 1.95 | 1.85 |
| 59 | 2 | 2 | 1.95 | 1.85 |
| 60 | 2 | 2 | 2.00 | 1.80 |
| 61 | 2 | 2 | 2.05 | 1.75 |
| 62 | 2 | 1.75 | 1.68 | 2.05 |
| 63 | 2 | 1.75 | 1.73 | 2.08 |
| 64 | 2 | 1.75 | 1.75 | 2.05 |
| 65 | 2 | 2.75 | 1.73 | 2.08 |
| 66 | 2 | 2.75 | 1.82 | 1.98 |
| 67 | 2 | 2.75 | 1.85 | 1.95 |
| 68 | 2 | 2.75 | 1.95 | 1.85 |
| 69 | 2 | 2.75 | 1.98 | 1.82 |
| 70 | 2 | 2.75 | 2.00 | 1.80 |
| 71 | 2 | 2.75 | 2.05 | 1.75 |
| 72 | 2 | 2.5 | 1.77 | 2.02 |
| 73 | 2 | 2.5 | 1.82 | 1.98 |
| 74 | 2 | 2.5 | 1.82 | 1.98 |
| 75 | 2 | 2.5 | 1.88 | 1.93 |
| 76 | 2 | 2.5 | 1.93 | 1.88 |
| 77 | 2 | 2.5 | 1.95 | 1.85 |
| 78 | 2 | 2.5 | 2.00 | 1.80 |
| 79 | 2 | 2.5 | 2.10 | 1.70 |
| 80 | 2 | 2.5 | 2.15 | 1.68 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 3 lần; tổng biên độ giảm 0.125; bước lớn nhất 0.075
- **H1 — Xỉu:** 22 lần; tổng biên độ giảm 0.725; bước lớn nhất 0.050
- **H2 — Tài:** 1 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.050
- **H2 — Xỉu:** 26 lần; tổng biên độ giảm 1.300; bước lớn nhất 0.125

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 60 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.5 | 1.95 | 1.75 |
| 2 | 1 | -0.5 | 2.00 | 1.80 |
| 3 | 1 | -0.5 | 1.95 | 1.85 |
| 4 | 1 | -0.5 | 1.98 | 1.82 |
| 6 | 1 | -0.5 | 1.75 | 1.95 |
| 7 | 1 | -0.5 | 1.88 | 1.93 |
| 8 | 1 | -0.5 | 1.85 | 1.95 |
| 13 | 1 | -0.5 | 1.82 | 1.98 |
| 14 | 1 | -0.5 | 1.85 | 1.95 |
| 16 | 1 | -0.5 | 1.88 | 1.93 |
| 17 | 1 | -0.5 | 1.85 | 1.95 |
| 18 | 1 | -0.5 | 1.88 | 1.93 |
| 19 | 1 | -0.5 | 1.88 | 1.93 |
| 24 | 1 | -0.5 | 1.85 | 1.95 |
| 25 | 1 | -0.5 | 1.88 | 1.93 |
| 26 | 1 | -0.5 | 1.90 | 1.90 |
| 27 | 1 | -0.5 | 1.93 | 1.88 |
| 28 | 1 | -0.5 | 1.93 | 1.88 |
| 29 | 1 | -0.5 | 1.95 | 1.85 |
| 31 | 1 | -0.5 | 1.98 | 1.82 |
| 32 | 1 | -0.5 | 1.95 | 1.85 |
| 33 | 1 | -0.5 | 1.98 | 1.82 |
| 34 | 1 | -0.5 | 2.00 | 1.80 |
| 35 | 1 | -0.5 | 1.98 | 1.82 |
| 36 | 1 | -0.5 | 1.98 | 1.82 |
| 37 | 1 | -0.5 | 1.95 | 1.85 |
| 38 | 1 | -0.5 | 2.00 | 1.80 |
| 39 | 1 | -0.5 | 1.98 | 1.82 |
| 40 | 1 | -0.5 | 2.00 | 1.80 |
| 41 | 1 | -0.5 | 2.00 | 1.80 |
| 42 | 1 | -0.5 | 2.02 | 1.77 |
| 44 | 1 | -0.5 | 2.05 | 1.75 |
| 45 | 2 | -0.25 | 1.82 | 1.98 |
| 46 | 2 | -0.25 | 1.85 | 1.95 |
| 47 | 2 | -0.25 | 1.82 | 1.98 |
| 48 | 2 | -0.25 | 1.93 | 1.88 |
| 49 | 2 | -0.25 | 1.90 | 1.90 |
| 50 | 2 | -0.25 | 1.93 | 1.88 |
| 52 | 2 | -0.25 | 1.95 | 1.85 |
| 53 | 2 | -0.25 | 1.95 | 1.85 |
| 55 | 2 | -0.25 | 1.98 | 1.82 |
| 56 | 2 | -0.25 | 2.00 | 1.80 |
| 58 | 2 | -0.25 | 2.02 | 1.77 |
| 59 | 2 | -0.25 | 2.00 | 1.80 |
| 60 | 2 | -0.25 | 2.10 | 1.70 |
| 61 | 2 | -0.25 | 2.05 | 1.75 |
| 63 | 2 | -0.25 | 2.08 | 1.73 |
| 64 | 2 | -0.25 | 2.05 | 1.75 |
| 65 | 2 | -0.25 | 2.02 | 1.77 |
| 66 | 2 | -0.25 | 2.10 | 1.70 |
| 68 | 2 | -0.25 | 2.15 | 1.68 |
| 69 | 2 | -0.25 | 2.20 | 1.65 |
| 70 | 2 | -0.25 | 2.25 | 1.63 |
| 73 | 2 | -0.25 | 2.30 | 1.60 |
| 74 | 2 | -0.25 | 2.25 | 1.63 |
| 75 | 2 | -0.25 | 2.30 | 1.60 |
| 76 | 2 | -0.25 | 2.35 | 1.57 |
| 77 | 2 | -0.25 | 2.30 | 1.60 |
| 78 | 2 | -0.25 | 2.38 | 1.55 |
| 79 | 2 | 0 | 1.52 | 2.42 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 10 lần; tổng biên độ giảm 0.475; bước lớn nhất 0.225
- **H1 — Khách:** 16 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.050
- **H2 — Chủ:** 8 lần; tổng biên độ giảm 0.275; bước lớn nhất 0.050
- **H2 — Khách:** 17 lần; tổng biên độ giảm 0.650; bước lớn nhất 0.100

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 40 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0.75 | 1.70 | 2.10 |
| 2 | 1 | 0.75 | 1.73 | 2.08 |
| 3 | 1 | 0.75 | 1.70 | 2.10 |
| 4 | 1 | 0.75 | 1.75 | 2.05 |
| 5 | 1 | 0.75 | 1.77 | 2.02 |
| 6 | 1 | 2 | 2.02 | 1.77 |
| 7 | 1 | 1.75 | 1.75 | 2.05 |
| 8 | 1 | 1.75 | 1.73 | 2.08 |
| 9 | 1 | 1.75 | 1.75 | 2.05 |
| 10 | 1 | 1.75 | 1.77 | 2.02 |
| 11 | 1 | 1.75 | 1.82 | 1.98 |
| 12 | 1 | 1.75 | 1.85 | 1.95 |
| 13 | 1 | 1.75 | 1.93 | 1.88 |
| 14 | 1 | 1.75 | 1.98 | 1.82 |
| 15 | 1 | 1.75 | 1.98 | 1.82 |
| 16 | 1 | 1.75 | 2.00 | 1.80 |
| 17 | 1 | 1.75 | 2.00 | 1.70 |
| 18 | 1 | 1.5 | 1.77 | 2.02 |
| 19 | 1 | 1.5 | 1.80 | 2.00 |
| 20 | 1 | 1.5 | 1.85 | 1.95 |
| 21 | 1 | 1.5 | 1.88 | 1.93 |
| 22 | 1 | 1.5 | 1.95 | 1.85 |
| 24 | 1 | 1.5 | 2.05 | 1.75 |
| 25 | 1 | 1.5 | 2.08 | 1.73 |
| 26 | 1 | 1.5 | 2.10 | 1.70 |
| 27 | 1 | 1.5 | 2.25 | 1.63 |
| 28 | 1 | 1.5 | 2.30 | 1.60 |
| 29 | 1 | 1.5 | 2.35 | 1.57 |
| 30 | 1 | 1.5 | 2.38 | 1.55 |
| 31 | 1 | 1.5 | 2.50 | 1.50 |
| 32 | 1 | 1.5 | 2.75 | 1.43 |
| 35 | 1 | 1.5 | 2.85 | 1.40 |
| 36 | 1 | 1.5 | 3.00 | 1.38 |
| 37 | 1 | 1.5 | 3.10 | 1.35 |
| 38 | 1 | 1.5 | 3.70 | 1.26 |
| 39 | 1 | 1.5 | 3.90 | 1.24 |
| 40 | 1 | 1.5 | 4.50 | 1.19 |
| 41 | 1 | 1.5 | 5.25 | 1.16 |
| 42 | 1 | 1.5 | 5.50 | 1.15 |
| 43 | 1 | 1.5 | 5.75 | 1.14 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 2 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.025
- **H1 — Xỉu:** 33 lần; tổng biên độ giảm 1.360; bước lớn nhất 0.100
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 31 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.25 | 2.15 | 1.68 |
| 3 | 1 | -0.25 | 2.10 | 1.70 |
| 5 | 1 | -0.25 | 2.15 | 1.68 |
| 6 | 1 | -0.25 | 2.00 | 1.80 |
| 7 | 1 | -0.25 | 2.02 | 1.77 |
| 9 | 1 | -0.25 | 2.00 | 1.80 |
| 10 | 1 | -0.25 | 2.02 | 1.77 |
| 12 | 1 | -0.25 | 2.05 | 1.75 |
| 13 | 1 | -0.25 | 2.08 | 1.73 |
| 14 | 1 | -0.25 | 2.10 | 1.70 |
| 15 | 1 | -0.25 | 2.15 | 1.68 |
| 17 | 1 | -0.25 | 2.15 | 1.68 |
| 18 | 1 | -0.25 | 2.20 | 1.65 |
| 19 | 1 | -0.25 | 2.25 | 1.63 |
| 20 | 1 | -0.25 | 2.30 | 1.60 |
| 22 | 1 | -0.25 | 2.35 | 1.57 |
| 24 | 1 | -0.25 | 2.35 | 1.57 |
| 25 | 1 | -0.25 | 2.38 | 1.55 |
| 26 | 1 | 0 | 1.48 | 2.48 |
| 27 | 1 | 0 | 1.48 | 2.48 |
| 28 | 1 | -0.25 | 2.55 | 1.45 |
| 29 | 1 | 0 | 1.55 | 2.38 |
| 32 | 1 | 0 | 1.48 | 2.60 |
| 33 | 1 | 0 | 1.52 | 2.42 |
| 36 | 1 | 0 | 1.52 | 2.42 |
| 37 | 1 | 0 | 1.48 | 2.60 |
| 38 | 1 | 0 | 1.52 | 2.42 |
| 39 | 1 | 0 | 1.45 | 2.67 |
| 40 | 1 | 0 | 1.52 | 2.42 |
| 42 | 1 | 0 | 1.73 | 2.08 |
| 43 | 1 | 0 | 1.75 | 2.05 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 6 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.150
- **H1 — Khách:** 17 lần; tổng biên độ giảm 1.275; bước lớn nhất 0.350
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 8 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 15 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 33 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 47 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 8 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 6 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 9 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 32 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 37 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 39 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 2.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424582138",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 2.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424582193",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 2.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424582341",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424582422",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424582449",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 3.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424582573",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 3.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424582682",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 3.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424582769",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 3.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424582807",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 3.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424582919",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 3.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424583048",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 3.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424583113",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 13,
    "handicap": 3.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424583214",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 3.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424583264",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 3.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424583383",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 3.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424583460",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 3.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424583568",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 3.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424583619",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 3,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424583679",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 3,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424583753",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 3,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424583838",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 3,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424583846",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 23,
    "handicap": 3,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424583966",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 3,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424584022",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 3,
    "over": 2,
    "under": 1.8,
    "sourceId": "424584152",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 3,
    "over": 2,
    "under": 1.8,
    "sourceId": "424584226",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 28,
    "handicap": 3,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424584241",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 3,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424584346",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 2.75,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "424584407",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 2.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424584481",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 32,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424584567",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 33,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "424584668",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424584822",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424584971",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 37,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424585042",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424585190",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424585282",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424585368",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424585464",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424585590",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424585663",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424587955",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 2.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424588109",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 2.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "424586103",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 48,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424588351",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 49,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424588430",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 50,
    "handicap": 2.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424588540",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 51,
    "handicap": 2.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424588664",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 52,
    "handicap": 2.25,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424588819",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 53,
    "handicap": 2,
    "over": 1.675,
    "under": 2.05,
    "sourceId": "424588928",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 54,
    "handicap": 2,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "424589047",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 55,
    "handicap": 2,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424589112",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 56,
    "handicap": 2,
    "over": 1.8,
    "under": 2,
    "sourceId": "424589248",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 57,
    "handicap": 2,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424589325",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 58,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424589428",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 59,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424589500",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 60,
    "handicap": 2,
    "over": 2,
    "under": 1.8,
    "sourceId": "424589578",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 61,
    "handicap": 2,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424589640",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 62,
    "handicap": 1.75,
    "over": 1.675,
    "under": 2.05,
    "sourceId": "424589703",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 63,
    "handicap": 1.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "424589795",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 64,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "424589820",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 65,
    "handicap": 2.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "424589939",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 66,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424589971",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 67,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424590026",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 68,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424590097",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 69,
    "handicap": 2.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424590202",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 70,
    "handicap": 2.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "424590227",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 71,
    "handicap": 2.75,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424590321",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 72,
    "handicap": 2.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424590376",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 73,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424590520",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 74,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424590586",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 75,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424590747",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 76,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424590883",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 77,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424590945",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 78,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "424591103",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 79,
    "handicap": 2.5,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "424591185",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 80,
    "handicap": 2.5,
    "over": 2.15,
    "under": 1.675,
    "sourceId": "424591248",
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
    "home": 1.95,
    "away": 1.75,
    "sourceId": "248646662",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "248646677",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": -0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248646797",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248646862",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": -0.5,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "248646960",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": -0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248646999",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": -0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248647054",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 13,
    "handicap": -0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248647316",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 14,
    "handicap": -0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248647370",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": -0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248647514",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": -0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248647563",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": -0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248647596",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": -0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248647637",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 24,
    "handicap": -0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248647853",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 25,
    "handicap": -0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "248647887",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": -0.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248647916",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": -0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248647985",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": -0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248647997",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": -0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248648062",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 31,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248648128",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 32,
    "handicap": -0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248648222",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 33,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248648245",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 34,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "248648354",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 35,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248648420",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248648476",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 37,
    "handicap": -0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248648545",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 38,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "248648609",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248648693",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 40,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "248648792",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 41,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "248648835",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 42,
    "handicap": -0.5,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248648920",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 44,
    "handicap": -0.5,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248649021",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248649420",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 46,
    "handicap": -0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248650584",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 47,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248649256",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 48,
    "handicap": -0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248650755",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 49,
    "handicap": -0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248650799",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 50,
    "handicap": -0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248650863",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 52,
    "handicap": -0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248651050",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 53,
    "handicap": -0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248651091",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 55,
    "handicap": -0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248651188",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 56,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "248651272",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 58,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248651395",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 59,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "248651424",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 60,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "248651494",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 61,
    "handicap": -0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248651533",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 63,
    "handicap": -0.25,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "248651632",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 64,
    "handicap": -0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248651644",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 65,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248651727",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 66,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "248651756",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 68,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "248651824",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 69,
    "handicap": -0.25,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "248651859",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 70,
    "handicap": -0.25,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "248651950",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 73,
    "handicap": -0.25,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "248652141",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 74,
    "handicap": -0.25,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "248652223",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 75,
    "handicap": -0.25,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "248652246",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 76,
    "handicap": -0.25,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "248652314",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 77,
    "handicap": -0.25,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "248652448",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 78,
    "handicap": -0.25,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "248652557",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 79,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "248652617",
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
    "over": 1.7,
    "under": 2.1,
    "sourceId": "184473660",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 0.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "184473688",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 0.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "184473775",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 0.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184473839",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 0.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184473847",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 2,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "184473951",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184474035",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 1.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "184474071",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184474122",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 1.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184474227",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 1.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184474323",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 1.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184474361",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 1.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "184474411",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 1.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "184474454",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 1.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "184474478",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 1.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "184474529",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 1.75,
    "over": 2,
    "under": 1.7,
    "sourceId": "184474578",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 1.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184474599",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 1.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "184474627",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 1.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184474676",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 1.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "184474703",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 1.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184474754",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 1.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "184474821",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 25,
    "handicap": 1.5,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "184474869",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 1.5,
    "over": 2.1,
    "under": 1.7,
    "sourceId": "184474908",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 1.5,
    "over": 2.25,
    "under": 1.625,
    "sourceId": "184474946",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 1.5,
    "over": 2.3,
    "under": 1.6,
    "sourceId": "184474964",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 1.5,
    "over": 2.35,
    "under": 1.575,
    "sourceId": "184475043",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 1.5,
    "over": 2.375,
    "under": 1.55,
    "sourceId": "184475074",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 1.5,
    "over": 2.5,
    "under": 1.5,
    "sourceId": "184475152",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 1.5,
    "over": 2.75,
    "under": 1.425,
    "sourceId": "184475219",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 1.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "184475387",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 36,
    "handicap": 1.5,
    "over": 3,
    "under": 1.375,
    "sourceId": "184475449",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 37,
    "handicap": 1.5,
    "over": 3.1,
    "under": 1.35,
    "sourceId": "184475577",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 1.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "184475649",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 1.5,
    "over": 3.9,
    "under": 1.24,
    "sourceId": "184475711",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 1.5,
    "over": 4.5,
    "under": 1.19,
    "sourceId": "184475805",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 1.5,
    "over": 5.25,
    "under": 1.16,
    "sourceId": "184475870",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 1.5,
    "over": 5.5,
    "under": 1.15,
    "sourceId": "184475930",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 43,
    "handicap": 1.5,
    "over": 5.75,
    "under": 1.14,
    "sourceId": "184475954",
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
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103520684",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 3,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103520750",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103520817",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "103520864",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "103520898",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "103520990",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "103521038",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 12,
    "handicap": -0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103521086",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 13,
    "handicap": -0.25,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "103521112",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 14,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103521135",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 15,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103521149",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 17,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103521198",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": -0.25,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "103521212",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 19,
    "handicap": -0.25,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "103521223",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 20,
    "handicap": -0.25,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "103521245",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 22,
    "handicap": -0.25,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "103521316",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 24,
    "handicap": -0.25,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "103521364",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 25,
    "handicap": -0.25,
    "home": 2.375,
    "away": 1.55,
    "sourceId": "103521380",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0,
    "home": 1.475,
    "away": 2.475,
    "sourceId": "103521415",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0,
    "home": 1.475,
    "away": 2.475,
    "sourceId": "103521443",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 28,
    "handicap": -0.25,
    "home": 2.55,
    "away": 1.45,
    "sourceId": "103521451",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 29,
    "handicap": 0,
    "home": 1.55,
    "away": 2.375,
    "sourceId": "103521519",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 32,
    "handicap": 0,
    "home": 1.475,
    "away": 2.6,
    "sourceId": "103521625",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "103521685",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 36,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "103521818",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0,
    "home": 1.475,
    "away": 2.6,
    "sourceId": "103521841",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "103521906",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 39,
    "handicap": 0,
    "home": 1.45,
    "away": 2.675,
    "sourceId": "103521929",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 40,
    "handicap": 0,
    "home": 1.525,
    "away": 2.425,
    "sourceId": "103521998",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 42,
    "handicap": 0,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "103522072",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 43,
    "handicap": 0,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "103522091",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._