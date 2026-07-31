import { describe, it, expect } from 'vitest';
import {
    aggregateLabel30,
    aggregateLabelHalf,
    buildSimilarEvaluatePrompt,
    parseAiSimilarEvaluation,
} from '../goal-predict/similar-evaluate-prompt.js';
import type { SimilarMatchFull } from '../routes/similar-matches.js';

function m(matchId: string, label30: 0 | 1 | undefined, extra: Partial<SimilarMatchFull> = {}): SimilarMatchFull {
    return {
        matchId,
        half: 2,
        minute: 60,
        label: label30 === 1 ? 1 : 0,
        label30,
        similarity: 0.9,
        home: `H${matchId}`,
        away: `A${matchId}`,
        finalScore: '2-1',
        ...extra,
    } as SimilarMatchFull;
}

describe('aggregateLabel30', () => {
    it('đếm đúng hits/total/unknown/rate', () => {
        const stats = aggregateLabel30([
            { label30: 1 },
            { label30: 1 },
            { label30: 0 },
            { label30: undefined },
        ]);
        expect(stats.hits).toBe(2);
        expect(stats.total).toBe(3); // 2 + 1, undefined không vào mẫu số
        expect(stats.unknown).toBe(1);
        expect(stats.rate).toBeCloseTo(2 / 3);
    });

    it('rate = 0 khi không có nhãn', () => {
        const stats = aggregateLabel30([{ label30: undefined }, { label30: undefined }]);
        expect(stats.total).toBe(0);
        expect(stats.rate).toBe(0);
        expect(stats.unknown).toBe(2);
    });
});

describe('aggregateLabelHalf', () => {
    it('đếm theo nhãn labelHalf (độc lập với label30)', () => {
        const stats = aggregateLabelHalf([
            { labelHalf: 1 },
            { labelHalf: 0 },
            { labelHalf: 0 },
            { labelHalf: undefined },
        ]);
        expect(stats.hits).toBe(1);
        expect(stats.total).toBe(3);
        expect(stats.unknown).toBe(1);
        expect(stats.rate).toBeCloseTo(1 / 3);
    });
});

describe('buildSimilarEvaluatePrompt', () => {
    it('tính labelHalfByTier cho từng tầng và liệt kê candidate', () => {
        const { user, system, labelHalfByTier } = buildSimilarEvaluatePrompt({
            half: 2,
            minute: 60,
            tiers: {
                openLine: [m('1', 1, { labelHalf: 1 }), m('2', 0, { labelHalf: 0 })],
                catalog: [m('3', 1, { labelHalf: 0 })],
                catalogRuns: [m('4', 1, { labelHalf: 1 }), m('5', 1, { labelHalf: 1 }), m('6', undefined)],
            },
        });
        expect(labelHalfByTier.openLine).toMatchObject({ hits: 1, total: 2 });
        expect(labelHalfByTier.catalog).toMatchObject({ hits: 0, total: 1 });
        expect(labelHalfByTier.catalogRuns).toMatchObject({ hits: 2, total: 2, unknown: 1 });
        expect(user).toContain('#1');
        expect(user).toContain('#6');
        expect(user).toContain('đến hết hiệp');
        expect(user).toContain('[hiệp:CÓ BÀN]');
        expect(user).not.toContain('label30');
        expect(user).not.toContain('[30p:');
        expect(system).toContain('labelHalf');
        expect(system).not.toContain('label30');
    });

    it('line-change context yêu cầu top 5 và nêu vạch hiện tại', () => {
        const { system, user } = buildSimilarEvaluatePrompt({
            half: 2,
            minute: 52,
            openingLines: { h1OpenOu13: 2.5, h2OpenOu13: 3, h1OpenAh12: -0.25, h2OpenAh12: 0 },
            tiers: { openLine: [], catalog: [], catalogRuns: [m('7', 1)] },
            evaluateContext: {
                trigger: 'ou_line_change',
                lineChange: { prevHandicap: 3, newHandicap: 2.75 },
                currentOu13: 2.75,
                currentAh12: 0,
            },
        });
        expect(system).toContain('The Council');
        expect(system).toContain('ĐÚNG 5');
        expect(user).toContain('SỰ KIỆN KÍCH HOẠT');
        expect(user).toContain('3 → 2.75');
        expect(user).toContain('1_3 hiện tại=2.75');
        expect(user).toContain('1_2 hiện tại=0');
    });
});

