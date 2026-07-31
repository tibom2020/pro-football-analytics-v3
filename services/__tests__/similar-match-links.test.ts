import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockLocalStorage(): void {
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
    key: () => null,
    length: 0,
  });
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
  });
}

describe('similar-match-links store', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockLocalStorage();
  });

  async function mod() {
    return import('../similar-match-links');
  }

  it('lưu 2 chiều A↔B', async () => {
    const {
      saveSimilarMatchLink,
      isSimilarMatchLinked,
      loadSimilarMatchLinks,
    } = await mod();
    const { saved } = saveSimilarMatchLink('100', {
      relatedMatchId: '200',
      relatedTeam: 'B Home vs B Away',
      relatedFt: '2-1',
      relatedHalf: 1,
      relatedMinute: 15,
      tier: 'openLine',
      similarity: 0.9,
      label30: 1,
      sourceHalf: 1,
      sourceMinute: 10,
      sourceScore: '1-0',
      sourceTeam: 'A Home vs A Away',
    });
    expect(saved).toBe(true);
    expect(isSimilarMatchLinked('100', '200', 1, 10)).toBe(true);
    expect(loadSimilarMatchLinks('100')).toHaveLength(1);
    expect(loadSimilarMatchLinks('200')).toHaveLength(1);
    expect(loadSimilarMatchLinks('200')[0]?.relatedMatchId).toBe('100');
  });

  it('không ghi trùng', async () => {
    const { saveSimilarMatchLink, loadSimilarMatchLinks } = await mod();
    const input = {
      relatedMatchId: '200',
      relatedTeam: 'B',
      relatedFt: '1-0',
      relatedHalf: 1 as const,
      relatedMinute: 15,
      tier: 'catalog' as const,
      sourceHalf: 1 as const,
      sourceMinute: 10,
      sourceTeam: 'A',
    };
    saveSimilarMatchLink('100', input);
    const second = saveSimilarMatchLink('100', input);
    expect(second.saved).toBe(false);
    expect(loadSimilarMatchLinks('100')).toHaveLength(1);
  });

  it('xóa 2 chiều', async () => {
    const { saveSimilarMatchLink, removeSimilarMatchLink, loadSimilarMatchLinks } = await mod();
    saveSimilarMatchLink('100', {
      relatedMatchId: '200',
      relatedTeam: 'B',
      relatedFt: '1-0',
      relatedHalf: 2,
      relatedMinute: 55,
      tier: 'catalogRuns',
      sourceHalf: 2,
      sourceMinute: 52,
      sourceTeam: 'A',
    });
    removeSimilarMatchLink('100', '200', 2, 52, 2, 55);
    expect(loadSimilarMatchLinks('100')).toHaveLength(0);
    expect(loadSimilarMatchLinks('200')).toHaveLength(0);
  });

  it('merge từ server không ghi đè id trùng', async () => {
    const {
      saveSimilarMatchLink,
      loadSimilarMatchLinks,
      mergeSimilarMatchLinksFromServer,
      similarMatchLinksKey,
    } = await mod();
    saveSimilarMatchLink('100', {
      relatedMatchId: '200',
      relatedTeam: 'B',
      relatedFt: '1-0',
      relatedHalf: 1,
      relatedMinute: 10,
      tier: 'openLine',
      sourceHalf: 1,
      sourceMinute: 5,
      sourceTeam: 'A',
    });
    const existingId = loadSimilarMatchLinks('100')[0]!.id;
    mergeSimilarMatchLinksFromServer('100', [
      {
        id: existingId,
        relatedMatchId: '200',
        relatedTeam: 'Other',
        relatedFt: '9-9',
        relatedHalf: 1,
        relatedMinute: 10,
        tier: 'catalog',
        sourceHalf: 1,
        sourceMinute: 5,
        ts: 1,
      },
      {
        id: '100:300:1:5',
        relatedMatchId: '300',
        relatedTeam: 'C',
        relatedFt: '0-0',
        relatedHalf: 1,
        relatedMinute: 8,
        tier: 'catalog',
        sourceHalf: 1,
        sourceMinute: 5,
        ts: 2,
      },
    ]);
    const links = loadSimilarMatchLinks('100');
    expect(links).toHaveLength(2);
    expect(links.find((r) => r.id === existingId)?.relatedTeam).toBe('B');
    expect(localStorage.getItem(similarMatchLinksKey('100'))).toBeTruthy();
  });
});
