/**
 * Google Sheets writer cho goal prediction logging.
 * Tab raw: GoalPredictions.
 * Tab tổng hợp: GoalPredictSummary (theo khoang_10), GoalPredictByDuDoan (cao/thap × khoang_10).
 */
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  formatGmt7,
  getSpreadsheetId,
  sheetsAuthedFetch,
  sheetsQuoteRange,
} from './google-sheets.js';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export const GOAL_HEADER_COLUMNS = [
  'prediction_id',
  'timestamp_gmt7',
  'match_id',
  'giai_dau',
  'doi_nha',
  'doi_khach',
  'hieu',
  'phut',
  'khoang_10',
  'ty_so_luc_du_doan',
  'prob_15_pct',
  'prob_5_pct',
  'du_doan_15',
  'ket_qua_15',
  'chinh_xac_15',
  'verdict_auto',
  'verdict_at_gmt7',
  'model_15',
  'onnx_ms',
  'reason_heuristic',
  // ---- Block dự đoán 30' (append ở cuối để không xê dịch cột 15' cũ) ----
  'prob_30_pct',
  'du_doan_30',
  'ket_qua_30',
  'chinh_xac_30',
  'verdict_auto_30',
  'verdict_at_gmt7_30',
  'model_30',
] as const;

export const GOAL_LEVEL_SUMMARY_HEADER_COLUMNS = [
  'du_doan_15',
  'khoang_10',
  'so_du_doan',
  'so_co_ket_qua',
  'so_dung',
  'ty_le_chinh_xac_pct',
  'ty_le_co_ban_pct',
  'prob_tb_khi_co_ban',
] as const;

export const GOAL_LEVEL_SUMMARY_30_HEADER_COLUMNS = [
  'du_doan_30',
  'khoang_10',
  'so_du_doan',
  'so_co_ket_qua',
  'so_dung',
  'ty_le_chinh_xac_pct',
  'ty_le_co_ban_pct',
  'prob_tb_khi_co_ban',
] as const;

export const GOAL_SUMMARY_HEADER_COLUMNS = [
  'khoang_10',
  'so_du_doan',
  'so_co_ket_qua',
  'so_dung',
  'ty_le_chinh_xac_pct',
  'ty_le_co_ban_pct',
  'prob_tb_khi_co_ban',
] as const;

/** Các bucket 10 phút + 90+ */
export const MINUTE_BUCKETS_10 = [
  '0-9',
  '10-19',
  '20-29',
  '30-39',
  '40-49',
  '50-59',
  '60-69',
  '70-79',
  '80-89',
  '90+',
] as const;

const PROB_THRESHOLD = parseFloat(process.env.GOAL_PREDICT_SHEET_THRESHOLD || '0.5');

export type DuDoan15 = 'cao' | 'thap';
export type KetQua15 = 'yes' | 'no';
export type ChinhXac15 = 'dung' | 'sai';

export const DU_DOAN_LEVELS: readonly DuDoan15[] = ['cao', 'thap'];

export interface GoalPredictionRow {
  predictionId: string;
  timestampGmt7: string;
  matchId: string;
  giaiDau: string;
  doiNha: string;
  doiKhach: string;
  hieu: 1 | 2;
  phut: number;
  khoang10: string;
  tySoLucDuDoan: string;
  prob15Pct: number | '';
  prob5Pct: number | '';
  duDoan15: DuDoan15;
  model15: string;
  onnxMs: number | '';
  reasonHeuristic: string;
  /** Cửa sổ 30' (cửa sổ CHÍNH). '' nếu model 30' chưa load. */
  prob30Pct: number | '';
  duDoan30: DuDoan15 | '';
  model30: string;
}

export interface GoalPredictionVerdictUpdate {
  ketQua15: KetQua15;
  verdictAuto: boolean;
  verdictAtGmt7: string;
  duDoan15: DuDoan15;
  chinhXac15: ChinhXac15;
}

/** Update kết quả cho cửa sổ 30' (ghi block V:Z). */
export interface GoalPrediction30VerdictUpdate {
  ketQua30: KetQua15;
  verdictAuto: boolean;
  verdictAtGmt7: string;
  duDoan30: DuDoan15;
  chinhXac30: ChinhXac15;
}

