/**
 * CLI: đọc tất cả `History/match_*.md`, parse → tính features → ghi JSONL + meta
 * cho 2 cửa sổ nhãn (15' và 5'). Run: `npm run extract-goal-data`.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMatchFile, type ParsedMatch } from '../goal-predict/md-parser.js';
import {
    buildFeatureRows,
    FEATURE_NAMES,
    GOAL_WINDOW_MIN,
    GOAL_WINDOW_MIN_SHORT,
    GOAL_WINDOW_MIN_LONG,
    type FeatureRow,
} from '../goal-predict/feature-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../../');
const HISTORY_DIR = path.resolve(REPO_ROOT, 'History');
const DATA_DIR = path.resolve(REPO_ROOT, 'data');

interface PerMatchSummary {
    file: string;
    matchId: string;
    rows: number;
    positives: number;
    ftStatus: string;
}

interface WindowSummary {
    totalFiles: number;
    parsed: number;
    failed: number;
    totalRows: number;
    positiveRows: number;
    perMatch: PerMatchSummary[];
}

async function emitDataset(opts: {
    windowMin: number;
    parsedMatches: Array<{ file: string; parsed: ParsedMatch }>;
    failedCount: number;
    totalFiles: number;
    jsonlName: string;
    metaName: string;
}): Promise<void> {
    const allRows: FeatureRow[] = [];
    const summary: WindowSummary = {
        totalFiles: opts.totalFiles,
        parsed: opts.parsedMatches.length,
        failed: opts.failedCount,
        totalRows: 0,
        positiveRows: 0,
        perMatch: [],
    };

    for (const { file, parsed } of opts.parsedMatches) {
        const rows = buildFeatureRows(parsed, opts.windowMin);
        const positives = rows.filter((r) => r.goal_within_window === 1).length;
        allRows.push(...rows);
        summary.perMatch.push({
            file,
            matchId: parsed.meta.matchId,
            rows: rows.length,
            positives,
            ftStatus: parsed.meta.ftStatus,
        });
    }

    summary.totalRows = allRows.length;
    summary.positiveRows = allRows.filter((r) => r.goal_within_window === 1).length;

    const outJsonl = path.join(DATA_DIR, opts.jsonlName);
    await fs.writeFile(outJsonl, allRows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

    const meta = {
        generatedAt: new Date().toISOString(),
        featureNames: FEATURE_NAMES,
        goalWindowMin: opts.windowMin,
        labelColumn: 'goal_within_window',
        ...summary,
    };
    const outMeta = path.join(DATA_DIR, opts.metaName);
    await fs.writeFile(outMeta, JSON.stringify(meta, null, 2), 'utf8');

    const posPct = summary.totalRows
        ? ((summary.positiveRows / summary.totalRows) * 100).toFixed(2)
        : '0';
    console.log(`\n[extract:${opts.windowMin}p] ===== TÓM TẮT =====`);
    console.log(`  Files parsed:    ${summary.parsed}/${summary.totalFiles}`);
    console.log(`  Files failed:    ${summary.failed}`);
    console.log(`  Total rows:      ${summary.totalRows}`);
    console.log(`  Positive rows:   ${summary.positiveRows} (${posPct}%)`);
    console.log(`  Dataset:         ${outJsonl}`);
    console.log(`  Meta:            ${outMeta}`);
}

async function main() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const allFiles = await fs.readdir(HISTORY_DIR);
    const mdFiles = allFiles.filter((f) => f.startsWith('match_') && f.endsWith('.md'));
    if (mdFiles.length === 0) {
        console.error(`[extract] Không tìm thấy file match_*.md trong ${HISTORY_DIR}`);
        process.exit(1);
    }

    console.log(
        `[extract] Tìm thấy ${mdFiles.length} file. Bắt đầu parse... (windows=${GOAL_WINDOW_MIN}p & ${GOAL_WINDOW_MIN_SHORT}p & ${GOAL_WINDOW_MIN_LONG}p)`,
    );

    const byMatchId = new Map<string, { file: string; parsed: ParsedMatch }>();
    let failedCount = 0;
    let incompleteCount = 0;
    let dupCount = 0;

    for (const file of mdFiles) {
        try {
            const content = await fs.readFile(path.join(HISTORY_DIR, file), 'utf8');
            const parsed = parseMatchFile(content);
            if (!parsed.meta.matchId) {
                console.warn(`[extract] ${file}: không parse được matchId, skip`);
                failedCount++;
                continue;
            }
            if (parsed.stats.length === 0) {
                console.warn(`[extract] ${file}: stats rỗng, skip`);
                failedCount++;
                continue;
            }
            // Loại trận chưa đá xong (ftStatus "29'", "45'"...) — diễn biến bất thường gây nhiễu label.
            const ft = parsed.meta.ftStatus.trim();
            if (ft !== 'FT' && !/^9\d/.test(ft)) {
                console.warn(`[extract] ${file}: trận chưa kết thúc (ftStatus="${ft}"), skip`);
                incompleteCount++;
                continue;
            }
            // Dedupe theo matchId — nhiều snapshot của cùng trận thì giữ file mới nhất
            // (tên file có suffix _YYYYMMDD-HHMM nên so sánh chuỗi là đủ).
            const existing = byMatchId.get(parsed.meta.matchId);
            if (existing) {
                dupCount++;
                if (file <= existing.file) continue;
            }
            byMatchId.set(parsed.meta.matchId, { file, parsed });
        } catch (e) {
            console.warn(`[extract] ${file}: lỗi parse - ${(e as Error).message}`);
            failedCount++;
        }
    }

    const parsedMatches = [...byMatchId.values()];
    console.log(
        `[extract] Giữ ${parsedMatches.length} trận (loại ${incompleteCount} chưa kết thúc, ${dupCount} file trùng matchId, ${failedCount} lỗi parse)`,
    );

    await emitDataset({
        windowMin: GOAL_WINDOW_MIN,
        parsedMatches,
        failedCount,
        totalFiles: mdFiles.length,
        jsonlName: 'goal-dataset.jsonl',
        metaName: 'goal-dataset-meta.json',
    });

    await emitDataset({
        windowMin: GOAL_WINDOW_MIN_SHORT,
        parsedMatches,
        failedCount,
        totalFiles: mdFiles.length,
        jsonlName: 'goal-dataset-5min.jsonl',
        metaName: 'goal-dataset-5min-meta.json',
    });

    await emitDataset({
        windowMin: GOAL_WINDOW_MIN_LONG,
        parsedMatches,
        failedCount,
        totalFiles: mdFiles.length,
        jsonlName: 'goal-dataset-30min.jsonl',
        metaName: 'goal-dataset-30min-meta.json',
    });
}

main().catch((e) => {
    console.error('[extract] FATAL:', e);
    process.exit(1);
});
