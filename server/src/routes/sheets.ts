/**
 * Routes cho Google Sheets bet logging.
 *
 *   POST   /api/sheets/bet                  → ghi 1 dòng "vào kèo".
 *   PATCH  /api/sheets/bet/:betId/result    → cập nhật ket_qua + lai_lo cho dòng đó.
 *   POST   /api/sheets/goal-prediction      → ghi 1 dòng dự đoán bàn thắng.
 *   PATCH  /api/sheets/goal-prediction/:predictionId/verdict → cập nhật kết quả 15p.
 *   GET    /api/sheets/health               → ping config.
 *
 * Server tự generate `bet_id` nếu client không gửi (đảm bảo idempotent: client
 * có thể cache uuid và retry an toàn — ta sẽ không append trùng nếu có sẵn dòng
 * cùng bet_id ở cột A).
 */
import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import {
  formatGmt7,
  updateBetResult,
} from '../services/google-sheets.js';
import { logBetEntry, type BetLogPayload } from '../services/bet-logger.js';
import {
  appendGoalPredictionRow,
  deriveChinhXac,
  deriveDuDoan15,
  minuteBucket10,
  updateGoalPredictionVerdict,
  updateGoalPrediction30Verdict,
  type DuDoan15,
  type GoalPredictionRow,
} from '../services/goal-prediction-sheets.js';
import { calculatePnL, isBetResult, type BetResult } from '../services/pnl.js';
import { logger } from '../index.js';

function sheetsDisabled(res: Response): boolean {
  if (!config.features.sheetsLogging) {
    res.status(503).json({ success: false, error: 'Sheets logging disabled' });
    return true;
  }
  if (!config.googleSheets.enabled) {
    res.status(503).json({ success: false, error: 'Google Sheets chưa cấu hình' });
    return true;
  }
  return false;
}

function isKetQua15(v: unknown): v is 'yes' | 'no' {
  return v === 'yes' || v === 'no';
}

