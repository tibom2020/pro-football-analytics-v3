/** Một đoạn vạch T/X (1_3) liên tục trong hiệp — handicap + số phút giữ nguyên vạch. */
export interface Ou13LineRun {
    handicap: number;
    minutes: number;
}

export type Ou13OddsPoint = {
    minute: number;
    half: 1 | 2;
    handicap: number;
};

const LINE_EPS = 1e-6;

export const OU13_LINE_RUN_DURATION_TOLERANCE_MIN = 2;

function linesEqual(a: number, b: number): boolean {
    return Math.abs(a - b) < LINE_EPS;
}

/**
 * Tách lịch sử 1_3 trong hiệp thành các đoạn {handicap, minutes}.
 * Ví dụ: 2.5 giữ 5', 2.25 giữ 6', 2.0 giữ 7' …
 */
export function buildOu13LineRuns(
    odds: readonly Ou13OddsPoint[],
    half: 1 | 2,
    upToMinute: number,
): Ou13LineRun[] {
    const halfStart = half === 2 ? 45 : 0;
    const pts = odds
        .filter(
            (o) =>
                o.half === half
                && o.minute <= upToMinute
                && Number.isFinite(o.handicap),
        )
        .sort((a, b) => a.minute - b.minute);
    if (pts.length === 0) return [];

    const changes: Array<{ minute: number; handicap: number }> = [];
    let prevH: number | null = null;
    for (const p of pts) {
        if (prevH === null || !linesEqual(p.handicap, prevH)) {
            changes.push({ minute: p.minute, handicap: p.handicap });
            prevH = p.handicap;
        }
    }

    const runs: Ou13LineRun[] = [];
    for (let i = 0; i < changes.length; i++) {
        const start = i === 0 ? Math.min(halfStart, changes[i].minute) : changes[i].minute;
        const end = i + 1 < changes.length ? changes[i + 1].minute : upToMinute + 1;
        const minutes = Math.max(1, end - start);
        runs.push({ handicap: changes[i].handicap, minutes });
    }
    return runs;
}

/** Hiển thị ngắn: `2.5×5p · 2.25×6p`. */
export function formatOu13LineRuns(runs: readonly Ou13LineRun[]): string {
    if (runs.length === 0) return '';
    return runs
        .map((r) => `${r.handicap}×${r.minutes}p`)
        .join(' · ');
}

/**
 * So khớp pattern vạch + thời gian từng đoạn (cùng số đoạn, cùng handicap, lệch phút ≤ tolerance).
 * `score` = tổng |Δphút| (nhỏ hơn = giống hơn).
 */
export function ou13LineRunsSimilar(
    query: readonly Ou13LineRun[],
    cand: readonly Ou13LineRun[],
    toleranceMin = OU13_LINE_RUN_DURATION_TOLERANCE_MIN,
): { match: boolean; score: number } {
    if (query.length === 0 || cand.length !== query.length) {
        return { match: false, score: Number.POSITIVE_INFINITY };
    }
    let score = 0;
    for (let i = 0; i < query.length; i++) {
        if (!linesEqual(query[i].handicap, cand[i].handicap)) {
            return { match: false, score: Number.POSITIVE_INFINITY };
        }
        const diff = Math.abs(query[i].minutes - cand[i].minutes);
        if (diff > toleranceMin) {
            return { match: false, score: Number.POSITIVE_INFINITY };
        }
        score += diff;
    }
    return { match: true, score };
}
