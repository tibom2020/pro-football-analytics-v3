/**
 * Client-side OpenAI streaming chat service.
 * Works directly from the browser — no server required.
 * Uses VITE_OPENAI_API_KEY (env) OR a user-supplied key stored in localStorage.
 */

import type { MatchInfo, ProcessedStats, OverUnderMinuteSnapshot, AsianHandicapMinuteSnapshot } from '../types';
import type { BetEvaluation } from './ai-service';

// ---- Constants ----

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const LS_KEY_API = 'oai_api_key';
const LS_KEY_MODEL = 'oai_model';
const DEFAULT_MODEL = 'gpt-4o-mini';

// ---- Types ----

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChatOptions {
  messages: OpenAIChatMessage[];
  apiKey: string;
  model?: string;
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}

// ---- Local-storage key helpers ----

/** Ưu tiên: `VITE_OPENAI_API_KEY` trong `.env.local` → sau đó key lưu trong trình duyệt (⚙). */
export function getStoredApiKey(): string {
  const fromEnv = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return localStorage.getItem(LS_KEY_API) || '';
}

/** Key được embed từ build/dev (Vite) — không cần nhập trong ⚙. */
export function hasOpenAIKeyFromEnv(): boolean {
  const k = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  return !!k;
}

/** Chỉ key lưu trong trình duyệt (⚙), không gồm .env — dùng khi soạn form cài đặt. */
export function getBrowserStoredApiKeyOnly(): string {
  return localStorage.getItem(LS_KEY_API) || '';
}

export function saveApiKey(key: string): void {
  if (key) localStorage.setItem(LS_KEY_API, key);
  else localStorage.removeItem(LS_KEY_API);
}

export function getStoredModel(): string {
  return localStorage.getItem(LS_KEY_MODEL) || DEFAULT_MODEL;
}

export function saveModel(model: string): void {
  localStorage.setItem(LS_KEY_MODEL, model || DEFAULT_MODEL);
}

// ---- System prompt builder ----

const fmtOdds = (n?: number): string =>
  typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : '—';

const fmtLine = (h?: number | string): string => {
  if (h === undefined || h === null || h === '') return '—';
  const n = typeof h === 'number' ? h : parseFloat(String(h));
  return Number.isFinite(n) ? n.toString() : '—';
};

/**
 * System prompt theo cấu trúc Role / Task / Context / Reasoning / Output / Stop Conditions
 * — persona "chuyên gia phân tích kèo LIVE, giọng nữ dễ thương, kỷ luật, bảo vệ vốn".
 *
 * Lưu ý:
 * - Phần Context được auto-inject từ `match` + `stats` + odds. Nếu thiếu nguồn (vd chưa có kèo H1)
 *   sẽ hiển thị "Chưa có" để model tự quyết "hỏi đúng 1 câu duy nhất".
 * - Đã tạm bỏ section "tri thức / sheets" — sẽ bổ sung khi tích hợp knowledge base.
 */
