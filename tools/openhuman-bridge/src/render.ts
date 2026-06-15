import type {
  PersistedBetTicket,
  OddsSubscription,
  OddsAlert,
} from './sources.js';

function fmtTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

function fmtVi(ms: number): string {
  return new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function frontmatter(extra: Record<string, string | number | boolean>): string {
  const lines = ['---', 'source: pfa', `updated_at: ${new Date().toISOString()}`];
  for (const [k, v] of Object.entries(extra)) {
    lines.push(`${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function ticketProfitLoss(t: PersistedBetTicket): number {
  switch (t.status) {
    case 'won':
      return t.stake * t.odds - t.stake;
    case 'lost':
      return -t.stake;
    case 'won_half':
      return (t.stake * t.odds - t.stake) / 2;
    case 'lost_half':
      return -t.stake / 2;
    default:
      return 0;
  }
}

function statusVi(s: PersistedBetTicket['status']): string {
  switch (s) {
    case 'pending':
      return 'Đang chờ';
    case 'won':
      return 'Thắng';
    case 'lost':
      return 'Thua';
    case 'push':
      return 'Hòa';
    case 'won_half':
      return 'Thắng ½';
    case 'lost_half':
      return 'Thua ½';
  }
}

function tableRow(cells: (string | number)[]): string {
  return `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`;
}

export function renderActiveBets(tickets: PersistedBetTicket[]): string {
  const active = tickets.filter((t) => t.status === 'pending');
  active.sort((a, b) => b.createdAt - a.createdAt);

  const head = frontmatter({ title: 'Kèo đang chờ', count: active.length });
  if (active.length === 0) {
    return `${head}# Kèo đang chờ\n\nKhông có kèo nào đang chờ.\n`;
  }

  const rows = [
    tableRow(['Thời điểm', 'Trận', 'Loại', 'Handicap', 'Odds', 'Stake', 'Phút', 'Tỉ số', 'Ghi chú']),
    tableRow(['---', '---', '---', '---', '---', '---', '---', '---', '---']),
    ...active.map((t) =>
      tableRow([
        fmtVi(t.createdAt),
        t.matchName,
        t.betType,
        t.handicap,
        t.odds.toFixed(2),
        t.stake.toLocaleString('vi-VN'),
        t.minute,
        t.scoreAtBet ?? '',
        (t.noteSnapshot ?? t.notes ?? '').slice(0, 80),
      ]),
    ),
  ];
  return `${head}# Kèo đang chờ (${active.length})\n\n${rows.join('\n')}\n`;
}

export function renderBetHistory(tickets: PersistedBetTicket[]): string {
  const settled = tickets.filter((t) => t.status !== 'pending');
  settled.sort((a, b) => b.createdAt - a.createdAt);

  const head = frontmatter({ title: 'Lịch sử kèo đã chốt', count: settled.length });
  if (settled.length === 0) {
    return `${head}# Lịch sử kèo\n\nChưa có kèo nào đã chốt.\n`;
  }

  // Group by day
  const byDay = new Map<string, PersistedBetTicket[]>();
  for (const t of settled) {
    const day = new Date(t.createdAt).toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const arr = byDay.get(day) ?? [];
    arr.push(t);
    byDay.set(day, arr);
  }

  const sections: string[] = [];
  for (const [day, arr] of byDay) {
    const dayPl = arr.reduce((s, t) => s + ticketProfitLoss(t), 0);
    sections.push(`## ${day} — P/L: ${dayPl >= 0 ? '+' : ''}${dayPl.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}\n`);
    const rows = [
      tableRow(['Trận', 'Loại', 'Handicap', 'Odds', 'Stake', 'KQ', 'P/L', 'Ghi chú']),
      tableRow(['---', '---', '---', '---', '---', '---', '---', '---']),
      ...arr.map((t) => {
        const pl = ticketProfitLoss(t);
        return tableRow([
          t.matchName,
          t.betType,
          t.handicap,
          t.odds.toFixed(2),
          t.stake.toLocaleString('vi-VN'),
          statusVi(t.status),
          `${pl >= 0 ? '+' : ''}${pl.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`,
          (t.noteSnapshot ?? t.notes ?? '').slice(0, 60),
        ]);
      }),
    ];
    sections.push(rows.join('\n'));
    sections.push('');
  }

  return `${head}# Lịch sử kèo đã chốt (${settled.length})\n\n${sections.join('\n')}`;
}

export function renderFollows(subs: OddsSubscription[]): string {
  const active = subs.filter((s) => s.active);
  active.sort((a, b) => b.createdAt - a.createdAt);
  const head = frontmatter({ title: 'Trận đang follow', count: active.length });
  if (active.length === 0) {
    return `${head}# Đang follow\n\nChưa follow trận nào.\n`;
  }
  const rows = [
    tableRow(['Trận', 'Giải', 'Markets', 'Threshold', 'Theo dõi từ']),
    tableRow(['---', '---', '---', '---', '---']),
    ...active.map((s) =>
      tableRow([
        s.matchName,
        s.leagueName ?? '',
        (s.markets ?? []).join(', '),
        s.threshold ?? '',
        fmtVi(s.createdAt),
      ]),
    ),
  ];
  return `${head}# Đang follow (${active.length})\n\n${rows.join('\n')}\n`;
}

export function renderAlertsToday(alerts: OddsAlert[]): string {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = alerts.filter((a) => a.timestamp >= cutoff);
  recent.sort((a, b) => b.timestamp - a.timestamp);
  const head = frontmatter({ title: 'Alerts 24h', count: recent.length });
  if (recent.length === 0) {
    return `${head}# Alerts 24h\n\nKhông có alert nào trong 24h qua.\n`;
  }
  const lines = recent.map((a) => {
    const cp =
      typeof a.changePercent === 'number'
        ? ` (${(a.changePercent * 100).toFixed(1)}%)`
        : '';
    const minute = typeof a.minute === 'number' ? ` phút ${a.minute}'` : '';
    return `- **${fmtVi(a.timestamp)}** — ${a.matchName}${minute} — ${a.alertType ?? 'alert'} ${a.market ?? ''}${cp} — ${a.message ?? ''}`;
  });
  return `${head}# Alerts 24h (${recent.length})\n\n${lines.join('\n')}\n`;
}

export function renderSummary(tickets: PersistedBetTicket[]): string {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayOfWeek = now.getDay();
  const startOfWeekDate = new Date(now);
  startOfWeekDate.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  startOfWeekDate.setHours(0, 0, 0, 0);
  const startOfWeek = startOfWeekDate.getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  function aggregate(since: number) {
    const slice = tickets.filter((t) => t.createdAt >= since && t.status !== 'pending');
    const stake = slice.reduce((s, t) => s + t.stake, 0);
    const pl = slice.reduce((s, t) => s + ticketProfitLoss(t), 0);
    const won = slice.filter((t) => t.status === 'won' || t.status === 'won_half').length;
    const lost = slice.filter((t) => t.status === 'lost' || t.status === 'lost_half').length;
    const winRate = won + lost === 0 ? 0 : (won / (won + lost)) * 100;
    return { count: slice.length, stake, pl, won, lost, winRate };
  }

  const today = aggregate(startOfDay);
  const week = aggregate(startOfWeek);
  const month = aggregate(startOfMonth);
  const pending = tickets.filter((t) => t.status === 'pending').length;

  const head = frontmatter({ title: 'PFA summary', pending });
  const fmt = (n: number) =>
    n.toLocaleString('vi-VN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

  return [
    head,
    '# Tổng quan PFA',
    '',
    `**Cập nhật:** ${fmtVi(Date.now())}  `,
    `**Kèo đang chờ:** ${pending}`,
    '',
    '## Hôm nay',
    `- Số kèo chốt: ${today.count} (thắng ${today.won} / thua ${today.lost})`,
    `- Tổng cược: ${fmt(today.stake)}`,
    `- P/L: **${today.pl >= 0 ? '+' : ''}${fmt(today.pl)}**`,
    `- Tỉ lệ thắng: ${today.winRate.toFixed(1)}%`,
    '',
    '## Tuần này',
    `- Số kèo chốt: ${week.count} (thắng ${week.won} / thua ${week.lost})`,
    `- Tổng cược: ${fmt(week.stake)}`,
    `- P/L: **${week.pl >= 0 ? '+' : ''}${fmt(week.pl)}**`,
    `- Tỉ lệ thắng: ${week.winRate.toFixed(1)}%`,
    '',
    '## Tháng này',
    `- Số kèo chốt: ${month.count} (thắng ${month.won} / thua ${month.lost})`,
    `- Tổng cược: ${fmt(month.stake)}`,
    `- P/L: **${month.pl >= 0 ? '+' : ''}${fmt(month.pl)}**`,
    `- Tỉ lệ thắng: ${month.winRate.toFixed(1)}%`,
    '',
  ].join('\n');
}
