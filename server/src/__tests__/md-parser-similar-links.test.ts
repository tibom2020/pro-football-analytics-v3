import { describe, it, expect } from 'vitest';
import {
  flipLinkForInbound,
  parseSimilarMatchLinksSection,
} from '../goal-predict/md-parser.js';

const SAMPLE = `
## Liên kết trận tương tự (similar-match-links)

| Thời điểm ghi | Trận này (H/phút/tỷ số) | Trận liên quan | Match ID | H/phút | FT | Nhóm | label30 | similarity |
|----------------|-------------------------|----------------|----------|--------|----|------|---------|------------|
| 14:30 | H1 10' · 1-0 | Team A vs Team B | \`999\` | H1 12' | 2-1 | top vạch mở | CÓ BÀN | 0.912 |
| 15:05 | H2 52' · 2-2 | Team C vs Team D | \`888\` | H2 55' | 3-2 | catalog+pattern | không | — |
`;

describe('parseSimilarMatchLinksSection', () => {
  it('parse 2 dòng liên kết', () => {
    const rows = parseSimilarMatchLinksSection(SAMPLE, '111');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: '111:999:1:10',
      relatedMatchId: '999',
      relatedTeam: 'Team A vs Team B',
      relatedFt: '2-1',
      relatedHalf: 1,
      relatedMinute: 12,
      tier: 'openLine',
      label30: 1,
      similarity: 0.912,
      sourceHalf: 1,
      sourceMinute: 10,
      sourceScore: '1-0',
    });
    expect(rows[1].tier).toBe('catalogRuns');
    expect(rows[1].label30).toBe(0);
    expect(rows[1].similarity).toBeUndefined();
  });

  it('trả rỗng khi không có section', () => {
    expect(parseSimilarMatchLinksSection('# Title\n', '1')).toEqual([]);
  });
});

describe('flipLinkForInbound', () => {
  it('đảo góc nhìn cho trận được ghi chú', () => {
    const forward = parseSimilarMatchLinksSection(SAMPLE, '111')[0]!;
    const inbound = flipLinkForInbound(forward, '111', 'Home vs Away', '999');
    expect(inbound).toMatchObject({
      id: '999:111:1:12',
      relatedMatchId: '111',
      relatedTeam: 'Home vs Away',
      relatedHalf: 1,
      relatedMinute: 10,
      sourceHalf: 1,
      sourceMinute: 12,
      sourceScore: '2-1',
    });
  });

  it('null khi query không khớp relatedMatchId', () => {
    const forward = parseSimilarMatchLinksSection(SAMPLE, '111')[0]!;
    expect(flipLinkForInbound(forward, '111', 'X', '000')).toBeNull();
  });
});
