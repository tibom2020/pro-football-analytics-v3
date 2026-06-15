/**
 * Heuristic reason + chuẩn hoá output LLM (Ollama/GPT/DeepSeek) cho /predict-goal/reason.
 */

import { GOAL_WINDOW_MIN, type FeatureVector } from './feature-builder.js';
import { GOAL_WINDOW_MIN_LONG } from './onnx-service.js';
import { logger } from '../logger.js';

export type ReasonSource = 'llm' | 'heuristic_fallback';

export interface NormalizedReasonOutput {
    reasonVi: string;
    latencyMs: number;
    error?: string;
    source: ReasonSource;
    /** Xác suất % có bàn trong 30' tới — từ LLM (Ollama) hoặc ONNX khi fallback. */
    goalProb30Pct?: number | null;
}

function extractReasonViString(parsed: Record<string, unknown>): string {
    for (const key of ['reasonVi', 'reason_vi', 'reason', 'analysis', 'comment']) {
        const v = parsed[key];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

export interface ParsedLlmReasonPayload {
    reasonVi: string;
    goalProb30Pct: number | null;
    parsedJson: unknown;
}

/** Parse JSON LLM — kể cả JSON bị cắt giữa chừng (DeepSeek json mode). */
export function parseLlmReasonPayload(rawText: string): ParsedLlmReasonPayload {
    const trimmed = rawText.trim();
    if (!trimmed) return { reasonVi: '', goalProb30Pct: null, parsedJson: null };

    try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        return {
            reasonVi: extractReasonViString(parsed),
            goalProb30Pct: parseGoalProb30Pct(parsed),
            parsedJson: parsed,
        };
    } catch {
        const pctMatch = trimmed.match(/"goalProb30Pct"\s*:\s*(\d+)/);
        const pctRaw = pctMatch ? parseInt(pctMatch[1], 10) : NaN;
        const pct =
            Number.isFinite(pctRaw) ? Math.min(100, Math.max(0, pctRaw)) : null;
        const reasonMatch = trimmed.match(/"reasonVi"\s*:\s*"((?:[^"\\]|\\.)*)/);
        const reasonVi = reasonMatch ? reasonMatch[1].replace(/\\"/g, '"').trim() : '';
        return { reasonVi, goalProb30Pct: pct, parsedJson: null };
    }
}

/** Parse goalProb30Pct từ JSON LLM; null nếu thiếu hoặc không hợp lệ. */
export function parseGoalProb30Pct(raw: unknown): number | null {
    if (raw == null || typeof raw !== 'object') return null;
    const v = (raw as { goalProb30Pct?: unknown }).goalProb30Pct;
    if (typeof v === 'number' && Number.isFinite(v)) {
        return Math.min(100, Math.max(0, Math.round(v)));
    }
    if (typeof v === 'string') {
        const n = parseInt(v.replace(/%/g, '').trim(), 10);
        if (Number.isFinite(n)) return Math.min(100, Math.max(0, n));
    }
    return null;
}

/** Phát hiện ký tự CJK (Trung/Nhật/Hàn) hoặc Cyrillic/Ả Rập — nghĩa là LLM trả sai ngôn ngữ. */
export function containsNonVietnameseScript(text: string): boolean {
    return /[　-〿぀-ゟ゠-ヿ㐀-䶿一-鿿가-힯Ѐ-ӿ؀-ۿ]/.test(text);
}

export function buildHeuristicReason(
    prob: number,
    features: FeatureVector | null,
    _top: Array<{ name: string; value: number; importance: number }>,
    _prob5: number | null = null,
    windowMin: number = GOAL_WINDOW_MIN,
): string {
    if (!features) return '';
    const pct = Math.round(prob * 100);
    const muc = pct >= 70 ? 'cao' : pct >= 50 ? 'trung bình' : 'thấp';
    const bits: string[] = [`Khả năng có bàn trong ${windowMin}' tới đang ở mức ${muc} (~${pct}%)`];
    if (features.da_total_3m >= 8) bits.push(`bóng nguy hiểm dồn dập (+${features.da_total_3m} trong 3 phút)`);
    if (features.on_target_delta_3m >= 2) bits.push(`có ${features.on_target_delta_3m} cú dứt điểm trúng đích gần đây`);
    if (features.ou13_over_drops_5m_count >= 2) bits.push(`nhà cái kéo kèo Tài ${features.ou13_over_drops_5m_count} lần`);
    else if (features.ou13_under_rises_5m_count >= 2) bits.push(`kèo Xỉu bị đẩy lên ${features.ou13_under_rises_5m_count} lần`);
    if (features.ah12_home_drops_5m_count >= 2) bits.push(`kèo chấp nghiêng dần về chủ nhà`);
    if (features.pressure_alert_count_3m > 0) bits.push(`sức ép đang gia tăng`);
    return bits.join(', ') + '.';
}

