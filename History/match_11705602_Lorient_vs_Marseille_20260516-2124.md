# Trận đấu — Lorient vs Marseille

## Thông tin chung

| Trường | Giá trị |
|--------|--------|
| Match ID | `11705602` |
| Giải | France Ligue 1 |
| Tỷ số | — |
| Thời điểm / trạng thái | 0' |
| viewedAt (Unix ms) | 1776524356568 |
| timer (raw) | `{"tm":0,"ts":0,"tt":"0","ta":0,"md":0}` |

## Stats API (snapshot cuối — raw)

```json
{
  "attacks": [
    "0",
    "0"
  ],
  "crossing_accuracy": [
    "0.00",
    "0.00"
  ],
  "dangerous_attacks": [
    "0",
    "0"
  ],
  "off_target": [
    "0",
    "0"
  ],
  "on_target": [
    "0",
    "0"
  ],
  "passing_accuracy": [
    "0.00",
    "0.00"
  ],
  "possession_rt": [
    "50",
    "50"
  ]
}
```

## Vé cược (betTickets)

_Không có vé cho trận này trong localStorage._

## Thống kê theo phút (statsHistory)

| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A |
|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|
| 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

## Sự kiện trận (goal, corner)

_Không có sự kiện lưu._

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