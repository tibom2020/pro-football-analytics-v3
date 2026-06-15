# 📊 PHÂN TÍCH TOÀN BỘ 507 TRẬN & HƯỚNG DẪN XÂY DỰNG MODEL 30' & 15'

> *Generated: 2026-06-09 | Tác giả: Tí Nị*

---

## MỤC LỤC

1. [Tổng quan 507 trận](#1-tổng-quan-507-trận)
2. [Độ chính xác dự đoán](#2-độ-chính-xác-dự-đoán)
3. [Phân tích sai lầm chi tiết](#3-phân-tích-sai-lầm-chi-tiết)
4. [xG vs Bàn thực tế — Under/Overperformers](#4-xg-vs-bàn-thực-tế)
5. [Các pattern đặc biệt](#5-các-pattern-đặc-biệt)
6. [Hướng dẫn xây dựng Model v3](#6-hướng-dẫn-xây-dựng-model-v3)
7. [Feature Engineering cho Model 30' & 15'](#7-feature-engineering)
8. [Kiến trúc đề xuất](#8-kiến-trúc-đề-xuất)

---

## 1. TỔNG QUAN 507 TRẬN

### Thống kê cơ bản

| Metric | Giá trị |
|--------|---------|
| Tổng trận | **507** |
| Tổng bàn thắng | **1,278** |
| Trung bình bàn/trận | **2.54** |
| Trận 0-0 | **62 (12.2%)** |
| Trận 1 bàn | **93 (18.3%)** |
| Trận ≥3 bàn (Over 2.5) | **236 (46.5%)** |
| Trận ≥5 bàn | **73 (14.4%)** |

### Phân phối tỉ số

```
0-0:  ████████████▉       12.2%
1 bàn: ████████████████▊   18.3%
2 bàn: ███████████████████ 22.9%
3 bàn: █████████████████▋  20.3%
4 bàn: ██████████▉         12.1%
5+ bàn: ████████████▌      14.4%
```

---

## 2. ĐỘ CHÍNH XÁC DỰ ĐOÁN

### So sánh cửa sổ 30' vs 15'

| Cửa sổ | Đúng/Tổng | Accuracy | Đánh giá |
|:------:|:---------:|:--------:|:---------|
| **30'** | 300/615 | **48.8%** | ⚠️ Kém — Baseline ~50% |
| **15'** | 393/632 | **62.2%** | ✅ Khá — Trên random rõ rệt |

**💡 Insight cực kỳ quan trọng:** Cửa sổ 15' (62.2%) outperforms cửa sổ 30' (48.8%) bởi **~13.4%**. Điều này có nghĩa là:

> 🔴 **Cửa sổ 30' gần như vô dụng** — nó không tốt hơn tung đồng xu 50:50
> 🟢 **Cửa sổ 15' có giá trị thực tế** — vượt trội hơn 12% so với random

### Vì sao 30' kém?

Nếu nhìn vào bảng **GoalProb 30' vs Thực tế**:

| Khoảng GoalProb | SL dự đoán | Có bàn thật | Tỉ lệ |
|:--------------:|:----------:|:----------:|:-----:|
| **50-59%** | 137 | 64 | **46.7%** |
| **60-69%** | 136 | 66 | **48.5%** |
| **70-79%** | 129 | 62 | **48.1%** |
| **80-89%** | 81 | 44 | **54.3%** |
| **90-99%** | 27 | 15 | **55.6%** |

**Model 30' không phân biệt được!** GoalProb từ 50% đến 79% đều cho kết quả ~47-48% — không có correlation. Chỉ khi GoalProb >80% mới có tín hiệu nhẹ (54-55%).

### Phân phối các mức GoalProb 30'

Đây là vấn đề lớn nhất: **hầu hết dự đoán đều nằm ở 50-79%** (402/615 = 65.4%), và trong khoảng này model không làm tốt hơn random.

---

## 3. PHÂN TÍCH SAI LẦM CHI TIẾT

### False Positives vs False Negatives

| Loại | Số lần | Ý nghĩa |
|:-----|:------:|:--------|
| **False Positive** (nói CÓ, thực tế KHÔNG) | **259** | Model quá lạc quan |
| **False Negative** (nói KHÔNG, thực tế CÓ) | 56 | Model thiếu nhạy |

**Tỉ lệ FP:FN ≈ 4.6:1** — model thiên nặng về phía "dự đoán có bàn". Đây là đặc điểm của threshold-based model với ngưỡng 0.5.

### FP phân bố theo GoalProb

```
50-60%: 73 lần — Lỗi phổ biến nhất
60-70%: 70 lần — Gần như tương đương
70-80%: 67 lần — Vẫn cao
80%+:   49 lần — Model tự tin nhất nhưng vẫn sai nhiều
```

### Top 5 trận dự đoán tệ nhất (Acc 30' = 0%)

| Trận | Kết quả | File |
|:-----|:-------:|:-----|
| Palestino vs Audax Italiano | 0-0 | 0% (3 lần) |
| Brisbane Olympic vs Brisbane City | 5-? | 0% (3 lần) |
| Hai Phong vs Nam Dinh | 1-1 | 0% (2 lần) |
| Tianjin Tigers vs Dalian Young Boy | 1-0 | 0% (6 lần!) |
| NuPS vs Gilla FC | 2-0 | 0% (5 lần!) |

**Pattern chung:** Các trận này có stats tấn công áp đảo nhưng không ghi bàn — classic "false dominance" game.

---

## 4. xG vs BÀN THỰC TẾ

### Underperformers (nhiều xG nhưng ít bàn)

| Trận | xG | Bàn | Lệch |
|:-----|:-:|:---:|:----:|
| Shandong Taishan vs Wuhan Three Towns | **7.12** | 6 | -1.12 |
| Man Utd vs Nottm Forest | **5.61** | 5 | -0.61 |
| Bayern Munich vs VfB Stuttgart | **5.52** | 6 | +0.48 |
| PSG vs Bayern Munich | **4.38** | 9 | **+4.62** (siêu over) |
| Aston Villa vs Sunderland | 4.41 | 7 | **+2.59** |

### Overperformers (ít xG nhưng nhiều bàn — hoặc 0 bàn dù xG cao)

Đây mới là **vấn đề của model**:

| Trận | xG | Bàn | Lệch | Vấn đề |
|:-----|:-:|:---:|:----:|:-------|
| **China PR vs Thailand** | **2.21** | **0** | **+2.21** | ❌ Model nói CÓ 9 lần — đều sai |
| Sydney FC vs Perth Glory | **2.08** | 0 | +2.08 | ❌|
| PEC Zwolle vs Feyenoord | **3.24** | 0 | +3.24 | ❌|
| Brentford vs Fulham | **2.23** | 0 | +2.23 | ❌|

**6 trận có xG > 2.0 nhưng kết thúc 0-0.** Đây là "lỗ hổng chết người" — model không phân biệt được cơ hội chất lượng thấp vs cao.

### So sánh conversion rate

```
China PR: 17 sút, 5 trúng, 0 bàn → 0%
PHI 5-1 MYA: 6 trúng, 5 bàn → 83%
Trung bình 507 trận: ~32% conversion from on-target shots
```

**Hai thái cực của hiệu suất dứt điểm.** Model dựa trên volume stats không thể phân biệt được điều này.

---

## 5. CÁC PATTERN ĐẶC BIỆT

### Pattern A: "False Dominance" (Áp đảo ảo)
- Đội nhà ≥60% possession
- Kết quả: **37W / 33D / 23L** — chỉ thắng 40%
- Nhiều trường hợp 0-0 dù áp đảo toàn diện
- **Dấu hiệu nhận biết:** Tấn công nhiều, sút nhiều, nhưng on-target thấp

### Pattern B: "Corner Kinh"
- 11 corners nhưng 0 bàn (China vs Thailand)
- Tỉ lệ crossing accuracy thấp (< 0.40) thường dẫn đến 0 bàn từ corner
- **Kết luận:** Số corner không tương quan tuyến tính với bàn thắng

### Pattern C: "Bão cuối trận"
- Philippines vs Myanmar: 4 bàn trong 10' cuối (80-90')
- Nhiều trận có goal burst cuối trận
- **Vấn đề model:** Không capture được momentum shift

### Pattern D: "U19 & Women's Matches"
- Philippines U19 vs Australia U19: 0-8
- Indonesia W vs Singapore W: thường unpredictable
- **Vấn đề:** Model train trên 227 trận hỗn hợp, không biết đội yếu thế nào

---

## 6. HƯỚNG DẪN XÂY DỰNG MODEL v3

### 6.1 Kiến trúc đề xuất: **Dual-Window Ensemble**

```
┌─────────────────────────────────────────────────────┐
│                  INPUT LAYER                         │
│  current_minute + rolling_window_5m + match_context │
└──────────────┬──────────────────────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌────────────┐    ┌────────────┐
│  MODEL 30' │    │  MODEL 15' │
│ (GBM/RF)   │    │  (GBM/RF)  │
├────────────┤    ├────────────┤
│ Features:  │    │ Features:  │
│ - xG diff  │    │ - Shot acc │
│ - DA rate  │    │ - Momentum │
│ - Odds Δ   │    │ - Odds Δ   │
│ - Pressure │    │ - Pressure │
│ - Corners  │    │ - Key pass │
└──────┬─────┘    └──────┬─────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌────────────────┐
       │ ENSEMBLE VOTER │
       │ (weighted avg) │
       │  W15' = 0.65   │
       │  W30' = 0.35   │
       └────────────────┘
```

### 6.2 Vấn đề của model hiện tại (v2)

| Vấn đề | Biểu hiện | Fix |
|:-------|:----------|:----|
| **Threshold 0.5 tùy tiện** | Không phân biệt được 50% vs 80% | Calibrate hoặc dùng ranking |
| **Thiếu chất lượng shot** | Dùng volume stats (shots, DA) thay vì chất lượng | Thêm xG/shot, conversion history |
| **Không có time-decay** | 88.4% ở phút 13 = quá sớm | Weight giảm dần từ đầu trận |
| **Không có team factor** | Không biết đội nào finishing kém | Thêm team conversion rate |
| **Không phân biệt giải đấu** | U19 = International = Club = Women | Thêm league embedding |
| **30' window quá dài** | Accuracy chỉ 48.8% | Rút xuống 15' hoặc 20' |
| **Training data nhỏ** | Chỉ 227 trận train | Mở rộng lên ít nhất 1000 trận |

---

## 7. FEATURE ENGINEERING

### 7.1 Features cho Model 15' (khuyến nghị)

#### Momentum Features (15' sliding window)
```
1. DA_rate_15m          = dangerous_attacks(t) - dangerous_attacks(t-15)
2. Shot_rate_15m        = shots(t) - shots(t-15)
3. OnTarget_rate_15m    = on_target(t) - on_target(t-15)
4. Corner_rate_15m      = corners(t) - corners(t-15)
5. KeyPass_rate_15m     = key_passes(t) - key_passes(t-15)
```

#### Quality Features
```
6. Shot_accuracy_15m    = on_target_15m / max(shots_15m, 1)
7. xG_per_shot          = xG_15m / max(shots_15m, 1)
8. Conversion_history   = goals / max(on_target, 1) (team-level)
9. xG_diff_15m          = home_xG_15m - away_xG_15m
```

#### Market Features
```
10. OU_odds_delta_15m   = over_odds(t) - over_odds(t-15)
11. AH_odds_delta_15m   = home_odds(t) - home_odds(t-15)
12. OU_handicap_delta   = handicap(t) - handicap(t-15)
13. Market_direction    = 1 (Tài được ưa) / 0 / -1 (Xỉu được ưa)
```

#### Pressure Features
```
14. Pressure_flag       = 1 nếu có alert trong 5 phút gần nhất
15. Pressure_intensity  = số lần alert trong 15 phút
16. DA_acceleration     = DA_rate_5m - DA_rate_10m (đạo hàm bậc 2)
```

#### Context Features
```
17. Minute               → dùng sin(minute/90 * 2π) để cyclic encoding
18. Half                 = 0/1
19. Scoreline_state      = home_goals - away_goals (hiện tại)
20. Goal_in_last_5m      = 1 nếu có bàn 5 phút trước
21. Red_card_in_game     = số thẻ đỏ
22. Sub_impact           = substitutions_used_home - substitutions_used_away
```

### 7.2 Features cho Model 30'

Tương tự Model 15' nhưng với window 30' thay vì 15'.

**QUAN TRỌNG:** Cần thêm:
```
23. xG_total_so_far      = xG_30m (tổng xG trong 30 phút tới)
24. Big_chance_missed    = shots_in_box_30m - on_target_30m
25. Possession_dominance = possession_home_30m / possession_away_30m
26. Attack_efficiency    = dangerous_attacks_30m / attacks_30m
```

### 7.3 Feature Selection (dùng Boruta hoặc SHAP)

Từ dữ liệu 507 trận, tôi ước lượng feature importance:

| Feature | Importance (ước lượng) | Ghi chú |
|:--------|:---------------------:|:--------|
| OnTarget_rate_15m | ⭐⭐⭐⭐⭐ | Quan trọng nhất |
| xG_diff | ⭐⭐⭐⭐ | Khác biệt rõ |
| Pressure_flag | ⭐⭐⭐⭐ | Alert rất tốt |
| Shot_accuracy | ⭐⭐⭐⭐ | Chất lượng > số lượng |
| OU_odds_delta | ⭐⭐⭐ | Thị trường phản ứng |
| DA_rate | ⭐⭐⭐ | Cần kết hợp |
| Minute_cyclic | ⭐⭐ | Có ảnh hưởng nhẹ |
| Possession | ⭐ | Gần như vô dụng |
| Total corners | ⭐ | Không tương quan |
| Total attacks | ⭐ | Volume thuần túy |

---

## 8. KIẾN TRÚC ĐỀ XUẤT

### 8.1 Ensemble với Optimal Threshold

```python
# Ý tưởng chính
model_15 = GradientBoostingClassifier(
    n_estimators=500,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8
)

model_30 = RandomForestClassifier(
    n_estimators=300,
    max_depth=6,
    min_samples_leaf=10
)

# Ensemble weighted
def predict_ensemble(prob_15, prob_30, minute):
    w_15 = 0.65  # 15' đáng tin hơn
    w_30 = 0.35  # 30' noisy
    
    # Time-weight: càng về cuối trận 15' càng quan trọng
    time_factor = min(minute / 90, 1.0)
    w_15_adjusted = w_15 * (1 + time_factor * 0.3)
    w_30_adjusted = w_30 * (1 - time_factor * 0.3)
    
    # Normalize
    total = w_15_adjusted + w_30_adjusted
    final_prob = (prob_15 * w_15_adjusted + prob_30 * w_30_adjusted) / total
    
    # Calibrated threshold (default 0.5 là sai!)
    # Với model 30' accuracy thấp, cần threshold cao hơn
    optimal_threshold = 0.55  # hoặc learn từ validation
    
    return final_prob, final_prob >= optimal_threshold
```

### 8.2 Xử lý class imbalance

Model hiện tại có **4.6:1 FP:FN** — quá nhiều False Positive.

**Solution:**
- Dùng **class_weight='balanced'** trong GBM/RF
- Hoặc **SMOTE** trên minority class (CÓ bàn)
- Hoặc dùng **Focal Loss** nếu chuyển sang neural

### 8.3 Time-series Cross Validation

Không dùng random train/test split — vì dữ liệu theo thời gian:

```python
# Split theo thời gian (chronological)
train = matches[:400]  # 80% đầu
val = matches[400:450] # 10% giữa
test = matches[450:]   # 10% cuối

# Hoặc walk-forward:
for i in range(3):
    train = matches[:400 + i*35]
    val = matches[400 + i*35:435 + i*35]
    test = matches[435 + i*35:]
```

### 8.4 Đề xuất cải tiến cho cảnh báo

Hiện tại alert `pressure=2` dựa trên DA + Sút + Góc trong 3p.

**Cần thêm:**
- **`pressure=3`** = alert kèm On Target tăng vọt (nguy hiểm thực sự)
- **`pressure=1`** = alert yếu hơn, chỉ DA tăng nhưng Sút không tăng
- **Shot quality alert** = khi `on_target / shots > 0.5` trong 5 phút

---

## 9. LỘ TRÌNH PHÁT TRIỂN

### Phase 1: Fix ngay (tuần này)
1. Tăng threshold từ 0.5 → 0.55
2. Thêm 2 features: `shot_accuracy_window` + `on_target_acceleration`
3. Rerank: 15' làm chính, 30' làm tham khảo

### Phase 2: Cải thiện (2 tuần)
1. Thu thập thêm dữ liệu → target 1000+ trận
2. Thêm team-level features (conversion rate history)
3. Implement ensemble (15' + 30')
4. Thêm market features (OddsDelta)

### Phase 3: Nâng cao (tháng sau)
1. Thêm xG model riêng (dùng AI để predict xG từ stats)
2. Implement time-decay weighting
3. Chuyển sang neural network (LSTM cho time-series)
4. Thêm league embedding

---

## 10. DỮ LIỆU THAM KHẢO

### 5 Trận Cần Học Nhất để Debug Model

| Trận | Vấn đề | Bài học |
|:-----|:--------|:--------|
| **China PR vs Thailand** (0-0) | 17 shots, 2.09 xG, 0 bàn | "Số lượng không phải chất lượng" |
| **Philippines vs Myanmar** (5-1) | 5 trúng 5 bàn (100%) | "Hiệu suất phi thường — model không thể biết" |
| **Shandong Taishan vs Wuhan** (3-3) | xG 7.12 | "Trận điên rồ — outlier" |
| **Palestino vs Audax** (0-0) | Acc 0% | "False dominance classic" |
| **Ferrymead Bays vs Wanaka** (5-0) | Acc 100% | "Trận dễ — đội chênh lệch" |

---

## KẾT LUẬN

**Model hiện tại (v2) có 3 vấn đề chính:**

1. ❌ **48.8% accuracy** — Không hơn random (baseline ~50%)
2. ❌ **Thiên về False Positive** — 259 FP vs 56 FN
3. ❌ **GoalProb không calibrated** — 50% và 80% đều cho kết quả ~47-55%

**Cần thay đổi ngay:**

| Thay đổi | Tác động kỳ vọng |
|:---------|:----------------|
| Threshold 0.5 → 0.55 | Giảm FP từ 259 → ~180 |
| Ensemble 15' (65%) + 30' (35%) | Accuracy từ 48.8% → ~58% |
| Thêm shot_accuracy feature | Giảm false dominance errors |
| Train trên 1000+ trận | Ổn định model hơn |

> **Cửa sổ 15' hiện tại 62.2% đã khả quan.** Tập trung cải thiện 30' và ensemble sẽ đưa accuracy lên 65-70%.

---

*Báo cáo từ 507 trận (1,278 bàn) đã phân tích — Tí Nị*