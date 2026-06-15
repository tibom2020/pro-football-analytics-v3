import { describe, expect, it } from 'vitest';
import {
  deriveChinhXac,
  deriveDuDoan15,
  minuteBucket10,
  GOAL_HEADER_COLUMNS,
  GOAL_LEVEL_SUMMARY_30_HEADER_COLUMNS,
} from '../services/goal-prediction-sheets.js';

describe('minuteBucket10', () => {
  it('maps minutes into 10-minute buckets', () => {
    expect(minuteBucket10(0)).toBe('0-9');
    expect(minuteBucket10(9)).toBe('0-9');
    expect(minuteBucket10(10)).toBe('10-19');
    expect(minuteBucket10(45)).toBe('40-49');
    expect(minuteBucket10(89)).toBe('80-89');
    expect(minuteBucket10(90)).toBe('90+');
    expect(minuteBucket10(120)).toBe('90+');
  });
});

describe('deriveDuDoan15', () => {
  it('classifies high vs low at 50% threshold', () => {
    expect(deriveDuDoan15(0.5)).toBe('cao');
    expect(deriveDuDoan15(0.49)).toBe('thap');
    expect(deriveDuDoan15(0.75)).toBe('cao');
  });
});

describe('deriveChinhXac', () => {
  it('marks match when prediction aligns with outcome', () => {
    expect(deriveChinhXac('cao', 'yes')).toBe('dung');
    expect(deriveChinhXac('cao', 'no')).toBe('sai');
    expect(deriveChinhXac('thap', 'no')).toBe('dung');
    expect(deriveChinhXac('thap', 'yes')).toBe('sai');
  });
});

describe('GOAL_HEADER_COLUMNS — block dự đoán 30p', () => {
  it('giữ nguyên 20 cột 15p cũ (A–T) rồi append block 30p ở cuối', () => {
    // Cột 15p cũ không được xê dịch (formula summary tham chiếu I/K/M/N/O).
    expect(GOAL_HEADER_COLUMNS[8]).toBe('khoang_10'); // I
    expect(GOAL_HEADER_COLUMNS[10]).toBe('prob_15_pct'); // K
    expect(GOAL_HEADER_COLUMNS[12]).toBe('du_doan_15'); // M
    expect(GOAL_HEADER_COLUMNS[13]).toBe('ket_qua_15'); // N
    expect(GOAL_HEADER_COLUMNS[14]).toBe('chinh_xac_15'); // O
    expect(GOAL_HEADER_COLUMNS[19]).toBe('reason_heuristic'); // T (cột cuối cũ)
  });

  it('block 30p nằm đúng U–AA', () => {
    expect(GOAL_HEADER_COLUMNS[20]).toBe('prob_30_pct'); // U
    expect(GOAL_HEADER_COLUMNS[21]).toBe('du_doan_30'); // V
    expect(GOAL_HEADER_COLUMNS[22]).toBe('ket_qua_30'); // W
    expect(GOAL_HEADER_COLUMNS[23]).toBe('chinh_xac_30'); // X
    expect(GOAL_HEADER_COLUMNS[24]).toBe('verdict_auto_30'); // Y
    expect(GOAL_HEADER_COLUMNS[25]).toBe('verdict_at_gmt7_30'); // Z
    expect(GOAL_HEADER_COLUMNS[26]).toBe('model_30'); // AA
    expect(GOAL_HEADER_COLUMNS.length).toBe(27);
  });

  it('header tab level-summary 30p bắt đầu bằng du_doan_30', () => {
    expect(GOAL_LEVEL_SUMMARY_30_HEADER_COLUMNS[0]).toBe('du_doan_30');
    expect(GOAL_LEVEL_SUMMARY_30_HEADER_COLUMNS[1]).toBe('khoang_10');
  });
});
