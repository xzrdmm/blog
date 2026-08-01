export interface PostLike {
  id: string;
  data: {
    date: Date;
    tags?: string[];
    draft?: boolean;
  };
}

export function sortByDateDesc<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function sortPosts<T extends PostLike & { data: { pinned?: boolean } }>(
  posts: T[],
): T[] {
  return [...posts].sort(
    (a, b) =>
      Number(b.data.pinned ?? false) - Number(a.data.pinned ?? false) ||
      b.data.date.getTime() - a.data.date.getTime(),
  );
}

export function filterPublished<T extends PostLike>(posts: T[]): T[] {
  return posts.filter((post) => !post.data.draft);
}

export function collectTags(posts: PostLike[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

export function groupByYear<T extends PostLike>(posts: T[]): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const post of posts) {
    const year = post.data.date.getFullYear();
    const list = groups.get(year) ?? [];
    list.push(post);
    groups.set(year, list);
  }
  return new Map([...groups.entries()].sort((a, b) => b[0] - a[0]));
}

export function getAdjacent<T extends PostLike>(
  currentId: string,
  posts: T[],
): { prev?: T; next?: T } {
  const index = posts.findIndex((post) => post.id === currentId);
  if (index === -1) return {};
  return { prev: posts[index - 1], next: posts[index + 1] };
}
