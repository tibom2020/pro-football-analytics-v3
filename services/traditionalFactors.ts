import type { ProcessedStats } from '../types';
import { decodeStatTimelineKey, type MatchHalf } from './matchTimeline';

/** Cửa sổ chuẩn cho Động lực / Cụm sút (phút). */
export const FACTOR_DEFAULT_WINDOW = 5;
/** Cửa sổ chuẩn cho Áp lực kèo (phút). */
export const PRESSURE_DEFAULT_RANGE = 3;
/** Sample stats trễ quá ngưỡng này so với đồng hồ trận → coi là "data cũ". */
export const STALENESS_THRESHOLD_MIN = 6;
/** Trọng số cộng thêm khi điểm kèo nằm trong cụm 3 đỏ liên tiếp (highlight). */
const PRESSURE_HIGHLIGHT_WEIGHT = 1.6;

/** Điểm API tổng hợp 1 đội (cố ý đếm chồng `on_target` để trúng đích nặng hơn sút trượt). */
export const calculateAPIScore = (stats: ProcessedStats | undefined, sideIndex: 0 | 1): number => {
    if (!stats) return 0;
    const onTarget = stats.on_target[sideIndex];
    const offTarget = stats.off_target[sideIndex];
    const shots = onTarget + offTarget;
    const corners = stats.corners[sideIndex];
    const dangerous = stats.dangerous_attacks[sideIndex];
    return shots * 1.0 + onTarget * 3.0 + corners * 0.7 + dangerous * 0.1;
};

interface TimelineEntry {
    minute: number;
    half: MatchHalf;
    stats: ProcessedStats;
}

const statEntriesForHalf = (
    statsHistory: Record<number, ProcessedStats>,
    half: MatchHalf,
): TimelineEntry[] =>
    Object.keys(statsHistory)
        .map(Number)
        .map((k) => ({ ...decodeStatTimelineKey(k), stats: statsHistory[k] }))
        .filter((e) => e.half === half)
        .sort((a, b) => a.minute - b.minute);

/**
 * Chọn sample "quá khứ" để so sánh với hiện tại — ưu tiên sample nằm sau mốc `clockMinute - window`,
 * fallback sang sample sớm nhất trong hiệp (nếu cách hiện tại ≥ 1 phút). Trả về null nếu data thưa quá.
 */
function pickPastEntry(
    entries: TimelineEntry[],
    clockMinute: number,
    window: number,
): { stats: ProcessedStats; pastMinute: number } | null {
    if (entries.length === 0) return null;
    const sortedPast = entries
        .filter((e) => e.minute <= clockMinute - window)
        .sort((a, b) => b.minute - a.minute);
    if (sortedPast.length > 0) {
        const e = sortedPast[0];
        if (clockMinute - e.minute > window + 10) return null;
        return { stats: e.stats, pastMinute: e.minute };
    }
    const earliest = entries[0];
    if (clockMinute - earliest.minute < 1) return null;
    return { stats: earliest.stats, pastMinute: earliest.minute };
}

export type DominantSide = 'home' | 'away' | 'tie';

const dominantOf = (home: number, away: number, epsilon = 0.05): DominantSide => {
    if (Math.abs(home - away) < epsilon) return 'tie';
    return home > away ? 'home' : 'away';
};

export interface MomentumBreakdown {
    /** Δ điểm API của đội nhà trong cửa sổ */
    home: number;
    /** Δ điểm API của đội khách trong cửa sổ */
    away: number;
    /** home + away — tương đương `apiMomentum` cũ */
    total: number;
    /** home - away (>0 nghĩa là chủ nhà đang dồn ép hơn) */
    diff: number;
    /** Bên nào đang chiếm thế (epsilon ~ 0.05) */
    dominant: DominantSide;
    /** Cửa sổ thực tế (clockMinute - pastMinute) — có thể khác `window` do data thưa */
    windowEffective: number | null;
}

export const getMomentumBreakdown = (
    clockMinute: number,
    window: number,
    statsHistory: Record<number, ProcessedStats>,
    currentParsedStats: ProcessedStats,
    half: MatchHalf,
): MomentumBreakdown => {
    const empty: MomentumBreakdown = {
        home: 0,
        away: 0,
        total: 0,
        diff: 0,
        dominant: 'tie',
        windowEffective: null,
    };
    const entries = statEntriesForHalf(statsHistory, half);
    const past = pickPastEntry(entries, clockMinute, window);
    if (!past) return empty;
    const home = calculateAPIScore(currentParsedStats, 0) - calculateAPIScore(past.stats, 0);
    const away = calculateAPIScore(currentParsedStats, 1) - calculateAPIScore(past.stats, 1);
    return {
        home,
        away,
        total: home + away,
        diff: home - away,
        dominant: dominantOf(home, away),
        windowEffective: clockMinute - past.pastMinute,
    };
};

