# Trận đấu — NWS Spirit (W) vs Western City Rangers (W)

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11324927` |
| Giải | Australia New South Wales NPL Women |
| Tỷ số | 0-0 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1781327630628 |
| timer (raw) | `{"tm":11,"ts":8,"tt":"1","ta":0,"md":0}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "14",
    "14"
  ],
  "corners": [
    "1",
    "0"
  ],
  "dangerous_attacks": [
    "7",
    "5"
  ],
  "goals": [
    "0",
    "0"
  ],
  "off_target": [
    "1",
    "0"
  ],
  "on_target": [
    "1",
    "0"
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
| 9 | 13 / 11 | 7 / 5 | 0 / 0 | 1 / 0 | 1 / 0 | 0 / 0 | 0 / 0 | — | — |
| 10 | 13 / 13 | 7 / 5 | 1 / 0 | 1 / 0 | 1 / 0 | 0 / 0 | 0 / 0 | — | — |
| 11 | 14 / 14 | 7 / 5 | 1 / 0 | 1 / 0 | 1 / 0 | 0 / 0 | 0 / 0 | — | — |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 9 | 1 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._

**Tổng số lần dự đoán:** 1

### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)

| Phút | Hiệp | GoalProb 30' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 10 | 1 | 65.3% | có | — | — | — |

_Cửa sổ 30': chưa có verdict nào — chưa tính accuracy._

### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)

| Phút | Hiệp | GoalProb 15' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |
|------|------|------------|-----------|------|-------|----------|
| 10 | 1 | 42.0% | không | — | — | — |

_Cửa sổ 15': chưa có verdict nào — chưa tính accuracy._

### Lý do mô hình (heuristic / Ollama / GPT)

| Phút | Hiệp | Heuristic | Ollama | GPT |
|------|------|-----------|--------|-----|
| 10 | 1 | Khả năng có bàn trong 30' tới đang ở mức trung bình (~65%), bóng nguy hiểm dồn dập (+12 trong 3 phút). | Sức ép đang dồn dập với chủ nhà có tới +7 tình huống bóng nguy hiểm, trong khi kèo Tài/Xỉu bị đẩy lên và chấp nghiêng về chủ nhà. Những trận tương tự thường vỡ òa bàn thắng ở giai đoạn này. | Cloud AI tắt — bật ⚡ ở trận này để chạy GPT |

_Model (30'): `v3` · AUC 0.560 · 296 trận train · trained 2026-06-11T20:03:13.957737_

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 10 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 3.25 | 1.82 | 1.98 |
| 2 | 1 | 3.25 | 1.88 | 1.93 |
| 3 | 1 | 3.25 | 1.90 | 1.90 |
| 4 | 1 | 3.25 | 1.95 | 1.85 |
| 5 | 1 | 3.25 | 1.93 | 1.88 |
| 6 | 1 | 3.25 | 1.95 | 1.85 |
| 7 | 1 | 3 | 1.75 | 1.95 |
| 8 | 1 | 3 | 1.75 | 1.95 |
| 9 | 1 | 3 | 1.80 | 2.00 |
| 10 | 1 | 3 | 1.85 | 1.95 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** 1 lần; tổng biên độ giảm 0.025; bước lớn nhất 0.025
- **H1 — Xỉu:** 5 lần; tổng biên độ giảm 0.200; bước lớn nhất 0.050
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 11 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -1.25 | 1.98 | 1.82 |
| 2 | 1 | -1.25 | 1.98 | 1.82 |
| 3 | 1 | -1 | 1.75 | 1.95 |
| 4 | 1 | -1 | 1.82 | 1.98 |
| 5 | 1 | -1.25 | 1.88 | 1.93 |
| 6 | 1 | -1.25 | 1.88 | 1.93 |
| 7 | 1 | -1.25 | 1.88 | 1.93 |
| 8 | 1 | -1.25 | 1.88 | 1.93 |
| 9 | 1 | -1.25 | 1.82 | 1.98 |
| 10 | 1 | -1.25 | 1.85 | 1.95 |
| 11 | 1 | -1.25 | 1.82 | 1.98 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 2 lần; tổng biên độ giảm 0.075; bước lớn nhất 0.050
- **H1 — Khách:** 1 lần; tổng biên độ giảm 0.025; bước lớn nhất 0.025
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 9 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | 1.5 | 2.02 | 1.77 |
| 2 | 1 | 1.25 | 1.73 | 1.98 |
| 3 | 1 | 1.25 | 1.75 | 2.05 |
| 4 | 1 | 1.25 | 1.82 | 1.98 |
| 5 | 1 | 1.25 | 1.82 | 1.98 |
| 6 | 1 | 1.25 | 1.90 | 1.90 |
| 7 | 1 | 1.25 | 1.98 | 1.82 |
| 9 | 1 | 1.25 | 2.02 | 1.77 |
| 10 | 1 | 1.25 | 2.08 | 1.73 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** không có bước giảm (cùng HDP)
- **H1 — Xỉu:** 5 lần; tổng biên độ giảm 0.325; bước lớn nhất 0.075
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 11 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 1 | 1 | -0.5 | 1.88 | 1.93 |
| 2 | 1 | -0.5 | 1.90 | 1.90 |
| 3 | 1 | -0.5 | 1.93 | 1.88 |
| 4 | 1 | -0.5 | 1.90 | 1.90 |
| 5 | 1 | -0.5 | 1.85 | 1.95 |
| 6 | 1 | -0.5 | 1.90 | 1.90 |
| 7 | 1 | -0.5 | 1.90 | 1.90 |
| 8 | 1 | -0.5 | 1.93 | 1.88 |
| 9 | 1 | -0.5 | 1.93 | 1.88 |
| 10 | 1 | -0.5 | 1.95 | 1.85 |
| 11 | 1 | -0.5 | 1.93 | 1.88 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** 3 lần; tổng biên độ giảm 0.100; bước lớn nhất 0.050
- **H1 — Khách:** 5 lần; tổng biên độ giảm 0.150; bước lớn nhất 0.050
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)

_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._

### Kèo Tài cả trận (1_3)

Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 5 | 1 | ou_drop / 1_3 | 1 | Giảm giá Tài (1_3) | Biểu đồ cường độ: **1** lần giảm odds **Tài** (Tài/Xỉu) tại phút này (cùng HDP, bước liền kề). |

### Kèo Tài hiệp 1 (1_6)

Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).

