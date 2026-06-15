/**
 * Client gọi DeepSeek (OpenAI-compatible API) cho reasoning tiếng Việt —
 * chạy song song với Ollama + GPT trong /api/ai/predict-goal/reason.
 */

import OpenAI from 'openai';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface DeepSeekReasonRequest {
    system: string;
    user: string;
    json?: boolean;
    model?: string;
}

export interface DeepSeekReasonResponse {
    text: string;
    error?: string;
    durationMs: number;
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
    const apiKey = config.agent.deepseekApiKey;
    if (!apiKey) return null;
    if (!cachedClient) {
        cachedClient = new OpenAI({
            apiKey,
            baseURL: config.agent.deepseekBaseUrl,
        });
    }
    return cachedClient;
}

function isV4Model(model: string): boolean {
    return model.includes('deepseek-v4') || model === 'deepseek-chat' || model === 'deepseek-reasoner';
}

/** DeepSeek V4 đôi khi để content rỗng khi bật thinking — ưu tiên content, fallback reasoning_content. */
function extractMessageText(message: OpenAI.Chat.Completions.ChatCompletionMessage | undefined): string {
    if (!message) return '';
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (content) return content;
    const extra = message as { reasoning_content?: string };
    return typeof extra.reasoning_content === 'string' ? extra.reasoning_content.trim() : '';
}

const MAX_ATTEMPTS = 3;

export async function callDeepSeekReason(req: DeepSeekReasonRequest): Promise<DeepSeekReasonResponse> {
    const t0 = Date.now();
    const client = getClient();
    if (!client) {
        return { text: '', error: 'DEEPSEEK_API_KEY chưa cấu hình', durationMs: 0 };
    }
    const model = req.model ?? config.goalPredict.deepseekModel;
    let lastFinish = '';
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const completion = await client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: req.system },
                    { role: 'user', content: req.user },
                ],
                temperature: 0.2,
                max_tokens: 768,
                ...(req.json ? { response_format: { type: 'json_object' as const } } : {}),
                ...(isV4Model(model) ? { thinking: { type: 'disabled' as const } } : {}),
            });
            const choice = completion.choices[0];
            lastFinish = choice?.finish_reason ?? '';
            const text = extractMessageText(choice?.message);
            if (text) {
                if (attempt > 1) {
                    logger.info(`[deepseek-reason] OK sau ${attempt} lần thử (finish=${lastFinish})`);
                }
                return { text, durationMs: Date.now() - t0 };
            }
            lastError = `response rỗng (finish_reason=${lastFinish || 'unknown'}, attempt=${attempt})`;
            logger.warn(`[deepseek-reason] ${lastError}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            lastError = msg;
            return { text: '', error: `DeepSeek: ${msg}`, durationMs: Date.now() - t0 };
        }
    }

    return {
        text: '',
        error: `DeepSeek: ${lastError || 'response rỗng sau nhiều lần thử'}`,
        durationMs: Date.now() - t0,
    };
}

export function isDeepSeekEnabled(): boolean {
    return !!config.agent.deepseekApiKey;
}
