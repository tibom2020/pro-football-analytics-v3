/**
 * In-memory RAG store: nạp toàn bộ feature rows từ goal-dataset.jsonl,
 * cho phép query top-K bằng cosine similarity trên feature vector.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { FEATURE_NAMES, type FeatureVector, type FeatureRow, type OpeningLinesRef, type HalfSummary } from './feature-builder.js';
import {
    buildOu13LineRuns,
    formatOu13LineRuns,
    ou13LineRunsSimilar,
    type Ou13OddsPoint,
    OU13_LINE_RUN_DURATION_TOLERANCE_MIN,
} from './ou13-line-runs.js';
import { parseMatchFile, type ParsedMatch, type StatRow, type Half, type UserNote } from './md-parser.js';

interface IndexedSample {
    matchId: string;
    half: number;
    minute: number;
    label: 0 | 1;
    /** Có bàn từ phút này đến hết hiệp hiện tại (từ cột `goal_before_half_end` của dataset chính). */
    labelHalf: 0 | 1;
    vec: Float32Array;
    norm: number;
    /** Giá trị feature THẬT tại phút đó (FEATURE_NAMES → số) — dùng cho popup "Chi tiết". */
    raw: Record<string, number>;
}

/** Thông tin cơ bản join theo matchId từ goal-dataset-meta.json (rẻ, nằm sẵn trong RAM). */
interface MatchBasic {
    home: string;
    away: string;
    ftStatus: string;
    file: string;
}

let samples: IndexedSample[] = [];
let meanVec: Float32Array | null = null;
let stdVec: Float32Array | null = null;
let loaded = false;

interface HalfOpeningLine {
    ou13: number;
    ah12?: number;
    minute: number;
}

/** matchId → vạch mở 1_3 đầu H1 / H2 — build khi load dataset. */
const openingLinesByMatch = new Map<string, { h1?: HalfOpeningLine; h2?: HalfOpeningLine }>();

/** matchId → tên 2 đội + ftStatus (parse từ tên file meta). */
const matchBasicById = new Map<string, MatchBasic>();
/** `${matchId}:${half}:${minute}` → nhãn "có bàn trong 30' sau" (từ dataset 30'). */
const label30ByKey = new Map<string, 0 | 1>();
/** Tóm tắt theo hiệp (goal-halves-dataset.jsonl) — 1 dòng / trận, cho RAG "số bàn theo hiệp". */
let halfSummaries: HalfSummary[] = [];
/** Thư mục History/*.md (absolute) — đọc lazy để lấy giải + tỷ số chung cuộc. */
let historyDirAbs: string | null = null;
/** Cache kết quả đọc md header theo matchId (null = đã thử nhưng không có file). */
const detailCache = new Map<string, MatchDetail | null>();

/** Parse "match_<id>_<Home>_vs_<Away>_<date>.md" → tên 2 đội (gạch nối → khoảng trắng). */
function parseTeamsFromFile(file: string): { home: string; away: string } {
    const base = file.replace(/^match_\d+_/, '').replace(/\.md$/, '');
    const idx = base.indexOf('_vs_');
    if (idx < 0) return { home: '', away: '' };
    const homeSlug = base.slice(0, idx);
    const awaySlug = base.slice(idx + 4).replace(/_\d{8}-\d{4}$/, '');
    const deslug = (s: string) => s.replace(/-/g, ' ').trim();
    return { home: deslug(homeSlug), away: deslug(awaySlug) };
}

function l2norm(v: Float32Array): number {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    return Math.sqrt(s);
}

function buildVector(row: FeatureRow | FeatureVector): Float32Array {
    const v = new Float32Array(FEATURE_NAMES.length);
    for (let i = 0; i < FEATURE_NAMES.length; i++) {
        const x = Number((row as Record<string, unknown>)[FEATURE_NAMES[i]] ?? 0);
        v[i] = Number.isFinite(x) ? x : 0;
    }
    return v;
}

function standardize(v: Float32Array): Float32Array {
    if (!meanVec || !stdVec) return v;
    const out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) {
        const s = stdVec[i] || 1;
        out[i] = (v[i] - meanVec[i]) / s;
    }
    return out;
}

