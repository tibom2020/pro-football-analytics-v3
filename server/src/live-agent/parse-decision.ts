import type { AgentDecisionPayload } from './types.js';
import type { FlowBetType } from '../telegram/bet-flow.js';

const BET_TYPES: FlowBetType[] = ['over', 'under', 'home', 'away'];

export function stripJsonFences(raw: string): string {
  let t = raw.trim();
  // Strip <think>...</think> if present (Deepseek R1/V4)
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) t = fence[1].trim();
  return t;
}

function normalizeRaw(raw: string): string {
  return raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, ' ')
    .trim();
}

function tryParseJsonObject(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // Fallback: extract the first balanced {...} block.
  const start = raw.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const candidate = raw.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function parseAgentDecisionJson(raw: string): AgentDecisionPayload | null {
  const t = normalizeRaw(stripJsonFences(raw));
  const obj = tryParseJsonObject(t);
  if (!obj || typeof obj !== 'object') return null;
  const root = obj as Record<string, unknown>;
  const rec =
    root.decision && typeof root.decision === 'object'
      ? (root.decision as Record<string, unknown>)
      : root;

  const actionRaw = rec.action;
  let action = typeof actionRaw === 'string' ? actionRaw.trim().toLowerCase() : '';
  const reasonRaw =
    (typeof rec.reasonVi === 'string' && rec.reasonVi) ||
    (typeof rec.reason === 'string' && rec.reason) ||
    (typeof rec.reason_vi === 'string' && rec.reason_vi) ||
    '';
  const reasonVi = reasonRaw.trim();

  // Gemini đôi khi trả action trực tiếp là betType ("under"/"over"/"home"/"away")
  // hoặc "enter"/"no_enter". Chuẩn hoá về schema nội bộ.
  if (action === 'enter' || action === 'strong_enter') action = 'bet';
  if (action === 'hold' || action === 'no_enter' || action === 'exit') action = 'skip';

  let btFromAction: FlowBetType | null = null;
  if (BET_TYPES.includes(action as FlowBetType)) {
    btFromAction = action as FlowBetType;
    action = 'bet';
  }

  if (action !== 'skip' && action !== 'bet') return null;
  if (!reasonVi || reasonVi.length > 500) return null;

  if (action === 'skip') {
    return { action: 'skip', reasonVi: reasonVi.slice(0, 400) };
  }

  const btRaw = btFromAction ?? rec.betType;
  const bt = typeof btRaw === 'string' ? btRaw.trim().toLowerCase() : '';
  if (!BET_TYPES.includes(bt as FlowBetType)) {
    return null;
  }

  return {
    action: 'bet',
    betType: bt as FlowBetType,
    reasonVi: reasonVi.slice(0, 400),
  };
}
