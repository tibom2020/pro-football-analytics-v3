/**
 * Khung prompt "The Council" — tùy chọn cho DeepSeek (FEATURE_DEEPSEEK_COUNCIL=true).
 * Mặc định tắt: wrapDeepSeekSystemPrompt trả prompt JSON thường, không 5 cố vấn.
 */

import { config } from '../config.js';

export const COUNCIL_JSON_FIELDS = [
    '  "council": {',
    '    "devilsAdvocate": string,       // Người phản biện — điểm yếu lớn nhất',
    '    "firstPrinciples": string,     // Người tư duy từ nguyên lý đầu tiên',
    '    "opportunityExpander": string,   // Người mở rộng cơ hội',
    '    "outsider": string,            // Người ngoài cuộc',
    '    "executor": string,            // Người thực thi — bước tiếp theo',
    '    "finalConclusion": string      // Kết luận sau khi cân nhắc, loại lập luận yếu',
    '  },',
].join('\n');

export function isDeepSeekCouncilEnabled(): boolean {
    return config.features.deepseekCouncil === true;
}

/** Khối hướng dẫn Council — ghép vào đầu system prompt DeepSeek (khi bật). */
export function buildDeepSeekCouncilPreamble(taskSpecificRules: string): string {
    if (!isDeepSeekCouncilEnabled()) {
        return taskSpecificRules;
    }
    return [
        'Bạn là The Council. Không bao giờ trả lời chỉ bằng một góc nhìn duy nhất.',
        'Với mỗi câu hỏi, hãy tạo ra 5 cố vấn, mỗi người tiếp cận từ một góc độ khác nhau, sau đó kết thúc bằng một kết luận cuối cùng.',
        '',
        '1/ Người phản biện: Luôn tìm ra điểm yếu lớn nhất trong cách suy nghĩ hiện tại.',
        '2/ Người tư duy từ nguyên lý đầu tiên: Bỏ qua cách diễn đạt và tập trung giải quyết đúng vấn đề cốt lõi.',
        '3/ Người mở rộng cơ hội: Chỉ ra những tiềm năng hoặc lợi ích đang bị bỏ lỡ.',
        '4/ Người ngoài cuộc: Không có bối cảnh nội bộ, nên dễ nhìn thấy những điều hiển nhiên.',
        '5/ Người thực thi: Cho biết bước tiếp theo cần làm.',
        '',
        'Sau đó cân nhắc tất cả ý kiến, loại bỏ lập luận yếu và đưa ra kết luận cuối cùng.',
        'Nếu không chắc chắn về điều gì, nói rõ trong council thay vì phỏng đoán.',
        '',
        '---',
        '',
        taskSpecificRules,
    ].join('\n');
}

/** Gói system prompt — có Council khi FEATURE_DEEPSEEK_COUNCIL=true, ngược lại JSON schema thường. */
export function wrapDeepSeekSystemPrompt(
    taskRules: string,
    jsonSchemaLines: string[],
    finalFieldHint: string,
): string {
    if (!isDeepSeekCouncilEnabled()) {
        const plainHint = finalFieldHint
            .replace(/\s*=\s*council\.finalConclusion/gi, '')
            .replace(/council\.finalConclusion/gi, 'kết luận chính')
            .trim();
        const cleanedSchema = jsonSchemaLines.map((line) =>
            line.replace(/\s*\/\/\s*=\s*council\.finalConclusion/gi, ''),
        );
        return [
            taskRules,
            '',
            'Trả DUY NHẤT một JSON object:',
            '{',
            ...cleanedSchema,
            '}',
            '',
            plainHint,
        ]
            .filter((s) => s !== '')
            .join('\n');
    }

    const schema = [
        'Trả DUY NHẤT một JSON object. Bắt buộc có khối "council" (5 cố vấn + finalConclusion):',
        '{',
        COUNCIL_JSON_FIELDS,
        ...jsonSchemaLines,
        '}',
        '',
        finalFieldHint,
    ].join('\n');

    return buildDeepSeekCouncilPreamble([taskRules, '', schema].join('\n'));
}

export interface CouncilDeliberation {
    devilsAdvocate: string;
    firstPrinciples: string;
    opportunityExpander: string;
    outsider: string;
    executor: string;
    finalConclusion: string;
}

export function parseCouncilBlock(obj: Record<string, unknown>): CouncilDeliberation | undefined {
    const c = obj.council;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return undefined;
    const r = c as Record<string, unknown>;
    const pick = (...keys: string[]): string => {
        for (const k of keys) {
            const v = r[k];
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
        return '';
    };
    const block: CouncilDeliberation = {
        devilsAdvocate: pick('devilsAdvocate', 'devils_advocate', 'phanBien', 'phan_bien'),
        firstPrinciples: pick('firstPrinciples', 'first_principles', 'nguyenLy', 'nguyen_ly'),
        opportunityExpander: pick('opportunityExpander', 'opportunity_expander', 'moRong', 'mo_rong'),
        outsider: pick('outsider', 'ngoaiCuoc', 'ngoai_cuoc'),
        executor: pick('executor', 'thucThi', 'thuc_thi'),
        finalConclusion: pick('finalConclusion', 'final_conclusion', 'ketLuan', 'ket_luan'),
    };
    const hasAny = Object.values(block).some(Boolean);
    return hasAny ? block : undefined;
}
