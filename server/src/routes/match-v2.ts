import fs from 'node:fs';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Router, type Request, type Response } from 'express';
import { matchV2Registry } from '../match-v2/registry.js';
import { findExistingMatchDir, pathsForMatchDir } from '../match-v2/paths.js';
import type { RawOddsRecord } from '../match-v2/types.js';
import { logger } from '../logger.js';

/**
 * Thu thập odds thô v2 (bước 1):
 *   POST /api/match-v2/start  { matchId, b365Token? }
 *   POST /api/match-v2/stop   { matchId }
 *   GET  /api/match-v2/status
 *   GET  /api/match-v2/status/:matchId
 *   GET  /api/match-v2/odds/:matchId?market=1_3
 */
export function createMatchV2Router(): Router {
  const router = Router();

  router.get('/status', (_req: Request, res: Response): void => {
    res.json({
      root: matchV2Registry.root,
      collectors: matchV2Registry.list(),
    });
  });

  router.get('/status/:matchId', (req: Request, res: Response): void => {
    const matchId = String(req.params.matchId);
    const collector = matchV2Registry.get(matchId);
    if (!collector) {
      res.status(404).json({ error: 'collector không chạy', matchId });
      return;
    }
    res.json(collector.getStatus());
  });

  /** Đọc odds.jsonl đã lưu (không cần collector đang chạy). */
  router.get('/odds/:matchId', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.params.matchId ?? '').trim();
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    const marketFilter =
      typeof req.query.market === 'string' && req.query.market.trim()
        ? req.query.market.trim()
        : null;

    const matchDir = findExistingMatchDir(matchV2Registry.root, matchId);
    if (!matchDir) {
      res.status(404).json({ error: 'không có thư mục trận v2', matchId });
      return;
    }
    const { oddsJsonl } = pathsForMatchDir(matchDir);
    if (!fs.existsSync(oddsJsonl)) {
      res.status(404).json({ error: 'chưa có odds.jsonl', matchId, path: oddsJsonl });
      return;
    }

    const records: RawOddsRecord[] = [];
    try {
      const stream = createReadStream(oddsJsonl, { encoding: 'utf8' });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const row = JSON.parse(trimmed) as RawOddsRecord;
          if (marketFilter && String(row.market) !== marketFilter) continue;
          records.push(row);
        } catch {
          // dòng hỏng
        }
      }
      res.json({ matchId, path: oddsJsonl, count: records.length, records });
    } catch (err) {
      logger.warn(`[match-v2] đọc odds.jsonl thất bại: ${(err as Error).message}`);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/start', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.body?.matchId ?? '').trim();
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    const b365Token =
      typeof req.body?.b365Token === 'string' && req.body.b365Token.trim()
        ? req.body.b365Token.trim()
        : undefined;
    const league = typeof req.body?.league === 'string' ? req.body.league.trim() : undefined;
    const home = typeof req.body?.home === 'string' ? req.body.home.trim() : undefined;
    const away = typeof req.body?.away === 'string' ? req.body.away.trim() : undefined;

    try {
      const status = await matchV2Registry.start(matchId, { b365Token, league, home, away });
      logger.info(`[match-v2] API start match=${matchId}`);
      res.json({ ok: true, status });
    } catch (err) {
      logger.warn(`[match-v2] API start failed: ${(err as Error).message}`);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** POST /api/match-v2/report { matchId } — sinh lại report.md từ file thô. */
  router.post('/report', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.body?.matchId ?? '').trim();
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    try {
      const { generateReportForMatchId } = await import('../match-v2/generate-report.js');
      const result = await generateReportForMatchId(matchId, matchV2Registry.root);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.post('/stop', async (req: Request, res: Response): Promise<void> => {
    const matchId = String(req.body?.matchId ?? '').trim();
    if (!matchId) {
      res.status(400).json({ error: 'Thiếu matchId' });
      return;
    }
    const status = await matchV2Registry.stop(matchId);
    if (!status) {
      res.status(404).json({ error: 'collector không chạy', matchId });
      return;
    }
    res.json({ ok: true, status });
  });

  return router;
}
