/**
 * RAG-only routes (v3 lite) — mount at `/api/ai/predict-goal` for frontend compat.
 *
 * POST /similar?limit=20
 * GET  /match-detail?matchId=...
 * GET  /odds-history?matchId=...
 */

import { Router, Request, Response } from 'express';
import { buildFeatureVector, buildOpeningLinesRef, type FeatureVector } from '../goal-predict/feature-builder.js';
import type { ParsedMatch, Half, StatRow } from '../goal-predict/md-parser.js';
import {
    topK,
    listMatchesByOpeningOu13,
    listMatchesByOpeningOu13WithLineRuns,
    ou13OddsPointsFromParsedOdds,
    queryOu13LineRunsLabel,
    getMatchDetail,
    getCumulativeStatsAt,
    getOddsHistory13,
    totalsFromStats,
    halfGoalRate,
    type SimilarMatch,
    type CumulativeTotals,
    type LineMatchContext,
    type HalfGoalStats,
} from '../goal-predict/rag-store.js';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { callDeepSeekReason, isDeepSeekEnabled } from '../goal-predict/deepseek-reason.js';
import {
    buildSimilarEvaluatePrompt,
    parseAiSimilarEvaluation,
    type Label30Stats,
    type TierKey,
} from '../goal-predict/similar-evaluate-prompt.js';
import {
    buildPinnedAnalyzePrompt,
    computePinnedQuantitative,
    labelHalfFromGoalEvents,
    oddsSnapshotAtMinute,
    parseAiPinnedAnalysis,
    totalGoalsAtMinute,
    type AiPinnedAnalysis,
    type PinnedSideContext,
} from '../goal-predict/pinned-analyze-prompt.js';
import { buildOu13LineRuns, formatOu13LineRuns } from '../goal-predict/ou13-line-runs.js';
import type { OddsSnap } from '../goal-predict/md-parser.js';

function enrichEvaluateContext(
    raw: SimilarMatchRequest['evaluateContext'],
    odds: OddsSnap[] | undefined,
    half: 1 | 2,
    minute: number,
): SimilarMatchRequest['evaluateContext'] {
    if (!raw || raw.trigger !== 'ou_line_change') return raw;
    const ou13Rows = (odds ?? [])
        .filter((o) => o.marketId === '1_3')
        .map((o) => ({ minute: o.clockMinute, half: o.half, handicap: o.handicap }));
    const ah12Rows = (odds ?? [])
        .filter((o) => o.marketId === '1_2')
        .map((o) => ({ minute: o.clockMinute, half: o.half, handicap: o.handicap }));
    const ouSnap = oddsSnapshotAtMinute(ou13Rows, half, minute);
    const ahSnap = oddsSnapshotAtMinute(ah12Rows, half, minute);
    return {
        ...raw,
        currentOu13: ouSnap?.handicap ?? raw.lineChange.newHandicap,
        currentAh12: ahSnap?.handicap,
    };
}

interface SimilarMatchRequest {
    matchId: string;
    half: 1 | 2;
    minute: number;
    match: Omit<ParsedMatch, 'meta'> & { meta?: ParsedMatch['meta'] };
    queryFeatures?: Record<string, number>;
    /** Số bàn H1 do client tính (ưu tiên tỷ số hiệp 1 từ feed). */
    priorHalfGoals?: number;
    /** true = priorHalfGoals lấy từ tỷ số hiệp 1 của feed (đáng tin, dùng làm điều kiện chắc chắn). */
    priorHalfGoalsKnown?: boolean;
    evaluateContext?: {
        trigger: 'ou_line_change';
        lineChange: { prevHandicap: number; newHandicap: number };
        currentOu13?: number;
        currentAh12?: number;
    };
}

/** 1 tình huống tương tự + tỷ số chung cuộc (FT) + giải + tổng lũy kế — phục vụ modal "Xem tất cả". */
export interface SimilarMatchFull extends SimilarMatch {
    finalScore?: string;
    league?: string;
    totals?: CumulativeTotals | null;
    /** v3 lite: không chạy ONNX — luôn null. */
    prob30?: number | null;
}

export const similarMatchesRouter = Router();

