/**
 * TTL + LRU cache cho predict-goal endpoints. Mục tiêu:
 * - Bỏ qua ONNX inference khi feature vector không đổi trong TTL ngắn (60s).
 * - Bỏ qua LLM (Ollama + GPT) khi prompt input không đổi trong TTL dài hơn (300s)
 *   — đây là chỗ tiết kiệm token / latency lớn nhất.
 *
 * Key = sha1 của feature vector theo thứ tự FEATURE_NAMES → cùng feature vector luôn cùng key,
 * không cần đính kèm matchId (2 trận trùng feature thực sự sẽ ra prediction giống nhau).
 */

import crypto from 'crypto';
import { FEATURE_NAMES, type FeatureVector } from './feature-builder.js';

interface Entry<T> {
    value: T;
    expiresAt: number;
}

export class TtlCache<T> {
    private map = new Map<string, Entry<T>>();
    private ttlMs: number;
    private maxSize: number;
    private hits = 0;
    private misses = 0;

    constructor(ttlMs: number, maxSize = 256) {
        this.ttlMs = ttlMs;
        this.maxSize = maxSize;
    }

    get(key: string): T | undefined {
        const e = this.map.get(key);
        if (!e) {
            this.misses++;
            return undefined;
        }
        if (e.expiresAt < Date.now()) {
            this.map.delete(key);
            this.misses++;
            return undefined;
        }
        // LRU touch: xoá rồi set lại để insertion order = recency.
        this.map.delete(key);
        this.map.set(key, e);
        this.hits++;
        return e.value;
    }

    set(key: string, value: T): void {
        this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        if (this.map.size > this.maxSize) {
            const oldest = this.map.keys().next().value;
            if (oldest !== undefined) this.map.delete(oldest);
        }
    }

    stats(): { size: number; hits: number; misses: number; ttlMs: number } {
        return { size: this.map.size, hits: this.hits, misses: this.misses, ttlMs: this.ttlMs };
    }

    clear(): void {
        this.map.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

/**
 * Hash deterministic cho 1 feature vector. Dùng thứ tự cố định FEATURE_NAMES
 * để tránh phụ thuộc thứ tự key của object.
 */
export function hashFeatures(features: FeatureVector): string {
    const vec = FEATURE_NAMES.map((k) => features[k] ?? 0);
    return crypto.createHash('sha1').update(JSON.stringify(vec)).digest('hex').slice(0, 16);
}
