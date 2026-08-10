#!/usr/bin/env node
/**
 * CLI: sinh lại report.md từ file thô (không gọi API).
 *
 *   npm run report -- --match 10577229
 *   npm run report -- --all --since 2026-08-01
 */
import '../load-env.js';
import { config } from '../config.js';
import { generateReportForMatchId, generateReportsAll } from '../match-v2/generate-report.js';
import { resolveV2Root } from '../match-v2/paths.js';

function printHelp(): void {
  console.log(`Usage:
  npm run report -- --match <matchId>
  npm run report -- --all [--since YYYY-MM-DD]

Options:
  --match <id>     Sinh report cho một trận
  --all            Sinh report cho mọi trận trong data/v2
  --since <day>    Chỉ các thư mục ngày UTC >= day (dùng với --all)
  --root <path>    Override MATCH_V2_DATA_DIR
  -h, --help       Help
`);
}

function parseArgs(argv: string[]) {
  const out: { match?: string; all?: boolean; since?: string; root?: string; help?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--match') out.match = argv[++i];
    else if (a === '--all') out.all = true;
    else if (a === '--since') out.since = argv[++i];
    else if (a === '--root') out.root = argv[++i];
    else if (a === '-h' || a === '--help') out.help = true;
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.match && !args.all)) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const root = resolveV2Root(args.root ?? config.matchV2.dataDir);
  console.log(`[report] root=${root}`);

  if (args.match) {
    const r = await generateReportForMatchId(args.match, root);
    console.log(`[report] wrote ${r.reportPath}`);
    return;
  }

  const results = await generateReportsAll({ v2Root: root, since: args.since });
  if (results.length === 0) {
    console.log('[report] không có trận nào');
    return;
  }
  for (const r of results) {
    console.log(`[report] ${r.matchId} → ${r.reportPath}`);
  }
  console.log(`[report] done: ${results.length} trận`);
}

main().catch((err) => {
  console.error(`[report] failed: ${(err as Error).message}`);
  process.exit(1);
});
