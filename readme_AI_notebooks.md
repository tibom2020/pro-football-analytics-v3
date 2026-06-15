# Hướng dẫn AI Goal-Prediction — Quy trình huấn luyện & cập nhật

> Tài liệu cho feature **badge "🔥 GoalProb X%"** trên Dashboard.
> Dự đoán xác suất có bàn thắng — cửa sổ **30 phút là CHÍNH** (model duy nhất có tín hiệu thật, AUC ~0.61),
> kèm **15'** và **5'** chỉ để **tham khảo** (3 model XGBoost song song) + **Ollama** cho reasoning.

## Kiến trúc

```
.md files (History/)
    │
    ├── npm run extract-goal-data ──► data/goal-dataset.jsonl + goal-dataset-5min.jsonl + goal-dataset-30min.jsonl
    │                                        │
    │                                        ├── train-goal-model-30min.ipynb ► goal-imminent-30min-v1.onnx (30' — CHÍNH)
    │                                        ├── train-goal-model.ipynb ──────► goal-imminent-v1.onnx (15' — tham khảo)
    │                                        ├── train-goal-model-5min.ipynb ─► goal-imminent-5min-v1.onnx (5' — tham khảo)
    │                                        └── (server load 3 model + RAG từ dataset 15')
    │
    └── POST /api/ai/predict-goal  ──► goalProb30 (chính) + goalProb15/5 (tham khảo) + reasonVi → UI badge + chart
```