let ensuredGoalTabPromise: Promise<void> | null = null;
let ensuredSummaryTabPromise: Promise<void> | null = null;
let ensuredLevelSummaryTabPromise: Promise<void> | null = null;
let ensuredSummary30TabPromise: Promise<void> | null = null;
let ensuredLevelSummary30TabPromise: Promise<void> | null = null;

/** Nhóm phút 10': 0-9, 10-19, …, 90+ */
export function minuteBucket10(phut: number): string {
  const m = Math.max(0, Math.floor(phut));
  if (m >= 90) return '90+';
  const lo = Math.floor(m / 10) * 10;
  const hi = lo + 9;
  return `${lo}-${hi}`;
}

export function deriveDuDoan15(prob15: number, threshold = PROB_THRESHOLD): DuDoan15 {
  return prob15 >= threshold ? 'cao' : 'thap';
}

export function deriveChinhXac(duDoan: DuDoan15, ketQua: KetQua15): ChinhXac15 {
  const predictedYes = duDoan === 'cao';
  const actualYes = ketQua === 'yes';
  return predictedYes === actualYes ? 'dung' : 'sai';
}

function goalTab(): string {
  return config.googleSheets.goalTabName;
}

function summaryTab(): string {
  return config.googleSheets.goalSummaryTabName;
}

function levelSummaryTab(): string {
  return config.googleSheets.goalLevelSummaryTabName;
}

function summary30Tab(): string {
  return config.googleSheets.goalSummary30TabName;
}

function levelSummary30Tab(): string {
  return config.googleSheets.goalLevelSummary30TabName;
}

function rawDataTabRef(): string {
  return goalTab();
}

async function sheetExists(tabTitle: string): Promise<boolean> {
  const id = getSpreadsheetId();
  const meta = (await sheetsAuthedFetch(`${SHEETS_API}/${id}?fields=sheets.properties`, {
    method: 'GET',
  })) as { sheets?: Array<{ properties?: { title?: string } }> } | null;
  return !!meta?.sheets?.some((s) => s.properties?.title === tabTitle);
}

