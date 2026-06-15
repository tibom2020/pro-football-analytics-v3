import '../load-env.js';
import { callDeepSeekReason } from '../goal-predict/deepseek-reason.js';
import { normalizeReason } from '../goal-predict/reason-normalize.js';
import { config } from '../config.js';

const prodSystem = [
    'Bạn là BLV bóng đá Việt.',
    'NGÔN NGỮ: TIẾNG VIỆT có dấu.',
    'Nhiệm vụ: goalProb30Pct (0-100) + reasonVi (1-2 câu, KHÔNG ghi % trong reasonVi).',
    'CHỈ trả json đúng schema: {"goalProb30Pct": 55, "reasonVi": "..."}',
    'reasonVi BẮT BUỘC không được rỗng.',
].join('\n');

const prodUser = [
    '# Trận đang xem',
    '- Hiệp 1, phút 67; tổng số bàn đã ghi: 2',
    '- Vạch T/X 3.25 · chấp -0.75',
    '# Diễn biến 3 phút',
    '- Bóng nguy hiểm tổng 5, trúng đích +2',
    '# Kèo 5 phút',
    '- Tài bị kéo 2 lần',
    '# 5 trận tương tự — 4/5 có bàn trong 30p sau',
    'Trả json: {"goalProb30Pct": <int>, "reasonVi": "..."}',
].join('\n');

console.log('model:', config.goalPredict.deepseekModel);

for (let i = 0; i < 3; i++) {
    const r = await callDeepSeekReason({ system: prodSystem, user: prodUser, json: true });
    const norm = normalizeReason(
        r.text,
        r.error,
        r.durationMs,
        null,
        0.74,
        [],
        30,
        'DeepSeek',
        true,
    );
    console.log(`\n--- run ${i + 1} ---`);
    console.log('api error:', r.error ?? '(none)');
    console.log('raw len:', r.text.length, 'raw:', JSON.stringify(r.text.slice(0, 120)));
    console.log('source:', norm.source, 'pct:', norm.goalProb30Pct);
    console.log('reason:', norm.reasonVi.slice(0, 100));
    console.log('norm error:', norm.error ?? '(none)');
}