## Thành phần đã cài

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Extract pipeline | [server/src/scripts/extract-goal-dataset.ts](server/src/scripts/extract-goal-dataset.ts) | Parse `.md` → JSONL feature dataset |
| Md parser | [server/src/goal-predict/md-parser.ts](server/src/goal-predict/md-parser.ts) | Đọc các section của file `.md` |
| Feature builder | [server/src/goal-predict/feature-builder.ts](server/src/goal-predict/feature-builder.ts) | Tính 28 features per (half, minute) (missing odds = NaN, gồm `man_advantage`, `ou13_over_max_step_5m`) |
| Training notebook (30' — CHÍNH) | [notebooks/train-goal-model-30min.ipynb](notebooks/train-goal-model-30min.ipynb) | Train model cửa sổ 30 phút (model chính) |
| Training notebook (15') | [notebooks/train-goal-model.ipynb](notebooks/train-goal-model.ipynb) | Train model cửa sổ 15 phút (tham khảo) |
| Training notebook (5') | [notebooks/train-goal-model-5min.ipynb](notebooks/train-goal-model-5min.ipynb) | Train model cửa sổ 5 phút (tham khảo) |
| ONNX runtime | [server/src/goal-predict/onnx-service.ts](server/src/goal-predict/onnx-service.ts) | Load model + predict prob |
| Ollama client | [server/src/goal-predict/ollama-client.ts](server/src/goal-predict/ollama-client.ts) | Gọi LLM local cho reasoning |
| RAG store | [server/src/goal-predict/rag-store.ts](server/src/goal-predict/rag-store.ts) | Tìm top-K trận tương tự |
| API route | [server/src/routes/ai-predict-goal.ts](server/src/routes/ai-predict-goal.ts) | `POST /api/ai/predict-goal` |
| UI badge | [components/GoalPredictionBadge.tsx](components/GoalPredictionBadge.tsx) | Hiển thị trên Dashboard header |

### Tự động mỗi 10 phút trận

Khi mở trận live trên Dashboard, badge **tự gọi** `POST /api/ai/predict-goal` (+ `/reason` async) tại các mốc phút **10, 20, 30, …** (bucket `floor(phút/10)`), không cần bấm **Dự đoán**. Mở trận giữa chừng (vd phút 25): lần đầu có thể predict ngay nếu chưa có snapshot gần mốc 20'; mốc kế tiếp là phút 30. Nút **↻** vẫn gọi tay với `?force=1`.

## Setup ban đầu (chỉ làm 1 lần)

### 1. Cài Ollama + pull model

Tải từ https://ollama.com/download (Windows).

```powershell
# Model chính (cần GPU ~10GB VRAM)
ollama pull qwen2.5:14b-instruct-q4_K_M

# Hoặc nhẹ hơn (8GB VRAM, nhanh hơn ~3x)
ollama pull qwen2.5:7b-instruct-q4_K_M
```

Verify:
```powershell
ollama list
ollama run qwen2.5:14b-instruct-q4_K_M "Hello"
```

### 2. Cấu hình `.env` server

File `D:\WORK\LINH\pro-football-analytics-v2\server\.env`:
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b-instruct-q4_K_M     # khớp với model đã pull
OLLAMA_TIMEOUT_MS=30000

# Optional - skip LLM nếu muốn siêu nhanh (chỉ ONNX prob, không có reasoning Ollama)
# GOAL_PREDICT_ENABLE_LLM=false

# Model 5 phút (mặc định server/models/goal-imminent-5min-v1.onnx)
# GOAL_MODEL_PATH_5MIN=models/goal-imminent-5min-v1.onnx
# GOAL_MODEL_META_PATH_5MIN=models/goal-imminent-5min-v1.meta.json

# Model 30 phút — CHÍNH (mặc định server/models/goal-imminent-30min-v1.onnx)
# GOAL_MODEL_PATH_30MIN=models/goal-imminent-30min-v1.onnx
# GOAL_MODEL_META_PATH_30MIN=models/goal-imminent-30min-v1.meta.json
```

### 3. Setup Python venv cho notebook (1 lần)

```powershell
cd D:\WORK\LINH\pro-football-analytics-v2\notebooks
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install pandas numpy scikit-learn xgboost onnxmltools onnxruntime matplotlib jupyter
```

### 4. Server deps

```powershell
cd D:\WORK\LINH\pro-football-analytics-v2\server
npm install
```

## Workflow khi có thêm trận mới

### A. Lưu trận mới (tự động, không cần làm gì)

Mở trận trong app → xem → back ra. File `.md` tự lưu vào `History/` qua cleanup effect ở [Dashboard.tsx:704](components/Dashboard.tsx#L704).

Hoặc dùng nút **"Lưu .md"** / **"Xuất .md"** trong tab Lịch sử ([MatchHistory.tsx](components/MatchHistory.tsx)).

### B. Retrain model (khi tích lũy thêm 20-50 trận)

**Bước 1 — Extract dataset**
```powershell
cd D:\WORK\LINH\pro-football-analytics-v2\server
npm run extract-goal-data
```
Output:
```
[extract] ===== TÓM TẮT =====
  Files parsed:    XXX/YYY
  Files failed:    Z
  Total rows:      NNNN
  Positive rows:   MM (XX.XX%)
  Dataset:         D:\...\data\goal-dataset.jsonl (+ goal-dataset-5min.jsonl + goal-dataset-30min.jsonl)
  Meta:            D:\...\data\goal-dataset-meta.json (+ -5min-meta.json + -30min-meta.json)
```

**Bước 2 — Train XGBoost trong notebook (CHẠY CẢ 3: 30' chính + 15'/5' tham khảo)**
```powershell
cd ..\notebooks
.\.venv\Scripts\Activate.ps1
jupyter notebook train-goal-model-30min.ipynb   # CHÍNH
jupyter notebook train-goal-model.ipynb         # 15' tham khảo
jupyter notebook train-goal-model-5min.ipynb    # 5' tham khảo
```
- Trong Jupyter: menu **Kernel → Restart & Run All**
- Đợi ~30 giây mỗi notebook
- Cuối notebook in `Saved: D:\...\server\models\goal-imminent-30min-v1.onnx` (v.v.)
- **Đổi feature schema ⇒ phải chạy lại CẢ 3** để `featureNames` (28 cột) khớp ONNX.

> **Lưu ý methodology (cả 3 notebook):**
> - Split **3 chiều** theo `match_id`: train / val / test. Early stopping **chỉ dùng VAL**; test chỉ để báo cáo cuối (tránh leak test vào việc chọn iteration — đây từng là bug khiến AUC bị thổi lên giả).
> - **Không** dùng `scale_pos_weight` (giữ xác suất "thật", không phá calibration).
> - Cell Evaluate in bảng **so sánh với baseline** (hằng số = base rate, logistic theo game-state) + **Brier, log-loss** + dòng `Brier model < const? ĐẠT/CHƯA`. Có cell **chẩn đoán AUC đơn biến** từng feature.
> - `recommendedThreshold` lấy từ VAL (max-F1); `displayThresholds` (P70/P85/P95) cho màu badge — ghi vào meta.

**Kết quả thực tế (hiện tại):**

| Cửa sổ | ROC-AUC | Brier vs baseline | Ghi chú |
|---|---|---|---|
| **30' (CHÍNH)** | **~0.61** | **ĐẠT** (0.223 < 0.230) | có tín hiệu thật; ngưỡng ≥0.7 → precision ~85%. Feature mạnh nhất: `ah12_handicap`, half, minute |
| 15' (tham khảo) | ~0.53 | ~ngang baseline | gần như không tín hiệu |
| 5' (tham khảo) | ~0.52 | ~ngang baseline | gần như không tín hiệu |

Target lý tưởng ≥0.65 vẫn chưa đạt. Đừng tin AUC cũ 0.506 (15'): đó là artifact do leak test set.

**Bước 3 — Restart AI server**
```powershell
cd ..\server
# Ctrl+C terminal đang chạy
npm run dev
```
Log phải thấy (đủ 3 window):
```
[goal-model] windowMin=15 Loaded ...goal-imminent-v1.onnx — AUC 0.53 (XXX train matches)
[goal-model] windowMin=5  Loaded ...goal-imminent-5min-v1.onnx — AUC 0.52 (XXX train matches)
[goal-model] windowMin=30 Loaded ...goal-imminent-30min-v1.onnx — AUC 0.61 (XXX train matches)
[rag-store] Loaded NNNN samples (MM positives)
AI Assistant server running on port 3001
```

**Bước 4 — Verify**
```
http://localhost:3001/api/ai/predict-goal/status
```
Phải trả JSON với `modelLoaded30: true` (chính), `modelLoaded: true` (15'), `modelLoaded5: true`, `ragStats.total: NNNN`, `ollama.available: true`.

App đang chạy KHÔNG cần reload — request kế badge sẽ dùng model mới.

### C. Quick check (không re-train)

Chỉ muốn xem dataset to lên thế nào?
```powershell
cd D:\WORK\LINH\pro-football-analytics-v2\server
npm run extract-goal-data
```
File `data/goal-dataset-meta.json` có summary. RAG store auto refresh khi restart server (kể cả khi giữ model cũ).

## Khi nào nên retrain

| Tình huống | Retrain? |
|---|---|
| Thêm < 10 trận | Không cần |
| Thêm 20-50 trận | Nên retrain |
| Thêm 100+ trận | Bắt buộc — AUC sẽ cải thiện |
| Đổi feature schema | Bắt buộc — `featureNames` phải khớp (hiện **28**, gồm `man_advantage`, `ou13_over_max_step_5m`) |

## Khi nào model "thật sự" tốt — đọc chỉ số nào

Sau khi retrain, **đừng chỉ nhìn ROC-AUC**. Trong cell Evaluate, đạt yêu cầu khi:

1. `Brier model < const?` → **ĐẠT** (model dự báo tốt hơn việc đoán base rate).
2. ROC-AUC test **≥ ~0.60** và PR-AUC **> base rate** một cách rõ ràng.
3. `best_iteration` **không dừng quá sớm** (vài cây) — dừng sớm = không học được gì.
4. Cell chẩn đoán có **nhiều feature `univ_auc ≥ 0.55`**.

Hiện trạng: **30' ĐẠT các tiêu chí trên** (AUC ~0.61, Brier < baseline, best_iteration ~36, 5/28 feature có tín hiệu)
→ dùng được làm tham chiếu, đặc biệt cảnh báo độ tin cao (prob ≥ 0.7 → precision ~85%). **15'/5' chưa đạt**
(AUC ~0.52, output dồn về base rate) → chỉ tham khảo.

## Tại sao 15'/5' AUC thấp & cách cải thiện thật sự

Với cửa sổ ngắn, nút thắt là **DỮ LIỆU/FEATURE, không phải hyperparameter** (đã thử nhiều cấu hình, AUC vẫn ~0.50).
Cửa sổ 30' đỡ hơn vì kèo `ah12_handicap` + game-state (half/minute) phản ánh được "trận có xu hướng có bàn" trong
khoảng dài. Để nâng cả 3 cửa sổ:

1. **Thêm feature giàu tín hiệu** — quan trọng nhất: **xG / chất lượng & vị trí cú sút**, possession 1/3 cuối sân, **score-diff** (cần thêm cột *đội ghi bàn* vào bảng Sự kiện khi export `.md` — hiện events không có team nên không tính được offline).
2. **Nhiều & đa dạng trận hơn** — đa dạng giải đấu, cả high-scoring (3+ bàn) lẫn 0-0/1-0; hiện ~340 trận là ít.
3. **Trận có pressure alert + bàn theo sau** — pattern model cần học.

Đổi label hay dedupe row chỉ giúp biên — không thay được việc thiếu tín hiệu gốc ở cửa sổ ngắn.

## Troubleshooting

### Badge hiển thị "AI lỗi"
→ Server `:3001` chưa chạy hoặc endpoint lỗi. Check log server.

### Badge kẹt "AI ..."
→ Request đang pending vì Ollama chậm. Fix:
- Pull model 7B nhẹ hơn: `ollama pull qwen2.5:7b-instruct-q4_K_M`
- Hoặc skip LLM: `GOAL_PREDICT_ENABLE_LLM=false` trong `.env`

### Log server: `Không load được model: ENOENT ...`
→ File ONNX chưa có. Chạy notebook để sinh ra.

### Log server: `Không đọc được goal-dataset.jsonl`
→ Chưa chạy `npm run extract-goal-data`.

### Path bị "server/server/models/..." (double)
→ Bug path trong `config.ts`. Đã fix — dùng path relative đến server CWD: `models/...` và `../data/...`.

### Endpoint status trả `ollama.available: false`
→ Ollama service chưa chạy. Mở PowerShell:
```powershell
ollama serve   # giữ window mở
```
Hoặc kiểm tra dịch vụ Ollama đã start trong Services.

### Ollama hết VRAM (out-of-memory)
→ Dùng model nhỏ hơn (`qwen2.5:7b-instruct-q4_K_M`) hoặc quantization mạnh hơn (`q3_K_M`).

### ONNX export lỗi `could not convert string to float: 'feature_name'`
→ Đã fix trong notebook — cell 2102a950 convert X sang numpy (bỏ tên cột). Nếu thấy lại: đảm bảo cell đó dùng `df[feature_cols].astype(np.float32).to_numpy()` thay vì để DataFrame.

## API tham khảo

### `GET /api/ai/predict-goal/status`
Kiểm tra model + Ollama đã sẵn sàng chưa.

### `POST /api/ai/predict-goal`
Body:
```json
{
  "matchId": "11833805",
  "half": 2,
  "minute": 68,
  "match": {
    "stats": [...],
    "events": [...],
    "alerts": [...],
    "odds": [...]
  }
}
```

Response (30' là cửa sổ CHÍNH; 15'/5' tham khảo):
```json
{
  "goalProb30": 0.66,
  "goalProb15": 0.39,
  "goalProb5": 0.16,
  "goalProb": 0.39,
  "topFeatures": [{"name":"ah12_handicap","value":-0.75,"importance":0.07}, ...],
  "similarMatches": [{"matchId":"11450879","half":2,"minute":75,"label":1,"similarity":0.92}, ...],
  "reasonVi": "Kèo chấp nghiêng chủ + cuối hiệp 2 — xu hướng có bàn trong 30' tới.",
  "modelMeta30": {
    "version":"v2","rocAuc":0.611,"brier":0.223,"baselineBrier":0.230,
    "recommendedThreshold":0.527,
    "displayThresholds":{"warn":0.620,"high":0.662,"extreme":0.725},
    "numTrainMatches":213,...
  },
  "modelMeta": {"version":"v2","rocAuc":0.531,...},
  "modelMeta5": {"version":"v2","rocAuc":0.518,...},
  "latencyMs": {"onnx30": 8, "onnx": 7, "onnx5": 7, "ollama": 4200}
}
```

## Thư mục/file quan trọng

```
pro-football-analytics-v2/
├── History/                            # Nguồn data (.md files)
├── data/
│   ├── goal-dataset.jsonl              # extract script (window 15')
│   ├── goal-dataset-meta.json
│   ├── goal-dataset-5min.jsonl         # window 5'
│   ├── goal-dataset-5min-meta.json
│   ├── goal-dataset-30min.jsonl        # window 30' (CHÍNH)
│   └── goal-dataset-30min-meta.json
├── notebooks/
│   ├── .venv/                          # Python venv
│   ├── train-goal-model-30min.ipynb    # model 30' (CHÍNH)
│   ├── train-goal-model.ipynb          # model 15' (tham khảo)
│   └── train-goal-model-5min.ipynb     # model 5' (tham khảo)
└── server/
    ├── .env                            # OLLAMA_MODEL, GOAL_PREDICT_ENABLE_LLM, ...
    ├── models/
    │   ├── goal-imminent-30min-v1.onnx # CHÍNH (30')
    │   ├── goal-imminent-30min-v1.meta.json
    │   ├── goal-imminent-v1.onnx       # 15'
    │   ├── goal-imminent-v1.meta.json
    │   ├── goal-imminent-5min-v1.onnx  # 5'
    │   └── goal-imminent-5min-v1.meta.json
    └── src/
        ├── goal-predict/               # md-parser, feature-builder, onnx-service, ollama-client, rag-store
        ├── routes/ai-predict-goal.ts
        └── scripts/extract-goal-dataset.ts
```
