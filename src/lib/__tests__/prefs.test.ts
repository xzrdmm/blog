import { describe, expect, it } from 'vitest';
import { loadPlayerPrefs, savePlayerPrefs, type PrefsStorage } from '../prefs';

const fakeStorage = (initial: Record<string, string> = {}): PrefsStorage => {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

describe('player prefs', () => {
  it('round-trips volume, mode and last song', () => {
    const storage = fakeStorage();
    savePlayerPrefs(storage, { volume: 0.6, mode: 'shuffle', lastSongId: 's1' });
    expect(loadPlayerPrefs(storage)).toEqual({ volume: 0.6, mode: 'shuffle', lastSongId: 's1' });
  });

  it('returns defaults for missing or corrupt data', () => {
    expect(loadPlayerPrefs(fakeStorage())).toEqual({ volume: 1, mode: 'order', lastSongId: undefined });
    expect(loadPlayerPrefs(fakeStorage({ 'blog-player-prefs': 'not-json' }))).toEqual({
      volume: 1,
      mode: 'order',
      lastSongId: undefined,
    });
  });

  it('sanitizes invalid values', () => {
    const storage = fakeStorage({ 'blog-player-prefs': JSON.stringify({ volume: 9, mode: 'bogus', lastSongId: 3 }) });
    expect(loadPlayerPrefs(storage)).toEqual({ volume: 1, mode: 'order', lastSongId: undefined });
  });
});
