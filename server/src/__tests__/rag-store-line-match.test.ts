import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadRagStore, topK, listMatchesByOpeningOu13, listMatchesByOpeningOu13WithLineRuns, type LineMatchContext } from '../goal-predict/rag-store.js';
import { FEATURE_NAMES, type FeatureVector } from '../goal-predict/feature-builder.js';

/** Base feature vector — query trận đang xem H2 m60: vạch T/X 2.25, vạch chấp -0.5. */
function baseFeatures(): FeatureVector {
    const fv = Object.fromEntries(FEATURE_NAMES.map((n) => [n, 0])) as FeatureVector;
    fv.minute = 60;
    fv.half = 2;
    fv.ou13_handicap = 2.25;
    fv.ah12_handicap = -0.5;
    fv.da_total_3m = 5;
    return fv;
}

/** 1 dòng dataset (FeatureRow JSON) — merge overrides lên base. */
function row(matchId: string, overrides: Partial<FeatureVector>): string {
    const fv = { ...baseFeatures(), ...overrides };
    return JSON.stringify({ match_id: matchId, goal_within_window: 1, ...fv });
}

/** Ghi dataset tạm rồi nạp vào rag-store (overwrite global state). */
async function loadDataset(lines: string[]): Promise<void> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-line-'));
    const file = path.join(dir, 'ds.jsonl');
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    await loadRagStore(file);
}

const lineCtxH2: LineMatchContext = {
    h1OpenOu13: 2.0,
    h2OpenOu13: 2.25,
    h1OpenAh12: -0.5,
    h2OpenAh12: -0.5,
};

