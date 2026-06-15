

export interface MatchInfo {
  id: string;
  league: { name: string };
  home: { name: string; image_id?: string };
  away: { name: string; image_id?: string };
  ss: string; // Score string "1-0"
  time: string; // "45"
  timer?: { tm: number; ts: number; tt: string; ta: number; md: number };
  stats?: Record<string, string[]>; // "attacks": ["10", "5"]
}

export interface ProcessedStats {
  attacks: [number, number];
  dangerous_attacks: [number, number];
  on_target: [number, number];
  off_target: [number, number];
  /** Expected goals — chỉ có khi API gửi trường tương ứng (vd. `xg`). */
  xg?: [number, number];
  corners: [number, number];
  yellowcards: [number, number];
  redcards: [number, number];
}

export interface OddsItem {
  id: string;
  home_od?: string;
  draw_od?: string;
  away_od?: string;
  over_od?: string;
  under_od?: string;
  handicap?: string;
  time_str: string;
  add_time: string;
}

export interface OddsData {
  results: {
    odds: {
      "1_1"?: OddsItem[]; // Match Winner 1X2 (full match — home/draw/away)
      "1_2": OddsItem[]; // Match Winner / Handicap
      "1_3": OddsItem[]; // Over/Under
      "1_5"?: OddsItem[]; // 1st Half Asian Handicap
      "1_6"?: OddsItem[]; // 1st Half Goal Line
    };
  };
}

export interface ChartPoint {
  time: number;
  value: number;
  type?: 'home' | 'away' | 'over' | 'under';
  handicap?: number;
}

/** Chuẩn hóa một dòng Tài/Xỉu (API `1_3` full trận, `1_6` hiệp 1) tại một phút. */
export interface OverUnderMinuteSnapshot {
  marketId: '1_3' | '1_6';
  minute: number;
  /** 1 = hiệp 1 (kể cả bù >45'); 2 = hiệp 2 (đồng hồ từ 45'). */
  half?: 1 | 2;
  handicap: number;
  over: number;
  under: number;
  sourceId?: string;
}

/**
 * Chuẩn hóa 1X2 (Match Winner — API `1_1`) tại một phút.
 * Không có `handicap` (đặt 0 cho thống nhất kiểu khi cần).
 */
export interface MoneyLineMinuteSnapshot {
  marketId: '1_1';
  minute: number;
  half?: 1 | 2;
  home: number;
  draw: number;
  away: number;
  sourceId?: string;
}

/** Chuẩn hóa kèo chấp đội nhà/đội khách (API `1_2`, `1_5`). */
export interface AsianHandicapMinuteSnapshot {
  marketId: '1_2' | '1_5';
  minute: number;
  half?: 1 | 2;
  handicap: number;
  home: number;
  away: number;
  sourceId?: string;
}

/** Điểm chart sau khi gắn màu / highlight (từ `prepareChartData`). */
export type ColoredHandicapPoint = (OverUnderMinuteSnapshot | AsianHandicapMinuteSnapshot) & {
  color: string;
  colorName: string;
  highlight: boolean;
};

/** Đánh dấu trên biểu đồ — đồng bộ Nhật ký cảnh báo (chuông tại phút) */
export interface ChartAlertMarker {
  id: string;
  minute: number;
  /** Hiệp tại thời điểm cảnh báo — để vẽ chuông đúng panel H1/H2. */
  half?: 1 | 2;
  type: 'pressure' | 'goal';
  title: string;
  /** Áp lực: 2 = cực đại (chuông đỏ), 1 = gia tăng (vàng). */
  pressureLevel?: 1 | 2;
}

// New interface for the Bet Ticket Manager
export interface BetTicket {
  id: string;
  matchId: string;
  matchName: string; // Added to display in history
  betType: 'Tài' | 'Xỉu' | 'Đội nhà' | 'Đội khách' | 'Tài H1' | 'Xỉu H1' | 'Đội nhà H1' | 'Đội khách H1';
  handicap: string;
  odds: number;
  stake: number;
  minute: number;
  scoreAtBet?: string; // Score at the time of betting
  status: 'pending' | 'won' | 'lost' | 'push' | 'won_half' | 'lost_half';
  createdAt: number; // Added for date filtering
  notes?: string;
  /** UUID đồng bộ cùng dòng trên Google Sheet (xem services/bet-sheet-log.ts). */
  betId?: string;
  /** Đã ghi thành công vào Google Sheet (entry "vào kèo"). */
  sheetSynced?: boolean;
  /** Tên giải đấu — snapshot tại thời điểm vào kèo, để log sheet không phụ thuộc state runtime. */
  leagueName?: string;
  /** Ghi chú tự sinh (alerts, OU drops, AI summary…) — gửi cột `note`. */
  noteSnapshot?: string;
}

// FIX: Create a dedicated interface for a single history item for better type inference and reusability.
// Interface for a single history item
export interface HistoryItem {
  match: MatchInfo;
  viewedAt: number;
}

// Interface for storing viewed match history
export interface ViewedMatchHistory {
  [matchId: string]: HistoryItem;
}

export interface StoredAlert {
  id: string;
  minute: number;
  half?: 1 | 2;
  type: 'pressure' | 'goal';
  title: string;
  message: string;
  timestamp: number;
  pressureLevel?: 1 | 2;
}