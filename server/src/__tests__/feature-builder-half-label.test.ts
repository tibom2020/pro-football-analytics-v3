import { describe, it, expect } from 'vitest';
import { buildFeatureRows } from '../goal-predict/feature-builder.js';
import type { ParsedMatch, StatRow, EventEntry, Half } from '../goal-predict/md-parser.js';

/** Stat row tối thiểu — mọi counter [home, away] = 0, chỉ cần để hàm sample được phút này. */
function stat(half: Half, clockMinute: number): StatRow {
    return {
        clockMinute,
        half,
        attacks: [0, 0],
        dangerous: [0, 0],
        onTarget: [0, 0],
        offTarget: [0, 0],
        corners: [0, 0],
        yellow: [0, 0],
        red: [0, 0],
    };
}

function goal(half: Half, clockMinute: number): EventEntry {
    return { clockMinute, half, type: 'goal', team: 'home' };
}

function match(stats: StatRow[], events: EventEntry[]): ParsedMatch {
    return {
        meta: {
            matchId: 'T1',
            homeName: 'H',
            awayName: 'A',
            league: 'L',
            finalScore: '1-1',
            ftStatus: 'FT',
            viewedAtMs: null,
            timerRaw: '',
        },
        stats,
        events,
        alerts: [],
        odds: [],
    };
}

describe('goal_before_half_end (nhãn có bàn đến hết hiệp)', () => {
    // Stats: H1 @5,40 · H2 @50,80,90 (H2@90 để dataEnd=90 → H2@80 còn đủ horizon).
    // Bàn thắng: H1 phút 20, H2 phút 70.
    const rows = buildFeatureRows(
        match(
            [stat(1, 5), stat(1, 40), stat(2, 50), stat(2, 80), stat(2, 90)],
            [goal(1, 20), goal(2, 70)],
        ),
    );
    const at = (half: Half, minute: number) =>
        rows.find((r) => r.half === half && r.minute === minute);

    it('gọi ở H1 trước bàn H1 → có bàn đến hết hiệp = 1', () => {
        expect(at(1, 5)?.goal_before_half_end).toBe(1);
    });

    it('gọi ở H1 SAU bàn H1 (không tính bàn H2) → 0', () => {
        expect(at(1, 40)?.goal_before_half_end).toBe(0);
    });

    it('gọi ở H2 trước bàn H2 → 1', () => {
        expect(at(2, 50)?.goal_before_half_end).toBe(1);
    });

    it('gọi ở H2 sau bàn H2 → 0', () => {
        expect(at(2, 80)?.goal_before_half_end).toBe(0);
    });
});
