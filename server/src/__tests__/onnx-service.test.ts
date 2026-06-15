import { describe, it, expect } from 'vitest';
import {
    isReady,
    getMeta,
    getLoadError,
    predictGoalProb,
    registeredWindows,
    GOAL_WINDOW_MIN,
    GOAL_WINDOW_MIN_SHORT,
} from '../goal-predict/onnx-service.js';
import type { FeatureVector } from '../goal-predict/feature-builder.js';

function zeroFeatures(): FeatureVector {
    return {
        minute: 30,
        half: 1,
        total_goals_so_far: 0,
        da_h_delta_3m: 0,
        da_a_delta_3m: 0,
        da_total_3m: 0,
        shots_total_delta_3m: 0,
        on_target_delta_3m: 0,
        corners_delta_3m: 0,
        yellow_delta_3m: 0,
        ou13_handicap: 2.5,
        ou13_over_odds: 1.9,
        ou13_under_odds: 1.9,
        ou13_under_rises_5m_count: 0,
        ou13_under_rises_5m_sum: 0,
        ou13_under_rises_max_step_5m: 0,
        ou13_over_drops_5m_count: 0,
        ou13_over_drops_5m_sum: 0,
        ou13_over_max_step_5m: 0,
        ah12_handicap: 0,
        ah12_home_odds: 1.9,
        ah12_away_odds: 1.9,
        ah12_home_drops_5m_count: 0,
        ah12_home_drops_5m_sum: 0,
        ah12_home_max_step_5m: 0,
        pressure_alert_count_3m: 0,
        pressure_alert_max_3m: 0,
        man_advantage: 0,
    };
}

describe('onnx-service window map', () => {
    it('exposes 15 and 5 minute window constants', () => {
        expect(GOAL_WINDOW_MIN).toBe(15);
        expect(GOAL_WINDOW_MIN_SHORT).toBe(5);
    });

    it('returns null predict when models are not loaded', async () => {
        const features = zeroFeatures();
        const p15 = await predictGoalProb(features, 15);
        const p5 = await predictGoalProb(features, 5);
        if (!isReady(15)) expect(p15).toBeNull();
        if (!isReady(5)) expect(p5).toBeNull();
    });

    it('tracks readiness per window independently', () => {
        if (!isReady(15)) expect(getMeta(15)).toBeNull();
        if (!isReady(5)) expect(getMeta(5)).toBeNull();
        if (isReady(15)) expect(getMeta(15)?.featureNames.length).toBeGreaterThan(0);
        if (isReady(5)) expect(getMeta(5)?.featureNames.length).toBeGreaterThan(0);
        for (const w of registeredWindows()) {
            expect([15, 5]).toContain(w);
        }
    });
});