export async function loadRagStore(
    datasetPath: string,
    opts: { metaPath?: string; historyDir?: string; datasetPath30Min?: string; halvesDatasetPath?: string } = {},
): Promise<void> {
    if (opts.historyDir) {
        historyDirAbs = path.isAbsolute(opts.historyDir)
            ? opts.historyDir
            : path.resolve(process.cwd(), opts.historyDir);
    }
    if (opts.metaPath) await loadMatchMeta(opts.metaPath);
    if (opts.datasetPath30Min) await loadLabel30(opts.datasetPath30Min);
    if (opts.halvesDatasetPath) await loadHalfSummaries(opts.halvesDatasetPath);
    const abs = path.isAbsolute(datasetPath) ? datasetPath : path.resolve(process.cwd(), datasetPath);
    let content: string;
    try {
        content = await fs.readFile(abs, 'utf8');
    } catch (e) {
        console.warn(`[rag-store] Không đọc được ${abs}: ${(e as Error).message}. RAG sẽ trống.`);
        samples = [];
        openingLinesByMatch.clear();
        loaded = false;
        return;
    }
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    const rows: FeatureRow[] = [];
    for (const line of lines) {
        try {
            rows.push(JSON.parse(line) as FeatureRow);
        } catch {
            // skip
        }
    }
    if (rows.length === 0) {
        samples = [];
        openingLinesByMatch.clear();
        loaded = false;
        return;
    }
    // Compute mean/std per feature
    const n = FEATURE_NAMES.length;
    const mean = new Float32Array(n);
    const std = new Float32Array(n);
    for (const r of rows) {
        const v = buildVector(r);
        for (let i = 0; i < n; i++) mean[i] += v[i];
    }
    for (let i = 0; i < n; i++) mean[i] /= rows.length;
    for (const r of rows) {
        const v = buildVector(r);
        for (let i = 0; i < n; i++) std[i] += (v[i] - mean[i]) ** 2;
    }
    for (let i = 0; i < n; i++) std[i] = Math.sqrt(std[i] / rows.length) || 1;
    meanVec = mean;
    stdVec = std;

    samples = rows.map((r) => {
        const raw = buildVector(r);
        const sv = standardize(raw);
        // Hỗ trợ cả tên cột mới (`goal_within_window`) và cũ (`goal_within_5min`)
        // để dataset cũ vẫn load được trước khi re-extract.
        const rRec = r as unknown as Record<string, unknown>;
        const rawLabel = rRec.goal_within_window ?? rRec.goal_within_5min ?? 0;
        const label = (Number(rawLabel) === 1 ? 1 : 0) as 0 | 1;
        const labelHalf = (Number(rRec.goal_before_half_end ?? 0) === 1 ? 1 : 0) as 0 | 1;
        const rawFeatures: Record<string, number> = {};
        for (const name of FEATURE_NAMES) {
            const x = Number(rRec[name]);
            rawFeatures[name] = Number.isFinite(x) ? x : 0;
        }
        return {
            matchId: r.match_id,
            half: Number(r.half),
            minute: Number(r.minute),
            label,
            labelHalf,
            vec: sv,
            norm: l2norm(sv),
            raw: rawFeatures,
        };
    });
    openingLinesByMatch.clear();
    for (const s of samples) {
        const ou = s.raw.ou13_handicap;
        if (!Number.isFinite(ou)) continue;
        const slot = s.half === 2 ? 'h2' : 'h1';
        const ah = s.raw.ah12_handicap;
        const entry = openingLinesByMatch.get(s.matchId) ?? {};
        const prev = entry[slot];
        if (!prev || s.minute < prev.minute) {
            entry[slot] = {
                ou13: ou,
                ah12: Number.isFinite(ah) ? ah : undefined,
                minute: s.minute,
            };
            openingLinesByMatch.set(s.matchId, entry);
        }
    }
    loaded = true;
    const positives = samples.filter((s) => s.label === 1).length;
    console.log(`[rag-store] Loaded ${samples.length} samples (${positives} positives)`);
}

export interface SimilarMatch {
    matchId: string;
    half: number;
    minute: number;
    label: 0 | 1;
    /** Nhãn "có bàn trong 30' sau" (từ dataset 30') — undefined nếu không tra được. */
    label30?: 0 | 1;
    /** Nhãn "có bàn từ phút này đến hết hiệp hiện tại" (từ dataset chính). */
    labelHalf?: 0 | 1;
    similarity: number;
    /** Tên 2 đội + trạng thái (từ meta dataset) — best-effort, có thể rỗng nếu thiếu meta. */
    home?: string;
    away?: string;
    ftStatus?: string;
    /** Snapshot feature THẬT tại phút đó — để so sánh với trận đang xem trong popup. */
    features?: Record<string, number>;
    /** Catalog vạch mở: hiệp khớp cùng hiệp H1 hoặc H2 (chỉ có ở similarMatchesOpenLineCatalog). */
    matchedOpenHalves?: 'H1' | 'H2';
    /** Vạch mở 1_3 đầu hiệp của trận candidate (catalog). */
    h1OpenOu13?: number;
    h2OpenOu13?: number;
    h1OpenAh12?: number;
    h2OpenAh12?: number;
    /** Catalog: ghi chú khi vạch mở 1_2 cùng hiệp không trùng (vẫn giữ vì khớp 1_3). */
    openAh12MismatchNote?: string;
    ou13LineRuns?: string;
    /** Tổng lệch phút so với trận đang xem (nhỏ = giống hơn). */
    lineRunsScore?: number;
}

/** Context vạch mở hiệp của trận đang xem — truyền vào topK để ưu tiên line đầu H1/H2. */
export type LineMatchContext = OpeningLinesRef;

/** `legacy` = vạch snapshot T/X + chấp + cosine (cách cũ). `openLine` = vạch mở hiệp + bonus H1+H2. */
export type SimilarRankMode = 'legacy' | 'openLine';

const OPEN_LINE_EPS = 1e-6;

function openLineHandicapMatch(a: number, b: number): boolean {
    return Math.abs(a - b) < OPEN_LINE_EPS;
}

/** Kèo chấp: khớp theo biên độ |HDP| — +0.25 và −0.25 cùng vạch. */
function openLineAhMagnitudeMatch(a: number, b: number): boolean {
    return Math.abs(Math.abs(a) - Math.abs(b)) < OPEN_LINE_EPS;
}

/** Giữ lần xuất hiện đầu (xếp hạng cao nhất) cho mỗi matchId. */
function dedupeRankedByMatchId<T extends { matchId: string }>(ranked: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const row of ranked) {
        const id = String(row.matchId);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(row);
    }
    return out;
}

/**
 * @param matchLines Khi true: xếp theo vạch kèo (mode quyết định chi tiết).
 * @param rankMode `legacy` — max(|Δou13|,|Δah12|) tại phút tình huống rồi cosine.
 *   `openLine` — cùng hiệp → vạch mở hiệp → dual H1+H2 → snapshot → cosine.
 */
