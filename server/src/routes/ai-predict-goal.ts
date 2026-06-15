/**
 * POST /api/ai/predict-goal
 * Fast path: ONLY ONNX + heuristic reason. Không gọi LLM → trả về <100ms.
 * Output: { goalProb, topFeatures, similarMatches, reasonVi (heuristic), modelMeta, latencyMs.onnx }
 *
 * POST /api/ai/predict-goal/reason
 * Slow path: gọi Ollama, OpenAI và DeepSeek SONG SONG để sinh reasonVi.
 * Body giống POST /. Output: { ollama, gpt, deepseek: { reasonVi, latencyMs, error? } }
 *
 * GET /api/ai/predict-goal/status
 * Output: { modelLoaded, ragLoaded, ollamaModels, openaiEnabled, ... }
 */

import { Router, Request, Response } from 'express';
import { buildFeatureVector, buildOpeningLinesRef, GOAL_WINDOW_MIN, type FeatureVector, type OpeningLinesRef } from '../goal-predict/feature-builder.js';
import type { ParsedMatch, Half, StatRow } from '../goal-predict/md-parser.js';
import {
    isReady as modelReady,
    predictGoalProb,
    getMeta as getModelMeta,
    getLoadError,
    getTopContributingFeatures,
    GOAL_WINDOW_MIN_SHORT,
    GOAL_WINDOW_MIN_LONG,
} from '../goal-predict/onnx-service.js';
import { topK, ragStats, getMatchDetail, getCumulativeStatsAt, getOddsHistory13, totalsFromStats, type SimilarMatch, type CumulativeTotals, type LineMatchContext } from '../goal-predict/rag-store.js';
import { callOllama, pingOllama } from '../goal-predict/ollama-client.js';
import { callOpenAiReason } from '../goal-predict/openai-reason.js';
import { callDeepSeekReason, isDeepSeekEnabled } from '../goal-predict/deepseek-reason.js';
import { TtlCache, hashFeatures } from '../goal-predict/predict-cache.js';
import { buildHeuristicReason, normalizeReason } from '../goal-predict/reason-normalize.js';
import { config } from '../config.js';
import { logger } from '../index.js';
import {
    appendGoalPredictionRow,
    deriveDuDoan15,
    minuteBucket10,
    type GoalPredictionRow,
} from '../services/goal-prediction-sheets.js';
import { formatGmt7 } from '../services/google-sheets.js';

/** Cache fast-path predict — feature vector cùng key → bỏ qua ONNX trong 60s. */
const PREDICT_CACHE_TTL_MS = parseInt(process.env.PREDICT_CACHE_TTL_MS || '60000', 10);
/** Cache /reason lâu hơn vì Ollama + GPT đắt; LLM stochastic nên user có thể `?force=1` để bypass. */
const REASON_CACHE_TTL_MS = parseInt(process.env.REASON_CACHE_TTL_MS || '300000', 10);

const predictCache = new TtlCache<PredictGoalResponse>(PREDICT_CACHE_TTL_MS);
const reasonCache = new TtlCache<ReasonResponse>(REASON_CACHE_TTL_MS);

/** Số tình huống tương tự hiển thị nhanh trên badge (fast path). */
const UI_SIMILAR_TOP_K = 5;
/** Số tình huống tương tự đưa vào prompt Ollama + GPT + DeepSeek — khớp modal "Xem tất cả (top 20)". */
const LLM_SIMILAR_TOP_K = parseInt(process.env.LLM_SIMILAR_TOP_K || '20', 10);

/** Metadata từ frontend để server tự ghi Google Sheets sau predict (không phụ thuộc POST riêng). */
interface PredictGoalSheetLogMeta {
    predictionId: string;
    giaiDau?: string;
    doiNha?: string;
    doiKhach?: string;
    tySoLucDuDoan?: string;
    timestampGmt7?: string;
}

interface PredictGoalRequest {
    matchId: string;
    half: 1 | 2;
    minute: number;
    /** ParsedMatch-shape: { meta?, stats, events, alerts, odds }. */
    match: Omit<ParsedMatch, 'meta'> & { meta?: ParsedMatch['meta'] };
    sheetLog?: PredictGoalSheetLogMeta;
    /**
     * Bật GPT + DeepSeek (LLM cloud tốn token) cho trận này. Mặc định false → chỉ
     * Ollama local chạy để tiết kiệm token. Frontend bật theo từng trận bằng nút ⚡.
     */
    enableCloudAi?: boolean;
}

