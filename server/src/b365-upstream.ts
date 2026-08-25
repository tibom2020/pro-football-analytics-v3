import { logger } from './logger.js';

type CacheEntry = { data: unknown; timestamp: number };
type FetchResult =
  | { ok: true; http: number; ms: number; data: unknown; cached?: boolean }
  | { ok: false; http: number; ms: number; error: string };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<FetchResult>>();

const STALE_MAX_MS = 120_000;
const COOLDOWN_429_MS = 30_000;
const B365_RETRYABLE_HTTP = new Set([0, 502, 503, 504]);
const B365_MAX_RETRIES = 2;
const B365_RETRY_BASE_MS = 1_500;
let cooldownUntil = 0;

function redactUrl(url: string): string {
  return url.replace(/([?&]token=)[^&]*/gi, '$1***');
}

/** Cache key: bỏ token để list/odds dùng chung giữa proxy, collector, Hermes. */
export function b365CacheKey(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('token');
    u.searchParams.sort();
    const q = u.searchParams.toString();
    return q ? `${u.origin}${u.pathname}?${q}` : `${u.origin}${u.pathname}`;
  } catch {
    return url.replace(/([?&]token=)[^&]*/gi, '');
  }
}

export function b365TtlMs(url: string): number {
  if (url.includes('/events/inplay')) return 30_000;
  if (url.includes('/event/odds')) return 20_000;
  return 20_000;
}

function getFresh(key: string, ttlMs: number): CacheEntry | undefined {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) return cached;
  return undefined;
}

function getStale(key: string): CacheEntry | undefined {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < STALE_MAX_MS) return cached;
  return undefined;
}

async function fetchOnce(url: string, fetchImpl: typeof fetch): Promise<FetchResult> {
  const started = Date.now();
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20_000) });
    const ms = Date.now() - started;
    if (!response.ok) {
      logger.warn(`B365 fetch failed for ${redactUrl(url)}: ${response.status} ${response.statusText}`);
      if (response.status === 429) cooldownUntil = Date.now() + COOLDOWN_429_MS;
      return { ok: false, http: response.status, ms, error: `http ${response.status}` };
    }
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return { ok: false, http: 204, ms, error: 'empty' };
    }
    try {
      const data = JSON.parse(text) as { success?: unknown; results?: unknown };
      if (data.success === 1 || data.success === '1' || data.results) {
        cache.set(b365CacheKey(url), { data, timestamp: Date.now() });
      }
      return { ok: true, http: response.status, ms, data };
    } catch (e) {
      logger.error(`B365 JSON parse error for ${redactUrl(url)}:`, e);
      return { ok: false, http: 502, ms, error: 'invalid json' };
    }
  } catch (error) {
    const ms = Date.now() - started;
    logger.error(`B365 error fetching ${redactUrl(url)}:`, error);
    return { ok: false, http: 0, ms, error: (error as Error).message };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetries(url: string, fetchImpl: typeof fetch): Promise<FetchResult> {
  let last: FetchResult = { ok: false, http: 0, ms: 0, error: 'unknown' };
  for (let attempt = 0; attempt <= B365_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = B365_RETRY_BASE_MS * attempt;
      logger.warn(`B365 retry ${attempt}/${B365_MAX_RETRIES} in ${delay}ms for ${redactUrl(url)}`);
      await sleep(delay);
    }
    last = await fetchOnce(url, fetchImpl);
    if (last.ok) return last;
    if (last.http === 429) return last;
    if (!B365_RETRYABLE_HTTP.has(last.http)) return last;
  }
  return last;
}

/**
 * Một lần gọi B365: cache theo endpoint, gộp request trùng, stale khi 429.
 * Quota ~3600/giờ — inplay 30s, odds 20s.
 */
export async function fetchB365Cached(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  const key = b365CacheKey(url);
  const ttl = b365TtlMs(url);

  const fresh = getFresh(key, ttl);
  if (fresh) return { ok: true, http: 200, ms: 0, data: fresh.data, cached: true };

  const inCooldown = Date.now() < cooldownUntil;
  if (inCooldown) {
    const stale = getStale(key);
    if (stale) return { ok: true, http: 200, ms: 0, data: stale.data, cached: true };
    return { ok: false, http: 429, ms: 0, error: 'http 429 cooldown' };
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    try {
      const result = await fetchWithRetries(url, fetchImpl);
      if (result.ok) return result;
      const stale = getStale(key);
      if (stale && (result.http === 429 || result.http >= 500 || result.http === 0)) {
        logger.warn(`B365 serving stale cache for ${redactUrl(url)} after upstream ${result.http || 'error'}`);
        return { ok: true as const, http: 200, ms: result.ms, data: stale.data, cached: true };
      }
      return result;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export function clearB365CacheForTests(): void {
  cache.clear();
  inflight.clear();
  cooldownUntil = 0;
}
