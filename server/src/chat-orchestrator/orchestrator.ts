import { ChatMessage, BetEvaluation, MatchData, BetInput, OddsSnapshot } from '../ai-assistant-core/types.js';
import { evaluateBet } from '../ai-assistant-core/evaluator.js';
import { ConversationMemory } from './memory.js';
import { config } from '../config.js';
import { logger } from '../index.js';

interface ChatRequest {
  userId: string;
  sessionId?: string;
  message: string;
  matchContext?: {
    match: MatchData;
    oddsHistory: OddsSnapshot[];
  };
}

interface ChatResponse {
  sessionId: string;
  message: ChatMessage;
  evaluation?: BetEvaluation;
}

export class ChatOrchestrator {
  private memory: ConversationMemory;

  constructor(memory: ConversationMemory) {
    this.memory = memory;
  }

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const session = this.memory.getOrCreateSession(request.userId, request.sessionId);

    // Store user message
    const userMessage = this.memory.addMessage(session.id, {
      role: 'user',
      content: request.message,
    });

    // Update match context if provided
    if (request.matchContext?.match.id) {
      this.memory.setActiveMatch(session.id, request.matchContext.match.id);
    }

    // Detect intent
    const intent = this.detectIntent(request.message);
    let responseContent: string;
    let evaluation: BetEvaluation | undefined;

    switch (intent) {
      case 'evaluate_bet':
        if (request.matchContext) {
          const betInput = this.extractBetInput(request.message, request.matchContext.match);
          if (betInput) {
            evaluation = evaluateBet(request.matchContext.match, betInput, request.matchContext.oddsHistory);
            this.memory.addContextEvaluation(session.id, evaluation);
            responseContent = this.formatEvaluationResponse(evaluation);
          } else {
            responseContent = 'Vui lòng cung cấp thêm thông tin: loại cược (Tài/Xỉu/Đội nhà/Đội khách), kèo handicap, và tỷ lệ cược.';
          }
        } else {
          responseContent = 'Vui lòng chọn một trận đấu trước khi yêu cầu phân tích kèo.';
        }
        break;

      case 'match_info':
        if (request.matchContext) {
          responseContent = this.formatMatchInfo(request.matchContext.match);
        } else {
          responseContent = 'Chưa có trận đấu nào được chọn. Vui lòng mở một trận từ danh sách.';
        }
        break;

      case 'alert_status':
        responseContent = this.formatAlertStatus(session.id);
        break;

      case 'help':
        responseContent = this.getHelpMessage();
        break;

      default:
        if (config.openai.enabled) {
          responseContent = await this.getAIResponse(session.id, request.message, request.matchContext);
        } else {
          responseContent = this.getRuleBasedResponse(request.message, session.id);
        }
    }

    const assistantMessage = this.memory.addMessage(session.id, {
      role: 'assistant',
      content: responseContent,
      metadata: evaluation ? { evaluation, matchId: request.matchContext?.match.id } : undefined,
    });

