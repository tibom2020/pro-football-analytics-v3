/**
 * Canh kèo Tài / Xỉu (FT hoặc H1): khi H đúng mục tiêu và giá bên chọn đạt ngưỡng,
 * app mở checklist đặt vé — không đặt hộ nhà cái.
 */

export type TaiOddsWatchScope = 'FT' | 'H1';

export interface TaiOddsWatchConfig {
  armed: boolean;
  scope: TaiOddsWatchScope;
  targetHandicap: number;
  minOverOdds: number;
  stake: number;
  notesSuffix: string;
}

export interface XiuOddsWatchConfig {
  armed: boolean;
  scope: TaiOddsWatchScope;
  targetHandicap: number;
  /** Giá Xỉu hiện tại phải >= giá trị này. */
  minUnderOdds: number;
  stake: number;
  notesSuffix: string;
}

export const OU_WATCH_STORAGE_EVENT = 'pfa:ou-watch-changed';
/** Giữ tương thích import cũ */
export const TAI_WATCH_STORAGE_EVENT = OU_WATCH_STORAGE_EVENT;

export function notifyOuWatchChanged(): void {
  window.dispatchEvent(new CustomEvent(OU_WATCH_STORAGE_EVENT));
}

const taiStorageKey = (matchId: string) => `pfa_tai_odds_watch_${matchId}`;
const xiuStorageKey = (matchId: string) => `pfa_xiu_odds_watch_${matchId}`;

export function defaultTaiWatchConfig(): TaiOddsWatchConfig {
  return {
    armed: false,
    scope: 'FT',
    targetHandicap: 1.5,
    minOverOdds: 1.9,
    stake: 100_000,
    notesSuffix: 'Auto canh kèo Tài',
  };
}

export function defaultXiuWatchConfig(): XiuOddsWatchConfig {
  return {
    armed: false,
    scope: 'FT',
    targetHandicap: 1.5,
    minUnderOdds: 1.9,
    stake: 100_000,
    notesSuffix: 'Auto canh kèo Xỉu',
  };
}

export function loadTaiWatchConfig(matchId: string): TaiOddsWatchConfig {
  try {
    const raw = localStorage.getItem(taiStorageKey(matchId));
    if (!raw) return defaultTaiWatchConfig();
    const p = JSON.parse(raw) as Partial<TaiOddsWatchConfig>;
    return {
      ...defaultTaiWatchConfig(),
      ...p,
      targetHandicap: typeof p.targetHandicap === 'number' && Number.isFinite(p.targetHandicap) ? p.targetHandicap : 1.5,
      minOverOdds: typeof p.minOverOdds === 'number' && Number.isFinite(p.minOverOdds) ? p.minOverOdds : 1.9,
      stake: typeof p.stake === 'number' && Number.isFinite(p.stake) && p.stake > 0 ? p.stake : 100_000,
      scope: p.scope === 'H1' ? 'H1' : 'FT',
      armed: Boolean(p.armed),
      notesSuffix:
        typeof p.notesSuffix === 'string' && p.notesSuffix.trim() ? p.notesSuffix.trim() : defaultTaiWatchConfig().notesSuffix,
    };
  } catch {
    return defaultTaiWatchConfig();
  }
}

export function loadXiuWatchConfig(matchId: string): XiuOddsWatchConfig {
  try {
    const raw = localStorage.getItem(xiuStorageKey(matchId));
    if (!raw) return defaultXiuWatchConfig();
    const p = JSON.parse(raw) as Partial<XiuOddsWatchConfig>;
    return {
      ...defaultXiuWatchConfig(),
      ...p,
      targetHandicap: typeof p.targetHandicap === 'number' && Number.isFinite(p.targetHandicap) ? p.targetHandicap : 1.5,
      minUnderOdds: typeof p.minUnderOdds === 'number' && Number.isFinite(p.minUnderOdds) ? p.minUnderOdds : 1.9,
      stake: typeof p.stake === 'number' && Number.isFinite(p.stake) && p.stake > 0 ? p.stake : 100_000,
      scope: p.scope === 'H1' ? 'H1' : 'FT',
      armed: Boolean(p.armed),
      notesSuffix:
        typeof p.notesSuffix === 'string' && p.notesSuffix.trim() ? p.notesSuffix.trim() : defaultXiuWatchConfig().notesSuffix,
    };
  } catch {
    return defaultXiuWatchConfig();
  }
}

