import { describe, expect, it } from 'vitest';
import { curateFeaturedPosts, curateFeaturedSongs } from '../homepage';

type Item = { id: string };

const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));

describe('curateFeaturedPosts / curateFeaturedSongs', () => {
  it('puts configured ids first in order, then fills with the rest', () => {
    const all = items('a', 'b', 'c', 'd', 'e');
    expect(curateFeaturedPosts(all, ['c', 'a'], 4).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores unknown configured ids', () => {
    const all = items('a', 'b');
    expect(curateFeaturedPosts(all, ['x', 'a'], 4).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('deduplicates and respects the limit', () => {
    const all = items('a', 'b', 'c');
    expect(curateFeaturedSongs(all, ['a'], 2).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns empty list for empty input', () => {
    expect(curateFeaturedPosts([], ['a'], 4)).toEqual([]);
  });
});