    return {
      sessionId: session.id,
      message: assistantMessage,
      evaluation,
    };
  }

  private detectIntent(message: string): string {
    const lower = message.toLowerCase().trim();

    if (/(?:phân tích|đánh giá|nhận định|nên vào|vào kèo|chọn kèo|bet|cược)/i.test(lower)) {
      return 'evaluate_bet';
    }
    if (/(?:thông tin|info|trận đấu|tỉ số|score)/i.test(lower)) {
      return 'match_info';
    }
    if (/(?:cảnh báo|alert|theo dõi|monitor)/i.test(lower)) {
      return 'alert_status';
    }
    if (/(?:help|hướng dẫn|giúp|trợ giúp|lệnh)/i.test(lower)) {
      return 'help';
    }
    return 'general';
  }

  private extractBetInput(message: string, match: MatchData): BetInput | null {
    const lower = message.toLowerCase();

    let betType: BetInput['betType'] | null = null;
    if (/tài\s*h1|over\s*h1/i.test(lower)) betType = 'over_h1';
    else if (/xỉu\s*h1|under\s*h1/i.test(lower)) betType = 'under_h1';
    else if (/đội nhà\s*h1|home\s*h1/i.test(lower)) betType = 'home_h1';
    else if (/đội khách\s*h1|away\s*h1/i.test(lower)) betType = 'away_h1';
    else if (/tài|over/i.test(lower)) betType = 'over';
    else if (/xỉu|under/i.test(lower)) betType = 'under';
    else if (/đội nhà|home/i.test(lower)) betType = 'home';
    else if (/đội khách|away/i.test(lower)) betType = 'away';

    if (!betType) return null;

    // Extract handicap
    const handicapMatch = lower.match(/(?:kèo|line|handicap|chấp)?\s*([+-]?\d+\.?\d*)/);
    const handicap = handicapMatch ? parseFloat(handicapMatch[1]) : 2.5;

    // Extract odds
    const oddsMatch = lower.match(/(?:odds|tỷ lệ|@)\s*(\d+\.?\d*)/);
    const odds = oddsMatch ? parseFloat(oddsMatch[1]) : 1.90;

    return {
      matchId: match.id,
      betType,
      handicap,
      odds,
      stake: 100,
    };
  }

  private formatEvaluationResponse(ev: BetEvaluation): string {
    const recEmoji: Record<string, string> = {
      strong_enter: '🟢🟢',
      enter: '🟢',
      hold: '🟡',
      reduce_stake: '🟠',
      exit: '🔴',
      no_enter: '⛔',
    };

    const lines = [
      `${recEmoji[ev.recommendation] || '❓'} **${ev.recommendationText}**`,
      ``,
      `📊 Điểm hợp lý: **${ev.score}/100**`,
      `🎯 Xác suất thắng: **${ev.winProbability}%**`,
      `🔒 Độ tin cậy: **${ev.confidence}%**`,
    ];

    if (ev.factors.length > 0) {
      lines.push(``, `📋 **Các yếu tố phân tích:**`);
      for (const f of ev.factors) {
        const icon = f.impact === 'positive' ? '✅' : f.impact === 'negative' ? '❌' : '➖';
        lines.push(`${icon} ${f.name}: ${f.explanation}`);
      }
    }

    if (ev.risks.length > 0) {
      lines.push(``, `⚠️ **Rủi ro:**`);
      for (const r of ev.risks) {
        lines.push(`  • ${r}`);
      }
    }

    if (ev.insufficientData.length > 0) {
      lines.push(``, `ℹ️ **Lưu ý dữ liệu:**`);
      for (const d of ev.insufficientData) {
        lines.push(`  • ${d}`);
      }
    }

    return lines.join('\n');
  }

  private formatMatchInfo(match: MatchData): string {
    const s = match.stats;
    return [
      `🏟 **${match.home} vs ${match.away}**`,
      `🏆 ${match.league}`,
      `⏱ Phút ${match.minute}' | Tỉ số: ${match.score[0]}-${match.score[1]}`,
      ``,
      `📊 **Thống kê:**`,
      `  Sút trúng đích: ${s.shotsOnTarget[0]} - ${s.shotsOnTarget[1]}`,
      `  Tấn công nguy hiểm: ${s.dangerousAttacks[0]} - ${s.dangerousAttacks[1]}`,
      `  Phạt góc: ${s.corners[0]} - ${s.corners[1]}`,
      `  Thẻ vàng: ${s.yellowCards[0]} - ${s.yellowCards[1]}`,
      `  Thẻ đỏ: ${s.redCards[0]} - ${s.redCards[1]}`,
    ].join('\n');
  }

  private formatAlertStatus(sessionId: string): string {
    const ctx = this.memory.buildContextString(sessionId);
    if (!ctx.trim()) {
      return 'Chưa có cảnh báo nào gần đây. Hãy đăng ký theo dõi kèo để nhận cảnh báo.';
    }
    return `📋 **Trạng thái hiện tại:**\n${ctx}`;
  }

  private getHelpMessage(): string {
    return [
      `🤖 **Trợ lý AI - Hướng dẫn sử dụng**`,
      ``,
      `Tôi có thể giúp bạn:`,
      ``,
      `📊 **Phân tích kèo:**`,
      `  • "Phân tích Tài 2.5" — đánh giá kèo Tài/Xỉu`,
      `  • "Nên vào kèo đội nhà?" — đánh giá kèo chấp`,
      `  • "Đánh giá kèo Xỉu 2.5 @1.85" — với tỷ lệ cụ thể`,
      ``,
      `📋 **Thông tin trận:**`,
      `  • "Thông tin trận" — xem thống kê hiện tại`,
      `  • "Tỉ số" — xem tỉ số và thời gian`,
      ``,
      `🔔 **Cảnh báo:**`,
      `  • "Trạng thái cảnh báo" — xem các cảnh báo gần đây`,
      ``,
      `💡 Mẹo: Mở một trận đấu trước khi yêu cầu phân tích để có kết quả chính xác nhất.`,
    ].join('\n');
  }

  private getRuleBasedResponse(message: string, _sessionId: string): string {
    const lower = message.toLowerCase();

    if (/(?:xin chào|hello|hi|chào)/i.test(lower)) {
      return 'Chào bạn! Tôi là trợ lý AI phân tích kèo. Gõ "help" để xem các lệnh có sẵn.';
    }
    if (/(?:cảm ơn|thanks|thank)/i.test(lower)) {
      return 'Không có chi! Nếu cần thêm phân tích, cứ hỏi nhé.';
    }

    return 'Tôi hiểu câu hỏi của bạn nhưng cần thêm ngữ cảnh. Hãy thử:\n'
      + '• "Phân tích Tài 2.5" để đánh giá kèo\n'
      + '• "Thông tin trận" để xem thống kê\n'
      + '• "Help" để xem hướng dẫn đầy đủ';
  }

  private buildSystemPrompt(sessionId: string, matchCtx?: ChatRequest['matchContext']): string {
    const contextStr = this.memory.buildContextString(sessionId);

    const matchBlock = matchCtx ? [
      ``,
      `═══ NGỮ CẢNH TRẬN ĐẤU ═══`,
      `${matchCtx.match.home} vs ${matchCtx.match.away} | ${matchCtx.match.league}`,
      `Tỉ số: ${matchCtx.match.score[0]} - ${matchCtx.match.score[1]}  |  Phút: ${matchCtx.match.minute}'`,
      `DA: ${matchCtx.match.stats.dangerousAttacks[0]}-${matchCtx.match.stats.dangerousAttacks[1]}`,
      `Sút trúng đích: ${matchCtx.match.stats.shotsOnTarget[0]}-${matchCtx.match.stats.shotsOnTarget[1]}`,
      `Phạt góc: ${matchCtx.match.stats.corners[0]}-${matchCtx.match.stats.corners[1]}`,
      `Thẻ đỏ: ${matchCtx.match.stats.redCards[0]}-${matchCtx.match.stats.redCards[1]}`,
      ...(matchCtx.oddsHistory.length > 0 ? (() => {
        const last = matchCtx.oddsHistory[matchCtx.oddsHistory.length - 1];
        return [
          `Odds hiện tại → Line: ${last.handicap}  Tài: ${last.overOdds?.toFixed(3) ?? '—'}  Xỉu: ${last.underOdds?.toFixed(3) ?? '—'}`,
          `Lịch sử: ${matchCtx.oddsHistory.length} điểm dữ liệu`,
        ];
      })() : []),
      `═══════════════════════════`,
    ].join('\n') : '';

    return [
      `Bạn là chuyên gia phân tích kèo bóng đá trực tiếp. Trả lời bằng tiếng Việt, súc tích, có số liệu cụ thể.`,
      `Không cam kết kết quả; luôn nêu mức độ không chắc chắn. Không khuyến khích cờ bạc.`,
      `Định dạng: dùng **bold** cho điểm quan trọng, gạch đầu dòng cho danh sách.`,
      matchBlock,
      contextStr ? `\nNgữ cảnh phiên:\n${contextStr}` : '',
    ].filter(Boolean).join('\n');
  }

  private async getAIResponse(sessionId: string, message: string, matchCtx?: ChatRequest['matchContext']): Promise<string> {
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: config.openai.apiKey });

      const session = this.memory.getSession(sessionId);
      const systemPrompt = this.buildSystemPrompt(sessionId, matchCtx);

      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        ...(session?.messages.slice(-12).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })) ?? []),
      ];

      const response = await client.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: 600,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() || 'Xin lỗi, tôi không thể trả lời lúc này.';
    } catch (err) {
      logger.error('OpenAI call failed:', err);
      return this.getRuleBasedResponse(message, sessionId);
    }
  }
}
