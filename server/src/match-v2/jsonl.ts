import fs from 'node:fs';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/** Đọc từng dòng JSONL; dòng hỏng bỏ qua. */
export async function readJsonlLines<T = unknown>(filePath: string): Promise<T[]> {
  if (!fs.existsSync(filePath)) return [];
  const out: T[] = [];
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as T);
    } catch {
      // bỏ qua
    }
  }
  return out;
}

/** Đếm số dòng JSONL không rỗng (không parse). */
export async function countJsonlLines(filePath: string): Promise<number> {
  if (!fs.existsSync(filePath)) return 0;
  let n = 0;
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) n += 1;
  }
  return n;
}
