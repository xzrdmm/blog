import { describe, expect, it } from 'vitest';
import { buildSongEntry, sanitizeSlug } from '../import-entry';

describe('sanitizeSlug', () => {
  it('strips illegal filename characters', () => {
    expect(sanitizeSlug('a/b:c*?"<>|d')).toBe('abcd');
  });

  it('falls back to untitled for empty input', () => {
    expect(sanitizeSlug('   ')).toBe('untitled');
  });
});

describe('buildSongEntry', () => {
  const base = {
    title: "Tu vivi nell'aria",
    artist: 'Kai Engel',
    extension: 'mp3',
  };

  it('builds entry with audio path and jpg cover', () => {
    const result = buildSongEntry(
      { ...base, coverData: new Uint8Array([1]), coverFormat: 'image/jpeg' },
      '电子',
      [],
    );
    expect(result.slug).toBe("Tu vivi nell'aria");
    expect(result.audioName).toBe("Tu vivi nell'aria/audio.mp3");
    expect(result.coverName).toBe("Tu vivi nell'aria/cover.jpg");
    expect(result.entry).toMatchObject({
      title: "Tu vivi nell'aria",
      artist: 'Kai Engel',
      playlist: '电子',
      cover: "/music/covers/Tu vivi nell'aria/cover.jpg",
      audio: "/music/audio/Tu vivi nell'aria/audio.mp3",
      draft: false,
    });
  });

  it('uses png extension for png covers', () => {
    const result = buildSongEntry(
      { ...base, title: 'A', coverData: new Uint8Array([1]), coverFormat: 'image/png' },
      'x',
      [],
    );
    expect(result.coverName).toBe('A/cover.png');
  });

  it('omits cover when no embedded picture', () => {
    const result = buildSongEntry({ ...base, title: 'B' }, 'x', []);
    expect(result.coverName).toBeUndefined();
    expect(result.entry.cover).toBe('');
  });

  it('falls back artist to 未知歌手', () => {
    const result = buildSongEntry({ ...base, title: 'C', artist: '' }, 'x', []);
    expect(result.entry.artist).toBe('未知歌手');
  });

  it('appends -2/-3 suffixes on slug collisions', () => {
    const result = buildSongEntry({ ...base, title: 'D' }, 'x', ['D', 'D-2']);
    expect(result.slug).toBe('D-3');
    expect(result.audioName).toBe('D-3/audio.mp3');
  });
});