async function createTab(tabTitle: string): Promise<void> {
  const id = getSpreadsheetId();
  await sheetsAuthedFetch(`${SHEETS_API}/${id}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: tabTitle } } }],
    }),
  });
  logger.info(`[sheets-goal] Created tab "${tabTitle}"`);
}

function rowFromGoalEntry(e: GoalPredictionRow): (string | number)[] {
  return [
    e.predictionId,
    e.timestampGmt7,
    e.matchId,
    e.giaiDau,
    e.doiNha,
    e.doiKhach,
    e.hieu,
    e.phut,
    e.khoang10,
    e.tySoLucDuDoan,
    e.prob15Pct,
    e.prob5Pct,
    e.duDoan15,
    '', // ket_qua_15
    '', // chinh_xac_15
    '', // verdict_auto
    '', // verdict_at_gmt7
    e.model15,
    e.onnxMs,
    e.reasonHeuristic,
    e.prob30Pct, // U: prob_30_pct
    e.duDoan30, // V: du_doan_30
    '', // W: ket_qua_30
    '', // X: chinh_xac_30
    '', // Y: verdict_auto_30
    '', // Z: verdict_at_gmt7_30
    e.model30, // AA: model_30
  ];
}

export async function ensureGoalTabAndHeader(): Promise<void> {
  if (ensuredGoalTabPromise) return ensuredGoalTabPromise;
  ensuredGoalTabPromise = (async () => {
    const id = getSpreadsheetId();
    const tab = goalTab();
    if (!(await sheetExists(tab))) {
      await createTab(tab);
    }
    const range = sheetsQuoteRange(tab, `A1:AA1`);
    const headerRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const hasHeader =
      headerRes?.values &&
      headerRes.values.length > 0 &&
      headerRes.values[0].length >= GOAL_HEADER_COLUMNS.length;
    if (!hasHeader) {
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range,
            majorDimension: 'ROWS',
            values: [GOAL_HEADER_COLUMNS.slice()],
          }),
        },
      );
      logger.info(`[sheets-goal] Wrote header to "${tab}"`);
    }
  })().catch((err) => {
    ensuredGoalTabPromise = null;
    throw err;
  });
  return ensuredGoalTabPromise;
}

function summaryFormulaRow(bucketLabel: string, rowIndex: number): (string | number)[] {
  const raw = rawDataTabRef();
  const a = `A${rowIndex}`;
  // khoang_10 = cột I; prob_15 = K; ket_qua_15 = N; chinh_xac_15 = O; du_doan_15 = M
  return [
    bucketLabel,
    `=COUNTIF('${raw}'!$I:$I, ${a})`,
    `=COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$N:$N, "<>")`,
    `=COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$O:$O, "dung")`,
    `=IF(C${rowIndex}>0, D${rowIndex}/C${rowIndex}*100, "")`,
    `=IF(C${rowIndex}>0, COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$N:$N, "yes")/C${rowIndex}*100, "")`,
    `=IFERROR(AVERAGEIFS('${raw}'!$K:$K, '${raw}'!$I:$I, ${a}, '${raw}'!$N:$N, "yes"), "")`,
  ];
}

function levelSummaryFormulaRow(
  duDoan: DuDoan15,
  bucketLabel: string,
  rowIndex: number,
): (string | number)[] {
  const raw = rawDataTabRef();
  const duDoanCell = `$A${rowIndex}`;
  const bucketCell = `$B${rowIndex}`;
  return [
    duDoan,
    bucketLabel,
    `=COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$M:$M, ${duDoanCell})`,
    `=COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$M:$M, ${duDoanCell}, '${raw}'!$N:$N, "<>")`,
    `=COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$M:$M, ${duDoanCell}, '${raw}'!$O:$O, "dung")`,
    `=IF(D${rowIndex}>0, E${rowIndex}/D${rowIndex}*100, "")`,
    `=IF(D${rowIndex}>0, COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$M:$M, ${duDoanCell}, '${raw}'!$N:$N, "yes")/D${rowIndex}*100, "")`,
    `=IFERROR(AVERAGEIFS('${raw}'!$K:$K, '${raw}'!$I:$I, ${bucketCell}, '${raw}'!$M:$M, ${duDoanCell}, '${raw}'!$N:$N, "yes"), "")`,
  ];
}

/**
 * Summary 30' theo bucket — giống summaryFormulaRow nhưng map sang block cột 30':
 * prob_30 = cột U; du_doan_30 = V; ket_qua_30 = W; chinh_xac_30 = X. khoang_10 = I (chung).
 */
function summary30FormulaRow(bucketLabel: string, rowIndex: number): (string | number)[] {
  const raw = rawDataTabRef();
  const a = `A${rowIndex}`;
  return [
    bucketLabel,
    `=COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$V:$V, "<>")`,
    `=COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$W:$W, "<>")`,
    `=COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$X:$X, "dung")`,
    `=IF(C${rowIndex}>0, D${rowIndex}/C${rowIndex}*100, "")`,
    `=IF(C${rowIndex}>0, COUNTIFS('${raw}'!$I:$I, ${a}, '${raw}'!$W:$W, "yes")/C${rowIndex}*100, "")`,
    `=IFERROR(AVERAGEIFS('${raw}'!$U:$U, '${raw}'!$I:$I, ${a}, '${raw}'!$W:$W, "yes"), "")`,
  ];
}

function levelSummary30FormulaRow(
  duDoan: DuDoan15,
  bucketLabel: string,
  rowIndex: number,
): (string | number)[] {
  const raw = rawDataTabRef();
  const duDoanCell = `$A${rowIndex}`;
  const bucketCell = `$B${rowIndex}`;
  return [
    duDoan,
    bucketLabel,
    `=COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$V:$V, ${duDoanCell})`,
    `=COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$V:$V, ${duDoanCell}, '${raw}'!$W:$W, "<>")`,
    `=COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$V:$V, ${duDoanCell}, '${raw}'!$X:$X, "dung")`,
    `=IF(D${rowIndex}>0, E${rowIndex}/D${rowIndex}*100, "")`,
    `=IF(D${rowIndex}>0, COUNTIFS('${raw}'!$I:$I, ${bucketCell}, '${raw}'!$V:$V, ${duDoanCell}, '${raw}'!$W:$W, "yes")/D${rowIndex}*100, "")`,
    `=IFERROR(AVERAGEIFS('${raw}'!$U:$U, '${raw}'!$I:$I, ${bucketCell}, '${raw}'!$V:$V, ${duDoanCell}, '${raw}'!$W:$W, "yes"), "")`,
  ];
}

function buildLevelSummaryRows(dataStartRow: number): (string | number)[][] {
  const rows: (string | number)[][] = [];
  let rowIndex = dataStartRow;
  for (const level of DU_DOAN_LEVELS) {
    for (const bucket of MINUTE_BUCKETS_10) {
      rows.push(levelSummaryFormulaRow(level, bucket, rowIndex));
      rowIndex++;
    }
  }
  return rows;
}

function buildLevelSummary30Rows(dataStartRow: number): (string | number)[][] {
  const rows: (string | number)[][] = [];
  let rowIndex = dataStartRow;
  for (const level of DU_DOAN_LEVELS) {
    for (const bucket of MINUTE_BUCKETS_10) {
      rows.push(levelSummary30FormulaRow(level, bucket, rowIndex));
      rowIndex++;
    }
  }
  return rows;
}

export const LEVEL_SUMMARY_ROW_COUNT = DU_DOAN_LEVELS.length * MINUTE_BUCKETS_10.length;

export async function ensureGoalSummaryTab(): Promise<void> {
  if (ensuredSummaryTabPromise) return ensuredSummaryTabPromise;
  ensuredSummaryTabPromise = (async () => {
    const id = getSpreadsheetId();
    const tab = summaryTab();
    if (!(await sheetExists(tab))) {
      await createTab(tab);
    }
    const headerRange = sheetsQuoteRange(tab, 'A1:G1');
    const headerRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const hasHeader =
      headerRes?.values &&
      headerRes.values.length > 0 &&
      headerRes.values[0].length >= GOAL_SUMMARY_HEADER_COLUMNS.length;
    if (!hasHeader) {
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: headerRange,
            majorDimension: 'ROWS',
            values: [GOAL_SUMMARY_HEADER_COLUMNS.slice()],
          }),
        },
      );
    }

    const dataStartRow = 2;
    const dataEndRow = dataStartRow + MINUTE_BUCKETS_10.length - 1;
    const dataRange = sheetsQuoteRange(tab, `A${dataStartRow}:G${dataEndRow}`);
    const dataRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const existingRows = dataRes?.values?.length ?? 0;
    if (existingRows < MINUTE_BUCKETS_10.length) {
      const rows = MINUTE_BUCKETS_10.map((bucket, i) =>
        summaryFormulaRow(bucket, dataStartRow + i),
      );
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: dataRange,
            majorDimension: 'ROWS',
            values: rows,
          }),
        },
      );
      logger.info(`[sheets-goal] Seeded summary formulas in "${tab}"`);
    }
  })().catch((err) => {
    ensuredSummaryTabPromise = null;
    throw err;
  });
  return ensuredSummaryTabPromise;
}

export async function ensureGoalLevelSummaryTab(): Promise<void> {
  if (ensuredLevelSummaryTabPromise) return ensuredLevelSummaryTabPromise;
  ensuredLevelSummaryTabPromise = (async () => {
    const id = getSpreadsheetId();
    const tab = levelSummaryTab();
    if (!(await sheetExists(tab))) {
      await createTab(tab);
    }
    const headerRange = sheetsQuoteRange(tab, 'A1:H1');
    const headerRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const hasHeader =
      headerRes?.values &&
      headerRes.values.length > 0 &&
      headerRes.values[0].length >= GOAL_LEVEL_SUMMARY_HEADER_COLUMNS.length;
    if (!hasHeader) {
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: headerRange,
            majorDimension: 'ROWS',
            values: [GOAL_LEVEL_SUMMARY_HEADER_COLUMNS.slice()],
          }),
        },
      );
    }

    const dataStartRow = 2;
    const dataEndRow = dataStartRow + LEVEL_SUMMARY_ROW_COUNT - 1;
    const dataRange = sheetsQuoteRange(tab, `A${dataStartRow}:H${dataEndRow}`);
    const dataRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const existingRows = dataRes?.values?.length ?? 0;
    if (existingRows < LEVEL_SUMMARY_ROW_COUNT) {
      const rows = buildLevelSummaryRows(dataStartRow);
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: dataRange,
            majorDimension: 'ROWS',
            values: rows,
          }),
        },
      );
      logger.info(`[sheets-goal] Seeded level summary formulas in "${tab}"`);
    }
  })().catch((err) => {
    ensuredLevelSummaryTabPromise = null;
    throw err;
  });
  return ensuredLevelSummaryTabPromise;
}

export async function ensureGoalSummary30Tab(): Promise<void> {
  if (ensuredSummary30TabPromise) return ensuredSummary30TabPromise;
  ensuredSummary30TabPromise = (async () => {
    const id = getSpreadsheetId();
    const tab = summary30Tab();
    if (!(await sheetExists(tab))) {
      await createTab(tab);
    }
    const headerRange = sheetsQuoteRange(tab, 'A1:G1');
    const headerRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const hasHeader =
      headerRes?.values &&
      headerRes.values.length > 0 &&
      headerRes.values[0].length >= GOAL_SUMMARY_HEADER_COLUMNS.length;
    if (!hasHeader) {
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: headerRange,
            majorDimension: 'ROWS',
            values: [GOAL_SUMMARY_HEADER_COLUMNS.slice()],
          }),
        },
      );
    }

    const dataStartRow = 2;
    const dataEndRow = dataStartRow + MINUTE_BUCKETS_10.length - 1;
    const dataRange = sheetsQuoteRange(tab, `A${dataStartRow}:G${dataEndRow}`);
    const dataRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const existingRows = dataRes?.values?.length ?? 0;
    if (existingRows < MINUTE_BUCKETS_10.length) {
      const rows = MINUTE_BUCKETS_10.map((bucket, i) =>
        summary30FormulaRow(bucket, dataStartRow + i),
      );
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: dataRange,
            majorDimension: 'ROWS',
            values: rows,
          }),
        },
      );
      logger.info(`[sheets-goal] Seeded summary30 formulas in "${tab}"`);
    }
  })().catch((err) => {
    ensuredSummary30TabPromise = null;
    throw err;
  });
  return ensuredSummary30TabPromise;
}

export async function ensureGoalLevelSummary30Tab(): Promise<void> {
  if (ensuredLevelSummary30TabPromise) return ensuredLevelSummary30TabPromise;
  ensuredLevelSummary30TabPromise = (async () => {
    const id = getSpreadsheetId();
    const tab = levelSummary30Tab();
    if (!(await sheetExists(tab))) {
      await createTab(tab);
    }
    const headerRange = sheetsQuoteRange(tab, 'A1:H1');
    const headerRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const hasHeader =
      headerRes?.values &&
      headerRes.values.length > 0 &&
      headerRes.values[0].length >= GOAL_LEVEL_SUMMARY_30_HEADER_COLUMNS.length;
    if (!hasHeader) {
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: headerRange,
            majorDimension: 'ROWS',
            values: [GOAL_LEVEL_SUMMARY_30_HEADER_COLUMNS.slice()],
          }),
        },
      );
    }

    const dataStartRow = 2;
    const dataEndRow = dataStartRow + LEVEL_SUMMARY_ROW_COUNT - 1;
    const dataRange = sheetsQuoteRange(tab, `A${dataStartRow}:H${dataEndRow}`);
    const dataRes = (await sheetsAuthedFetch(
      `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}`,
      { method: 'GET' },
    )) as { values?: string[][] } | null;
    const existingRows = dataRes?.values?.length ?? 0;
    if (existingRows < LEVEL_SUMMARY_ROW_COUNT) {
      const rows = buildLevelSummary30Rows(dataStartRow);
      await sheetsAuthedFetch(
        `${SHEETS_API}/${id}/values/${encodeURIComponent(dataRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: dataRange,
            majorDimension: 'ROWS',
            values: rows,
          }),
        },
      );
      logger.info(`[sheets-goal] Seeded level summary30 formulas in "${tab}"`);
    }
  })().catch((err) => {
    ensuredLevelSummary30TabPromise = null;
    throw err;
  });
  return ensuredLevelSummary30TabPromise;
}

