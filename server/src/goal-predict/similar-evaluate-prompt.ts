/**
 * Lớp AI đánh giá "trận tương tự" — build prompt tiếng Việt cho DeepSeek + parse JSON.
 *
 * Triết lý: tỷ lệ `labelHalf` (có bàn từ phút gọi đến hết hiệp) của các trận lịch sử
 * là tín hiệu mạnh nhất. Ta TÍNH tỷ lệ này bằng code (không để LLM tự đếm), đưa vào
 * prompt làm căn cứ chính, và tính lại cho nhóm trận AI chọn để con số hiển thị chính xác.
 */

import type { SimilarMatchFull } from '../routes/similar-matches.js';
import type { CumulativeTotals } from './rag-store.js';
import { wrapDeepSeekSystemPrompt, parseCouncilBlock, type CouncilDeliberation } from './deepseek-council-prompt.js';

/** Tổng hợp định lượng nhãn "có bàn trong 30'" của 1 nhóm trận. */
export interface Label30Stats {
    /** Số trận có label30 != null (mẫu số). */
    total: number;
    /** Số trận label30 === 1. */
    hits: number;
    /** hits / total — 0 khi total === 0. */
    rate: number;
    /** Số trận label30 == null (bị loại khỏi mẫu số). */
    unknown: number;
}

export interface AiTopMatch {
    matchId: string;
    team: string;
    ft?: string;
    ou13LineRuns?: string;
    label30?: 0 | 1;
    /** Có bàn từ phút gọi đến hết hiệp (từ dataset) — để tính lại tỷ lệ nhóm AI chọn. */
    labelHalf?: 0 | 1;
    reasonVi: string;
}

export interface AiSimilarEvaluation {
    topMatches: AiTopMatch[];
    lean: 'over' | 'under' | 'neutral';
    confidence: 'low' | 'medium' | 'high';
    summaryVi: string;
    caveats?: string[];
    /** Tỷ lệ "có bàn 30'" của nhóm trận AI chọn — tính lại bằng code từ topMatches. */
    topMatchesLabel30?: Label30Stats;
    /** Tỷ lệ "có bàn đến hết hiệp" của nhóm trận AI chọn — tính lại bằng code từ topMatches. */
    topMatchesLabelHalf?: Label30Stats;
    /** 5 cố vấn The Council + kết luận tổng hợp (DeepSeek). */
    council?: CouncilDeliberation;
    model?: string;
    durationMs?: number;
}

export type TierKey = 'openLine' | 'catalog' | 'catalogRuns';

const TIER_LABEL: Record<TierKey, string> = {
    openLine: 'Top vạch mở (cosine)',
    catalog: 'Catalog cùng vạch mở 1_3',
    catalogRuns: 'Catalog + pattern thời gian vạch',
};

/** Đếm hits/total/unknown/rate theo 1 hàm lấy nhãn bất kỳ. Hàm thuần — dễ test. */
function aggregateLabel<T>(matches: ReadonlyArray<T>, pick: (m: T) => 0 | 1 | undefined): Label30Stats {
    let hits = 0;
    let total = 0;
    let unknown = 0;
    for (const m of matches) {
        const v = pick(m);
        if (v === 1) {
            hits += 1;
            total += 1;
        } else if (v === 0) {
            total += 1;
        } else {
            unknown += 1;
        }
    }
    return { total, hits, rate: total > 0 ? hits / total : 0, unknown };
}

/** Tỷ lệ "có bàn trong 30'" của 1 nhóm trận. */
export function aggregateLabel30(matches: ReadonlyArray<{ label30?: 0 | 1 }>): Label30Stats {
    return aggregateLabel(matches, (m) => m.label30);
}

/** Tỷ lệ "có bàn từ phút gọi đến hết hiệp" của 1 nhóm trận. */
export function aggregateLabelHalf(matches: ReadonlyArray<{ labelHalf?: 0 | 1 }>): Label30Stats {
    return aggregateLabel(matches, (m) => m.labelHalf);
}

function pctHalf(stats: Label30Stats): string {
    if (stats.total === 0) return 'chưa có nhãn';
    return `${stats.hits}/${stats.total} có bàn đến hết hiệp = ${Math.round(stats.rate * 100)}%`;
}

function team(m: SimilarMatchFull): string {
    return m.home && m.away ? `${m.home} vs ${m.away}` : `Match ${m.matchId}`;
}

function totalsStr(t?: CumulativeTotals | null): string {
    if (!t) return '';
    return ` | tổng DA ${t.da} sút ${t.shots} trúng ${t.onTarget} góc ${t.corners}`;
}