describe('parseAiSimilarEvaluation', () => {
    const all = [m('1', 1), m('2', 0), m('3', 1)];

    it('parse JSON hợp lệ và tính lại label30 từ dữ liệu thật', () => {
        const text = JSON.stringify({
            topMatches: [
                { matchId: '1', team: 'X', reasonVi: 'giống vạch', label30: 0 /* sai cố ý */ },
                { matchId: '3', reasonVi: 'pattern khớp' },
            ],
            lean: 'over',
            confidence: 'high',
            summaryVi: 'Nghiêng Tài',
            caveats: ['mẫu nhỏ'],
        });
        const ev = parseAiSimilarEvaluation(text, all, { model: 'deepseek-x', durationMs: 12 });
        expect(ev).not.toBeNull();
        expect(ev!.lean).toBe('over');
        expect(ev!.confidence).toBe('high');
        expect(ev!.topMatches).toHaveLength(2);
        // label30 lấy từ dữ liệu thật (#1 -> 1), bỏ qua giá trị AI tự điền (0)
        expect(ev!.topMatches[0].label30).toBe(1);
        expect(ev!.topMatchesLabel30).toMatchObject({ hits: 2, total: 2 });
        expect(ev!.model).toBe('deepseek-x');
    });

    it('chấp nhận JSON bọc trong ```json fence', () => {
        const text = '```json\n{"topMatches":[],"lean":"under","confidence":"low","summaryVi":"Xỉu"}\n```';
        const ev = parseAiSimilarEvaluation(text, all);
        expect(ev).not.toBeNull();
        expect(ev!.lean).toBe('under');
    });

    it('lean/confidence lạ → fallback neutral/low', () => {
        const text = JSON.stringify({ topMatches: [], lean: 'xyz', confidence: 'huge', summaryVi: 'abc' });
        const ev = parseAiSimilarEvaluation(text, all);
        expect(ev!.lean).toBe('neutral');
        expect(ev!.confidence).toBe('low');
    });

    it('text không phải JSON → null', () => {
        expect(parseAiSimilarEvaluation('không phải json', all)).toBeNull();
    });

    it('rỗng (không topMatches, không summary) → null', () => {
        const text = JSON.stringify({ topMatches: [], summaryVi: '' });
        expect(parseAiSimilarEvaluation(text, all)).toBeNull();
    });

    it('chấp nhận top_matches + summary thay vì summaryVi', () => {
        const text = JSON.stringify({
            top_matches: [{ match_id: '#1', reason_vi: 'ok' }],
            lean: 'under',
            confidence: 'medium',
            summary: 'Nghiêng Xỉu',
        });
        const ev = parseAiSimilarEvaluation(text, all);
        expect(ev!.lean).toBe('under');
        expect(ev!.summaryVi).toBe('Nghiêng Xỉu');
        expect(ev!.topMatches[0].matchId).toBe('1');
    });

    it('trích JSON khi có text thừa trước/sau', () => {
        const inner = JSON.stringify({
            topMatches: [],
            lean: 'neutral',
            confidence: 'low',
            summaryVi: 'Không đủ mẫu',
        });
        const text = `Phân tích:\n${inner}\nHết.`;
        const ev = parseAiSimilarEvaluation(text, all);
        expect(ev!.summaryVi).toBe('Không đủ mẫu');
    });

    it('JSON bị cắt — regex fallback lấy lean + summaryVi', () => {
        const text = '{"topMatches":[{"matchId":"1","reasonVi":"x"}, {"lean":"over","confidence":"high","summaryVi":"Nghiêng Tài do tỷ lệ cao';
        const ev = parseAiSimilarEvaluation(text, all);
        expect(ev).not.toBeNull();
        expect(ev!.lean).toBe('over');
        expect(ev!.summaryVi).toContain('Nghiêng Tài');
    });

    it('sửa reasonVi khi AI mô tả ngược nhãn labelHalf', () => {
        const text = JSON.stringify({
            topMatches: [{ matchId: '9', reasonVi: 'Tương tự vạch mở nhưng không có bàn đến hết hiệp.' }],
            lean: 'over',
            confidence: 'medium',
            summaryVi: 'Nghiêng Tài',
        });
        const all = [m('9', 1, { labelHalf: 1, ou13LineRuns: '2×10p · 1.75×20p' })];
        const ev = parseAiSimilarEvaluation(text, all);
        expect(ev!.topMatches[0].reasonVi).toMatch(/có bàn đến hết hiệp/);
        expect(ev!.topMatches[0].reasonVi).not.toMatch(/không có bàn/);
        expect(ev!.topMatches[0].ou13LineRuns).toBe('2×10p · 1.75×20p');
    });
});
