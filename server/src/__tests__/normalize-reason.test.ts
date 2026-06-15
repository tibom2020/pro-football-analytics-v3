import { describe, expect, it } from 'vitest';
import {
    buildHeuristicReason,
    containsNonVietnameseScript,
    normalizeReason,
    parseGoalProb30Pct,
    parseLlmReasonPayload,
} from '../goal-predict/reason-normalize.js';
import type { FeatureVector } from '../goal-predict/feature-builder.js';

const sampleFeatures = {
    half: 1,
    minute: 35,
    total_goals_so_far: 1,
    da_total_3m: 3,
    da_h_delta_3m: 2,
    da_a_delta_3m: 1,
    on_target_delta_3m: 1,
    ou13_over_drops_5m_count: 0,
    ou13_under_rises_5m_count: 0,
    ah12_home_drops_5m_count: 2,
    pressure_alert_count_3m: 0,
} as FeatureVector;

const topFeatures = [{ name: 'ah12_handicap', value: -0.5, importance: 0.12 }];

describe('containsNonVietnameseScript', () => {
    it('detects CJK characters', () => {
        expect(containsNonVietnameseScript('Khả năng có bàn 中文')).toBe(true);
        expect(containsNonVietnameseScript('Thế trận đang mở')).toBe(false);
    });
});

describe('buildHeuristicReason', () => {
    it('includes ONNX percent and handicap tilt', () => {
        const text = buildHeuristicReason(0.55, sampleFeatures, topFeatures, null, 30);
        expect(text).toContain('(~55%)');
        expect(text).toContain('kèo chấp nghiêng dần về chủ nhà');
    });
});

describe('parseLlmReasonPayload', () => {
    it('parses truncated DeepSeek JSON', () => {
        const p = parseLlmReasonPayload('{"goalProb30Pct": 75, "reasonVi": "Hiệp 1 còn');
        expect(p.goalProb30Pct).toBe(75);
        expect(p.reasonVi).toContain('Hiệp 1');
    });

    it('parses empty reasonVi with pct', () => {
        const p = parseLlmReasonPayload('{"goalProb30Pct": 74, "reasonVi": ""}');
        expect(p.goalProb30Pct).toBe(74);
        expect(p.reasonVi).toBe('');
    });
});

describe('parseGoalProb30Pct', () => {
    it('parses integer and clamps 0-100', () => {
        expect(parseGoalProb30Pct({ goalProb30Pct: 62 })).toBe(62);
        expect(parseGoalProb30Pct({ goalProb30Pct: 150 })).toBe(100);
        expect(parseGoalProb30Pct({ goalProb30Pct: '48%' })).toBe(48);
        expect(parseGoalProb30Pct({ reasonVi: 'x' })).toBeNull();
    });
});

describe('normalizeReason', () => {
    it('falls back to heuristic when rawError is set', () => {
        const out = normalizeReason(
            '',
            'Ollama: The operation was aborted',
            30017,
            sampleFeatures,
            0.55,
            topFeatures,
            30,
            'Ollama',
            true,
        );
        expect(out.source).toBe('heuristic_fallback');
        expect(out.error).toBe('Ollama: The operation was aborted');
        expect(out.reasonVi).toContain('(~55%)');
        expect(out.goalProb30Pct).toBe(55);
        expect(out.latencyMs).toBe(30017);
    });

    it('falls back when LLM returns non-Vietnamese script', () => {
        const out = normalizeReason(
            JSON.stringify({ reasonVi: '进球概率较高' }),
            undefined,
            1200,
            sampleFeatures,
            0.55,
            topFeatures,
            30,
            'Ollama',
        );
        expect(out.source).toBe('heuristic_fallback');
        expect(out.error).toContain('sai ngôn ngữ');
        expect(out.reasonVi).toContain('(~55%)');
    });

    it('returns llm source for valid Vietnamese JSON', () => {
        const vi = 'Sức ép đang dồn dập, thế trận mở và nhà cái kéo kèo Tài — khả năng có bàn lúc này khá sáng.';
        const out = normalizeReason(
            JSON.stringify({ reasonVi: vi }),
            undefined,
            4500,
            sampleFeatures,
            0.55,
            topFeatures,
            30,
            'Ollama',
        );
        expect(out.source).toBe('llm');
        expect(out.reasonVi).toBe(vi);
        expect(out.error).toBeUndefined();
    });

    it('uses LLM pct when reasonVi empty but goalProb30Pct present', () => {
        const out = normalizeReason(
            JSON.stringify({ goalProb30Pct: 74, reasonVi: '' }),
            undefined,
            7573,
            sampleFeatures,
            0.74,
            topFeatures,
            30,
            'DeepSeek',
            true,
        );
        expect(out.source).toBe('llm');
        expect(out.goalProb30Pct).toBe(74);
        expect(out.reasonVi).toContain('74%');
        expect(out.error).toContain('thiếu reasonVi');
    });

    it('extracts goalProb30Pct from Ollama JSON when expected', () => {
        const vi = 'Thế trận đang mở, nhà cái kéo kèo Tài và phần lớn kịch bản tương tự đã có bàn sau đó.';
        const out = normalizeReason(
            JSON.stringify({ goalProb30Pct: 68, reasonVi: vi }),
            undefined,
            4200,
            sampleFeatures,
            0.55,
            topFeatures,
            30,
            'Ollama',
            true,
        );
        expect(out.source).toBe('llm');
        expect(out.goalProb30Pct).toBe(68);
        expect(out.reasonVi).toBe(vi);
    });
});