/** 1 dòng candidate rút gọn cho prompt. */
function candidateLine(m: SimilarMatchFull): string {
    const sim = Number.isFinite(m.similarity) ? ` sim ${m.similarity.toFixed(2)}` : '';
    const runs = m.ou13LineRuns ? ` vạch[${m.ou13LineRuns}]` : '';
    const lr = m.lineRunsScore != null ? ` Δ${m.lineRunsScore}p` : '';
    const lbl =
        m.labelHalf === 1 ? ' [hiệp:CÓ BÀN]' : m.labelHalf === 0 ? ' [hiệp:không]' : ' [hiệp:?]';
    return `- #${m.matchId} ${team(m)} FT ${m.finalScore || '—'}${sim}${runs}${lr}${lbl}${totalsStr(m.totals)}`;
}

export interface SimilarEvalInput {
    half: 1 | 2;
    minute: number;
    queryOu13LineRuns?: string;
    openingLines?: { h1OpenOu13?: number; h2OpenOu13?: number; h1OpenAh12?: number; h2OpenAh12?: number };
    currentTotals?: CumulativeTotals | null;
    tiers: Record<TierKey, SimilarMatchFull[]>;
    evaluateContext?: {
        trigger: 'ou_line_change';
        lineChange: { prevHandicap: number; newHandicap: number };
        currentOu13?: number;
        currentAh12?: number;
    };
}

export interface SimilarEvalPrompt {
    system: string;
    user: string;
    label30ByTier: Record<TierKey, Label30Stats>;
    labelHalfByTier: Record<TierKey, Label30Stats>;
}

const MAX_PER_TIER = 12;

