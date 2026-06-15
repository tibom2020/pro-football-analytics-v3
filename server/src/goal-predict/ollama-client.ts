/**
 * Client gọi Ollama local cho reasoning tiếng Việt.
 * Pattern tương tự llm-clients.ts (live-agent) nhưng đơn giản hơn vì Ollama REST không cần SDK.
 */

import { config } from '../config.js';

export interface OllamaRequest {
    /** System prompt (instruction). */
    system: string;
    /** User content. */
    user: string;
    /** Có yêu cầu JSON output không. */
    json?: boolean;
    /** Override model. */
    model?: string;
    /** Override base URL. */
    baseUrl?: string;
}

export interface OllamaResponse {
    text: string;
    error?: string;
    durationMs: number;
}

export async function callOllama(req: OllamaRequest): Promise<OllamaResponse> {
    const t0 = Date.now();
    const baseUrl = req.baseUrl ?? config.ollama.baseUrl;
    const model = req.model ?? config.ollama.model;
    const url = `${baseUrl.replace(/\/+$/, '')}/api/generate`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ollama.timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: req.user,
                system: req.system,
                stream: false,
                format: req.json ? 'json' : undefined,
                options: { temperature: 0.2, num_predict: 256 },
            }),
            signal: ctrl.signal,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            return {
                text: '',
                error: `Ollama HTTP ${res.status}: ${errText.slice(0, 200)}`,
                durationMs: Date.now() - t0,
            };
        }

        const data = (await res.json()) as { response?: string };
        return { text: String(data.response ?? '').trim(), durationMs: Date.now() - t0 };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { text: '', error: `Ollama: ${msg}`, durationMs: Date.now() - t0 };
    } finally {
        clearTimeout(timer);
    }
}

export async function pingOllama(): Promise<{ ok: boolean; models: string[]; error?: string }> {
    try {
        const res = await fetch(`${config.ollama.baseUrl.replace(/\/+$/, '')}/api/tags`);
        if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
        const data = (await res.json()) as { models?: Array<{ name?: string }> };
        return { ok: true, models: (data.models || []).map((m) => String(m.name || '')).filter(Boolean) };
    } catch (e) {
        return { ok: false, models: [], error: e instanceof Error ? e.message : String(e) };
    }
}