export async function findRowByPredictionId(predictionId: string): Promise<number> {
  await ensureGoalTabAndHeader();
  const id = getSpreadsheetId();
  const tab = goalTab();
  const range = sheetsQuoteRange(tab, 'A:A');
  const json = (await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?majorDimension=COLUMNS`,
    { method: 'GET' },
  )) as { values?: string[][] } | null;
  const col = json?.values?.[0] || [];
  for (let i = 1; i < col.length; i++) {
    if (col[i] === predictionId) return i + 1;
  }
  return -1;
}

/** Tránh race khi server + client gọi append cùng predictionId đồng thời. */
const appendInFlight = new Map<string, Promise<{ rowIndex: number; deduped: boolean }>>();

async function appendGoalPredictionRowOnce(
  entry: GoalPredictionRow,
): Promise<{ rowIndex: number; deduped: boolean }> {
  await ensureGoalTabAndHeader();
  void ensureGoalSummaryTab().catch((err) => {
    logger.warn('[sheets-goal] ensureGoalSummaryTab failed:', err);
  });
  void ensureGoalLevelSummaryTab().catch((err) => {
    logger.warn('[sheets-goal] ensureGoalLevelSummaryTab failed:', err);
  });
  void ensureGoalSummary30Tab().catch((err) => {
    logger.warn('[sheets-goal] ensureGoalSummary30Tab failed:', err);
  });
  void ensureGoalLevelSummary30Tab().catch((err) => {
    logger.warn('[sheets-goal] ensureGoalLevelSummary30Tab failed:', err);
  });

  const existing = await findRowByPredictionId(entry.predictionId);
  if (existing > 0) {
    return { rowIndex: existing, deduped: true };
  }

  const id = getSpreadsheetId();
  const tab = goalTab();
  const range = sheetsQuoteRange(tab, 'A:AA');
  const json = (await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&includeValuesInResponse=false`,
    {
      method: 'POST',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowFromGoalEntry(entry)],
      }),
    },
  )) as { updates?: { updatedRange?: string } } | null;

  let rowIndex = 0;
  const m = json?.updates?.updatedRange?.match(/!.*?(\d+):/);
  if (m) rowIndex = parseInt(m[1], 10);
  return { rowIndex, deduped: false };
}