interface PredictGoalResponse {
    /** Backward-compat — luôn = goalProb15. */
    goalProb: number | null;
    goalProb15: number | null;
    goalProb5: number | null;
    /** Cửa sổ CHÍNH (30'). 15'/5' chỉ tham khảo. */
    goalProb30: number | null;
    topFeatures: Array<{ name: string; value: number; importance: number }>;
    similarMatches: Array<{
        matchId: string;
        half: number;
        minute: number;
        label: 0 | 1;
        label30?: 0 | 1;
        similarity: number;
        home?: string;
        away?: string;
        ftStatus?: string;
        features?: Record<string, number>;
    }>;
    /** Feature THẬT của trận đang xem — để popup "Chi tiết" so sánh với tình huống tương tự. */
    queryFeatures?: Record<string, number>;
    /** Vạch mở hiệp 1_3 H1/H2 của trận đang xem — dùng hiển thị so khớp line đầu hiệp. */
    openingLines?: OpeningLinesRef;
    reasonVi: string;
    modelMeta: ReturnType<typeof getModelMeta>;
    modelMeta5: ReturnType<typeof getModelMeta>;
    modelMeta30: ReturnType<typeof getModelMeta>;
    latencyMs: { onnx: number; onnx5: number; onnx30: number };
    fallback?: string;
}

interface ReasonOutput {
    reasonVi: string;
    latencyMs: number;
    error?: string;
    source?: 'llm' | 'heuristic_fallback';
    /** % có bàn trong 30' tới — LLM tự ước lượng (hoặc ONNX khi fallback). */
    goalProb30Pct?: number | null;
}

interface ReasonResponse {
    ollama: ReasonOutput;
    gpt: ReasonOutput;
    deepseek: ReasonOutput;
}

export const predictGoalRouter = Router();

predictGoalRouter.get('/', (_req: Request, res: Response): void => {
    res.json({
        endpoint: '/api/ai/predict-goal',
        usage: 'POST với body { matchId, half, minute, match: { stats, events, alerts, odds } }',
        reasonEndpoint: '/api/ai/predict-goal/reason',
        statusEndpoint: '/api/ai/predict-goal/status',
        modelLoaded30: modelReady(GOAL_WINDOW_MIN_LONG),
        modelLoaded: modelReady(15),
        modelLoaded5: modelReady(GOAL_WINDOW_MIN_SHORT),
    });
});

predictGoalRouter.get('/status', async (_req: Request, res: Response): Promise<void> => {
    const ollama = config.goalPredict.enableLLM ? await pingOllama() : { ok: false, models: [], error: 'disabled' };
    res.json({
        modelLoaded: modelReady(15),
        modelLoadError: getLoadError(15),
        modelMeta: getModelMeta(15),
        modelLoaded5: modelReady(GOAL_WINDOW_MIN_SHORT),
        modelLoadError5: getLoadError(GOAL_WINDOW_MIN_SHORT),
        modelMeta5: getModelMeta(GOAL_WINDOW_MIN_SHORT),
        modelLoaded30: modelReady(GOAL_WINDOW_MIN_LONG),
        modelLoadError30: getLoadError(GOAL_WINDOW_MIN_LONG),
        modelMeta30: getModelMeta(GOAL_WINDOW_MIN_LONG),
        ragStats: ragStats(),
        ollama: {
            url: config.ollama.baseUrl,
            model: config.ollama.model,
            available: ollama.ok,
            models: ollama.models,
            error: ollama.error,
        },
        openai: {
            enabled: config.openai.enabled,
            model: config.openai.model,
        },
        deepseek: {
            enabled: isDeepSeekEnabled(),
            model: config.goalPredict.deepseekModel,
            baseUrl: config.agent.deepseekBaseUrl,
        },
        cache: {
            predict: predictCache.stats(),
            reason: reasonCache.stats(),
        },
    });
});

/**
 * GET /api/ai/predict-goal/match-detail?matchId=...
 * Trả tên 2 đội + giải + tỷ số chung cuộc + trạng thái (đọc lazy History md, cache).
 * Dùng cho popup "Chi tiết" ở mục Tình huống tương tự.
 */
predictGoalRouter.get('/match-detail', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.query.matchId ?? '').trim();
    if (!matchId) {
        res.status(400).json({ error: 'Thiếu query ?matchId=' });
        return;
    }
    const detail = await getMatchDetail(matchId);
    if (!detail) {
        res.status(404).json({ error: `Không có thông tin chi tiết cho match ${matchId}` });
        return;
    }
    res.json(detail);
});

/**
 * GET /api/ai/predict-goal/odds-history?matchId=...
 * Trả lịch sử odds Tài/Xỉu cả trận (1_3) + bàn thắng (đọc lazy full History md, cache).
 * Dùng cho biểu đồ "Kèo Tài 1_3" trong modal Tất cả tình huống tương tự.
 */
