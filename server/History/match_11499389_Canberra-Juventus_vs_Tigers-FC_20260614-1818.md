# Trận đấu — Canberra Juventus vs Tigers FC

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11499389` |
| Giải | Australia Capital Territory Premier League |
| Tỷ số | 0-4 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1781432448592 |
| timer (raw) | `{"tm":60,"ts":28,"tt":"1","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "49",
    "36"
  ],
  "ball_safe": [
    "35",
    "20"
  ],
  "corners": [
    "4",
    "2"
  ],
  "corner_h": [
    "4",
    "2"
  ],
  "dangerous_attacks": [
    "35",
    "42"
  ],
  "fouls": [
    "0",
    "0"
  ],
  "goalattempts": [
    "4",
    "9"
  ],
  "goals": [
    "0",
    "4"
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
    "2",
    "6"
  ],
  "on_target": [
    "2",
    "6"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "51",
    "49"
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
    "0",
    "0"
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
| 565 | 46 / 35 | 35 / 40 | 2 / 6 | 2 / 5 | 4 / 2 | 0 / 2 | 0 / 0 | — | — |
| 566 | 46 / 35 | 35 / 40 | 2 / 6 | 2 / 5 | 4 / 2 | 0 / 2 | 0 / 0 | — | — |
| 567 | 46 / 36 | 35 / 40 | 2 / 6 | 2 / 5 | 4 / 2 | 0 / 2 | 0 / 0 | — | — |
| 568 | 47 / 36 | 35 / 40 | 2 / 6 | 2 / 5 | 4 / 2 | 0 / 2 | 0 / 0 | — | — |

## Sự kiện trận (goal, corner)

_Không có sự kiện lưu._

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._

**Tổng số lần dự đoán:** 3

### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)

| Phút | Hiệp | GoalProb 30' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 54 | 2 | 80.4% | có | — | — | — |
| 56 | 2 | 62.8% | có | — | — | — |
| 60 | 2 | 62.8% | có | — | — | — |

_Cửa sổ 30': chưa có verdict nào — chưa tính accuracy._

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 54 | 2 | 45.6% | không | — | — | — |
| 56 | 2 | 38.9% | không | — | — | — |
| 60 | 2 | 38.9% | không | — | — | — |

_Cửa sổ 15': chưa có verdict nào — chưa tính accuracy._

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 54 | 2 | Khả năng có bàn trong 30' tới đang ở mức cao (~80%), bóng nguy hiểm dồn dập (+75 trong 3 phút), có 8 cú dứt điểm trúng đích gần đây. | Bóng nguy hiểm đang dồn dập với chủ nhà hơn, và các tình huống tương tự thường nổ bàn trong 30 phút tới. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |
| 56 | 2 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~63%). | — | — |
| 60 | 2 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~63%). | — | — |