/** Build system + user prompt; kèm tỷ lệ label30 đã tính sẵn để trả về luôn cho FE. */
export function buildSimilarEvaluatePrompt(input: SimilarEvalInput): SimilarEvalPrompt {
    const label30ByTier: Record<TierKey, Label30Stats> = {
        openLine: aggregateLabel30(input.tiers.openLine),
        catalog: aggregateLabel30(input.tiers.catalog),
        catalogRuns: aggregateLabel30(input.tiers.catalogRuns),
    };
    const labelHalfByTier: Record<TierKey, Label30Stats> = {
        openLine: aggregateLabelHalf(input.tiers.openLine),
        catalog: aggregateLabelHalf(input.tiers.catalog),
        catalogRuns: aggregateLabelHalf(input.tiers.catalogRuns),
    };

    const isLineChange = input.evaluateContext?.trigger === 'ou_line_change';
    const topMatchesHint = isLineChange
        ? '  // đúng 5 trận đáng đối chiếu nhất'
        : '  // 3-6 trận đáng đối chiếu nhất';

    const taskRules = [
        'Bạn là chuyên gia phân tích kèo Tài/Xỉu (Over/Under) bóng đá, đọc dữ liệu các trận lịch sử tương tự để tư vấn cho trận đang diễn ra.',
        'Nguyên tắc:',
        '1. Chỉ chọn những trận THỰC SỰ đáng đối chiếu (giống về vạch mở 1_3, pattern thời gian giữ vạch, và bối cảnh tấn công/áp lực) — bỏ qua trận chỉ trùng vạch ngẫu nhiên. Ưu tiên nhóm "Catalog + pattern thời gian vạch".',
        '2. Căn cứ chính để nghiêng Tài/Xỉu là TỶ LỆ "có bàn từ phút gọi đến HẾT HIỆP" (labelHalf) của nhóm trận đáng tin: tỷ lệ cao → nghiêng Tài (over); thấp → nghiêng Xỉu (under); quanh 50% → neutral. Số liệu tỷ lệ đã được tính sẵn, dùng đúng các con số đó.',
        "3. TUYỆT ĐỐI KHÔNG bịa ra con số xác suất phần trăm cụ thể của trận đang xem. Không suy đoán số liệu không có trong dữ liệu.",
        '4. Với mỗi trận trong topMatches: reasonVi PHẢI khớp nhãn [hiệp:CÓ BÀN] hoặc [hiệp:không] đã ghi trong danh sách — KHÔNG được mô tả ngược (vd. nhãn CÓ BÀN mà viết "không có bàn đến hết hiệp").',
    ];

    if (isLineChange) {
        taskRules.push(
            '5. ĐÂY LÀ TÌNH HUỐNG ĐỔI LINE 1_3: chọn ĐÚNG 5 trận (topMatches) theo thứ tự ưu tiên:',
            '   a) Vạch mở mỗi hiệp — 1_3 H1/H2 và 1_2 H1/H2 trùng hoặc gần nhất với trận đang xem.',
            '   b) Thời điểm gọi — cùng hiệp và phút tương đương (± vài phút) tại thời điểm line vừa đổi.',
            '   c) Vạch tại thời điểm — 1_3 và 1_2 hiện tại gần với trận đang xem.',
            '   d) Ưu tiên nhóm "Catalog + pattern thời gian vạch" khi line vừa chuyển.',
            '   Mỗi reasonVi phải nêu rõ so khớp vạch mở 1_3/1_2 và vạch tại phút gọi.',
        );
    }

    const jsonSchemaLines = [
        `  "topMatches": [ { "matchId": string, "team": string, "ft": string, "ou13LineRuns": string, "labelHalf": 0|1, "reasonVi": string } ],${topMatchesHint}`,
        '  "lean": "over" | "under" | "neutral",',
        '  "confidence": "low" | "medium" | "high",',
        '  "summaryVi": string,   // = council.finalConclusion (2-4 câu)',
        '  "caveats": [ string ]  // cảnh báo, mẫu nhỏ, dữ liệu thiếu...',
    ];

    const system = wrapDeepSeekSystemPrompt(
        taskRules.join('\n'),
        jsonSchemaLines,
        'summaryVi PHẢI trùng nội dung council.finalConclusion. Mọi văn bản bằng tiếng Việt ngắn gọn.',
    );

    const ol = input.openingLines;
    const lines: string[] = [];
    lines.push(`TRẬN ĐANG XEM: hiệp ${input.half}, phút ${input.minute}.`);
    if (ol) {
        const parts: string[] = [];
        if (Number.isFinite(ol.h1OpenOu13)) parts.push(`vạch mở 1_3 H1=${ol.h1OpenOu13}`);
        if (Number.isFinite(ol.h2OpenOu13)) parts.push(`H2=${ol.h2OpenOu13}`);
        if (Number.isFinite(ol.h1OpenAh12)) parts.push(`chấp H1=${ol.h1OpenAh12}`);
        if (Number.isFinite(ol.h2OpenAh12)) parts.push(`chấp H2=${ol.h2OpenAh12}`);
        if (parts.length) lines.push(`Vạch mở: ${parts.join(', ')}.`);
    }
    if (input.queryOu13LineRuns) lines.push(`Pattern vạch 1_3 hiện tại: ${input.queryOu13LineRuns}.`);
    if (input.currentTotals) lines.push(`Tổng hiện tại:${totalsStr(input.currentTotals)}.`);

    const ev = input.evaluateContext;
    if (ev?.trigger === 'ou_line_change') {
        lines.push('');
        lines.push('SỰ KIỆN KÍCH HOẠT: line Tài/Xỉu (1_3) vừa đổi.');
        lines.push(
            `  ${ev.lineChange.prevHandicap} → ${ev.lineChange.newHandicap} tại hiệp ${input.half}, phút ${input.minute}.`,
        );
        const curParts: string[] = [];
        if (Number.isFinite(ev.currentOu13)) curParts.push(`1_3 hiện tại=${ev.currentOu13}`);
        if (Number.isFinite(ev.currentAh12)) curParts.push(`1_2 hiện tại=${ev.currentAh12}`);
        if (curParts.length) lines.push(`Vạch tại thời điểm gọi: ${curParts.join(', ')}.`);
        lines.push('Yêu cầu: chọn ĐÚNG 5 trận topMatches — ưu tiên khớp vạch mở + vạch tại phút + pattern giữ vạch (cả 1_3 và 1_2).');
    }

    lines.push('');
    lines.push('TỶ LỆ "có bàn từ phút gọi đến HẾT HIỆP" (labelHalf) ĐÃ TÍNH SẴN theo từng nhóm (dùng đúng con số này):');
    (Object.keys(labelHalfByTier) as TierKey[]).forEach((k) => {
        lines.push(`- ${TIER_LABEL[k]}: ${pctHalf(labelHalfByTier[k])}`);
    });

    lines.push('');
    lines.push('DANH SÁCH TRẬN TƯƠNG TỰ (rút gọn, tối đa 12 mỗi nhóm):');
    (Object.keys(input.tiers) as TierKey[]).forEach((k) => {
        const list = input.tiers[k].slice(0, MAX_PER_TIER);
        if (!list.length) return;
        lines.push(`\n[${TIER_LABEL[k]}]`);
        list.forEach((m) => lines.push(candidateLine(m)));
    });

    lines.push('');
    lines.push(
        isLineChange
            ? 'Hãy chọn ĐÚNG 5 topMatches từ các #matchId ở trên và trả JSON theo schema. Mỗi reasonVi phải nhất quán với nhãn [hiệp:...] và nêu so khớp 1_3/1_2.'
            : 'Hãy chọn topMatches từ các #matchId ở trên và trả JSON theo schema. Mỗi reasonVi phải nhất quán với nhãn [hiệp:...] của trận đó.',
    );

    return { system, user: lines.join('\n'), label30ByTier, labelHalfByTier };
}

