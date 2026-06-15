/**
 * ONNX runtime cho XGBoost goal-imminent model.
 * Load theo cửa sổ (15' / 5'); nếu file model chưa có thì predict trả null cho window đó.
 */

import * as ort from 'onnxruntime-node';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
    FEATURE_NAMES,
    GOAL_WINDOW_MIN,
    GOAL_WINDOW_MIN_SHORT,
    GOAL_WINDOW_MIN_LONG,
    type FeatureVector,
    type FeatureName,
} from './feature-builder.js';

export interface GoalModelMeta {
    version: string;
    trainedAt: string;
    featureNames: string[];
    rocAuc: number;
    prAuc: number;
    numTrainRows: number;
    numTestRows: number;
    positiveRatioTrain: number;
    positiveRatioTest: number;
    numTrainMatches?: number;
    numTestMatches?: number;
    topFeatures: Record<string, number>;
    recommendedThreshold: number;
    goalWindowMin?: number;
    // Chỉ số calibration/honest-eval (notebook v2 trở đi).
    brier?: number;
    logLoss?: number;
    baselineBrier?: number;
    numValRows?: number;
    numValMatches?: number;
    /** Ngưỡng hiển thị màu suy từ phân bố output thật trên test (percentile P70/P85/P95). */
    displayThresholds?: { warn: number; high: number; extreme: number };
}

interface ModelSlot {
    session: ort.InferenceSession | null;
    meta: GoalModelMeta | null;
    loadError: string | null;
}

const sessions = new Map<number, ModelSlot>();

function slot(windowMin: number): ModelSlot {
    let s = sessions.get(windowMin);
    if (!s) {
        s = { session: null, meta: null, loadError: null };
        sessions.set(windowMin, s);
    }
    return s;
}

export async function initGoalModel(
    modelPath: string,
    metaPath: string,
    windowMin: number = GOAL_WINDOW_MIN,
): Promise<void> {
    const s = slot(windowMin);
    try {
        const abs = path.resolve(process.cwd(), modelPath);
        const metaAbs = path.resolve(process.cwd(), metaPath);
        await fs.access(abs);
        await fs.access(metaAbs);
        s.session = await ort.InferenceSession.create(abs, { executionProviders: ['cpu'] });
        const metaRaw = await fs.readFile(metaAbs, 'utf8');
        s.meta = JSON.parse(metaRaw) as GoalModelMeta;
        const expected = s.meta?.featureNames || [];
        // Model dùng feature list của chính nó (meta.featureNames) khi inference → cho phép model cũ (28 features)
        // và model mới (31 features) cùng tồn tại mà không cần retrain đồng loạt.
        if (expected.length !== FEATURE_NAMES.length) {
            console.warn(
                `[goal-model] windowMin=${windowMin} Feature count: model=${expected.length}, code=${FEATURE_NAMES.length} — model sẽ dùng feature list của chính nó.`,
            );
        }
        s.loadError = null;
        console.log(
            `[goal-model] windowMin=${windowMin} Loaded ${abs} — AUC ${s.meta?.rocAuc.toFixed(3)} (${s.meta?.numTrainMatches ?? '?'} train matches)`,
        );
    } catch (e) {
        s.loadError = (e as Error).message;
        s.session = null;
        s.meta = null;
        console.warn(
            `[goal-model] windowMin=${windowMin} Không load được model: ${s.loadError}. Predict sẽ trả null.`,
        );
    }
}

export function isReady(windowMin: number = GOAL_WINDOW_MIN): boolean {
    return slot(windowMin).session !== null;
}

export function getMeta(windowMin: number = GOAL_WINDOW_MIN): GoalModelMeta | null {
    return slot(windowMin).meta;
}

export function getLoadError(windowMin: number = GOAL_WINDOW_MIN): string | null {
    return slot(windowMin).loadError;
}

/** Cửa sổ đã đăng ký (có slot trong Map). */
export function registeredWindows(): number[] {
    return [...sessions.keys()];
}

/**
 * Predict prob bàn thắng trong cửa sổ tương ứng (mặc định 15').
 * @returns prob ∈ [0,1] hoặc null nếu model chưa sẵn sàng.
 */
export async function predictGoalProb(
    features: FeatureVector,
    windowMin: number = GOAL_WINDOW_MIN,
): Promise<number | null> {
    const s = slot(windowMin);
    if (!s.session) return null;
    // Dùng feature list từ meta của model cụ thể — cho phép model 15'/5' (28 feat) và 30' (31 feat)
    // cùng chạy đúng mà không cần retrain đồng loạt khi thêm feature mới.
    const modelFeatures: readonly string[] = s.meta?.featureNames?.length ? s.meta.featureNames : FEATURE_NAMES;
    const input = new Float32Array(modelFeatures.length);
    for (let i = 0; i < modelFeatures.length; i++) {
        const v = (features as Record<string, number>)[modelFeatures[i]];
        // Giữ NaN cho feature missing (handicap/odds chưa có) để khớp cách train (XGBoost native missing).
        // KHÔNG ép về 0 — 0 là giá trị thật khác missing.
        input[i] = typeof v === 'number' ? v : NaN;
    }
    const tensor = new ort.Tensor('float32', input, [1, modelFeatures.length]);
    const out = await s.session.run({ input: tensor });
    return extractProb(out);
}

function extractProb(out: ort.InferenceSession.OnnxValueMapType): number {
    const keys = Object.keys(out);
    for (const k of keys) {
        const v = out[k];
        if (v && 'dims' in v && Array.isArray(v.dims) && v.dims.length === 2 && v.dims[1] === 2) {
            const data = v.data as Float32Array;
            return Number(data[1]);
        }
        if (Array.isArray(v)) {
            const first = v[0];
            if (first instanceof Map) {
                const p1 = first.get(1n) ?? first.get(1);
                if (typeof p1 === 'number') return p1;
            } else if (first && typeof first === 'object' && '1' in (first as Record<string, unknown>)) {
                const p1 = (first as Record<string, number>)['1'];
                if (typeof p1 === 'number') return p1;
            }
        }
    }
    return 0;
}

export function getTopContributingFeatures(
    features: FeatureVector,
    k = 5,
    windowMin: number = GOAL_WINDOW_MIN,
): Array<{ name: string; value: number; importance: number }> {
    const meta = slot(windowMin).meta;
    if (!meta) return [];
    const imp = meta.topFeatures || {};
    return Object.entries(imp)
        .map(([name, importance]) => ({
            name,
            value: Number((features as Record<string, number>)[name] ?? 0),
            importance: Number(importance),
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, k);
}

export { GOAL_WINDOW_MIN, GOAL_WINDOW_MIN_SHORT, GOAL_WINDOW_MIN_LONG };
