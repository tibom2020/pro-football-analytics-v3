import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadRagStore, getOddsHistory13 } from '../goal-predict/rag-store.js';
import { FEATURE_NAMES, type FeatureVector } from '../goal-predict/feature-builder.js';

function baseRow(): FeatureVector {
    const fv = Object.fromEntries(FEATURE_NAMES.map((n) => [n, 0])) as FeatureVector;
    fv.ou13_handicap = 2.5;
    fv.ou13_over_odds = 1.9;
    fv.ou13_under_odds = 1.9;
    fv.ah12_handicap = -0.5;
    fv.ah12_home_odds = 1.95;
    fv.ah12_away_odds = 1.85;
    return fv;
}

function row(matchId: string, overrides: Partial<FeatureVector>): string {
    const fv = { ...baseRow(), ...overrides };
    return JSON.stringify({ match_id: matchId, goal_within_window: 0, ...fv });
}

async function loadDataset(lines: string[]): Promise<void> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-odds-'));
    const file = path.join(dir, 'ds.jsonl');
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    await loadRagStore(file, { historyDir: path.join(dir, 'missing-history') });
}

describe('getOddsHistory13 dataset fallback', () => {
    it('trả odds từ jsonl khi không có file History md', async () => {
        await loadDataset([
            row('11175647', { half: 1, minute: 10, total_goals_so_far: 0 }),
            row('11175647', { half: 1, minute: 35, total_goals_so_far: 1, ou13_handicap: 2.25 }),
            row('11175647', { half: 2, minute: 60, total_goals_so_far: 2 }),
        ]);
        const data = await getOddsHistory13('11175647');
        expect(data).not.toBeNull();
        expect(data!.matchId).toBe('11175647');
        expect(data!.odds.length).toBe(3);
        expect(data!.odds12.length).toBe(3);
        expect(data!.events.filter((e) => e.type === 'goal')).toHaveLength(2);
        expect(data!.stats).toEqual([]);
    });

    it('null khi matchId không có trong dataset', async () => {
        await loadDataset([row('999', { half: 1, minute: 1 })]);
        const data = await getOddsHistory13('11175647');
        expect(data).toBeNull();
    });
});
