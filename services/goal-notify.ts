/**
 * Thông báo khi có bàn thắng ở trận đang mở: âm thanh "beep" + Notification trình duyệt
 * (nếu được cấp quyền) + CustomEvent để UI hiện toast trong app. Tất cả best-effort, không ném lỗi.
 */

export interface GoalNotifyInfo {
  matchId: string;
  home: string;
  away: string;
  /** Tỷ số mới sau bàn thắng, dạng "2-1". */
  score: string;
  half: 1 | 2;
  minute: number;
  scorerTeam?: 'home' | 'away';
}

/** Event in-app để Dashboard/toast lắng nghe. */
export const GOAL_NOTIFY_EVENT = 'pfa:goal-notify';

let audioCtx: AudioContext | null = null;

/** Xin quyền Notification (best-effort, im lặng nếu bị chặn). Gọi sớm để lần có bàn đầu đã sẵn quyền. */
export function ensureGoalNotifyPermission(): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  } catch {
    // trình duyệt không hỗ trợ — bỏ qua
  }
}

function beep(): void {
  try {
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    // 2 nốt ngắn cho dễ nhận biết.
    const play = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    play(880, 0, 0.18);
    play(1175, 0.16, 0.28);
  } catch {
    // autoplay bị chặn hoặc lỗi WebAudio — bỏ qua
  }
}

/** Bắn thông báo bàn thắng: beep + Notification trình duyệt + CustomEvent in-app. */
export function notifyGoal(info: GoalNotifyInfo): void {
  const scorer =
    info.scorerTeam === 'home' ? info.home : info.scorerTeam === 'away' ? info.away : '';
  const title = `⚽ BÀN THẮNG — ${info.home} ${info.score} ${info.away}`;
  const body = `H${info.half} · ${info.minute}'${scorer ? ` — ${scorer} ghi bàn` : ''}`;

  beep();

  try {
    window.dispatchEvent(new CustomEvent<GoalNotifyInfo>(GOAL_NOTIFY_EVENT, { detail: info }));
  } catch {
    // bỏ qua
  }

  try {
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          tag: `goal-${info.matchId}-${info.score}`,
          renotify: true,
        } as NotificationOptions);
        setTimeout(() => {
          try {
            n.close();
          } catch {
            /* noop */
          }
        }, 8000);
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  } catch {
    // bỏ qua
  }
}