predictGoalRouter.get('/odds-history', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.query.matchId ?? '').trim();
    if (!matchId) {
        res.status(400).json({ error: 'Thiếu query ?matchId=' });
        return;
    }
    const data = await getOddsHistory13(matchId);
    if (!data) {
        res.status(404).json({ error: `Không có dữ liệu odds cho match ${matchId}` });
        return;
    }
    res.json(data);
});

/** Parse body → ParsedMatch + half + minute, hoặc trả lỗi 400. */
function parseRequest(req: Request, res: Response): { parsed: ParsedMatch; half: Half; minute: number; body: PredictGoalRequest } | null {
    const body = req.body as PredictGoalRequest;
    if (!body || !body.match || !body.match.stats) {
        res.status(400).json({ error: 'Body cần { matchId, half, minute, match: { stats, events, alerts, odds } }' });
        return null;
    }
    const half = (body.half === 2 ? 2 : 1) as Half;
    const minute = Number(body.minute);
    if (!Number.isFinite(minute)) {
        res.status(400).json({ error: 'minute không hợp lệ' });
        return null;
    }
    const parsed: ParsedMatch = {
        meta: body.match.meta ?? {
            matchId: body.matchId,
            homeName: '',
            awayName: '',
            league: '',
            finalScore: '',
            ftStatus: '',
            viewedAtMs: null,
            timerRaw: '',
        },
        stats: body.match.stats || [],
        events: body.match.events || [],
        alerts: body.match.alerts || [],
        odds: body.match.odds || [],
    };
    return { parsed, half, minute, body };
}

/** Vạch mở hiệp từ odds trong request — best-effort khi có `match.odds`. */
function lineCtxFromMatch(match: PredictGoalRequest['match'] | undefined): LineMatchContext | undefined {
    if (!match?.odds?.length) return undefined;
    const parsed: ParsedMatch = {
        meta: match.meta ?? {
            matchId: '',
            homeName: '',
            awayName: '',
            league: '',
            finalScore: '',
            ftStatus: '',
            viewedAtMs: null,
            timerRaw: '',
        },
        stats: match.stats || [],
        events: match.events || [],
        alerts: match.alerts || [],
        odds: match.odds || [],
    };
    const ref = buildOpeningLinesRef(parsed);
    if (!Number.isFinite(ref.h1OpenOu13) && !Number.isFinite(ref.h2OpenOu13)) return undefined;
    return ref;
}

/** Enrich danh sách similar với tỷ số FT, giải, tổng lũy kế, prob30. */
async function enrichSimilarList(similar: SimilarMatch[]): Promise<SimilarMatchFull[]> {
    return Promise.all(
        similar.map(async (s) => {
            const [detail, totals, prob30] = await Promise.all([
                getMatchDetail(s.matchId),
                getCumulativeStatsAt(s.matchId, s.half, s.minute),
                s.features
                    ? predictGoalProb(s.features as FeatureVector, GOAL_WINDOW_MIN_LONG)
                    : Promise.resolve(null),
            ]);
            return {
                ...s,
                home: detail?.homeName || s.home,
                away: detail?.awayName || s.away,
                ftStatus: detail?.ftStatus || s.ftStatus,
                finalScore: detail?.finalScore,
                league: detail?.league,
                totals,
                prob30,
            };
        }),
    );
}

export type SheetLogResult =
    | { ok: true; rowIndex?: number; deduped?: boolean }
    | { ok: false; error: string };

