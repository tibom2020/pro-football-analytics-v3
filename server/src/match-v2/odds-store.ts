import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { RawOddsRecord } from './types.js';

/**
 * Đọc `odds.jsonl` có sẵn → dựng lại Set id đã ghi.
 * Dòng hỏng / thiếu id thì bỏ qua (không crash khởi động lại).
 */
export async function loadWrittenOddsIds(oddsJsonlPath: string): Promise<{
  ids: Set<string>;
  countsByMarket: Record<string, number>;
}> {
  const ids = new Set<string>();
  const countsByMarket: Record<string, number> = {};

  try {
    await fs.access(oddsJsonlPath);
  } catch {
    return { ids, countsByMarket };
  }

  const stream = createReadStream(oddsJsonlPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as Partial<RawOddsRecord>;
      if (row.id == null || row.id === '') continue;
      const id = String(row.id);
      if (ids.has(id)) continue;
      ids.add(id);
      const market = row.market != null ? String(row.market) : '_unknown';
      countsByMarket[market] = (countsByMarket[market] ?? 0) + 1;
    } catch {
      // dòng hỏng — bỏ qua
    }
  }

  return { ids, countsByMarket };
}

/**
 * Ghi nối tiếp các bản ghi mới vào `odds.jsonl`, flush sau lần ghi.
 * Không ghi đè file; không sắp xếp lại.
 */
export async function appendOddsRecords(
  oddsJsonlPath: string,
  records: RawOddsRecord[],
): Promise<void> {
  if (records.length === 0) return;
  const chunk = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await fs.appendFile(oddsJsonlPath, chunk, { encoding: 'utf8' });
}