export function topK(
    query: FeatureVector,
    k = 5,
    onlyPositive = false,
    matchLines = false,
    lineCtx?: LineMatchContext,
    rankMode: SimilarRankMode = 'openLine',
): SimilarMatch[] {
    if (!loaded || samples.length === 0) return [];
    const qRaw = buildVector(query);
    const qStd = standardize(qRaw);
    const qNorm = l2norm(qStd);
    if (qNorm === 0) return [];

    const qHalf = Number(query.half) === 2 ? 2 : 1;
    const qOu = Number(query.ou13_handicap);
    const qAh = Number(query.ah12_handicap);
    const hasOpenCtx = rankMode === 'openLine' && lineCtx != null && (
        Number.isFinite(lineCtx.h1OpenOu13) || Number.isFinite(lineCtx.h2OpenOu13)
    );
    const useLineMatchLegacy = matchLines && rankMode === 'legacy'
        && Number.isFinite(qOu) && Number.isFinite(qAh);
    const useLineMatchOpen = matchLines && rankMode === 'openLine' && (
        (Number.isFinite(qOu) && Number.isFinite(qAh)) || hasOpenCtx
    );
    const useLineMatch = useLineMatchLegacy || useLineMatchOpen;

    const qOpenOu = qHalf === 1 ? lineCtx?.h1OpenOu13 : lineCtx?.h2OpenOu13;
    const dualOpenEnabled = hasOpenCtx
        && Number.isFinite(lineCtx!.h1OpenOu13)
        && Number.isFinite(lineCtx!.h2OpenOu13);

    // openLine + matchLines: bắt buộc có vạch mở 1_3 cùng hiệp — không fallback snapshot T/X tại phút.
    if (rankMode === 'openLine' && matchLines && !Number.isFinite(qOpenOu)) {
        return [];
    }

    const pool = onlyPositive ? samples.filter((s) => s.label === 1) : samples;
    const scored = pool.map((s) => {
        let dot = 0;
        for (let i = 0; i < qStd.length; i++) dot += qStd[i] * s.vec[i];
        const sim = dot / (qNorm * (s.norm || 1));
        const basic = matchBasicById.get(s.matchId);
        const sOu = s.raw.ou13_handicap;
        const sAh = s.raw.ah12_handicap;

        const sameHalfTier = s.half === qHalf ? 0 : 1;

        const candOpen = openingLinesByMatch.get(s.matchId);
        let openLineBand = 0;
        if (hasOpenCtx && Number.isFinite(qOpenOu)) {
            const cOpen = qHalf === 1 ? candOpen?.h1 : candOpen?.h2;
            openLineBand = cOpen && Number.isFinite(cOpen.ou13)
                ? Math.abs(cOpen.ou13 - qOpenOu!)
                : Infinity;
        }

        let dualOpenBand = 0;
        if (dualOpenEnabled) {
            const h1Diff = candOpen?.h1 && Number.isFinite(candOpen.h1.ou13)
                ? Math.abs(candOpen.h1.ou13 - lineCtx!.h1OpenOu13!)
                : Infinity;
            const h2Diff = candOpen?.h2 && Number.isFinite(candOpen.h2.ou13)
                ? Math.abs(candOpen.h2.ou13 - lineCtx!.h2OpenOu13!)
                : Infinity;
            dualOpenBand = Math.max(h1Diff, h2Diff);
        }

        const ou13Band = Number.isFinite(sOu) && Number.isFinite(qOu)
            ? Math.abs(sOu - qOu)
            : Infinity;
        const ah12Band = Number.isFinite(sAh) && Number.isFinite(qAh)
            ? Math.abs(sAh - qAh)
            : Infinity;
        const lineBand = useLineMatchLegacy && Number.isFinite(sOu) && Number.isFinite(sAh)
            ? Math.max(ou13Band, ah12Band)
            : Infinity;

        const matchableLegacy = Number.isFinite(lineBand);
        const matchableOpen = !hasOpenCtx
            ? Number.isFinite(ou13Band) && Number.isFinite(ah12Band)
            : Number.isFinite(openLineBand);

        return {
            matchId: s.matchId,
            half: s.half,
            minute: s.minute,
            label: s.label,
            label30: label30ByKey.get(`${s.matchId}:${s.half}:${s.minute}`),
            labelHalf: s.labelHalf,
            similarity: sim,
            home: basic?.home,
            away: basic?.away,
            ftStatus: basic?.ftStatus,
            features: s.raw,
            sameHalfTier,
            openLineBand,
            dualOpenBand,
            ou13Band,
            ah12Band,
            lineBand,
            matchable: rankMode === 'legacy' ? matchableLegacy : matchableOpen,
        };
    });

    const cmpOpen = (
        a: { sameHalfTier: number; openLineBand: number; dualOpenBand: number; ou13Band: number; ah12Band: number; similarity: number },
        b: typeof a,
    ) =>
        a.sameHalfTier - b.sameHalfTier
        || a.openLineBand - b.openLineBand
        || a.dualOpenBand - b.dualOpenBand
        || a.ou13Band - b.ou13Band
        || a.ah12Band - b.ah12Band
        || b.similarity - a.similarity;

    const cmpLegacy = (
        a: { lineBand: number; similarity: number },
        b: typeof a,
    ) => a.lineBand - b.lineBand || b.similarity - a.similarity;

    let ranked = scored;
    if (useLineMatch) {
        ranked = scored
            .filter((x) => x.matchable)
            .sort(rankMode === 'legacy' ? cmpLegacy : cmpOpen);
    } else {
        ranked = scored.sort((a, b) => b.similarity - a.similarity);
    }

    // openLine + vạch mở trận đang xem: chỉ giữ trận khớp vạch mở 1_3 cùng hiệp (H1↔H1 / H2↔H2).
    if (hasOpenCtx && rankMode === 'openLine' && Number.isFinite(qOpenOu)) {
        ranked = ranked.filter((x) => x.openLineBand < OPEN_LINE_EPS);
    }

    // Mỗi matchId chỉ 1 cột — giữ snapshot xếp hạng cao nhất (dataset có nhiều phút/trận).
    ranked = dedupeRankedByMatchId(ranked);

    return ranked.slice(0, k).map(({
        sameHalfTier: _sh,
        openLineBand: _ol,
        dualOpenBand: _dl,
        ou13Band: _ou,
        ah12Band: _ah,
        lineBand: _lb,
        matchable: _m,
        matchId,
        ...rest
    }) => {
        const open = openingLinesByMatch.get(String(matchId));
        const matchedLabel = qHalf === 1 ? 'H1' : 'H2';
        return {
            matchId,
            ...rest,
            ...(rankMode === 'openLine' && hasOpenCtx ? {
                matchedOpenHalves: matchedLabel as 'H1' | 'H2',
                h1OpenOu13: open?.h1?.ou13,
                h2OpenOu13: open?.h2?.ou13,
                h1OpenAh12: open?.h1?.ah12,
                h2OpenAh12: open?.h2?.ah12,
            } : {}),
        };
    });
}

