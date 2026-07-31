import { describe, it, expect } from 'vitest';
import {
    buildOu13LineRuns,
    formatOu13LineRuns,
    ou13LineRunsSimilar,
    type Ou13OddsPoint,
} from '../goal-predict/ou13-line-runs.js';

describe('buildOu13LineRuns', () => {
    it('tách các đoạn vạch trong hiệp 2', () => {
        const odds: Ou13OddsPoint[] = [
            { minute: 46, half: 2, handicap: 2.25 },
            { minute: 52, half: 2, handicap: 2 },
            { minute: 58, half: 2, handicap: 1.75 },
        ];
        const runs = buildOu13LineRuns(odds, 2, 58);
        expect(runs).toEqual([
            { handicap: 2.25, minutes: 7 },
            { handicap: 2, minutes: 6 },
            { handicap: 1.75, minutes: 1 },
        ]);
        expect(formatOu13LineRuns(runs)).toBe('2.25×7p · 2×6p · 1.75×1p');
    });
});

describe('ou13LineRunsSimilar', () => {
    const q = [
        { handicap: 2.5, minutes: 5 },
        { handicap: 2.25, minutes: 6 },
        { handicap: 2, minutes: 7 },
    ];

    it('khớp khi cùng vạch và lệch phút ≤ 2', () => {
        const cand = [
            { handicap: 2.5, minutes: 6 },
            { handicap: 2.25, minutes: 5 },
            { handicap: 2, minutes: 8 },
        ];
        expect(ou13LineRunsSimilar(q, cand).match).toBe(true);
    });

    it('loại khi khác số đoạn', () => {
        expect(ou13LineRunsSimilar(q, q.slice(0, 2)).match).toBe(false);
    });

    it('loại khi lệch phút > tolerance', () => {
        const cand = [
            { handicap: 2.5, minutes: 5 },
            { handicap: 2.25, minutes: 6 },
            { handicap: 2, minutes: 10 },
        ];
        expect(ou13LineRunsSimilar(q, cand).match).toBe(false);
    });
});
