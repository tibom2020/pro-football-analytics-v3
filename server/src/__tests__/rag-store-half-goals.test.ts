import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadRagStore, halfGoalRate } from '../goal-predict/rag-store.js';
import type { HalfSummary } from '../goal-predict/feature-builder.js';

/** 1 tóm tắt theo hiệp — merge overrides lên default. */
function summary(matchId: string, ov: Partial<HalfSummary>): HalfSummary {
    return {
        match_id: matchId,
        home: 'H',
        away: 'A',
        ft_status: 'FT',
        final_score: '',
        h1_open_ou13: 2.25,
        h2_open_ou13: 1.25,
        h1_open_ah12: -0.5,
        h2_open_ah12: -0.25,
        h1_goals: 0,
        h2_goals: 0,
        h1_has_goal: 0,
        h2_has_goal: 0,
        ...ov,
    };
}

/** Ghi cả main dataset (rỗng-tối thiểu) + halves dataset rồi nạp rag-store. */
async function loadHalves(rows: HalfSummary[]): Promise<void> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-halves-'));
    const mainFile = path.join(dir, 'ds.jsonl');
    const halvesFile = path.join(dir, 'halves.jsonl');
    // main dataset 1 dòng tối thiểu (không ảnh hưởng halfGoalRate).
    fs.writeFileSync(mainFile, JSON.stringify({ match_id: 'x', half: 1, minute: 10, ou13_handicap: 2 }) + '\n', 'utf8');
    fs.writeFileSync(halvesFile, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    await loadRagStore(mainFile, { halvesDatasetPath: halvesFile });
}

