import fs from 'node:fs/promises';
import type { PollLogEntry } from './types.js';

/** Ghi nối tiếp một dòng poll_log, flush ngay. */
export async function appendPollLog(pollLogPath: string, entry: PollLogEntry): Promise<void> {
  await fs.appendFile(pollLogPath, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
}
