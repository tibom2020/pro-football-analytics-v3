import { OddsSnapshot, OddsAlert } from '../ai-assistant-core/types.js';
import { v4 as uuidv4 } from 'uuid';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  check: (current: OddsSnapshot, history: OddsSnapshot[], matchName: string, matchId: string) => OddsAlert | null;
}

function createAlert(
  matchId: string,
  matchName: string,
  alertType: OddsAlert['alertType'],
  market: string,
  prev: number,
  curr: number,
  minute: number,
  message: string,
): OddsAlert {
  return {
    id: uuidv4(),
    matchId,
    matchName,
    alertType,
    market,
    previousValue: prev,
    currentValue: curr,
    changePercent: prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0,
    minute,
    message,
    timestamp: Date.now(),
  };
}

export const defaultRules: AlertRule[] = [
  {
    id: 'over_odds_drop',
    name: 'Kèo Tài giảm mạnh',
    description: 'Phát hiện khi odds Tài giảm quá ngưỡng trong cửa sổ thời gian (không tính khi đổi line)',
    check(current, history, matchName, matchId) {
      if (!current.overOdds || history.length < 2) return null;
      
      const windowSize = Math.min(5, history.length);
      const windowStart = history[history.length - windowSize];
      if (!windowStart?.overOdds) return null;

      // Nếu line thay đổi trong cửa sổ này, không tính là giảm do áp lực (tránh nhiễu)
      if (current.handicap !== windowStart.handicap) return null;

      const drop = windowStart.overOdds - current.overOdds;
      if (drop >= 0.15) {
        return createAlert(
          matchId, matchName, 'odds_drop', 'over_under',
          windowStart.overOdds, current.overOdds, current.minute,
          `Kèo Tài giảm ${drop.toFixed(2)} (${windowStart.overOdds.toFixed(2)} → ${current.overOdds.toFixed(2)}) trong ${current.minute - windowStart.minute} phút`,
        );
      }
      return null;
    },
  },
  {
    id: 'under_odds_drop',
    name: 'Kèo Xỉu giảm mạnh',
    description: 'Phát hiện khi odds Xỉu giảm quá ngưỡng (không tính khi đổi line)',
    check(current, history, matchName, matchId) {
      if (!current.underOdds || history.length < 2) return null;
      
      const windowSize = Math.min(5, history.length);
      const windowStart = history[history.length - windowSize];
      if (!windowStart?.underOdds) return null;

      // Nếu line thay đổi trong cửa sổ này, không tính là giảm do áp lực
      if (current.handicap !== windowStart.handicap) return null;

      const drop = windowStart.underOdds - current.underOdds;
      if (drop >= 0.15) {
        return createAlert(
          matchId, matchName, 'odds_drop', 'over_under',
          windowStart.underOdds, current.underOdds, current.minute,
          `Kèo Xỉu giảm ${drop.toFixed(2)} (${windowStart.underOdds.toFixed(2)} → ${current.underOdds.toFixed(2)}) trong ${current.minute - windowStart.minute} phút`,
        );
      }
      return null;
    },
  },
  {
    id: 'handicap_line_change',
    name: 'Thay đổi line kèo chấp',
    description: 'Phát hiện khi handicap AH line thay đổi',
    check(current, history, matchName, matchId) {
      if (history.length < 1) return null;
      const prev = history[history.length - 1];
      // Use handicapAH if available, otherwise this rule won't trigger (prevents mixing with OU)
      if (current.handicapAH != null && prev.handicapAH != null && current.handicapAH !== prev.handicapAH) {
        const homeOdds = current.homeOdds != null ? `@${current.homeOdds.toFixed(2)}` : '—';
        const awayOdds = current.awayOdds != null ? `@${current.awayOdds.toFixed(2)}` : '—';
        return createAlert(
          matchId, matchName, 'line_change', 'handicap',
          prev.handicapAH, current.handicapAH, current.minute,
          `Line kèo chấp thay đổi: ${prev.handicapAH} → ${current.handicapAH} (Chủ ${homeOdds} | Khách ${awayOdds}) tại phút ${current.minute}'`,
        );
      }
      return null;
    },
  },
  {
    id: 'ou_line_change',
    name: 'Thay đổi line Tài/Xỉu',
    description: 'Phát hiện khi handicap OU line thay đổi',
    check(current, history, matchName, matchId) {
      if (history.length < 1) return null;
      const prev = history[history.length - 1];
      if (current.handicap !== prev.handicap) {
        const overOdds = current.overOdds != null ? `@${current.overOdds.toFixed(2)}` : '—';
        const underOdds = current.underOdds != null ? `@${current.underOdds.toFixed(2)}` : '—';
        return createAlert(
          matchId, matchName, 'line_change', 'over_under',
          prev.handicap, current.handicap, current.minute,
          `Line Tài/Xỉu thay đổi: ${prev.handicap} → ${current.handicap} (Tài ${overOdds} | Xỉu ${underOdds}) tại phút ${current.minute}'`,
        );
      }
      return null;
    },
  },
  {
    id: 'sharp_home_move',
    name: 'Biến động kèo đội nhà đột ngột',
    description: 'Khi odds đội nhà thay đổi nhanh trên cùng một line — tín hiệu sharp money',
    check(current, history, matchName, matchId) {
      if (!current.homeOdds || history.length < 3) return null;

      const recent3 = history.slice(-3);
      // Chỉ tính nếu trong 3 snapshot gần nhất line AH không đổi
      const isLineStable = recent3.every(h => h.handicapAH === current.handicapAH);
      if (!isLineStable) return null;

      const homeValues = recent3.map(h => h.homeOdds).filter((v): v is number => v != null);
      if (homeValues.length < 2) return null;

      const avgRecent = homeValues.reduce((a, b) => a + b, 0) / homeValues.length;
      const deviation = Math.abs(current.homeOdds - avgRecent);

      if (deviation >= 0.20) {
        return createAlert(
          matchId, matchName, 'sharp_move', 'handicap',
          avgRecent, current.homeOdds, current.minute,
          `Kèo đội nhà biến động mạnh: ${avgRecent.toFixed(2)} → ${current.homeOdds.toFixed(2)} (±${deviation.toFixed(2)})`,
        );
      }
      return null;
    },
  },
];

export function checkAlertRules(
  current: OddsSnapshot,
  history: OddsSnapshot[],
  matchName: string,
  matchId: string,
  rules: AlertRule[] = defaultRules,
): OddsAlert[] {
  const alerts: OddsAlert[] = [];
  for (const rule of rules) {
    const alert = rule.check(current, history, matchName, matchId);
    if (alert) alerts.push(alert);
  }
  return alerts;
}
