import type { Track } from './audio-store';

export interface SongTrackSource {
  id: string;
  title: string;
  artist: string;
  playlist: string;
  cover?: string;
  audio?: string;
  lyrics?: string;
  lyricsText?: string;
}

export function buildTrack(song: SongTrackSource): Track {
  return {
    id: song.id,
    // 加缓存破坏参数，避免下载管理器按 URL 拦截/缓存音频流
    src: song.audio ? `${song.audio}?v=${song.id}` : '',
    title: song.title,
    artist: song.artist,
    cover: song.cover,
    playlist: song.playlist,
    lyricsSrc: song.lyrics,
    lyricsText: song.lyricsText,
  };
}