/** @deprecated alias */
function ou13OpenLinesMatch(a: number, b: number): boolean {
    return openLineHandicapMatch(a, b);
}

function cosineSimilarity(query: FeatureVector, sample: IndexedSample): number {
    const qRaw = buildVector(query);
    const qStd = standardize(qRaw);
    const qNorm = l2norm(qStd);
    if (qNorm === 0 || sample.norm === 0) return 0;
    let dot = 0;
    for (let i = 0; i < qStd.length; i++) dot += qStd[i] * sample.vec[i];
    return dot / (qNorm * sample.norm);
}

function pickCatalogSample(
    matchId: string,
    matchedHalves: Array<1 | 2>,
    qHalf: number,
    qMinute: number,
): IndexedSample | null {
    const pool = samples.filter((s) => s.matchId === matchId);
    if (pool.length === 0) return null;

    const preferHalf = matchedHalves.includes(qHalf as 1 | 2) ? qHalf : matchedHalves[0]!;
    const exact = pool.find((s) => s.half === preferHalf && s.minute === qMinute);
    if (exact) return exact;

    const inHalf = pool.filter((s) => s.half === preferHalf);
    if (inHalf.length > 0) {
        return inHalf.reduce((best, s) =>
            (Math.abs(s.minute - qMinute) < Math.abs(best.minute - qMinute) ? s : best));
    }

    const fallbackHalf = matchedHalves[0]!;
    const fallbackPool = pool.filter((s) => s.half === fallbackHalf).sort((a, b) => a.minute - b.minute);
    return fallbackPool[0] ?? null;
}

/**
 * Liệt kê mọi trận có vạch mở **1_3** cùng hiệp trùng trận đang xem
 * (H1↔H1, H2↔H2). Vạch mở **1_2** không lọc bỏ — trận lệch 1_2 vẫn giữ kèm note.
 */
export function listMatchesByOpeningOu13(
    lineCtx: LineMatchContext,
    query: FeatureVector,
    opts?: { excludeMatchId?: string; limit?: number },
): SimilarMatch[] {
    if (!loaded || samples.length === 0) return [];

    const qHalf = Number(query.half) === 2 ? 2 : 1;
    const qMinute = Number(query.minute) || 0;
    const qOuLine = qHalf === 1 ? lineCtx.h1OpenOu13 : lineCtx.h2OpenOu13;
    const qAhLine = qHalf === 1 ? lineCtx.h1OpenAh12 : lineCtx.h2OpenAh12;
    if (!Number.isFinite(qOuLine)) return [];
    const compareAh12 = Number.isFinite(qAhLine);

    type Row = { matchId: string; matchedHalf: 1 | 2; openAh12MismatchNote?: string };
    const rows: Row[] = [];

    for (const [matchId, open] of openingLinesByMatch) {
        if (opts?.excludeMatchId && matchId === opts.excludeMatchId) continue;
        const cand = qHalf === 1 ? open.h1 : open.h2;
        if (!cand || !openLineHandicapMatch(cand.ou13, qOuLine!)) continue;

        let openAh12MismatchNote: string | undefined;
        if (compareAh12) {
            const ahOk = Number.isFinite(cand.ah12)
                && openLineAhMagnitudeMatch(cand.ah12!, qAhLine!);
            if (!ahOk) {
                const candAh = Number.isFinite(cand.ah12) ? String(cand.ah12) : '—';
                openAh12MismatchNote = `1_2 mở khác (${candAh} · đang xem ${qAhLine})`;
            }
        }

        rows.push({ matchId, matchedHalf: qHalf, openAh12MismatchNote });
    }

    rows.sort(
        (a, b) =>
            Number(Boolean(a.openAh12MismatchNote)) - Number(Boolean(b.openAh12MismatchNote))
            || a.matchId.localeCompare(b.matchId),
    );

    const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));

    return rows.slice(0, limit).flatMap(({ matchId, matchedHalf, openAh12MismatchNote }) => {
        const sample = pickCatalogSample(matchId, [matchedHalf], qHalf, qMinute);
        if (!sample) return [];
        const basic = matchBasicById.get(matchId);
        const matchedLabel = matchedHalf === 1 ? 'H1' : 'H2';
        const h1OpenOu13 = openingLinesByMatch.get(matchId)?.h1?.ou13;
        const h2OpenOu13 = openingLinesByMatch.get(matchId)?.h2?.ou13;
        const candLine = qHalf === 1 ? h1OpenOu13 : h2OpenOu13;
        if (!Number.isFinite(candLine) || !openLineHandicapMatch(candLine!, qOuLine!)) return [];
        return [{
            matchId,
            half: sample.half,
            minute: sample.minute,
            label: sample.label,
            label30: label30ByKey.get(`${matchId}:${sample.half}:${sample.minute}`),
            labelHalf: sample.labelHalf,
            similarity: cosineSimilarity(query, sample),
            home: basic?.home,
            away: basic?.away,
            ftStatus: basic?.ftStatus,
            features: sample.raw,
            matchedOpenHalves: matchedLabel,
            h1OpenOu13,
            h2OpenOu13,
            h1OpenAh12: openingLinesByMatch.get(matchId)?.h1?.ah12,
            h2OpenAh12: openingLinesByMatch.get(matchId)?.h2?.ah12,
            openAh12MismatchNote,
        } as SimilarMatch];
    });
}

