/**
 * Google Sheets writer cho bet logging.
 *
 * Auth: service account (JWT). Hai cách cấu hình (config trong `config.ts`):
 *   1. `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` — đường dẫn file JSON tải từ GCP.
 *   2. `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
 *      (PEM, có thể chứa `\n` literal — sẽ tự convert).
 *
 * Spreadsheet: `GOOGLE_SHEETS_SPREADSHEET_ID`. Tab: `GOOGLE_SHEETS_TAB_NAME`
 * (mặc định "Bets"). Bắt buộc share sheet với email service account, quyền
 * Editor.
 *
 * Ngoài việc append/update, service tự đảm bảo:
 *  - Tab tồn tại (tạo nếu chưa).
 *  - Hàng tiêu đề có sẵn.
 *
 * Tất cả lỗi đều bubble up — caller (route) tự catch để trả 4xx/5xx.
 */
import fs from 'node:fs';
import { JWT } from 'google-auth-library';
import { config } from '../config.js';
import { logger } from '../logger.js';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/** Cột & thứ tự xuất hiện trên sheet — đổi thứ tự tại đây = đổi schema. */
export const HEADER_COLUMNS = [
  'bet_id',
  'timestamp_gmt7',
  'giai_dau',
  'doi_nha',
  'doi_khach',
  'ty_so_luc_vao_keo',
  'keo_vao',
  'phut',
  'ty_le_an',
  'so_tien_cuoc',
  'note',
  'ket_qua',
  'lai_lo',
  'result_at_gmt7',
] as const;

export type HeaderColumn = (typeof HEADER_COLUMNS)[number];

export interface BetEntryRow {
  betId: string;
  timestampGmt7: string;
  giaiDau: string;
  doiNha: string;
  doiKhach: string;
  tySoLucVaoKeo: string;
  keoVao: string;
  phut: number | string;
  tyLeAn: number | string;
  soTienCuoc: number;
  note: string;
}

export interface BetResultUpdate {
  ketQua: string;
  laiLo: number;
  resultAtGmt7: string;
}

let cachedJwt: JWT | null = null;
let ensuredTabPromise: Promise<void> | null = null;

function getJwt(): JWT {
  if (cachedJwt) return cachedJwt;
  const cfg = config.googleSheets;

  let email = cfg.serviceAccountEmail;
  let privateKey = cfg.serviceAccountPrivateKey;

  if (cfg.serviceAccountJsonPath) {
    const raw = fs.readFileSync(cfg.serviceAccountJsonPath, 'utf-8');
    const json = JSON.parse(raw) as { client_email?: string; private_key?: string };
    email = email || json.client_email || '';
    privateKey = privateKey || json.private_key || '';
  }

  if (!email || !privateKey) {
    throw new Error(
      'Google Sheets: thiếu service account email/private key. Cấu hình GOOGLE_SERVICE_ACCOUNT_JSON_PATH hoặc GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
    );
  }

  // PEM trong env file thường bị escape `\n` — chuyển lại thành newline thật.
  privateKey = privateKey.replace(/\\n/g, '\n');

  cachedJwt = new JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });
  return cachedJwt;
}

export async function sheetsAuthedFetch(
  url: string,
  init: RequestInit & { method: string; body?: string },
): Promise<unknown> {
  const jwt = getJwt();
  const token = await jwt.getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.token}`,
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google Sheets API ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function sheetsQuoteRange(tab: string, a1: string): string {
  // Tab name có dấu cách / dấu nháy → bọc nháy đơn và escape `'`.
  const safe = tab.replace(/'/g, "''");
  return `'${safe}'!${a1}`;
}

export function getSpreadsheetId(): string {
  const id = config.googleSheets.spreadsheetId;
  if (!id) throw new Error('Google Sheets: thiếu GOOGLE_SHEETS_SPREADSHEET_ID.');
  return id;
}

