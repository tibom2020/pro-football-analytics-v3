
import { MatchInfo, OddsData, ProcessedStats } from '../types';

/**
 * PROXY STRATEGY:
 * B365 API often blocks common public proxies like allorigins or corsproxy.io.
 * For personal projects, a private proxy like a Cloudflare Worker is recommended
 * for better reliability and and custom logic.
 *
 * REPLACE THE URL BELOW WITH YOUR OWN CLOUDFLARE WORKER URL.
 * Example: "https://YOUR_WORKER_NAME.YOUR_SUBDOMAIN.workers.dev/"
 * Make sure your Worker is configured to forward the 'target' query parameter
 * and correctly sets CORS headers.
 *
 * Dev chỉ localhost: `.env.local` → `VITE_B365_SKIP_WORKER=true` — gọi B365 trực tiếp
 * qua `server` (`/api/b365-proxy`), không qua Worker (tránh 502 / phụ thuộc Worker).
 */
const PROXY_URL =
  (import.meta.env.VITE_B365_PROXY_URL as string | undefined)?.trim() ||
  "https://muddy-wave-d0bc.phanvietlinh-0b1.workers.dev/";

/** `true`: bỏ Cloudflare Worker; server Node `fetch` thẳng tới api.b365api.com */
const SKIP_CLOUDFLARE_WORKER =
  String(import.meta.env.VITE_B365_SKIP_WORKER || "").toLowerCase() === "true";

const B365_API_INPLAY = "https://api.b365api.com/v3/events/inplay";
const B365_API_ODDS = "https://api.b365api.com/v2/event/odds";

// --- Client-side Rate Limiting Configuration ---
// Minimum interval between API calls — reduced to 2s so requests within a tab don't queue up for 20s.
const MIN_API_CALL_INTERVAL = 2 * 1000;
let lastApiCallTime = 0; // Timestamp of the last API call initiated

/**
 * Ensures that API requests adhere to a strict client-side rate limit.
 * Will pause execution if the limit would be exceeded.
 */
const enforceRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
    console.warn(`Client-side rate limit active. Waiting ${waitTime / 1000}s before next API call.`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  // Update last API call time *after* any potential wait, and *before* the fetch attempt.
  // This marks the start of the "next" allowed interval.
  lastApiCallTime = Date.now();
};


const mockMatches: MatchInfo[] = [
  {
    id: "1",
    league: { name: "Premier League - Demo" },
    home: { name: "Manchester United" },
    away: { name: "Liverpool" },
    ss: "1-1",
    time: "65",
    timer: { tm: 65, ts: 0, tt: "1", ta: 0, md: 0 },
    stats: {
      attacks: ["60", "75"],
      dangerous_attacks: ["35", "50"],
      on_target: ["5", "8"],
      off_target: ["4", "6"],
      xg: ["1.35", "2.10"],
      corners: ["3", "5"],
      yellowcards: ["1", "2"],
      redcards: ["0", "0"],
    },
  },
  {
    id: "2",
    league: { name: "La Liga - Demo" },
    home: { name: "Real Madrid" },
    away: { name: "Barcelona" },
    ss: "2-0",
    time: "78",
    timer: { tm: 78, ts: 0, tt: "1", ta: 0, md: 0 },
    stats: {
      attacks: ["80", "50"],
      dangerous_attacks: ["60", "25"],
      on_target: ["10", "2"],
      off_target: ["7", "3"],
      xg: ["3.25", "0.85"],
      corners: ["8", "1"],
      yellowcards: ["0", "3"],
      redcards: ["0", "0"],
    },
  },
];

const mockOdds: OddsData = {
  results: {
    odds: {
      "1_2": [], // Mock for home/away odds
      "1_3": [ // Mock for over/under odds
        { id: '1', over_od: '1.85', under_od: '1.95', handicap: '2.5', time_str: '0', add_time: '0' }
      ]
    }
  }
};

import { AI_SERVER_URL } from './ai-service';
import { B365_SERVER_TOKEN } from './b365-auth';