/** Ghi 1 dòng lên Sheets — chỉ gọi từ server predict (client không POST trùng). */
async function writeGoalPredictionSheetLog(
    body: PredictGoalRequest,
    half: 1 | 2,
    minute: number,
    response: PredictGoalResponse,
): Promise<SheetLogResult | undefined> {
    if (!config.features.sheetsLogging || !config.googleSheets.enabled) return undefined;
    const meta = body.sheetLog;
    if (!meta?.predictionId?.trim()) return undefined;
    const prob15 = response.goalProb15 ?? response.goalProb;
    if (typeof prob15 !== 'number') {
        return { ok: false, error: 'Không có prob15 để ghi sheet' };
    }

    const metaMatch = body.match.meta;
    const entry: GoalPredictionRow = {
        predictionId: meta.predictionId.trim(),
        timestampGmt7: meta.timestampGmt7 || formatGmt7(),
        matchId: body.matchId,
        giaiDau: meta.giaiDau || metaMatch?.league || '',
        doiNha: meta.doiNha || metaMatch?.homeName || '',
        doiKhach: meta.doiKhach || metaMatch?.awayName || '',
        hieu: half,
        phut: minute,
        khoang10: minuteBucket10(minute),
        tySoLucDuDoan: meta.tySoLucDuDoan || metaMatch?.finalScore || 'N/A',
        prob15Pct: Math.round(prob15 * 100),
        prob5Pct:
            typeof response.goalProb5 === 'number' ? Math.round(response.goalProb5 * 100) : '',
        duDoan15: deriveDuDoan15(prob15),
        model15: response.modelMeta?.version ?? '',
        onnxMs: response.latencyMs?.onnx ?? '',
        reasonHeuristic: (response.reasonVi || response.fallback || '').slice(0, 500),
        prob30Pct:
            typeof response.goalProb30 === 'number' ? Math.round(response.goalProb30 * 100) : '',
        duDoan30:
            typeof response.goalProb30 === 'number' ? deriveDuDoan15(response.goalProb30) : '',
        model30: response.modelMeta30?.version ?? '',
    };

    try {
        const { rowIndex, deduped } = await appendGoalPredictionRow(entry);
        logger.info(
            `[sheets-goal] predict-goal ${entry.predictionId} row=${rowIndex}${deduped ? ' (dedup)' : ''}`,
        );
        return { ok: true, rowIndex, deduped };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[sheets-goal] predict-goal log failed ${entry.predictionId}:`, err);
        return { ok: false, error: msg };
    }
}

predictGoalRouter.post('/', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const ctx = parseRequest(req, res);
    if (!ctx) return;
    const { parsed, half, minute, body } = ctx;

    const features = buildFeatureVector(parsed, half, minute);
    if (!features) {
        res.status(400).json({ error: 'Không đủ stats để build feature vector (cần ít nhất 1 stat row trong cùng hiệp ≤ minute)' });
        return;
    }

    const cacheKey = hashFeatures(features);
    const force = req.query.force === '1';
    if (!force) {
        const cached = predictCache.get(cacheKey);
        if (cached) {
            logger.info(
                `predict-goal match=${body.matchId} h=${half} m=${minute} CACHE HIT key=${cacheKey} (${Date.now() - t0}ms)`,
            );
            const sheetLog = await writeGoalPredictionSheetLog(body, half, minute, cached);
            res.json({ ...cached, ...(sheetLog !== undefined ? { sheetLog } : {}) });
            return;
        }
    }

    const tOnnx0 = Date.now();
    const goalProb15 = await predictGoalProb(features, GOAL_WINDOW_MIN);
    const onnxMs = Date.now() - tOnnx0;
    const tOnnx5 = Date.now();
    const goalProb5 = await predictGoalProb(features, GOAL_WINDOW_MIN_SHORT);
    const onnx5Ms = Date.now() - tOnnx5;
    const tOnnx30 = Date.now();
    const goalProb30 = await predictGoalProb(features, GOAL_WINDOW_MIN_LONG);
    const onnx30Ms = Date.now() - tOnnx30;

    // Cửa sổ CHÍNH là 30'; top features & reason lấy theo model 30' (fallback 15' nếu 30' chưa load).
    const mainProb = goalProb30 ?? goalProb15;
    const mainWindow = goalProb30 != null ? GOAL_WINDOW_MIN_LONG : GOAL_WINDOW_MIN;
    const topFeatures = getTopContributingFeatures(features, 5, mainWindow);
    const openingLines = buildOpeningLinesRef(parsed);
    const similar = topK(features, UI_SIMILAR_TOP_K, false, true, undefined, 'legacy');

    const fallback = mainProb == null
        ? `Model chưa load: ${getLoadError(30) || getLoadError(15) || 'unknown'}. Chạy training notebook để sinh ONNX.`
        : undefined;
    const reasonVi =
        mainProb != null
            ? buildHeuristicReason(mainProb, features, topFeatures, goalProb5, mainWindow)
            : '';

    const response: PredictGoalResponse = {
        goalProb: goalProb15,
        goalProb15,
        goalProb5,
        goalProb30,
        topFeatures,
        similarMatches: similar,
        queryFeatures: { ...features },
        openingLines,
        reasonVi,
        modelMeta: getModelMeta(15),
        modelMeta5: getModelMeta(GOAL_WINDOW_MIN_SHORT),
        modelMeta30: getModelMeta(GOAL_WINDOW_MIN_LONG),
        latencyMs: { onnx: onnxMs, onnx5: onnx5Ms, onnx30: onnx30Ms },
        fallback,
    };
    // Chỉ cache khi có ít nhất 1 model load OK (tránh "đóng băng" lỗi load tạm thời).
    if (mainProb != null) predictCache.set(cacheKey, response);
    logger.info(
        `predict-goal match=${body.matchId} h=${half} m=${minute} prob30=${goalProb30} prob15=${goalProb15} prob5=${goalProb5} total=${Date.now() - t0}ms (fast, miss key=${cacheKey})`,
    );
    const sheetLog = await writeGoalPredictionSheetLog(body, half, minute, response);
    res.json({ ...response, ...(sheetLog !== undefined ? { sheetLog } : {}) });
});

predictGoalRouter.post('/reason', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const ctx = parseRequest(req, res);
    if (!ctx) return;
    const { parsed, half, minute, body } = ctx;

    const features = buildFeatureVector(parsed, half, minute);
    if (!features) {
        res.status(400).json({ error: 'Không đủ stats để build feature vector' });
        return;
    }

    // Cloud AI (GPT + DeepSeek) bật theo từng trận để tiết kiệm token; Ollama luôn chạy.
    // Cache tách theo cloud on/off để không trả kết quả thiếu GPT/DeepSeek khi user vừa bật.
    const cloudAi = body.enableCloudAi === true;
    const cacheKey = `${hashFeatures(features)}:${cloudAi ? 'cloud' : 'local'}`;
    const force = req.query.force === '1';
    if (!force) {
        const cached = reasonCache.get(cacheKey);
        if (cached) {
            logger.info(
                `predict-goal/reason match=${body.matchId} h=${half} m=${minute} CACHE HIT key=${cacheKey} (${Date.now() - t0}ms)`,
            );
            res.json(cached);
            return;
        }
    }

    // Cửa sổ CHÍNH 30' (fallback 15' nếu 30' chưa load).
    const goalProb = (await predictGoalProb(features, GOAL_WINDOW_MIN_LONG)) ?? (await predictGoalProb(features, GOAL_WINDOW_MIN));
    if (goalProb == null) {
        res.status(503).json({ error: `Model chưa load: ${getLoadError(30) || getLoadError(15) || 'unknown'}` });
        return;
    }
    const mainWindow = modelReady(GOAL_WINDOW_MIN_LONG) ? GOAL_WINDOW_MIN_LONG : GOAL_WINDOW_MIN;
    const topFeatures = getTopContributingFeatures(features, 5, mainWindow);
    const similar = topK(features, LLM_SIMILAR_TOP_K, false, true, undefined, 'legacy');
    const expectGoalProb30Pct = mainWindow === GOAL_WINDOW_MIN_LONG;
    const llmPrompt = buildReasonPrompt(features, similar, mainWindow, { requireProbPct: expectGoalProb30Pct });

    const ollamaEnabled = config.goalPredict.enableLLM;
    // GPT + DeepSeek chỉ chạy khi trận này được bật Cloud AI (tiết kiệm token).
    const gptEnabled = cloudAi && config.openai.enabled;
    const deepseekEnabled = cloudAi && isDeepSeekEnabled();

    const ollamaP: Promise<ReasonOutput> = ollamaEnabled
        ? callOllama({ ...llmPrompt, json: true }).then((r) =>
              normalizeReason(
                  r.text,
                  r.error,
                  r.durationMs,
                  features,
                  goalProb,
                  topFeatures,
                  mainWindow,
                  'Ollama',
                  expectGoalProb30Pct,
              ),
          )
        : Promise.resolve({ reasonVi: '', latencyMs: 0, error: 'Ollama disabled (GOAL_PREDICT_ENABLE_LLM=false)' });

    const gptP: Promise<ReasonOutput> = gptEnabled
        ? callOpenAiReason({ ...llmPrompt, json: true }).then((r) =>
              normalizeReason(
                  r.text,
                  r.error,
                  r.durationMs,
                  features,
                  goalProb,
                  topFeatures,
                  mainWindow,
                  'GPT',
                  expectGoalProb30Pct,
              ),
          )
        : Promise.resolve({ reasonVi: '', latencyMs: 0, error: cloudAi ? 'OpenAI disabled (OPENAI_API_KEY chưa cấu hình)' : 'Cloud AI tắt — bật ⚡ ở trận này để chạy GPT' });

    const deepseekP: Promise<ReasonOutput> = deepseekEnabled
        ? callDeepSeekReason({ ...llmPrompt, json: true }).then((r) =>
              normalizeReason(
                  r.text,
                  r.error,
                  r.durationMs,
                  features,
                  goalProb,
                  topFeatures,
                  mainWindow,
                  'DeepSeek',
                  expectGoalProb30Pct,
              ),
          )
        : Promise.resolve({ reasonVi: '', latencyMs: 0, error: cloudAi ? 'DeepSeek disabled (DEEPSEEK_API_KEY chưa cấu hình)' : 'Cloud AI tắt — bật ⚡ ở trận này để chạy DeepSeek' });

    const [ollama, gpt, deepseek] = await Promise.all([ollamaP, gptP, deepseekP]);

    const response: ReasonResponse = { ollama, gpt, deepseek };
    // Chỉ cache khi có ít nhất 1 LLM trả về reason thật (không phải toàn lỗi).
    const hasUsefulReason =
        (ollama.reasonVi && !ollama.error) ||
        (gpt.reasonVi && !gpt.error) ||
        (deepseek.reasonVi && !deepseek.error);
    if (hasUsefulReason) reasonCache.set(cacheKey, response);
    logger.info(
        `predict-goal/reason match=${body.matchId} h=${half} m=${minute} ollama=${ollama.latencyMs}ms gpt=${gpt.latencyMs}ms deepseek=${deepseek.latencyMs}ms total=${Date.now() - t0}ms (miss key=${cacheKey})`,
    );
    res.json(response);
});

/** 1 tình huống tương tự + tỷ số chung cuộc (FT) + giải + tổng lũy kế — phục vụ modal "Xem tất cả". */
interface SimilarMatchFull extends SimilarMatch {
    finalScore?: string;
    league?: string;
    /** Tổng DA/sút/sút trúng/phạt góc từ đầu trận đến phút tương tự (null nếu không đọc được md). */
    totals?: CumulativeTotals | null;
    /** Xác suất có bàn 30' theo model chính tại phút tương tự (null nếu model chưa load hoặc thiếu features). */
    prob30?: number | null;
}

/**
 * POST /api/ai/predict-goal/similar?limit=20
 * Trả top-N tình huống tương tự (cùng/gần vạch kèo) kèm tỷ số FT + giải để hiển thị
 * bảng so sánh trong modal. Không cache (mở thủ công, ít gọi).
 */
predictGoalRouter.post('/similar', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const rawBody = (req.body ?? {}) as { matchId?: string; queryFeatures?: Record<string, number> };

    // Ưu tiên dùng queryFeatures client gửi (đã build thành công lúc predict) → tránh dựng lại
    // feature vector (có thể thiếu stats tại thời điểm mở modal). Fallback: build từ match data.
    let features: FeatureVector | null = null;
    let matchId = rawBody.matchId ?? '';
    let half: 1 | 2 = 1;
    let minute = 0;
    const clientFeats = rawBody.queryFeatures;
    if (clientFeats && typeof clientFeats === 'object' && Object.keys(clientFeats).length > 0) {
        features = clientFeats as FeatureVector;
        half = (Number(clientFeats.half) === 2 ? 2 : 1);
        minute = Number(clientFeats.minute) || 0;
    } else {
        const ctx = parseRequest(req, res);
        if (!ctx) return; // parseRequest đã trả 400
        features = buildFeatureVector(ctx.parsed, ctx.half, ctx.minute);
        matchId = ctx.body.matchId;
        half = ctx.half;
        minute = ctx.minute;
        if (!features) {
            res.status(400).json({ error: 'Không đủ stats để build feature vector' });
            return;
        }
    }

    if (!features) {
        res.status(400).json({ error: 'Thiếu queryFeatures hoặc stats để tìm trận tương tự' });
        return;
    }

    const limitRaw = parseInt(String(req.query.limit ?? '20'), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

    const bodyMatch = (rawBody as PredictGoalRequest).match;
    const lineCtx = lineCtxFromMatch(bodyMatch);

    const similarLegacy = topK(features, limit, false, true, undefined, 'legacy');
    const similarOpenLine = topK(features, limit, false, true, lineCtx, 'openLine');
    const [enrichedLegacy, enrichedOpenLine] = await Promise.all([
        enrichSimilarList(similarLegacy),
        enrichSimilarList(similarOpenLine),
    ]);

    // Tổng lũy kế của TRẬN ĐANG XEM — tính từ stats client gửi kèm (nếu có).
    const currentStats = (rawBody as { match?: { stats?: StatRow[] } }).match?.stats;
    const currentTotals: CumulativeTotals | null = Array.isArray(currentStats)
        ? totalsFromStats(currentStats, half, minute)
        : null;

    logger.info(
        `predict-goal/similar match=${matchId} h=${half} m=${minute} limit=${limit} → legacy=${enrichedLegacy.length} openLine=${enrichedOpenLine.length} (${Date.now() - t0}ms)`,
    );
    res.json({
        queryFeatures: { ...features },
        openingLines: lineCtx,
        similarMatches: enrichedLegacy,
        similarMatchesOpenLine: enrichedOpenLine,
        currentTotals,
    });
});

/**
 * Prompt dùng chung Ollama + GPT + DeepSeek.
 * windowMin = cửa sổ dự đoán (hiện chính là 30').
 * opts.requireProbPct = true → bắt buộc trả goalProb30Pct (0–100) kèm reasonVi.
 */
function buildReasonPrompt(
    features: ReturnType<typeof buildFeatureVector>,
    similar: SimilarMatch[],
    windowMin: number = GOAL_WINDOW_MIN,
    opts?: { requireProbPct?: boolean },
): { system: string; user: string } {
    if (!features) return { system: '', user: '' };

    const requireProbPct = opts?.requireProbPct === true && windowMin === GOAL_WINDOW_MIN_LONG;

    const systemBase = [
        'Bạn là bình luận viên kiêm chuyên gia phân tích bóng đá người Việt, đang bình luận TRỰC TIẾP một trận đấu.',
        'NGÔN NGỮ BẮT BUỘC: TIẾNG VIỆT có dấu. TUYỆT ĐỐI KHÔNG dùng tiếng Trung (中文), tiếng Anh hay ngôn ngữ khác; nếu lỡ, viết lại toàn bộ bằng tiếng Việt.',
    ];

    const taskLine = requireProbPct
        ? [
              `Nhiệm vụ (2 phần):`,
              `1) TỰ ước lượng xác suất (%) có ít nhất một bàn thắng trong ${windowMin} phút tới — trường goalProb30Pct (số nguyên 0–100). Căn cứ: diễn biến hiện tại + tỷ lệ các trận tương tự đã có/không có bàn sau đó. KHÔNG copy số từ đâu khác, bạn phải tự cân nhắc.`,
              `2) Viết 1–2 câu bình luận BLV (reasonVi) giải thích ngắn gọn — KHÔNG ghi % hay con số xác suất trong reasonVi (để riêng ở goalProb30Pct).`,
          ].join('\n')
        : `Nhiệm vụ: TỰ cân nhắc và đưa ra MỘT nhận định về khả năng có bàn thắng trong ${windowMin} phút tới, DỰA TRÊN diễn biến hiện tại của trận VÀ KẾT CỤC của các tình huống quá khứ tương tự (cùng vạch kèo) được cung cấp — KHÔNG có xác suất dựng sẵn, bạn phải tự đánh giá. Nói như một BLV trên sóng, KHÔNG đọc số khô khan, KHÔNG liệt kê chỉ số.`;

    const styleLines = requireProbPct
        ? [
              'Quy tắc văn phong reasonVi:',
              '- 1–2 câu liền mạch, tối đa ~280 ký tự; giọng BLV trực tiếp.',
              '- Chỉ 1–2 chi tiết nổi bật (thế trận, kèo, xu hướng trận tương tự); KHÔNG liệt kê số liệu.',
              '- KHÔNG ghi %, "xác suất 62%", hay số goalProb30Pct trong reasonVi.',
          ]
        : [
              'Quy tắc văn phong:',
              '- Viết 1–2 câu liền mạch, có nhịp, giọng người thật; tối đa khoảng 280 ký tự.',
              '- Chỉ chọn 1–2 chi tiết NỔI BẬT NHẤT (thế trận hiện tại, diễn biến kèo, và xu hướng từ các trận tương tự) lồng vào lời bình; KHÔNG nêu hết mọi con số.',
              '- KHÔNG dùng các từ kỹ thuật "model", "feature", "similarity", "xác suất 62.7%". Nếu muốn nói mức khả năng thì diễn đạt bằng lời (vd "khả năng có bàn đang ở mức cao").',
          ];

    const schemaLine = requireProbPct
        ? [
              'CHỈ trả json hợp lệ đúng schema (CẢ HAI field bắt buộc, reasonVi không được rỗng):',
              '{ "goalProb30Pct": 55, "reasonVi": "1–2 câu tiếng Việt không có %" }',
              'KHÔNG markdown, KHÔNG ký tự ngoài json.',
          ].join('\n')
        : 'CHỈ trả json đúng schema: { "reasonVi": "1–2 câu tiếng Việt tự nhiên" }. KHÔNG markdown, KHÔNG ký tự ngoài json.';

    const system = [
        ...systemBase,
        taskLine,
        ...styleLines,
        '- Bám sát dữ liệu được cung cấp; KHÔNG bịa tên cầu thủ hay sự kiện không có trong dữ liệu.',
        '- Được dùng ngôn ngữ đánh giá tự nhiên: "đang dồn ép", "thế trận cởi mở", "nhịp độ chững lại", "nhà cái đẩy/kéo kèo", "bế tắc", "những trận cùng kịch bản thường vỡ òa"…',
        schemaLine,
        'Ví dụ giọng tốt (đa dạng cách mở đầu, KHÔNG sao chép y nguyên):',
        '- "Sức ép đang dồn dập với loạt pha bóng nguy hiểm liên tiếp, lại thêm nhà cái kéo kèo Tài — và phần lớn kịch bản tương tự trước đây đã có bàn ngay sau đó."',
        '- "Tỷ số vẫn cân bằng, nhưng các tình huống cùng thế trận trong quá khứ hiếm khi bùng nổ ở giai đoạn này nên cơ hội có bàn lúc này không cao."',
        '- "Hai đội đang thận trọng, thế trận bế tắc và dòng tiền chưa nghiêng hẳn — giống phần lớn kịch bản tương tự đều tịt ngòi."',
    ].join('\n');

    const fmtHcap = (v?: number): string =>
        typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '—';

    const ouMove = features.ou13_over_drops_5m_count >= 1
        ? `nhà cái kéo kèo Tài ${features.ou13_over_drops_5m_count} lần (tổng -${features.ou13_over_drops_5m_sum.toFixed(2)})`
        : features.ou13_under_rises_5m_count >= 1
            ? `kèo Xỉu bị đẩy lên ${features.ou13_under_rises_5m_count} lần`
            : 'kèo Tài/Xỉu gần như đứng yên';
    const ahMove = features.ah12_home_drops_5m_count >= 1 ? `kèo chấp nghiêng dần về chủ nhà` : `kèo chấp ít biến động`;

    // Số liệu + KẾT CỤC từng trận tương tự — nguồn chính để AI nhận định.
    // Lấy nhãn ĐÚNG cửa sổ đang dự đoán: 30' → label30, ngược lại → label (15').
    const isLongWindow = windowMin === GOAL_WINDOW_MIN_LONG;
    const outcomeLabel = (s: SimilarMatch): 0 | 1 | undefined => (isLongWindow ? s.label30 : s.label);
    const top = similar;
    const known = top.filter((s) => outcomeLabel(s) === 0 || outcomeLabel(s) === 1);
    const posCount = known.filter((s) => outcomeLabel(s) === 1).length;
    const simLines = top.map((s) => {
        const f = s.features ?? {};
        const teams = s.home && s.away ? `${s.home} vs ${s.away}` : `trận ${s.matchId}`;
        const lbl = outcomeLabel(s);
        const outcome = lbl === 1
            ? `CÓ bàn trong ${windowMin}' sau đó`
            : lbl === 0
                ? `KHÔNG có bàn trong ${windowMin}' sau đó`
                : `chưa rõ kết cục ${windowMin}'`;
        return `- ${teams} (H${s.half} p${s.minute}): bóng nguy hiểm 3' ${f.da_total_3m ?? 0}, trúng đích 3' ${f.on_target_delta_3m ?? 0}, phạt góc 3' ${f.corners_delta_3m ?? 0}, vạch T/X ${fmtHcap(f.ou13_handicap)} · chấp ${fmtHcap(f.ah12_handicap)} → ${outcome}`;
    });

    const user = [
        `# Trận đang xem (chỉ dùng để bình luận, KHÔNG đọc lại nguyên văn các con số)`,
        `- Hiệp ${features.half}, phút ${features.minute}; tổng số bàn đã ghi: ${features.total_goals_so_far}`,
        `- Vạch hiện tại: Tài/Xỉu ${fmtHcap(features.ou13_handicap)} · chấp ${fmtHcap(features.ah12_handicap)}`,
        '',
        `# Diễn biến 3 phút gần nhất (trận đang xem)`,
        `- Bóng nguy hiểm: chủ +${features.da_h_delta_3m}, khách +${features.da_a_delta_3m} (tổng ${features.da_total_3m})`,
        `- Dứt điểm: +${features.shots_total_delta_3m} (trúng đích +${features.on_target_delta_3m}); phạt góc +${features.corners_delta_3m}`,
        `- Sức ép (cảnh báo): ${features.pressure_alert_count_3m > 0 ? `đang tăng (${features.pressure_alert_count_3m} cảnh báo)` : 'chưa có dấu hiệu rõ'}`,
        '',
        `# Diễn biến kèo (5 phút gần nhất)`,
        `- Tài/Xỉu: ${ouMove}`,
        `- Chấp: ${ahMove}`,
        '',
        top.length > 0
            ? `# ${top.length} tình huống quá khứ tương tự (cùng/sát vạch kèo) — ${posCount}/${known.length} (đã rõ kết cục) có bàn trong ${windowMin}' sau đó:`
            : `# Không có tình huống quá khứ tương tự rõ rệt.`,
        ...simLines,
        '',
        requireProbPct
            ? `Hãy CÂN NHẮC diễn biến hiện tại cùng KẾT CỤC các trận tương tự để TỰ cho goalProb30Pct (0–100) và viết reasonVi. Trả JSON: { "goalProb30Pct": <số nguyên>, "reasonVi": "..." }`
            : `Hãy CÂN NHẮC diễn biến hiện tại cùng KẾT CỤC các trận tương tự ở trên để TỰ đánh giá khả năng có bàn, rồi viết nhận định theo đúng văn phong yêu cầu. Trả JSON: { "reasonVi": "..." }`,
    ].join('\n');

    return { system, user };
}
