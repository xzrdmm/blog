import { describe, expect, it } from 'vitest';
import { curateFeaturedPosts, curateFeaturedSongs, curatePlayerSongs } from '../homepage';

type Item = { id: string };

const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));

describe('curateFeaturedPosts / curateFeaturedSongs', () => {
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
    expect(curateFeaturedSongs(all, ['a'], 2).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns empty list for empty input', () => {
    expect(curateFeaturedPosts([], ['a'], 4)).toEqual([]);
  });
});

describe('curatePlayerSongs', () => {
  const songs = [
    { id: 'a', data: { audio: '/a.mp3', playlist: '日语' } },
    { id: 'b', data: { audio: '/b.mp3', playlist: '电子' } },
    { id: 'c', data: { playlist: '日语' } },
  ];

  it('uses the custom list in configured order and skips missing songs', () => {
    const result = curatePlayerSongs(songs, ['b', 'a', 'nope'], '');
    expect(result.map((song) => song.id)).toEqual(['b', 'a']);
  });

  it('filters by playlist name when no custom list is configured', () => {
    const result = curatePlayerSongs(songs, [], '日语');
    expect(result.map((song) => song.id)).toEqual(['a']);
  });

  it('returns all playable songs when nothing is configured', () => {
    const result = curatePlayerSongs(songs, [], '');
    expect(result.map((song) => song.id)).toEqual(['a', 'b']);
  });

  it('falls back to all playable songs when the playlist matches nothing', () => {
    const result = curatePlayerSongs(songs, [], '不存在的歌单');
    expect(result.map((song) => song.id)).toEqual(['a', 'b']);
  });

  it('never includes songs without an audio file', () => {
    const result = curatePlayerSongs(songs, ['c'], '');
    expect(result.map((song) => song.id)).toEqual([]);
    expect(curatePlayerSongs([], ['a'], '')).toEqual([]);
  });

  it('matches configured ids despite case/spacing differences (Keystatic slug vs content id)', () => {
    const mixed = [
      { id: 'jump-in', data: { audio: '/j.mp3', playlist: '日语' } },
      { id: 'what-is-love', data: { audio: '/w.mp3', playlist: '电子' } },
    ];
    expect(curatePlayerSongs(mixed, ['JUMP IN', 'What Is Love'], '').map((song) => song.id)).toEqual([
      'jump-in',
      'what-is-love',
    ]);
  });
});
