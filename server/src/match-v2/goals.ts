import type { GoalFromSs, RawOddsRecord } from './types.js';

function parseScore(ss: string): { home: number; away: number } | null {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(ss.trim());
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
}

function addTimeNum(r: RawOddsRecord): number {
  const n = Number(r.add_time);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/**
 * Nguồn nhãn bàn thắng chính thức từ chuỗi `ss` trên odds.
 * Sắp theo add_time tăng dần; chỉ bản ghi time_str != null.
 * ss đi lùi → type "cancelled" (không lọc bỏ).
 */
export function buildGoalsFromSs(records: RawOddsRecord[]): GoalFromSs[] {
  const sorted = records
    .filter((r) => r.time_str != null && String(r.time_str).trim() !== '')
    .filter((r) => r.ss != null && String(r.ss).trim() !== '')
    .slice()
    .sort((a, b) => {
      const d = addTimeNum(a) - addTimeNum(b);
      if (d !== 0) return d;
      return String(a.id).localeCompare(String(b.id));
    });

  const goals: GoalFromSs[] = [];
  let prevSs: string | null = null;

  for (const r of sorted) {
    const ss = String(r.ss);
    if (prevSs === null) {
      prevSs = ss;
      continue;
    }
    if (ss === prevSs) continue;

    const from = parseScore(prevSs);
    const to = parseScore(ss);
    const add_time = Number(r.add_time);
    const time_str = String(r.time_str);

    if (!from || !to || !Number.isFinite(add_time)) {
      prevSs = ss;
      continue;
    }

    const homeDelta = to.home - from.home;
    const awayDelta = to.away - from.away;

    let type: GoalFromSs['type'] = 'goal';
    let side: GoalFromSs['side'] = 'unknown';

    if (homeDelta < 0 || awayDelta < 0 || homeDelta + awayDelta < 0) {
      type = 'cancelled';
      if (homeDelta < 0 && awayDelta >= 0) side = 'home';
      else if (awayDelta < 0 && homeDelta >= 0) side = 'away';
      else side = 'unknown';
    } else if (homeDelta > 0 && awayDelta === 0) {
      side = 'home';
      type = 'goal';
    } else if (awayDelta > 0 && homeDelta === 0) {
      side = 'away';
      type = 'goal';
    } else {
      // Đổi bất thường (cả hai cùng tăng, v.v.) — vẫn ghi
      side = homeDelta >= awayDelta ? 'home' : 'away';
      type = 'goal';
    }

    goals.push({
      add_time,
      time_str,
      from: prevSs,
      to: ss,
      side,
      type,
    });
    prevSs = ss;
  }

  return goals;
}
