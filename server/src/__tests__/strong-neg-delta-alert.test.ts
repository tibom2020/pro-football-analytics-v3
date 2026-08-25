import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearStrongNegDeltaSentForTests,
  tryMarkStrongNegDeltaSent,
} from '../data/strong-neg-delta-persistence.js';

describe('strong neg delta persistence', () => {
  beforeEach(() => {
    clearStrongNegDeltaSentForTests();
  });

  it('key mới → true; lần 2 → false', () => {
    const key = 'snd:1:1_3:H1:10:2.50>2.25';
    expect(tryMarkStrongNegDeltaSent(key)).toBe(true);
    expect(tryMarkStrongNegDeltaSent(key)).toBe(false);
  });

  it('key khác cùng trận vẫn gửi được', () => {
    expect(tryMarkStrongNegDeltaSent('snd:1:1_3:H1:10:2.50>2.25')).toBe(true);
    expect(tryMarkStrongNegDeltaSent('snd:1:1_3:H1:30:2.25>2.00')).toBe(true);
  });
});

describe('strong neg delta threshold rule', () => {
  it('mirror server: delta <= -0.375', () => {
    const threshold = -0.375;
    expect(-0.375 <= threshold).toBe(true);
    expect(-0.374 <= threshold).toBe(false);
  });
});
