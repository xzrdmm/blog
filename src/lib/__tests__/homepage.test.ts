import { describe, expect, it } from 'vitest';
import { curateFeaturedPosts, curateFeaturedProjects, curateFeaturedSongs, interleaveMasonry } from '../homepage';

type Item = { id: string };

const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));

describe('curateFeaturedPosts / curateFeaturedProjects / curateFeaturedSongs', () => {
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
    expect(curateFeaturedProjects(all, ['b', 'b', 'a'], 2).map((i) => i.id)).toEqual(['b', 'a']);
    expect(curateFeaturedSongs(all, ['a'], 2).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns empty list for empty input', () => {
    expect(curateFeaturedPosts([], ['a'], 4)).toEqual([]);
  });
});

describe('interleaveMasonry', () => {
  it('alternates posts and projects evenly', () => {
    const posts = items('p1', 'p2', 'p3', 'p4');
    const projects = items('j1', 'j2');
    expect(interleaveMasonry(posts, projects, 6).map((i) => i.id)).toEqual(['p1', 'j1', 'p2', 'j2', 'p3', 'p4']);
  });

  it('caps the total length', () => {
    const posts = items('p1', 'p2', 'p3', 'p4');
    const projects = items('j1', 'j2');
    expect(interleaveMasonry(posts, projects, 4).map((i) => i.id)).toEqual(['p1', 'j1', 'p2', 'j2']);
  });

  it('handles one side being empty', () => {
    expect(interleaveMasonry(items('p1', 'p2'), [], 4).map((i) => i.id)).toEqual(['p1', 'p2']);
    expect(interleaveMasonry([], items('j1'), 4).map((i) => i.id)).toEqual(['j1']);
  });

  it('starts with posts when there are more posts, else with projects', () => {
    expect(interleaveMasonry(items('p1'), items('j1', 'j2'), 3).map((i) => i.id)).toEqual(['j1', 'p1', 'j2']);
  });
});
