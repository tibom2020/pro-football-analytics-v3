import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../logger.js';

const MAX_BODY = 3 * 1024 * 1024;

export type HistorySaveTarget = 'history' | 'live';

function resolveHistoryDir(target: HistorySaveTarget = 'history'): string {
  if (target === 'live') {
    const liveEnv = process.env.HISTORY_LIVE_EXPORT_DIR;
    if (liveEnv?.trim()) {
      return path.resolve(liveEnv.trim());
    }
    return path.resolve(process.cwd(), '..', 'History_live');
  }
  const env = process.env.HISTORY_EXPORT_DIR;
  if (env?.trim()) {
    return path.resolve(env.trim());
  }
  return path.resolve(process.cwd(), 'History');
}

function isSafeBasename(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  if (!name.toLowerCase().endsWith('.md')) return false;
  return /^[a-zA-Z0-9._\-+,()[\] ]+\.md$/i.test(name);
}

export function createHistorySaveRouter(): Router {
  const router = Router();

  router.post('/save', async (req, res) => {
    try {
      const { filename, content, target } = req.body ?? {};
      const saveTarget: HistorySaveTarget = target === 'live' ? 'live' : 'history';
      if (typeof filename !== 'string' || typeof content !== 'string') {
        res.status(400).json({ error: 'filename và content phải là chuỗi' });
        return;
      }
      if (!isSafeBasename(filename)) {
        res.status(400).json({ error: 'filename không hợp lệ (chỉ .md, không đường dẫn)' });
        return;
      }
      if (content.length > MAX_BODY) {
        res.status(413).json({ error: 'content quá lớn' });
        return;
      }

      const dir = resolveHistoryDir(saveTarget);
      await fs.mkdir(dir, { recursive: true });
      const fullPath = path.join(dir, filename);
      const resolvedDir = path.resolve(dir);
      const normalized = path.normalize(fullPath);
      if (!normalized.startsWith(resolvedDir + path.sep)) {
        res.status(400).json({ error: 'path không an toàn' });
        return;
      }

      await fs.writeFile(normalized, content, 'utf8');
      logger.info(`History MD saved (${saveTarget}): ${normalized}`);
      res.json({ ok: true, path: normalized, target: saveTarget });
    } catch (err) {
      logger.error('History save failed:', err);
      res.status(500).json({ error: 'ghi file thất bại' });
    }
  });

  return router;
}
