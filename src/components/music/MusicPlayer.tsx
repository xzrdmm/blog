import { motion } from 'framer-motion';
import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { audioStore, type Track } from '../../lib/audio-store';
import { currentLineIndex, parseLrc, type LyricLine } from '../../lib/lrc';

export interface SongItem {
  id: string;
  title: string;
  artist: string;
  playlist: string;
  cover?: string;
  audio?: string;
  lyrics?: string;
}

export interface MusicPlayerHandle {
  playById: (id: string) => void;
}

interface Props {
  songs: SongItem[];
  ref?: Ref<MusicPlayerHandle>;
}

const toTrack = (song: SongItem): Track => ({
  id: song.id,
  src: song.audio ?? '',
  title: song.title,
  artist: song.artist,
  cover: song.cover,
  playlist: song.playlist,
  lyricsSrc: song.lyrics,
});

const formatTime = (seconds: number): string => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function MusicPlayer({ songs, ref }: Props) {
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(audioStore.state);
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [lyricMode, setLyricMode] = useState<'lrc' | 'text' | null>(null);

  useEffect(() => audioStore.subscribe(() => setState(audioStore.state)), []);

  useEffect(() => {
    const current = audioStore.state.track;
    if (current && songs.some((song) => song.id === current.id)) return;
    const first = songs.find((song) => song.audio);
    if (first) audioStore.select(toTrack(first));
  }, [songs]);

  const playById = useCallback(
    (id: string) => {
      const song = songs.find((item) => item.id === id);
      if (song?.audio) audioStore.play(toTrack(song));
    },
    [songs],
  );

  useImperativeHandle(ref, () => ({ playById }), [playById]);

  const currentIndex = state.track?.id ? songs.findIndex((song) => song.id === state.track?.id) : -1;
  const current = currentIndex >= 0 ? songs[currentIndex] : null;

  const playAt = useCallback(
    (index: number) => {
      const song = songs[index];
      if (song?.audio) audioStore.play(toTrack(song));
    },
    [songs],
  );

  const togglePlay = useCallback(() => audioStore.toggle(), []);

  useEffect(() => {
    let cancelled = false;
    const lyricsSrc = state.track?.lyricsSrc;
    setLyrics(null);
    setLyricMode(null);
    if (!lyricsSrc) return;
    fetch(lyricsSrc)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('lyrics'))))
      .then((text) => {
        if (cancelled) return;
        if (/\.lrc$/i.test(lyricsSrc)) {
          const parsed = parseLrc(text);
          if (parsed.length > 0) {
            setLyrics(parsed);
            setLyricMode('lrc');
          }
        } else {
          const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          if (lines.length > 0) {
            setLyrics(lines.map((line, i) => ({ time: i, text: line })));
            setLyricMode('text');
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.track?.lyricsSrc]);

  const activeIndex = lyricMode === 'lrc' && lyrics ? currentLineIndex(lyrics, state.currentTime) : -1;

  useEffect(() => {
    if (activeIndex >= 0) {
      activeLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeIndex]);

  if (songs.length === 0) {
    return (
      <section className="glass rounded-2xl p-5">
        <div className="py-10 text-center text-sm text-[var(--text-3)]">
          音乐库还是空的——打开 <span className="text-[var(--accent)]">/keystatic</span> 在「歌曲」里上传音频和歌词吧。
        </div>
      </section>
    );
  }

  return (
    <section className="glass flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {current?.cover ? (
          <img src={current.cover} alt={current.title} className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-lg" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/60 to-cyan-400/50 text-2xl text-white">♪</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-[var(--text)]">{current ? current.title : '选择一首歌'}</div>
          <div className="truncate text-sm text-[var(--text-2)]">{current ? current.artist || '未知歌手' : '从下方列表开始播放'}</div>
          {current && (
            <span className="mt-1.5 inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)]">
              {current.playlist || '未分类'}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => playAt(currentIndex - 1)}
            disabled={currentIndex <= 0}
            aria-label="上一首"
            className="widget-glass flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-2)] transition hover:-translate-y-0.5 hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-35"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M6 5h2v14H6zM20 5v14L10 12z"></path>
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!state.track}
            aria-label={state.playing ? '暂停' : '播放'}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
          >
            {state.playing ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M8 5.14v13.72L19 12 8 5.14z"></path>
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => playAt(currentIndex + 1)}
            disabled={currentIndex < 0 || currentIndex >= songs.length - 1}
            aria-label="下一首"
            className="widget-glass flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-2)] transition hover:-translate-y-0.5 hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-35"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M16 5h2v14h-2zM4 5v14l10-7z"></path>
            </svg>
          </button>
        </div>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={state.duration || 0}
          step={0.1}
          value={Math.min(state.currentTime, state.duration || 0)}
          onChange={(e) => audioStore.setTime(Number(e.target.value))}
          aria-label="播放进度"
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-[var(--text-3)] tabular-nums">
          <span>{formatTime(state.currentTime)}</span>
          <span>{state.loading ? '加载中…' : formatTime(state.duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-3)]">音量</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={state.volume}
          onChange={(e) => audioStore.setVolume(Number(e.target.value))}
          aria-label="音量"
          className="w-28 accent-[var(--accent)]"
        />
        {state.error && <span className="text-xs text-rose-400">{state.error}</span>}
      </div>

      <div>
        <div className="mb-2 text-xs font-medium tracking-widest text-[var(--text-3)] uppercase">歌词</div>
        {lyrics && lyrics.length > 0 ? (
          <div className="relative h-44 overflow-y-auto rounded-xl bg-black/25 px-4 py-3">
            {lyrics.map((line, i) => (
              <div
                key={i}
                ref={i === activeIndex ? activeLineRef : undefined}
                className={`py-1 transition-colors duration-200 ${
                  i === activeIndex ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-2)]'
                }`}
              >
                {line.text || '♪'}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-black/25 px-4 py-6 text-center text-sm text-[var(--text-3)]">
            暂无歌词 — 可在后台「歌曲」里上传 .lrc 歌词文件
          </div>
        )}
      </div>
    </section>
  );
}
