import { describe, expect, it } from 'vitest';
import { estimateReadingTime } from '../reading';

describe('estimateReadingTime', () => {
  it('estimates 1 minute for short text', () => {
    expect(estimateReadingTime('你好世界')).toBe(1);
  });

  it('rounds up by Chinese reading pace (400 chars/min)', () => {
    expect(estimateReadingTime('字'.repeat(800))).toBe(2);
    expect(estimateReadingTime('字'.repeat(401))).toBe(2);
  });

  it('ignores markdown syntax when counting', () => {
    expect(estimateReadingTime('**加粗**\n\n```ts\ncode\n```\n正文内容'.repeat(100))).toBeGreaterThan(0);
  });

  it('returns 0 for empty input', () => {
    expect(estimateReadingTime('')).toBe(0);
  });
});
