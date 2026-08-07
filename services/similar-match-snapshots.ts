/**
 * Lưu kết quả "tương tự" — tự động (H1 10', H2 52') và thủ công (nút Tương tự).
 */

import { safeSetItem } from './safe-storage';
import type {
  AiSimilarEvaluation,
  CumulativeTotals,
  HalfGoalStats,
  Label30Stats,
  OpeningLinesRef,
  SimilarMatchFull,
} from './goal-prediction';

/** Phút H2 tự chạy similar — trước đây là 55. */
export const AUTO_SIMILAR_H2_MINUTE = 52;

/**
 * Tự chạy "Tương tự" theo đồng hồ (H1 10' / H2 52').
 * `false` = tắt; vẫn dùng được nút thủ công + auto khi đổi line 1_3.
 */
export const AUTO_SIMILAR_CLOCK_ENABLED = false;

/** Mốc lịch tự chạy similar — phút 10 H1, phút 52 H2. */
export const AUTO_SIMILAR_MARKS = [
  { half: 1 as const, minute: 10 },
  { half: 2 as const, minute: AUTO_SIMILAR_H2_MINUTE },
] as const;

export type AutoSimilarMark = (typeof AUTO_SIMILAR_MARKS)[number];
export type ClockAutoSimilarSlot = 'h1-10' | 'h2-52';
/** Slot đổi line 1_3 — vd `ou-h2-2_75`. */
export type OuLineAutoSimilarSlot = `ou-h${1 | 2}-${string}`;
export type AutoSimilarSlot = ClockAutoSimilarSlot | OuLineAutoSimilarSlot;

export type SimilarCaptureTrigger = 'clock' | 'ou_line_change';

/** Slot cũ (localStorage) — vẫn coi là đã chụp H2. */
const LEGACY_H2_SLOT = 'h2-55' as const;
const LEGACY_H2_MINUTE = 55;

export interface SimilarMatchSnapshotData {
  queryFeatures?: Record<string, number>;
  openingLines?: OpeningLinesRef;
  similarMatchesOpenLine?: SimilarMatchFull[];
  similarMatchesOpenLineCatalog?: SimilarMatchFull[];
  similarMatchesOpenLineCatalogRuns?: SimilarMatchFull[];
  queryOu13LineRuns?: string;
  currentTotals?: CumulativeTotals | null;
  openingLineNotice?: string;
  /** Lớp AI (DeepSeek) đánh giá — chỉ có khi snapshot được chụp qua /similar/evaluate. */
  aiEvaluation?: AiSimilarEvaluation | null;
  aiDisabledReason?: string;
  label30ByTier?: Record<'openLine' | 'catalog' | 'catalogRuns', Label30Stats>;
  labelHalfByTier?: Record<'openLine' | 'catalog' | 'catalogRuns', Label30Stats>;
  /** RAG "% có bàn theo hiệp" theo vạch mở T/X (+ điều kiện hiệp trước, kèo chấp mềm). */
  halfGoalStats?: HalfGoalStats;
}

export interface SimilarMatchSnapshot {
  id: string;
  half: 1 | 2;
  minute: number;
  ts: number;
  /** Tỷ số tại thời điểm chụp. */
  score: string;
  /** true = chụp tự động tại mốc; false = user bấm nút Tương tự. */
  auto: boolean;
  /** Slot mốc tự động (H1 10' / H2 52'). */
  autoSlot?: AutoSimilarSlot | typeof LEGACY_H2_SLOT;
  scheduledHalf?: 1 | 2;
  scheduledMinute?: number;
  /** true = mở trận muộn, chụp tại phút mở thay vì đúng mốc 10/52. */
  lateCapture?: boolean;
  /** Đổi line 1_3 kích hoạt auto similar. */
  trigger?: SimilarCaptureTrigger;
  lineChange?: { prevHandicap: number; newHandicap: number };
  error?: string;
  data?: SimilarMatchSnapshotData;
}

export interface SessionJoinClock {
  half: 1 | 2;
  minute: number;
}

export interface AutoSimilarCapturePlan {
  slot: AutoSimilarSlot;
  scheduledHalf: 1 | 2;
  scheduledMinute: number;
  captureHalf: 1 | 2;
  captureMinute: number;
  lateCapture: boolean;
}

const SIMILAR_SNAPSHOTS_MAX = 20;
export const SIMILAR_MATCH_SNAPSHOTS_UPDATED_EVENT = 'proFootball:similarMatchSnapshotsUpdated';

function snapshotsKey(matchId: string): string {
  return `similarMatchSnapshots_${matchId}`;
}

