import { describe, it, expect } from 'vitest';
import { buildHalfSummary } from '../goal-predict/feature-builder.js';
import type { ParsedMatch, EventEntry, Half } from '../goal-predict/md-parser.js';

function goal(half: Half, clockMinute: number): EventEntry {
    return { clockMinute, half, type: 'goal' };
}

function match(finalScore: string, events: EventEntry[]): ParsedMatch {
    return {
        meta: {
            matchId: 'm', homeName: 'H', awayName: 'A', league: '',
            finalScore, ftStatus: 'FT', viewedAtMs: null, timerRaw: '',
        },
        stats: [],
        events,
        alerts: [],
        odds: [],
    };
}

describe('buildHalfSummary — số bàn theo hiệp (khử trùng + chuẩn theo tỷ số)', () => {
    it('H2 bị log trùng (Man Utd 3-2): 10 dòng goal H2 → đúng 3 bàn', () => {
        const events = [
            goal(1, 14), goal(1, 30),
            goal(2, 47), goal(2, 55), goal(2, 56), goal(2, 57),
            goal(2, 61), goal(2, 62), goal(2, 63), goal(2, 77), goal(2, 82), goal(2, 90),
        ];
        const s = buildHalfSummary(match('3-2', events));
        expect(s.h1_goals).toBe(2);          // cụm 14, 30
        expect(s.h2_goals).toBe(3);          // tổng 5 − H1 2
        expect(s.h1_has_goal).toBe(1);
        expect(s.h2_has_goal).toBe(1);
    });

    it('bàn "ma" H2 (Spain 4-0): sự kiện 91 bị loại theo tỷ số → H2 = 0', () => {
        const events = [goal(1, 10), goal(1, 22), goal(1, 25), goal(1, 48), goal(2, 91)];
        const s = buildHalfSummary(match('4-0', events));
        expect(s.h1_goals).toBe(4);
        expect(s.h2_goals).toBe(0);
        expect(s.h2_has_goal).toBe(0);
    });

    it('gộp phút liền kề cùng cụm (55,56,57 = 1 bàn)', () => {
        // total 2, H1 có cụm {20} = 1 → H2 = 1
        const s = buildHalfSummary(match('1-1', [goal(1, 20), goal(2, 55), goal(2, 56), goal(2, 57)]));
        expect(s.h1_goals).toBe(1);
        expect(s.h2_goals).toBe(1);
    });

    it('thiếu tỷ số → fallback về số cụm mỗi hiệp', () => {
        const s = buildHalfSummary(match('', [goal(1, 10), goal(2, 70), goal(2, 71)]));
        expect(s.h1_goals).toBe(1);
        expect(s.h2_goals).toBe(1); // 70,71 gộp 1 cụm
    });
});
