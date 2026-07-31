/**
 * DeepSeek phân tích độ tương tự: trận ghim (lịch sử) vs trận đang xem tại cùng hiệp/phút.
 */

import type { OpeningLinesRef } from './feature-builder.js';
import type { CumulativeTotals } from './rag-store.js';
import {
    buildOu13LineRuns,
    formatOu13LineRuns,
    ou13LineRunsSimilar,
    type Ou13OddsPoint,
    OU13_LINE_RUN_DURATION_TOLERANCE_MIN,
} from './ou13-line-runs.js';
import { wrapDeepSeekSystemPrompt, parseCouncilBlock, type CouncilDeliberation } from './deepseek-council-prompt.js';

const OPEN_LINE_EPS = 1e-6;

export type PinnedDimensionKey =
    | 'odds_open'
    | 'line_runs'
    | 'odds_snapshot'
    | 'pressure'
    | 'shots'
    | 'outcome';

export interface AiPinnedDimension {
    key: PinnedDimensionKey;
    score: number;
    summaryVi: string;
}

export interface AiPinnedQuantitative {
    lineRunsScore?: number;
    lineRunsMatch?: boolean;
    openLineMatch?: boolean;
    ragSimilarity?: number;
    statDelta?: { da: number; shots: number; onTarget: number; corners: number };
    pinnedLineRuns?: string;
    sourceLineRuns?: string;
}

export interface AiPinnedAnalysis {
    similarityScore: number;
    similarityLevel: 'high' | 'medium' | 'low';
    dimensions: AiPinnedDimension[];
    highlightsVi: string[];
    differencesVi: string[];
    conclusionVi: string;
    quantitative?: AiPinnedQuantitative;
    council?: CouncilDeliberation;
    model?: string;
    durationMs?: number;
}

export interface PinnedSideContext {
    matchId: string;
    team: string;
    half: 1 | 2;
    minute: number;
    scoreAtMinute?: string;
    ftScore?: string;
    labelHalf?: 0 | 1;
    /** @deprecated Chỉ giữ tương thích dữ liệu cũ — không dùng trong prompt. */
    label30?: 0 | 1;
    similarity?: number;
    openingLines?: OpeningLinesRef;
    lineRunsLabel?: string;
    ou13AtMinute?: number;
    ah12AtMinute?: number;
    overOdds?: number;
    underOdds?: number;
    totals?: CumulativeTotals | null;
    feats?: Record<string, number>;
}

export interface PinnedAnalyzeInput {
    source: PinnedSideContext;
    pinned: PinnedSideContext;
    quantitative: AiPinnedQuantitative;
}

export interface PinnedAnalyzePrompt {
    system: string;
    user: string;
}

function openLineMatch(a?: number, b?: number): boolean {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a! - b!) < OPEN_LINE_EPS;
}

function totalsStr(t?: CumulativeTotals | null): string {
    if (!t) return 'chưa có';
    return `DA ${t.da}, sút ${t.shots}, trúng ${t.onTarget}, góc ${t.corners}`;
}

export interface GoalEventLike {
    minute: number;
    half: 1 | 2;
    type: string;
}

/** Parse "2-1" / "2:0" → [home, away]. */
export function parseScorePair(ss?: string): [number, number] | null {
    if (!ss) return null;
    const m = String(ss).trim().match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const a = parseInt(m[2], 10);
    if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
    return [h, a];
}

function goalAtOrBefore(half: 1 | 2, minute: number, g: GoalEventLike): boolean {
    return g.half < half || (g.half === half && g.minute <= minute);
}

function formatGoalCount(n: number): string {
    return n === 1 ? '1 bàn' : `${n} bàn`;
}

/**
 * Đếm tổng bàn tại (half, minute) — chỉ cần tổng, không suy H-A.
 * fallbackFromScore: khi mảng events không có marker bàn, lấy tổng từ tỷ số live (trận đang xem).
 */
export function totalGoalsAtMinute(
    events: readonly GoalEventLike[],
    half: 1 | 2,
    minute: number,
    referenceScore?: string,
    options?: { fallbackFromScore?: boolean },
): string {
    const goals = events.filter((e) => e.type === 'goal');
    const beforeCount = goals.filter((g) => goalAtOrBefore(half, minute, g)).length;
    if (beforeCount > 0) return formatGoalCount(beforeCount);

    if (options?.fallbackFromScore && goals.length === 0 && referenceScore) {
        const parsed = parseScorePair(referenceScore);
        if (parsed) return formatGoalCount(parsed[0] + parsed[1]);
    }

    return '0 bàn';
}

