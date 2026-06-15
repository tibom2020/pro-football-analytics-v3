# Trận đấu — Selangor vs Buriram United

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11886133` |
| Giải | ASEAN Club Championship |
| Tỷ số | 0-1 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1779286113775 |
| timer (raw) | `{"tm":47,"ts":49,"tt":"1","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "32",
    "34"
  ],
  "ball_safe": [
    "7",
    "8"
  ],
  "corners": [
    "0",
    "1"
  ],
  "corner_h": [
    "0",
    "1"
  ],
  "dangerous_attacks": [
    "17",
    "22"
  ],
  "fouls": [
    "1",
    "0"
  ],
  "goalattempts": [
    "0",
    "1"
  ],
  "goals": [
    "0",
    "1"
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
    "3",
    "2"
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
    "0"
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
| 40 | 32 / 34 | 17 / 18 | 1 / 2 | 2 / 2 | 0 / 1 | 1 / 1 | 0 / 0 |
| 41 | 32 / 34 | 17 / 19 | 1 / 2 | 2 / 2 | 0 / 1 | 1 / 1 | 0 / 0 |
| 42 | 32 / 34 | 17 / 19 | 1 / 2 | 2 / 2 | 0 / 1 | 1 / 1 | 0 / 0 |
| 43 | 32 / 34 | 17 / 19 | 1 / 2 | 2 / 2 | 0 / 1 | 1 / 1 | 0 / 0 |
| 44 | 32 / 34 | 17 / 19 | 1 / 2 | 2 / 2 | 0 / 1 | 1 / 1 | 0 / 0 |
| 45 | 32 / 34 | 17 / 20 | 1 / 3 | 3 / 2 | 0 / 1 | 2 / 1 | 0 / 0 |
| 46 | 32 / 34 | 17 / 20 | 1 / 3 | 3 / 2 | 0 / 1 | 2 / 1 | 0 / 0 |
| 47 | 32 / 34 | 17 / 22 | 1 / 3 | 3 / 2 | 0 / 1 | 2 / 1 | 0 / 0 |
| 48 | 32 / 34 | 17 / 19 | 1 / 2 | 3 / 2 | 0 / 1 | 2 / 1 | 0 / 0 |
| 557 | 32 / 34 | 17 / 20 | 1 / 3 | 3 / 2 | 0 / 1 | 2 / 1 | 0 / 0 |
| 559 | 32 / 34 | 17 / 22 | 1 / 3 | 3 / 2 | 0 / 1 | 2 / 1 | 0 / 0 |

## Sự kiện trận (goal, corner)

_Không có sự kiện lưu._

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm._

| Phút | Hiệp | GoalProb | Đoán nhãn | Chấm | Nguồn | Đúng/Sai | Heuristic | Ollama | GPT |
|------|------|----------|-----------|------|-------|----------|-----------|--------|-----|
| 45 | 2 | 50.7% | có | — | — | — | GoalProb 15' 51% · 5' tới 42% · DA tổng +37 (3p) · Top feature: ah12_handicap=0.00 | Tổng 37 cú sút gần đây và xác suất có bàn 50.7% trong 15p tới cho thấy áp lực tấn công cao, dù chưa có bàn nào. Kèo Tài nghiêng về chủ nhà. | GoalProb 50.7%, 3 phút gần đây có 9 cú sút (4 trúng đích), tỷ số 0-0, áp lực tấn công từ cả hai đội — khả năng ghi bàn cao trong 15 phút tới. |

**Tổng số lần dự đoán:** 1
_Chưa có verdict nào — chưa tính accuracy._

_Model: `v1` · AUC 0.506 · 255 trận train · trained 2026-05-20T13:05:54.961475_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 44 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 2.75 | 1.95 | 1.85 |
| 3 | 1 | 2.5 | 1.80 | 2.00 |
| 4 | 1 | 2.5 | 1.82 | 1.98 |
| 5 | 1 | 2.5 | 1.88 | 1.93 |
| 6 | 1 | 2.5 | 1.93 | 1.88 |
| 7 | 1 | 2.5 | 1.95 | 1.85 |
| 8 | 1 | 2.5 | 1.98 | 1.82 |
| 9 | 1 | 2.25 | 1.75 | 1.95 |
| 10 | 1 | 2.25 | 1.80 | 2.00 |
| 11 | 1 | 2.25 | 1.82 | 1.98 |
| 12 | 1 | 2.25 | 1.90 | 1.90 |
| 13 | 1 | 2.25 | 1.95 | 1.85 |
| 14 | 1 | 2.25 | 1.98 | 1.82 |
| 15 | 1 | 2.25 | 2.00 | 1.80 |
| 17 | 1 | 2.25 | 2.02 | 1.77 |
| 18 | 1 | 2 | 1.77 | 2.02 |
| 19 | 1 | 2 | 1.88 | 1.93 |
| 20 | 1 | 2 | 1.90 | 1.90 |
| 21 | 1 | 2 | 1.95 | 1.85 |
| 22 | 1 | 2 | 2.00 | 1.80 |
| 24 | 1 | 3 | 1.82 | 1.98 |
| 26 | 1 | 3 | 1.93 | 1.88 |
| 27 | 1 | 3 | 1.93 | 1.88 |
| 29 | 1 | 2.75 | 1.82 | 1.98 |
| 30 | 1 | 2.75 | 1.77 | 2.02 |
| 31 | 1 | 2.75 | 1.80 | 2.00 |
| 33 | 1 | 2.75 | 1.82 | 1.98 |
| 34 | 1 | 2.75 | 1.93 | 1.88 |
| 35 | 1 | 2.75 | 1.95 | 1.85 |
| 36 | 1 | 2.75 | 1.98 | 1.82 |
| 37 | 1 | 2.75 | 1.98 | 1.82 |
| 38 | 1 | 2.5 | 1.82 | 1.98 |
| 39 | 1 | 2.5 | 1.85 | 1.95 |
| 40 | 1 | 2.5 | 1.90 | 1.90 |
| 41 | 1 | 2.5 | 1.93 | 1.88 |
| 42 | 1 | 2.5 | 1.95 | 1.85 |
| 43 | 1 | 2.5 | 1.98 | 1.82 |
| 44 | 1 | 2.5 | 2.00 | 1.80 |
| 45 | 1 | 2.5 | 2.00 | 1.80 |
| 46 | 1 | 2.5 | 2.02 | 1.77 |
| 47 | 1 | 2.5 | 2.05 | 1.75 |
| 48 | 1 | 2.25 | 1.80 | 2.00 |
| 45 | 2 | 2.25 | 1.90 | 1.90 |
| 47 | 2 | 2.25 | 1.95 | 1.85 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 1 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.050
- **H1 — Xỉu:** 29 lần; tổng biên độ giảm 1.150; bước lớn nhất 0.100
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** 1 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.050

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 36 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 3 | 1 | 0.5 | 1.82 | 1.98 |
| 4 | 1 | 0.5 | 1.80 | 2.00 |
| 6 | 1 | 0.25 | 1.95 | 1.75 |
| 7 | 1 | 0.25 | 1.95 | 1.75 |
| 8 | 1 | 0.5 | 1.77 | 2.02 |
| 9 | 1 | 0.25 | 2.00 | 1.80 |
| 10 | 1 | 0.25 | 1.98 | 1.82 |
| 12 | 1 | 0.25 | 2.00 | 1.80 |
| 14 | 1 | 0.25 | 1.98 | 1.82 |
| 16 | 1 | 0.25 | 1.98 | 1.82 |
| 17 | 1 | 0.25 | 1.98 | 1.82 |
| 18 | 1 | 0.25 | 1.98 | 1.82 |
| 19 | 1 | 0.25 | 2.00 | 1.80 |
| 20 | 1 | 0.25 | 1.98 | 1.82 |
| 21 | 1 | 0.25 | 1.95 | 1.85 |
| 22 | 1 | 0.25 | 1.90 | 1.90 |
| 24 | 1 | 0.25 | 1.85 | 1.95 |
| 26 | 1 | 0.25 | 1.75 | 2.05 |
| 27 | 1 | 0.25 | 1.75 | 2.05 |
| 29 | 1 | 0.25 | 1.80 | 2.00 |
| 30 | 1 | 0.25 | 1.80 | 2.00 |
| 31 | 1 | 0.25 | 1.80 | 2.00 |
| 33 | 1 | 0.25 | 1.80 | 2.00 |
| 34 | 1 | 0.25 | 1.77 | 2.02 |
| 36 | 1 | 0.25 | 1.75 | 2.05 |
| 37 | 1 | 0.25 | 1.77 | 2.02 |
| 38 | 1 | 0.25 | 1.73 | 2.08 |
| 39 | 1 | 0 | 2.08 | 1.73 |
| 40 | 1 | 0 | 2.08 | 1.73 |
| 41 | 1 | 0.25 | 1.73 | 2.08 |
| 43 | 1 | 0 | 2.05 | 1.75 |
| 44 | 1 | 0 | 2.02 | 1.77 |
| 45 | 1 | 0 | 2.00 | 1.80 |
| 48 | 1 | 0 | 1.98 | 1.82 |
| 45 | 2 | 0 | 1.93 | 1.88 |
| 46 | 2 | 0 | 1.95 | 1.85 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 14 lần; tổng biên độ giảm 0.500; bước lớn nhất 0.100
- **H1 — Khách:** 4 lần; tổng biên độ giảm 0.125; bước lớn nhất 0.050
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** 1 lần; tổng biên độ giảm 0.025; bước lớn nhất 0.025

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 39 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1 | 1.73 | 2.08 |
| 2 | 1 | 1 | 1.77 | 2.02 |
| 3 | 1 | 1 | 1.82 | 1.98 |
| 4 | 1 | 1 | 1.88 | 1.93 |
| 5 | 1 | 1 | 1.95 | 1.85 |
| 6 | 1 | 1 | 2.02 | 1.77 |
| 7 | 1 | 1 | 2.05 | 1.75 |
| 8 | 1 | 1 | 2.08 | 1.73 |
| 9 | 1 | 0.75 | 1.73 | 2.08 |
| 10 | 1 | 0.75 | 1.75 | 2.05 |
| 11 | 1 | 0.75 | 1.80 | 2.00 |
| 12 | 1 | 0.75 | 1.85 | 1.95 |
| 13 | 1 | 0.75 | 1.90 | 1.90 |
| 14 | 1 | 0.75 | 1.95 | 1.85 |
| 15 | 1 | 0.75 | 2.00 | 1.80 |
| 16 | 1 | 0.75 | 2.02 | 1.77 |
| 17 | 1 | 0.5 | 1.77 | 2.02 |
| 18 | 1 | 0.5 | 1.80 | 2.00 |
| 19 | 1 | 0.5 | 1.85 | 1.95 |
| 20 | 1 | 0.5 | 1.88 | 1.93 |
| 21 | 1 | 0.5 | 1.95 | 1.85 |
| 22 | 1 | 0.5 | 1.98 | 1.82 |
| 23 | 1 | 0.5 | 2.00 | 1.80 |
| 24 | 1 | 1.5 | 1.90 | 1.90 |
| 26 | 1 | 1.5 | 2.15 | 1.68 |
| 27 | 1 | 1.5 | 2.15 | 1.68 |
| 29 | 1 | 1.5 | 2.38 | 1.55 |
| 30 | 1 | 1.5 | 2.35 | 1.57 |
| 31 | 1 | 1.5 | 2.38 | 1.55 |
| 33 | 1 | 1.5 | 2.60 | 1.48 |
| 34 | 1 | 1.5 | 2.75 | 1.43 |
| 35 | 1 | 1.5 | 3.00 | 1.38 |
| 36 | 1 | 1.5 | 3.10 | 1.35 |
| 37 | 1 | 1.5 | 3.30 | 1.32 |
| 38 | 1 | 1.5 | 3.70 | 1.26 |
| 39 | 1 | 1.5 | 4.10 | 1.23 |
| 40 | 1 | 1.5 | 4.65 | 1.18 |
| 41 | 1 | 1.5 | 5.75 | 1.14 |
| 42 | 1 | 1.5 | 5.75 | 1.14 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 1 lần; tổng biên độ giảm 0.025; bước lớn nhất 0.025
- **H1 — Xỉu:** 32 lần; tổng biên độ giảm 1.660; bước lớn nhất 0.225
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 22 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 0.25 | 1.75 | 2.05 |
| 3 | 1 | 0.25 | 1.73 | 2.08 |
| 4 | 1 | 0.25 | 1.70 | 2.10 |
| 5 | 1 | 0.25 | 1.68 | 2.15 |
| 6 | 1 | 0.25 | 1.65 | 2.20 |
| 9 | 1 | 0.25 | 1.63 | 2.25 |
| 10 | 1 | 0 | 2.25 | 1.63 |
| 14 | 1 | 0 | 2.25 | 1.63 |
| 18 | 1 | 0 | 2.30 | 1.60 |
| 21 | 1 | 0 | 2.25 | 1.63 |
| 23 | 1 | 0 | 2.20 | 1.65 |
| 24 | 1 | 0 | 2.15 | 1.68 |
| 26 | 1 | 0 | 2.08 | 1.73 |
| 27 | 1 | 0 | 2.08 | 1.73 |
| 29 | 1 | 0 | 2.15 | 1.68 |
| 30 | 1 | 0 | 2.05 | 1.75 |
| 31 | 1 | 0 | 2.05 | 1.75 |
| 33 | 1 | 0 | 2.15 | 1.68 |
| 34 | 1 | 0 | 2.10 | 1.70 |
| 37 | 1 | 0 | 2.10 | 1.70 |
| 38 | 1 | 0 | 2.15 | 1.68 |
| 41 | 1 | 0 | 2.20 | 1.65 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 11 lần; tổng biên độ giảm 0.500; bước lớn nhất 0.100
- **H1 — Khách:** 5 lần; tổng biên độ giảm 0.200; bước lớn nhất 0.075
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 30 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 48 | 2 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 30 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 4 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 5 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 6 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 9 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 21 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 23 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 24 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 26 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 34 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424066896",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 2.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "424067090",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424067187",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424067283",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424067354",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424067438",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 2.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424067572",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 2.25,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "424067657",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 2.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "424067763",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424067875",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424067985",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 13,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424068046",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 2.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424068078",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 2.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "424068204",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 2.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424068473",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 2,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424068510",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 2,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "424068711",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424068809",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424068917",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 2,
    "over": 2,
    "under": 1.8,
    "sourceId": "424069043",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 3,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424069277",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 3,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424069473",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 3,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424069544",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424069813",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 2.75,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "424069928",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 2.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "424070020",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 33,
    "handicap": 2.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424070306",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 34,
    "handicap": 2.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424070447",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 35,
    "handicap": 2.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424070462",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 36,
    "handicap": 2.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424070496",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 37,
    "handicap": 2.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424070575",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 38,
    "handicap": 2.5,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "424070627",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 39,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "424070661",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 40,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424070808",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 41,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "424070887",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 42,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424070980",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 43,
    "handicap": 2.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "424071118",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 44,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "424071178",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 2.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "424071289",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 46,
    "handicap": 2.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "424071360",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 2.5,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "424071428",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 48,
    "handicap": 2.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "424071562",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 45,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "424072877",
    "half": 2
  },
  {
    "marketId": "1_3",
    "minute": 47,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "424073107",
    "half": 2
  }
]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "248327339",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": 0.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "248327409",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.75,
    "sourceId": "248327501",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.75,
    "sourceId": "248327606",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": 0.5,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "248327676",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "248327739",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248327771",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "248327898",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 14,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248328018",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248328167",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248328267",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248328306",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": 0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "248328389",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 20,
    "handicap": 0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248328448",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 21,
    "handicap": 0.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248328528",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 22,
    "handicap": 0.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "248328602",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 24,
    "handicap": 0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "248328750",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "248328880",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "248328922",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "248329071",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 30,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "248329140",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 31,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "248329206",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 33,
    "handicap": 0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "248329351",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 34,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "248329432",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 36,
    "handicap": 0.25,
    "home": 1.75,
    "away": 2.05,
    "sourceId": "248329500",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 37,
    "handicap": 0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "248329524",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 38,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "248329598",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 39,
    "handicap": 0,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "248329624",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 40,
    "handicap": 0,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "248329710",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 41,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "248329752",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 43,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "248329912",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 44,
    "handicap": 0,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "248329950",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": 0,
    "home": 2,
    "away": 1.8,
    "sourceId": "248330023",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 48,
    "handicap": 0,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "248330139",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 45,
    "handicap": 0,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "248330728",
    "half": 2
  },
  {
    "marketId": "1_2",
    "minute": 46,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "248331022",
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
    "handicap": 1,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "184242245",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184242311",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "184242374",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "184242439",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184242507",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "184242559",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "184242602",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 1,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "184242662",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 0.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "184242696",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 0.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "184242743",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 0.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "184242788",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 0.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184242826",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 0.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184242849",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 0.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184242901",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 0.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "184242990",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 0.75,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "184243075",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 0.5,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "184243192",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 0.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "184243254",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 0.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "184243335",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 0.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "184243382",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 0.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "184243418",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 0.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "184243466",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 23,
    "handicap": 0.5,
    "over": 2,
    "under": 1.8,
    "sourceId": "184243501",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 1.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "184243584",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 1.5,
    "over": 2.15,
    "under": 1.675,
    "sourceId": "184243702",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 1.5,
    "over": 2.15,
    "under": 1.675,
    "sourceId": "184243744",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 1.5,
    "over": 2.375,
    "under": 1.55,
    "sourceId": "184243905",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 1.5,
    "over": 2.35,
    "under": 1.575,
    "sourceId": "184243973",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 1.5,
    "over": 2.375,
    "under": 1.55,
    "sourceId": "184244032",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 1.5,
    "over": 2.6,
    "under": 1.475,
    "sourceId": "184244202",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 34,
    "handicap": 1.5,
    "over": 2.75,
    "under": 1.425,
    "sourceId": "184244254",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 35,
    "handicap": 1.5,
    "over": 3,
    "under": 1.375,
    "sourceId": "184244303",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 36,
    "handicap": 1.5,
    "over": 3.1,
    "under": 1.35,
    "sourceId": "184244322",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 37,
    "handicap": 1.5,
    "over": 3.3,
    "under": 1.325,
    "sourceId": "184244370",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 38,
    "handicap": 1.5,
    "over": 3.7,
    "under": 1.26,
    "sourceId": "184244382",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 39,
    "handicap": 1.5,
    "over": 4.1,
    "under": 1.225,
    "sourceId": "184244415",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 40,
    "handicap": 1.5,
    "over": 4.65,
    "under": 1.18,
    "sourceId": "184244503",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 41,
    "handicap": 1.5,
    "over": 5.75,
    "under": 1.14,
    "sourceId": "184244593",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 42,
    "handicap": 1.5,
    "over": 5.75,
    "under": 1.14,
    "sourceId": "184244624",
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
    "home": 1.75,
    "away": 2.05,
    "sourceId": "103382768",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 3,
    "handicap": 0.25,
    "home": 1.725,
    "away": 2.075,
    "sourceId": "103382821",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 4,
    "handicap": 0.25,
    "home": 1.7,
    "away": 2.1,
    "sourceId": "103382881",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": 0.25,
    "home": 1.675,
    "away": 2.15,
    "sourceId": "103382904",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": 0.25,
    "home": 1.65,
    "away": 2.2,
    "sourceId": "103382948",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": 0.25,
    "home": 1.625,
    "away": 2.25,
    "sourceId": "103383025",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": 0,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "103383048",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 14,
    "handicap": 0,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "103383118",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 0,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "103383255",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 21,
    "handicap": 0,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "103383359",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 23,
    "handicap": 0,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "103383410",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 24,
    "handicap": 0,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103383452",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "103383528",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "103383566",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 29,
    "handicap": 0,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103383670",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 30,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103383711",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 31,
    "handicap": 0,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "103383745",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 33,
    "handicap": 0,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103383811",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 34,
    "handicap": 0,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103383851",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 37,
    "handicap": 0,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "103383931",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 38,
    "handicap": 0,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "103383941",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 41,
    "handicap": 0,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "103384043",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._