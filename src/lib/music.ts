export interface SongLike {
  id: string;
  title: string;
  playlist: string;
  audio?: string;
  draft?: boolean;
}

export function groupByPlaylist(songs: SongLike[]): { playlist: string; songs: SongLike[] }[] {
  const groups = new Map<string, SongLike[]>();
  for (const song of songs) {
    const playlist = song.playlist.trim() || '未分类';
    const list = groups.get(playlist) ?? [];
    list.push(song);
    groups.set(playlist, list);
  }
  return [...groups.entries()].map(([playlist, items]) => ({ playlist, songs: items }));
}

export function sortSongsByTitle(songs: SongLike[]): SongLike[] {
  return [...songs].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
}

export function isPlayable(song: SongLike): boolean {
  return Boolean(song.audio?.trim());
}
