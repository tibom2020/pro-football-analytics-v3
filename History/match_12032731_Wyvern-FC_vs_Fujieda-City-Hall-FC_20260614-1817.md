# Trận đấu — Wyvern FC vs Fujieda City Hall FC

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `12032731` |
| Giải | Japan Regional League |
| Tỷ số | 0-0 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1781428825560 |
| timer (raw) | `{"tm":20,"ts":4,"tt":"1","ta":0,"md":0}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "17",
    "17"
  ],
  "corners": [
    "0",
    "2"
  ],
  "dangerous_attacks": [
    "7",
    "10"
  ],
  "goals": [
    "0",
    "0"
  ],
  "off_target": [
    "0",
    "0"
  ],
  "on_target": [
    "0",
    "1"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "49",
    "51"
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
    "0"
  ]
}
```

## Vé cược (betTickets)

_Không có vé cho trận này trong localStorage._

## Thống kê theo phút (statsHistory)

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A | xG nhà | xG khách |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|----------|----------|
| 10 | 6 / 7 | 3 / 6 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 11 | 7 / 8 | 4 / 7 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 12 | 7 / 8 | 4 / 7 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 13 | 8 / 8 | 5 / 7 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 14 | 10 / 10 | 5 / 8 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 15 | 12 / 12 | 6 / 8 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 16 | 15 / 14 | 6 / 8 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 17 | 16 / 15 | 7 / 8 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 18 | 16 / 16 | 7 / 9 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 19 | 17 / 17 | 7 / 10 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |
| 20 | 18 / 17 | 7 / 10 | 0 / 1 | 0 / 0 | 0 / 2 | 0 / 0 | 0 / 0 | — | — |

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
| 11 | 1 | 62.1% | có | — | — | — |
| 15 | 1 | 60.0% | có | — | — | — |

_Cửa sổ 30': chưa có verdict nào — chưa tính accuracy._

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 11 | 1 | 38.4% | không | — | — | — |
| 15 | 1 | 37.6% | không | — | — | — |

_Cửa sổ 15': chưa có verdict nào — chưa tính accuracy._

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 11 | 1 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~62%), bóng nguy hiểm dồn dập (+9 trong 3 phút). | Bóng nguy hiểm đang dồn dập với chủ nhà hơn, và tỷ lệ các trận tương tự đều có bàn trong 30 phút đầu. Nhà cái cũng chưa đẩy mạnh kèo Tài/Xỉu, cho thấy họ vẫn thận trọng. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |
| 15 | 1 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~60%). | Sức ép đang dồn dập với nhiều tình huống bóng nguy hiểm, và các trận tương tự thường có bàn thắng trong 30 phút tới. Nhà cái cũng chưa đẩy mạnh kèo Tài, cho thấy họ vẫn nghiêng về kịch bản không quá bùng nổ. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |

