# Trận đấu — Hellenic AC vs University Azzurri FC

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11810361` |
| Giải | Australia Darwin Premier League |
| Tỷ số | 0-1 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1781428328651 |
| timer (raw) | `{"tm":33,"ts":13,"tt":"1","ta":0,"md":0}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "33",
    "38"
  ],
  "ball_safe": [
    "19",
    "14"
  ],
  "corners": [
    "0",
    "4"
  ],
  "dangerous_attacks": [
    "17",
    "33"
  ],
  "fouls": [
    "0",
    "1"
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
    "0",
    "1"
  ],
  "on_target": [
    "1",
    "2"
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
    "0",
    "0"
  ],
  "substitutions": [
    "0",
    "0"
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

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A | xG nhà | xG khách |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|----------|----------|
| 31 | 32 / 35 | 16 / 32 | 1 / 2 | 0 / 1 | 0 / 4 | 0 / 0 | 0 / 0 | — | — |
| 32 | 33 / 38 | 17 / 33 | 1 / 2 | 0 / 1 | 0 / 4 | 0 / 0 | 0 / 0 | — | — |
| 33 | 33 / 38 | 17 / 33 | 1 / 2 | 0 / 1 | 0 / 4 | 0 / 0 | 0 / 0 | — | — |

## Sự kiện trận (goal, corner)

_Không có sự kiện lưu._

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._

**Tổng số lần dự đoán:** 1

### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)

| Phút | Hiệp | GoalProb 30' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 32 | 1 | 85.6% | có | — | — | — |

_Cửa sổ 30': chưa có verdict nào — chưa tính accuracy._

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 32 | 1 | 39.8% | không | — | — | — |

_Cửa sổ 15': chưa có verdict nào — chưa tính accuracy._

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 32 | 1 | Khả năng có bàn trong 30' tới đang ở mức cao (~86%), bóng nguy hiểm dồn dập (+48 trong 3 phút), có 3 cú dứt điểm trúng đích gần đây. | Bóng nguy hiểm đang dồn dập từ cả hai đội, đặc biệt là chủ nhà. Nhà cái cũng đã kéo kèo Tài, cho thấy họ tin vào khả năng có bàn thắng. Những trận tương tự trước đây thường vỡ òa trong 30 phút tới. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |

_Model (30'): `v3` · AUC 0.560 · 296 trận train · trained 2026-06-11T20:03:13.957737_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 31 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 5.25 | 1.82 | 1.98 |
| 2 | 1 | 5.25 | 1.95 | 1.85 |
| 3 | 1 | 5.25 | 1.88 | 1.93 |
| 4 | 1 | 5.25 | 1.85 | 1.95 |
| 5 | 1 | 5.25 | 1.88 | 1.93 |
| 6 | 1 | 5.25 | 1.85 | 1.95 |
| 7 | 1 | 5.25 | 1.88 | 1.93 |
| 9 | 1 | 5.25 | 1.90 | 1.90 |
| 10 | 1 | 5 | 1.88 | 1.93 |
| 11 | 1 | 5 | 1.88 | 1.93 |
| 12 | 1 | 5 | 1.90 | 1.90 |
| 13 | 1 | 5 | 1.88 | 1.93 |
| 14 | 1 | 5.25 | 1.95 | 1.85 |
| 15 | 1 | 5 | 1.90 | 1.90 |
| 16 | 1 | 5 | 1.85 | 1.95 |
| 17 | 1 | 5 | 1.90 | 1.90 |
| 18 | 1 | 4.75 | 1.77 | 1.93 |
| 19 | 1 | 4.75 | 1.90 | 1.90 |
| 20 | 1 | 4.75 | 1.95 | 1.85 |
| 21 | 1 | 4.75 | 1.95 | 1.85 |
| 22 | 1 | 4.25 | 1.80 | 1.90 |
| 23 | 1 | 4.5 | 1.93 | 1.88 |
| 24 | 1 | 4.5 | 1.98 | 1.82 |
| 25 | 1 | 4.5 | 1.90 | 1.90 |
| 26 | 1 | 4 | 1.85 | 1.95 |
| 27 | 1 | 4 | 1.85 | 1.95 |
| 28 | 1 | 3.75 | 1.82 | 1.98 |
| 29 | 1 | 4.75 | 1.93 | 1.88 |
| 30 | 1 | 4.75 | 1.90 | 1.90 |
| 31 | 1 | 4.5 | 1.85 | 1.95 |
| 32 | 1 | 4.5 | 1.90 | 1.90 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 7 lần; tổng biên độ giảm 0.300; bước lớn nhất 0.075
- **H1 — Xỉu:** 10 lần; tổng biên độ giảm 0.450; bước lớn nhất 0.125
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 32 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 3 | 1.90 | 1.90 |
| 2 | 1 | 3 | 1.82 | 1.98 |
| 3 | 1 | 3 | 1.95 | 1.85 |
| 4 | 1 | 3.25 | 1.77 | 1.93 |
| 5 | 1 | 3 | 1.90 | 1.80 |
| 6 | 1 | 3.25 | 1.85 | 1.95 |
| 7 | 1 | 3.25 | 1.85 | 1.95 |
| 8 | 1 | 3.25 | 1.88 | 1.93 |
| 9 | 1 | 3.25 | 1.77 | 1.93 |
| 10 | 1 | 3 | 1.93 | 1.88 |
| 11 | 1 | 2.75 | 1.90 | 1.80 |
| 12 | 1 | 3 | 1.85 | 1.95 |
| 13 | 1 | 3 | 1.95 | 1.85 |
| 14 | 1 | 3 | 1.90 | 1.80 |
| 15 | 1 | 3.25 | 1.77 | 1.93 |
| 16 | 1 | 3 | 1.95 | 1.85 |
| 17 | 1 | 3 | 1.88 | 1.93 |
| 18 | 1 | 3 | 1.77 | 1.93 |
| 19 | 1 | 2.75 | 1.90 | 1.90 |
| 20 | 1 | 2.75 | 1.88 | 1.93 |
| 21 | 1 | 2.75 | 1.82 | 1.98 |
| 22 | 1 | 2.5 | 1.88 | 1.93 |
| 23 | 1 | 2.5 | 1.95 | 1.85 |
| 24 | 1 | 2.5 | 1.90 | 1.90 |
| 25 | 1 | 2.75 | 1.77 | 1.93 |
| 26 | 1 | 2.25 | 1.93 | 1.88 |
| 27 | 1 | 2.25 | 1.95 | 1.85 |
| 28 | 1 | 2.25 | 1.95 | 1.85 |
| 29 | 1 | 2.25 | 1.95 | 1.85 |
| 30 | 1 | 2.25 | 1.88 | 1.93 |
| 31 | 1 | 2.25 | 1.95 | 1.85 |
| 32 | 1 | 2 | 1.98 | 1.82 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 9 lần; tổng biên độ giảm 0.600; bước lớn nhất 0.100
- **H1 — Khách:** 7 lần; tổng biên độ giảm 0.475; bước lớn nhất 0.125
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 33 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 2.25 | 1.82 | 1.98 |
| 2 | 1 | 2.25 | 1.90 | 1.90 |
| 3 | 1 | 2.25 | 1.93 | 1.88 |
| 4 | 1 | 2.25 | 1.90 | 1.90 |
| 5 | 1 | 2.25 | 1.95 | 1.85 |
| 6 | 1 | 2.25 | 1.95 | 1.85 |
| 7 | 1 | 2.25 | 2.00 | 1.80 |
| 8 | 1 | 2 | 1.82 | 1.98 |
| 9 | 1 | 2 | 1.85 | 1.95 |
| 10 | 1 | 2 | 1.95 | 1.85 |
| 11 | 1 | 1.75 | 1.82 | 1.98 |
| 12 | 1 | 1.75 | 1.90 | 1.90 |
| 13 | 1 | 1.75 | 1.85 | 1.95 |
| 14 | 1 | 1.75 | 1.95 | 1.85 |
| 15 | 1 | 1.5 | 1.80 | 2.00 |
| 16 | 1 | 1.5 | 1.85 | 1.95 |
| 17 | 1 | 1.5 | 1.90 | 1.90 |
| 18 | 1 | 1.5 | 1.98 | 1.82 |
| 19 | 1 | 1.25 | 1.80 | 2.00 |
| 20 | 1 | 1.25 | 1.82 | 1.98 |
| 21 | 1 | 1.25 | 1.95 | 1.85 |
| 22 | 1 | 1.25 | 2.05 | 1.68 |
| 23 | 1 | 1.25 | 2.02 | 1.77 |
| 24 | 1 | 1 | 1.73 | 1.98 |
| 25 | 1 | 1 | 1.73 | 2.08 |
| 26 | 1 | 1 | 1.85 | 1.95 |
| 27 | 1 | 1 | 2.05 | 1.75 |
| 28 | 1 | 0.75 | 1.73 | 2.08 |
| 29 | 1 | 1.75 | 1.75 | 2.05 |
| 30 | 1 | 1.75 | 1.88 | 1.93 |
| 31 | 1 | 1.75 | 1.95 | 1.85 |
| 32 | 1 | 1.75 | 1.98 | 1.82 |
| 33 | 1 | 1.75 | 2.00 | 1.80 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 3 lần; tổng biên độ giảm 0.100; bước lớn nhất 0.050
- **H1 — Xỉu:** 20 lần; tổng biên độ giảm 1.575; bước lớn nhất 0.200
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 31 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1.5 | 1.80 | 2.00 |
| 2 | 1 | 1.25 | 2.00 | 1.80 |
| 3 | 1 | 1.25 | 1.98 | 1.82 |
| 5 | 1 | 1.25 | 1.98 | 1.82 |
| 6 | 1 | 1.5 | 1.75 | 1.95 |
| 7 | 1 | 1.25 | 2.00 | 1.80 |
| 8 | 1 | 1.25 | 1.90 | 1.90 |
| 9 | 1 | 1.25 | 1.95 | 1.85 |
| 10 | 1 | 1.25 | 1.85 | 1.95 |
| 11 | 1 | 1 | 2.02 | 1.77 |
| 12 | 1 | 1 | 2.05 | 1.75 |
| 13 | 1 | 1.25 | 1.73 | 1.98 |
| 14 | 1 | 1 | 2.00 | 1.80 |
| 15 | 1 | 1 | 1.93 | 1.88 |
| 16 | 1 | 1 | 1.95 | 1.85 |
| 17 | 1 | 1 | 1.90 | 1.90 |
| 18 | 1 | 1 | 1.77 | 2.02 |
| 19 | 1 | 1 | 1.73 | 1.98 |
| 20 | 1 | 0.75 | 1.98 | 1.82 |
| 21 | 1 | 0.75 | 1.93 | 1.88 |
| 22 | 1 | 0.75 | 1.80 | 2.00 |
| 23 | 1 | 0.75 | 1.98 | 1.82 |
| 24 | 1 | 0.75 | 1.82 | 1.98 |
| 25 | 1 | 0.75 | 1.85 | 1.95 |
| 26 | 1 | 0.5 | 1.98 | 1.73 |
| 27 | 1 | 0.5 | 2.02 | 1.77 |
| 28 | 1 | 0.5 | 1.98 | 1.82 |
| 29 | 1 | 0.5 | 1.95 | 1.85 |
| 30 | 1 | 0.5 | 1.82 | 1.98 |
| 31 | 1 | 0.5 | 1.80 | 2.00 |
| 32 | 1 | 0.25 | 2.10 | 1.65 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 14 lần; tổng biên độ giảm 1.075; bước lớn nhất 0.150
- **H1 — Khách:** 6 lần; tổng biên độ giảm 0.350; bước lớn nhất 0.175
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 4 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 6 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 13 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 16 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 25 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 4 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 13 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |
| 23 | 1 | ou_drop / 1_6 | 1 | Giảm giá Tài (1_6) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 3 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 8 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 10 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 15 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 17 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 18 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 19 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 21 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 22 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 24 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 28 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 29 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 30 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 31 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 5.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426944938",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 5.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426944959",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 5.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426945051",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 5.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426945077",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 5.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426945140",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 5.25,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426945266",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 5.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426945339",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 5.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426945467",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426945599",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426945677",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426945717",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 13,
    "handicap": 5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426945763",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 5.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426945856",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426945924",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426945980",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946039",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 18,
    "handicap": 4.75,
    "over": 1.775,
    "under": 1.925,
    "sourceId": "426946095",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 4.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946125",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 4.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426946151",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 4.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426946190",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 22,
    "handicap": 4.25,
    "over": 1.8,
    "under": 1.9,
    "sourceId": "426946238",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 23,
    "handicap": 4.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426946253",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 24,
    "handicap": 4.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "426946341",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 25,
    "handicap": 4.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946390",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 26,
    "handicap": 4,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426946458",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 27,
    "handicap": 4,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426946531",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 28,
    "handicap": 3.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426946587",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 29,
    "handicap": 4.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426946630",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 30,
    "handicap": 4.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946674",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 31,
    "handicap": 4.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426946722",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 32,
    "handicap": 4.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946793",
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
    "handicap": 3,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250036121",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": 3,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250036155",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": 3,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250036196",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": 3.25,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "250036212",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": 3,
    "home": 1.9,
    "away": 1.8,
    "sourceId": "250036262",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": 3.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250036321",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": 3.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250036343",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": 3.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250036391",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": 3.25,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "250036454",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": 3,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250036506",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 11,
    "handicap": 2.75,
    "home": 1.9,
    "away": 1.8,
    "sourceId": "250036546",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 12,
    "handicap": 3,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250036577",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 13,
    "handicap": 3,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250036608",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 14,
    "handicap": 3,
    "home": 1.9,
    "away": 1.8,
    "sourceId": "250036634",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 15,
    "handicap": 3.25,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "250036673",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": 3,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250036697",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": 3,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250036743",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": 3,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "250036779",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": 2.75,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250036793",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 20,
    "handicap": 2.75,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250036810",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 21,
    "handicap": 2.75,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250036815",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 22,
    "handicap": 2.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250036848",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 23,
    "handicap": 2.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250036852",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 24,
    "handicap": 2.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "250036895",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 25,
    "handicap": 2.75,
    "home": 1.775,
    "away": 1.925,
    "sourceId": "250036925",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 26,
    "handicap": 2.25,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "250036958",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 27,
    "handicap": 2.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250036965",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 28,
    "handicap": 2.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037016",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 29,
    "handicap": 2.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037062",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 30,
    "handicap": 2.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250037086",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 31,
    "handicap": 2.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250037116",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 32,
    "handicap": 2,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250037158",
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
    "handicap": 2.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185532309",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185532340",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "185532365",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185532383",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185532417",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 2.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185532496",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 2.25,
    "over": 2,
    "under": 1.8,
    "sourceId": "185532526",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 2,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185532566",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 2,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185532584",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185532637",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 11,
    "handicap": 1.75,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185532674",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 1.75,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185532685",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 1.75,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185532725",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 1.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185532731",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 1.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "185532766",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 1.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185532782",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 1.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185532805",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 1.5,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185532812",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 1.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "185532820",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 1.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185532826",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 21,
    "handicap": 1.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185532853",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 22,
    "handicap": 1.25,
    "over": 2.05,
    "under": 1.675,
    "sourceId": "185532886",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 23,
    "handicap": 1.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185532892",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 24,
    "handicap": 1,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "185532948",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 25,
    "handicap": 1,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "185533002",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 26,
    "handicap": 1,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185533043",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 27,
    "handicap": 1,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185533074",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 28,
    "handicap": 0.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "185533102",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 29,
    "handicap": 1.75,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185533125",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 30,
    "handicap": 1.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "185533147",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 31,
    "handicap": 1.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185533174",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 32,
    "handicap": 1.75,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185533208",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 33,
    "handicap": 1.75,
    "over": 2,
    "under": 1.8,
    "sourceId": "185533227",
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
    "handicap": 1.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "104128290",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 2,
    "handicap": 1.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "104128300",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 3,
    "handicap": 1.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128324",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": 1.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128365",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": 1.5,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "104128405",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": 1.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "104128423",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": 1.25,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104128442",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": 1.25,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104128463",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": 1.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104128486",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": 1,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "104128510",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 12,
    "handicap": 1,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "104128518",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 13,
    "handicap": 1.25,
    "home": 1.725,
    "away": 1.975,
    "sourceId": "104128544",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 14,
    "handicap": 1,
    "home": 2,
    "away": 1.8,
    "sourceId": "104128563",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 15,
    "handicap": 1,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104128579",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 16,
    "handicap": 1,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104128581",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 17,
    "handicap": 1,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104128590",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 18,
    "handicap": 1,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "104128607",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 19,
    "handicap": 1,
    "home": 1.725,
    "away": 1.975,
    "sourceId": "104128611",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 20,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128624",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 21,
    "handicap": 0.75,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104128635",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 22,
    "handicap": 0.75,
    "home": 1.8,
    "away": 2,
    "sourceId": "104128652",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 23,
    "handicap": 0.75,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128663",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 24,
    "handicap": 0.75,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104128691",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 25,
    "handicap": 0.75,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104128704",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 26,
    "handicap": 0.5,
    "home": 1.975,
    "away": 1.725,
    "sourceId": "104128736",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 27,
    "handicap": 0.5,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "104128749",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 28,
    "handicap": 0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128762",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 29,
    "handicap": 0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104128781",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 30,
    "handicap": 0.5,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "104128793",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 31,
    "handicap": 0.5,
    "home": 1.8,
    "away": 2,
    "sourceId": "104128803",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 32,
    "handicap": 0.25,
    "home": 2.1,
    "away": 1.65,
    "sourceId": "104128831",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._