/** @deprecated Dùng totalGoalsAtMinute — giữ alias cho test cũ. */
export const scoreAtMinuteFromGoalEvents = totalGoalsAtMinute;

function goalAfterMinuteInHalf(events: readonly GoalEventLike[], half: 1 | 2, minuteFrom: number): boolean {
    return events.some((e) => e.type === 'goal' && e.half === half && e.minute > minuteFrom);
}

/** Nhãn có bàn từ phút gọi đến hết hiệp — undefined khi không có dữ liệu sự kiện. */
export function labelHalfFromGoalEvents(
    events: readonly GoalEventLike[],
    half: 1 | 2,
    minute: number,
): 0 | 1 | undefined {
    if (!events.length) return undefined;
    return goalAfterMinuteInHalf(events, half, minute) ? 1 : 0;
}

function sideBlock(label: string, s: PinnedSideContext): string[] {
    const ol = s.openingLines;
    const openParts: string[] = [];
    if (Number.isFinite(ol?.h1OpenOu13)) openParts.push(`1_3 H1=${ol!.h1OpenOu13}`);
    if (Number.isFinite(ol?.h2OpenOu13)) openParts.push(`1_3 H2=${ol!.h2OpenOu13}`);
    if (Number.isFinite(ol?.h1OpenAh12)) openParts.push(`1_2 H1=${ol!.h1OpenAh12}`);
    if (Number.isFinite(ol?.h2OpenAh12)) openParts.push(`1_2 H2=${ol!.h2OpenAh12}`);
    const lines: string[] = [
        `[${label}] ${s.team} (#${s.matchId}) — H${s.half} phút ${s.minute}.`,
    ];
    if (s.scoreAtMinute) lines.push(`Tổng bàn TẠI PHÚT SO SÁNH (bắt buộc dùng): ${s.scoreAtMinute}.`);
    if (s.ftScore) lines.push(`FT trận ghim (CHỈ tham chiếu — KHÔNG thay tổng bàn tại phút): ${s.ftScore}.`);
    if (openParts.length) lines.push(`Vạch mở: ${openParts.join(', ')}.`);
    if (s.lineRunsLabel) lines.push(`Pattern line 1_3 đến phút này: ${s.lineRunsLabel}.`);
    if (Number.isFinite(s.ou13AtMinute)) {
        const odds = [
            `HDP 1_3=${s.ou13AtMinute}`,
            Number.isFinite(s.overOdds) ? `Tài=${s.overOdds}` : null,
            Number.isFinite(s.underOdds) ? `Xỉu=${s.underOdds}` : null,
        ].filter(Boolean).join(', ');
        lines.push(`Kèo tại phút: ${odds}.`);
    }
    if (Number.isFinite(s.ah12AtMinute)) lines.push(`Chấp 1_2 tại phút: ${s.ah12AtMinute}.`);
    lines.push(`Tổng lũy kế: ${totalsStr(s.totals)}.`);
    if (s.labelHalf === 1) lines.push('Kết cục đến hết hiệp: CÓ BÀN (chỉ mô tả trận lịch sử).');
    else if (s.labelHalf === 0) lines.push('Kết cục đến hết hiệp: không bàn (chỉ mô tả trận lịch sử).');
    if (Number.isFinite(s.similarity)) lines.push(`Cosine similarity RAG: ${s.similarity!.toFixed(3)}.`);
    return lines;
}