/**
 * Catalog vạch mở cùng hiệp + pattern thời gian giữ từng vạch 1_3 gần giống nhau
 * (vd. 2.5×5p · 2.25×6p · 2.0×7p).
 */
export async function listMatchesByOpeningOu13WithLineRuns(
    lineCtx: LineMatchContext,
    query: FeatureVector,
    queryOdds: readonly Ou13OddsPoint[],
    opts?: {
        excludeMatchId?: string;
        limit?: number;
        durationToleranceMin?: number;
    },
): Promise<SimilarMatch[]> {
    const qHalf = Number(query.half) === 2 ? 2 : 1;
    const qMinute = Number(query.minute) || 0;
    const tolerance = opts?.durationToleranceMin ?? OU13_LINE_RUN_DURATION_TOLERANCE_MIN;
    const qRuns = buildOu13LineRuns(queryOdds, qHalf, qMinute);
    if (qRuns.length === 0) return [];

    const base = listMatchesByOpeningOu13(lineCtx, query, {
        excludeMatchId: opts?.excludeMatchId,
        limit: 200,
    });
    if (base.length === 0) return [];

    type Scored = SimilarMatch & { lineRunsScore: number };
    const scored: Scored[] = [];

    await Promise.all(
        base.map(async (row) => {
            const hist = await getOddsHistory13(row.matchId);
            if (!hist?.odds?.length) return;
            const candOdds: Ou13OddsPoint[] = hist.odds.map((o) => ({
                minute: o.minute,
                half: o.half,
                handicap: o.handicap,
            }));
            const cRuns = buildOu13LineRuns(candOdds, qHalf, qMinute);
            const { match, score } = ou13LineRunsSimilar(qRuns, cRuns, tolerance);
            if (!match) return;
            scored.push({
                ...row,
                ou13LineRuns: formatOu13LineRuns(cRuns),
                lineRunsScore: score,
            });
        }),
    );

    scored.sort(
        (a, b) =>
            a.lineRunsScore - b.lineRunsScore
            || a.matchId.localeCompare(b.matchId),
    );

    const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));
    return scored.slice(0, limit);
}

/** Tách odds 1_3 từ payload match client gửi lên. */
export function ou13OddsPointsFromParsedOdds(
    odds: readonly { marketId?: string; clockMinute: number; half: 1 | 2; handicap: number }[],
): Ou13OddsPoint[] {
    return odds
        .filter((o) => o.marketId === '1_3' && Number.isFinite(o.handicap))
        .map((o) => ({
            minute: o.clockMinute,
            half: o.half,
            handicap: o.handicap,
        }));
}

/** Pattern vạch 1_3 trận đang xem (hiệp + phút hiện tại). */
export function queryOu13LineRunsLabel(
    query: FeatureVector,
    queryOdds: readonly Ou13OddsPoint[],
): string {
    const qHalf = Number(query.half) === 2 ? 2 : 1;
    const qMinute = Number(query.minute) || 0;
    return formatOu13LineRuns(buildOu13LineRuns(queryOdds, qHalf, qMinute));
}

/** Tên/trạng thái + giải + tỷ số chung cuộc — đọc lazy từ History md (cache). */
export interface MatchDetail {
    matchId: string;
    homeName: string;
    awayName: string;
    league: string;
    finalScore: string;
    ftStatus: string;
    file?: string;
}

/** Nạp nhãn "có bàn trong 30' sau" từ dataset 30', khóa theo matchId:half:minute. */
async function loadLabel30(datasetPath30: string): Promise<void> {
    const abs = path.isAbsolute(datasetPath30) ? datasetPath30 : path.resolve(process.cwd(), datasetPath30);
    try {
        const content = await fs.readFile(abs, 'utf8');
        label30ByKey.clear();
        for (const line of content.split(/\r?\n/)) {
            if (!line.trim()) continue;
            try {
                const r = JSON.parse(line) as Record<string, unknown>;
                const key = `${String(r.match_id)}:${Number(r.half)}:${Number(r.minute)}`;
                const lbl = (Number(r.goal_within_window ?? r.goal_within_5min ?? 0) === 1 ? 1 : 0) as 0 | 1;
                label30ByKey.set(key, lbl);
            } catch {
                // skip
            }
        }
        console.log(`[rag-store] Loaded ${label30ByKey.size} nhãn 30' từ ${path.basename(abs)}`);
    } catch (e) {
        console.warn(`[rag-store] Không đọc được dataset 30' ${abs}: ${(e as Error).message}. Nhãn 30' sẽ thiếu.`);
    }
}

/** Nạp tóm tắt theo hiệp từ goal-halves-dataset.jsonl (1 dòng / trận). */
async function loadHalfSummaries(halvesPath: string): Promise<void> {
    const abs = path.isAbsolute(halvesPath) ? halvesPath : path.resolve(process.cwd(), halvesPath);
    try {
        const content = await fs.readFile(abs, 'utf8');
        const rows: HalfSummary[] = [];
        for (const line of content.split(/\r?\n/)) {
            if (!line.trim()) continue;
            try {
                rows.push(JSON.parse(line) as HalfSummary);
            } catch {
                // skip
            }
        }
        halfSummaries = rows;
        console.log(`[rag-store] Loaded ${rows.length} tóm tắt theo hiệp từ ${path.basename(abs)}`);
    } catch (e) {
        halfSummaries = [];
        console.warn(`[rag-store] Không đọc được ${abs}: ${(e as Error).message}. RAG "số bàn theo hiệp" sẽ trống.`);
    }
}