function toLean(v: unknown): AiSimilarEvaluation['lean'] {
    return v === 'over' || v === 'under' ? v : 'neutral';
}

function toConfidence(v: unknown): AiSimilarEvaluation['confidence'] {
    return v === 'high' || v === 'medium' ? v : 'low';
}

function toLabel30(v: unknown): 0 | 1 | undefined {
    if (v === 1 || v === '1') return 1;
    if (v === 0 || v === '0') return 0;
    return undefined;
}

function normalizeMatchId(raw: unknown): string {
    return String(raw ?? '')
        .trim()
        .replace(/^#/, '');
}

/** Bỏ fence markdown + thinking tags (DeepSeek V4). */
function stripLlmWrappers(raw: string): string {
    let t = raw.trim();
    t = t.replace(/[\s\S]*?<\/think>/gi, '').trim();
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
    if (fence) t = fence[1].trim();
    return t
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/\u00A0/g, ' ')
        .trim();
}

/** Trích object JSON đầu tiên — chịu được text thừa trước/sau JSON. */
function extractJsonObject(raw: string): Record<string, unknown> | null {
    const t = stripLlmWrappers(raw);
    if (!t) return null;
    try {
        const parsed = JSON.parse(t) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        // thử cắt khối {...} cân bằng
    }
    const start = t.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let end = -1;
    for (let i = start; i < t.length; i++) {
        const ch = t[i];
        if (ch === '{') depth++;
        if (ch === '}') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end < 0) return regexFallbackObject(t);
    try {
        const parsed = JSON.parse(t.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return regexFallbackObject(t);
    }
    return null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

function pickArray(obj: Record<string, unknown>, keys: string[]): unknown[] {
    for (const k of keys) {
        const v = obj[k];
        if (Array.isArray(v)) return v;
    }
    return [];
}

/** Một số model bọc JSON trong key evaluation/result. */
function unwrapEvalRoot(obj: Record<string, unknown>): Record<string, unknown> {
    for (const k of ['evaluation', 'result', 'data', 'analysis']) {
        const v = obj[k];
        if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
        const inner = v as Record<string, unknown>;
        if (
            pickArray(inner, ['topMatches', 'top_matches', 'matches']).length > 0 ||
            pickString(inner, ['summaryVi', 'summary_vi', 'summary'])
        ) {
            return inner;
        }
    }
    return obj;
}

/** Khi JSON bị cắt giữa chừng — cố gắng lấy lean/summary tối thiểu. */
function regexFallbackObject(raw: string): Record<string, unknown> | null {
    const lean = raw.match(/"lean"\s*:\s*"(over|under|neutral)"/i)?.[1]?.toLowerCase();
    const confidence = raw.match(/"confidence"\s*:\s*"(low|medium|high)"/i)?.[1]?.toLowerCase();
    const summary =
        raw.match(/"summaryVi"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"').trim() ||
        raw.match(/"summaryVi"\s*:\s*"([^"]+)/)?.[1]?.trim() ||
        raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"').trim() ||
        raw.match(/"summary"\s*:\s*"([^"]+)/)?.[1]?.trim() ||
        '';
    if (!lean && !summary) return null;
    return {
        topMatches: [],
        lean: lean ?? 'neutral',
        confidence: confidence ?? 'low',
        summaryVi: summary,
    };
}

/** reasonVi AI mô tả ngược nhãn labelHalf thật (từ dataset). */
function reasonContradictsLabelHalf(reason: string, labelHalf?: 0 | 1): boolean {
    if (labelHalf == null || !reason.trim()) return false;
    const noGoal = /không\s*(có\s*)?bàn|không\s*bàn\s*(đến\s*)?hết\s*hiệp|0\s*bàn/i;
    const hasGoal = /có\s*bàn|bàn\s*(đến\s*)?hết\s*hiệp|bàn\s*trước\s*hết\s*hiệp/i;
    if (labelHalf === 1 && noGoal.test(reason)) return true;
    if (labelHalf === 0 && hasGoal.test(reason)) return true;
    return false;
}

