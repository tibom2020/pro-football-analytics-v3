/**
 * Service ghi 1 dòng "vào kèo" vào Google Sheet — dùng chung cho:
 *   - HTTP route `POST /api/sheets/bet` (gọi từ web app)
 *   - Telegram bot `/bet` flow (gọi từ inline keyboard)
 *
 * Logic (idempotent + validate + format note mặc định) được trích từ
 * `routes/sheets.ts` để tránh trùng lặp. Không phụ thuộc Express.
 *
 * Trả về discriminated union để caller xử lý từng case rõ ràng:
 *   - { ok: true, ... }       → đã ghi mới
 *   - { ok: true, deduped }   → đã có sẵn cùng betId, không append lại
 *   - { ok: false, code }     → lỗi với code phân loại
 */
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import {
  appendBetEntry,
  findRowByBetId,
  formatGmt7,
  type BetEntryRow,
} from './google-sheets.js';
import { logger } from '../logger.js';

export interface BetLogPayload {
  /** Nếu client gửi sẵn → idempotent retry an toàn. Bỏ trống → server tự sinh. */
  betId?: string;
  giaiDau: string;
  doiNha: string;
  doiKhach: string;
  /** Vd `1-0`. Bỏ trống → "N/A". */
  tySoLucVaoKeo?: string;
  /** Vd `Tài 2.5`, `Đội nhà -0.5`. */
  keoVao: string;
  /** Phút trận tại lúc vào kèo. */
  phut?: number | string;
  /** Decimal odds. */
  tyLeAn?: number | string;
  soTienCuoc: number;
  note?: string;
  /** Override timestamp (test/migrate). Để trống → server tự `formatGmt7()`. */
  timestampGmt7?: string;
}

export type BetLogErrorCode = 'invalid' | 'disabled' | 'sheets';

export type BetLogResult =
  | { ok: true; betId: string; rowIndex: number; deduped?: boolean }
  | { ok: false; error: string; code: BetLogErrorCode };

/**
 * Validate input. Trả về array các lỗi (rỗng = ok). Tách ra để caller có thể
 * dùng trước khi tốn round-trip Sheets API.
 */
export function validateBetLogPayload(payload: Partial<BetLogPayload>): string[] {
  const errors: string[] = [];

  const requiredKeys: (keyof BetLogPayload)[] = ['giaiDau', 'doiNha', 'doiKhach', 'keoVao'];
  for (const k of requiredKeys) {
    const v = payload[k];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      errors.push(`Thiếu trường: ${k}`);
    }
  }

  const stake = Number(payload.soTienCuoc);
  if (!Number.isFinite(stake) || stake <= 0) {
    errors.push('soTienCuoc phải là số > 0');
  }

  return errors;
}

/**
 * Ghi 1 dòng vào kèo. Caller chịu trách nhiệm validate trước (hoặc dựa vào
 * `code='invalid'` trả về). Hàm này tự xử lý:
 *   - Idempotency theo `betId`
 *   - Sheets disabled / chưa cấu hình → trả `code='disabled'`
 *   - Bất kỳ lỗi Sheets API → `code='sheets'`
 */
export async function logBetEntry(payload: BetLogPayload): Promise<BetLogResult> {
  if (!config.features.sheetsLogging) {
    return {
      ok: false,
      error: 'Sheets logging disabled (FEATURE_SHEETS_LOGGING=false)',
      code: 'disabled',
    };
  }
  if (!config.googleSheets.enabled) {
    return {
      ok: false,
      error: 'Google Sheets chưa cấu hình (xem README_GOOGLE_SHEETS.md).',
      code: 'disabled',
    };
  }

  const errors = validateBetLogPayload(payload);
  if (errors.length > 0) {
    return { ok: false, error: errors.join('; '), code: 'invalid' };
  }

  const stake = Number(payload.soTienCuoc);
  const betId = (payload.betId && payload.betId.trim()) || uuidv4();

  try {
    const existingRow = await findRowByBetId(betId).catch(() => -1);
    if (existingRow > 0) {
      return { ok: true, betId, rowIndex: existingRow, deduped: true };
    }

    const entry: BetEntryRow = {
      betId,
      timestampGmt7: payload.timestampGmt7 || formatGmt7(),
      giaiDau: String(payload.giaiDau || 'N/A'),
      doiNha: String(payload.doiNha),
      doiKhach: String(payload.doiKhach),
      tySoLucVaoKeo: String(payload.tySoLucVaoKeo ?? 'N/A'),
      keoVao: String(payload.keoVao),
      phut: payload.phut ?? 'N/A',
      tyLeAn: payload.tyLeAn ?? 'N/A',
      soTienCuoc: stake,
      note: String(payload.note ?? ''),
    };

    const { rowIndex } = await appendBetEntry(entry);
    logger.info(`[bet-logger] Logged bet ${betId} at row ${rowIndex || '?'}`);
    return { ok: true, betId, rowIndex };
  } catch (err) {
    logger.error('[bet-logger] append failed:', err);
    return {
      ok: false,
      error: (err as Error).message || 'Unknown Sheets API error',
      code: 'sheets',
    };
  }
}
