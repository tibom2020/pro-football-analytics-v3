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
    getMatchDetail,
    getCumulativeStatsAt,
    getOddsHistory13,
    totalsFromStats,
    type SimilarMatch,
    type CumulativeTotals,
    type LineMatchContext,
} from '../goal-predict/rag-store.js';
import { logger } from '../logger.js';

interface SimilarMatchRequest {
    matchId: string;
    half: 1 | 2;
    minute: number;
    match: Omit<ParsedMatch, 'meta'> & { meta?: ParsedMatch['meta'] };
    queryFeatures?: Record<string, number>;
}

/** 1 tình huống tương tự + tỷ số chung cuộc (FT) + giải + tổng lũy kế — phục vụ modal "Xem tất cả". */
interface SimilarMatchFull extends SimilarMatch {
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

function parseRequest(req: Request, res: Response): { parsed: ParsedMatch; half: Half; minute: number; body: SimilarMatchRequest } | null {
    const body = req.body as SimilarMatchRequest;
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

similarMatchesRouter.post('/similar', async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const rawBody = (req.body ?? {}) as SimilarMatchRequest;

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
        if (!ctx) return;
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

    const lineCtx = lineCtxFromMatch(rawBody.match);

    const similarLegacy = topK(features, limit, false, true, undefined, 'legacy');
    const similarOpenLine = topK(features, limit, false, true, lineCtx, 'openLine');
    const [enrichedLegacy, enrichedOpenLine] = await Promise.all([
        enrichSimilarList(similarLegacy),
        enrichSimilarList(similarOpenLine),
    ]);

    const currentStats = rawBody.match?.stats;
    const currentTotals: CumulativeTotals | null = Array.isArray(currentStats)
        ? totalsFromStats(currentStats, half, minute)
        : null;

    logger.info(
        `similar-matches match=${matchId} h=${half} m=${minute} limit=${limit} → legacy=${enrichedLegacy.length} openLine=${enrichedOpenLine.length} (${Date.now() - t0}ms)`,
    );
    res.json({
        queryFeatures: { ...features },
        openingLines: lineCtx,
        similarMatches: enrichedLegacy,
        similarMatchesOpenLine: enrichedOpenLine,
        currentTotals,
    });
});
