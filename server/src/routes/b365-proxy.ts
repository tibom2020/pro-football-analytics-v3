import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { B365_SERVER_TOKEN } from './b365-auth.js';

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
  
  // Cache to store API responses
  const cache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL_MS = 15000; // 15 seconds cache

  // Periodically clean up old cache entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
      }
    }
  }, 60000);

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

    // 1. Check if we have a valid cached response
    const cached = cache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.data);
      return;
    }

    // 2. Not in cache or expired, fetch from target
    try {
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        logger.warn(`B365 Proxy fetch failed for ${targetUrl}: ${response.status} ${response.statusText}`);
        res.status(response.status).json({ error: 'Upstream fetch failed', status: response.status });
        return;
      }
      
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        res.status(204).send();
        return;
      }
      
      try {
        const data = JSON.parse(text);
        
        // Save to cache only on success
        if (data.success === 1 || data.success === '1' || data.results) {
          cache.set(targetUrl, { data, timestamp: Date.now() });
        }
        
        res.json(data);
      } catch (e) {
        logger.error(`B365 Proxy JSON parse error for ${targetUrl}:`, e);
        res.status(502).json({ error: 'Invalid JSON response from upstream' });
      }
    } catch (error) {
      logger.error(`B365 Proxy error fetching ${targetUrl}:`, error);
      res.status(500).json({ error: 'Internal server proxy error' });
    }
  });

  return router;
}