similarMatchesRouter.get('/match-detail', async (req: Request, res: Response): Promise<void> => {
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

similarMatchesRouter.get('/odds-history', async (req: Request, res: Response): Promise<void> => {
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

function lineCtxFromMatch(match: SimilarMatchRequest['match'] | undefined): LineMatchContext | undefined {
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
        userNotes: [],
    };
    const ref = buildOpeningLinesRef(parsed);
    if (!Number.isFinite(ref.h1OpenOu13) && !Number.isFinite(ref.h2OpenOu13)) return undefined;
    return ref;
}

async function enrichSimilarList(similar: SimilarMatch[]): Promise<SimilarMatchFull[]> {
    return Promise.all(
        similar.map(async (s) => {
            const [detail, totals] = await Promise.all([
                getMatchDetail(s.matchId),
                getCumulativeStatsAt(s.matchId, s.half, s.minute),
            ]);
            return {
                ...s,
                home: detail?.homeName || s.home,
                away: detail?.awayName || s.away,
                ftStatus: detail?.ftStatus || s.ftStatus,
                finalScore: detail?.finalScore,
                league: detail?.league,
                totals,
                prob30: null,
            };
        }),
    );
}

/** Kết quả RAG 3 tầng — dùng chung cho POST /similar và POST /similar/evaluate. */
export interface SimilarResponse {
    queryFeatures: FeatureVector;
    openingLines?: LineMatchContext;
    /** Khi thiếu vạch mở 1_3 hiệp đang xem — FE hiển thị thay vì danh sách trống im lặng. */
    openingLineNotice?: string;
    queryOu13LineRuns?: string;
    similarMatchesOpenLine: SimilarMatchFull[];
    similarMatchesOpenLineCatalog: SimilarMatchFull[];
    similarMatchesOpenLineCatalogRuns: SimilarMatchFull[];
    /** RAG "% có bàn theo hiệp" theo vạch mở T/X (+ điều kiện hiệp trước, kèo chấp mềm). */
    halfGoalStats?: HalfGoalStats;
    currentTotals: CumulativeTotals | null;
    /** Bối cảnh phụ để bước đánh giá AI dùng — không gửi cho FE qua /similar. */
    meta: { matchId: string; half: 1 | 2; minute: number };
}

/**
 * Build feature vector + 3 tầng RAG (openLine / catalog / catalogRuns) đã enrich.
 * Trả về null khi thiếu dữ liệu (caller tự trả 400 với thông điệp phù hợp).
 */
async function computeSimilarResponse(
    rawBody: SimilarMatchRequest,
    limit: number,
): Promise<SimilarResponse | { error: string }> {
    let features: FeatureVector | null = null;
    let matchId = rawBody.matchId ?? '';
    let half: 1 | 2 = 1;
    let minute = 0;
    const clientFeats = rawBody.queryFeatures;
    if (clientFeats && typeof clientFeats === 'object' && Object.keys(clientFeats).length > 0) {
        features = clientFeats as FeatureVector;
        half = Number(clientFeats.half) === 2 ? 2 : 1;
        minute = Number(clientFeats.minute) || 0;
    } else {
        if (!rawBody?.match?.stats) {
            return { error: 'Body cần { matchId, half, minute, match: { stats, events, alerts, odds } }' };
        }
        half = rawBody.half === 2 ? 2 : 1;
        minute = Number(rawBody.minute);
        if (!Number.isFinite(minute)) return { error: 'minute không hợp lệ' };
        const parsed: ParsedMatch = {
            meta: rawBody.match.meta ?? {
                matchId: rawBody.matchId,
                homeName: '',
                awayName: '',
                league: '',
                finalScore: '',
                ftStatus: '',
                viewedAtMs: null,
                timerRaw: '',
            },
            stats: rawBody.match.stats || [],
            events: rawBody.match.events || [],
            alerts: rawBody.match.alerts || [],
            odds: rawBody.match.odds || [],
            userNotes: [],
        };
        features = buildFeatureVector(parsed, half as Half, minute);
        matchId = rawBody.matchId;
        if (!features) return { error: 'Không đủ stats để build feature vector' };
    }

    if (!features) return { error: 'Thiếu queryFeatures hoặc stats để tìm trận tương tự' };

    const lineCtx = lineCtxFromMatch(rawBody.match);
    const queryOu13 = ou13OddsPointsFromParsedOdds(rawBody.match?.odds ?? []);
    const qHalf = Number(features.half) === 2 ? 2 : 1;
    const qOpenOu13 = qHalf === 1 ? lineCtx?.h1OpenOu13 : lineCtx?.h2OpenOu13;
    const qOpenAh12 = qHalf === 1 ? lineCtx?.h1OpenAh12 : lineCtx?.h2OpenAh12;

    // RAG "% có bàn theo hiệp": lọc theo vạch mở T/X hiệp đang xem; hỏi H2 thì điều kiện thêm
    // theo kết quả H1 (vạch mở H1 + số bàn H1 thực tế của trận đang xem).
    // gameEvents của trận live tính theo chênh lệch tỷ số nên sạch (không trùng như file History).
    // Mở trận muộn (không có stats H1) → không biết bàn H1 thật → không áp điều kiện, đánh dấu priorHalfUnknown.
    let halfGoalStats: HalfGoalStats | undefined;
    if (lineCtx && Number.isFinite(qOpenOu13)) {
        // Số bàn H1: ưu tiên giá trị client tính từ tỷ số hiệp 1 của feed (đáng tin, kể cả mở trận muộn);
        // fallback đếm theo PHÚT ≤ 45 (bền hơn cờ half bị gán nhầm sát giờ nghỉ).
        const h1FromFeed = rawBody.priorHalfGoalsKnown === true && Number.isFinite(rawBody.priorHalfGoals);
        const h1Goals = h1FromFeed
            ? Number(rawBody.priorHalfGoals)
            : (rawBody.match?.events ?? []).filter((e) => e.type === 'goal' && Number(e.clockMinute) <= 45).length;
        const hasH1Data = (rawBody.match?.stats ?? []).some((s) => Number(s.half) === 1);
        // Biết chắc số bàn H1 khi có tỷ số feed; nếu không, chỉ tin khi đã quan sát H1 (có stats H1).
        const priorHalfUnknown = qHalf === 2 && !h1FromFeed && !hasH1Data;
        const ahArg = Number.isFinite(qOpenAh12) ? qOpenAh12! : undefined;
        halfGoalStats = halfGoalRate({
            half: qHalf,
            openOu13: qOpenOu13!,
            openAh12: ahArg,
            priorHalf: qHalf === 2 && !priorHalfUnknown
                ? { openOu13: lineCtx.h1OpenOu13, goals: h1Goals }
                : undefined,
            excludeMatchId: matchId,
        });
        if (priorHalfUnknown) halfGoalStats.priorHalfUnknown = true;
        // Điều kiện số bàn H1 quá chặt → 0 trận: hạ điều kiện, hiển thị thống kê chung cho vạch mở.
        if (halfGoalStats.conditionedOnPriorHalf && halfGoalStats.total === 0) {
            const uncond = halfGoalRate({
                half: qHalf,
                openOu13: qOpenOu13!,
                openAh12: ahArg,
                excludeMatchId: matchId,
            });
            if (uncond.total > 0) {
                uncond.priorHalfNoMatch = true;
                halfGoalStats = uncond;
            }
        }
    }
    const openingLineNotice = Number.isFinite(qOpenOu13)
        ? undefined
        : `Chưa có vạch mở 1_3 H${qHalf} — chỉ trả trận khi HDP mở hiệp trùng tuyệt đối (H1↔H1 / H2↔H2).`;

    const similarOpenLine = topK(features, limit, false, true, lineCtx, 'openLine');
    const catalogRaw = lineCtx
        ? listMatchesByOpeningOu13(lineCtx, features, { excludeMatchId: matchId, limit: 100 })
        : [];
    const catalogRunsRaw =
        lineCtx && queryOu13.length > 0
            ? await listMatchesByOpeningOu13WithLineRuns(lineCtx, features, queryOu13, {
                excludeMatchId: matchId,
                limit: 100,
            })
            : [];
    const [enrichedOpenLine, enrichedCatalog, enrichedCatalogRuns] = await Promise.all([
        enrichSimilarList(similarOpenLine),
        enrichSimilarList(catalogRaw),
        enrichSimilarList(catalogRunsRaw),
    ]);

    const currentStats = rawBody.match?.stats;
    const currentTotals: CumulativeTotals | null = Array.isArray(currentStats)
        ? totalsFromStats(currentStats, half as Half, minute)
        : null;

    return {
        queryFeatures: { ...features },
        openingLines: lineCtx,
        openingLineNotice,
        queryOu13LineRuns: queryOu13.length > 0 ? queryOu13LineRunsLabel(features, queryOu13) : undefined,
        similarMatchesOpenLine: enrichedOpenLine,
        similarMatchesOpenLineCatalog: enrichedCatalog,
        similarMatchesOpenLineCatalogRuns: enrichedCatalogRuns,
        halfGoalStats,
        currentTotals,
        meta: { matchId, half, minute },
    };
}

/** Tách phần FE cần (ẩn `meta` nội bộ). */
function toClientPayload(r: SimilarResponse) {
    const { meta: _meta, ...rest } = r;
    return rest;
}

similarMatchesRouter.post('/similar', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const rawBody = (req.body ?? {}) as SimilarMatchRequest;
    const limitRaw = parseInt(String(req.query.limit ?? '20'), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

    const result = await computeSimilarResponse(rawBody, limit);
    if ('error' in result) {
        res.status(400).json({ error: result.error });
        return;
    }

    logger.info(
        `similar-matches match=${result.meta.matchId} h=${result.meta.half} m=${result.meta.minute} limit=${limit} → openLine=${result.similarMatchesOpenLine.length} catalog=${result.similarMatchesOpenLineCatalog.length} catalogRuns=${result.similarMatchesOpenLineCatalogRuns.length} (${Date.now() - t0}ms)`,
    );
    res.json(toClientPayload(result));
});

/**
 * RAG 3 tầng + lớp AI (DeepSeek) đánh giá trận tương tự.
 * Trả về như /similar nhưng kèm `aiEvaluation` + `label30ByTier`.
 * Degrade mượt: nếu tắt cờ aiEvaluation hoặc thiếu DEEPSEEK_API_KEY → aiEvaluation=null + aiDisabledReason.
 */
similarMatchesRouter.post('/similar/evaluate', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const rawBody = (req.body ?? {}) as SimilarMatchRequest;
    const limitRaw = parseInt(String(req.query.limit ?? '20'), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

    const result = await computeSimilarResponse(rawBody, limit);
    if ('error' in result) {
        res.status(400).json({ error: result.error });
        return;
    }

    const tiers: Record<TierKey, SimilarMatchFull[]> = {
        openLine: result.similarMatchesOpenLine,
        catalog: result.similarMatchesOpenLineCatalog,
        catalogRuns: result.similarMatchesOpenLineCatalogRuns,
    };
    const evaluateContext = enrichEvaluateContext(
        rawBody.evaluateContext,
        rawBody.match?.odds,
        result.meta.half,
        result.meta.minute,
    );
    const { system, user, label30ByTier, labelHalfByTier } = buildSimilarEvaluatePrompt({
        half: result.meta.half,
        minute: result.meta.minute,
        queryOu13LineRuns: result.queryOu13LineRuns,
        openingLines: result.openingLines,
        currentTotals: result.currentTotals,
        tiers,
        evaluateContext,
    });

    const base = { ...toClientPayload(result), label30ByTier, labelHalfByTier };

    if (!config.features.aiEvaluation || !isDeepSeekEnabled()) {
        const aiDisabledReason = !config.features.aiEvaluation
            ? 'Tắt cờ FEATURE_AI_EVALUATION'
            : 'Chưa cấu hình DEEPSEEK_API_KEY';
        res.json({ ...base, aiEvaluation: null, aiDisabledReason });
        return;
    }

    const allMatches = [...tiers.openLine, ...tiers.catalog, ...tiers.catalogRuns];
    const dsModel = config.goalPredict.deepseekModel;
    const ds = await callDeepSeekReason({ system, user, json: true, model: dsModel, maxTokens: 2048 });
    if (ds.error || !ds.text) {
        logger.warn(`similar-evaluate DeepSeek lỗi: ${ds.error || 'rỗng'}`);
        res.json({ ...base, aiEvaluation: null, aiDisabledReason: ds.error || 'DeepSeek không trả kết quả' });
        return;
    }

    let aiEvaluation = parseAiSimilarEvaluation(ds.text, allMatches, {
        model: dsModel,
        durationMs: ds.durationMs,
    });
    // Retry 1 lần nếu parse fail — đôi khi model trả markdown / JSON lệch schema.
    if (!aiEvaluation) {
        logger.warn(`similar-evaluate: parse lần 1 thất bại raw=${ds.text.slice(0, 240)}`);
        const retry = await callDeepSeekReason({
            system: `${system}\n\nQUAN TRỌNG: Chỉ trả MỘT object JSON thuần (không markdown, không giải thích thêm).`,
            user: `${user}\n\nTrả đúng JSON với các key: topMatches, lean, confidence, summaryVi, caveats.`,
            json: true,
            model: dsModel,
            maxTokens: 2048,
        });
        if (retry.text) {
            aiEvaluation = parseAiSimilarEvaluation(retry.text, allMatches, {
                model: dsModel,
                durationMs: ds.durationMs + retry.durationMs,
            });
        }
    }
    if (!aiEvaluation) {
        logger.warn(`similar-evaluate: parse JSON DeepSeek thất bại sau retry raw=${ds.text.slice(0, 400)}`);
        res.json({ ...base, aiEvaluation: null, aiDisabledReason: 'Không phân tích được phản hồi AI' });
        return;
    }

    const topRate: Label30Stats | undefined = aiEvaluation.topMatchesLabelHalf;
    logger.info(
        `similar-evaluate match=${result.meta.matchId} h=${result.meta.half} m=${result.meta.minute} → lean=${aiEvaluation.lean} conf=${aiEvaluation.confidence} top=${aiEvaluation.topMatches.length} labelHalf=${topRate ? `${topRate.hits}/${topRate.total}` : 'n/a'} (${Date.now() - t0}ms)`,
    );
    res.json({ ...base, aiEvaluation });
});

interface PinnedAnalyzeRequest {
    sourceMatchId: string;
    sourceHalf: 1 | 2;
    sourceMinute: number;
    sourceScore?: string;
    sourceMatch?: {
        stats?: StatRow[];
        odds?: ParsedMatch['odds'];
        events?: Array<{ minute: number; half: 1 | 2; type: 'goal' | 'corner' }>;
    };
    pinned: {
        matchId: string;
        half?: 1 | 2;
        minute?: number;
        team?: string;
        ft?: string;
        labelHalf?: 0 | 1;
        similarity?: number;
        feats?: Record<string, number>;
    };
}

function parsedFromClientMatch(
    matchId: string,
    match: PinnedAnalyzeRequest['sourceMatch'],
): ParsedMatch {
    return {
        meta: {
            matchId,
            homeName: '',
            awayName: '',
            league: '',
            finalScore: '',
            ftStatus: '',
            viewedAtMs: null,
            timerRaw: '',
        },
        stats: match?.stats ?? [],
        events: [],
        alerts: [],
        userNotes: [],
        odds: match?.odds ?? [],
    };
}

async function buildPinnedSide(
    side: 'source' | 'pinned',
    req: PinnedAnalyzeRequest,
): Promise<PinnedSideContext | { error: string }> {
    const half = (side === 'source'
        ? req.sourceHalf
        : req.pinned.half === 2 ? 2 : 1) as 1 | 2;
    const minute = side === 'source'
        ? req.sourceMinute
        : Number(req.pinned.minute ?? req.sourceMinute);
    if (!Number.isFinite(minute)) return { error: 'minute không hợp lệ' };

    if (side === 'source') {
        const parsed = parsedFromClientMatch(req.sourceMatchId, req.sourceMatch);
        const openingLines = buildOpeningLinesRef(parsed);
        const ou13Pts = ou13OddsPointsFromParsedOdds(parsed.odds);
        const lineRunsLabel = formatOu13LineRuns(buildOu13LineRuns(ou13Pts, half, minute)) || undefined;
        const ouSnap = oddsSnapshotAtMinute(
            parsed.odds.filter((o) => o.marketId === '1_3').map((o) => ({
                minute: o.clockMinute,
                half: o.half,
                handicap: o.handicap,
                over: o.over,
                under: o.under,
            })),
            half,
            minute,
        );
        const ahSnap = oddsSnapshotAtMinute(
            parsed.odds.filter((o) => o.marketId === '1_2').map((o) => ({
                minute: o.clockMinute,
                half: o.half,
                handicap: o.handicap,
            })),
            half,
            minute,
        );
        const totals = Array.isArray(req.sourceMatch?.stats)
            ? totalsFromStats(req.sourceMatch!.stats!, half, minute)
            : null;
        const sourceEvents = req.sourceMatch?.events ?? [];
        const scoreAtMinute = totalGoalsAtMinute(
            sourceEvents,
            half,
            minute,
            req.sourceScore,
            { fallbackFromScore: true },
        );
        return {
            matchId: req.sourceMatchId,
            team: 'Trận đang xem',
            half,
            minute,
            scoreAtMinute,
            openingLines,
            lineRunsLabel,
            ou13AtMinute: ouSnap?.handicap,
            ah12AtMinute: ahSnap?.handicap,
            overOdds: ouSnap?.over,
            underOdds: ouSnap?.under,
            totals,
        };
    }

    const matchId = String(req.pinned.matchId ?? '').trim();
    if (!matchId) return { error: 'Thiếu pinned.matchId' };

    const [detail, totals, hist] = await Promise.all([
        getMatchDetail(matchId),
        getCumulativeStatsAt(matchId, half, minute),
        getOddsHistory13(matchId),
    ]);

    const team = req.pinned.team
        ?? (detail ? `${detail.homeName} vs ${detail.awayName}` : `Match ${matchId}`);

    let openingLines: ReturnType<typeof buildOpeningLinesRef> | undefined;
    let ou13Pts: ReturnType<typeof ou13OddsPointsFromParsedOdds> = [];
    if (hist?.odds?.length) {
        const fakeParsed: ParsedMatch = {
            meta: {
                matchId,
                homeName: hist.homeName,
                awayName: hist.awayName,
                league: hist.league,
                finalScore: hist.finalScore,
                ftStatus: '',
                viewedAtMs: null,
                timerRaw: '',
            },
            stats: [],
            events: [],
            alerts: [],
            userNotes: [],
            odds: [
                ...hist.odds.map((o) => ({
                    marketId: '1_3' as const,
                    clockMinute: o.minute,
                    half: o.half,
                    handicap: o.handicap,
                    over: o.over,
                    under: o.under,
                })),
                ...(hist.odds12 ?? []).map((o) => ({
                    marketId: '1_2' as const,
                    clockMinute: o.minute,
                    half: o.half,
                    handicap: o.handicap,
                    home: o.home,
                    away: o.away,
                })),
            ],
        };
        openingLines = buildOpeningLinesRef(fakeParsed);
        ou13Pts = ou13OddsPointsFromParsedOdds(fakeParsed.odds);
    }

    const lineRunsLabel = ou13Pts.length
        ? formatOu13LineRuns(buildOu13LineRuns(ou13Pts, half, minute)) || undefined
        : undefined;

    const ouSnap = hist?.odds?.length
        ? oddsSnapshotAtMinute(hist.odds, half, minute)
        : undefined;
    const ahSnap = hist?.odds12?.length
        ? oddsSnapshotAtMinute(hist.odds12, half, minute)
        : undefined;

    const ftScore = req.pinned.ft ?? detail?.finalScore;
    const pinnedEvents = hist?.events ?? [];
    const scoreAtMinute = totalGoalsAtMinute(pinnedEvents, half, minute);
    const labelHalf =
        labelHalfFromGoalEvents(pinnedEvents, half, minute) ?? req.pinned.labelHalf;

    return {
        matchId,
        team,
        half,
        minute,
        scoreAtMinute,
        ftScore,
        labelHalf,
        similarity: req.pinned.similarity,
        openingLines,
        lineRunsLabel,
        ou13AtMinute: ouSnap?.handicap,
        ah12AtMinute: ahSnap?.handicap,
        overOdds: ouSnap?.over,
        underOdds: ouSnap?.under,
        totals,
        feats: req.pinned.feats,
    };
}

/**
 * POST /pinned/analyze — DeepSeek so sánh trận ghim vs trận đang xem tại cùng hiệp/phút.
 */
similarMatchesRouter.post('/pinned/analyze', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const body = (req.body ?? {}) as PinnedAnalyzeRequest;

    if (!body.sourceMatchId || !body.pinned?.matchId) {
        res.status(400).json({ error: 'Thiếu sourceMatchId hoặc pinned.matchId' });
        return;
    }

    const [source, pinned] = await Promise.all([
        buildPinnedSide('source', body),
        buildPinnedSide('pinned', body),
    ]);

    if ('error' in source) {
        res.status(400).json({ error: source.error });
        return;
    }
    if ('error' in pinned) {
        res.status(400).json({ error: pinned.error });
        return;
    }

    const sourceParsed = parsedFromClientMatch(body.sourceMatchId, body.sourceMatch);
    const sourceOuPts = ou13OddsPointsFromParsedOdds(sourceParsed.odds);

    let pinnedOuPts: typeof sourceOuPts = [];
    const pinnedHist = await getOddsHistory13(pinned.matchId);
    if (pinnedHist?.odds?.length) {
        pinnedOuPts = pinnedHist.odds.map((o) => ({
            minute: o.minute,
            half: o.half,
            handicap: o.handicap,
        }));
    }

    const quantitative = computePinnedQuantitative(
        sourceOuPts,
        pinnedOuPts,
        source.half,
        source.minute,
        source.openingLines,
        pinned.openingLines,
        source.totals,
        pinned.totals,
        pinned.similarity,
    );

    const baseResponse: {
        source: PinnedSideContext;
        pinned: PinnedSideContext;
        quantitative: typeof quantitative;
        analysis: AiPinnedAnalysis | null;
        aiDisabledReason?: string;
    } = {
        source,
        pinned,
        quantitative,
        analysis: null,
    };

    if (!config.features.aiEvaluation || !isDeepSeekEnabled()) {
        baseResponse.aiDisabledReason = !config.features.aiEvaluation
            ? 'Tắt cờ FEATURE_AI_EVALUATION'
            : 'Chưa cấu hình DEEPSEEK_API_KEY';
        res.json(baseResponse);
        return;
    }

    const { system, user } = buildPinnedAnalyzePrompt({ source, pinned, quantitative });
    const dsModel = config.goalPredict.deepseekModel;
    const ds = await callDeepSeekReason({ system, user, json: true, model: dsModel, maxTokens: 2048 });

    if (ds.error || !ds.text) {
        logger.warn(`pinned-analyze DeepSeek lỗi: ${ds.error || 'rỗng'}`);
        res.json({ ...baseResponse, aiDisabledReason: ds.error || 'DeepSeek không trả kết quả' });
        return;
    }

    let analysis = parseAiPinnedAnalysis(ds.text, quantitative, {
        model: dsModel,
        durationMs: ds.durationMs,
    });

    if (!analysis) {
        const retry = await callDeepSeekReason({
            system: `${system}\n\nQUAN TRỌNG: Chỉ trả MỘT object JSON thuần.`,
            user: `${user}\n\nTrả JSON: similarityScore, similarityLevel, dimensions, highlightsVi, differencesVi, conclusionVi.`,
            json: true,
            model: dsModel,
            maxTokens: 2048,
        });
        if (retry.text) {
            analysis = parseAiPinnedAnalysis(retry.text, quantitative, {
                model: dsModel,
                durationMs: ds.durationMs + retry.durationMs,
            });
        }
    }

    if (!analysis) {
        res.json({ ...baseResponse, aiDisabledReason: 'Không phân tích được phản hồi AI' });
        return;
    }

    logger.info(
        `pinned-analyze source=${body.sourceMatchId} pinned=${pinned.matchId} h=${source.half} m=${source.minute} → score=${analysis.similarityScore} level=${analysis.similarityLevel} (${Date.now() - t0}ms)`,
    );
    res.json({ ...baseResponse, analysis });
});
