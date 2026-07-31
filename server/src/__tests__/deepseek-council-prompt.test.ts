import { describe, it, expect } from 'vitest';
import { buildDeepSeekCouncilPreamble, parseCouncilBlock } from '../goal-predict/deepseek-council-prompt.js';

describe('deepseek-council-prompt', () => {
    it('preamble có 5 cố vấn', () => {
        const text = buildDeepSeekCouncilPreamble('Nhiệm vụ test.');
        expect(text).toContain('The Council');
        expect(text).toContain('Người phản biện');
        expect(text).toContain('Người thực thi');
        expect(text).toContain('Nhiệm vụ test.');
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
