import { describe, expect, it } from 'vitest';
import {
  collectTags,
  filterPublished,
  getAdjacent,
  groupByYear,
  sortByDateDesc,
} from '../posts';

type Post = { id: string; data: { date: Date; tags?: string[]; draft?: boolean } };

const post = (id: string, date: string, extra: Partial<Post['data']> = {}): Post => ({
  id,
  data: { date: new Date(date), ...extra },
});

describe('sortByDateDesc', () => {
  it('sorts newest first', () => {
    const posts = [post('a', '2026-01-01'), post('b', '2026-06-01'), post('c', '2025-12-01')];
    expect(sortByDateDesc(posts).map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('keeps input order for equal dates', () => {
    const posts = [post('x', '2026-01-01'), post('y', '2026-01-01')];
    expect(sortByDateDesc(posts).map((p) => p.id)).toEqual(['x', 'y']);
  });
});

describe('filterPublished', () => {
  it('excludes draft posts and keeps published ones', () => {
    const posts = [
      post('draft', '2026-01-01', { draft: true }),
      post('live', '2026-01-02'),
      post('live2', '2026-01-03', { draft: false }),
    ];
    expect(filterPublished(posts).map((p) => p.id)).toEqual(['live', 'live2']);
  });
});

describe('collectTags', () => {
  it('counts tags across posts and sorts by count then name', () => {
    const posts = [
      post('a', '2026-01-01', { tags: ['生活', '博客'] }),
      post('b', '2026-01-02', { tags: ['技术', '博客'] }),
      post('c', '2026-01-03', { tags: ['技术'] }),
    ];
    expect(collectTags(posts)).toEqual([
      { tag: '博客', count: 2 },
      { tag: '技术', count: 2 },
      { tag: '生活', count: 1 },
    ]);
  });

  it('handles posts without tags', () => {
    expect(collectTags([post('a', '2026-01-01')])).toEqual([]);
  });
});

describe('groupByYear', () => {
  it('groups posts by year, newest year first', () => {
    const posts = [
      post('a', '2026-03-01'),
      post('b', '2025-06-01'),
      post('c', '2026-01-01'),
      post('d', '2024-11-01'),
    ];
    const groups = groupByYear(posts);
    expect([...groups.keys()]).toEqual([2026, 2025, 2024]);
    expect(groups.get(2026)!.map((p) => p.id)).toEqual(['a', 'c']);
  });
});

describe('getAdjacent', () => {
  it('returns newer as prev and older as next', () => {
    const posts = [post('newest', '2026-03-01'), post('middle', '2026-02-01'), post('oldest', '2026-01-01')];
    expect(getAdjacent('middle', posts)).toEqual({
      prev: posts[0],
      next: posts[2],
    });
  });

  it('returns undefined at the edges', () => {
    const posts = [post('newest', '2026-03-01'), post('oldest', '2026-01-01')];
    expect(getAdjacent('newest', posts).prev).toBeUndefined();
    expect(getAdjacent('oldest', posts).next).toBeUndefined();
  });
});
