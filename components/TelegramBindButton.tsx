/**
 * Nút liên kết Telegram trên tab trận — lấy mã /bind để nhận cảnh báo hạ line OU.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { getAppUserId } from '../services/user-id';
import { checkTelegramStatus, getTelegramBindCode } from '../services/ai-service';

export const TelegramBindButton: React.FC = () => {
  const [bound, setBound] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const ok = await checkTelegramStatus(getAppUserId());
      setBound(ok);
    } catch {
      setBound(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleBind = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await getTelegramBindCode(getAppUserId());
      if (!res?.code) {
        setError('Không lấy được mã — kiểm tra AI server');
        return;
      }
      setCode(res.code);
      try {
        await navigator.clipboard.writeText(`/bind ${res.code}`);
        setCopied(true);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  if (bound) {
    return (
      <button
        type="button"
        onClick={() => void refreshStatus()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-900/30 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-medium border border-sky-500/30 shrink-0"
        title="Telegram đã liên kết — nhận cảnh báo hạ line 1_3/1_6"
      >
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
        </span>
        TG ✓
      </button>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => void handleBind()}
        disabled={busy}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
        title="Liên kết Telegram để nhận cảnh báo hạ line OU"
      >
        {busy ? (
          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span aria-hidden>✈️</span>
        )}
        Telegram
      </button>
      {(code || error) && (
        <div className="absolute right-0 top-full mt-1 z-30 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2 text-[11px] text-slate-700 dark:text-slate-200">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <>
              <p className="font-semibold mb-1">Gửi cho bot:</p>
              <code className="block bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-1 break-all">
                /bind {code}
              </code>
              {copied && <p className="text-emerald-600 mt-1">Đã copy lệnh</p>}
              <button
                type="button"
                className="mt-1.5 text-sky-600 underline"
                onClick={() => {
                  setCode(null);
                  void refreshStatus();
                }}
              >
                Đã bind? Kiểm tra lại
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