/** Tính số liệu định lượng trước khi gọi LLM. */
export function computePinnedQuantitative(
    sourceOdds: readonly Ou13OddsPoint[],
    pinnedOdds: readonly Ou13OddsPoint[],
    half: 1 | 2,
    minute: number,
    sourceOpen?: OpeningLinesRef,
    pinnedOpen?: OpeningLinesRef,
    sourceTotals?: CumulativeTotals | null,
    pinnedTotals?: CumulativeTotals | null,
    ragSimilarity?: number,
): AiPinnedQuantitative {
    const qRuns = buildOu13LineRuns(sourceOdds, half, minute);
    const pRuns = buildOu13LineRuns(pinnedOdds, half, minute);
    const { match, score } = ou13LineRunsSimilar(qRuns, pRuns, OU13_LINE_RUN_DURATION_TOLERANCE_MIN);

    const qOu = half === 1 ? sourceOpen?.h1OpenOu13 : sourceOpen?.h2OpenOu13;
    const pOu = half === 1 ? pinnedOpen?.h1OpenOu13 : pinnedOpen?.h2OpenOu13;

    const statDelta =
        sourceTotals && pinnedTotals
            ? {
                da: pinnedTotals.da - sourceTotals.da,
                shots: pinnedTotals.shots - sourceTotals.shots,
                onTarget: pinnedTotals.onTarget - sourceTotals.onTarget,
                corners: pinnedTotals.corners - sourceTotals.corners,
            }
            : undefined;

    return {
        lineRunsScore: Number.isFinite(score) ? score : undefined,
        lineRunsMatch: match,
        openLineMatch: openLineMatch(qOu, pOu),
        ragSimilarity,
        statDelta,
        pinnedLineRuns: formatOu13LineRuns(pRuns) || undefined,
        sourceLineRuns: formatOu13LineRuns(qRuns) || undefined,
    };
}

export function buildPinnedAnalyzePrompt(input: PinnedAnalyzeInput): PinnedAnalyzePrompt {
    const q = input.quantitative;
    const taskRules = [
        'Bạn là chuyên gia phân tích bóng đá và kèo Tài/Xỉu. So sánh TRẬN GHIM (lịch sử) với TRẬN ĐANG XEM tại cùng hiệp/phút.',
        'Nguyên tắc:',
        '1. Dùng số liệu định lượng đã tính sẵn — KHÔNG bịa số.',
        '2. Đánh giá đa chiều: vạch mở kèo, pattern line chạy, kèo tại phút, áp lực/DA, sút bóng, kết cục tham chiếu (có bàn đến hết hiệp — labelHalf chỉ của trận ghim).',
        '3. similarityScore 0–100 và similarityLevel (high ≥75, medium 45–74, low <45) phải nhất quán với phân tích.',
        '4. Mỗi dimension có key và score 0–100 + summaryVi ngắn.',
        '5. KHÔNG dự đoán kết quả trận đang xem — chỉ kết luận mức độ tương tự tình huống.',
        '6. Chỉ so sánh TỔNG BÀN tại phút (vd. "1 bàn", "0 bàn") — không cần tỷ số H-A. Tổng bàn tại phút và FT trận ghim là KHÁC NHAU — không lấy FT thay tổng bàn tại phút.',
    ].join('\n');

    const system = wrapDeepSeekSystemPrompt(
        taskRules,
        [
            '  "similarityScore": number,',
            '  "similarityLevel": "high"|"medium"|"low",',
            '  "dimensions": [{ "key": "odds_open"|"line_runs"|"odds_snapshot"|"pressure"|"shots"|"outcome", "score": number, "summaryVi": string }],',
            '  "highlightsVi": [string],',
            '  "differencesVi": [string],',
            '  "conclusionVi": string   // = council.finalConclusion',
        ],
        'conclusionVi PHẢI trùng nội dung council.finalConclusion.',
    );

    const userLines: string[] = [
        `So sánh tại H${input.source.half} phút ${input.source.minute}.`,
        '',
        ...sideBlock('TRẬN ĐANG XEM', input.source),
        '',
        ...sideBlock('TRẬN GHIM (lịch sử)', input.pinned),
        '',
        'SỐ LIỆU ĐỊNH LƯỢNG (dùng đúng):',
    ];
    if (q.openLineMatch != null) userLines.push(`- Vạch mở 1_3 cùng hiệp trùng: ${q.openLineMatch ? 'CÓ' : 'KHÔNG'}.`);
    if (q.lineRunsMatch != null) {
        userLines.push(`- Pattern line chạy khớp (±${OU13_LINE_RUN_DURATION_TOLERANCE_MIN}p/đoạn): ${q.lineRunsMatch ? 'CÓ' : 'KHÔNG'}.`);
    }
    if (q.lineRunsScore != null && Number.isFinite(q.lineRunsScore)) {
        userLines.push(`- Tổng lệch phút pattern line: ${q.lineRunsScore}p (nhỏ = giống hơn).`);
    }
    if (q.sourceLineRuns) userLines.push(`- Line trận đang xem: ${q.sourceLineRuns}.`);
    if (q.pinnedLineRuns) userLines.push(`- Line trận ghim: ${q.pinnedLineRuns}.`);
    if (q.ragSimilarity != null) userLines.push(`- Cosine RAG: ${q.ragSimilarity.toFixed(3)}.`);
    if (q.statDelta) {
        const d = q.statDelta;
        userLines.push(`- Chênh lệch tổng (ghim − đang xem): DA ${d.da >= 0 ? '+' : ''}${d.da}, sút ${d.shots >= 0 ? '+' : ''}${d.shots}, trúng ${d.onTarget >= 0 ? '+' : ''}${d.onTarget}, góc ${d.corners >= 0 ? '+' : ''}${d.corners}.`);
    }
    userLines.push(
        `- Tổng bàn TẠI PHÚT (bắt buộc): đang xem ${input.source.scoreAtMinute ?? 'chưa có'}, ghim ${input.pinned.scoreAtMinute ?? 'chưa có'}.`,
    );
    if (input.pinned.ftScore) {
        userLines.push(`- FT trận ghim (chỉ tham chiếu, không thay tổng bàn tại phút): ${input.pinned.ftScore}.`);
    }
    userLines.push('');
    userLines.push('Hãy phân tích chi tiết và trả JSON theo schema.');

    return { system, user: userLines.join('\n') };
}

