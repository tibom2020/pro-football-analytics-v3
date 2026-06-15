import { AI_SERVER_URL } from './ai-service';

/** Đồng bộ với FollowMatchToggle — dự phòng khi ref chưa hydrate kịp. */
export function getFollowSubscriptionIdFromStorage(matchId: string): string | null {
  try {
    return localStorage.getItem(`pfa_follow_sub_id_${matchId}`);
  } catch {
    return null;
  }
}

export interface MatchSnapshotPayload {
  matchId: string;
  leagueName: string;
  matchLine: string;
  score: string;
  minute: number;
  /** Giữ tương thích; nếu có `oddsTwoTeamLines` thì ưu tiên hiển thị trên server. */
  oddsLines: string[];
  /** Tổng hợp nhanh (sút, DA, góc…). */
  statsLines: string[];
  /** Dòng 1: điểm API (calculateAPIScore) 2 đội; sau đó chi tiết từng đội. */
  perTeamApiLines?: string[];
  /** Tài/Xỉu cả trận + chấp chủ/khách — nhãn rõ cho 2 đội. */
  oddsTwoTeamLines?: string[];
  /** Chuỗi hiển thị, vd `12', 24'` hoặc `Chưa có`. */
  pressureBellHistoryMinutes?: string;
  /** Chuỗi hiển thị phút cảnh báo cường độ giảm giá OU. */
  ouDropIntensityHistoryMinutes?: string;
}

export function uniqueSortedMinutes(mins: number[]): number[] {
  return [...new Set(mins.filter((m) => Number.isFinite(m)))].sort((a, b) => a - b);
}

export function formatMinuteListForTelegram(mins: number[]): string {
  const u = uniqueSortedMinutes(mins);
  if (u.length === 0) return 'Chưa có';
  return u.map((m) => `${m}'`).join(', ');
}

export function buildTelegramBroadcastBody(
  matchSnapshot: MatchSnapshotPayload,
  alertMessage: string,
  includeLegacyOdds: boolean = true,
): string {
  const { leagueName, matchLine, score, minute, oddsLines, statsLines } = matchSnapshot;
  const lines: string[] = [
    `🏆 ${leagueName}`,
    ``,
    `⚽ ${matchLine}`,
    `📍 Tỷ số: ${score} | Phút: ${minute}'`,
  ];

  const odd2 = matchSnapshot.oddsTwoTeamLines?.filter(Boolean) ?? [];
  if (odd2.length > 0) {
    lines.push(``, `🎯 Kèo (T/X & chấp — 2 đội):`, ...odd2.map((l) => `  ${l}`));
  } else if (includeLegacyOdds && oddsLines.length > 0) {
    lines.push(``, `📈 Kèo hiện có:`, ...oddsLines.map((l) => `  ${l}`));
  }

  const perTeam = matchSnapshot.perTeamApiLines?.filter(Boolean) ?? [];
  if (perTeam.length > 0) {
    lines.push(``, `📡 Chỉ số từng đội (API):`, ...perTeam.map((l) => `  ${l}`));
  }

  if (statsLines.length > 0) {
    lines.push(``, `📊 Chỉ số tổng hợp:`, ...statsLines.map((l) => `  ${l}`));
  }

  const bell = matchSnapshot.pressureBellHistoryMinutes?.trim() ?? 'Chưa có';
  const ouD = matchSnapshot.ouDropIntensityHistoryMinutes?.trim() ?? 'Chưa có';
  lines.push(``, `🔔 Lịch sử chuông báo động (phút): ${bell}`);
  lines.push(`📉 Lịch sử cường độ giảm giá OU (phút): ${ouD}`);
  lines.push(``, alertMessage);
  return lines.join('\n');
}

export interface NhatKyAlertWire {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  minute: number;
}

/** Kênh để bắn thông báo sang UI (Sidebar AI) — gom tất cả tin Telegram vào đây. */
export const aiNotifyChannel = new BroadcastChannel('pfa_ai_notifications');

/**
 * Gửi bản ghi Nhật ký Cảnh báo lên server → Telegram (nếu đã theo dõi + đã bind bot).
 * Lỗi mạng chỉ log — không throw.
 */
export async function postNhatKyTelegramNotify(
  subscriptionId: string,
  alert: NhatKyAlertWire,
  matchSnapshot: MatchSnapshotPayload,
  options?: { telegramHeader?: string },
): Promise<void> {
  aiNotifyChannel.postMessage({
    id: alert.id || Date.now().toString(),
    title: options?.telegramHeader || alert.title || 'CẢNH BÁO',
    body: buildTelegramBroadcastBody(matchSnapshot, alert.message, true),
    timestamp: Date.now(),
  });

  try {
    const res = await fetch(`${AI_SERVER_URL}/api/follow-match/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId,
        alert,
        matchSnapshot,
        ...(options?.telegramHeader ? { telegramHeader: options.telegramHeader } : {}),
      }),
    });
    let json: { success?: boolean; error?: string; skipped?: boolean; reason?: string } = {};
    try {
      json = (await res.json()) as typeof json;
    } catch {
      console.warn('[follow-match-notify] Phản hồi không phải JSON, HTTP', res.status);
      return;
    }
    if (!res.ok) {
      console.warn('[follow-match-notify] HTTP', res.status, json.error || '');
      return;
    }
    if (!json.success) {
      console.warn('[follow-match-notify] Server failure:', json.error || '(no error msg)');
    }
  } catch (e) {
    console.warn('[follow-match-notify] network/CORS — kiểm tra VITE_AI_SERVER_URL và server AI đang chạy:', e);
  }
}

/** Gửi tin thử qua Telegram (layout giống Nhật ký) — dùng nút test trên app. */
export async function postFollowMatchTestNotify(
  subscriptionId: string,
  matchSnapshot: MatchSnapshotPayload,
): Promise<{ ok: boolean; status?: number; detail?: string }> {
  aiNotifyChannel.postMessage({
    id: `test-${Date.now()}`,
    title: '🔔 TIN NHẮN THỬ NGHIỆM',
    body: buildTelegramBroadcastBody(
      matchSnapshot,
      'Đây là tin nhắn kiểm tra kết nối hệ thống.',
      true,
    ),
    timestamp: Date.now(),
  });

  try {
    const res = await fetch(`${AI_SERVER_URL}/api/follow-match/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId, matchSnapshot }),
    });
    const json = await res.json();
    if (!json.success) {
      return { ok: false, detail: json.error || 'Server returned failure' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export interface OddsSnapshotWire {
  minute: number;
  handicap: number;
  handicapAH?: number;
  score?: string;
  overOdds?: number;
  underOdds?: number;
  homeOdds?: number;
  awayOdds?: number;
}

/** Gửi kèm push kèo — server dùng cho tin « CẢNH BÁO KÈO » (Telegram). */
export interface OddsPushTelegramContextWire {
  perTeamApiLines?: string[];
  statsLines?: string[];
  /** Tóm tắt các yếu tố truyền thống (động lực/cụm sút/áp lực/staleness). */
  traditionalFactorsLines?: string[];
  pressureBellHistoryMinutes?: string;
  ouDropIntensityHistoryMinutes?: string;
}

export async function pushOddsSnapshotToServer(
  matchId: string,
  snapshot: OddsSnapshotWire,
  telegramContext?: OddsPushTelegramContextWire,
): Promise<void> {
  try {
    await fetch(`${AI_SERVER_URL}/api/odds/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, snapshot, ...(telegramContext ? { telegramContext } : {}) }),
    });
  } catch (e) {
    console.warn('[follow-match] odds push failed', e);
  }
}
