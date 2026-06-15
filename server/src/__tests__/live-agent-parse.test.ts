import { describe, it, expect } from 'vitest';
import { parseAgentDecisionJson, stripJsonFences } from '../live-agent/parse-decision.js';

describe('parseAgentDecisionJson', () => {
  it('parses skip', () => {
    expect(parseAgentDecisionJson('{"action":"skip","reasonVi":"Chờ tín hiệu"}')).toEqual({
      action: 'skip',
      reasonVi: 'Chờ tín hiệu',
    });
  });

  it('parses bet', () => {
    const p = parseAgentDecisionJson(
      '{"action":"bet","betType":"over","reasonVi":"Alert giảm kèo Tài, ưu tiên over"}',
    );
    expect(p?.action).toBe('bet');
    expect(p?.betType).toBe('over');
  });

  it('strips fences', () => {
    const raw = '```json\n{"action":"skip","reasonVi":"ok"}\n```';
    expect(stripJsonFences(raw)).toBe('{"action":"skip","reasonVi":"ok"}');
  });

  it('rejects invalid', () => {
    expect(parseAgentDecisionJson('not json')).toBe(null);
    expect(parseAgentDecisionJson('{"action":"nope","reasonVi":"x"}')).toBe(null);
  });
});