describe('halfGoalRate', () => {
    it('(a) lọc theo vạch mở T/X của hiệp hỏi (H2=1.25)', async () => {
        await loadHalves([
            summary('m1', { h2_open_ou13: 1.25, h2_goals: 1, h2_has_goal: 1 }),
            summary('m2', { h2_open_ou13: 1.25, h2_goals: 0, h2_has_goal: 0 }),
            summary('m3', { h2_open_ou13: 1.5, h2_goals: 2, h2_has_goal: 1 }), // khác vạch → loại
        ]);
        const s = halfGoalRate({ half: 2, openOu13: 1.25 });
        expect(s.total).toBe(2);
        expect(s.hits).toBe(1);
        expect(s.rate).toBeCloseTo(0.5);
        expect(s.matches.map((m) => m.matchId).sort()).toEqual(['m1', 'm2']);
    });

    it('(b) H2 điều kiện H1 không bàn + vạch H1', async () => {
        await loadHalves([
            // H1 vạch 2.25, H1 KHÔNG bàn, H2 vạch 1.25 — hợp lệ
            summary('cond1', { h1_open_ou13: 2.25, h1_goals: 0, h2_open_ou13: 1.25, h2_has_goal: 1 }),
            summary('cond2', { h1_open_ou13: 2.25, h1_goals: 0, h2_open_ou13: 1.25, h2_has_goal: 0 }),
            // H1 CÓ bàn → loại khỏi điều kiện "H1 không bàn"
            summary('h1goal', { h1_open_ou13: 2.25, h1_goals: 2, h2_open_ou13: 1.25, h2_has_goal: 1 }),
            // H1 vạch khác → loại
            summary('h1line', { h1_open_ou13: 3.0, h1_goals: 0, h2_open_ou13: 1.25, h2_has_goal: 1 }),
        ]);
        const s = halfGoalRate({
            half: 2,
            openOu13: 1.25,
            priorHalf: { openOu13: 2.25, goals: 0 },
        });
        expect(s.conditionedOnPriorHalf).toBe(true);
        expect(s.priorHalfGoals).toBe(0);
        expect(s.matches.map((m) => m.matchId).sort()).toEqual(['cond1', 'cond2']);
        expect(s.total).toBe(2);
        expect(s.hits).toBe(1);
    });

    it('(b2) H2 điều kiện H1 CÓ 2 bàn (không cố định = 0)', async () => {
        await loadHalves([
            summary('two', { h1_open_ou13: 2.25, h1_goals: 2, h2_open_ou13: 1.25, h2_has_goal: 1 }),
            summary('zero', { h1_open_ou13: 2.25, h1_goals: 0, h2_open_ou13: 1.25, h2_has_goal: 1 }),
            summary('one', { h1_open_ou13: 2.25, h1_goals: 1, h2_open_ou13: 1.25, h2_has_goal: 0 }),
        ]);
        const s = halfGoalRate({ half: 2, openOu13: 1.25, priorHalf: { openOu13: 2.25, goals: 2 } });
        expect(s.priorHalfGoals).toBe(2);
        expect(s.matches.map((m) => m.matchId)).toEqual(['two']);
        expect(s.total).toBe(1);
    });

    it('(c) kèo chấp mềm — subset ahSoft không làm giảm mẫu số chính', async () => {
        await loadHalves([
            summary('ahA', { h2_open_ou13: 1.25, h2_open_ah12: -0.25, h2_has_goal: 1 }),
            summary('ahB', { h2_open_ou13: 1.25, h2_open_ah12: -0.25, h2_has_goal: 0 }),
            summary('ahC', { h2_open_ou13: 1.25, h2_open_ah12: -0.5, h2_has_goal: 1 }), // khác chấp
        ]);
        const s = halfGoalRate({ half: 2, openOu13: 1.25, openAh12: -0.25 });
        expect(s.total).toBe(3); // vạch T/X vẫn tính cả 3
        expect(s.ahSoft?.total).toBe(2); // chỉ 2 trận trùng chấp -0.25
        expect(s.ahSoft?.hits).toBe(1);
        expect(s.ahSoft?.rate).toBeCloseTo(0.5);
    });

    it('(c2) kèo chấp mềm — +0.25 và −0.25 cùng |HDP|', async () => {
        await loadHalves([
            summary('neg', { h2_open_ou13: 1.25, h2_open_ah12: -0.25, h2_has_goal: 1 }),
            summary('pos', { h2_open_ou13: 1.25, h2_open_ah12: 0.25, h2_has_goal: 0 }),
            summary('other', { h2_open_ou13: 1.25, h2_open_ah12: -0.5, h2_has_goal: 1 }),
        ]);
        const s = halfGoalRate({ half: 2, openOu13: 1.25, openAh12: -0.25 });
        expect(s.total).toBe(3);
        expect(s.ahSoft?.total).toBe(2);
        expect(s.matches.filter((m) => Math.abs(Math.abs(m.openAh12 ?? NaN) - 0.25) < 1e-6).map((m) => m.matchId).sort())
            .toEqual(['neg', 'pos']);
        expect(s.ahSoft?.hits).toBe(1);
    });

    it('(d) dist + goalsAvg đúng', async () => {
        await loadHalves([
            summary('g0', { h2_open_ou13: 1.25, h2_goals: 0, h2_has_goal: 0 }),
            summary('g1', { h2_open_ou13: 1.25, h2_goals: 1, h2_has_goal: 1 }),
            summary('g2', { h2_open_ou13: 1.25, h2_goals: 3, h2_has_goal: 1 }),
        ]);
        const s = halfGoalRate({ half: 2, openOu13: 1.25 });
        expect(s.dist).toEqual({ zero: 1, one: 1, twoPlus: 1 });
        expect(s.goalsAvg).toBeCloseTo((0 + 1 + 3) / 3);
    });

    it('(e) H1 query không áp điều kiện hiệp trước', async () => {
        await loadHalves([
            summary('h1a', { h1_open_ou13: 2.25, h1_goals: 1, h1_has_goal: 1 }),
            summary('h1b', { h1_open_ou13: 2.25, h1_goals: 0, h1_has_goal: 0 }),
        ]);
        const s = halfGoalRate({ half: 1, openOu13: 2.25, priorHalf: { goals: 0 } });
        expect(s.conditionedOnPriorHalf).toBe(false);
        expect(s.total).toBe(2);
        expect(s.hits).toBe(1);
    });
});