async function ensureTabAndHeader(): Promise<void> {
  if (ensuredTabPromise) return ensuredTabPromise;
  ensuredTabPromise = (async () => {
    const id = getSpreadsheetId();
    const tab = config.googleSheets.tabName;

    const meta = (await sheetsAuthedFetch(`${SHEETS_API}/${id}?fields=sheets.properties`, {
      method: 'GET',
    })) as { sheets?: Array<{ properties?: { title?: string } }> } | null;

    const exists = meta?.sheets?.some((s) => s.properties?.title === tab);
    if (!exists) {
      await sheetsAuthedFetch(`${SHEETS_API}/${id}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: tab } } }],
        }),
      });
      logger.info(`[sheets] Created tab "${tab}" in spreadsheet`);
    }

    // Check & write header row 1 if empty.
    const range = sheetsQuoteRange(tab, 'A1:N1');
    const headerRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;

    const hasHeader =
      headerRes?.values && headerRes.values.length > 0 && headerRes.values[0].length >= HEADER_COLUMNS.length;

    if (!hasHeader) {
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range,
            majorDimension: 'ROWS',
            values: [HEADER_COLUMNS.slice()],
          }),
        },
      );
      logger.info(`[sheets] Wrote header row to "${tab}"`);
    }
  })().catch((err) => {
    ensuredTabPromise = null; // cho phép retry lần sau
    throw err;
  });
  return ensuredTabPromise;
}

function rowFromEntry(e: BetEntryRow): (string | number)[] {
  return [
    e.betId,
    e.timestampGmt7,
    e.giaiDau,
    e.doiNha,
    e.doiKhach,
    e.tySoLucVaoKeo,
    e.keoVao,
    e.phut,
    e.tyLeAn,
    e.soTienCuoc,
    e.note,
    '', // ket_qua
    '', // lai_lo
    '', // result_at_gmt7
  ];
}

/**
 * Append một bet entry mới. Trả về row index (1-based) đã ghi nếu Sheets API
 * cung cấp; ngược lại 0.
 */
export async function appendBetEntry(entry: BetEntryRow): Promise<{ rowIndex: number }> {
  await ensureTabAndHeader();
  const id = getSpreadsheetId();
  const tab = config.googleSheets.tabName;
  const range = sheetsQuoteRange(tab, 'A:N');
  const json = (await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&includeValuesInResponse=false`,
    {
      method: 'POST',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowFromEntry(entry)],
      }),
    },
  )) as { updates?: { updatedRange?: string } } | null;

  // updatedRange ví dụ: 'Bets'!A12:N12
  let rowIndex = 0;
  const m = json?.updates?.updatedRange?.match(/!\w+(\d+):/);
  if (m) rowIndex = parseInt(m[1], 10);
  return { rowIndex };
}

/**
 * Tìm row index (1-based) theo `betId` ở cột A. Trả về -1 nếu không thấy.
 */
export async function findRowByBetId(betId: string): Promise<number> {
  await ensureTabAndHeader();
  const id = getSpreadsheetId();
  const tab = config.googleSheets.tabName;
  const range = sheetsQuoteRange(tab, 'A:A');
  const json = (await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?majorDimension=COLUMNS`,
    { method: 'GET' },
  )) as { values?: string[][] } | null;

  const col = json?.values?.[0] || [];
  // Hàng 1 là header → bỏ qua.
  for (let i = 1; i < col.length; i++) {
    if (col[i] === betId) return i + 1; // sheet rows 1-indexed
  }
  return -1;
}

/**
 * Cập nhật cột L:N (ket_qua, lai_lo, result_at_gmt7) tại đúng row của `betId`.
 * Trả về `false` nếu không tìm thấy bet_id (caller có thể chọn append fallback).
 */
export async function updateBetResult(
  betId: string,
  update: BetResultUpdate,
): Promise<boolean> {
  const row = await findRowByBetId(betId);
  if (row <= 0) return false;
  const id = getSpreadsheetId();
  const tab = config.googleSheets.tabName;
  const range = sheetsQuoteRange(tab, `L${row}:N${row}`);
  await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[update.ketQua, update.laiLo, update.resultAtGmt7]],
      }),
    },
  );
  return true;
}

/** Format một Date thành chuỗi GMT+7 dạng `YYYY-MM-DD HH:mm:ss GMT+7`. */
export function formatGmt7(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const iso = shifted.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ (đã shift)
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} GMT+7`;
}
