import { v4 as uuidv4 } from 'uuid';

/** Mã tạm để liên kết Telegram chat ↔ app userId (TTL 10 phút). */
const bindCodes = new Map<string, { userId: string; expiresAt: number }>();

export function generateBindCode(userId: string): string {
  const code = uuidv4().slice(0, 8).toUpperCase();
  bindCodes.set(code, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return code;
}

export function consumeBindCode(code: string): { userId: string } | null {
  const info = bindCodes.get(code);
  if (!info) return null;
  if (info.expiresAt < Date.now()) {
    bindCodes.delete(code);
    return null;
  }
  bindCodes.delete(code);
  return { userId: info.userId };
}
