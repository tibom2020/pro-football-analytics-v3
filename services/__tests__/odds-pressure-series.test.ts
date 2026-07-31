import { describe, expect, it } from 'vitest';
import type { AsianHandicapMinuteSnapshot } from '../../types';
import {
  chapTeamHandicapFromHomeLine,
  colorOddsSeriesForAsianHandicapHome,
  resolveAsianHandicapChapTeamView,
  calculateAhChapYAxisConfig,
} from '../odds-pressure-series';

function ah(
  minute: number,
  handicap: number,
  home: number,
  away: number,
  half: 1 | 2 = 1,
): AsianHandicapMinuteSnapshot {
  return { marketId: '1_2', minute, half, handicap, home, away };
}

describe('resolveAsianHandicapChapTeamView', () => {
  it('home chấp (HDP < 0): giữ HDP âm, odds nhà', () => {
    expect(resolveAsianHandicapChapTeamView(ah(1, -0.25, 1.9, 1.88))).toEqual({
      handicap: -0.25,
      odds: 1.9,
      side: 'home',
    });
  });

  it('away chấp (HDP > 0): đảo HDP âm, odds khách', () => {
    expect(resolveAsianHandicapChapTeamView(ah(1, 0.25, 1.85, 1.95))).toEqual({
      handicap: -0.25,
      odds: 1.95,
      side: 'away',
    });
  });
});

describe('chapTeamHandicapFromHomeLine', () => {
  it('đảo dương thành âm', () => {
    expect(chapTeamHandicapFromHomeLine(0.5)).toBe(-0.5);
    expect(chapTeamHandicapFromHomeLine(-0.25)).toBe(-0.25);
    expect(chapTeamHandicapFromHomeLine(0)).toBe(0);
  });
});

describe('colorOddsSeriesForAsianHandicapHome', () => {
  it('home chấp: tăng giá chấp = xanh, giảm = đỏ', () => {
    const rows = [ah(1, -0.25, 1.9, 1.88), ah(2, -0.25, 1.85, 1.93), ah(3, -0.25, 1.9, 1.88)];
    const colored = colorOddsSeriesForAsianHandicapHome(rows);
    expect(colored[0].handicap).toBe(-0.25);
    expect(colored[0].chapOdds).toBe(1.9);
    expect(colored[0].chapSide).toBe('home');
    expect(colored[1].colorName).toBe('red');
    expect(colored[2].colorName).toBe('green');
  });

  it('away chấp: tăng giá khách = xanh, giảm = đỏ', () => {
    const rows = [ah(1, 0.25, 1.85, 1.95), ah(2, 0.25, 1.88, 1.9), ah(3, 0.25, 1.85, 1.95)];
    const colored = colorOddsSeriesForAsianHandicapHome(rows);
    expect(colored[1].handicap).toBe(-0.25);
    expect(colored[1].chapOdds).toBe(1.9);
    expect(colored[1].chapSide).toBe('away');
    expect(colored[1].colorName).toBe('red');
    expect(colored[2].colorName).toBe('green');
  });

  it('HDP = 0: giảm giá = xanh (đồng banh)', () => {
    const rows = [ah(1, 0, 1.9, 1.9), ah(2, 0, 1.85, 1.95)];
    const colored = colorOddsSeriesForAsianHandicapHome(rows);
    expect(colored[1].colorName).toBe('green');
  });

  it('đổi line HDP → xám dù giá biến động', () => {
    const rows = [ah(1, -0.25, 1.9, 1.88), ah(2, -0.5, 1.7, 2.05)];
    const colored = colorOddsSeriesForAsianHandicapHome(rows);
    expect(colored[1].colorName).toBe('gray');
  });

  it('3 bong bóng đỏ liên tiếp trong < 8 phút → highlight', () => {
    const rows = [
      ah(1, -0.25, 1.95, 1.88),
      ah(2, -0.25, 1.9, 1.93),
      ah(3, -0.25, 1.85, 1.98),
      ah(4, -0.25, 1.8, 2.03),
    ];
    const colored = colorOddsSeriesForAsianHandicapHome(rows);
    expect(colored[1].colorName).toBe('red');
    expect(colored[2].colorName).toBe('red');
    expect(colored[3].colorName).toBe('red');
    expect(colored[1].highlight).toBe(true);
    expect(colored[2].highlight).toBe(true);
    expect(colored[3].highlight).toBe(true);
  });
});

describe('calculateAhChapYAxisConfig', () => {
  it('mặc định [-1, 0] khi chưa có dữ liệu', () => {
    const cfg = calculateAhChapYAxisConfig([], []);
    expect(cfg.domain).toEqual([-1, 0]);
    expect(cfg.ticks[0]).toBe(-1);
    expect(cfg.ticks[cfg.ticks.length - 1]).toBe(0);
  });

  it('domain max không vượt 0', () => {
    const cfg = calculateAhChapYAxisConfig([{ handicap: -0.25 }, { handicap: -0.5 }]);
    expect(cfg.domain[1]).toBeLessThanOrEqual(0);
  });
});