export function createSheetsRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response): void => {
    const gs = config.googleSheets;
    const enabled = gs.enabled && config.features.sheetsLogging;

    const missing: string[] = [];
    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()) {
      missing.push('GOOGLE_SHEETS_SPREADSHEET_ID');
    }
    const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim();
    const hasEmailKey =
      !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
    if (!hasJson && !hasEmailKey) {
      missing.push('GOOGLE_SERVICE_ACCOUNT_JSON_PATH hoặc GOOGLE_SERVICE_ACCOUNT_EMAIL+PRIVATE_KEY');
    }
    if (process.env.FEATURE_SHEETS_LOGGING === 'false') {
      missing.push('FEATURE_SHEETS_LOGGING=false');
    }

    res.json({
      success: true,
      enabled,
      spreadsheetId: gs.spreadsheetId ? `${gs.spreadsheetId.slice(0, 6)}…` : '',
      tab: gs.tabName,
      goalTab: gs.goalTabName,
      goalSummaryTab: gs.goalSummaryTabName,
      goalLevelSummaryTab: gs.goalLevelSummaryTabName,
      ...(!enabled && missing.length > 0 ? { hint: `Chưa đủ env: ${missing.join('; ')}` } : {}),
    });
  });

  router.post('/goal-prediction', async (req: Request, res: Response): Promise<void> => {
    if (sheetsDisabled(res)) return;

    const body = req.body as Record<string, unknown>;
    const predictionId = String(body.predictionId ?? '').trim();
    if (!predictionId) {
      res.status(400).json({ success: false, error: 'Thiếu predictionId' });
      return;
    }
    const phut = Number(body.phut);
    const hieu = Number(body.hieu);
    if (!Number.isFinite(phut) || phut < 0) {
      res.status(400).json({ success: false, error: 'phut không hợp lệ' });
      return;
    }
    if (hieu !== 1 && hieu !== 2) {
      res.status(400).json({ success: false, error: 'hieu phải là 1 hoặc 2' });
      return;
    }
    const prob15Raw = body.prob15Pct ?? body.prob15;
    const prob15Pct = Number(prob15Raw);
    if (!Number.isFinite(prob15Pct) || prob15Pct < 0 || prob15Pct > 100) {
      res.status(400).json({ success: false, error: 'prob15Pct không hợp lệ (0–100)' });
      return;
    }
    const prob5Raw = body.prob5Pct ?? body.prob5;
    const prob5Pct =
      prob5Raw === undefined || prob5Raw === null || prob5Raw === ''
        ? ''
        : Number(prob5Raw);
    if (prob5Pct !== '' && (!Number.isFinite(prob5Pct) || prob5Pct < 0 || prob5Pct > 100)) {
      res.status(400).json({ success: false, error: 'prob5Pct không hợp lệ (0–100)' });
      return;
    }
    const prob30Raw = body.prob30Pct ?? body.prob30;
    const prob30Pct =
      prob30Raw === undefined || prob30Raw === null || prob30Raw === ''
        ? ''
        : Number(prob30Raw);
    if (prob30Pct !== '' && (!Number.isFinite(prob30Pct) || prob30Pct < 0 || prob30Pct > 100)) {
      res.status(400).json({ success: false, error: 'prob30Pct không hợp lệ (0–100)' });
      return;
    }

    const entry: GoalPredictionRow = {
      predictionId,
      timestampGmt7: String(body.timestampGmt7 ?? formatGmt7()),
      matchId: String(body.matchId ?? ''),
      giaiDau: String(body.giaiDau ?? ''),
      doiNha: String(body.doiNha ?? ''),
      doiKhach: String(body.doiKhach ?? ''),
      hieu: hieu as 1 | 2,
      phut,
      khoang10: String(body.khoang10 ?? minuteBucket10(phut)),
      tySoLucDuDoan: String(body.tySoLucDuDoan ?? 'N/A'),
      prob15Pct,
      prob5Pct,
      duDoan15: deriveDuDoan15(prob15Pct / 100),
      model15: String(body.model15 ?? ''),
      onnxMs: body.onnxMs === undefined || body.onnxMs === null || body.onnxMs === ''
        ? ''
        : Number(body.onnxMs),
      reasonHeuristic: String(body.reasonHeuristic ?? '').slice(0, 500),
      prob30Pct,
      duDoan30: prob30Pct === '' ? '' : deriveDuDoan15(prob30Pct / 100),
      model30: String(body.model30 ?? ''),
    };

    try {
      const { rowIndex, deduped } = await appendGoalPredictionRow(entry);
      logger.info(`[sheets-goal] Appended ${predictionId} row=${rowIndex}${deduped ? ' (dedup)' : ''}`);
      res.json({ success: true, predictionId, rowIndex, ...(deduped ? { deduped: true } : {}) });
    } catch (err) {
      logger.error('[sheets-goal] append failed:', err);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  router.patch('/goal-prediction/:predictionId/verdict', async (req: Request, res: Response): Promise<void> => {
    if (sheetsDisabled(res)) return;

    const predictionId = String(req.params.predictionId || '').trim();
    if (!predictionId) {
      res.status(400).json({ success: false, error: 'Thiếu predictionId' });
      return;
    }
    const body = req.body as {
      window?: number | string;
      ketQua15?: string;
      ketQua30?: string;
      verdictAuto?: boolean;
      prob15Pct?: number;
      prob30Pct?: number;
      duDoan15?: string;
      duDoan30?: string;
    };

    const window30 = Number(body.window) === 30;
    const verdictAtGmt7 = formatGmt7();

    if (window30) {
      const ketQua30 = body.ketQua30 ?? body.ketQua15;
      if (!isKetQua15(ketQua30)) {
        res.status(400).json({ success: false, error: 'ketQua30 phải là yes hoặc no' });
        return;
      }
      const prob30Pct = body.prob30Pct;
      let duDoan30: DuDoan15 | undefined =
        body.duDoan30 === 'cao' || body.duDoan30 === 'thap' ? body.duDoan30 : undefined;
      if (!duDoan30 && Number.isFinite(prob30Pct)) {
        duDoan30 = deriveDuDoan15((prob30Pct as number) / 100);
      }
      if (!duDoan30) {
        res.status(400).json({ success: false, error: 'Cần duDoan30 hoặc prob30Pct để tính chính xác' });
        return;
      }
      const chinhXac30 = deriveChinhXac(duDoan30, ketQua30);
      try {
        const updated = await updateGoalPrediction30Verdict(predictionId, {
          ketQua30,
          verdictAuto: body.verdictAuto === true,
          verdictAtGmt7,
          duDoan30,
          chinhXac30,
        });
        if (!updated) {
          res.status(404).json({
            success: false,
            error: `Không tìm thấy dòng cho predictionId=${predictionId} trên sheet.`,
          });
          return;
        }
        logger.info(`[sheets-goal] Verdict30 ${predictionId} = ${ketQua30} (${chinhXac30})`);
        res.json({ success: true, predictionId, ketQua30, chinhXac30, duDoan30 });
      } catch (err) {
        logger.error('[sheets-goal] verdict30 update failed:', err);
        res.status(500).json({ success: false, error: (err as Error).message });
      }
      return;
    }

    if (!isKetQua15(body.ketQua15)) {
      res.status(400).json({ success: false, error: 'ketQua15 phải là yes hoặc no' });
      return;
    }
    const prob15Pct = body.prob15Pct;
    let duDoan15: DuDoan15 | undefined =
      body.duDoan15 === 'cao' || body.duDoan15 === 'thap' ? body.duDoan15 : undefined;
    if (!duDoan15 && Number.isFinite(prob15Pct)) {
      duDoan15 = deriveDuDoan15((prob15Pct as number) / 100);
    }
    if (!duDoan15) {
      res.status(400).json({ success: false, error: 'Cần duDoan15 hoặc prob15Pct để tính chính xác' });
      return;
    }

    const chinhXac15 = deriveChinhXac(duDoan15, body.ketQua15);

    try {
      const updated = await updateGoalPredictionVerdict(predictionId, {
        ketQua15: body.ketQua15,
        verdictAuto: body.verdictAuto === true,
        verdictAtGmt7,
        duDoan15,
        chinhXac15,
      });
      if (!updated) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy dòng cho predictionId=${predictionId} trên sheet.`,
        });
        return;
      }
      logger.info(`[sheets-goal] Verdict ${predictionId} = ${body.ketQua15} (${chinhXac15})`);
      res.json({
        success: true,
        predictionId,
        ketQua15: body.ketQua15,
        chinhXac15,
        duDoan15,
      });
    } catch (err) {
      logger.error('[sheets-goal] verdict update failed:', err);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  router.post('/bet', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Partial<BetLogPayload>;
    const payload: BetLogPayload = {
      betId: body.betId,
      giaiDau: String(body.giaiDau ?? ''),
      doiNha: String(body.doiNha ?? ''),
      doiKhach: String(body.doiKhach ?? ''),
      tySoLucVaoKeo: body.tySoLucVaoKeo,
      keoVao: String(body.keoVao ?? ''),
      phut: body.phut,
      tyLeAn: body.tyLeAn,
      soTienCuoc: Number(body.soTienCuoc),
      note: body.note,
      timestampGmt7: body.timestampGmt7,
    };

    const result = await logBetEntry(payload);
    if (!result.ok) {
      const status = result.code === 'disabled' ? 503 : result.code === 'invalid' ? 400 : 500;
      res.status(status).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      betId: result.betId,
      rowIndex: result.rowIndex,
      ...(result.deduped ? { deduped: true } : {}),
    });
  });

  router.patch('/bet/:betId/result', async (req: Request, res: Response): Promise<void> => {
    if (sheetsDisabled(res)) return;

    const betId = String(req.params.betId || '').trim();
    if (!betId) {
      res.status(400).json({ success: false, error: 'Thiếu betId' });
      return;
    }
    const body = req.body as { ketQua?: string; soTienCuoc?: number; tyLeAn?: number };
    if (!isBetResult(body.ketQua)) {
      res
        .status(400)
        .json({ success: false, error: 'ketQua không hợp lệ (won/lost/push/won_half/lost_half)' });
      return;
    }
    const stake = Number(body.soTienCuoc);
    const odds = Number(body.tyLeAn);
    if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(odds) || odds <= 0) {
      res
        .status(400)
        .json({ success: false, error: 'soTienCuoc / tyLeAn không hợp lệ' });
      return;
    }
    const result = body.ketQua as BetResult;
    const pnl = calculatePnL(stake, odds, result);

    try {
      const updated = await updateBetResult(betId, {
        ketQua: result,
        laiLo: pnl,
        resultAtGmt7: formatGmt7(),
      });
      if (!updated) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy dòng cho betId=${betId} trên sheet.`, pnl });
        return;
      }
      logger.info(`[sheets] Updated result ${betId} = ${result} (P&L ${pnl})`);
      res.json({ success: true, betId, ketQua: result, laiLo: pnl });
    } catch (err) {
      logger.error('[sheets] update failed:', err);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  return router;
}
