import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';

const B365_INPLAY = 'https://api.b365api.com/v3/events/inplay?sport_id=1';

export const B365_SERVER_TOKEN = '__SERVER__';

/** Gọi thẳng B365 từ server Node — không qua Cloudflare Worker. */
export async function probeB365Token(token: string): Promise<{
  ok: boolean;
  error?: string;
  matchCount?: number;
}> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 5) {
    return { ok: false, error: 'Token quá ngắn hoặc trống.' };
  }
  try {
    const url = `${B365_INPLAY}&token=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (res.status === 403) {
      return { ok: false, error: 'Token bị từ chối (403). Kiểm tra lại token trên b365api.com.' };
    }
    if (!res.ok) {
      return { ok: false, error: `B365 trả lỗi HTTP ${res.status}. Thử lại sau.` };
    }
    const text = await res.text();
    if (!text.trim()) {
      return { ok: true, matchCount: 0 };
    }
    let data: { success?: number | string; error?: string; results?: unknown[] };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return { ok: false, error: 'Phản hồi B365 không hợp lệ (không phải JSON).' };
    }
    if (data.success !== 1 && data.success !== '1') {
      return { ok: false, error: data.error || 'Token không hợp lệ hoặc hết hạn.' };
    }
    return { ok: true, matchCount: Array.isArray(data.results) ? data.results.length : 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(`B365 token probe failed: ${msg}`);
    return { ok: false, error: 'Không kết nối được B365 API. Kiểm tra mạng server.' };
  }
}

function resolveToken(raw: unknown): string | null {
  const t = String(raw ?? '').trim();
  if (!t) return config.b365.apiToken || null;
  if (t === B365_SERVER_TOKEN) return config.b365.apiToken || null;
  return t;
}

export function createB365AuthRouter(): Router {
  const router = Router();

  /** GET /api/auth/b365-status — frontend biết có token server hay không. */
  router.get('/b365-status', (_req: Request, res: Response): void => {
    res.json({
      serverTokenConfigured: config.b365.apiToken.length > 5,
    });
  });

  /** POST /api/auth/b365-verify — kiểm tra token trước khi lưu localStorage. */
  router.post('/b365-verify', async (req: Request, res: Response): Promise<void> => {
    const token = resolveToken(req.body?.token);
    if (!token) {
      res.status(400).json({
        ok: false,
        error: 'Chưa có token. Nhập token B365 hoặc cấu hình B365_API_TOKEN trên server.',
      });
      return;
    }
    const result = await probeB365Token(token);
    res.status(result.ok ? 200 : 401).json(result);
  });

  return router;
}