_Không có phút nào ghi nhận cường độ > 0 — cần đủ chuỗi odds trong localStorage hoặc chưa có bước giảm (đỏ) tại phút đó._

### Kèo chấp hiệp 1 — odds Chủ (1_5)

Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).

| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |
|-----:|:---:|:---|:---:|---------|----------|
| 4 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 5 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |
| 11 | 1 | ou_drop / 1_5 | 1 | Giảm giá Chủ (1_5) | Biểu đồ cường độ: **1** lần giảm odds **Chủ** (kèo chấp hiệp 1) tại phút này (cùng HDP, bước liền kề). |

### Phụ lục JSON: 1_3 (OU cả trận)

```json
[
  {
    "marketId": "1_3",
    "minute": 1,
    "handicap": 3.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "426779060",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 2,
    "handicap": 3.25,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "426779202",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 3,
    "handicap": 3.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "426779229",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 4,
    "handicap": 3.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426779340",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 5,
    "handicap": 3.25,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "426779445",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 6,
    "handicap": 3.25,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "426779633",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 7,
    "handicap": 3,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "426779749",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 8,
    "handicap": 3,
    "over": 1.75,
    "under": 1.95,
    "sourceId": "426779797",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 9,
    "handicap": 3,
    "over": 1.8,
    "under": 2,
    "sourceId": "426779930",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 10,
    "handicap": 3,
    "over": 1.85,
    "under": 1.95,
    "sourceId": "426780040",
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
    "handicap": -1.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "249936624",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 2,
    "handicap": -1.25,
    "home": 1.975,
    "away": 1.825,
    "sourceId": "249936736",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 3,
    "handicap": -1,
    "home": 1.75,
    "away": 1.95,
    "sourceId": "249936790",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 4,
    "handicap": -1,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249936851",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 5,
    "handicap": -1.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "249936877",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 6,
    "handicap": -1.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "249936982",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 7,
    "handicap": -1.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "249937034",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 8,
    "handicap": -1.25,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "249937089",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 9,
    "handicap": -1.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249937155",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 10,
    "handicap": -1.25,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "249937176",
    "half": 1
  },
  {
    "marketId": "1_2",
    "minute": 11,
    "handicap": -1.25,
    "home": 1.825,
    "away": 1.975,
    "sourceId": "249937269",
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
    "handicap": 1.5,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185457127",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 2,
    "handicap": 1.25,
    "over": 1.725,
    "under": 1.975,
    "sourceId": "185457201",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 3,
    "handicap": 1.25,
    "over": 1.75,
    "under": 2.05,
    "sourceId": "185457240",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 4,
    "handicap": 1.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185457322",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 5,
    "handicap": 1.25,
    "over": 1.825,
    "under": 1.975,
    "sourceId": "185457346",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 6,
    "handicap": 1.25,
    "over": 1.9,
    "under": 1.9,
    "sourceId": "185457437",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 7,
    "handicap": 1.25,
    "over": 1.975,
    "under": 1.825,
    "sourceId": "185457518",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 9,
    "handicap": 1.25,
    "over": 2.025,
    "under": 1.775,
    "sourceId": "185457627",
    "half": 1
  },
  {
    "marketId": "1_6",
    "minute": 10,
    "handicap": 1.25,
    "over": 2.075,
    "under": 1.725,
    "sourceId": "185457661",
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
    "handicap": -0.5,
    "home": 1.875,
    "away": 1.925,
    "sourceId": "104084866",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 2,
    "handicap": -0.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104084929",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 3,
    "handicap": -0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104084969",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 4,
    "handicap": -0.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104085007",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 5,
    "handicap": -0.5,
    "home": 1.85,
    "away": 1.95,
    "sourceId": "104085019",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 6,
    "handicap": -0.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104085082",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 7,
    "handicap": -0.5,
    "home": 1.9,
    "away": 1.9,
    "sourceId": "104085122",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 8,
    "handicap": -0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104085146",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 9,
    "handicap": -0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104085190",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 10,
    "handicap": -0.5,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "104085216",
    "half": 1
  },
  {
    "marketId": "1_5",
    "minute": 11,
    "handicap": -0.5,
    "home": 1.925,
    "away": 1.875,
    "sourceId": "104085269",
    "half": 1
  }
]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._