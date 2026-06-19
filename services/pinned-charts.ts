/**
 * Ghim biểu đồ Kèo Tài/Xỉu (1_3) của các trận tương tự — lưu localStorage;
 * mỗi ghim gắn `sourceMatchId` (trận đang xem lúc ghim) để Dashboard chỉ hiện ghim của trận đó.
 */
import { safeSetItem } from './safe-storage';

/** Key localStorage (global) chứa danh sách trận đã ghim. */
export const PINNED_CHARTS_KEY = 'pfa_pinned_ou13_charts';
/** Event phát khi danh sách ghim thay đổi — Dashboard / modal lắng nghe để đồng bộ. */
export const PINNED_CHARTS_UPDATED_EVENT = 'proFootball:pinnedChartsUpdated';
/** Giới hạn số trận ghim để khỏi phình localStorage. */
const PINNED_CHARTS_MAX = 30;

/** 1 trận tương tự đã ghim — đủ dữ liệu để mở lại Ou13ChartModal độc lập (chỉ theo matchId + marker). */
export interface PinnedChart {
  /** matchId trận tương tự. */
  matchId: string;
  /** matchId trận đang xem trên Dashboard lúc ghim. */
  sourceMatchId?: string;
  /** "Home vs Away". */
  team: string;
  /** Tỷ số chung cuộc. */
  ft?: string;
  half?: 1 | 2;
  minute?: number;
  /** Kết cục 15': 1 = có bàn, 0 = không. */
  label?: 0 | 1;
  /** Kết cục 30': 1 = có bàn, 0 = không. */
  label30?: 0 | 1;
  similarity?: number;
  /** Snapshot features tại phút tình huống — phục vụ "Mở tab mới". */
  feats?: Record<string, number>;
  /** Unix ms lúc ghim. */
  pinnedAt: number;
}

function normMatchId(id: unknown): string | undefined {
  if (id == null || id === '') return undefined;
  return String(id);
}

/** Chuẩn hoá id — API B365 đôi khi trả number, URL/query thì string. */
function normalizePin(pin: PinnedChart): PinnedChart {
  const matchId = normMatchId(pin.matchId);
  if (!matchId) return pin;
  return {
    ...pin,
    matchId,
    sourceMatchId: normMatchId(pin.sourceMatchId),
  };
}

/** Đọc danh sách ghim từ localStorage (validate tối thiểu, bọc try/catch). */
export function loadPinnedCharts(): PinnedChart[] {
  try {
    const raw = localStorage.getItem(PINNED_CHARTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is PinnedChart =>
          !!e &&
          typeof e === 'object' &&
          (typeof (e as PinnedChart).matchId === 'string' ||
            typeof (e as PinnedChart).matchId === 'number'),
      )
      .map((e) => normalizePin(e));
  } catch {
    return [];
  }
}

function samePinnedEntry(a: Pick<PinnedChart, 'matchId' | 'sourceMatchId'>, b: Pick<PinnedChart, 'matchId' | 'sourceMatchId'>): boolean {
  const aMatchId = normMatchId(a.matchId);
  const bMatchId = normMatchId(b.matchId);
  if (!aMatchId || !bMatchId || aMatchId !== bMatchId) return false;
  const aSrc = normMatchId(a.sourceMatchId);
  const bSrc = normMatchId(b.sourceMatchId);
  if (aSrc && bSrc) return aSrc === bSrc;
  if (!aSrc && !bSrc) return true;
  return false;
}

/** Đã ghim trận tương tự này cho trận đang xem chưa? */
export function isChartPinned(similarMatchId: string, sourceMatchId?: string): boolean {
  return loadPinnedCharts().some((p) => samePinnedEntry(p, { matchId: similarMatchId, sourceMatchId }));
}

/** Ghim của một trận đang xem (Dashboard). */
export function loadPinnedChartsForMatch(sourceMatchId: string): PinnedChart[] {
  const src = normMatchId(sourceMatchId);
  if (!src) return [];
  return loadPinnedCharts().filter((p) => p.sourceMatchId === src);
}

function save(list: PinnedChart[]): boolean {
  const normalized = list.map((p) => normalizePin(p));
  const keepMatchId = normalized.find((p) => p.sourceMatchId)?.sourceMatchId;
  const saved = safeSetItem(PINNED_CHARTS_KEY, JSON.stringify(normalized), { keepMatchId });
  if (saved) {
    window.dispatchEvent(new CustomEvent(PINNED_CHARTS_UPDATED_EVENT));
  }
  return saved;
}

/**
 * Bật/tắt ghim theo matchId. Trả về trạng thái pinned MỚI (true = vừa ghim, false = vừa bỏ ghim).
 * Khi ghim mới đẩy lên đầu danh sách, cắt bớt nếu vượt giới hạn.
 */
export function togglePinnedChart(pin: PinnedChart): boolean {
  const normalized = normalizePin(pin);
  const list = loadPinnedCharts();
  const idx = list.findIndex((p) => samePinnedEntry(p, normalized));
  if (idx >= 0) {
    list.splice(idx, 1);
    if (save(list)) return false;
    return isChartPinned(normalized.matchId, normalized.sourceMatchId);
  }
  const next = [{ ...normalized, pinnedAt: normalized.pinnedAt || Date.now() }, ...list].slice(
    0,
    PINNED_CHARTS_MAX,
  );
  if (save(next)) return true;
  return isChartPinned(normalized.matchId, normalized.sourceMatchId);
}

/** Bỏ ghim 1 trận tương tự (theo cặp sourceMatchId + matchId nếu có). */
export function removePinnedChart(pin: Pick<PinnedChart, 'matchId' | 'sourceMatchId'>): void {
  const list = loadPinnedCharts();
  const next = list.filter((p) => !samePinnedEntry(p, pin));
  if (next.length !== list.length) save(next);
}
