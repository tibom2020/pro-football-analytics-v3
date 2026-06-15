
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MatchList } from './components/MatchList';
import { Dashboard } from './components/Dashboard';
import { MatchHistory } from './components/MatchHistory';
import { MatchInfo } from './types';
import { getInPlayEvents, getMatchDetails } from './services/api';
import {
  B365_SERVER_TOKEN,
  fetchB365AuthStatus,
  getB365LoginMode,
  normalizeB365Token,
  verifyB365Token,
} from './services/b365-auth';
import { checkServerHealth } from './services/ai-service';
import { KeyRound, ShieldCheck, RefreshCw, ClipboardList, Moon, Sun, Search, LayoutDashboard, LogOut, Loader2, AlertCircle } from 'lucide-react';

const B365_TOKEN_KEY = 'b365_token';

function readStoredB365Token(): string | null {
  try {
    const a = localStorage.getItem(B365_TOKEN_KEY);
    if (a && a.length > 5) return a;
  } catch { /* ignore */ }
  try {
    const b = sessionStorage.getItem(B365_TOKEN_KEY);
    if (b && b.length > 5) return b;
  } catch { /* ignore */ }
  return null;
}

function persistB365Token(tokenValue: string): void {
  try { localStorage.setItem(B365_TOKEN_KEY, tokenValue); } catch { /* ignore */ }
  try { sessionStorage.setItem(B365_TOKEN_KEY, tokenValue); } catch { /* ignore */ }
}

