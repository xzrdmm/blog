import type { PlayMode } from './audio-store';

export interface PlayerPrefs {
  volume: number;
  mode: PlayMode;
  lastSongId?: string;
}

export interface PrefsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'blog-player-prefs';
const MODES: PlayMode[] = ['order', 'shuffle', 'repeat-one'];

export function loadPlayerPrefs(storage: PrefsStorage): PlayerPrefs {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { volume: 1, mode: 'order' };
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    const volume =
      typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume
        : 1;
    const mode = MODES.includes(parsed.mode as PlayMode) ? (parsed.mode as PlayMode) : 'order';
    const lastSongId = typeof parsed.lastSongId === 'string' ? parsed.lastSongId : undefined;
    return { volume, mode, lastSongId };
  } catch {
    return { volume: 1, mode: 'order' };
  }
}

export function savePlayerPrefs(storage: PrefsStorage, prefs: PlayerPrefs): void {
  try {
    storage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 隐私模式等场景下 localStorage 不可用，静默忽略
  }
}