export function buildMatchSystemPrompt(
  match: MatchInfo,
  stats: ProcessedStats,
  latestOverOdds?: OverUnderMinuteSnapshot,
  latestHomeOdds?: AsianHandicapMinuteSnapshot,
  latestH1OverOdds?: OverUnderMinuteSnapshot,
  latestH1HomeOdds?: AsianHandicapMinuteSnapshot,
  lastEvaluation?: BetEvaluation | null,
): string {
  const minute = match.timer?.tm ?? parseInt(match.time || '0', 10);
  const [homeScore, awayScore] = (match.ss || '0-0').split('-').map(Number);
  const total = homeScore + awayScore;

  const shotsHome = stats.on_target[0] + stats.off_target[0];
  const shotsAway = stats.on_target[1] + stats.off_target[1];

  const oddsLines: string[] = [];
  oddsLines.push(
    latestOverOdds
      ? `  • Tài/Xỉu FT — Line ${fmtLine(latestOverOdds.handicap)} | Tài @${fmtOdds(latestOverOdds.over)} | Xỉu @${fmtOdds(latestOverOdds.under)}`
      : `  • Tài/Xỉu FT — Chưa có`,
  );
  oddsLines.push(
    latestHomeOdds
      ? `  • Chấp FT     — Line ${fmtLine(latestHomeOdds.handicap)} | Nhà @${fmtOdds(latestHomeOdds.home)} | Khách @${fmtOdds(latestHomeOdds.away)}`
      : `  • Chấp FT     — Chưa có`,
  );
  oddsLines.push(
    latestH1OverOdds
      ? `  • Tài/Xỉu H1  — Line ${fmtLine(latestH1OverOdds.handicap)} | Tài @${fmtOdds(latestH1OverOdds.over)} | Xỉu @${fmtOdds(latestH1OverOdds.under)}`
      : `  • Tài/Xỉu H1  — Chưa có`,
  );
  oddsLines.push(
    latestH1HomeOdds
      ? `  • Chấp H1     — Line ${fmtLine(latestH1HomeOdds.handicap)} | Nhà @${fmtOdds(latestH1HomeOdds.home)} | Khách @${fmtOdds(latestH1HomeOdds.away)}`
      : `  • Chấp H1     — Chưa có`,
  );

  const evalLines: string[] = [];
  if (lastEvaluation) {
    const betLabel: Record<string, string> = {
      over: 'Tài (FT)', under: 'Xỉu (FT)',
      home: 'Đội nhà (FT)', away: 'Đội khách (FT)',
      over_h1: 'Tài H1', under_h1: 'Xỉu H1',
      home_h1: 'Đội nhà H1', away_h1: 'Đội khách H1',
    };
    evalLines.push(
      ``,
      `🤖 Tham chiếu rule-based gần nhất (${betLabel[lastEvaluation.betType] ?? lastEvaluation.betType}):`,
      `  Điểm hợp lý: ${lastEvaluation.score}/100 | Xác suất thắng: ${lastEvaluation.winProbability}% | Tin cậy: ${lastEvaluation.confidence}%`,
      `  Khuyến nghị: ${lastEvaluation.recommendationText}`,
      ...(lastEvaluation.risks.length > 0
        ? [`  Rủi ro nội bộ: ${lastEvaluation.risks.slice(0, 3).join('; ')}`]
        : []),
      `  (Đây là output thuật toán nội bộ — bạn có thể đối chiếu nhưng KHÔNG bắt buộc đồng ý.)`,
    );
  }

  return [
    `## 1) Role`,
    `Bạn là chuyên gia phân tích kèo bóng đá LIVE với 10+ năm kinh nghiệm — giọng nữ dễ thương, vui vẻ, nhưng phân tích cực kỳ logic và kỷ luật.`,
    `Bạn ưu tiên BẢO VỆ VỐN cho người chơi hơn là "đu theo kèo". Không khuyến khích cờ bạc; luôn cảnh báo rủi ro.`,
    ``,
    `## 2) Task`,
    `Phân tích trận đấu LIVE dựa trên thông số do app Pro Football Analytics cung cấp:`,
    `- Xác định tối thiểu 2–4 tình huống "bẫy nhà cái".`,
    `- Đưa ra 2–3 kịch bản diễn biến trận.`,
    `- Đề xuất hướng vào kèo (HOẶC từ chối vào kèo).`,
    `- Gán mức độ tin cậy (%) cho từng nhận định.`,
    ``,
    `## 3) Context (auto-inject từ app)`,
    `Giải: ${match.league?.name ?? '—'}`,
    `Trận: ${match.home.name} vs ${match.away.name}`,
    `Tỉ số: ${homeScore} - ${awayScore} (tổng ${total} bàn)`,
    `Phút: ${minute}'`,
    ``,
    `📊 Thống kê tích lũy (nguồn B365; định dạng "nhà - khách"):`,
    `  Tổng sút:        ${shotsHome} - ${shotsAway}   (= sút trúng + sút không trúng; ĐÂY mới là tổng cú sút)`,
    `  Sút trúng đích:  ${stats.on_target[0]} - ${stats.on_target[1]}`,
    `  Sút không đích:  ${stats.off_target[0]} - ${stats.off_target[1]}`,
    `  Tấn công (Att):  ${stats.attacks[0]} - ${stats.attacks[1]}   (đợt tấn công — KHÔNG phải số cú sút)`,
    `  Nguy hiểm (DA):  ${stats.dangerous_attacks[0]} - ${stats.dangerous_attacks[1]}   (đợt nguy hiểm — KHÔNG phải số cú sút)`,
    `  Phạt góc:        ${stats.corners[0]} - ${stats.corners[1]}`,
    `  Thẻ vàng/đỏ:     ${stats.yellowcards[0]}/${stats.redcards[0]} - ${stats.yellowcards[1]}/${stats.redcards[1]}`,
    ``,
    `💰 Kèo hiện tại:`,
    ...oddsLines,
    ...evalLines,
    ``,
    `Quy tắc dữ liệu:`,
    `- Khi nói "sút / dứt điểm / cơ hội ghi bàn" PHẢI dùng Tổng sút (= trúng + không trúng), KHÔNG được mô tả nhầm Att/DA là số cú sút.`,
    `- Nếu thiếu dữ liệu QUAN TRỌNG (vd chưa có kèo, chưa có diễn biến trận) → hỏi đúng 1 câu duy nhất để bổ sung, KHÔNG bịa.`,
    `- Tuyệt đối không tự bịa thông tin ngoài dữ liệu bên trên hoặc do người dùng cung cấp trong cuộc hội thoại.`,
    ``,
    `## 4) Reasoning Framework (làm theo thứ tự)`,
    `B1. Đọc trận: nhịp độ (nhanh/chậm/bế tắc), đội nào kiểm soát, áp lực tấn công thực tế.`,
    `B2. Đọc kèo: so sánh kèo trước trận vs kèo live, biến động odds (tăng/giảm bất thường), thời điểm nhà cái thay kèo.`,
    `B3. Phát hiện bẫy:`,
    `   - Bẫy tâm lý (đội mạnh ép nhưng không ghi bàn).`,
    `   - Bẫy odds (odds ngon bất thường).`,
    `   - Bẫy thời điểm (cuối hiệp, phút 60–75, phút 80+).`,
    `B4. Đối chiếu logic: diễn biến trận có khớp kèo không? Nếu KHÔNG khớp → khả năng cao là bẫy.`,
    `B5. Kết luận: nên vào / không vào; nếu vào — loại kèo (AH / O/U / H1 / FT) và thời điểm vào tối ưu.`,
    ``,
    `Mọi nhận định CHƯA có dữ liệu xác thực phải gắn nhãn:`,
    `  [Suy luận]  — diễn dịch logic từ data hiện có`,
    `  [Suy đoán]  — dự báo dựa trên xu hướng nhưng chưa chắc`,
    `  [Chưa xác minh] — claim không có nguồn trong context`,
    ``,
    `## 5) Output Format (bắt buộc, theo thứ tự)`,
    `### 📊 Tóm tắt trận`,
    `- Trận:`,
    `- Phút:`,
    `- Kèo hiện tại:`,
    ``,
    `### 🔍 Phân tích nhanh`,
    `- Nhịp trận:`,
    `- Đội chiếm ưu thế:`,
    `- Dấu hiệu bất thường:`,
    ``,
    `### ⚠️ Các bẫy nhà cái phát hiện (≥ 2)`,
    `1. (Tên bẫy + giải thích ngắn — gắn nhãn nếu cần)`,
    `2. ...`,
    ``,
    `### 🎯 Kịch bản trận (2–3)`,
    `- Kịch bản 1 — (mô tả + xác suất ước lượng %)`,
    `- Kịch bản 2 — ...`,
    ``,
    `### 💡 Khuyến nghị kèo`,
    `- Lựa chọn: (loại kèo cụ thể HOẶC "Đứng ngoài")`,
    `- Thời điểm vào: (phút / điều kiện trigger)`,
    `- Mức tin cậy: XX%`,
    ``,
    `### 🚨 Cảnh báo rủi ro`,
    `- (rủi ro chính + cách phòng vệ vốn)`,
    ``,
    `## 6) Stop Conditions`,
    `Chỉ kết thúc câu trả lời khi đáp ứng ĐỦ:`,
    `- Đã chỉ ra ít nhất 2 bẫy.`,
    `- Có khuyến nghị rõ ràng (vào kèo cụ thể HOẶC từ chối vào kèo).`,
    `- Có % tin cậy cho khuyến nghị chính.`,
    `- Không sử dụng thông tin chưa được xác minh mà không gắn nhãn [Chưa xác minh].`,
    `- Không vi phạm quy tắc dữ liệu ở mục 3.`,
  ].join('\n');
}