function clearStoredB365Token(): void {
  try { localStorage.removeItem(B365_TOKEN_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(B365_TOKEN_KEY); } catch { /* ignore */ }
}

const App = () => {
  const REFRESH_INTERVAL_MS = 30_000;

  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const loginMode = getB365LoginMode();
  const [currentMatch, setCurrentMatch] = useState<MatchInfo | null>(null);
  const [events, setEvents] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mainView, setMainView] = useState<'matches' | 'matchHistory'>('matches');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) setTheme('dark');
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const completeLogin = useCallback((tokenValue: string) => {
    persistB365Token(tokenValue);
    setToken(tokenValue);
    setHasToken(true);
    setLoginError(null);
  }, []);

  const tryLogin = useCallback(async (tokenValue: string) => {
    const normalized = normalizeB365Token(tokenValue);
    if (normalized === 'DEMO_MODE') {
      completeLogin('DEMO_MODE');
      return;
    }
    if (normalized.length < 5) {
      setLoginError('Token phải có ít nhất 5 ký tự.');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    const result = await verifyB365Token(normalized);
    setLoginLoading(false);
    if (!result.ok) {
      setLoginError(result.error || 'Token không hợp lệ.');
      return;
    }
    completeLogin(normalized);
  }, [completeLogin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAuthBootstrapping(true);
      const online = await checkServerHealth();
      if (cancelled) return;
      setServerOnline(online);

      const savedToken = readStoredB365Token();
      if (savedToken) {
        setToken(savedToken);
        const verified = await verifyB365Token(savedToken);
        if (cancelled) return;
        if (verified.ok) {
          setHasToken(true);
          setAuthBootstrapping(false);
          return;
        }
        clearStoredB365Token();
        setToken('');
        setLoginError(verified.error || 'Token đã lưu không còn hợp lệ. Vui lòng đăng nhập lại.');
        setAuthBootstrapping(false);
        return;
      }

      if (loginMode === 'server') {
        const status = await fetchB365AuthStatus();
        if (cancelled) return;
        if (status?.serverTokenConfigured) {
          const verified = await verifyB365Token(B365_SERVER_TOKEN);
          if (cancelled) return;
          if (verified.ok) {
            completeLogin(B365_SERVER_TOKEN);
            setAuthBootstrapping(false);
            return;
          }
          setLoginError(verified.error || 'Token server (B365_API_TOKEN) không hợp lệ.');
        } else {
          setLoginError('Chế độ server: thêm B365_API_TOKEN trên server (Railway/Render).');
        }
        setAuthBootstrapping(false);
        return;
      }

      const envToken = import.meta.env.VITE_B365_API_TOKEN as string | undefined;
      if (envToken && envToken.trim().length > 5) {
        await tryLogin(envToken.trim());
      }
      if (!cancelled) setAuthBootstrapping(false);
    })();
    return () => { cancelled = true; };
  }, [loginMode, completeLogin, tryLogin]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('favoriteMatches');
    if (savedFavs) {
      try {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) setFavorites(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      const t = readStoredB365Token();
      if (t) { setToken(t); setHasToken(true); }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== B365_TOKEN_KEY) return;
      if (e.newValue && e.newValue.length > 5) { setToken(e.newValue); setHasToken(true); }
      else if (e.oldValue && !e.newValue) {
        setHasToken(false); setToken(''); setCurrentMatch(null);
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') syncFromStorage(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', syncFromStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', syncFromStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleToggleFavorite = (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const newFavs = prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId];
      localStorage.setItem('favoriteMatches', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  useEffect(() => {
    if (!hasToken) return;
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('match');
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        const details = await getMatchDetails(token, matchId);
        if (cancelled || !details) return;
        setCurrentMatch(details);
      } catch (e) {
        console.error('[App] Không tải trận từ ?match=', e);
      }
    })();
    return () => { cancelled = true; };
  }, [hasToken, token]);

  const fetchEventsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInPlayEvents(token);
      setEvents(data);
      if (token === 'DEMO_MODE' && data.length === 0) {
        setError('Chế độ Demo: Không tìm thấy trận đấu giả lập.');
      } else if (data.length === 0 && token !== 'DEMO_MODE') {
        setError('Không tìm thấy trận đấu trực tiếp.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
      if (msg.includes('429')) setError('Giới hạn tần suất của Proxy đã đạt.');
      else if (msg.includes('Lỗi mạng hoặc CORS')) setError(msg);
      else setError(msg);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasToken) return;
    let isMounted = true;
    let intervalId: number | undefined;
    const startFetching = async () => {
      if (isMounted) {
        await fetchEventsData();
        intervalId = window.setInterval(() => { if (isMounted) fetchEventsData(); }, REFRESH_INTERVAL_MS);
      }
    };
    void startFetching();
    return () => { isMounted = false; if (intervalId !== undefined) clearInterval(intervalId); };
  }, [hasToken, fetchEventsData]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void tryLogin(token);
  };

  const handleSelectMatch = (match: MatchInfo) => {
    setCurrentMatch(match);
    window.history.replaceState({}, '', `${window.location.pathname}?match=${match.id}`);
  };

  const handleCloseMatch = () => {
    setCurrentMatch(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleOpenAnalysisInNewTab = (match: MatchInfo) => {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('match', match.id);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleLogout = () => {
    setHasToken(false);
    clearStoredB365Token();
    setEvents([]);
    setError(null);
    setCurrentMatch(null);
    setToken('');
    setMainView('matches');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase().trim();
    return events.filter((e) =>
      e.home.name.toLowerCase().includes(q) ||
      e.away.name.toLowerCase().includes(q) ||
      e.league.name.toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  const getHeaderText = () => (mainView === 'matches' ? 'Trực tiếp' : 'Đã xem');

  if (!hasToken) {
    if (authBootstrapping) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Đang kiểm tra token B365…</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="bg-slate-800/50 p-6 rounded-full mb-6 backdrop-blur-md border border-white/10 shadow-2xl">
          <ShieldCheck className="w-16 h-16 text-blue-400" />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">Pro Analytics v3</h1>
        <p className="text-slate-400 text-center mb-2 text-sm max-w-xs">Phân tích bóng đá trực tiếp — bản nhẹ.</p>
        <p className="text-slate-500 text-center mb-6 text-xs max-w-sm">
          {loginMode === 'server'
            ? 'Production: token B365 lưu trên server (B365_API_TOKEN), không nhập trên trình duyệt.'
            : 'Nhập token từ b365api.com — hệ thống kiểm tra trước khi vào app.'}
        </p>
        {serverOnline === false && (
          <div className="w-full max-w-sm mb-4 flex items-start gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-700/50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Server AI chưa chạy hoặc sai URL. Kiểm tra <code className="text-amber-200">VITE_AI_SERVER_URL</code>.</span>
          </div>
        )}
        {loginMode !== 'server' && (
          <form onSubmit={handleTokenSubmit} className="w-full max-w-sm space-y-4 relative z-10">
            <div className="relative group">
              <KeyRound className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => { setToken(e.target.value); setLoginError(null); }}
                placeholder="B365 API Token..."
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder-slate-600"
              />
            </div>
            {loginError && (
              <div className="flex items-start gap-2 text-xs text-red-300 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading || token.trim().length < 5}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xác thực…</> : 'Đăng nhập'}
            </button>
            <div className="text-center mt-6 space-y-2">
              <a
                href="https://b365api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-slate-500 hover:text-blue-400"
              >
                Lấy token tại b365api.com →
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); void tryLogin('DEMO_MODE'); }}
                className="block text-xs text-slate-500 hover:text-blue-400"
              >
                Dùng thử chế độ Demo
              </a>
            </div>
          </form>
        )}
        {loginMode === 'server' && loginError && (
          <div className="w-full max-w-sm flex items-start gap-2 text-xs text-red-300 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2 relative z-10">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}
      </div>
    );
  }

  if (currentMatch) {
    return <Dashboard token={token} match={currentMatch} onBack={handleCloseMatch} sessionActive={hasToken} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#F4F5F0] dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-200">
      <aside className="w-64 bg-[#F4F5F0] dark:bg-slate-950 border-r border-gray-200/60 dark:border-slate-800 flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-10 pl-2">
            <div className="bg-slate-900 dark:bg-white p-1.5 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white dark:text-slate-900" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">PFA v3</span>
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pl-4">Menu Chính</div>
          <nav className="space-y-1">
            <button onClick={() => setMainView('matches')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${mainView === 'matches' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
              <LayoutDashboard className="w-5 h-5" /> Trực tiếp
            </button>
            <button onClick={() => setMainView('matchHistory')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${mainView === 'matchHistory' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
              <ClipboardList className="w-5 h-5" /> Đã xem
            </button>
          </nav>
        </div>
        <div className="mt-auto p-6 space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50">
            {theme === 'light' ? <><Moon className="w-5 h-5" /> Chế độ tối</> : <><Sun className="w-5 h-5" /> Chế độ sáng</>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="w-5 h-5" /> Thoát
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 md:rounded-tl-3xl md:border-l border-gray-200/50 dark:border-slate-800">
        <header className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="relative w-full max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm trận, giải..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm outline-none text-slate-700 dark:text-slate-200" />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white md:hidden">{getHeaderText()}</h1>
          <div className="flex items-center space-x-3 ml-auto">
            {mainView === 'matches' && (
              <button onClick={fetchEventsData} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <button onClick={toggleTheme} className="p-2 md:hidden text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F4F5F0]/30 dark:bg-slate-900">
          {error && mainView === 'matches' && (
            <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-4 rounded-md">
              <p className="font-bold">Lỗi</p>
              <p>{error}</p>
            </div>
          )}
          {mainView === 'matches' && (
            <MatchList events={filteredEvents} onOpenAnalysisInNewTab={handleOpenAnalysisInNewTab} isLoading={loading && events.length === 0 && !error} searchQuery={searchQuery} onSearchChange={setSearchQuery} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
          )}
          {mainView === 'matchHistory' && <MatchHistory onSelectMatch={handleSelectMatch} />}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-2 z-20">
        <div className="flex justify-around items-center">
          <button onClick={() => setMainView('matches')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${mainView === 'matches' ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" /><span className="text-[10px] font-semibold">Trực tiếp</span>
          </button>
          <button onClick={() => setMainView('matchHistory')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${mainView === 'matchHistory' ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800' : 'text-slate-400'}`}>
            <ClipboardList className="w-5 h-5" /><span className="text-[10px] font-semibold">Đã xem</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
