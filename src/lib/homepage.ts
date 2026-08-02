const normalizeId = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, '-');

export function pickFeatured<T extends { id: string }>(
  items: T[],
  configuredIds: string[],
  limit: number,
): T[] {
  const byId = new Map(items.map((item) => [normalizeId(item.id), item]));
  const chosen: T[] = [];
  const seen = new Set<string>();

  for (const id of configuredIds) {
    const item = byId.get(normalizeId(id));
    if (item && !seen.has(normalizeId(item.id))) {
      chosen.push(item);
      seen.add(normalizeId(item.id));
    }
  }
  for (const item of items) {
    if (!seen.has(normalizeId(item.id))) {
      chosen.push(item);
      seen.add(normalizeId(item.id));
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

/**
 * 主页播放器的选歌逻辑：
 * 1) 自定义播放列表（按配置顺序，忽略无音频的歌曲）
 * 2) 指定歌单名（精确匹配 playlist）
 * 3) 兜底：全部已发布且有音频的歌曲
 */
export function curatePlayerSongs<
  T extends { id: string; data: { audio?: string; playlist?: string } },
>(songs: T[], configuredIds: string[], playlistName: string): T[] {
  const playable = songs.filter((song) => Boolean(song.data.audio));

  if (configuredIds.length > 0) {
    const byId = new Map(playable.map((song) => [normalizeId(song.id), song]));
    return configuredIds
      .map((id) => byId.get(normalizeId(id)))
      .filter((song): song is T => Boolean(song));
  }

  const wanted = playlistName.trim();
  if (wanted) {
    const chosen = playable.filter((song) => (song.data.playlist ?? '').trim() === wanted);
    if (chosen.length > 0) return chosen;
  }

  return playable;
}