/** Lý do ngắn bám đúng dữ liệu khi AI viết sai / mâu thuẫn nhãn đến hết hiệp. */
function factualReasonVi(m: AiTopMatch): string {
    const bits: string[] = [];
    if (m.ou13LineRuns) bits.push(`pattern vạch ${m.ou13LineRuns}`);
    else bits.push('cùng nhóm vạch/catalog');
    if (m.labelHalf === 1) bits.push('có bàn đến hết hiệp');
    else if (m.labelHalf === 0) bits.push('không có bàn đến hết hiệp');
    else bits.push('chưa rõ nhãn đến hết hiệp');
    if (m.ft) bits.push(`FT ${m.ft}`);
    return `${bits.join(', ')}.`;
}

function sanitizeTopMatchReason(m: AiTopMatch): AiTopMatch {
    const reasonVi = m.reasonVi.trim();
    if (!reasonVi || reasonContradictsLabelHalf(reasonVi, m.labelHalf)) {
        return { ...m, reasonVi: factualReasonVi(m) };
    }
    return { ...m, reasonVi };
}

/**
 * Parse text JSON DeepSeek → AiSimilarEvaluation. Trả null nếu không parse được /
 * không đủ trường tối thiểu. `allMatches` để tính lại label30 chính xác từ matchId.
 */
export function parseAiSimilarEvaluation(
    text: string,
    allMatches: ReadonlyArray<SimilarMatchFull>,
    opts?: { model?: string; durationMs?: number },
): AiSimilarEvaluation | null {
    const obj0 = extractJsonObject(text);
    if (!obj0) return null;
    const obj = unwrapEvalRoot(obj0);

    const byId = new Map(allMatches.map((m) => [String(m.matchId), m]));
    const rawTop = pickArray(obj, ['topMatches', 'top_matches', 'matches', 'selectedMatches']);
    const topMatches: AiTopMatch[] = [];
    for (const raw of rawTop) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as Record<string, unknown>;
        const matchId = normalizeMatchId(r.matchId ?? r.match_id ?? r.id);
        if (!matchId) continue;
        const known = byId.get(matchId);
        const entry: AiTopMatch = {
            matchId,
            team:
                pickString(r, ['team', 'teams', 'match']) ||
                (known?.home && known?.away ? `${known.home} vs ${known.away}` : `Match ${matchId}`),
            ft: pickString(r, ['ft', 'finalScore', 'score']) || known?.finalScore || undefined,
            ou13LineRuns:
                pickString(r, ['ou13LineRuns', 'ou13_line_runs', 'lineRuns']) || known?.ou13LineRuns || undefined,
            label30: known?.label30 ?? toLabel30(r.label30 ?? r.label_30),
            labelHalf: known?.labelHalf ?? toLabel30(r.labelHalf ?? r.label_half),
            reasonVi: pickString(r, ['reasonVi', 'reason_vi', 'reason', 'lyDo', 'ly_do']),
        };
        // Luôn ưu tiên pattern vạch từ dữ liệu RAG — AI hay copy nhầm cùng 1 chuỗi cho mọi trận.
        if (known?.ou13LineRuns) entry.ou13LineRuns = known.ou13LineRuns;
        topMatches.push(sanitizeTopMatchReason(entry));
    }

    const summaryVi = pickString(obj, ['summaryVi', 'summary_vi', 'summary', 'ketLuan', 'ket_luan', 'analysis']);
    const council = parseCouncilBlock(obj);
    const lean = toLean(obj.lean ?? obj.bias ?? obj.recommendation);
    if (topMatches.length === 0 && !summaryVi) {
        // Chấp nhận khi có lean rõ (over/under) dù thiếu summary — JSON có thể bị cắt.
        if (lean === 'neutral') return null;
    }

    const caveatsRaw = pickArray(obj, ['caveats', 'warnings', 'canhBao', 'canh_bao']);
    const caveats = caveatsRaw.map((c) => String(c).trim()).filter(Boolean);

    const topMatchesLabel30 = aggregateLabel30(topMatches);
    const topMatchesLabelHalf = aggregateLabelHalf(topMatches);

    return {
        topMatches,
        lean,
        confidence: toConfidence(obj.confidence ?? obj.conf),
        summaryVi:
            summaryVi ||
            council?.finalConclusion ||
            (lean === 'over'
                ? 'Nghiêng Tài theo nhóm trận tương tự.'
                : lean === 'under'
                  ? 'Nghiêng Xỉu theo nhóm trận tương tự.'
                  : ''),
        caveats: caveats.length ? caveats : undefined,
        topMatchesLabel30,
        topMatchesLabelHalf,
        council,
        model: opts?.model,
        durationMs: opts?.durationMs,
    };
}