function stripLlmWrappers(raw: string): string {
    let t = raw.trim();
    t = t.replace(/[\s\S]*?<\/think>/gi, '').trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
    if (fence) t = fence[1].trim();
    return t.replace(/[""]/g, '"').replace(/['']/g, "'").trim();
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
    const t = stripLlmWrappers(raw);
    if (!t) return null;
    try {
        const parsed = JSON.parse(t) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        // fall through
    }
    const start = t.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let end = -1;
    for (let i = start; i < t.length; i++) {
        if (t[i] === '{') depth++;
        if (t[i] === '}') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end < 0) return null;
    try {
        const parsed = JSON.parse(t.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }
    return null;
}

const VALID_KEYS = new Set<PinnedDimensionKey>([
    'odds_open', 'line_runs', 'odds_snapshot', 'pressure', 'shots', 'outcome',
]);

function clampScore(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
}

function toLevel(v: unknown, score: number): AiPinnedAnalysis['similarityLevel'] {
    if (v === 'high' || v === 'medium' || v === 'low') return v;
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
}

function toStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
}

export function parseAiPinnedAnalysis(
    raw: string,
    quantitative: AiPinnedQuantitative,
    meta?: { model?: string; durationMs?: number },
): AiPinnedAnalysis | null {
    const obj = extractJsonObject(raw);
    if (!obj) return null;

    const root = (() => {
        for (const k of ['analysis', 'evaluation', 'result', 'data']) {
            const v = obj[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
        }
        return obj;
    })();

    const score = clampScore(root.similarityScore ?? root.similarity_score);
    const level = toLevel(root.similarityLevel ?? root.similarity_level, score);
    const conclusion = typeof root.conclusionVi === 'string'
        ? root.conclusionVi.trim()
        : typeof root.conclusion === 'string'
            ? root.conclusion.trim()
            : '';
    const council = parseCouncilBlock(root);
    const conclusionFinal = conclusion || council?.finalConclusion || '';
    if (!conclusionFinal) return null;

    const dimsRaw = Array.isArray(root.dimensions) ? root.dimensions : [];
    const dimensions: AiPinnedDimension[] = dimsRaw
        .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
        .map((d) => {
            const key = String(d.key ?? '') as PinnedDimensionKey;
            return {
                key: VALID_KEYS.has(key) ? key : 'pressure',
                score: clampScore(d.score),
                summaryVi: typeof d.summaryVi === 'string' ? d.summaryVi.trim() : String(d.summary ?? '').trim(),
            };
        })
        .filter((d) => d.summaryVi.length > 0);

    return {
        similarityScore: score,
        similarityLevel: level,
        dimensions,
        highlightsVi: toStringArray(root.highlightsVi ?? root.highlights),
        differencesVi: toStringArray(root.differencesVi ?? root.differences),
        conclusionVi: conclusionFinal,
        council,
        quantitative,
        model: meta?.model,
        durationMs: meta?.durationMs,
    };
}

/** Snapshot odds gần nhất ≤ minute trong cùng hiệp. */
export function oddsSnapshotAtMinute<T extends { minute: number; half: 1 | 2 }>(
    odds: readonly T[],
    half: 1 | 2,
    minute: number,
): T | undefined {
    return odds
        .filter((o) => o.half === half && o.minute <= minute)
        .sort((a, b) => b.minute - a.minute)[0];
}