export async function appendGoalPredictionRow(
  entry: GoalPredictionRow,
): Promise<{ rowIndex: number; deduped: boolean }> {
  const key = entry.predictionId.trim();
  const pending = appendInFlight.get(key);
  if (pending) return pending;

  const promise = appendGoalPredictionRowOnce(entry).finally(() => {
    appendInFlight.delete(key);
  });
  appendInFlight.set(key, promise);
  return promise;
}

export async function updateGoalPredictionVerdict(
  predictionId: string,
  update: GoalPredictionVerdictUpdate,
): Promise<boolean> {
  const row = await findRowByPredictionId(predictionId);
  if (row <= 0) return false;
  const id = getSpreadsheetId();
  const tab = goalTab();
  // M: du_doan_15, N: ket_qua_15, O: chinh_xac_15, P: verdict_auto, Q: verdict_at_gmt7
  const range = sheetsQuoteRange(tab, `M${row}:Q${row}`);
  await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[
          update.duDoan15,
          update.ketQua15,
          update.chinhXac15,
          update.verdictAuto ? 'true' : 'false',
          update.verdictAtGmt7,
        ]],
      }),
    },
  );
  return true;
}

export async function updateGoalPrediction30Verdict(
  predictionId: string,
  update: GoalPrediction30VerdictUpdate,
): Promise<boolean> {
  const row = await findRowByPredictionId(predictionId);
  if (row <= 0) return false;
  const id = getSpreadsheetId();
  const tab = goalTab();
  // V: du_doan_30, W: ket_qua_30, X: chinh_xac_30, Y: verdict_auto_30, Z: verdict_at_gmt7_30
  const range = sheetsQuoteRange(tab, `V${row}:Z${row}`);
  await sheetsAuthedFetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[
          update.duDoan30,
          update.ketQua30,
          update.chinhXac30,
          update.verdictAuto ? 'true' : 'false',
          update.verdictAtGmt7,
        ]],
      }),
    },
  );
  return true;
}
