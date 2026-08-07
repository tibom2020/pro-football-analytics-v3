import { describe, it, expect } from 'vitest';
import {
    buildDeepSeekCouncilPreamble,
    isDeepSeekCouncilEnabled,
    parseCouncilBlock,
    wrapDeepSeekSystemPrompt,
} from '../goal-predict/deepseek-council-prompt.js';

describe('deepseek-council-prompt', () => {
    it('mặc định tắt Council — preamble chỉ trả task rules', () => {
        expect(isDeepSeekCouncilEnabled()).toBe(false);
        const text = buildDeepSeekCouncilPreamble('Nhiệm vụ test.');
        expect(text).toBe('Nhiệm vụ test.');
        expect(text).not.toContain('The Council');
    });

    it('wrapDeepSeekSystemPrompt không ép khối council khi tắt', () => {
        const text = wrapDeepSeekSystemPrompt(
            'Nhiệm vụ A.',
            ['  "summaryVi": string,   // = council.finalConclusion'],
            'summaryVi PHẢI trùng nội dung council.finalConclusion.',
        );
        expect(text).toContain('Nhiệm vụ A.');
        expect(text).toContain('"summaryVi"');
        expect(text).not.toContain('The Council');
        expect(text).not.toContain('"council"');
    });

    it('parseCouncilBlock đọc khối council', () => {
        const block = parseCouncilBlock({
            council: {
                devilsAdvocate: 'Mẫu nhỏ',
                firstPrinciples: 'Cốt lõi là labelHalf',
                opportunityExpander: 'Có thể Tài',
                outsider: 'Nhìn từ ngoài',
                executor: 'Theo dõi 5 phút',
                finalConclusion: 'Nghiêng Tài vừa phải',
            },
            summaryVi: 'Nghiêng Tài vừa phải',
        });
        expect(block?.finalConclusion).toBe('Nghiêng Tài vừa phải');
        expect(block?.devilsAdvocate).toBe('Mẫu nhỏ');
    });
});