_Model (30'): `v3` · AUC 0.560 · 296 trận train · trained 2026-06-11T20:03:13.957737_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 49 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 3.75 | 1.80 | 2.00 |
| 2 | 1 | 3.75 | 1.82 | 1.98 |
| 3 | 1 | 3.75 | 1.88 | 1.93 |
| 4 | 1 | 3.75 | 1.90 | 1.90 |
| 5 | 1 | 3.75 | 1.95 | 1.85 |
| 6 | 1 | 3.75 | 1.95 | 1.85 |
| 8 | 1 | 3.5 | 1.85 | 1.95 |
| 9 | 1 | 3.5 | 1.90 | 1.90 |
| 10 | 1 | 3.5 | 1.90 | 1.90 |
| 11 | 1 | 3.5 | 1.93 | 1.88 |
| 12 | 1 | 3.5 | 1.95 | 1.85 |
| 13 | 1 | 3.25 | 1.75 | 1.95 |
| 14 | 1 | 4.5 | 1.98 | 1.82 |
| 15 | 1 | 4.25 | 1.93 | 1.88 |
| 16 | 1 | 4.25 | 1.95 | 1.85 |
| 17 | 1 | 4.25 | 2.00 | 1.80 |
| 18 | 1 | 4 | 1.75 | 1.95 |
| 19 | 1 | 4 | 1.85 | 1.95 |
| 20 | 1 | 4 | 1.88 | 1.93 |
| 21 | 1 | 4 | 1.90 | 1.90 |
| 22 | 1 | 4 | 1.93 | 1.88 |
| 23 | 1 | 5 | 1.85 | 1.95 |
| 24 | 1 | 4.75 | 1.88 | 1.93 |
| 25 | 1 | 4.75 | 1.85 | 1.95 |
| 26 | 1 | 4.75 | 1.93 | 1.88 |
| 28 | 1 | 4.5 | 1.75 | 1.95 |
| 29 | 1 | 4.75 | 1.98 | 1.82 |
| 30 | 1 | 4.5 | 1.88 | 1.93 |
| 31 | 1 | 4.5 | 1.88 | 1.93 |
| 32 | 1 | 4.5 | 1.95 | 1.85 |
| 35 | 1 | 4.25 | 1.75 | 1.95 |
| 36 | 1 | 4.25 | 1.85 | 1.95 |
| 38 | 1 | 4.25 | 1.98 | 1.82 |
| 39 | 1 | 4.25 | 1.95 | 1.85 |
| 40 | 1 | 4.25 | 2.00 | 1.80 |
| 41 | 1 | 4.25 | 2.02 | 1.77 |
| 42 | 1 | 4.25 | 2.02 | 1.77 |
| 43 | 1 | 4 | 1.80 | 2.00 |
| 44 | 1 | 4 | 1.85 | 1.95 |
| 45 | 2 | 4.75 | 1.73 | 1.98 |
| 46 | 2 | 5 | 1.95 | 1.85 |
| 47 | 2 | 5 | 2.00 | 1.80 |
| 48 | 2 | 4.75 | 1.80 | 2.00 |
| 49 | 2 | 5.75 | 1.80 | 2.00 |
| 50 | 2 | 5.75 | 1.82 | 1.98 |
| 51 | 2 | 5.75 | 1.80 | 2.00 |
| 52 | 2 | 5.75 | 1.85 | 1.95 |
| 53 | 2 | 5.75 | 1.90 | 1.90 |
| 55 | 2 | 5.75 | 1.95 | 1.85 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 2 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.025
- **H1 — Xỉu:** 18 lần; tổng biên độ giảm 0.800; bước lớn nhất 0.125
- **H2 — Tài:** 1 lần; tổng biên độ giảm 0.025; bước lớn nhất 0.025
- **H2 — Xỉu:** 5 lần; tổng biên độ giảm 0.225; bước lớn nhất 0.050

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 48 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 2 | 1 | 1 | 1.82 | 1.98 |
| 4 | 1 | 0.75 | 1.90 | 1.90 |
| 5 | 1 | 0.75 | 1.85 | 1.95 |
| 6 | 1 | 0.75 | 1.88 | 1.93 |
| 7 | 1 | 0.75 | 1.90 | 1.90 |
| 8 | 1 | 0.75 | 1.93 | 1.88 |
| 9 | 1 | 0.75 | 1.98 | 1.82 |
| 10 | 1 | 0.75 | 1.93 | 1.88 |
| 12 | 1 | 0.75 | 1.93 | 1.88 |
| 13 | 1 | 0.75 | 2.00 | 1.80 |
| 14 | 1 | 1 | 1.80 | 2.00 |
| 15 | 1 | 0.75 | 1.85 | 1.95 |
| 16 | 1 | 0.75 | 1.93 | 1.88 |
| 17 | 1 | 0.75 | 1.95 | 1.85 |
| 18 | 1 | 0.75 | 1.95 | 1.85 |
| 19 | 1 | 0.75 | 2.00 | 1.80 |
| 20 | 1 | 0.75 | 1.95 | 1.85 |
| 22 | 1 | 0.75 | 1.95 | 1.85 |
| 23 | 1 | 1 | 1.75 | 1.95 |
| 24 | 1 | 1 | 1.75 | 1.95 |
| 25 | 1 | 1 | 1.75 | 1.95 |
| 27 | 1 | 0.75 | 1.95 | 1.75 |
| 28 | 1 | 1 | 1.77 | 1.93 |
| 29 | 1 | 1 | 1.80 | 2.00 |
| 30 | 1 | 0.75 | 2.00 | 1.80 |
| 31 | 1 | 0.75 | 1.98 | 1.82 |
| 32 | 1 | 0.75 | 2.00 | 1.80 |
| 33 | 1 | 0.75 | 1.95 | 1.85 |
| 35 | 1 | 0.75 | 1.95 | 1.85 |
| 36 | 1 | 0.75 | 1.90 | 1.90 |
| 37 | 1 | 0.75 | 1.90 | 1.90 |
| 38 | 1 | 0.75 | 1.88 | 1.93 |
| 39 | 1 | 0.75 | 1.93 | 1.88 |
| 40 | 1 | 0.75 | 1.90 | 1.90 |
| 41 | 1 | 0.75 | 1.85 | 1.95 |
| 42 | 1 | 0.75 | 1.85 | 1.95 |
| 43 | 1 | 0.75 | 1.85 | 1.95 |
| 44 | 1 | 0.75 | 1.85 | 1.95 |
| 45 | 2 | 0.5 | 1.80 | 2.00 |
| 46 | 2 | 0.5 | 1.90 | 1.90 |
| 47 | 2 | 0.5 | 1.95 | 1.85 |
| 48 | 2 | 0.5 | 1.98 | 1.82 |
| 49 | 2 | 0.75 | 1.90 | 1.90 |
| 50 | 2 | 0.75 | 1.98 | 1.82 |
| 51 | 2 | 0.75 | 2.00 | 1.80 |
| 53 | 2 | 0.75 | 1.98 | 1.82 |
| 54 | 2 | 0.75 | 2.00 | 1.80 |
| 55 | 2 | 0.75 | 1.95 | 1.85 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 9 lần; tổng biên độ giảm 0.375; bước lớn nhất 0.050
- **H1 — Khách:** 10 lần; tổng biên độ giảm 0.425; bước lớn nhất 0.075
- **H2 — Chủ:** 2 lần; tổng biên độ giảm 0.075; bước lớn nhất 0.050
- **H2 — Khách:** 6 lần; tổng biên độ giảm 0.300; bước lớn nhất 0.100

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 41 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1.5 | 1.80 | 2.00 |
| 2 | 1 | 1.5 | 1.80 | 2.00 |
| 3 | 1 | 1.5 | 1.88 | 1.93 |
| 4 | 1 | 1.5 | 1.88 | 1.93 |
| 5 | 1 | 1.5 | 1.98 | 1.82 |
| 6 | 1 | 1.5 | 1.98 | 1.82 |
| 7 | 1 | 1.5 | 2.00 | 1.80 |
| 8 | 1 | 1.25 | 1.73 | 1.98 |
| 9 | 1 | 1.25 | 1.80 | 2.00 |
| 10 | 1 | 1.25 | 1.90 | 1.90 |
| 11 | 1 | 1.25 | 1.95 | 1.85 |
| 12 | 1 | 1.25 | 1.98 | 1.82 |
| 13 | 1 | 1.25 | 2.02 | 1.77 |
| 14 | 1 | 2.25 | 2.08 | 1.73 |
| 15 | 1 | 2 | 1.80 | 2.00 |
| 16 | 1 | 2 | 1.85 | 1.95 |
| 17 | 1 | 2 | 1.90 | 1.90 |
| 18 | 1 | 2 | 1.88 | 1.93 |
| 19 | 1 | 2 | 1.95 | 1.85 |
| 20 | 1 | 2 | 2.00 | 1.80 |
| 21 | 1 | 1.75 | 1.70 | 2.10 |
| 22 | 1 | 1.75 | 1.75 | 2.05 |
| 23 | 1 | 2.75 | 1.80 | 2.00 |
| 24 | 1 | 2.75 | 1.90 | 1.90 |
| 25 | 1 | 2.75 | 1.90 | 1.90 |
| 26 | 1 | 2.75 | 1.85 | 1.95 |
| 27 | 1 | 2.75 | 1.90 | 1.90 |
| 28 | 1 | 2.5 | 1.85 | 1.95 |
| 29 | 1 | 2.5 | 1.77 | 2.02 |
| 30 | 1 | 2.5 | 1.82 | 1.98 |
| 31 | 1 | 2.5 | 1.90 | 1.90 |
| 32 | 1 | 2.5 | 1.95 | 1.85 |
| 33 | 1 | 2.5 | 2.00 | 1.80 |
| 35 | 1 | 2.5 | 2.20 | 1.65 |
| 36 | 1 | 2.5 | 2.38 | 1.55 |
| 37 | 1 | 2.5 | 2.50 | 1.50 |
| 38 | 1 | 2.5 | 2.60 | 1.48 |
| 39 | 1 | 2.5 | 2.85 | 1.40 |
| 40 | 1 | 2.5 | 3.30 | 1.32 |
| 41 | 1 | 2.5 | 3.70 | 1.26 |
| 42 | 1 | 2.5 | 3.80 | 1.25 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 3 lần; tổng biên độ giảm 0.150; bước lớn nhất 0.075
- **H1 — Xỉu:** 26 lần; tổng biên độ giảm 1.625; bước lớn nhất 0.150
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 38 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0.5 | 1.73 | 1.98 |
| 2 | 1 | 0.25 | 2.02 | 1.77 |
| 4 | 1 | 0.25 | 2.00 | 1.80 |
| 5 | 1 | 0.25 | 1.88 | 1.93 |
| 6 | 1 | 0.25 | 1.85 | 1.95 |
| 7 | 1 | 0.25 | 1.93 | 1.88 |
| 8 | 1 | 0.25 | 1.93 | 1.88 |
| 9 | 1 | 0.25 | 1.95 | 1.85 |
| 10 | 1 | 0.25 | 1.93 | 1.88 |
| 11 | 1 | 0.25 | 1.95 | 1.85 |
| 12 | 1 | 0.25 | 1.93 | 1.88 |
| 13 | 1 | 0.25 | 1.98 | 1.82 |
| 14 | 1 | 0.25 | 1.98 | 1.82 |
| 15 | 1 | 0.25 | 1.90 | 1.90 |
| 16 | 1 | 0.25 | 1.88 | 1.93 |
| 17 | 1 | 0.25 | 1.85 | 1.95 |
| 18 | 1 | 0.25 | 1.85 | 1.95 |
| 19 | 1 | 0.25 | 1.88 | 1.93 |
| 20 | 1 | 0.25 | 1.85 | 1.95 |
| 22 | 1 | 0.25 | 1.82 | 1.98 |
| 23 | 1 | 0.25 | 1.82 | 1.98 |
| 24 | 1 | 0.25 | 1.82 | 1.98 |
| 25 | 1 | 0.25 | 1.77 | 2.02 |
| 26 | 1 | 0.25 | 1.85 | 1.95 |
| 27 | 1 | 0.25 | 1.90 | 1.90 |
| 28 | 1 | 0.25 | 1.82 | 1.98 |
| 29 | 1 | 0.25 | 1.95 | 1.85 |
| 30 | 1 | 0.25 | 1.77 | 2.02 |
| 31 | 1 | 0.25 | 1.73 | 2.08 |
| 32 | 1 | 0.25 | 1.70 | 2.10 |
| 33 | 1 | 0.25 | 1.68 | 2.15 |
| 35 | 1 | 0.25 | 1.63 | 2.25 |
| 36 | 1 | 0.25 | 1.55 | 2.38 |
| 37 | 1 | 0.25 | 1.43 | 2.63 |
| 38 | 1 | 0.25 | 1.43 | 2.63 |
| 39 | 1 | 0.25 | 1.38 | 2.83 |
| 40 | 1 | 0 | 3.00 | 1.38 |
| 42 | 1 | 0 | 3.00 | 1.38 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 20 lần; tổng biên độ giảm 1.100; bước lớn nhất 0.175
- **H1 — Khách:** 8 lần; tổng biên độ giảm 0.450; bước lớn nhất 0.125
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 25 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 39 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 51 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 18 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 26 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 29 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 4 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 5 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 6 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 10 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 12 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 15 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 16 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 17 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 20 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 22 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 25 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 28 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 31 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 32 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 33 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 35 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 36 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 37 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 39 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 3.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "426946348",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 3.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426946409",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 3.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426946498",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 3.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946566",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 3.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426946616",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 3.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426946655",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 3.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426946768",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 3.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946808",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 3.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946885",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 3.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426946908",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 3.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426947008",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 13,
    "handicap": 3.25,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "426947094",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 4.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426947170",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 4.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426947186",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 4.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426947323",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 4.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "426947384",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 4,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "426947409",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 4,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426947491",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 4,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426947579",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 4,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426947612",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 4,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426947716",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 23,
    "handicap": 5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426947786",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 4.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426947855",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 25,
    "handicap": 4.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426947897",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 4.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426947930",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 28,
    "handicap": 4.5,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "426948121",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 4.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426948183",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 4.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426948258",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 4.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426948345",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 32,
    "handicap": 4.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426948398",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 4.25,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "426948545",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 4.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426948621",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 4.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426948745",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 4.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426948765",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 4.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "426948904",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 4.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "426948975",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 4.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "426949054",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 4,
    "over": 1.8,
    "under": 2,
    "sourceId": "426949116",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 44,
    "handicap": 4,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426949198",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 4.75,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "426950405",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426950474",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 5,
    "over": 2,
    "under": 1.8,
    "sourceId": "426950514",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 48,
    "handicap": 4.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "426950575",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 49,
    "handicap": 5.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "426950700",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 50,
    "handicap": 5.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426950778",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 51,
    "handicap": 5.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "426950847",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 52,
    "handicap": 5.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426950903",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 53,
    "handicap": 5.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426950943",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 55,
    "handicap": 5.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426951059",
    "half": 2
  }
]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": 1,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250036945",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250037005",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250037056",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": 0.75,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250037066",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250037110",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250037145",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250037177",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250037212",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250037287",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 13,
    "handicap": 0.75,
    "home": 2,
    "away": 1.8,
    "sourceId": "250037332",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 14,
    "handicap": 1,
    "home": 1.8,
    "away": 2,
    "sourceId": "250037380",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 15,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250037414",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250037440",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037478",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037518",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": 0.75,
    "home": 2,
    "away": 1.8,
    "sourceId": "250037551",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 20,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037584",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 22,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037686",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 23,
    "handicap": 1,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "250037733",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 24,
    "handicap": 1,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "250037780",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 25,
    "handicap": 1,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "250037790",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.75,
    "sourceId": "250037855",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": 1,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "250037902",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": 1,
    "home": 1.8,
    "away": 2,
    "sourceId": "250037947",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 30,
    "handicap": 0.75,
    "home": 2,
    "away": 1.8,
    "sourceId": "250037987",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 31,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250038014",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 32,
    "handicap": 0.75,
    "home": 2,
    "away": 1.8,
    "sourceId": "250038064",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 33,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250038110",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 35,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250038147",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250038203",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 37,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250038225",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 38,
    "handicap": 0.75,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250038263",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250038313",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 40,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250038332",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 41,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250038412",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 42,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250038461",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 43,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250038501",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 44,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250038531",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": 0.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "250039252",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 46,
    "handicap": 0.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250039289",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 47,
    "handicap": 0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250039346",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 48,
    "handicap": 0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250039376",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 49,
    "handicap": 0.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250039455",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 50,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250039512",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 51,
    "handicap": 0.75,
    "home": 2,
    "away": 1.8,
    "sourceId": "250039566",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 53,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250039605",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 54,
    "handicap": 0.75,
    "home": 2,
    "away": 1.8,
    "sourceId": "250039668",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 55,
    "handicap": 0.75,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250039697",
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
    "handicap": 1.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "185532964",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "185533019",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "185533063",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "185533089",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185533117",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185533132",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "185533156",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 1.25,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "185533197",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 1.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "185533241",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 1.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185533276",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 1.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185533298",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 1.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185533356",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 1.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185533396",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 2.25,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "185533454",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 2,
    "over": 1.8,
    "under": 2,
    "sourceId": "185533504",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 2,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185533552",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185533589",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 2,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "185533627",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185533654",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 2,
    "over": 2,
    "under": 1.8,
    "sourceId": "185533681",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 1.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "185533694",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185533718",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 23,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "185533743",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185533778",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 25,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185533800",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 2.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185533843",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 2.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185533853",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185533940",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 2.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "185533975",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185534023",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185534056",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185534079",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "185534115",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 2.5,
    "over": 2.2,
    "under": 1.65,
    "sourceId": "185534158",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 36,
    "handicap": 2.5,
    "over": 2.375,
    "under": 1.55,
    "sourceId": "185534221",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 37,
    "handicap": 2.5,
    "over": 2.5,
    "under": 1.5,
    "sourceId": "185534259",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 2.5,
    "over": 2.6,
    "under": 1.475,
    "sourceId": "185534295",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 2.5,
    "over": 2.85,
    "under": 1.4,
    "sourceId": "185534319",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 2.5,
    "over": 3.3,
    "under": 1.325,
    "sourceId": "185534369",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 2.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "185534394",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 2.5,
    "over": 3.8,
    "under": 1.25,
    "sourceId": "185534410",
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
    "handicap": 0.5,
    "home": 1.725,
    "away": 1.975,
    "sourceId": "104128692",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 2,
    "handicap": 0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "104128715",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 4,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "104128756",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": 0.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "104128778",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": 0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104128786",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": 0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104128806",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": 0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104128814",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104128843",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": 0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104128848",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104128871",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 12,
    "handicap": 0.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104128908",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 13,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128934",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 14,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128966",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 15,
    "handicap": 0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104128993",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 16,
    "handicap": 0.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "104129027",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 17,
    "handicap": 0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104129044",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104129063",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 19,
    "handicap": 0.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "104129094",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 20,
    "handicap": 0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104129110",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 22,
    "handicap": 0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104129134",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 23,
    "handicap": 0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104129154",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 24,
    "handicap": 0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104129169",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 25,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "104129174",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104129197",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104129228",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 28,
    "handicap": 0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104129256",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 29,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104129274",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 30,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "104129298",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 31,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "104129310",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 32,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "104129327",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "104129336",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 35,
    "handicap": 0.25,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "104129365",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 36,
    "handicap": 0.25,
    "home": 1.55,
    "away": 2.375,
    "sourceId": "104129372",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0.25,
    "home": 1.425,
    "away": 2.625,
    "sourceId": "104129411",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0.25,
    "home": 1.425,
    "away": 2.625,
    "sourceId": "104129432",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 39,
    "handicap": 0.25,
    "home": 1.375,
    "away": 2.825,
    "sourceId": "104129446",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 40,
    "handicap": 0,
    "home": 3,
    "away": 1.375,
    "sourceId": "104129472",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 42,
    "handicap": 0,
    "home": 3,
    "away": 1.375,
    "sourceId": "104129491",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._