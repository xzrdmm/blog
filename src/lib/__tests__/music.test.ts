import { describe, expect, it } from 'vitest';
import { groupByPlaylist, isPlayable, sortSongsByTitle } from '../music';

type Song = {
  id: string;
  title: string;
  playlist: string;
  audio?: string;
  draft?: boolean;
};

const song = (id: string, title: string, playlist: string, extra: Partial<Song> = {}): Song => ({
  id,
  title,
  playlist,
  ...extra,
});

describe('groupByPlaylist', () => {
  it('groups songs by playlist preserving first-seen order', () => {
    const songs = [
      song('a', 'A', '电子'),
      song('b', 'B', '日语'),
      song('c', 'C', '电子'),
    ];
    expect(groupByPlaylist(songs)).toEqual([
      { playlist: '电子', songs: [songs[0], songs[2]] },
      { playlist: '日语', songs: [songs[1]] },
    ]);
  });

  it('falls back to 未分类 for empty playlist', () => {
    const songs = [song('a', 'A', '')];
    expect(groupByPlaylist(songs)[0].playlist).toBe('未分类');
  });
});

describe('sortSongsByTitle', () => {
  it('sorts by title without mutating input', () => {
    const songs = [song('a', '夜航星', 'x'), song('b', '打上花火', 'x')];
    const result = sortSongsByTitle(songs);
    expect(result.map((s) => s.id)).toEqual(['b', 'a']);
    expect(songs.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('isPlayable', () => {
  it('is true only when audio exists', () => {
    expect(isPlayable(song('a', 'A', 'x', { audio: '/music/a.mp3' }))).toBe(true);
    expect(isPlayable(song('b', 'B', 'x'))).toBe(false);
  });
});
