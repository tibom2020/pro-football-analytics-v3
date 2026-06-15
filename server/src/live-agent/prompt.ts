import type { AgentLLMContext } from './types.js';
import type { FlowBetType } from '../telegram/bet-flow.js';

const SYSTEM = `Bạn là trợ lý quyết định vào kèo bóng đá LIVE (một user, mục đích ghi nhận PAPER).
Chỉ trả về MỘT JSON hợp lệ, không markdown, không giải thích ngoài JSON.
Schema bắt buộc:
{"action":"skip"|"bet","betType":"over"|"under"|"home"|"away"|null,"reasonVi":"chuỗi tiếng Việt ngắn ≤ 320 ký tự"}
Quy tắc:
- Nếu không chắc hoặc dữ liệu không đủ → action "skip", betType null.
- Nếu action "bet": betType bắt buộc là một trong các loại được liệt kê trong constraints; reasonVi phải nêu rõ tín hiệu (vd: alert kèo, động thái line).
- Không bịa số odds; bạn chỉ chọn hướng cược, hệ thống sẽ lấy giá từ snapshot.
- TRỌNG SỐ ƯU TIÊN CAO NHẤT: nếu chuông báo động + cường độ giảm giá xuất hiện liên tục trong khung 10 phút thì coi là tín hiệu mạnh dự báo sắp có bàn thắng; ưu tiên quyết định theo tín hiệu này (trừ khi dữ liệu mâu thuẫn rất rõ).
- Nếu có khối [YÊU CẦU CỤ THỂ TỪ NGƯỜI DÙNG] ở đầu prompt → ưu tiên trả lời/đánh giá theo yêu cầu đó. Vẫn dùng schema JSON, betType phải nằm trong allowedBetTypes; reasonVi phải bám sát câu hỏi của người dùng và dữ liệu thực tế.`;

