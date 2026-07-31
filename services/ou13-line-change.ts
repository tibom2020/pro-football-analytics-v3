import type { OverUnderMinuteSnapshot } from '../types';

const LINE_EPS = 0.001;

export interface Ou13LineChange {
  half: 1 | 2;
  minute: number;
  prevHandicap: number;
  newHandicap: number;
}

/** Slot dedupe: mỗi giá trị line mới / hiệp chỉ chụp similar 1 lần. */
export function lineChangeSlot(half: 1 | 2, newHandicap: number): `ou-h${1 | 2}-${string}` {
  const lineKey = String(newHandicap).replace(/\./g, '_');
  return `ou-h${half}-${lineKey}`;
}

function latestOu13ByHalf(rows: OverUnderMinuteSnapshot[]): Map<1 | 2, OverUnderMinuteSnapshot> {
  const out = new Map<1 | 2, OverUnderMinuteSnapshot>();
  for (const r of rows) {
    if (r.marketId !== '1_3') continue;
    const half: 1 | 2 = r.half === 2 ? 2 : 1;
    const prev = out.get(half);
    if (!prev || r.minute >= prev.minute) out.set(half, r);
  }
  return out;
}

export interface Ou13LatestLine {
  half: 1 | 2;
  minute: number;
  handicap: number;
}

/**
 * So với baseline đã chấp nhận (không phụ thuộc tham chiếu mảng odds cũ).
 * Poll mới rebuild toàn bộ history vẫn không báo đổi line nếu line mới nhất không đổi.
 */
export function advanceOu13LineBaseline(
  baseline: Map<1 | 2, Ou13LatestLine>,
  rows: OverUnderMinuteSnapshot[],
): Ou13LineChange[] {
  const latest = latestOu13ByHalf(rows);
  const changes: Ou13LineChange[] = [];

  for (const half of [1, 2] as const) {
    const n = latest.get(half);
    if (!n) continue;
    const b = baseline.get(half);
    if (!b) {
      baseline.set(half, { half, minute: n.minute, handicap: n.handicap });
      continue;
    }
    if (Math.abs(b.handicap - n.handicap) <= LINE_EPS) {
      if (n.minute >= b.minute) {
        baseline.set(half, { half, minute: n.minute, handicap: n.handicap });
      }
      continue;
    }
    changes.push({
      half,
      minute: n.minute,
      prevHandicap: b.handicap,
      newHandicap: n.handicap,
    });
    baseline.set(half, { half, minute: n.minute, handicap: n.handicap });
  }

  return changes;
}

/**
 * So sánh hai bản oddsHistory — phát hiện đổi handicap 1_3 theo hiệp.
 * Chỉ báo khi snapshot mới nhất mỗi hiệp có |Δhandicap| > LINE_EPS.
 * @deprecated Dùng advanceOu13LineBaseline cho auto-capture (ổn định hơn khi poll rebuild history).
 */
export function detectOu13LineChanges(
  prev: OverUnderMinuteSnapshot[],
  next: OverUnderMinuteSnapshot[],
): Ou13LineChange[] {
  if (prev.length === 0 || next.length === 0) return [];

  const prevByHalf = latestOu13ByHalf(prev);
  const nextByHalf = latestOu13ByHalf(next);
  const changes: Ou13LineChange[] = [];

  for (const half of [1, 2] as const) {
    const p = prevByHalf.get(half);
    const n = nextByHalf.get(half);
    if (!p || !n) continue;
    if (Math.abs(p.handicap - n.handicap) <= LINE_EPS) continue;
    changes.push({
      half,
      minute: n.minute,
      prevHandicap: p.handicap,
      newHandicap: n.handicap,
    });
  }

  return changes;
}
