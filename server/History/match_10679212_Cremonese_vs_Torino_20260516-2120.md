# Trận đấu — Cremonese vs Torino

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `10679212` |
| Giải | Italy Serie A |
| Tỷ số | 0-0 |
| Thời điểm / trạng thái | FT |
| viewedAt (Unix ms) | 1776600281100 |
| timer (raw) | `{"tm":75,"ts":5,"tt":"1","ta":0,"md":1}` |

## Stats API (snapshot cuối — raw)

```json
{
  "action_areas": [
    "21.50",
    "36.50"
  ],
  "attacks": [
    "83",
    "42"
  ],
  "ball_safe": [
    "49",
    "55"
  ],
  "corners": [
    "6",
    "0"
  ],
  "corner_h": [
    "2",
    "0"
  ],
  "crosses": [
    "19",
    "5"
  ],
  "crossing_accuracy": [
    "0.11",
    "0.00"
  ],
  "dangerous_attacks": [
    "29",
    "16"
  ],
  "fouls": [
    "6",
    "8"
  ],
  "goalattempts": [
    "4",
    "0"
  ],
  "goals": [
    "0",
    "0"
  ],
  "key_passes": [
    "8",
    "0"
  ],
  "offsides": [
    "0",
    "1"
  ],
  "off_target": [
    "8",
    "1"
  ],
  "on_target": [
    "2",
    "0"
  ],
  "passing_accuracy": [
    "0.84",
    "0.78"
  ],
  "penalties": [
    "0",
    "0"
  ],
  "possession_rt": [
    "63",
    "37"
  ],
  "redcards": [
    "0",
    "0"
  ],
  "saves": [
    "0",
    "1"
  ],
  "shots_blocked": [
    "2",
    "1"
  ],
  "substitutions": [
    "3",
    "2"
  ],
  "xg": [
    "0.63",
    "0.04"
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

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|
| 71 | 81 / 40 | 28 / 16 | 2 / 0 | 8 / 1 | 5 / 0 | 0 / 0 | 0 / 0 |
| 72 | 81 / 41 | 28 / 16 | 2 / 0 | 8 / 1 | 5 / 0 | 0 / 0 | 0 / 0 |
| 73 | 83 / 42 | 29 / 16 | 2 / 0 | 8 / 1 | 6 / 0 | 0 / 0 | 0 / 0 |
| 75 | 83 / 42 | 29 / 16 | 2 / 0 | 8 / 1 | 6 / 0 | 0 / 0 | 0 / 0 |

## Sự kiện trận (goal, corner)

| Phút | Hiệp | Loại |
|------|------|------|
| 73 | 1 | corner |

## Nhật ký cảnh báo (alertHistory)

_Không có cảnh báo._

## Chuỗi kèo theo phút & cường độ giảm giá

_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._

### Tài/Xỉu cả trận (1_3)

_Đơn vị “giá” = odds (hệ số). 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

### Kèo chấp cả trận (đội nhà / đội khách) (1_2)

_Đơn vị “giá” = odds chủ / khách. 0 mốc._

_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._

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
[]
```

### Phụ lục JSON: 1_2 (AH cả trận)

```json
[]
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