/** Token thật hoặc `__SERVER__` (server inject B365_API_TOKEN khi deploy). */
function withB365Token(baseUrl: string, token: string): string {
  const effective = token === B365_SERVER_TOKEN ? B365_SERVER_TOKEN : encodeURIComponent(token.trim());
  return baseUrl.includes('token=')
    ? baseUrl.replace(/token=[^&]*/, `token=${effective}`)
    : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${effective}`;
}

/**
 * Performs a proxied fetch and handles common API/Proxy errors with retry logic for 429.
 * Applies client-side rate limit before each fetch attempt.
 */
const safeFetch = async (url: string, retries = 0): Promise<any> => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY_MS = 2000; // 2 seconds

  // Apply client-side rate limit before attempting fetch
  await enforceRateLimit();

  // Luồng 1 (mặc định): Browser → server AI → Cloudflare Worker → B365 (Worker xử lý CORS / một số mạng).
  // Luồng 2 (VITE_B365_SKIP_WORKER=true): Browser → server AI → B365 (đủ cho localhost, bỏ Worker).
  const targetForServer = SKIP_CLOUDFLARE_WORKER
    ? url
    : `${PROXY_URL}?target=${encodeURIComponent(url)}`;
  const proxiedUrl = `${AI_SERVER_URL}/api/b365-proxy?target=${encodeURIComponent(targetForServer)}`;

  console.debug("B365 fetch via AI server:", SKIP_CLOUDFLARE_WORKER ? "direct to B365" : "via Worker", proxiedUrl);

  try {
    const response = await fetch(proxiedUrl);

    if (response.status === 403) {
      throw new Error("Lỗi truy cập (403). B365 hoặc Proxy đang chặn yêu cầu này. Vui lòng kiểm tra lại Token API hoặc thử lại sau.");
    }

    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retries);
        console.warn(`Quá nhiều yêu cầu (429) từ Proxy. Đang thử lại sau ${delay / 1000} giây... (Lần thử: ${retries + 1}/${MAX_RETRIES})`);
        await new Promise(res => setTimeout(res, delay));
        return safeFetch(url, retries + 1); // Retry the fetch
      } else {
        // Updated 429 error message
        throw new Error(
          "Giới hạn tần suất (429) sau nhiều lần thử. Nếu đang dùng Cloudflare Worker, kiểm tra rate limit Worker; nếu chỉ dev local, thử `VITE_B365_SKIP_WORKER=true` để gọi B365 trực tiếp từ server Node.",
        );
      }
    }

    if (!response.ok) {
      // Enhanced error message for clarity
      throw new Error(
        `Lỗi kết nối: ${response.status} ${response.statusText}. Kiểm tra server AI (${AI_SERVER_URL}) và ${
          SKIP_CLOUDFLARE_WORKER ? "API B365 / token." : "Cloudflare Worker hoặc đặt VITE_B365_SKIP_WORKER=true để bỏ Worker."
        }`,
      );
    }

    const text = await response.text();
    // If the response is empty, return null gracefully instead of throwing an error
    if (!text || text.trim().length === 0) {
      console.warn(`API đã trả về phản hồi trống cho URL: ${url}. Đang xử lý như không có dữ liệu.`);
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Lỗi phân tích JSON. Phản hồi thô:", text);
      throw new Error(
        "Phản hồi API không phải JSON hợp lệ. Kiểm tra token B365 và (nếu dùng Worker) trạng thái proxy.",
      );
    }
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Updated error message for network/CORS to be more specific
      throw new Error(
        `Lỗi mạng hoặc không tới được server AI (${AI_SERVER_URL}). Đảm bảo \`npm run dev\` trong thư mục server đang chạy và VITE_AI_SERVER_URL đúng. ` +
          (SKIP_CLOUDFLARE_WORKER
            ? ""
            : "Nếu không cần Worker, thử VITE_B365_SKIP_WORKER=true trong .env.local."),
      );
    }
    throw error;
  }
};

