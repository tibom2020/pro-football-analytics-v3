import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Vitest chạy trong server/ nhưng module ghim nằm ở frontend root — import tương đối.
 */
import {
  togglePinnedChart,
  loadPinnedCharts,
  pinsForSourceMatch,
  PINNED_CHARTS_KEY,
  type PinnedChart,
} from '../../../services/pinned-charts.js';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

function samplePin(overrides: Partial<PinnedChart> = {}): PinnedChart {
  return {
    matchId: '999',
    sourceMatchId: '11090780',
    team: 'A vs B',
    pinnedAt: Date.now(),
    ...overrides,
  };
}

describe('pinned-charts', () => {
  it('pinsForSourceMatch khớp sourceMatchId dù kiểu string vs number', () => {
    const pins: PinnedChart[] = [
      samplePin({ matchId: '1', sourceMatchId: '11090780' }),
      samplePin({ matchId: '2', sourceMatchId: '999' }),
    ];
    expect(pinsForSourceMatch(pins, 11090780)).toHaveLength(1);
    expect(pinsForSourceMatch(pins, '11090780')[0]?.matchId).toBe('1');
  });

  it('togglePinnedChart lưu sourceMatchId dạng string', () => {
    expect(togglePinnedChart(samplePin({ sourceMatchId: 11090780 as unknown as string }))).toBe(true);
    const saved = loadPinnedCharts();
    expect(saved[0]?.sourceMatchId).toBe('11090780');
  });

  it('togglePinnedChart từ chối ghim khi thiếu sourceMatchId', () => {
    expect(togglePinnedChart(samplePin({ sourceMatchId: undefined }))).toBe(false);
    expect(store.has(PINNED_CHARTS_KEY)).toBe(false);
  });
});
