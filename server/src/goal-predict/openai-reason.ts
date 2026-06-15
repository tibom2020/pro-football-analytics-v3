/**
 * Client gọi OpenAI (GPT) cho reasoning tiếng Việt — chạy SONG SONG với Ollama
 * trong endpoint /api/ai/predict-goal/reason để user có 2 góc nhìn phân tích.
 */

import OpenAI from 'openai';
import { config } from '../config.js';

export interface OpenAiReasonRequest {
    system: string;
    user: string;
    json?: boolean;
    model?: string;
}

export interface OpenAiReasonResponse {
    text: string;
    error?: string;
    durationMs: number;
}

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI | null {
    if (!config.openai.apiKey) return null;
    if (!cachedClient) {
        cachedClient = new OpenAI({ apiKey: config.openai.apiKey });
    }
    return cachedClient;
}

export async function callOpenAiReason(req: OpenAiReasonRequest): Promise<OpenAiReasonResponse> {
    const t0 = Date.now();
    const client = getClient();
    if (!client) {
        return { text: '', error: 'OPENAI_API_KEY chưa cấu hình', durationMs: 0 };
    }
    const model = req.model ?? config.openai.model;
    try {
        const completion = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: req.system },
                { role: 'user', content: req.user },
            ],
            temperature: 0.2,
            max_tokens: 512,
            ...(req.json ? { response_format: { type: 'json_object' as const } } : {}),
        });
        const text = completion.choices[0]?.message?.content?.trim() ?? '';
        return { text, durationMs: Date.now() - t0 };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { text: '', error: `OpenAI: ${msg}`, durationMs: Date.now() - t0 };
    }
}
