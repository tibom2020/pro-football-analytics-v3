import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Root cài đặt OpenHuman: `~/.openhuman/` trên cả Windows/macOS/Linux
 * (v0.53.x đã hợp nhất, không còn dùng %APPDATA% như docs cũ).
 */
function openHumanRoot(): string {
  return path.join(os.homedir(), '.openhuman');
}

/**
 * Discover active user workspace. OpenHuman lưu mỗi tài khoản dưới
 * `~/.openhuman/users/<hex-id>/workspace/`. Có nhiều entry (`local`,
 * thư mục hex per-tài-khoản). Chọn folder có `workspace/` và mtime mới nhất
 * — đó là user đang dùng.
 *
 * Có thể override bằng `OPENHUMAN_USER_ID` (hex id) nếu nhiều account.
 */
function discoverActiveUserWorkspace(): string | null {
  const usersDir = path.join(openHumanRoot(), 'users');
  if (!fsSync.existsSync(usersDir)) return null;

  const override = process.env.OPENHUMAN_USER_ID?.trim();
  if (override) {
    const p = path.join(usersDir, override, 'workspace');
    return fsSync.existsSync(p) ? p : null;
  }

  let best: { ws: string; mtime: number } | null = null;
  for (const entry of fsSync.readdirSync(usersDir)) {
    const ws = path.join(usersDir, entry, 'workspace');
    if (!fsSync.existsSync(ws)) continue;
    const stat = fsSync.statSync(ws);
    if (!best || stat.mtimeMs > best.mtime) {
      best = { ws, mtime: stat.mtimeMs };
    }
  }
  return best?.ws ?? null;
}

/**
 * Resolve vault root.
 *
 *  - Nếu env `OPENHUMAN_VAULT` set: dùng path đó (cho user override).
 *  - Ngược lại: tự tìm workspace user đang active trong `~/.openhuman/users/`.
 *
 * Workspace path khả dụng cho `file_read` tool của OpenHuman (auto-approved
 * theo config.toml — `[autonomy].auto_approve = ["file_read", ...]`).
 */
export function resolveVaultRoot(): string {
  const override = process.env.OPENHUMAN_VAULT?.trim();
  if (override) return override;

  const ws = discoverActiveUserWorkspace();
  if (ws) return ws;

  // Fallback: chưa sign in xong, dùng tạm `~/.openhuman/`.
  return openHumanRoot();
}

/** Sub-dir cho PFA trong workspace — OpenHuman thấy bằng `file_read("pfa/<file>.md")`. */
export function pfaSubdir(): string {
  return path.join(resolveVaultRoot(), 'pfa');
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Atomic write: ghi tmp file rồi rename. OpenHuman wiki search / Memory Tree
 * sẽ không bao giờ đọc trúng file đang được ghi dở.
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}
