import { describe, it, expect } from 'vitest';
import { checkAlertRules, defaultRules } from '../odds-monitor/rules.js';
import { OddsSnapshot } from '../ai-assistant-core/types.js';

function makeSnapshot(minute: number, overrides: Partial<OddsSnapshot> = {}): OddsSnapshot {
  return {
    minute,
    handicap: 2.5,
    overOdds: 1.90,
    underOdds: 1.90,
    homeOdds: 1.85,
    awayOdds: 1.95,
    ...overrides,
  };
}

describe('Alert Rules Engine', () => {
  describe('over_odds_drop rule', () => {
    it('triggers when over odds drop >= 0.15', () => {
      const history = [
        makeSnapshot(50, { overOdds: 1.95 }),
        makeSnapshot(52, { overOdds: 1.90 }),
        makeSnapshot(54, { overOdds: 1.85 }),
      ];
      const current = makeSnapshot(56, { overOdds: 1.78 });

      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');

      const overAlert = alerts.find(a => a.market === 'over_under' && a.alertType === 'odds_drop');
      expect(overAlert).toBeDefined();
      expect(overAlert!.message).toContain('Tài');
    });

    it('does not trigger for small drops', () => {
      const history = [
        makeSnapshot(50, { overOdds: 1.90 }),
        makeSnapshot(52, { overOdds: 1.88 }),
      ];
      const current = makeSnapshot(54, { overOdds: 1.86 });

      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');
      const overAlert = alerts.find(a => a.market === 'over_under' && a.message.includes('Tài'));
      expect(overAlert).toBeUndefined();
    });
  });

  describe('handicap_line_change rule', () => {
    it('triggers when handicap line changes', () => {
      const history = [
        makeSnapshot(30, { handicap: -0.5 }),
        makeSnapshot(35, { handicap: -0.5 }),
      ];
      const current = makeSnapshot(40, { handicap: -0.75 });

      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');
      const lineAlert = alerts.find(a => a.alertType === 'line_change');
      expect(lineAlert).toBeDefined();
      expect(lineAlert!.message).toContain('Line kèo chấp');
    });

    it('does not trigger when line stays same', () => {
      const history = [makeSnapshot(30, { handicap: -0.5 })];
      const current = makeSnapshot(35, { handicap: -0.5 });

      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');
      const lineAlert = alerts.find(a => a.alertType === 'line_change');
      expect(lineAlert).toBeUndefined();
    });
  });

  describe('sharp_home_move rule', () => {
    it('triggers on sudden home odds deviation', () => {
      const history = [
        makeSnapshot(60, { homeOdds: 1.85 }),
        makeSnapshot(62, { homeOdds: 1.84 }),
        makeSnapshot(64, { homeOdds: 1.86 }),
      ];
      const current = makeSnapshot(66, { homeOdds: 1.60 }); // big drop

      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');
      const sharpAlert = alerts.find(a => a.alertType === 'sharp_move');
      expect(sharpAlert).toBeDefined();
      expect(sharpAlert!.message).toContain('biến động mạnh');
    });
  });

  describe('multiple rules', () => {
    it('can trigger multiple alerts simultaneously', () => {
      const history = [
        makeSnapshot(50, { overOdds: 2.00, handicap: -0.5, homeOdds: 1.85 }),
        makeSnapshot(52, { overOdds: 1.95, handicap: -0.5, homeOdds: 1.84 }),
        makeSnapshot(54, { overOdds: 1.90, handicap: -0.5, homeOdds: 1.85 }),
      ];
      const current = makeSnapshot(56, {
        overOdds: 1.75,   // big over drop
        handicap: -0.75,   // line change
        homeOdds: 1.60,    // sharp move
      });

      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty history gracefully', () => {
      const current = makeSnapshot(10);
      const alerts = checkAlertRules(current, [], 'MU vs LIV', 'match-1');
      expect(alerts).toEqual([]);
    });

    it('handles missing odds fields', () => {
      const history = [makeSnapshot(50, { overOdds: undefined })];
      const current = makeSnapshot(55, { overOdds: undefined });
      const alerts = checkAlertRules(current, history, 'MU vs LIV', 'match-1');
      // Should not crash
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
