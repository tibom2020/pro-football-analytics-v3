import type {
  MatchInfo,
  HistoryItem,
  ViewedMatchHistory,
  BetTicket,
  ProcessedStats,
  OverUnderMinuteSnapshot,
  AsianHandicapMinuteSnapshot,
} from '../types';
import { parseStats } from './api';
import { decodeStatTimelineKey } from './matchTimeline';
import { computeOuDropIntensityPack } from './odds-pressure-series';
import type { PredictionSnapshot, PredictionVerdict } from './goal-prediction';

/** Đồng bộ tab/UI khi viewedMatchesHistory thay đổi (cùng origin). */
export const VIEWED_MATCHES_HISTORY_UPDATED_EVENT = 'proFootball:viewedMatchesHistoryUpdated';

/** Cờ localStorage: đã auto-lưu .md khi trận về FT (một lần mỗi trận). */
export const MATCH_MD_AUTOSAVED_KEY_PREFIX = 'matchMdAutoSaved_';

export function matchMdAutosavedKey(matchId: string): string {
  return `${MATCH_MD_AUTOSAVED_KEY_PREFIX}${matchId}`;
}

/** Goal-prediction snapshots (mỗi lần bấm "Dự đoán") — đồng bộ với services/goal-prediction.ts. */
const PRED_SNAPSHOTS_KEY = (id: string) => `goalPredictionSnapshots_${id}`;

const OU_KEY = (id: string) => `ouSnapshots_${id}`;
const AH_KEY = (id: string) => `ahSnapshots_${id}`;
/** Tài/Xỉu hiệp 1 — API 1_6 */
const OU_H1_KEY = (id: string) => `ouSnapshots1_6_${id}`;
/** Chấp hiệp 1 — API 1_5 */
const AH_H1_KEY = (id: string) => `ahSnapshots1_5_${id}`;
/** Money Line 1X2 (cả trận) — API 1_1 */
const ML_KEY = (id: string) => `mlSnapshots1_1_${id}`;

function halfOfOu(r: OverUnderMinuteSnapshot): 1 | 2 {
  return r.half ?? (r.minute < 45 ? 1 : 2);
}

function halfOfAh(r: AsianHandicapMinuteSnapshot): 1 | 2 {
  return r.half ?? (r.minute < 45 ? 1 : 2);
}

type DropSideAgg = { cnt: number; sum: number; max: number };

function emptyDropSide(): DropSideAgg {
  return { cnt: 0, sum: 0, max: 0 };
}

type OuHalfDrops = { tai: DropSideAgg; xiu: DropSideAgg };
type AhHalfDrops = { home: DropSideAgg; away: DropSideAgg };

function emptyOuHalfDrops(): OuHalfDrops {
  return { tai: emptyDropSide(), xiu: emptyDropSide() };
}

function emptyAhHalfDrops(): AhHalfDrops {
  return { home: emptyDropSide(), away: emptyDropSide() };
}

/** Giảm giá = odds giảm, cùng HDP, hai mốc liền kề trong cùng hiệp. */
function analyzeOuDropsByHalf(rows: OverUnderMinuteSnapshot[]): Record<1 | 2, OuHalfDrops> {
  const sorted = [...rows].sort((a, b) => {
    const ha = halfOfOu(a);
    const hb = halfOfOu(b);
    if (ha !== hb) return ha - hb;
    return a.minute - b.minute;
  });
  const out: Record<1 | 2, OuHalfDrops> = { 1: emptyOuHalfDrops(), 2: emptyOuHalfDrops() };
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (halfOfOu(prev) !== halfOfOu(cur)) continue;
    if (Math.abs(cur.handicap - prev.handicap) > 0.001) continue;
    const h = halfOfOu(cur);
    if (cur.over < prev.over - 0.001) {
      const d = prev.over - cur.over;
      out[h].tai.cnt++;
      out[h].tai.sum += d;
      out[h].tai.max = Math.max(out[h].tai.max, d);
    }
    if (cur.under < prev.under - 0.001) {
      const d = prev.under - cur.under;
      out[h].xiu.cnt++;
      out[h].xiu.sum += d;
      out[h].xiu.max = Math.max(out[h].xiu.max, d);
    }
  }
  return out;
}

