import { describe, it, expect } from 'vitest';
import {
  stripMarkdownSyntax,
  countWords,
  estimateReadingTimeMinutes,
} from '../../src/lib/reading-time';

describe('stripMarkdownSyntax', () => {
  it('removes headings, emphasis markers, and links but keeps link text', () => {
    const markdown =
      '# Başlık\n\nBu bir **kalın** ve [bağlantı](https://example.com) içeren metindir.';
    const plain = stripMarkdownSyntax(markdown);
    expect(plain).not.toContain('#');
    expect(plain).not.toContain('**');
    expect(plain).not.toContain('https://example.com');
    expect(plain).toContain('bağlantı');
  });

  it('removes code fences entirely', () => {
    const markdown = 'Metin\n```js\nconst x = 1;\n```\nDevamı';
    const plain = stripMarkdownSyntax(markdown);
    expect(plain).not.toContain('const x');
  });

  it('removes the [[source:key]] citation syntax', () => {
    const markdown = 'Bu bir iddiadır [[source:tkgm-parsel]] ve devam eder.';
    expect(stripMarkdownSyntax(markdown)).not.toContain('source:');
  });
});

describe('countWords', () => {
  it('counts words in plain text', () => {
    expect(countWords('bir iki üç dört')).toBe(4);
  });
  it('returns 0 for empty content', () => {
    expect(countWords('')).toBe(0);
  });
  it('does not count markdown syntax characters as words', () => {
    expect(countWords('# Başlık')).toBe(1);
  });
});

describe('estimateReadingTimeMinutes', () => {
  it('returns at least 1 minute for short content', () => {
    expect(estimateReadingTimeMinutes('kısa metin')).toBe(1);
  });
  it('scales roughly with word count at 200 wpm', () => {
    const longText = new Array(600).fill('kelime').join(' ');
    expect(estimateReadingTimeMinutes(longText)).toBe(3);
  });
});
