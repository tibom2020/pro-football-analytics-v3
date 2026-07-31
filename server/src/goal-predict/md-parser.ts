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
  team?: 'home' | 'away';
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

/** Nhận định người dùng tự ghi (parse từ section "## Nhận định người dùng"). */
export interface UserNote {
  minute: number;
  half: Half;
  /** Người dùng tự đánh giá: 'yes' | 'no' | null (chưa chọn). */
  verdict: 'yes' | 'no' | null;
  text: string;
}

export interface ParsedMatch {
  meta: MatchMeta;
  stats: StatRow[];
  events: EventEntry[];
  alerts: AlertEntry[];
  odds: OddsSnap[];
  userNotes: UserNote[];
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
  // Khớp TỪNG dòng (không cờ /g nhiều dòng) — tránh regex "team" ngốn dấu `|` đầu dòng kế
  // khi bảng chỉ có 3 cột `| Phút | Hiệp | Loại |` (làm mất một nửa số hàng). Cột team (cột 4) tùy chọn.
  const re = /^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(goal|corner)\s*\|(?:\s*(home|away|—|-)?\s*\|)?\s*$/;
  for (const rawLine of section.split(/\r?\n/)) {
    const m = re.exec(rawLine.trim());
    if (!m) continue;
    const half = parseInt(m[2], 10) as Half;
    if (half !== 1 && half !== 2) continue;
    const type = m[3] as 'goal' | 'corner';
    const rawTeam = (m[4] ?? '').trim().toLowerCase();
    const team =
      type === 'goal' && (rawTeam === 'home' || rawTeam === 'away')
        ? (rawTeam as 'home' | 'away')
        : undefined;
    out.push({ clockMinute: parseInt(m[1], 10), half, type, team });
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

/** Parse section "## Nhận định người dùng (userNotes)" → danh sách nhận định. */
function parseUserNotesTable(content: string): UserNote[] {
  const section = getSection(content, /\n## Nhận định người dùng \(userNotes\)\n/);
  if (!section) return [];
  const out: UserNote[] = [];
  const re = /^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(YES|NO|—|-)?\s*\|\s*(.*?)\s*\|\s*$/i;
  for (const rawLine of section.split(/\r?\n/)) {
    const m = re.exec(rawLine.trim());
    if (!m) continue;
    const half = parseInt(m[2], 10) as Half;
    if (half !== 1 && half !== 2) continue;
    const v = (m[3] ?? '').toUpperCase();
    const verdict = v === 'YES' ? 'yes' : v === 'NO' ? 'no' : null;
    const text = (m[4] ?? '').replace(/\\\|/g, '|').trim();
    if (!text) continue;
    out.push({ minute: parseInt(m[1], 10), half, verdict, text });
  }
  return out;
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
  const userNotes = parseUserNotesTable(content);
  return { meta, stats, events, alerts, odds, userNotes };
}

export type SimilarMatchLinkTier = 'openLine' | 'catalog' | 'catalogRuns';

/** Row parsed from ## Liên kết trận tương tự table (mirrors frontend SimilarMatchLinkRecord). */
export interface SimilarMatchLinkRow {
  id: string;
  relatedMatchId: string;
  relatedTeam: string;
  relatedFt: string;
  relatedHalf: 1 | 2;
  relatedMinute: number;
  tier: SimilarMatchLinkTier;
  similarity?: number;
  label30?: 0 | 1;
  sourceHalf: 1 | 2;
  sourceMinute: number;
  sourceScore?: string;
  ts: number;
}

const TIER_FROM_LABEL: Record<string, SimilarMatchLinkTier> = {
  'top vạch mở': 'openLine',
  catalog: 'catalog',
  'catalog+pattern': 'catalogRuns',
};

function parseHalfMinuteCell(cell: string): { half: 1 | 2; minute: number } | null {
  const m = cell.trim().match(/^H([12])\s+(\d+)'/i);
  if (!m) return null;
  const half = parseInt(m[1], 10) as 1 | 2;
  const minute = parseInt(m[2], 10);
  if (half !== 1 && half !== 2 || !Number.isFinite(minute)) return null;
  return { half, minute };
}

function parseSelfContextCell(cell: string): {
  sourceHalf: 1 | 2;
  sourceMinute: number;
  sourceScore?: string;
} | null {
  const m = cell.trim().match(/^H([12])\s+(\d+)'(?:\s·\s*(.+))?$/i);
  if (!m) return null;
  const sourceHalf = parseInt(m[1], 10) as 1 | 2;
  const sourceMinute = parseInt(m[2], 10);
  if (sourceHalf !== 1 && sourceHalf !== 2 || !Number.isFinite(sourceMinute)) return null;
  const sourceScore = m[3]?.trim();
  return { sourceHalf, sourceMinute, sourceScore: sourceScore || undefined };
}

function parseLabel30Cell(cell: string): 0 | 1 | undefined {
  const t = cell.trim().toLowerCase();
  if (t === 'có bàn') return 1;
  if (t === 'không') return 0;
  return undefined;
}

function parseLinkTimeCell(cell: string): number {
  const m = cell.trim().match(/^(\d{2}):(\d{2})$/);
  if (!m) return 0;
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d.getTime();
}

function stripMdCell(s: string): string {
  return s.replace(/\\([|])/g, '$1').replace(/`/g, '').trim();
}

/**
 * Parse bảng liên kết trận tương tự.
 * @param ownerMatchId matchId của file .md (trận nguồn khi ghi chú).
 */
export function parseSimilarMatchLinksSection(
  content: string,
  ownerMatchId: string,
): SimilarMatchLinkRow[] {
  const section = getSection(content, /\n## Liên kết trận tương tự \(similar-match-links\)\n/);
  if (!section) return [];

  const out: SimilarMatchLinkRow[] = [];
  const lineRe =
    /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(section)) !== null) {
    const timeCell = m[1].trim();
    if (timeCell.includes('---') || timeCell === 'Thời điểm ghi') continue;

    const selfCtx = parseSelfContextCell(m[2]);
    const relHp = parseHalfMinuteCell(m[5]);
    if (!selfCtx || !relHp) continue;

    const relatedMatchId = stripMdCell(m[4]);
    if (!relatedMatchId) continue;

    const tier = TIER_FROM_LABEL[m[7].trim().toLowerCase()] ?? 'catalog';
    const simRaw = m[9].trim();
    const similarity = simRaw !== '—' && Number.isFinite(Number(simRaw)) ? Number(simRaw) : undefined;

    const sourceHalf = selfCtx.sourceHalf;
    const sourceMinute = selfCtx.sourceMinute;
    const id = `${ownerMatchId}:${relatedMatchId}:${sourceHalf}:${sourceMinute}`;

    out.push({
      id,
      relatedMatchId,
      relatedTeam: stripMdCell(m[3]),
      relatedFt: stripMdCell(m[6]),
      relatedHalf: relHp.half,
      relatedMinute: relHp.minute,
      tier,
      similarity,
      label30: parseLabel30Cell(m[8]),
      sourceHalf,
      sourceMinute,
      sourceScore: selfCtx.sourceScore,
      ts: parseLinkTimeCell(timeCell),
    });
  }
  return out;
}

/** Inbound: file owner O ghi chú Q — trả record theo góc nhìn Q. */
export function flipLinkForInbound(
  row: SimilarMatchLinkRow,
  ownerMatchId: string,
  ownerTeam: string,
  queryMatchId: string,
): SimilarMatchLinkRow | null {
  if (row.relatedMatchId !== queryMatchId) return null;
  const sourceHalf = row.relatedHalf;
  const sourceMinute = row.relatedMinute;
  const id = `${queryMatchId}:${ownerMatchId}:${sourceHalf}:${sourceMinute}`;
  return {
    id,
    relatedMatchId: ownerMatchId,
    relatedTeam: ownerTeam,
    relatedFt: row.sourceScore ?? '—',
    relatedHalf: row.sourceHalf,
    relatedMinute: row.sourceMinute,
    tier: row.tier,
    similarity: row.similarity,
    label30: undefined,
    sourceHalf,
    sourceMinute,
    sourceScore: row.relatedFt,
    ts: row.ts,
  };
}