function analyzeAhDropsByHalf(rows: AsianHandicapMinuteSnapshot[]): Record<1 | 2, AhHalfDrops> {
  const sorted = [...rows].sort((a, b) => {
    const ha = halfOfAh(a);
    const hb = halfOfAh(b);
    if (ha !== hb) return ha - hb;
    return a.minute - b.minute;
  });
  const out: Record<1 | 2, AhHalfDrops> = { 1: emptyAhHalfDrops(), 2: emptyAhHalfDrops() };
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (halfOfAh(prev) !== halfOfAh(cur)) continue;
    if (Math.abs(cur.handicap - prev.handicap) > 0.001) continue;
    const h = halfOfAh(cur);
    if (cur.home < prev.home - 0.001) {
      const d = prev.home - cur.home;
      out[h].home.cnt++;
      out[h].home.sum += d;
      out[h].home.max = Math.max(out[h].home.max, d);
    }
    if (cur.away < prev.away - 0.001) {
      const d = prev.away - cur.away;
      out[h].away.cnt++;
      out[h].away.sum += d;
      out[h].away.max = Math.max(out[h].away.max, d);
    }
  }
  return out;
}

function formatDropSide(label: string, s: DropSideAgg): string {
  if (s.cnt === 0) return `- **${label}:** không có bước giảm (cùng HDP)`;
  return `- **${label}:** ${s.cnt} lần; tổng biên độ giảm ${s.sum.toFixed(3)}; bước lớn nhất ${s.max.toFixed(3)}`;
}

function appendOuMarketSection(
  lines: string[],
  title: string,
  apiTag: string,
  rows: OverUnderMinuteSnapshot[],
): void {
  lines.push(`### ${title} (${apiTag})`);
  lines.push('');
  lines.push(`_Đơn vị “giá” = odds (hệ số). ${rows.length} mốc._`);
  lines.push('');
  if (rows.length === 0) {
    lines.push('_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._');
    lines.push('');
    return;
  }
  lines.push('| Phút | Hiệp | HDP | Tài | Xỉu |');
  lines.push('|-----:|:---:|:---:|:---:|:---:|');
  const sorted = [...rows].sort((a, b) => {
    const ha = halfOfOu(a);
    const hb = halfOfOu(b);
    if (ha !== hb) return ha - hb;
    return a.minute - b.minute;
  });
  for (const r of sorted) {
    lines.push(
      `| ${r.minute} | ${halfOfOu(r)} | ${r.handicap} | ${r.over.toFixed(2)} | ${r.under.toFixed(2)} |`,
    );
  }
  lines.push('');
  lines.push('**Cường độ giảm giá** (hai điểm liền nhau, cùng handicap):');
  lines.push('');
  const drops = analyzeOuDropsByHalf(rows);
  lines.push(formatDropSide('H1 — Tài', drops[1].tai));
  lines.push(formatDropSide('H1 — Xỉu', drops[1].xiu));
  lines.push(formatDropSide('H2 — Tài', drops[2].tai));
  lines.push(formatDropSide('H2 — Xỉu', drops[2].xiu));
  lines.push('');
}

function appendAhMarketSection(
  lines: string[],
  title: string,
  apiTag: string,
  rows: AsianHandicapMinuteSnapshot[],
): void {
  lines.push(`### ${title} (${apiTag})`);
  lines.push('');
  lines.push(`_Đơn vị “giá” = odds chủ / khách. ${rows.length} mốc._`);
  lines.push('');
  if (rows.length === 0) {
    lines.push('_Chưa có dữ liệu — cần mở trận trên Dashboard để thu thập._');
    lines.push('');
    return;
  }
  lines.push('| Phút | Hiệp | HDP | Chủ | Khách |');
  lines.push('|-----:|:---:|:---:|:---:|:---:|');
  const sorted = [...rows].sort((a, b) => {
    const ha = halfOfAh(a);
    const hb = halfOfAh(b);
    if (ha !== hb) return ha - hb;
    return a.minute - b.minute;
  });
  for (const r of sorted) {
    lines.push(
      `| ${r.minute} | ${halfOfAh(r)} | ${r.handicap} | ${r.home.toFixed(2)} | ${r.away.toFixed(2)} |`,
    );
  }
  lines.push('');
  lines.push('**Cường độ giảm giá** (cùng HDP):');
  lines.push('');
  const drops = analyzeAhDropsByHalf(rows);
  lines.push(formatDropSide('H1 — Chủ', drops[1].home));
  lines.push(formatDropSide('H1 — Khách', drops[1].away));
  lines.push(formatDropSide('H2 — Chủ', drops[2].home));
  lines.push(formatDropSide('H2 — Khách', drops[2].away));
  lines.push('');
}

