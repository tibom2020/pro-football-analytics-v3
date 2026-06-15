import OpenAI from 'openai';
import { buildUserPrompt, buildMessagesForChat } from './prompt.js';
import { parseAgentDecisionJson } from './parse-decision.js';
import type { AgentDecisionPayload, AgentLLMContext, AgentProvider } from './types.js';
import type { config as AppConfig } from '../config.js';

type Config = typeof AppConfig;

export type LLMCallResult = { raw: string; payload: AgentDecisionPayload | null; error?: string };

export type LLMCaller = (ctx: AgentLLMContext) => Promise<LLMCallResult>;

function extractGeminiText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const c = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(c) || c.length === 0) return null;
  const content = (c[0] as { content?: { parts?: { text?: string }[] } })?.content;
  const parts = content?.parts;
  if (!Array.isArray(parts) || !parts[0]?.text) return null;
  return String(parts[0].text);
}

export async function callGemini(config: Config, ctx: AgentLLMContext): Promise<LLMCallResult> {
  const key = config.agent.geminiApiKey;
  if (!key) return { raw: '', payload: null, error: 'GEMINI_API_KEY chưa cấu hình' };

  const prompt = buildUserPrompt(ctx);
  const model = config.agent.geminiModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [
          {
            text: 'Bạn chỉ trả lời bằng một object JSON đúng schema (action, betType, reasonVi). Không markdown.',
          },
        ],
      },
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { raw: '', payload: null, error: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` };
  }

  const data = (await res.json()) as unknown;
  const text = extractGeminiText(data) || '';
  const payload = parseAgentDecisionJson(text);
  return { raw: text, payload };
}

export function createOpenAiCompatibleCaller(
  config: Config,
  provider: AgentProvider,
  apiKey: string,
  baseURL: string,
  model: string,
): LLMCaller {
  const client = new OpenAI({ apiKey, baseURL });
  const labels: Record<AgentProvider, string> = {
    gpt: 'GPT',
    gemini: 'Gemini',
    deepseek: 'Deepseek',
  };

  return async (ctx: AgentLLMContext) => {
    if (!apiKey) {
      return { raw: '', payload: null, error: 'API key chưa cấu hình' };
    }
    const userContent = buildUserPrompt(ctx);
    const messages = buildMessagesForChat(ctx, userContent);

    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.15,
        max_tokens: 2048,
      });
      const raw = completion.choices[0]?.message?.content || '';
      const payload = parseAgentDecisionJson(raw);
      return { raw, payload };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { raw: '', payload: null, error: `${labels[provider]}: ${msg}` };
    }
  };
}

export function createGptCaller(config: Config): LLMCaller {
  const key = config.openai.apiKey;
  return createOpenAiCompatibleCaller(config, 'gpt', key, 'https://api.openai.com/v1', config.agent.gptModel);
}

export function createDeepseekCaller(config: Config): LLMCaller {
  return createOpenAiCompatibleCaller(
    config,
    'deepseek',
    config.agent.deepseekApiKey,
    config.agent.deepseekBaseUrl,
    config.agent.deepseekModel,
  );
}

export async function callGeminiWrapped(config: Config, ctx: AgentLLMContext): Promise<LLMCallResult> {
  try {
    return await callGemini(config, ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { raw: '', payload: null, error: `Gemini: ${msg}` };
  }
}