_Model (30'): `v3` · AUC 0.560 · 296 trận train · trained 2026-06-11T20:03:13.957737_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 15 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 2.5 | 1.85 | 1.95 |
| 2 | 1 | 2.5 | 1.88 | 1.93 |
| 4 | 1 | 2.5 | 1.90 | 1.90 |
| 6 | 1 | 2.5 | 1.93 | 1.88 |
| 7 | 1 | 2.5 | 1.95 | 1.85 |
| 8 | 1 | 2.5 | 1.95 | 1.75 |
| 9 | 1 | 2.25 | 1.80 | 2.00 |
| 10 | 1 | 2.25 | 1.88 | 1.93 |
| 11 | 1 | 2.25 | 1.90 | 1.90 |
| 12 | 1 | 2.25 | 1.93 | 1.88 |
| 14 | 1 | 2.25 | 1.93 | 1.88 |
| 15 | 1 | 2 | 1.77 | 2.02 |
| 16 | 1 | 2 | 1.88 | 1.93 |
| 17 | 1 | 2 | 1.90 | 1.90 |
| 19 | 1 | 2 | 1.95 | 1.85 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** không có bước giảm (cùng HDP)
- **H1 — Xỉu:** 11 lần; tổng biên độ giảm 0.500; bước lớn nhất 0.100
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 15 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.5 | 1.98 | 1.82 |
| 2 | 1 | -0.5 | 1.98 | 1.82 |
| 3 | 1 | -0.5 | 1.95 | 1.75 |
| 4 | 1 | -0.5 | 1.98 | 1.82 |
| 6 | 1 | -0.5 | 2.00 | 1.80 |
| 8 | 1 | -0.25 | 1.75 | 1.95 |
| 9 | 1 | -0.25 | 1.75 | 1.95 |
| 10 | 1 | -0.25 | 1.77 | 2.02 |
| 11 | 1 | -0.25 | 1.80 | 2.00 |
| 15 | 1 | -0.25 | 1.82 | 1.98 |
| 16 | 1 | -0.25 | 1.85 | 1.95 |
| 17 | 1 | -0.25 | 1.85 | 1.95 |
| 18 | 1 | -0.25 | 1.82 | 1.98 |
| 19 | 1 | -0.25 | 1.85 | 1.95 |
| 20 | 1 | -0.25 | 1.88 | 1.93 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 2 lần; tổng biên độ giảm 0.050; bước lớn nhất 0.025
- **H1 — Khách:** 7 lần; tổng biên độ giảm 0.225; bước lớn nhất 0.075
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 19 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1 | 1.80 | 2.00 |
| 2 | 1 | 1 | 1.90 | 1.90 |
| 3 | 1 | 1 | 1.95 | 1.85 |
| 4 | 1 | 1 | 1.98 | 1.82 |
| 5 | 1 | 1 | 2.00 | 1.80 |
| 6 | 1 | 1 | 2.05 | 1.75 |
| 7 | 1 | 1 | 2.08 | 1.73 |
| 8 | 1 | 0.75 | 1.70 | 2.10 |
| 9 | 1 | 0.75 | 1.73 | 2.08 |
| 10 | 1 | 0.75 | 1.80 | 2.00 |
| 12 | 1 | 0.75 | 1.88 | 1.93 |
| 13 | 1 | 0.75 | 1.93 | 1.88 |
| 14 | 1 | 0.75 | 1.95 | 1.85 |
| 15 | 1 | 0.75 | 2.02 | 1.77 |
| 16 | 1 | 0.5 | 1.75 | 2.05 |
| 17 | 1 | 0.5 | 1.80 | 2.00 |
| 18 | 1 | 0.5 | 1.85 | 1.95 |
| 19 | 1 | 0.5 | 1.88 | 1.93 |
| 20 | 1 | 0.5 | 1.93 | 1.88 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** không có bước giảm (cùng HDP)
- **H1 — Xỉu:** 16 lần; tổng biên độ giảm 0.775; bước lớn nhất 0.100
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 12 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.25 | 1.98 | 1.82 |
| 2 | 1 | -0.25 | 1.98 | 1.82 |
| 4 | 1 | -0.25 | 2.00 | 1.80 |
| 5 | 1 | -0.25 | 2.02 | 1.77 |
| 6 | 1 | -0.25 | 2.05 | 1.75 |
| 8 | 1 | -0.25 | 2.08 | 1.73 |
| 10 | 1 | -0.25 | 2.10 | 1.70 |
| 11 | 1 | -0.25 | 2.15 | 1.68 |
| 13 | 1 | -0.25 | 2.20 | 1.65 |
| 15 | 1 | -0.25 | 2.25 | 1.63 |
| 19 | 1 | -0.25 | 2.30 | 1.60 |
| 20 | 1 | -0.25 | 2.35 | 1.57 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** không có bước giảm (cùng HDP)
- **H1 — Khách:** 10 lần; tổng biên độ giảm 0.250; bước lớn nhất 0.025
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

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
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 2.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426946226",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 2.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426946307",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 2.5,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946389",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 2.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426946491",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426946586",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 2.5,
    "over": 1.95,
    "under": 1.75,
    "sourceId": "426946652",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 2.25,
    "over": 1.8,
    "under": 2,
    "sourceId": "426946697",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 2.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426946772",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 11,
    "handicap": 2.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426946779",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 12,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426946858",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 14,
    "handicap": 2.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426946969",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 15,
    "handicap": 2,
    "over": 1.775,
    "under": 2.025,
    "sourceId": "426947048",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 16,
    "handicap": 2,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426947137",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 17,
    "handicap": 2,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426947209",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 19,
    "handicap": 2,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426947359",
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
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250036853",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250036881",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": -0.5,
    "home": 1.95,
    "away": 1.75,
    "sourceId": "250036898",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": -0.5,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "250036932",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": -0.5,
    "home": 2,
    "away": 1.8,
    "sourceId": "250037007",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": -0.25,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "250037059",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": -0.25,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "250037102",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": -0.25,
    "home": 1.775,
    "away": 2.025,
    "sourceId": "250037152",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 11,
    "handicap": -0.25,
    "home": 1.8,
    "away": 2,
    "sourceId": "250037157",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 15,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250037318",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 16,
    "handicap": -0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250037371",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 17,
    "handicap": -0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250037401",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 18,
    "handicap": -0.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "250037421",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": -0.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "250037443",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 20,
    "handicap": -0.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "250037476",
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
    "handicap": 1,
    "over": 1.8,
    "under": 2,
    "sourceId": "185532899",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185532920",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185532966",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185533022",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1,
    "over": 2,
    "under": 1.8,
    "sourceId": "185533036",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1,
    "over": 2.05,
    "under": 1.75,
    "sourceId": "185533066",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "185533101",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 8,
    "handicap": 0.75,
    "over": 1.7,
    "under": 2.1,
    "sourceId": "185533120",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 0.75,
    "over": 1.725,
    "under": 2.075,
    "sourceId": "185533138",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 0.75,
    "over": 1.8,
    "under": 2,
    "sourceId": "185533173",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 12,
    "handicap": 0.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "185533251",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 13,
    "handicap": 0.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "185533296",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 14,
    "handicap": 0.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "185533327",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 15,
    "handicap": 0.75,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185533379",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 16,
    "handicap": 0.5,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185533431",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 17,
    "handicap": 0.5,
    "over": 1.8,
    "under": 2,
    "sourceId": "185533473",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 18,
    "handicap": 0.5,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "185533520",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 19,
    "handicap": 0.5,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "185533573",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 20,
    "handicap": 0.5,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "185533590",
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
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128664",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 2,
    "handicap": -0.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "104128680",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 4,
    "handicap": -0.25,
    "home": 2,
    "away": 1.8,
    "sourceId": "104128724",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": -0.25,
    "home": 2.025,
    "away": 1.775,
    "sourceId": "104128730",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": -0.25,
    "home": 2.05,
    "away": 1.75,
    "sourceId": "104128757",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": -0.25,
    "home": 2.075,
    "away": 1.725,
    "sourceId": "104128785",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": -0.25,
    "home": 2.1,
    "away": 1.7,
    "sourceId": "104128810",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": -0.25,
    "home": 2.15,
    "away": 1.675,
    "sourceId": "104128823",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 13,
    "handicap": -0.25,
    "home": 2.2,
    "away": 1.65,
    "sourceId": "104128869",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 15,
    "handicap": -0.25,
    "home": 2.25,
    "away": 1.625,
    "sourceId": "104128912",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 19,
    "handicap": -0.25,
    "home": 2.3,
    "away": 1.6,
    "sourceId": "104129023",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 20,
    "handicap": -0.25,
    "home": 2.35,
    "away": 1.575,
    "sourceId": "104129045",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._