function inferApiDomFromStats(statsMap: Record<number, ProcessedStats>): { apiH1: number; apiH2: number } {
  let apiH1 = 0;
  let apiH2 = 45;
  for (const k of Object.keys(statsMap)) {
    const n = Number(k);
    if (!Number.isFinite(n)) continue;
    const { half, minute } = decodeStatTimelineKey(n);
    if (half === 1) apiH1 = Math.max(apiH1, minute);
    else apiH2 = Math.max(apiH2, minute);
  }
  return { apiH1, apiH2 };
}

type DropJournalKind = 'tai13' | 'tai16' | 'chu15';

function pushDropIntensityJournal(
  lines: string[],
  heading: string,
  intro: string,
  seriesH1: { minute: number; count: number }[],
  seriesH2: { minute: number; count: number }[] | null,
  kind: DropJournalKind,
): void {
  lines.push(heading);
  lines.push('');
  lines.push(intro);
  lines.push('');

  const tagTitle =
    kind === 'chu15' ? 'Giảm giá Chủ (1_5)' : kind === 'tai16' ? 'Giảm giá Tài (1_6)' : 'Giảm giá Tài (1_3)';
  const sidePhrase =
    kind === 'chu15' ? 'odds **Chủ** (kèo chấp hiệp 1)' : 'odds **Tài** (Tài/Xỉu)';
  const loai = kind === 'chu15' ? 'ou_drop / 1_5' : kind === 'tai16' ? 'ou_drop / 1_6' : 'ou_drop / 1_3';
  const r1 = seriesH1.filter((d) => d.count > 0).map((d) => ({ ...d, half: 1 as const }));
  const r2 = (seriesH2 ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({ ...d, half: 2 as const }));
  const all = [...r1, ...r2].sort((a, b) => a.minute - b.minute || a.half - b.half);

  if (all.length === 0) {
    lines.push(
      '_Không có phút nào ghi nhận cường độ > 0 — cần đủ chuỗi odds trong localStorage hoặc chưa có bước giảm (đỏ) tại phút đó._',
    );
    lines.push('');
    return;
  }

  lines.push('| Phút | Hiệp | Loại | Cường độ | Tiêu đề | Nội dung |');
  lines.push('|-----:|:---:|:---|:---:|---------|----------|');
  for (const d of all) {
    lines.push(
      `| ${d.minute} | ${d.half} | ${loai} | ${d.count} | ${tagTitle} | Biểu đồ cường độ: **${d.count}** lần giảm ${sidePhrase} tại phút này (cùng HDP, bước liền kề). |`,
    );
  }
  lines.push('');
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function slugPart(s: string, max = 40): string {
  const x = s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
  return x || 'match';
}

/** Tên file .md an toàn (không đường dẫn). */
export function suggestMatchMarkdownFilename(match: MatchInfo, exportedAt = new Date()): string {
  const y = exportedAt.getFullYear();
  const mo = String(exportedAt.getMonth() + 1).padStart(2, '0');
  const d = String(exportedAt.getDate()).padStart(2, '0');
  const h = String(exportedAt.getHours()).padStart(2, '0');
  const mi = String(exportedAt.getMinutes()).padStart(2, '0');
  const home = slugPart(match.home.name, 24);
  const away = slugPart(match.away.name, 24);
  return `match_${match.id}_${home}_vs_${away}_${y}${mo}${d}-${h}${mi}.md`;
}

function formatTimer(m: MatchInfo): string {
  const t = m.timer;
  if (!t) return m.time ? `${m.time}'` : '—';
  const ft = String(t.tt) === '1';
  if (ft) return 'FT';
  return `${t.tm ?? m.time}'`;
}

function formatXgValue(v: number | undefined): string {
  return v != null && Number.isFinite(v) ? v.toFixed(2) : '—';
}

function statsRowLine(minute: number, s: ProcessedStats): string {
  const xgHome = s.xg != null ? formatXgValue(s.xg[0]) : '—';
  const xgAway = s.xg != null ? formatXgValue(s.xg[1]) : '—';
  return `| ${minute} | ${s.attacks.join(' / ')} | ${s.dangerous_attacks.join(' / ')} | ${s.on_target.join(' / ')} | ${s.off_target.join(' / ')} | ${s.corners.join(' / ')} | ${s.yellowcards.join(' / ')} | ${s.redcards.join(' / ')} | ${xgHome} | ${xgAway} |`;
}

interface GameEv {
  minute: number;
  type: 'goal' | 'corner';
  half?: 1 | 2;
}

interface StoredAlertRow {
  id: string;
  minute: number;
  half?: 1 | 2;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  pressureLevel?: 1 | 2;
}

/** Escape pipe + newline cho 1 cell trong Markdown table. */
function mdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

type PredictWindow = 15 | 30;

/** Lấy goalProb của cửa sổ tương ứng (30' = CHÍNH, 15' = tham khảo + backward-compat). */
function probForWindow(s: PredictionSnapshot, win: PredictWindow): number | null {
  if (win === 30) return s.result.goalProb30 ?? null;
  // 15': goalProb15 mới, fallback goalProb (backward-compat).
  return s.result.goalProb15 ?? s.result.goalProb ?? null;
}

/** Verdict + nguồn (auto/tay) của cửa sổ tương ứng. */
function verdictForWindow(
  s: PredictionSnapshot,
  win: PredictWindow,
): { verdict: PredictionVerdict | null | undefined; auto: boolean | undefined } {
  if (win === 30) return { verdict: s.verdict30, auto: s.verdict30Auto };
  return { verdict: s.verdict, auto: s.verdictAuto };
}

/**
 * Một bảng "lịch sử dự đoán" cho 1 cửa sổ (15' hoặc 30').
 * "Đoán nhãn" = goalProb ≥ 0.5 → "có", ngược lại "không". Đúng/Sai so với verdict đã chấm.
 */
function appendPredictWindowTable(
  lines: string[],
  heading: string,
  snapshots: PredictionSnapshot[],
  win: PredictWindow,
): void {
  lines.push(heading);
  lines.push('');
  lines.push(`| Phút | Hiệp | GoalProb ${win}' | Đoán nhãn | Chấm | Nguồn | Đúng/Sai |`);
  lines.push('|------|------|------------|-----------|------|-------|----------|');

  let totalVerdicts = 0;
  let correct = 0;
  let autoCount = 0;
  let manualCount = 0;
  for (const s of snapshots) {
    const prob = probForWindow(s, win);
    const { verdict, auto } = verdictForWindow(s, win);
    const pct = typeof prob === 'number' ? `${(prob * 100).toFixed(1)}%` : '—';
    const predLabel = typeof prob === 'number' ? (prob >= 0.5 ? 'có' : 'không') : '—';
    const verdictText = verdict === 'yes' ? 'CÓ' : verdict === 'no' ? 'KHÔNG' : '—';
    const sourceText = verdict ? (auto ? 'auto' : 'tay') : '—';
    let okMark = '—';
    if (typeof prob === 'number' && (verdict === 'yes' || verdict === 'no')) {
      totalVerdicts++;
      if (auto) autoCount++;
      else manualCount++;
      const isCorrect = (verdict === 'yes') === (prob >= 0.5);
      if (isCorrect) correct++;
      okMark = isCorrect ? '✓ đúng' : '✗ sai';
    }
    lines.push(
      `| ${s.minute} | ${s.half} | ${pct} | ${predLabel} | ${verdictText} | ${sourceText} | ${okMark} |`,
    );
  }
  lines.push('');

  if (totalVerdicts > 0) {
    const acc = (correct / totalVerdicts) * 100;
    lines.push(
      `**Đã chấm (${win}'):** ${totalVerdicts} (${autoCount} auto · ${manualCount} tay) · **Đúng:** ${correct}/${totalVerdicts} (**${acc.toFixed(1)}%**)`,
    );
  } else {
    lines.push(`_Cửa sổ ${win}': chưa có verdict nào — chưa tính accuracy._`);
  }
  lines.push('');
}

/**
 * Lịch sử goal-predict cho cả hai cửa sổ — **30' (cửa sổ CHÍNH)** + **15' (tham khảo)** —
 * kèm bảng lý do mô hình (heuristic / Ollama / GPT). Dùng để đo accuracy goal-predict.
 */
function appendPredictionSnapshotsSection(lines: string[], snapshots: PredictionSnapshot[]): void {
  lines.push('## Dự đoán bàn thắng (goal-predict)');
  lines.push('');
  if (snapshots.length === 0) {
    lines.push('_Chưa có lần dự đoán nào cho trận này._');
    lines.push('');
    return;
  }

  const sorted = [...snapshots].sort((a, b) => a.ts - b.ts);

  lines.push(
    '_Mỗi hàng là 1 lần bấm "Dự đoán". **Chấm** = `CÓ`/`KHÔNG` (auto từ gameEvents trong cửa sổ tương ứng, hoặc user tay). **Nguồn** = `auto` / `tay`. **Đoán nhãn** = `goalProb ≥ 0.5`. **Đúng/Sai** = so đoán nhãn với chấm. Cửa sổ **30′ là cửa sổ CHÍNH**; 15′ chỉ tham khảo._',
  );
  lines.push('');
  lines.push(`**Tổng số lần dự đoán:** ${sorted.length}`);
  lines.push('');

  // 30' = cửa sổ CHÍNH → liệt kê trước.
  appendPredictWindowTable(lines, '### Lịch sử dự đoán — cửa sổ 30′ (CHÍNH)', sorted, 30);
  appendPredictWindowTable(lines, '### Lịch sử dự đoán — cửa sổ 15′ (tham khảo)', sorted, 15);

  // Lý do mô hình tách riêng để hai bảng trên gọn (heuristic + LLM dùng chung cho cả 2 cửa sổ).
  const hasAnyReason = sorted.some(
    (s) =>
      s.result.reasonVi ||
      s.result.reasons?.ollama?.reasonVi ||
      s.result.reasons?.ollama?.error ||
      s.result.reasons?.gpt?.reasonVi ||
      s.result.reasons?.gpt?.error,
  );
  if (hasAnyReason) {
    lines.push('### Lý do mô hình (heuristic / Ollama / GPT)');
    lines.push('');
    lines.push('| Phút | Hiệp | Heuristic | Ollama | GPT |');
    lines.push('|------|------|-----------|--------|-----|');
    for (const s of sorted) {
      const heur = mdCell(s.result.reasonVi || '—');
      const ollama = mdCell(s.result.reasons?.ollama?.reasonVi || s.result.reasons?.ollama?.error || '—');
      const gpt = mdCell(s.result.reasons?.gpt?.reasonVi || s.result.reasons?.gpt?.error || '—');
      lines.push(`| ${s.minute} | ${s.half} | ${heur} | ${ollama} | ${gpt} |`);
    }
    lines.push('');
  }

  // Model metadata — ưu tiên meta cửa sổ 30' (CHÍNH), fallback meta mặc định.
  const firstMeta30 = sorted.find((s) => s.result.modelMeta30)?.result.modelMeta30;
  const firstMeta = firstMeta30 ?? sorted.find((s) => s.result.modelMeta)?.result.modelMeta;
  if (firstMeta) {
    const tag = firstMeta30 ? "Model (30')" : 'Model';
    lines.push(
      `_${tag}: \`${firstMeta.version}\` · AUC ${firstMeta.rocAuc.toFixed(3)} · ${firstMeta.numTrainMatches ?? '?'} trận train · trained ${firstMeta.trainedAt}_`,
    );
    lines.push('');
  }
}

function jsonBlock(label: string, data: unknown, maxChars = 120_000): string {
  let raw = JSON.stringify(data, null, 2);
  if (raw.length > maxChars) {
    raw = raw.slice(0, maxChars) + '\n… (truncated)';
  }
  return `### ${label}\n\n\`\`\`json\n${raw}\n\`\`\`\n`;
}

/**
 * Đọc localStorage (browser) và dựng markdown đầy đủ cho một trận đã có trong viewedMatchesHistory.
 */
export function buildMatchMarkdownFromStorage(matchId: string): { markdown: string; filename: string } | null {
  if (typeof localStorage === 'undefined') return null;

  const histRaw = localStorage.getItem('viewedMatchesHistory');
  const all = histRaw ? safeParse<ViewedMatchHistory>(histRaw, {}) : {};
  const item = all[matchId] as HistoryItem | undefined;
  if (!item?.match) return null;

  const match = item.match;
  const filename = suggestMatchMarkdownFilename(match);

  const statsMap = safeParse<Record<number, ProcessedStats>>(
    localStorage.getItem(`statsHistory_${matchId}`),
    {},
  );
  const gameEvents = safeParse<GameEv[]>(localStorage.getItem(`gameEvents_${matchId}`), []).map((e) => ({
    ...e,
    half: e.half ?? 1,
  }));
  const alerts = safeParse<StoredAlertRow[]>(localStorage.getItem(`alertHistory_${matchId}`), []);

  const tickets: BetTicket[] = safeParse<BetTicket[]>(localStorage.getItem('betTickets'), []).filter(
    (t) => t.matchId === matchId,
  );

  const ou = safeParse<OverUnderMinuteSnapshot[]>(localStorage.getItem(OU_KEY(matchId)), []);
  const ah = safeParse<AsianHandicapMinuteSnapshot[]>(localStorage.getItem(AH_KEY(matchId)), []);
  const ouH1 = safeParse<OverUnderMinuteSnapshot[]>(localStorage.getItem(OU_H1_KEY(matchId)), []);
  const ahH1 = safeParse<AsianHandicapMinuteSnapshot[]>(localStorage.getItem(AH_H1_KEY(matchId)), []);

  const predictionSnapshots = safeParse<PredictionSnapshot[]>(
    localStorage.getItem(PRED_SNAPSHOTS_KEY(matchId)),
    [],
  );

  const lines: string[] = [];
  lines.push(`# Trận đấu — ${match.home.name} vs ${match.away.name}`);
  lines.push('');
  lines.push('## Thông tin chung');
  lines.push('');
  lines.push(`| Trường | Giá trị |`);
  lines.push(`|--------|--------|`);
  lines.push(`| Match ID | \`${match.id}\` |`);
  lines.push(`| Giải | ${match.league.name} |`);
  lines.push(`| Tỷ số | ${match.ss ?? '—'} |`);
  const snapshotStats = match.stats ? parseStats(match.stats) : null;
  if (snapshotStats?.xg) {
    lines.push(`| xG đội nhà (snapshot) | ${formatXgValue(snapshotStats.xg[0])} |`);
    lines.push(`| xG đội khách (snapshot) | ${formatXgValue(snapshotStats.xg[1])} |`);
  }
  lines.push(`| Thời điểm / trạng thái | ${formatTimer(match)} |`);
  lines.push(`| viewedAt (Unix ms) | ${item.viewedAt} |`);
  if (match.timer) {
    lines.push(`| timer (raw) | \`${JSON.stringify(match.timer)}\` |`);
  }
  lines.push('');

  if (match.stats && Object.keys(match.stats).length > 0) {
    lines.push('## Stats API (snapshot cuối — raw)');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(match.stats, null, 2));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Vé cược (betTickets)');
  lines.push('');
  if (tickets.length === 0) {
    lines.push('_Không có vé cho trận này trong localStorage._');
    lines.push('');
  } else {
    lines.push(
      '| Loại | Kèo | Odds | Tiền | Phút | Trạng thái | Ghi chú | betId |',
    );
    lines.push('|------|-----|------|------|------|------------|---------|-------|');
    for (const t of tickets) {
      lines.push(
        `| ${t.betType} | ${t.handicap} | ${t.odds} | ${t.stake} | ${t.minute} | ${t.status} | ${(t.notes ?? '').replace(/\|/g, '\\|')} | ${t.betId ?? '—'} |`,
      );
    }
    lines.push('');
  }

  const statMinutes = Object.keys(statsMap)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  lines.push('## Thống kê theo phút (statsHistory)');
  lines.push('');
  if (statMinutes.length === 0) {
    lines.push('_Chưa có timeline chỉ số._');
    lines.push('');
  } else {
    lines.push('| Phút | Tấn công H/A | NG.nguy hiểm H/A | Tr.hợp lý H/A | Tr.hỏng H/A | Ph.góc H/A | Thẻ vàng H/A | Thẻ đỏ H/A | xG nhà | xG khách |');
    lines.push('|------|-------------|-----------------|---------------|------------|-----------|-------------|-----------|----------|----------|');
    for (const m of statMinutes) {
      const s = statsMap[m];
      if (s) lines.push(statsRowLine(m, s));
    }
    lines.push('');
  }

  lines.push('## Sự kiện trận (goal, corner)');
  lines.push('');
  if (gameEvents.length === 0) {
    lines.push('_Không có sự kiện lưu._');
    lines.push('');
  } else {
    lines.push('| Phút | Hiệp | Loại |');
    lines.push('|------|------|------|');
    for (const e of [...gameEvents].sort((a, b) => a.minute - b.minute)) {
      lines.push(`| ${e.minute} | ${e.half ?? 1} | ${e.type} |`);
    }
    lines.push('');
  }

  lines.push('## Nhật ký cảnh báo (alertHistory)');
  lines.push('');
  if (alerts.length === 0) {
    lines.push('_Không có cảnh báo._');
    lines.push('');
  } else {
    lines.push('| Phút | Hiệp | Loại | pressure | Tiêu đề | Nội dung |');
    lines.push('|------|------|------|----------|---------|----------|');
    for (const a of [...alerts].sort((x, y) => x.timestamp - y.timestamp)) {
      const msg = a.message.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const title = a.title.replace(/\|/g, '\\|');
      lines.push(
        `| ${a.minute} | ${a.half ?? '—'} | ${a.type} | ${a.pressureLevel ?? '—'} | ${title} | ${msg} |`,
      );
    }
    lines.push('');
  }

  appendPredictionSnapshotsSection(lines, predictionSnapshots);

  lines.push('## Chuỗi kèo theo phút & cường độ giảm giá');
  lines.push('');
  lines.push(
    '_Bảng: **Phút**, **Hiệp** (1/2), **HDP**, **giá** = odds (hệ số). **Cường độ giảm** = các bước liền kề mà odds giảm (cùng HDP): số lần, tổng biên độ, bước lớn nhất._',
  );
  lines.push('');

  appendOuMarketSection(lines, 'Tài/Xỉu cả trận', '1_3', ou);
  appendAhMarketSection(lines, 'Kèo chấp cả trận (đội nhà / đội khách)', '1_2', ah);
  appendOuMarketSection(lines, 'Tài/Xỉu hiệp 1 (thị trường H1 — API)', '1_6', ouH1);
  appendAhMarketSection(lines, 'Chấp hiệp 1 (thị trường H1 — API)', '1_5', ahH1);

  const { apiH1, apiH2 } = inferApiDomFromStats(statsMap);
  const dropPack = computeOuDropIntensityPack({
    match,
    ou1_3: ou,
    ah1_2: ah,
    ou1_6: ouH1,
    ah1_5: ahH1,
    statsKeys: Object.keys(statsMap),
    apiH1MaxMinute: apiH1,
    apiH2MaxMinute: apiH2,
  });

  lines.push('## Nhật ký cường độ giảm giá (như biểu đồ *OddsDropChart*)');
  lines.push('');
  lines.push(
    '_Định dạng bảng tương tự **Nhật ký cảnh báo** (cột **Loại** = `ou_drop / 1_3` …). **Cường độ** = số nét giảm giá tại phút đó (như cột đỏ *OddsDropChart*). **1_3** / **1_6**: Tài (over). **1_5**: Chủ (home)._',
  );
  lines.push('');

  pushDropIntensityJournal(
    lines,
    '### Kèo Tài cả trận (1_3)',
    'Gộp trục Hiệp 1 và Hiệp 2 trên thị trường **1_3** (đồng bộ hai panel H1/H2 trong Dashboard).',
    dropPack.drops1_3H1,
    dropPack.drops1_3H2,
    'tai13',
  );

  pushDropIntensityJournal(
    lines,
    '### Kèo Tài hiệp 1 (1_6)',
    'Thị trường **1_6** — toàn bộ phút hiển thị thuộc **hiệp 1** (kể cả bù giờ H1).',
    dropPack.drops1_6,
    null,
    'tai16',
  );

  pushDropIntensityJournal(
    lines,
    '### Kèo chấp hiệp 1 — odds Chủ (1_5)',
    'Thị trường **1_5** — cường độ theo hướng giảm **Chủ** (cùng logic màu đỏ trên biểu đồ chấp H1).',
    dropPack.drops1_5Home,
    null,
    'chu15',
  );

  lines.push(jsonBlock('Phụ lục JSON: 1_3 (OU cả trận)', ou));
  lines.push(jsonBlock('Phụ lục JSON: 1_2 (AH cả trận)', ah));
  lines.push(jsonBlock('Phụ lục JSON: 1_6 (OU hiệp 1)', ouH1));
  lines.push(jsonBlock('Phụ lục JSON: 1_5 (AH hiệp 1)', ahH1));

  lines.push('---');
  lines.push('');
  lines.push('_File được xuất tự động từ Pro Football Analytics (localStorage)._');

  return { markdown: lines.join('\n'), filename };
}

export { OU_KEY, AH_KEY, OU_H1_KEY, AH_H1_KEY, ML_KEY };
