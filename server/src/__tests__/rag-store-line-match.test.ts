import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadRagStore, topK, type LineMatchContext } from '../goal-predict/rag-store.js';
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
        const withLineMatch = topK(q, 5, false, true).map((r) => r.matchId);
        const cosineOnly = topK(q, 5, false, false).map((r) => r.matchId);
        expect(withLineMatch).toEqual(cosineOnly);
        expect(withLineMatch).toContain('offLine');
    });

    it('(d) cùng vạch snapshot nhưng khác hiệp → cùng hiệp (H2) lên trước', async () => {
        await loadDataset([
            row('h1match', { half: 1, minute: 30, ou13_handicap: 2.25, ah12_handicap: -0.5, da_total_3m: 99 }),
            row('h2match', { half: 2, minute: 60, ou13_handicap: 2.25, ah12_handicap: -0.5, da_total_3m: 1 }),
        ]);
        const res = topK(baseFeatures(), 5, false, true, undefined, 'openLine');
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
        const iExact = res.findIndex((r) => r.matchId === 'openExact');
        const iOff = res.findIndex((r) => r.matchId === 'openOff');
        expect(iExact).toBeGreaterThanOrEqual(0);
        expect(iOff).toBeGreaterThanOrEqual(0);
        expect(iExact).toBeLessThan(iOff);
    });
});
