import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

function getClientId(req: Request): string {
  return (req.headers['x-user-id'] as string)
    || req.ip
    || req.socket.remoteAddress
    || 'unknown';
}

export function rateLimit(
  windowMs?: number,
  maxRequests?: number,
) {
  const window = windowMs ?? config.rateLimit.windowMs;
  const max = maxRequests ?? config.rateLimit.maxRequests;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.originalUrl.includes('/api/sheets')) {
      next();
      return;
    }

    /** Single-user Live Agent & CopilotKit — không tính vào hạn mức chung. */
    if (req.originalUrl.includes('/api/live-agent') || req.originalUrl.includes('/api/copilotkit')) {
      next();
      return;
    }

    /** Goal-prediction: idempotent, đã throttle client-side (20s/tab) + chậm tự nhiên do Ollama. */
    if (req.originalUrl.includes('/api/ai/predict-goal')) {
      next();
      return;
    }

    const clientId = getClientId(req);
    const now = Date.now();

    let entry = store.get(clientId);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + window };
      store.set(clientId, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    if (entry.count > max) {
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again after ${new Date(entry.resetAt).toISOString()}`,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}
