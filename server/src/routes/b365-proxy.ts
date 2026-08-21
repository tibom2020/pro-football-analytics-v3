import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { B365_SERVER_TOKEN } from './b365-auth.js';
import { fetchB365Cached } from '../b365-upstream.js';

/** Thay `token=__SERVER__` bằng B365_API_TOKEN trên server (deploy production). */
function resolveTargetUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const tok = u.searchParams.get('token');
    if (tok === B365_SERVER_TOKEN) {
      if (!config.b365.apiToken) return null;
      u.searchParams.set('token', config.b365.apiToken);
    }
    return u.toString();
  } catch {
    return null;
  }
}

export function createB365ProxyRouter(): Router {
  const router = Router();

  /**
   * GET /api/b365-proxy?target=URL
   */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const rawTarget = req.query.target as string;

    if (!rawTarget) {
      res.status(400).json({ error: 'Missing target URL' });
      return;
    }

    const targetUrl = resolveTargetUrl(rawTarget);
    if (!targetUrl) {
      res.status(503).json({
        error: 'Server chưa cấu hình B365_API_TOKEN. Thêm biến môi trường trên Railway/Render.',
      });
      return;
    }

    const result = await fetchB365Cached(targetUrl);
    if (result.ok) {
      if (result.cached) res.setHeader('X-B365-Cache', 'hit');
      res.json(result.data);
      return;
    }

    if (result.http === 204) {
      res.status(204).send();
      return;
    }

    const status = result.http >= 400 ? result.http : 500;
    res.status(status).json({ error: 'Upstream fetch failed', status });
  });

  return router;
}
