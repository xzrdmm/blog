import type { PostLike } from './posts';

export function getRelatedPosts<T extends PostLike>(
  currentId: string,
  posts: T[],
  limit = 3,
): T[] {
  const current = posts.find((post) => post.id === currentId);
  const others = posts.filter((post) => post.id !== currentId);
  if (!current) return others.slice(0, limit);

  const currentTags = new Set(current.data.tags ?? []);
  const scored = others.map((post) => ({
    post,
    score: (post.data.tags ?? []).filter((tag) => currentTags.has(tag)).length,
  }));
  scored.sort(
    (a, b) =>
      b.score - a.score || b.post.data.date.getTime() - a.post.data.date.getTime(),
  );
  return scored.slice(0, limit).map((entry) => entry.post);
}