export interface ShotClusterBreakdown {
    /** Δ "shot score" đội nhà = on*3 + off*1 */
    home: number;
    away: number;
    total: number;
    dominant: DominantSide;
    windowEffective: number | null;
}

const shotScoreSide = (s: ProcessedStats, side: 0 | 1) =>
    s.on_target[side] * 3.0 + s.off_target[side] * 1.0;

export const getShotClusterBreakdown = (
    clockMinute: number,
    window: number,
    statsHistory: Record<number, ProcessedStats>,
    currentParsedStats: ProcessedStats,
    half: MatchHalf,
): ShotClusterBreakdown => {
    const empty: ShotClusterBreakdown = {
        home: 0,
        away: 0,
        total: 0,
        dominant: 'tie',
        windowEffective: null,
    };
    const entries = statEntriesForHalf(statsHistory, half);
    const past = pickPastEntry(entries, clockMinute, window);
    if (!past) return empty;
    const home = Math.max(0, shotScoreSide(currentParsedStats, 0) - shotScoreSide(past.stats, 0));
    const away = Math.max(0, shotScoreSide(currentParsedStats, 1) - shotScoreSide(past.stats, 1));
    return {
        home,
        away,
        total: home + away,
        dominant: dominantOf(home, away),
        windowEffective: clockMinute - past.pastMinute,
    };
};

export interface MarketPoint {
    minute: number;
    colorName?: string;
    highlight?: boolean;
    half?: MatchHalf;
}

const sumIntensity = (
    chartData: readonly MarketPoint[],
    minute: number,
    range: number,
    half: MatchHalf,
): number =>
    chartData
        .filter(
            (b) =>
                (b.half ?? 1) === half &&
                b.minute >= minute - range &&
                b.minute <= minute &&
                (b.colorName === 'red' || b.highlight),
        )
        .reduce((acc, b) => acc + (b.highlight ? PRESSURE_HIGHLIGHT_WEIGHT : 1.0), 0);

export interface MarketPressureBreakdown {
    /** Cường độ áp lực OU trong cửa sổ — đếm điểm Tài giảm HOẶC Xỉu tăng (Xỉu giảm = bình thường, bỏ qua) */
    ou: number;
    /** Cường độ giảm giá kèo Chấp trong cửa sổ */
    ah: number;
    /** ou + ah — tương đương `pressure` cũ */
    total: number;
    /** Bên kèo nào đang bị đẩy mạnh hơn */
    dominantMarket: 'ou' | 'ah' | 'tie';
}

export const getMarketPressure = (
    ouChart: readonly MarketPoint[],
    ahChart: readonly MarketPoint[],
    clockMinute: number,
    range: number,
    half: MatchHalf,
): MarketPressureBreakdown => {
    const ou = sumIntensity(ouChart, clockMinute, range, half);
    const ah = sumIntensity(ahChart, clockMinute, range, half);
    const dominantMarket: 'ou' | 'ah' | 'tie' =
        Math.abs(ou - ah) < 0.1 ? 'tie' : ou > ah ? 'ou' : 'ah';
    return { ou, ah, total: ou + ah, dominantMarket };
};

export interface StatsStaleness {
    /** Phút của sample mới nhất trong hiệp đang xét (null nếu chưa có sample nào) */
    lastSampleMinute: number | null;
    /** clockMinute - lastSampleMinute. Infinity nếu chưa có sample. */
    staleMinutes: number;
    /** True nếu staleMinutes > threshold — Động lực/Cụm sút nên hiển thị "—" */
    isStale: boolean;
}

export const getStatsStaleness = (
    clockMinute: number,
    statsHistory: Record<number, ProcessedStats>,
    half: MatchHalf,
    threshold: number = STALENESS_THRESHOLD_MIN,
): StatsStaleness => {
    const entries = statEntriesForHalf(statsHistory, half);
    if (entries.length === 0) {
        return {
            lastSampleMinute: null,
            staleMinutes: Number.POSITIVE_INFINITY,
            isStale: true,
        };
    }
    const last = entries[entries.length - 1];
    const stale = Math.max(0, clockMinute - last.minute);
    return {
        lastSampleMinute: last.minute,
        staleMinutes: stale,
        isStale: stale > threshold,
    };
};

export interface TraditionalFactorsBundle {
    minute: number;
    window: number;
    pressureRange: number;
    momentum: MomentumBreakdown;
    shotCluster: ShotClusterBreakdown;
    pressure: MarketPressureBreakdown;
    staleness: StatsStaleness;
}
