import { describe, expect, it } from 'vitest';
import { buildTrack } from '../track';

describe('buildTrack', () => {
  it('builds a track with cache-busted audio src and lyrics source', () => {
    const track = buildTrack({
      id: 'song-1',
      title: '歌',
      artist: '歌手',
      playlist: '电子',
      cover: '/images/c.jpg',
      audio: '/music/audio/a.mp3',
      lyrics: '/music/lyrics/a.lrc',
    });
    expect(track).toEqual({
      id: 'song-1',
      src: '/music/audio/a.mp3?v=song-1',
      title: '歌',
      artist: '歌手',
      cover: '/images/c.jpg',
      playlist: '电子',
      lyricsSrc: '/music/lyrics/a.lrc',
    });
  });

  it('handles missing audio and lyrics', () => {
    const track = buildTrack({ id: 's', title: 't', artist: '', playlist: '' });
    expect(track.src).toBe('');
    expect(track.lyricsSrc).toBeUndefined();
  });
});
