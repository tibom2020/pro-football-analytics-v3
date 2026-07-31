import { describe, it, expect } from 'vitest';
import {
    buildPinnedAnalyzePrompt,
    computePinnedQuantitative,
    labelHalfFromGoalEvents,
    parseAiPinnedAnalysis,
    totalGoalsAtMinute,
} from '../goal-predict/pinned-analyze-prompt.js';

describe('totalGoalsAtMinute', () => {
    it('0 bàn khi không có sự kiện và không fallback', () => {
        expect(totalGoalsAtMinute([], 1, 34, '2-1')).toBe('0 bàn');
    });

    it('fallback từ tỷ số live khi không có marker bàn (trận đang xem)', () => {
        expect(totalGoalsAtMinute([], 2, 53, '0-1', { fallbackFromScore: true })).toBe('1 bàn');
        expect(totalGoalsAtMinute([], 2, 53, '1-0', { fallbackFromScore: true })).toBe('1 bàn');
    });

    it('không fallback FT cho trận ghim (mặc định)', () => {
        expect(totalGoalsAtMinute([], 2, 53, '0-2')).toBe('0 bàn');
    });

    it('đếm bàn từ sự kiện trước mốc', () => {
        const events = [
            { minute: 17, half: 1 as const, type: 'goal' },
            { minute: 53, half: 2 as const, type: 'goal' },
            { minute: 61, half: 2 as const, type: 'goal' },
        ];
        expect(totalGoalsAtMinute(events, 1, 34, '2-1')).toBe('1 bàn');
        expect(totalGoalsAtMinute(events, 2, 53, '2-1')).toBe('2 bàn');
        expect(totalGoalsAtMinute(events, 2, 52, '2-1')).toBe('1 bàn');
    });
});

describe('computePinnedQuantitative', () => {
    it('khớp pattern line khi cùng vạch và thời gian', () => {
        const odds = [
            { minute: 46, half: 2 as const, handicap: 2.5 },
            { minute: 51, half: 2 as const, handicap: 2.25 },
            { minute: 60, half: 2 as const, handicap: 2.0 },
        ];
        const q = computePinnedQuantitative(
            odds,
            odds,
            2,
            60,
            { h2OpenOu13: 2.5 },
            { h2OpenOu13: 2.5 },
            { da: 10, shots: 5, onTarget: 2, corners: 3 },
            { da: 12, shots: 6, onTarget: 3, corners: 4 },
            0.87,
        );
        expect(q.openLineMatch).toBe(true);
        expect(q.lineRunsMatch).toBe(true);
        expect(q.lineRunsScore).toBe(0);
        expect(q.statDelta).toEqual({ da: 2, shots: 1, onTarget: 1, corners: 1 });
        expect(q.ragSimilarity).toBe(0.87);
    });
});

describe('labelHalfFromGoalEvents', () => {
    it('có bàn sau phút gọi trong cùng hiệp', () => {
        const events = [
            { minute: 55, half: 2 as const, type: 'goal' },
            { minute: 70, half: 2 as const, type: 'goal' },
        ];
        expect(labelHalfFromGoalEvents(events, 2, 60)).toBe(1);
        expect(labelHalfFromGoalEvents(events, 2, 70)).toBe(0);
    });

    it('undefined khi không có sự kiện', () => {
        expect(labelHalfFromGoalEvents([], 1, 30)).toBeUndefined();
    });
});

describe('buildPinnedAnalyzePrompt', () => {
    it('gồm cả hai trận và số liệu định lượng', () => {
        const quantitative = {
            openLineMatch: true,
            lineRunsMatch: true,
            lineRunsScore: 0,
            sourceLineRuns: '2.5×5p',
            pinnedLineRuns: '2.5×5p',
        };
        const { user, system } = buildPinnedAnalyzePrompt({
            source: {
                matchId: '111',
                team: 'A vs B',
                half: 2,
                minute: 60,
                openingLines: { h2OpenOu13: 2.5 },
                totals: { da: 10, shots: 5, onTarget: 2, corners: 3 },
            },
            pinned: {
                matchId: '222',
                team: 'C vs D',
                half: 2,
                minute: 60,
                labelHalf: 1,
                similarity: 0.9,
                openingLines: { h2OpenOu13: 2.5 },
                totals: { da: 12, shots: 6, onTarget: 3, corners: 4 },
            },
            quantitative,
        });
        expect(system).toContain('similarityScore');
        expect(user).toContain('TRẬN ĐANG XEM');
        expect(user).toContain('TRẬN GHIM');
        expect(user).toContain('Vạch mở 1_3 cùng hiệp trùng: CÓ');
        expect(user).toContain('đến hết hiệp: CÓ BÀN');
        expect(system).toContain('labelHalf');
    });
});

describe('parseAiPinnedAnalysis', () => {
    const q = { openLineMatch: true, lineRunsScore: 1 };

    it('parse JSON hợp lệ', () => {
        const raw = JSON.stringify({
            similarityScore: 82,
            similarityLevel: 'high',
            dimensions: [
                { key: 'odds_open', score: 95, summaryVi: 'Cùng vạch mở H2 2.5' },
                { key: 'pressure', score: 70, summaryVi: 'Áp lực tương đương' },
            ],
            highlightsVi: ['Cùng pattern line', 'DA gần nhau'],
            differencesVi: ['Góc chênh 1'],
            conclusionVi: 'Hai tình huống rất giống nhau về kèo và áp lực.',
        });
        const r = parseAiPinnedAnalysis(raw, q, { model: 'test', durationMs: 100 });
        expect(r).not.toBeNull();
        expect(r!.similarityScore).toBe(82);
        expect(r!.similarityLevel).toBe('high');
        expect(r!.dimensions).toHaveLength(2);
        expect(r!.highlightsVi).toHaveLength(2);
        expect(r!.conclusionVi).toContain('rất giống');
        expect(r!.quantitative).toBe(q);
    });

    it('trả null khi thiếu conclusionVi', () => {
        const raw = JSON.stringify({ similarityScore: 50, dimensions: [] });
        expect(parseAiPinnedAnalysis(raw, q)).toBeNull();
    });
});
