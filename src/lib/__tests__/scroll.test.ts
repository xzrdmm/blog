import { describe, expect, it } from 'vitest';
import { clampProgress } from '../scroll';

describe('clampProgress', () => {
  it('returns 0 at the top and 1 at the bottom', () => {
    expect(clampProgress(0, 2000, 800)).toBe(0);
    expect(clampProgress(1200, 2000, 800)).toBe(1);
  });

  it('clamps out-of-range values', () => {
    expect(clampProgress(-50, 2000, 800)).toBe(0);
    expect(clampProgress(99999, 2000, 800)).toBe(1);
  });

  it('returns 0 when the page cannot scroll', () => {
    expect(clampProgress(0, 800, 800)).toBe(0);
  });
});
