/**
 * Client wrapper cho Google Sheets bet logging.
 *
 * Frontend không gọi trực tiếp Google Sheets — toàn bộ I/O đi qua AI server
 * (`/api/sheets/*`) để private key không lộ ra bundle.
 *
 *  - `logBetEntry`        : ghi 1 dòng "vào kèo" (idempotent theo `betId`).
 *  - `updateBetResult`    : cập nhật ket_qua + lai_lo cho dòng `betId`.
 *  - `buildBetEntryFromTicket` : helper biến BetTicket + match → payload
 *    đúng schema sheet (timestamp, score, league, note…).
 *  - `buildNoteSummary`   : tóm tắt API 2 đội + lịch sử chuông + cường độ
 *    giảm giá (từ localStorage / props) → string một dòng cho cột `note`.
 *
 * Tất cả call có timeout/retry nhẹ, fail-soft (chỉ log warning) — không
 * block UI.
 */
import type { BetTicket, MatchInfo, ProcessedStats } from '../types';
import { AI_SERVER_URL } from './ai-service';
import { parseStats } from './api';
import { calculateAPIScore } from './traditionalFactors';
import type { StoredAlert } from '../types';

export type BetResultCode = 'won' | 'lost' | 'push' | 'won_half' | 'lost_half';

export interface BetEntryPayload {
  betId: string;
  giaiDau: string;
  doiNha: string;
  doiKhach: string;
  tySoLucVaoKeo: string;
  keoVao: string;
  phut: number | string;
  tyLeAn: number;
  soTienCuoc: number;
  note: string;
  timestampGmt7?: string;
}

const FETCH_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 600;

function timeoutSignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(FETCH_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

async function fetchWithRetry<T>(
  url: string,
  init: RequestInit,
): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
    }
    try {
      const res = await fetch(url, { ...init, signal: timeoutSignal() });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (res.ok) return json as T;
      // 4xx (trừ 429) → không retry, vì lỗi do client/data.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.warn('[bet-sheet-log] HTTP', res.status, json);
        return json as T;
      }
    } catch (e) {
      console.warn('[bet-sheet-log] network error attempt', attempt + 1, e);
    }
  }
  return null;
}

/** UUID v4 — dùng `crypto.randomUUID` khi có, fallback nhỏ gọn để chạy được trong test/SSR. */
export function newBetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: random hex segments — chỉ dùng khi không có crypto API.
  const r = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
}

/**
 * Ghi 1 dòng "vào kèo" lên server. `ok: false` kèm `error` để UI hiển thị.
 */
export type LogBetEntryResult =
  | { ok: true; betId: string; rowIndex?: number; deduped?: boolean }
  | { ok: false; error: string };

export async function logBetEntry(payload: BetEntryPayload): Promise<LogBetEntryResult> {
  const res = await fetchWithRetry<{ success: boolean; betId?: string; rowIndex?: number; deduped?: boolean; error?: string }>(
    `${AI_SERVER_URL}/api/sheets/bet`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (res === null) {
    return {
      ok: false,
      error:
        'Không kết nối được server AI hoặc hết thời gian chờ. Chạy `npm run dev` trong thư mục `server/` và kiểm tra VITE_AI_SERVER_URL (vd http://localhost:3001).',
    };
  }
  if (res.success === false) {
    const msg = typeof res.error === 'string' && res.error.trim() ? res.error : 'Server từ chối ghi sheet (xem console).';
    console.warn('[bet-sheet-log] log entry failed:', msg);
    return { ok: false, error: msg };
  }
  return { ok: true, betId: res.betId || payload.betId, rowIndex: res.rowIndex, deduped: res.deduped };
}

/**
 * Cập nhật kết quả + lãi/lỗ cho `betId`. PnL tính trên server (xem services/pnl.ts).
 */
export async function updateBetResult(
  betId: string,
  ketQua: BetResultCode,
  soTienCuoc: number,
  tyLeAn: number,
): Promise<{ laiLo: number } | null> {
  const res = await fetchWithRetry<{ success: boolean; laiLo?: number; error?: string }>(
    `${AI_SERVER_URL}/api/sheets/bet/${encodeURIComponent(betId)}/result`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ketQua, soTienCuoc, tyLeAn }),
    },
  );
  if (!res || res.success === false) {
    if (res?.error) console.warn('[bet-sheet-log] update result failed:', res.error);
    return null;
  }
  return { laiLo: typeof res.laiLo === 'number' ? res.laiLo : 0 };
}