export function similarSnapshotMarkId(half: 1 | 2, minute: number): string {
  return `${half}-${minute}`;
}

function normalizeAutoSlot(
  slot: AutoSimilarSlot | typeof LEGACY_H2_SLOT | undefined,
): AutoSimilarSlot | null {
  if (!slot) return null;
  if (slot === LEGACY_H2_SLOT) return 'h2-52';
  return slot;
}

function slotFromSnapshot(s: SimilarMatchSnapshot): AutoSimilarSlot | null {
  if (s.autoSlot) return normalizeAutoSlot(s.autoSlot);
  if (s.half === 1 && s.minute === 10) return 'h1-10';
  if (s.half === 2 && (s.minute === AUTO_SIMILAR_H2_MINUTE || s.minute === LEGACY_H2_MINUTE)) {
    return 'h2-52';
  }
  return null;
}

/** @deprecated alias */
function legacySlotFromSnapshot(s: SimilarMatchSnapshot): AutoSimilarSlot | null {
  return slotFromSnapshot(s);
}

export function hasAutoSimilarForSlot(
  snapshots: SimilarMatchSnapshot[],
  slot: AutoSimilarSlot,
): boolean {
  return snapshots.some((s) => slotFromSnapshot(s) === slot);
}

/** @deprecated Dùng hasAutoSimilarForSlot — giữ tương thích. */
export function hasSimilarSnapshotAtMark(
  snapshots: SimilarMatchSnapshot[],
  half: 1 | 2,
  minute: number,
): boolean {
  const slot: AutoSimilarSlot | null =
    half === 1 && minute === 10
      ? 'h1-10'
      : half === 2 && (minute === AUTO_SIMILAR_H2_MINUTE || minute === LEGACY_H2_MINUTE)
        ? 'h2-52'
        : null;
  if (slot) return hasAutoSimilarForSlot(snapshots, slot);
  return snapshots.some((s) => s.half === half && s.minute === minute);
}

/**
 * Quyết định có nên chụp similar tự động không.
 * - Xem từ trước mốc → chụp đúng phút 10 / 52.
 * - Mở trận muộn (đã qua mốc) → chụp ngay tại phút mở.
 * - Khi `AUTO_SIMILAR_CLOCK_ENABLED === false` → không lên lịch.
 */
export function planAutoSimilarCaptures(
  clock: { half: 1 | 2; minute: number },
  join: SessionJoinClock | null,
  snapshots: SimilarMatchSnapshot[],
): AutoSimilarCapturePlan[] {
  if (!AUTO_SIMILAR_CLOCK_ENABLED) return [];

  const plans: AutoSimilarCapturePlan[] = [];

  if (!hasAutoSimilarForSlot(snapshots, 'h1-10')) {
    if (clock.half === 1 && clock.minute >= 10) {
      const joinedLate = join == null || join.half > 1 || (join.half === 1 && join.minute > 10);
      plans.push({
        slot: 'h1-10',
        scheduledHalf: 1,
        scheduledMinute: 10,
        captureHalf: 1,
        captureMinute: joinedLate ? clock.minute : 10,
        lateCapture: joinedLate,
      });
    } else if (clock.half === 2) {
      plans.push({
        slot: 'h1-10',
        scheduledHalf: 1,
        scheduledMinute: 10,
        captureHalf: clock.half,
        captureMinute: clock.minute,
        lateCapture: true,
      });
    }
  }

  if (!hasAutoSimilarForSlot(snapshots, 'h2-52')) {
    if (clock.half === 2 && clock.minute >= AUTO_SIMILAR_H2_MINUTE) {
      const joinedLate =
        join == null || join.half < 2 || (join.half === 2 && join.minute > AUTO_SIMILAR_H2_MINUTE);
      plans.push({
        slot: 'h2-52',
        scheduledHalf: 2,
        scheduledMinute: AUTO_SIMILAR_H2_MINUTE,
        captureHalf: 2,
        captureMinute: joinedLate ? clock.minute : AUTO_SIMILAR_H2_MINUTE,
        lateCapture: joinedLate,
      });
    }
  }

  return plans;
}

/** Các mốc đang chờ (chưa tới phút 10 / 52). */
export function pendingAutoSimilarSlots(
  clock: { half: 1 | 2; minute: number },
  snapshots: SimilarMatchSnapshot[],
): AutoSimilarSlot[] {
  if (!AUTO_SIMILAR_CLOCK_ENABLED) return [];

  const pending: AutoSimilarSlot[] = [];
  if (!hasAutoSimilarForSlot(snapshots, 'h1-10') && clock.half === 1 && clock.minute < 10) {
    pending.push('h1-10');
  }
  if (
    !hasAutoSimilarForSlot(snapshots, 'h2-52')
    && clock.half === 2
    && clock.minute < AUTO_SIMILAR_H2_MINUTE
  ) {
    pending.push('h2-52');
  }
  return pending;
}

