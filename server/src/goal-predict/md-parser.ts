/**
 * Parser cho file `.md` trong thư mục `History/` (Pro Football Analytics auto-export).
 * Trích các section quan trọng: metadata, stats theo phút, events, alerts, odds JSON appendix.
 */

const STAT_KEY_HALF2_OFFSET = 512;

export type Half = 1 | 2;

export interface MatchMeta {
  matchId: string;
  homeName: string;
  awayName: string;
  league: string;
  finalScore: string;
  ftStatus: string;
  viewedAtMs: number | null;
  timerRaw: string;
}

export interface StatRow {
  /** Match clock minute (e.g. 0-50 H1 inc. stoppage, 45-95+ H2). */
  clockMinute: number;
  half: Half;
  /** [home, away] integer counters. */
  attacks: [number, number];
  dangerous: [number, number];
  onTarget: [number, number];
  offTarget: [number, number];
  corners: [number, number];
  yellow: [number, number];
  red: [number, number];
}

export interface EventEntry {
  clockMinute: number;
  half: Half;
  type: 'goal' | 'corner';
}

export interface AlertEntry {
  clockMinute: number;
  half: Half;
  type: string;
  pressure: number;
}

export type MarketId = '1_3' | '1_2' | '1_6' | '1_5';

export interface OddsSnap {
  marketId: MarketId;
  clockMinute: number;
  half: Half;
  handicap: number;
  /** OU markets (1_3, 1_6). */
  over?: number;
  under?: number;
  /** AH markets (1_2, 1_5). */
  home?: number;
  away?: number;
}

export interface ParsedMatch {
  meta: MatchMeta;
  stats: StatRow[];
  events: EventEntry[];
  alerts: AlertEntry[];
  odds: OddsSnap[];
}

export function decodeStatKey(key: number): { half: Half; clockMinute: number } {
  if (key >= STAT_KEY_HALF2_OFFSET) return { half: 2, clockMinute: key - STAT_KEY_HALF2_OFFSET };
  return { half: 1, clockMinute: key };
}

function parseHASplit(cell: string): [number, number] {
  const m = cell.split('/').map((s) => parseInt(s.trim(), 10));
  return [Number.isFinite(m[0]) ? m[0] : 0, Number.isFinite(m[1]) ? m[1] : 0];
}

function getSection(content: string, headingRe: RegExp): string | null {
  const m = content.match(headingRe);
  if (!m || m.index == null) return null;
  const start = m.index + m[0].length;
  const rest = content.slice(start);
  const nextHeading = rest.search(/\n## /);
  return nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
}

function parseMeta(content: string): MatchMeta {
  const titleMatch = content.match(/^# Trận đấu — (.+?) vs (.+?)$/m);
  const homeName = titleMatch?.[1]?.trim() ?? '';
  const awayName = titleMatch?.[2]?.trim() ?? '';

  const lookup = (label: string): string => {
    const re = new RegExp(`\\|\\s*${label.replace(/[/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`);
    return content.match(re)?.[1]?.trim() ?? '';
  };

  const matchIdRaw = lookup('Match ID');
  const matchId = matchIdRaw.replace(/`/g, '').trim();
  const league = lookup('Giải');
  const finalScore = lookup('Tỷ số');
  const ftStatus = lookup('Thời điểm / trạng thái');
  const viewedAtStr = lookup('viewedAt (Unix ms)');
  const viewedAtMs = viewedAtStr ? Number(viewedAtStr) : null;
  const timerRaw = lookup('timer (raw)').replace(/`/g, '').trim();

  return { matchId, homeName, awayName, league, finalScore, ftStatus, viewedAtMs: Number.isFinite(viewedAtMs as number) ? (viewedAtMs as number) : null, timerRaw };
}

function parseStatsTable(content: string): StatRow[] {
  const section = getSection(content, /\n## Thống kê theo phút \(statsHistory\)\n/);
  if (!section) return [];
  const rows: StatRow[] = [];
  const lineRe = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(section)) !== null) {
    const key = parseInt(m[1], 10);
    if (!Number.isFinite(key)) continue;
    const { half, clockMinute } = decodeStatKey(key);
    rows.push({
      clockMinute,
      half,
      attacks: parseHASplit(m[2]),
      dangerous: parseHASplit(m[3]),
      onTarget: parseHASplit(m[4]),
      offTarget: parseHASplit(m[5]),
      corners: parseHASplit(m[6]),
      yellow: parseHASplit(m[7]),
      red: parseHASplit(m[8]),
    });
  }
  return rows;
}

function parseEventsTable(content: string): EventEntry[] {
  const section = getSection(content, /\n## Sự kiện trận \(goal, corner\)\n/);
  if (!section) return [];
  const out: EventEntry[] = [];
  const re = /^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(goal|corner)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const half = parseInt(m[2], 10) as Half;
    if (half !== 1 && half !== 2) continue;
    out.push({ clockMinute: parseInt(m[1], 10), half, type: m[3] as 'goal' | 'corner' });
  }
  return out;
}

function parseAlertsTable(content: string): AlertEntry[] {
  const section = getSection(content, /\n## Nhật ký cảnh báo \(alertHistory\)\n/);
  if (!section) return [];
  const out: AlertEntry[] = [];
  const re = /^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const minute = parseInt(m[1], 10);
    const half = parseInt(m[2], 10) as Half;
    const type = m[3].trim();
    const pressure = parseInt(m[4], 10);
    if (!Number.isFinite(minute) || (half !== 1 && half !== 2)) continue;
    out.push({ clockMinute: minute, half, type, pressure });
  }
  return out;
}

function parseOddsAppendix(content: string, market: MarketId): OddsSnap[] {
  const labelMap: Record<MarketId, string> = {
    '1_3': 'OU cả trận',
    '1_2': 'AH cả trận',
    '1_6': 'OU hiệp 1',
    '1_5': 'AH hiệp 1',
  };
  const headingRe = new RegExp(`### Phụ lục JSON: ${market} \\(${labelMap[market]}\\)\\s*\\n+\`\`\`json\\n([\\s\\S]*?)\\n\`\`\``);
  const m = content.match(headingRe);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1]) as Array<Record<string, unknown>>;
    return arr
      .map((r) => {
        const half = Number(r.half) === 2 ? 2 : 1;
        const minute = Number(r.minute);
        const handicap = Number(r.handicap);
        if (!Number.isFinite(minute) || !Number.isFinite(handicap)) return null;
        const snap: OddsSnap = { marketId: market, clockMinute: minute, half: half as Half, handicap };
        if (r.over != null) snap.over = Number(r.over);
        if (r.under != null) snap.under = Number(r.under);
        if (r.home != null) snap.home = Number(r.home);
        if (r.away != null) snap.away = Number(r.away);
        return snap;
      })
      .filter((x): x is OddsSnap => x !== null);
  } catch {
    return [];
  }
}

export function parseMatchFile(content: string): ParsedMatch {
  const meta = parseMeta(content);
  const stats = parseStatsTable(content);
  const events = parseEventsTable(content);
  const alerts = parseAlertsTable(content);
  const odds: OddsSnap[] = [
    ...parseOddsAppendix(content, '1_3'),
    ...parseOddsAppendix(content, '1_2'),
    ...parseOddsAppendix(content, '1_6'),
    ...parseOddsAppendix(content, '1_5'),
  ];
  return { meta, stats, events, alerts, odds };
}
