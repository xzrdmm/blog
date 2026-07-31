import { describe, expect, it } from 'vitest';
import { formatDate } from '../format';

describe('formatDate', () => {
  it('formats a Date as 中文日期', () => {
    expect(formatDate(new Date('2026-07-31T12:00:00'))).toBe('2026年7月31日');
  });

  it('accepts a date string', () => {
    expect(formatDate('2026-07-01')).toBe('2026年7月1日');
  });

  it('formats single digit day with no padding', () => {
    expect(formatDate(new Date('2026-07-05T12:00:00'))).toBe('2026年7月5日');
  });
});