export const getInPlayEvents = async (token: string): Promise<MatchInfo[]> => {
  if (token === 'DEMO_MODE') {
    // Return a deep copy of mockMatches to ensure immutability and reliability in demo mode
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(mockMatches))), 500));
  }
  if (!token) return [];

  try {
    const targetUrl = withB365Token(`${B365_API_INPLAY}?sport_id=1`, token);
    const data = await safeFetch(targetUrl);

    if (data === null) { // Handle graceful null return for empty response
      console.warn(`getInPlayEvents: Nhận được phản hồi trống. Không có sự kiện nào được tải.`);
      return [];
    }

    if (data.success !== 1 && data.success !== "1") {
      throw new Error(data.error || 'API đã trả về trạng thái thất bại.');
    }

    const results = data.results || [];
    return results.filter((event: MatchInfo) =>
      event.league && event.league.name && !event.league.name.toLowerCase().includes('esoccer')
    );
  } catch (error) {
    console.error("Failed to load match list:", error);
    throw error;
  }
};

export const getMatchDetails = async (token: string, eventId: string): Promise<MatchInfo | null> => {
  if (token === 'DEMO_MODE') {
    // Also return a deep copy for a specific match in demo mode
    const match = JSON.parse(JSON.stringify(mockMatches)).find((e: MatchInfo) => e.id === eventId) || null;
    return new Promise(resolve => setTimeout(() => resolve(match), 200));
  }
  if (!token || !eventId) return null;
  try {
    const targetUrl = withB365Token(`${B365_API_INPLAY}?sport_id=1`, token);
    const data = await safeFetch(targetUrl);

    if (data === null) { // Handle graceful null return for empty response
      console.warn(`getMatchDetails: Nhận được phản hồi trống cho sự kiện ${eventId}.`);
      return null;
    }

    const results: MatchInfo[] = data.results || [];
    const match = results.find(e => e.id === eventId);

    if (match && match.league && match.league.name && match.league.name.toLowerCase().includes('esoccer')) {
      return null;
    }

    return match || null;
  } catch (error) {
    console.error(`Failed to fetch match details for event ${eventId}:`, error);
    return null;
  }
};

export const getMatchOdds = async (token: string, eventId: string): Promise<OddsData | null> => {
  if (token === 'DEMO_MODE') {
    // Return a deep copy of mockOdds for demo mode
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(mockOdds))), 100));
  }
  if (!token || !eventId) return null;
  try {
    const targetUrl = withB365Token(`${B365_API_ODDS}?event_id=${eventId}`, token);
    const data = await safeFetch(targetUrl);

    if (data === null) { // Handle graceful null return for empty response
      console.warn(`getMatchOdds: Nhận được phản hồi trống hoặc không có dữ liệu tỷ lệ cược cho sự kiện ${eventId}.`);
      return null;
    }

    if (!data || data.success === 0 || data.success === "0") {
      console.warn(`API báo cáo lỗi khi lấy tỷ lệ cược cho sự kiện ${eventId}:`, data?.error || 'Lỗi không xác định');
      return null;
    }
    return data || null;
  } catch (error) {
    console.error(`Failed to fetch odds for event ${eventId}:`, error);
    return null;
  }
};

export const parseStats = (stats: Record<string, string[]> | undefined) => {
  const parse = (key: string): [number, number] => {
    const arr = stats?.[key];
    if (arr && arr.length === 2) {
      return [parseInt(arr[0] || '0'), parseInt(arr[1] || '0')];
    }
    return [0, 0];
  };

  const parseXgPair = (): [number, number] | undefined => {
    const keys = ['xg', 'expected_goals', 'expected_goal'];
    for (const key of keys) {
      const arr = stats?.[key];
      if (!arr || arr.length < 2) continue;
      const a = parseFloat(String(arr[0] ?? '').replace(',', '.'));
      const b = parseFloat(String(arr[1] ?? '').replace(',', '.'));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return [a, b];
      }
    }
    return undefined;
  };

  const xg = parseXgPair();

  return {
    attacks: parse('attacks'),
    dangerous_attacks: parse('dangerous_attacks'),
    on_target: parse('on_target'),
    off_target: parse('off_target'),
    ...(xg != null ? { xg } : {}),
    corners: parse('corners'),
    yellowcards: parse('yellowcards'),
    redcards: parse('redcards'),
  };
};