function heuristicFallback(
    goalProb: number,
    features: FeatureVector | null,
    top: Array<{ name: string; value: number; importance: number }>,
    windowMin: number,
    durationMs: number,
    error: string,
    rawText: string,
    provider: string,
    expectGoalProb30Pct: boolean,
): NormalizedReasonOutput {
    logger.warn(
        `[predict-goal/reason] ${provider} fallback heuristic: ${error} raw=${rawText.slice(0, 80)}`,
    );
    return {
        reasonVi: buildHeuristicReason(goalProb, features, top, null, windowMin),
        latencyMs: durationMs,
        error,
        source: 'heuristic_fallback',
        goalProb30Pct: expectGoalProb30Pct ? Math.round(goalProb * 100) : undefined,
    };
}

/** Parse LLM JSON output, fallback heuristic nếu sai ngôn ngữ / parse fail / lỗi gọi. */
export function normalizeReason(
    rawText: string,
    rawError: string | undefined,
    durationMs: number,
    features: FeatureVector | null,
    goalProb: number,
    top: Array<{ name: string; value: number; importance: number }>,
    windowMin: number = GOAL_WINDOW_MIN,
    provider = 'LLM',
    expectGoalProb30Pct = false,
): NormalizedReasonOutput {
    if (rawError) {
        return heuristicFallback(
            goalProb,
            features,
            top,
            windowMin,
            durationMs,
            rawError,
            rawText,
            provider,
            expectGoalProb30Pct,
        );
    }
    const { reasonVi: parsedReason, goalProb30Pct: llmPct, parsedJson } = parseLlmReasonPayload(rawText);
    let reasonVi = parsedReason;
    // JSON hợp lệ nhưng không có reasonVi — không gán nguyên raw JSON làm lời bình.
    if (!reasonVi.trim() && rawText.trim().startsWith('{') && parsedJson == null) {
        reasonVi = '';
    } else if (!reasonVi.trim() && !rawText.trim().startsWith('{')) {
        reasonVi = rawText.trim();
    }
    if (containsNonVietnameseScript(reasonVi)) {
        return heuristicFallback(
            goalProb,
            features,
            top,
            windowMin,
            durationMs,
            'LLM trả sai ngôn ngữ (không phải tiếng Việt) — dùng heuristic.',
            rawText,
            provider,
            expectGoalProb30Pct,
        );
    }
    if (!reasonVi.trim()) {
        if (expectGoalProb30Pct && llmPct != null) {
            logger.warn(
                `[predict-goal/reason] ${provider} có goalProb30Pct=${llmPct} nhưng thiếu reasonVi raw=${rawText.slice(0, 80)}`,
            );
            return {
                reasonVi: `Theo đánh giá LLM, khả năng có bàn trong ${windowMin}' tới khoảng ${llmPct}%.`,
                latencyMs: durationMs,
                source: 'llm',
                goalProb30Pct: llmPct,
                error: 'LLM thiếu reasonVi — hiển thị tóm tắt từ % LLM.',
            };
        }
        const emptyDetail = rawText.trim()
            ? ` (raw: ${rawText.slice(0, 80)}${rawText.length > 80 ? '…' : ''})`
            : '';
        return heuristicFallback(
            goalProb,
            features,
            top,
            windowMin,
            durationMs,
            `LLM trả về rỗng${emptyDetail} — dùng heuristic.`,
            rawText,
            provider,
            expectGoalProb30Pct,
        );
    }
    const goalProb30Pct = expectGoalProb30Pct
        ? (llmPct ?? parseGoalProb30Pct(parsedJson))
        : undefined;
    if (expectGoalProb30Pct && goalProb30Pct == null) {
        logger.warn(
            `[predict-goal/reason] ${provider} thiếu goalProb30Pct hợp lệ raw=${rawText.slice(0, 80)}`,
        );
    }
    return {
        reasonVi,
        latencyMs: durationMs,
        source: 'llm',
        goalProb30Pct: expectGoalProb30Pct ? goalProb30Pct : undefined,
    };
}

export { GOAL_WINDOW_MIN_LONG };