export function saveTaiWatchConfig(matchId: string, cfg: TaiOddsWatchConfig): void {
  try {
    localStorage.setItem(taiStorageKey(matchId), JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
  notifyOuWatchChanged();
}

export function saveXiuWatchConfig(matchId: string, cfg: XiuOddsWatchConfig): void {
  try {
    localStorage.setItem(xiuStorageKey(matchId), JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
  notifyOuWatchChanged();
}

export function disarmTaiWatch(matchId: string): void {
  saveTaiWatchConfig(matchId, { ...loadTaiWatchConfig(matchId), armed: false });
}

export function disarmXiuWatch(matchId: string): void {
  saveXiuWatchConfig(matchId, { ...loadXiuWatchConfig(matchId), armed: false });
}

export interface OuSnapshotMinimal {
  handicap: number;
  over: number;
}

export interface OuFullSnapshot {
  handicap: number;
  over: number;
  under: number;
}

function handicapMatches(target: number, actual: number, eps = 0.052): boolean {
  return Number.isFinite(actual) && Math.abs(actual - target) <= eps;
}

export function pickMatchingTaiSnapshot(
  cfg: TaiOddsWatchConfig,
  ftOu: OuFullSnapshot | null | undefined,
  h1Ou: OuFullSnapshot | null | undefined,
): { snap: OuFullSnapshot; scope: TaiOddsWatchScope } | null {
  const s = cfg.scope === 'H1' ? h1Ou : ftOu;
  if (!s || !Number.isFinite(s.handicap) || !Number.isFinite(s.over)) return null;
  if (!handicapMatches(cfg.targetHandicap, s.handicap)) return null;
  if (s.over < cfg.minOverOdds - 1e-9) return null;
  return { snap: s, scope: cfg.scope };
}

export function pickMatchingXiuSnapshot(
  cfg: XiuOddsWatchConfig,
  ftOu: OuFullSnapshot | null | undefined,
  h1Ou: OuFullSnapshot | null | undefined,
): { snap: OuFullSnapshot; scope: TaiOddsWatchScope } | null {
  const s = cfg.scope === 'H1' ? h1Ou : ftOu;
  if (!s || !Number.isFinite(s.handicap) || !Number.isFinite(s.under)) return null;
  if (!handicapMatches(cfg.targetHandicap, s.handicap)) return null;
  if (s.under < cfg.minUnderOdds - 1e-9) return null;
  return { snap: s, scope: cfg.scope };
}

export function tryParseTaiWatchCommand(message: string): Partial<TaiOddsWatchConfig> | null {
  const taiContext =
    /\bcanh\b.+\btài\b|\btài\b.+\bcanh\b|\bcửa\b.+\btài\b|cài\s*đặt.+\btài\b|\bvào\s+lệnh.+\btài\b|cảnh\s*báo.+\btài\b|\bkèo\s*tài\b|\bcanh\b.+\bkèo\s*tài\b|\bkèo\s*tài\b.+\bcanh\b/i.test(message);
  const hasWatchIntent =
    taiContext ||
    (/\btài\b/i.test(message) && /\b(?:mặc|cài|thiết\s*lập|auto|tự)\b.?canh|cảnh\s*báo\s+khi\b/i.test(message));

  const hasTai = /\btài\b|kèo\s*tài/i.test(message);
  const hasXiu = /\bxỉu\b|\bxiu\b|kèo\s*xỉu|cửa\s*xỉu|under\b/i.test(message);
  if (!hasTai) return null;
  if (hasTai && hasXiu) {
    const tIdx = message.search(/\btài\b|kèo\s*tài/i);
    const xIdx = message.search(/\bxỉu\b|\bxiu\b|kèo\s*xỉu/i);
    if (tIdx >= 0 && xIdx >= 0 && xIdx < tIdx) return null;
  }

  const wantsH1 = /\bh1\b|hiệp\s*1|hiệp\s*một|\bht\b/i.test(message);

  let targetHandicap: number | undefined;
  let minOverOdds: number | undefined;
  let stake: number | undefined;

  const decs = [...message.matchAll(/\b(\d+[.,]\d{1,3})\b/g)].map((m) => parseFloat(m[1].replace(',', '.')));
  const small = decs.filter((n) => n >= 0.25 && n < 5);
  if (small.length >= 2) {
    targetHandicap = small[0];
    minOverOdds = small[1];
  } else if (small.length === 1) {
    targetHandicap = small[0];
  }

  const stakeMatch = message.toLowerCase().match(/\b(\d{3,})\s*(?:k\b|nghìn|nghin)?\b/);
  if (stakeMatch) {
    const n = parseInt(stakeMatch[1].replace(/\D/g, ''), 10);
    if (/k\b|nghìn|nghin/i.test(stakeMatch[0])) stake = n * 1000;
    else stake = n;
  }

  const hasPair = !!(targetHandicap != null && minOverOdds != null);
  if (!hasWatchIntent && !hasPair) return null;
  if (!hasWatchIntent && hasPair && !/\btài\b/i.test(message)) return null;

  const out: Partial<TaiOddsWatchConfig> = {
    armed: true,
    scope: wantsH1 ? 'H1' : 'FT',
  };
  if (targetHandicap != null && Number.isFinite(targetHandicap)) out.targetHandicap = targetHandicap;
  if (minOverOdds != null && Number.isFinite(minOverOdds)) out.minOverOdds = minOverOdds;
  if (stake != null && Number.isFinite(stake) && stake > 0) out.stake = stake;

  const parts = [
    'Chat: canh kèo Tài',
    targetHandicap != null ? `H≈${targetHandicap}` : '',
    minOverOdds != null ? `Tài≥${minOverOdds}` : '',
  ].filter(Boolean);
  out.notesSuffix = parts.join(' · ');
  return out;
}

export function tryParseXiuWatchCommand(message: string): Partial<XiuOddsWatchConfig> | null {
  const xiuCtx =
    /\bcanh\b.+\bxỉu\b|\bxỉu\b.+\bcanh\b|\bcửa\b.+\bxỉu\b|cài\s*đặt.+\bxỉu\b|\bvào\s+lệnh.+\bxỉu\b|cảnh\s*báo.+\bxỉu\b|\bkèo\s*xỉu\b|\bcanh\b.+\bkèo\s*xỉu\b|\bkèo\s*xỉu\b.+\bcanh\b|\bxiu\b.+\bcanh\b|\bcanh\b.+\bxiu\b/i.test(
      message,
    );
  const hasWatchIntent =
    xiuCtx ||
    (/\bxỉu\b|\bxiu\b/i.test(message) && /\b(?:mặc|cài|thiết\s*lập|auto|tự)\b.?canh|cảnh\s*báo\s+khi\b/i.test(message));

  const hasTai = /\btài\b|kèo\s*tài/i.test(message);
  const hasXiu = /\bxỉu\b|\bxiu\b|kèo\s*xỉu|cửa\s*xỉu|under\b/i.test(message);
  if (!hasXiu) return null;
  if (hasTai && hasXiu) {
    const tIdx = message.search(/\btài\b|kèo\s*tài/i);
    const xIdx = message.search(/\bxỉu\b|\bxiu\b|kèo\s*xỉu/i);
    if (tIdx >= 0 && xIdx >= 0 && tIdx < xIdx) return null;
  }

  const wantsH1 = /\bh1\b|hiệp\s*1|hiệp\s*một|\bht\b/i.test(message);

  let targetHandicap: number | undefined;
  let minUnderOdds: number | undefined;
  let stake: number | undefined;

  const decs = [...message.matchAll(/\b(\d+[.,]\d{1,3})\b/g)].map((m) => parseFloat(m[1].replace(',', '.')));
  const small = decs.filter((n) => n >= 0.25 && n < 5);
  if (small.length >= 2) {
    targetHandicap = small[0];
    minUnderOdds = small[1];
  } else if (small.length === 1) {
    targetHandicap = small[0];
  }

  const stakeMatch = message.toLowerCase().match(/\b(\d{3,})\s*(?:k\b|nghìn|nghin)?\b/);
  if (stakeMatch) {
    const n = parseInt(stakeMatch[1].replace(/\D/g, ''), 10);
    if (/k\b|nghìn|nghin/i.test(stakeMatch[0])) stake = n * 1000;
    else stake = n;
  }

  const hasPair = !!(targetHandicap != null && minUnderOdds != null);
  const mentionsXiu = /\bxỉu\b|\bxiu\b|under\b|cửa\s*xỉu/i.test(message);

  if (!hasWatchIntent && !hasPair) return null;
  if (!hasWatchIntent && hasPair && !mentionsXiu) return null;

  const out: Partial<XiuOddsWatchConfig> = {
    armed: true,
    scope: wantsH1 ? 'H1' : 'FT',
  };
  if (targetHandicap != null && Number.isFinite(targetHandicap)) out.targetHandicap = targetHandicap;
  if (minUnderOdds != null && Number.isFinite(minUnderOdds)) out.minUnderOdds = minUnderOdds;
  if (stake != null && Number.isFinite(stake) && stake > 0) out.stake = stake;

  const parts = [
    'Chat: canh kèo Xỉu',
    targetHandicap != null ? `H≈${targetHandicap}` : '',
    minUnderOdds != null ? `Xỉu≥${minUnderOdds}` : '',
  ].filter(Boolean);
  out.notesSuffix = parts.join(' · ');
  return out;
}

/** Thời gian hiển thị “Đã khớp / đã mở vé” sau trigger (ms). */
export const OU_WATCH_FIRE_HINT_MS = 180_000;

const fireHintStorageKey = (matchId: string, side: 'tai' | 'xiu') => `pfa_ouw_fire_${matchId}_${side}`;

export function setOuWatchFiredHint(matchId: string, side: 'tai' | 'xiu'): void {
  try {
    sessionStorage.setItem(fireHintStorageKey(matchId, side), String(Date.now()));
  } catch {
    /* ignore */
  }
  notifyOuWatchChanged();
}

export function ouWatchFiredHintRemainingMs(matchId: string, side: 'tai' | 'xiu'): number {
  try {
    const raw = sessionStorage.getItem(fireHintStorageKey(matchId, side));
    if (!raw) return 0;
    const t = parseInt(raw, 10);
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, OU_WATCH_FIRE_HINT_MS - (Date.now() - t));
  } catch {
    return 0;
  }
}
