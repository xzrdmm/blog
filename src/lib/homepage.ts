export function pickFeatured<T extends { id: string }>(
  items: T[],
  configuredIds: string[],
  limit: number,
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const chosen: T[] = [];
  const seen = new Set<string>();

  for (const id of configuredIds) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      chosen.push(item);
      seen.add(id);
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) {
      chosen.push(item);
      seen.add(item.id);
    }
  }
  return chosen.slice(0, limit);
}

export const curateFeaturedPosts = <T extends { id: string }>(
  posts: T[],
  configuredIds: string[],
  limit = 4,
): T[] => pickFeatured(posts, configuredIds, limit);

export const curateFeaturedSongs = <T extends { id: string }>(
  songs: T[],
  configuredIds: string[],
  limit = 6,
): T[] => pickFeatured(songs, configuredIds, limit);
