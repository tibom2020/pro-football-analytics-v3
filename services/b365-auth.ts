import { AI_SERVER_URL } from './ai-service';

/** Token ảo — server thay bằng B365_API_TOKEN (không lộ token trên client bundle). */
export const B365_SERVER_TOKEN = '__SERVER__';

export type B365LoginMode = 'manual' | 'server';

export function getB365LoginMode(): B365LoginMode {
  const v = String(import.meta.env.VITE_B365_LOGIN_MODE || 'manual').toLowerCase();
  return v === 'server' ? 'server' : 'manual';
}

export async function fetchB365AuthStatus(): Promise<{ serverTokenConfigured: boolean } | null> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/auth/b365-status`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as { serverTokenConfigured: boolean };
  } catch {
    return null;
  }
}

export async function verifyB365Token(token: string): Promise<{
  ok: boolean;
  error?: string;
  matchCount?: number;
}> {
  try {
    const res = await fetch(`${AI_SERVER_URL}/api/auth/b365-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!text.trim()) {
      return {
        ok: false,
        error: `Server trả phản hồi trống (HTTP ${res.status}). Kiểm tra VITE_AI_SERVER_URL phải có dạng https://... và CORS_ORIGIN trên Railway khớp URL frontend.`,
      };
    }
    let data: { ok?: boolean; error?: string; matchCount?: number };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return {
        ok: false,
        error: `Server trả không phải JSON (HTTP ${res.status}): ${text.slice(0, 160)}`,
      };
    }
    if (data.ok) return { ok: true, matchCount: data.matchCount };
    return { ok: false, error: data.error || `Xác thực thất bại (${res.status}).` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Không kết nối server AI (${AI_SERVER_URL}). ${msg}`,
    };
  }
}

/** Chuẩn hóa token trước khi lưu / gọi API. */
export function normalizeB365Token(raw: string): string {
  return raw.trim();
}
