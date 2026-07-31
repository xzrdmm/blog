import { describe, expect, it } from 'vitest';
import { formatClock, greeting } from '../clock';

describe('formatClock', () => {
  it('formats zero-padded hours, minutes and seconds', () => {
    expect(formatClock(new Date(2026, 7, 1, 9, 5, 3))).toBe('09:05:03');
  });

  it('formats 24-hour time', () => {
    expect(formatClock(new Date(2026, 7, 1, 23, 59, 59))).toBe('23:59:59');
  });
});

describe('greeting', () => {
  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 7, 1, 8, 0))).toBe('早上好');
    expect(greeting(new Date(2026, 7, 1, 13, 0))).toBe('下午好');
    expect(greeting(new Date(2026, 7, 1, 19, 0))).toBe('晚上好');
    expect(greeting(new Date(2026, 7, 1, 1, 0))).toBe('夜深了');
  });
});
