import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}

describe('safeSetItem prune', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('quota prune xóa dữ liệu per-match nhưng giữ viewedMatchesHistory', async () => {
    const store = mockLocalStorage();
    store.set(
      'viewedMatchesHistory',
      JSON.stringify({
        old: { match: { id: 'old' }, viewedAt: 1 },
        new: { match: { id: 'new' }, viewedAt: 2 },
      }),
    );
    store.set('statsHistory_old', '{"1":{}}');
    store.set('statsHistory_new', '{"1":{}}');

    let setCalls = 0;
    const origSet = localStorage.setItem.bind(localStorage);
    vi.stubGlobal('localStorage', {
      ...localStorage,
      setItem: (k: string, v: string) => {
        setCalls++;
        if (setCalls <= 2 && k.startsWith('statsHistory_')) {
          const err = new Error('QuotaExceededError');
          err.name = 'QuotaExceededError';
          throw err;
        }
        origSet(k, v);
      },
    });

    const { safeSetItem } = await import('../safe-storage');
    const ok = safeSetItem('statsHistory_new', '{"2":{}}', { keepMatchId: 'new' });
    expect(ok).toBe(true);

    const hist = JSON.parse(localStorage.getItem('viewedMatchesHistory')!);
    expect(hist.old).toBeDefined();
    expect(hist.new).toBeDefined();
    expect(localStorage.getItem('statsHistory_old')).toBeNull();
    expect(localStorage.getItem('statsHistory_new')).toBe('{"2":{}}');
  });
});
