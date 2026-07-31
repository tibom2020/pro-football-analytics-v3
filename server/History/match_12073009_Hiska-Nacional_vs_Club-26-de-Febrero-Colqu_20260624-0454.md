# Trận đấu — Hiska Nacional vs Club 26 de Febrero Colquiri

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `12073009` |
| Giải | Bolivia Copa Simon Bolivar |
| Tỷ số | 0-1 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1782224437898 |
| timer (raw) | `{"tm":21,"ts":37,"tt":"1","ta":0,"md":0}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "13",
    "18"
  ],
  "corners": [
    "2",
    "0"
  ],
  "dangerous_attacks": [
    "16",
    "14"
  ],
  "goals": [
    "0",
    "1"
  ],
  "off_target": [
    "2",
    "1"
  ],
  "on_target": [
    "2",
    "2"
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
    "0"
  ]
}
```

## Vé cược (betTickets)

_Không có vé cho trận này trong localStorage._

## Thống kê theo phút (statsHistory)

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A | xG nhà | xG khách |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|----------|----------|
| 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | — | — |
| 19 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | — | — |
| 20 | 11 / 18 | 15 / 13 | 2 / 2 | 2 / 0 | 2 / 0 | 0 / 0 | 0 / 0 | — | — |
| 21 | 13 / 18 | 16 / 14 | 2 / 2 | 2 / 1 | 2 / 0 | 0 / 0 | 0 / 0 | — | — |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 19 | 1 | goal |
| 20 | 1 | corner |
| 20 | 1 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Dự đoán bàn thắng (goal-predict)

_Chưa có lần dự đoán nào cho trận này._

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 3 mốc._

| Phút | Hiệp | HDP | Tài | Xỉu |
|-----:|:---:|:---:|:---:|:---:|
| 19 | 1 | 3.75 | 1.88 | 1.93 |
| 20 | 1 | 3.75 | 1.93 | 1.88 |
| 21 | 1 | 3.75 | 1.95 | 1.85 |

**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):

- **H1 — Tài:** không có bước giảm (cùng HDP)
- **H1 — Xỉu:** 2 lần; tổng biên độ giảm 0.075; bước lớn nhất 0.050
- **H2 — Tài:** không có bước giảm (cùng HDP)
- **H2 — Xỉu:** không có bước giảm (cùng HDP)

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 1 mốc._

| Phút | Hiệp | HDP | Chủ | Khách |
|-----:|:---:|:---:|:---:|:---:|
| 19 | 1 | 0 | 1.95 | 1.85 |

**Cường độ giảm giá** (cùng HDP):

- **H1 — Chủ:** không có bước giảm (cùng HDP)
- **H1 — Khách:** không có bước giảm (cùng HDP)
- **H2 — Chủ:** không có bước giảm (cùng HDP)
- **H2 — Khách:** không có bước giảm (cùng HDP)

### Tài/Xỉu hiệp 1 (thị trường H1 — API) (1_6)

_Đơn vị “giá” = odds (hệ số). 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

### Chấp hiệp 1 (thị trường H1 — API) (1_5)

_Đơn vị “giá” = odds chủ / khách. 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

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
    "minute": 19,
    "handicap": 3.75,
    "over": 1.875,
    "under": 1.925,
    "sourceId": "427857844",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 20,
    "handicap": 3.75,
    "over": 1.925,
    "under": 1.875,
    "sourceId": "427857900",
    "half": 1
  },
  {
    "marketId": "1_3",
    "minute": 21,
    "handicap": 3.75,
    "over": 1.95,
    "under": 1.85,
    "sourceId": "427857908",
    "half": 1
  }
]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[
  {
    "marketId": "1_2",
    "minute": 19,
    "handicap": 0,
    "home": 1.95,
    "away": 1.85,
    "sourceId": "250555431",
    "half": 1
  }
]
```

### Phụ lục JSON: 1_6 (OU hiệp 1)

```json
[]
```

### Phụ lục JSON: 1_5 (AH hiệp 1)

```json
[]
```

---

_File được xuất tự động từ Pro Football Analytics (localStorage)._