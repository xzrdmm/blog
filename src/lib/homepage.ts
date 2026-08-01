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

export function interleaveMasonry<T, U>(posts: T[], projects: U[], total: number): (T | U)[] {
  const result: (T | U)[] = [];
  const startWithPosts = posts.length >= projects.length;
  let index = 0;
  while (result.length < total && (index < posts.length || index < projects.length)) {
    if (startWithPosts) {
      if (index < posts.length) result.push(posts[index]);
      if (result.length < total && index < projects.length) result.push(projects[index]);
    } else {
      if (index < projects.length) result.push(projects[index]);
      if (result.length < total && index < posts.length) result.push(posts[index]);
    }
    index++;
  }
  return result;
}

export const curateFeaturedPosts = <T extends { id: string }>(
  posts: T[],
  configuredIds: string[],
  limit = 4,
): T[] => pickFeatured(posts, configuredIds, limit);

export const curateFeaturedProjects = <T extends { id: string }>(
  projects: T[],
  configuredIds: string[],
  limit = 2,
): T[] => pickFeatured(projects, configuredIds, limit);

export const curateFeaturedSongs = <T extends { id: string }>(
  songs: T[],
  configuredIds: string[],
  limit = 6,
): T[] => pickFeatured(songs, configuredIds, limit);