/** Đọc Nhật ký Cảnh báo (chuông) trong localStorage cho `matchId`. */
function readAlertHistory(matchId: string): StoredAlert[] {
  try {
    const raw = localStorage.getItem(`alertHistory_${matchId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface NoteContext {
  /** Số lần "đỏ" giảm giá Tài/Xỉu hiệp 1 đã quan sát đến hiện tại. */
  ouDropCountH1?: number;
  /** Số lần đỏ hiệp 2. */
  ouDropCountH2?: number;
  /** Phút mới nhất xảy ra cường độ giảm giá (nếu có). */
  ouDropLatestMinute?: number;
  /** Bổ sung từ UI (nếu có), gắn trước block API 2 đội. */
  apiSummary?: string;
}

/** Một dòng compact: điểm API + chỉ số B365 đã parse (cùng công thức `calculateAPIScore`). */
function formatTeamApiSegment(name: string, s: ProcessedStats, side: 0 | 1): string {
  const api = calculateAPIScore(s, side);
  const on = s.on_target[side];
  const off = s.off_target[side];
  const da = s.dangerous_attacks[side];
  const atk = s.attacks[side];
  const corners = s.corners[side];
  const y = s.yellowcards[side];
  const r = s.redcards[side];
  return `${name} điểm ${api.toFixed(1)} sút ${on + off} (trúng ${on}) DA ${da} TC ${atk} góc ${corners} TV ${y} TĐ ${r}`;
}

/**
 * Tóm tắt API cho 2 đội từ `match.stats` (field API inplay B365 đang dùng).
 */
export function buildTwoTeamApiSummary(match: MatchInfo): string {
  if (!match.stats || Object.keys(match.stats).length === 0) {
    return 'API 2 đội: N/A';
  }
  const s = parseStats(match.stats);
  const home = match.home?.name || 'Nhà';
  const away = match.away?.name || 'Khách';
  return `API 2 đội — ${formatTeamApiSegment(home, s, 0)}; ${formatTeamApiSegment(away, s, 1)}`;
}

/**
 * Sinh chuỗi `note` ngắn cho cột sheet — gồm tóm tắt 2 đội (sút/DA/góc),
 * lịch sử chuông áp lực, và cường độ giảm giá OU.
 *
 * Quy ước: phần nào không có dữ liệu → ghi "N/A", không trả null.
 */
export function buildNoteSummary(match: MatchInfo, ctx: NoteContext = {}): string {
  const stats = match.stats || {};
  const pickPair = (key: string): [string, string] => {
    const arr = stats[key];
    if (Array.isArray(arr) && arr.length === 2) return [String(arr[0] ?? '0'), String(arr[1] ?? '0')];
    return ['N/A', 'N/A'];
  };
  const [shotsH, shotsA] = pickPair('on_target');
  const [daH, daA] = pickPair('dangerous_attacks');
  const [cornH, cornA] = pickPair('corners');

  const home = match.home?.name || 'Home';
  const away = match.away?.name || 'Away';

  const teamLine = `${home} vs ${away} | sút trúng ${shotsH}-${shotsA}, DA ${daH}-${daA}, phạt góc ${cornH}-${cornA}`;

  const alerts = readAlertHistory(match.id);
  const pressureMinutes = alerts
    .filter((a) => a.type === 'pressure')
    .map((a) => a.minute)
    .filter((m) => Number.isFinite(m))
    .sort((a, b) => a - b);
  const dedupedPressure = [...new Set(pressureMinutes)];
  const bellLine = dedupedPressure.length === 0
    ? 'Lịch sử chuông: N/A'
    : `Lịch sử chuông (${dedupedPressure.length}): ${dedupedPressure.map((m) => `${m}'`).join(', ')}`;

  const dropParts: string[] = [];
  if (typeof ctx.ouDropCountH1 === 'number') dropParts.push(`H1=${ctx.ouDropCountH1}`);
  if (typeof ctx.ouDropCountH2 === 'number') dropParts.push(`H2=${ctx.ouDropCountH2}`);
  let dropLine = 'Cường độ giảm giá OU: N/A';
  if (dropParts.length > 0) {
    const total =
      (ctx.ouDropCountH1 ?? 0) + (ctx.ouDropCountH2 ?? 0);
    dropLine = `Cường độ giảm giá OU: ${dropParts.join(', ')} (tổng ${total}${
      typeof ctx.ouDropLatestMinute === 'number' ? `, gần nhất ${ctx.ouDropLatestMinute}'` : ''
    })`;
  }

  const apiFromMatch = buildTwoTeamApiSummary(match);
  const apiLine = ctx.apiSummary?.trim()
    ? `${ctx.apiSummary.trim()} | ${apiFromMatch}`
    : apiFromMatch;

  return [teamLine, apiLine, bellLine, dropLine].join(' | ');
}

/**
 * Build payload từ `BetTicket` + `MatchInfo`. Không phụ thuộc localStorage
 * cho chính ticket — caller đã có sẵn các trường (đặc biệt scoreAtBet, odds…).
 */
export function buildBetEntryFromTicket(
  ticket: BetTicket,
  match: MatchInfo,
  noteCtx: NoteContext = {},
  options?: { betId?: string; leagueNameOverride?: string },
): BetEntryPayload {
  const giaiDau = options?.leagueNameOverride || ticket.leagueName || match.league?.name || 'N/A';
  const note = ticket.noteSnapshot || buildNoteSummary(match, noteCtx);
  const keoVao = `${ticket.betType} ${ticket.handicap || ''}`.trim();

  return {
    betId: options?.betId || ticket.betId || newBetId(),
    giaiDau,
    doiNha: match.home?.name || 'Home',
    doiKhach: match.away?.name || 'Away',
    tySoLucVaoKeo: ticket.scoreAtBet || match.ss || 'N/A',
    keoVao,
    phut: ticket.minute,
    tyLeAn: ticket.odds,
    soTienCuoc: ticket.stake,
    note,
  };
}