// ---- SSE streaming ----

/**
 * Gọi OpenAI Chat Completions với streaming.
 * Trả về AbortController để có thể hủy.
 */
export async function streamOpenAIChat(opts: StreamChatOptions): Promise<void> {
  const { messages, apiKey, model = DEFAULT_MODEL, onToken, onDone, onError, signal } = opts;

  if (!apiKey) {
    onError('Chưa có API Key. Vào ⚙ để nhập OpenAI API Key.');
    return;
  }

  let accumulated = '';
  try {
    const resp = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 1400,
        temperature: 0.7,
      }),
      signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      let msg = `OpenAI lỗi ${resp.status}`;
      try {
        const j = JSON.parse(errBody);
        msg = j?.error?.message || msg;
      } catch { /* ignored */ }
      onError(msg);
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) { onError('Không đọc được stream.'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      for (const line of parts) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') { onDone(accumulated); return; }
        try {
          const parsed = JSON.parse(data);
          const token: string = parsed.choices?.[0]?.delta?.content ?? '';
          if (token) {
            accumulated += token;
            onToken(token);
          }
        } catch { /* skip malformed chunk */ }
      }
    }
    onDone(accumulated);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    onError(err instanceof Error ? err.message : 'Lỗi không xác định khi gọi OpenAI.');
  }
}

// ---- Supported models ----
export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (nhanh, rẻ)' },
  { value: 'gpt-4o', label: 'GPT-4o (mạnh nhất)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (tiết kiệm)' },
];
