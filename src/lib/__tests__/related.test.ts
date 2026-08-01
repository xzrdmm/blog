import { describe, expect, it } from 'vitest';
import { getRelatedPosts } from '../related';

type Post = {
  id: string;
  data: { date: Date; tags?: string[] };
};

const post = (id: string, date: string, tags: string[] = []): Post => ({
  id,
  data: { date: new Date(date), tags },
});

describe('getRelatedPosts', () => {
  it('prefers posts sharing tags, sorted by overlap then date', () => {
    const posts = [
      post('current', '2026-01-01', ['技术', '博客']),
      post('same', '2026-01-02', ['技术']),
      post('same2', '2026-01-03', ['技术', '生活']),
      post('other', '2026-01-04', ['生活']),
    ];
    expect(getRelatedPosts('current', posts, 3).map((p) => p.id)).toEqual(['same2', 'same', 'other']);
  });

  it('excludes the current post and respects the limit', () => {
    const posts = [post('current', '2026-01-01'), post('a', '2026-01-02'), post('b', '2026-01-03')];
    expect(getRelatedPosts('current', posts, 2).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('falls back to newest posts when there is no tag overlap', () => {
    const posts = [
      post('current', '2026-01-01', ['甲']),
      post('a', '2026-01-02', ['乙']),
      post('b', '2026-01-03', ['丙']),
    ];
    expect(getRelatedPosts('current', posts, 3).map((p) => p.id)).toEqual(['b', 'a']);
  });
});
