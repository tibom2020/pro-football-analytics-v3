import fs from 'node:fs/promises';
import type { StatsRow } from './types.js';

/** Ghi nối tiếp một snapshot stats — kể cả khi nội dung trùng dòng trước. */
export async function appendStatsRow(statsJsonlPath: string, row: StatsRow): Promise<void> {
  await fs.appendFile(statsJsonlPath, JSON.stringify(row) + '\n', { encoding: 'utf8' });
}

/**
 * Dựng StatsRow từ event inplay.
 * `add_time` = Unix giây lúc poll (ghép được với chuỗi odds theo thời gian thật).
 * Không tự tính phút; giữ timer_raw + stats nguyên bản.
 */
export function buildStatsRowFromEvent(
  addTimeUnix: number,
  event: {
    timer?: Record<string, unknown> | null;
    ss?: string | null;
    stats?: Record<string, unknown> | null;
  },
): StatsRow {
  return {
    add_time: addTimeUnix,
    timer_raw: event.timer && typeof event.timer === 'object' ? { ...event.timer } : null,
    ss: event.ss != null ? String(event.ss) : null,
    stats: event.stats && typeof event.stats === 'object' ? { ...event.stats } : {},
  };
}