describe('topK line-matching (matchLines=true)', () => {
    it('(a) trận trùng vạch lên trước trận lệch vạch dù cosine thấp hơn', async () => {
        await loadDataset([
            row('offClose', { ou13_handicap: 2.75, ah12_handicap: 0 }),
            row('exactFar', { da_total_3m: 80, shots_total_delta_3m: 60, on_target_delta_3m: 40 }),
        ]);
        const res = topK(baseFeatures(), 5, false, true, undefined, 'legacy');
        const iExact = res.findIndex((r) => r.matchId === 'exactFar');
        const iOff = res.findIndex((r) => r.matchId === 'offClose');
        expect(iExact).toBeGreaterThanOrEqual(0);
        expect(iOff).toBeGreaterThanOrEqual(0);
        expect(iExact).toBeLessThan(iOff);
    });

    it('(b) đủ ≥5 trận trùng vạch tuyệt đối thì không trận lệch vạch nào lọt vào top 5', async () => {
        await loadDataset([
            row('e1', { da_total_3m: 1 }),
            row('e2', { da_total_3m: 2 }),
            row('e3', { da_total_3m: 3 }),
            row('e4', { da_total_3m: 4 }),
            row('e5', { da_total_3m: 6 }),
            row('off', { ou13_handicap: 3.0, ah12_handicap: -1.5 }),
        ]);
        const res = topK(baseFeatures(), 5, false, true, undefined, 'legacy');
        expect(res).toHaveLength(5);
        expect(res.some((r) => r.matchId === 'off')).toBe(false);
        for (const r of res) {
            expect(r.features?.ou13_handicap).toBe(2.25);
            expect(r.features?.ah12_handicap).toBe(-0.5);
        }
    });

    it('(c) query thiếu vạch (NaN) → fallback cosine, không lọc vạch', async () => {
        await loadDataset([
            row('offLine', { ou13_handicap: 3.0, ah12_handicap: -1.5 }),
            row('exactLine', { da_total_3m: 80, shots_total_delta_3m: 60 }),
        ]);
        const q = { ...baseFeatures(), ou13_handicap: NaN, ah12_handicap: NaN };
        const withLineMatch = topK(q, 5, false, true, undefined, 'legacy').map((r) => r.matchId);
        const cosineOnly = topK(q, 5, false, false).map((r) => r.matchId);
        expect(withLineMatch).toEqual(cosineOnly);
        expect(withLineMatch).toContain('offLine');
    });

    it('(c2) openLine thiếu vạch mở hiệp → trả rỗng (bắt buộc HDP 1_3 mở cùng hiệp)', async () => {
        await loadDataset([
            row('offLine', { ou13_handicap: 3.0, ah12_handicap: -1.5 }),
            row('exactLine', { da_total_3m: 80, shots_total_delta_3m: 60 }),
        ]);
        const q = { ...baseFeatures(), ou13_handicap: NaN, ah12_handicap: NaN };
        expect(topK(q, 5, false, true, undefined, 'openLine')).toHaveLength(0);
    });

    it('(c3) gắn nhãn labelHalf (goal_before_half_end) vào kết quả topK', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-half-'));
        const file = path.join(dir, 'ds.jsonl');
        const withHalf = (matchId: string, halfLbl: 0 | 1, ov: Partial<FeatureVector>) =>
            JSON.stringify({ match_id: matchId, goal_within_window: 1, goal_before_half_end: halfLbl, ...baseFeatures(), ...ov });
        fs.writeFileSync(file, [
            withHalf('hasGoal', 1, { da_total_3m: 5 }),
            withHalf('noGoal', 0, { da_total_3m: 6 }),
        ].join('\n'), 'utf8');
        await loadRagStore(file);
        const res = topK(baseFeatures(), 5, false, true, undefined, 'legacy');
        expect(res.find((r) => r.matchId === 'hasGoal')?.labelHalf).toBe(1);
        expect(res.find((r) => r.matchId === 'noGoal')?.labelHalf).toBe(0);
    });

    it('(d) cùng vạch snapshot nhưng khác hiệp → cùng hiệp (H2) lên trước', async () => {
        await loadDataset([
            row('h1match', { half: 1, minute: 30, ou13_handicap: 2.25, ah12_handicap: -0.5, da_total_3m: 99 }),
            row('h2match', { half: 2, minute: 60, ou13_handicap: 2.25, ah12_handicap: -0.5, da_total_3m: 1 }),
        ]);
        const res = topK(baseFeatures(), 5, false, true, lineCtxH2, 'openLine');
        expect(res[0]?.matchId).toBe('h2match');
    });

    it('(e) khớp vạch mở cả H1+H2 thắng chỉ khớp snapshot H2', async () => {
        await loadDataset([
            // H1 mở lệch, H2 mở khớp — snapshot H2 khớp
            row('dualOff', {
                half: 2,
                minute: 46,
                ou13_handicap: 2.25,
                ah12_handicap: -0.5,
                da_total_3m: 90,
            }),
            row('dualOff', {
                half: 1,
                minute: 1,
                ou13_handicap: 2.75,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('dualOff', {
                half: 2,
                minute: 60,
                ou13_handicap: 2.25,
                ah12_handicap: -0.5,
                da_total_3m: 5,
            }),
            // H1+H2 mở đều khớp
            row('dualExact', {
                half: 1,
                minute: 1,
                ou13_handicap: 2.0,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('dualExact', {
                half: 2,
                minute: 46,
                ou13_handicap: 2.25,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('dualExact', {
                half: 2,
                minute: 60,
                ou13_handicap: 2.5,
                ah12_handicap: -0.5,
                da_total_3m: 80,
            }),
        ]);
        const res = topK(baseFeatures(), 5, false, true, lineCtxH2, 'openLine');
        const iExact = res.findIndex((r) => r.matchId === 'dualExact');
        const iOff = res.findIndex((r) => r.matchId === 'dualOff');
        expect(iExact).toBeGreaterThanOrEqual(0);
        expect(iOff).toBeGreaterThanOrEqual(0);
        expect(iExact).toBeLessThan(iOff);
    });

    it('(f) vạch mở khớp tuyệt đối thắng vạch mở lệch dù snapshot giống hơn', async () => {
        await loadDataset([
            row('openOff', {
                half: 1,
                minute: 1,
                ou13_handicap: 2.75,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('openOff', {
                half: 2,
                minute: 46,
                ou13_handicap: 2.75,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('openOff', {
                half: 2,
                minute: 60,
                ou13_handicap: 2.25,
                ah12_handicap: -0.5,
                da_total_3m: 99,
            }),
            row('openExact', {
                half: 1,
                minute: 1,
                ou13_handicap: 2.0,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('openExact', {
                half: 2,
                minute: 46,
                ou13_handicap: 2.25,
                ah12_handicap: -0.5,
                da_total_3m: 0,
            }),
            row('openExact', {
                half: 2,
                minute: 60,
                ou13_handicap: 2.5,
                ah12_handicap: -0.5,
                da_total_3m: 1,
            }),
        ]);
        const res = topK(baseFeatures(), 5, false, true, lineCtxH2, 'openLine');
        expect(res.find((r) => r.matchId === 'openOff')).toBeUndefined();
        expect(res[0]?.matchId).toBe('openExact');
    });

    it('(g) cùng matchId nhiều phút — chỉ trả 1 dòng', async () => {
        await loadDataset([
            row('dup', { half: 2, minute: 46, ou13_handicap: 2.25, da_total_3m: 1 }),
            row('dup', { half: 2, minute: 50, ou13_handicap: 2.25, da_total_3m: 2 }),
            row('dup', { half: 2, minute: 55, ou13_handicap: 2.25, da_total_3m: 3 }),
            row('dup', { half: 2, minute: 60, ou13_handicap: 2.25, da_total_3m: 99 }),
            row('other', { half: 2, minute: 60, ou13_handicap: 2.25, da_total_3m: 5 }),
        ]);
        const res = topK(baseFeatures(), 20, false, true, lineCtxH2, 'openLine');
        expect(res.filter((r) => r.matchId === 'dup')).toHaveLength(1);
        expect(res.filter((r) => r.matchId === 'other')).toHaveLength(1);
    });
});

describe('listMatchesByOpeningOu13', () => {
    it('H2: chỉ liệt kê trận có vạch mở H2 trùng — không lấy trận chỉ khớp H1', async () => {
        await loadDataset([
            row('matchA', { half: 1, minute: 1, ou13_handicap: 2.0 }),
            row('matchA', { half: 2, minute: 46, ou13_handicap: 2.25 }),
            row('matchB', { half: 1, minute: 1, ou13_handicap: 2.0 }),
            row('matchB', { half: 2, minute: 46, ou13_handicap: 2.5 }),
            row('matchC', { half: 1, minute: 1, ou13_handicap: 1.75 }),
            row('matchC', { half: 2, minute: 46, ou13_handicap: 2.25 }),
            row('current', { half: 1, minute: 20, ou13_handicap: 2.25 }),
        ]);
        const res = listMatchesByOpeningOu13(lineCtxH2, baseFeatures(), { excludeMatchId: 'current' });
        const ids = res.map((r) => r.matchId).sort();
        expect(ids).toEqual(['matchA', 'matchC']);
        expect(res.every((r) => r.matchedOpenHalves === 'H2')).toBe(true);
        expect(res.find((r) => r.matchId === 'matchB')).toBeUndefined();
    });

    it('H1: chỉ liệt kê trận có vạch mở H1 trùng — không lấy trận chỉ khớp H2', async () => {
        await loadDataset([
            row('matchA', { half: 1, minute: 1, ou13_handicap: 2.0 }),
            row('matchA', { half: 2, minute: 46, ou13_handicap: 2.25 }),
            row('matchB', { half: 1, minute: 1, ou13_handicap: 2.0 }),
            row('matchB', { half: 2, minute: 46, ou13_handicap: 2.5 }),
            row('matchC', { half: 1, minute: 1, ou13_handicap: 1.75 }),
            row('matchC', { half: 2, minute: 46, ou13_handicap: 2.25 }),
            row('current', { half: 2, minute: 60, ou13_handicap: 2.25 }),
        ]);
        const qH1 = { ...baseFeatures(), half: 1, minute: 20, ou13_handicap: 2.0 };
        const res = listMatchesByOpeningOu13(lineCtxH2, qH1, { excludeMatchId: 'current' });
        const ids = res.map((r) => r.matchId).sort();
        expect(ids).toEqual(['matchA', 'matchB']);
        expect(res.every((r) => r.matchedOpenHalves === 'H1')).toBe(true);
        expect(res.find((r) => r.matchId === 'matchC')).toBeUndefined();
    });

    it('H2: giữ trận cùng 1_3 dù 1_2 khác — kèm note', async () => {
        await loadDataset([
            row('matchA', { half: 2, minute: 46, ou13_handicap: 2.25, ah12_handicap: -0.5 }),
            row('matchB', { half: 2, minute: 46, ou13_handicap: 2.25, ah12_handicap: -1 }),
            row('current', { half: 2, minute: 60, ou13_handicap: 2.25, ah12_handicap: -0.5 }),
        ]);
        const res = listMatchesByOpeningOu13(lineCtxH2, baseFeatures(), { excludeMatchId: 'current' });
        expect(res.map((r) => r.matchId)).toEqual(['matchA', 'matchB']);
        expect(res[0]?.openAh12MismatchNote).toBeUndefined();
        expect(res[1]?.openAh12MismatchNote).toContain('1_2 mở khác');
    });

    it('H2: ± cùng |HDP| 1_2 không gắn note mismatch', async () => {
        await loadDataset([
            row('matchPos', { half: 2, minute: 46, ou13_handicap: 2.25, ah12_handicap: 0.5 }),
            row('matchNeg', { half: 2, minute: 46, ou13_handicap: 2.25, ah12_handicap: -0.5 }),
            row('current', { half: 2, minute: 60, ou13_handicap: 2.25, ah12_handicap: -0.5 }),
        ]);
        const res = listMatchesByOpeningOu13(lineCtxH2, baseFeatures(), { excludeMatchId: 'current' });
        expect(res.map((r) => r.matchId).sort()).toEqual(['matchNeg', 'matchPos']);
        expect(res.every((r) => r.openAh12MismatchNote == null)).toBe(true);
    });
});

describe('listMatchesByOpeningOu13WithLineRuns', () => {
    it('lọc catalog theo pattern thời gian vạch gần giống nhau', async () => {
        await loadDataset([
            row('matchGood', { half: 2, minute: 46, ou13_handicap: 2.25, ah12_handicap: -0.5 }),
            row('matchGood', { half: 2, minute: 52, ou13_handicap: 2, ah12_handicap: -0.5 }),
            row('matchGood', { half: 2, minute: 58, ou13_handicap: 1.75, ah12_handicap: -0.5 }),
            row('matchBad', { half: 2, minute: 46, ou13_handicap: 2.25, ah12_handicap: -0.5 }),
            row('matchBad', { half: 2, minute: 60, ou13_handicap: 2, ah12_handicap: -0.5 }),
            row('current', { half: 2, minute: 58, ou13_handicap: 1.75 }),
        ]);
        const q = baseFeatures();
        const queryOdds = [
            { minute: 46, half: 2 as const, handicap: 2.25 },
            { minute: 52, half: 2 as const, handicap: 2 },
            { minute: 58, half: 2 as const, handicap: 1.75 },
        ];
        const res = await listMatchesByOpeningOu13WithLineRuns(lineCtxH2, q, queryOdds, {
            excludeMatchId: 'current',
        });
        expect(res.map((r) => r.matchId)).toEqual(['matchGood']);
        expect(res[0]?.ou13LineRuns).toContain('2.25');
    });
});