export function formatAutoSimilarLabel(snap: SimilarMatchSnapshot): string {
  if (!snap.auto) {
    return `H${snap.half} ${snap.minute}' · thủ công`;
  }
  if (snap.trigger === 'ou_line_change' && snap.lineChange) {
    const { prevHandicap, newHandicap } = snap.lineChange;
    return `H${snap.half} line ${prevHandicap}→${newHandicap} · p${snap.minute}'`;
  }
  const slot = slotFromSnapshot(snap);
  const schedHalf =
    snap.scheduledHalf ?? (slot === 'h2-52' ? 2 : slot === 'h1-10' ? 1 : snap.half);
  const schedMin =
    snap.scheduledMinute
    ?? (slot === 'h2-52'
      ? AUTO_SIMILAR_H2_MINUTE
      : slot === 'h1-10'
        ? 10
        : snap.minute);
  if (snap.lateCapture) {
    return `H${schedHalf} · mở muộn p${snap.minute}'`;
  }
  return `H${schedHalf} ${schedMin}'`;
}

export function loadSimilarMatchSnapshots(matchId: string): SimilarMatchSnapshot[] {
  try {
    const raw = localStorage.getItem(snapshotsKey(matchId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (s): s is SimilarMatchSnapshot =>
        s != null &&
        typeof s === 'object' &&
        typeof (s as SimilarMatchSnapshot).id === 'string' &&
        typeof (s as SimilarMatchSnapshot).minute === 'number' &&
        typeof (s as SimilarMatchSnapshot).ts === 'number' &&
        ((s as SimilarMatchSnapshot).half === 1 || (s as SimilarMatchSnapshot).half === 2) &&
        typeof (s as SimilarMatchSnapshot).score === 'string',
    );
  } catch {
    return [];
  }
}

export function appendSimilarMatchSnapshot(
  matchId: string,
  snapshot: Omit<SimilarMatchSnapshot, 'id' | 'auto'>,
): { snapshots: SimilarMatchSnapshot[]; saved: boolean } {
  const list = loadSimilarMatchSnapshots(matchId);
  const isAuto = !!snapshot.autoSlot;
  const id = isAuto
    ? (snapshot.autoSlot ?? similarSnapshotMarkId(snapshot.half, snapshot.minute))
    : `manual-${snapshot.ts}`;
  const filtered = list.filter((s) => {
    if (!isAuto || !snapshot.autoSlot) return true;
    const slot = normalizeAutoSlot(snapshot.autoSlot);
    return !(slot && slotFromSnapshot(s) === slot);
  });
  filtered.push({ id, auto: isAuto, ...snapshot });
  filtered.sort((a, b) => a.ts - b.ts);
  const trimmed =
    filtered.length > SIMILAR_SNAPSHOTS_MAX
      ? filtered.slice(-SIMILAR_SNAPSHOTS_MAX)
      : filtered;
  const saved = safeSetItem(snapshotsKey(matchId), JSON.stringify(trimmed), { keepMatchId: matchId });
  if (saved) {
    window.dispatchEvent(
      new CustomEvent(SIMILAR_MATCH_SNAPSHOTS_UPDATED_EVENT, { detail: { matchId } }),
    );
  } else {
    console.warn('[similar-match-snapshots] appendSimilarMatchSnapshot: không lưu được localStorage');
  }
  return { snapshots: saved ? trimmed : list, saved };
}

/** Key localStorage — bật/tắt auto similar khi đổi line 1_3 (theo trận). */
export function autoSimilarOnLineChangeKey(matchId: string): string {
  return `autoSimilarOnLineChange_${matchId}`;
}

/** Mặc định tắt; user bật theo trận nếu muốn auto khi đổi line 1_3. */
export function loadAutoSimilarOnLineChangeEnabled(matchId: string): boolean {
  try {
    const v = localStorage.getItem(autoSimilarOnLineChangeKey(matchId));
    if (v === null) return false;
    return v === '1';
  } catch {
    return false;
  }
}

export function setAutoSimilarOnLineChangeEnabled(matchId: string, enabled: boolean): void {
  safeSetItem(autoSimilarOnLineChangeKey(matchId), enabled ? '1' : '0', { keepMatchId: matchId });
}
