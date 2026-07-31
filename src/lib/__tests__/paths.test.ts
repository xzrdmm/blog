import { describe, expect, it } from 'vitest';
import { assetPath } from '../paths';

describe('assetPath', () => {
  it('prefixes a leading-slash path with base', () => {
    expect(assetPath('/images/a.png', '/blog/')).toBe('/blog/images/a.png');
  });

  it('prefixes a relative path with base', () => {
    expect(assetPath('images/a.png', '/blog/')).toBe('/blog/images/a.png');
  });

  it('works with root base', () => {
    expect(assetPath('/favicon.svg', '/')).toBe('/favicon.svg');
  });

  it('does not duplicate an already-prefixed path', () => {
    expect(assetPath('/blog/images/a.png', '/blog/')).toBe('/blog/images/a.png');
  });
});