/** Truy vấn "% có bàn ở một hiệp" theo vạch mở T/X + (tùy chọn) điều kiện hiệp trước + kèo chấp mềm. */
export interface HalfGoalQuery {
    half: 1 | 2;
    /** Vạch mở T/X (1_3) của hiệp đang hỏi. */
    openOu13: number;
    /** Vạch mở kèo chấp (1_2) của hiệp đang hỏi — chỉ dùng tính tỷ lệ phụ (soft). */
    openAh12?: number;
    /** Điều kiện hiệp trước (dùng khi hỏi H2): vạch mở H1 + số bàn thực tế H1. */
    priorHalf?: { openOu13?: number; goals: number };
    excludeMatchId?: string;
}

export interface HalfGoalMatchRef {
    matchId: string;
    home?: string;
    away?: string;
    ftStatus?: string;
    finalScore?: string;
    goals: number;
    hasGoal: 0 | 1;
    openAh12?: number;
}

export interface HalfGoalStats {
    half: 1 | 2;
    openOu13: number;
    conditionedOnPriorHalf: boolean;
    /** Số bàn H1 thực tế của trận đang xem — điều kiện lọc (chỉ có khi conditionedOnPriorHalf). */
    priorHalfGoals?: number;
    /** true = mở trận muộn, không xác định được số bàn H1 → không áp điều kiện (số liệu là KHÔNG điều kiện). */
    priorHalfUnknown?: boolean;
    /** true = điều kiện số bàn H1 không có trận nào khớp → đã hạ điều kiện, số liệu là chung cho vạch này. */
    priorHalfNoMatch?: boolean;
    total: number;
    hits: number;
    rate: number;
    goalsAvg: number;
    dist: { zero: number; one: number; twoPlus: number };
    /** Tỷ lệ trên subset trùng kèo chấp mở hiệp (ưu tiên mềm). */
    ahSoft?: { openAh12: number; total: number; hits: number; rate: number };
    /** Danh sách trận khớp (để hiển thị / drill-down). */
    matches: HalfGoalMatchRef[];
}

/**
 * Đếm % trận lịch sử CÓ BÀN ở hiệp `q.half`, lọc theo vạch mở T/X cùng hiệp (khớp tuyệt đối).
 * Khi hỏi H2 kèm `priorHalf`: chỉ giữ trận có H1 cùng vạch mở (nếu cho) VÀ số bàn H1 khớp
 * (thường 0 = "H1 không bàn"). Kèo chấp là tiêu chí phụ — chỉ tính thêm `ahSoft`, không lọc.
 * `ahSoft` khớp theo |HDP| (bỏ dấu +/− góc nhà).
 */
export function halfGoalRate(q: HalfGoalQuery): HalfGoalStats {
    const half = q.half === 2 ? 2 : 1;
    const ouKey = half === 1 ? 'h1_open_ou13' : 'h2_open_ou13';
    const ahKey = half === 1 ? 'h1_open_ah12' : 'h2_open_ah12';
    const goalsKey = half === 1 ? 'h1_goals' : 'h2_goals';
    const hasKey = half === 1 ? 'h1_has_goal' : 'h2_has_goal';

    const conditioned = half === 2 && q.priorHalf != null;

    const pool = halfSummaries.filter((s) => {
        if (q.excludeMatchId && s.match_id === q.excludeMatchId) return false;
        const ou = s[ouKey];
        if (ou == null || !openLineHandicapMatch(ou, q.openOu13)) return false;
        if (conditioned) {
            if (s.h1_goals !== q.priorHalf!.goals) return false;
            if (Number.isFinite(q.priorHalf!.openOu13)) {
                if (s.h1_open_ou13 == null || !openLineHandicapMatch(s.h1_open_ou13, q.priorHalf!.openOu13!)) {
                    return false;
                }
            }
        }
        return true;
    });

    let hits = 0;
    let goalSum = 0;
    let zero = 0;
    let one = 0;
    let twoPlus = 0;
    const matches: HalfGoalMatchRef[] = [];
    for (const s of pool) {
        const g = Number(s[goalsKey]) || 0;
        const has = (s[hasKey] === 1 ? 1 : 0) as 0 | 1;
        hits += has;
        goalSum += g;
        if (g <= 0) zero += 1;
        else if (g === 1) one += 1;
        else twoPlus += 1;
        matches.push({
            matchId: s.match_id,
            home: s.home || undefined,
            away: s.away || undefined,
            ftStatus: s.ft_status || undefined,
            finalScore: s.final_score || undefined,
            goals: g,
            hasGoal: has,
            openAh12: s[ahKey] ?? undefined,
        });
    }
    const total = pool.length;

    let ahSoft: HalfGoalStats['ahSoft'];
    if (Number.isFinite(q.openAh12)) {
        const sub = pool.filter((s) => s[ahKey] != null && openLineAhMagnitudeMatch(s[ahKey]!, q.openAh12!));
        const subHits = sub.filter((s) => s[hasKey] === 1).length;
        ahSoft = {
            openAh12: q.openAh12!,
            total: sub.length,
            hits: subHits,
            rate: sub.length ? subHits / sub.length : 0,
        };
    }

    return {
        half,
        openOu13: q.openOu13,
        conditionedOnPriorHalf: conditioned,
        priorHalfGoals: conditioned ? q.priorHalf!.goals : undefined,
        total,
        hits,
        rate: total ? hits / total : 0,
        goalsAvg: total ? goalSum / total : 0,
        dist: { zero, one, twoPlus },
        ahSoft,
        matches,
    };
}

