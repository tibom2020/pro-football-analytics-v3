import { AI_SERVER_URL } from './ai-service';
import { buildMatchMarkdownFromStorage } from './match-markdown-export';

function triggerBrowserDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Frontend deploy (Vercel/Railway static…) — không ghi server, chỉ tải xuống máy user. */
function isDeployedFrontend(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h !== 'localhost' && h !== '127.0.0.1';
}

export type MatchMarkdownSaveTarget = 'history' | 'live';

export interface SaveMatchMarkdownResult {
  ok: boolean;
  /** Đường dẫn file trên server (khi POST thành công). */
  serverPath?: string;
  /** Đã fallback tải xuống trình duyệt. */
  downloaded?: boolean;
}

/**
 * Lưu .md: localhost → gửi server AI (`History/`); deploy → tải xuống thư mục Download.
 * Nếu server lỗi trên localhost → fallback tải xuống trình duyệt.
 */
export async function saveMatchMarkdown(
  matchId: string,
  opts: { target?: MatchMarkdownSaveTarget } = {},
): Promise<SaveMatchMarkdownResult> {
  const built = buildMatchMarkdownFromStorage(matchId);
  if (!built) {
    console.warn('[saveMatchMarkdown] Không có viewedMatchesHistory cho matchId:', matchId);
    return { ok: false };
  }

  const target = opts.target ?? 'history';
  let { markdown, filename } = built;
  if (target === 'live') {
    markdown = markdown.replace(
      '_File được xuất tự động từ Pro Football Analytics (localStorage)._',
      '_File xuất từ Dashboard (live) — Pro Football Analytics._',
    );
  }

  if (isDeployedFrontend()) {
    triggerBrowserDownload(markdown, filename);
    return { ok: true, downloaded: true };
  }

  try {
    const res = await fetch(`${AI_SERVER_URL}/api/history/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content: markdown, target }),
    });
    if (res.ok) {
      const data = (await res.json()) as { path?: string };
      return { ok: true, serverPath: data.path };
    }
    console.warn('[saveMatchMarkdown] Server trả', res.status, '— tải xuống thay thế');
  } catch (e) {
    console.warn(
      '[saveMatchMarkdown] Không kết nối server — tải xuống. Kiểm tra AI server và VITE_AI_SERVER_URL.',
      e,
    );
  }

  triggerBrowserDownload(markdown, filename);
  return { ok: true, downloaded: true };
}