export function buildUserPrompt(ctx: AgentLLMContext): string {
  const {
    snapshot,
    recentAlerts,
    oddsHistoryTail,
    constraints,
    telegramPressureBell,
    telegramOuDrop,
    telegramPerTeamApiLines,
    telegramStatsLines,
    telegramTraditionalFactorsLines,
    userPrompt,
    goalProb15,
    goalProb5,
    similarMatches,
    goalTopFeatures,
    goalFeatureQuality,
  } = ctx;
  const lines: string[] = [];

  const trimmedPrompt = userPrompt?.trim();
  if (trimmedPrompt) {
    lines.push('[YÊU CẦU CỤ THỂ TỪ NGƯỜI DÙNG]');
    lines.push(trimmedPrompt.slice(0, 600));
    lines.push('');
    lines.push('→ Ưu tiên trả lời/đánh giá theo yêu cầu trên. Vẫn giữ schema JSON, betType phải hợp lệ.');
    lines.push('');
  }

  lines.push(
    `Nguồn: ${ctx.providerLabel}`,
    `Trận: ${ctx.matchName} (${ctx.matchId})`,
    ctx.leagueName ? `Giải: ${ctx.leagueName}` : '',
    `Snapshot phút ${snapshot.minute}, tỷ số: ${snapshot.score ?? 'N/A'}`,
    `OU line: ${snapshot.handicap}, Tài odds: ${snapshot.overOdds ?? 'N/A'}, Xỉu odds: ${snapshot.underOdds ?? 'N/A'}`,
    `Chấp(AH) line: ${snapshot.handicapAH ?? 'N/A'}, Chủ: ${snapshot.homeOdds ?? 'N/A'}, Khách: ${snapshot.awayOdds ?? 'N/A'}`,
    '',
    `Constraints: executionMode=${constraints.executionMode}, stakeVnd=${constraints.stakeVnd}, ordersThisMatch=${constraints.ordersAlready}/${constraints.maxOrdersPerMatch}`,
    `allowedBetTypes: ${constraints.allowedBetTypes.join(', ')}`,
    '',
    'Ưu tiên quyết định (theo thứ tự):',
    '1) Chuông báo động + cường độ giảm giá lặp liên tục trong 10 phút => xác suất sắp có bàn tăng mạnh.',
    '2) Cùng chiều với DA (tấn công nguy hiểm) + sút trúng đích + momentum/shot-cluster.',
    '3) Nếu tín hiệu bàn thắng mạnh, ưu tiên cửa Tài/Over khi odds hợp lệ; nếu mâu thuẫn rõ thì giảm tự tin hoặc skip.',
    '',
  );

  if (telegramPressureBell || telegramOuDrop) {
    lines.push('Ngữ cảnh từ app (nếu có):');
    if (telegramPressureBell) lines.push(`- Chuông áp lực (phút): ${telegramPressureBell}`);
    if (telegramOuDrop) lines.push(`- Cường độ giảm OU (phút): ${telegramOuDrop}`);
    lines.push('');
  }

  if ((telegramPerTeamApiLines?.length ?? 0) > 0) {
    lines.push('Bảng thống kê trực tiếp theo đội (API):');
    for (const line of telegramPerTeamApiLines!.slice(0, 8)) {
      lines.push(`- ${line}`);
    }
    lines.push('');
  }

  if ((telegramStatsLines?.length ?? 0) > 0) {
    lines.push('Bảng thống kê trực tiếp tổng hợp (ưu tiên DA + sút trúng đích):');
    for (const line of telegramStatsLines!.slice(0, 8)) {
      lines.push(`- ${line}`);
    }
    lines.push('');
  }

  if ((telegramTraditionalFactorsLines?.length ?? 0) > 0) {
    lines.push('Các yếu tố truyền thống (momentum/shot-cluster/market-pressure/staleness):');
    for (const line of telegramTraditionalFactorsLines!.slice(0, 8)) {
      lines.push(`- ${line}`);
    }
    lines.push('');
  }

  if (
    typeof goalProb15 === 'number' ||
    typeof goalProb5 === 'number' ||
    (similarMatches?.length ?? 0) > 0
  ) {
    lines.push('Goal Model/RAG (train-goal-model 15min + train-goal-model-5min):');
    lines.push(`- Feature quality: ${goalFeatureQuality ?? 'unknown'} (live server dựng từ odds history + stats text nếu có)`);
    if (typeof goalProb15 === 'number') lines.push(`- Xác suất có bàn trong 15 phút tới: ${(goalProb15 * 100).toFixed(1)}%`);
    if (typeof goalProb5 === 'number') lines.push(`- Xác suất có bàn trong 5 phút tới: ${(goalProb5 * 100).toFixed(1)}%`);
    if ((goalTopFeatures?.length ?? 0) > 0) {
      lines.push(`- Top feature 15': ${goalTopFeatures!.map((f) => `${f.name}=${f.value.toFixed(2)}`).join(', ')}`);
    }
    if ((similarMatches?.length ?? 0) > 0) {
      lines.push('- Trận/tình huống lịch sử tương tự:');
      for (const s of similarMatches!.slice(0, 5)) {
        lines.push(`  ${s.matchId} H${s.half} p${s.minute}: ${s.label === 1 ? 'có bàn' : 'không bàn'} trong cửa sổ, sim=${s.similarity.toFixed(3)}`);
      }
    }
    lines.push('- Cách dùng: coi đây là tín hiệu định lượng hỗ trợ. Nếu mâu thuẫn mạnh với odds/DA/live alert thì giảm confidence hoặc skip.');
    lines.push('');
  }

  if (recentAlerts.length > 0) {
    lines.push('Cảnh báo kèo gần đây (OddsMonitor):');
    for (const a of recentAlerts.slice(-8)) {
      lines.push(
        `- [${a.alertType}] phút ${a.minute}: ${a.message} (Δ ${(a.changePercent * 100).toFixed(1)}%)`,
      );
    }
    lines.push('');
  }

  if (oddsHistoryTail.length > 1) {
    lines.push(`Lịch sử snapshot gần nhất (${oddsHistoryTail.length} điểm, phút cuối):`);
    const tail = oddsHistoryTail.slice(-12);
    for (const s of tail) {
      lines.push(
        `  phút ${s.minute}: OU ${s.handicap} | T${s.overOdds ?? '-'} X${s.underOdds ?? '-'} | AH ${s.handicapAH ?? '-'} H${s.homeOdds ?? '-'} A${s.awayOdds ?? '-'}`,
      );
    }
    lines.push('');
  }

  lines.push('Trả về chỉ JSON theo schema SYSTEM.');
  return lines.filter(Boolean).join('\n');
}

export function buildMessagesForChat(_ctx: AgentLLMContext, userContent: string): { role: 'system' | 'user'; content: string }[] {
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userContent },
  ];
}

/** Ràng buộc sau parse — LLM có thể trả betType không khả dụng trên snapshot. */
export function snapshotHasOddsForBetType(
  betType: FlowBetType,
  s: { overOdds?: number; underOdds?: number; homeOdds?: number; awayOdds?: number },
): boolean {
  switch (betType) {
    case 'over':
      return typeof s.overOdds === 'number' && Number.isFinite(s.overOdds);
    case 'under':
      return typeof s.underOdds === 'number' && Number.isFinite(s.underOdds);
    case 'home':
      return typeof s.homeOdds === 'number' && Number.isFinite(s.homeOdds);
    case 'away':
      return typeof s.awayOdds === 'number' && Number.isFinite(s.awayOdds);
    default:
      return false;
  }
}