async function loadMatchMeta(metaPath: string): Promise<void> {
    const abs = path.isAbsolute(metaPath) ? metaPath : path.resolve(process.cwd(), metaPath);
    try {
        const raw = await fs.readFile(abs, 'utf8');
        const meta = JSON.parse(raw) as { perMatch?: Array<{ matchId?: string; file?: string; ftStatus?: string }> };
        matchBasicById.clear();
        for (const m of meta.perMatch ?? []) {
            if (!m.matchId || !m.file) continue;
            const { home, away } = parseTeamsFromFile(m.file);
            matchBasicById.set(String(m.matchId), {
                home,
                away,
                ftStatus: m.ftStatus ?? '',
                file: m.file,
            });
        }
        console.log(`[rag-store] Loaded meta cho ${matchBasicById.size} trận từ ${path.basename(abs)}`);
    } catch (e) {
        console.warn(`[rag-store] Không đọc được meta ${abs}: ${(e as Error).message}. "Chi tiết" sẽ thiếu tên đội.`);
    }
}

/** Đọc HEADER (table thông tin chung) của History md → giải + tỷ số chung cuộc. Cache theo matchId. */
export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    const id = String(matchId);
    if (detailCache.has(id)) return detailCache.get(id) ?? null;

    const basic = matchBasicById.get(id);
    if (!basic || !historyDirAbs) {
        detailCache.set(id, null);
        return null;
    }
    try {
        const abs = path.join(historyDirAbs, basic.file);
        // Chỉ cần phần header (table "Thông tin chung") nên đọc ~2KB đầu là đủ.
        const fh = await fs.open(abs, 'r');
        try {
            const buf = Buffer.alloc(2048);
            const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
            const head = buf.toString('utf8', 0, bytesRead);
            const titleMatch = head.match(/^# Trận đấu — (.+?) vs (.+?)$/m);
            const lookup = (label: string): string => {
                const re = new RegExp(`\\|\\s*${label}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`);
                return head.match(re)?.[1]?.replace(/`/g, '').trim() ?? '';
            };
            const detail: MatchDetail = {
                matchId: id,
                homeName: titleMatch?.[1]?.trim() || basic.home,
                awayName: titleMatch?.[2]?.trim() || basic.away,
                league: lookup('Giải'),
                finalScore: lookup('Tỷ số'),
                ftStatus: lookup('Thời điểm / trạng thái') || basic.ftStatus,
                file: basic.file,
            };
            detailCache.set(id, detail);
            return detail;
        } finally {
            await fh.close();
        }
    } catch (e) {
        const msg = (e as Error).message;
        console.warn(`[rag-store] Không đọc được History md cho ${id}: ${msg}`);
        // Không cache miss ENOENT — user có thể copy History sau khi server đã chạy.
        if (!msg.includes('ENOENT')) detailCache.set(id, null);
        return null;
    }
}

/** Tổng lũy kế từ đầu trận đến (half, minute) — DA / sút / sút trúng đích / phạt góc (cả 2 đội). */
export interface CumulativeTotals {
    da: number;
    shots: number;
    onTarget: number;
    corners: number;
}

/** Cache ParsedMatch (full md) theo matchId để khỏi đọc + parse lại nhiều lần. */
const parsedMatchCache = new Map<string, ParsedMatch | null>();

async function getParsedMatch(matchId: string): Promise<ParsedMatch | null> {
    const id = String(matchId);
    if (parsedMatchCache.has(id)) return parsedMatchCache.get(id) ?? null;
    const basic = matchBasicById.get(id);
    if (!basic || !historyDirAbs) {
        parsedMatchCache.set(id, null);
        return null;
    }
    try {
        const abs = path.join(historyDirAbs, basic.file);
        const content = await fs.readFile(abs, 'utf8');
        const parsed = parseMatchFile(content);
        parsedMatchCache.set(id, parsed);
        return parsed;
    } catch (e) {
        const msg = (e as Error).message;
        console.warn(`[rag-store] Không đọc/parse được full md cho ${id}: ${msg}`);
        if (!msg.includes('ENOENT')) parsedMatchCache.set(id, null);
        return null;
    }
}

/**
 * Tổng lũy kế tại (half, minute) từ 1 mảng StatRow (counters là cumulative cả trận).
 * Dùng cho cả trận tương tự (parse md) lẫn trận đang xem (stats client gửi).
 */
export function totalsFromStats(stats: StatRow[], half: Half, minute: number): CumulativeTotals | null {
    const same = stats.filter((s) => s.half === half && s.clockMinute <= minute);
    if (same.length === 0) return null;
    const cur = same.reduce((a, b) => (b.clockMinute >= a.clockMinute ? b : a));
    const sum = (p?: [number, number]): number => (p ? (p[0] ?? 0) + (p[1] ?? 0) : 0);
    return {
        da: sum(cur.dangerous),
        shots: sum(cur.onTarget) + sum(cur.offTarget),
        onTarget: sum(cur.onTarget),
        corners: sum(cur.corners),
    };
}

/** Tổng lũy kế của 1 trận tương tự (đọc full md, có cache). */
export async function getCumulativeStatsAt(matchId: string, half: number, minute: number): Promise<CumulativeTotals | null> {
    const parsed = await getParsedMatch(matchId);
    if (!parsed) return null;
    return totalsFromStats(parsed.stats, (half === 2 ? 2 : 1) as Half, minute);
}

/**
 * Lịch sử odds Tài/Xỉu cả trận (1_3) + kèo chấp (1_2) + kèo H1 (1_6/1_5)
 * + sự kiện + cảnh báo + stats theo phút — đủ vẽ MomentumChart giống Dashboard.
 */
export interface OddsHistory13 {
    matchId: string;
    homeName: string;
    awayName: string;
    league: string;
    finalScore: string;
    /** OU cả trận (1_3) — kèo chính (nến). */
    odds: Array<{ minute: number; half: 1 | 2; handicap: number; over?: number; under?: number }>;
    /** AH cả trận (1_2) — kèo phụ "Đội nhà". */
    odds12: Array<{ minute: number; half: 1 | 2; handicap: number; home?: number; away?: number }>;
    /** OU hiệp 1 (1_6) — kèo riêng H1. */
    odds16: Array<{ minute: number; half: 1 | 2; handicap: number; over?: number; under?: number }>;
    /** AH hiệp 1 (1_5) — kèo riêng H1. */
    odds15: Array<{ minute: number; half: 1 | 2; handicap: number; home?: number; away?: number }>;
    events: Array<{ minute: number; half: 1 | 2; type: 'goal' | 'corner'; team?: 'home' | 'away' }>;
    /** Chuông cảnh báo đã lưu (md chỉ parse được loại pressure kèm mức 1/2). */
    alerts: Array<{ minute: number; half: 1 | 2; type: string; pressure: number }>;
    /** Counter lũy kế theo phút [home, away] — client tính API score + shot events. */
    stats: Array<{
        minute: number;
        half: 1 | 2;
        attacks: [number, number];
        dangerous: [number, number];
        onTarget: [number, number];
        offTarget: [number, number];
        corners: [number, number];
    }>;
    /** Nhận định người dùng đã ghi cho trận này (từ .md) — hiển thị lại ở bảng so sánh. */
    userNotes: UserNote[];
}

function oddsHistoryFromParsed(id: string, parsed: ParsedMatch): OddsHistory13 {
    const basic = matchBasicById.get(id);
    return {
        matchId: id,
        homeName: parsed.meta.homeName || basic?.home || '',
        awayName: parsed.meta.awayName || basic?.away || '',
        league: parsed.meta.league || '',
        finalScore: parsed.meta.finalScore || '',
        odds: parsed.odds
            .filter((o) => o.marketId === '1_3')
            .map((o) => ({ minute: o.clockMinute, half: o.half, handicap: o.handicap, over: o.over, under: o.under })),
        odds12: parsed.odds
            .filter((o) => o.marketId === '1_2')
            .map((o) => ({ minute: o.clockMinute, half: o.half, handicap: o.handicap, home: o.home, away: o.away })),
        odds16: parsed.odds
            .filter((o) => o.marketId === '1_6')
            .map((o) => ({ minute: o.clockMinute, half: o.half, handicap: o.handicap, over: o.over, under: o.under })),
        odds15: parsed.odds
            .filter((o) => o.marketId === '1_5')
            .map((o) => ({ minute: o.clockMinute, half: o.half, handicap: o.handicap, home: o.home, away: o.away })),
        events: parsed.events.map((e) => ({
            minute: e.clockMinute,
            half: e.half,
            type: e.type,
            ...(e.team ? { team: e.team } : {}),
        })),
        alerts: parsed.alerts.map((a) => ({ minute: a.clockMinute, half: a.half, type: a.type, pressure: a.pressure })),
        userNotes: parsed.userNotes ?? [],
        stats: parsed.stats.map((s) => ({
            minute: s.clockMinute,
            half: s.half,
            attacks: s.attacks,
            dangerous: s.dangerous,
            onTarget: s.onTarget,
            offTarget: s.offTarget,
            corners: s.corners,
        })),
    };
}

/**
 * Fallback khi thiếu file History/*.md — dựng odds + bàn thắng từ các dòng dataset đã nạp RAM.
 * Không có stats theo phút (chỉ có tổng lũy kế trong feature row) nên timeline API sẽ trống.
 */
function oddsHistoryFromSamples(id: string): OddsHistory13 | null {
    const matchSamples = samples.filter((s) => s.matchId === id);
    if (matchSamples.length === 0) return null;
    const basic = matchBasicById.get(id);
    const sorted = [...matchSamples].sort((a, b) => a.half - b.half || a.minute - b.minute);
    const odds = sorted
        .map((s) => ({
            minute: s.minute,
            half: (s.half === 2 ? 2 : 1) as 1 | 2,
            handicap: s.raw.ou13_handicap,
            over: s.raw.ou13_over_odds,
            under: s.raw.ou13_under_odds,
        }))
        .filter((o) => Number.isFinite(o.handicap));
    const odds12 = sorted
        .map((s) => ({
            minute: s.minute,
            half: (s.half === 2 ? 2 : 1) as 1 | 2,
            handicap: s.raw.ah12_handicap,
            home: s.raw.ah12_home_odds,
            away: s.raw.ah12_away_odds,
        }))
        .filter((o) => Number.isFinite(o.handicap));
    if (odds.length === 0 && odds12.length === 0) return null;

    const events: OddsHistory13['events'] = [];
    let prevGoals = 0;
    for (const s of sorted) {
        const goals = s.raw.total_goals_so_far;
        if (!Number.isFinite(goals) || goals <= prevGoals) continue;
        for (let g = prevGoals + 1; g <= goals; g++) {
            events.push({
                minute: s.minute,
                half: (s.half === 2 ? 2 : 1) as 1 | 2,
                type: 'goal',
            });
        }
        prevGoals = goals;
    }

    return {
        matchId: id,
        homeName: basic?.home ?? '',
        awayName: basic?.away ?? '',
        league: '',
        finalScore: basic?.ftStatus ?? '',
        odds,
        odds12,
        odds16: [],
        odds15: [],
        events,
        alerts: [],
        stats: [],
        userNotes: [],
    };
}

/** Đọc full History md (cache) → dữ liệu biểu đồ; fallback dataset jsonl nếu thiếu file md. */
export async function getOddsHistory13(matchId: string): Promise<OddsHistory13 | null> {
    const id = String(matchId);
    const parsed = await getParsedMatch(id);
    if (parsed) return oddsHistoryFromParsed(id, parsed);
    return oddsHistoryFromSamples(id);
}

export function ragStats(): { loaded: boolean; total: number; positives: number } {
    return {
        loaded,
        total: samples.length,
        positives: samples.filter((s) => s.label === 1).length,
    };
}
