import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { audioStore, type PlayMode } from '../../lib/audio-store';
import { centerScrollTop, currentLineIndex, parseLrc, type LyricLine } from '../../lib/lrc';
import { buildTrack } from '../../lib/track';
import { loadPlayerPrefs, savePlayerPrefs } from '../../lib/prefs';

export interface SongItem {
  id: string;
  title: string;
  artist: string;
  playlist: string;
  cover?: string;
  audio?: string;
  lyrics?: string;
  lyricsText?: string;
}

export interface MusicPlayerHandle {
  playById: (id: string) => void;
}

interface Props {
  songs: SongItem[];
  ref?: Ref<MusicPlayerHandle>;
  bare?: boolean;
}

const formatTime = (seconds: number): string => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function MusicPlayer({ songs, ref, bare = false }: Props) {
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef('');
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState(audioStore.state);
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [lyricMode, setLyricMode] = useState<'lrc' | 'text' | null>(null);

  useEffect(() => audioStore.subscribe(() => setState(audioStore.state)), []);
  useEffect(() => setMounted(true), []);

  // 首帧与 SSR 对齐（持久化音频状态不参与水合比较），挂载后再显示真实状态
  const displayState: typeof state = mounted
    ? state
    : {
        track: null,
        playing: false,
        pendingAutoplay: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        error: '',
        loading: false,
        mode: 'order',
        queue: [],
      };

  // 首次进入：恢复播放偏好（音量/模式/上次歌曲），并自动开始播放
  useEffect(() => {
    const current = audioStore.state.track;
    if (current && songs.some((song) => song.id === current.id)) return;
    const prefs = loadPlayerPrefs(window.localStorage);
    audioStore.setVolume(prefs.volume);
    audioStore.setMode(prefs.mode);
    let target: SongItem | undefined;
    if (prefs.lastSongId) {
      target = songs.find((song) => song.id === prefs.lastSongId && song.audio);
    }
    target ??= songs.find((song) => song.audio);
    if (target) audioStore.play(buildTrack(target));
  }, [songs]);

  // 监听状态变化，保存播放偏好
  useEffect(() => {
    lastSavedRef.current = '';
    return audioStore.subscribe(() => {
      const state = audioStore.state;
      const key = `${state.volume}|${state.mode}|${state.track?.id ?? ''}`;
      if (key !== lastSavedRef.current) {
        lastSavedRef.current = key;
        savePlayerPrefs(window.localStorage, {
          volume: state.volume,
          mode: state.mode,
          lastSongId: state.track?.id,
        });
      }
    });
  }, []);

  const playById = useCallback(
    (id: string) => {
      const song = songs.find((item) => item.id === id);
      if (song?.audio) audioStore.play(buildTrack(song));
    },
    [songs],
  );

  useImperativeHandle(ref, () => ({ playById }), [playById]);

  const currentIndex = displayState.track?.id
    ? songs.findIndex((song) => song.id === displayState.track?.id)
    : -1;
  const current = currentIndex >= 0 ? songs[currentIndex] : null;

  const playAt = useCallback(
    (index: number) => {
      const song = songs[index];
      if (song?.audio) audioStore.play(buildTrack(song));
    },
    [songs],
  );

  const playPrev = useCallback(() => {
    if (currentIndex < 0) return;
    playAt((currentIndex - 1 + songs.length) % songs.length);
  }, [currentIndex, songs, playAt]);

  const playNext = useCallback(() => {
    if (currentIndex < 0) return;
    if (displayState.mode === 'repeat-one') {
      playAt(currentIndex);
      return;
    }
    const queued = audioStore.takeFromQueue();
    if (queued?.src) {
      audioStore.play(queued);
      return;
    }
    if (displayState.mode === 'shuffle') {
      playAt(Math.floor(Math.random() * songs.length));
      return;
    }
    playAt((currentIndex + 1) % songs.length);
  }, [currentIndex, songs, displayState.mode, playAt]);

  const togglePlay = useCallback(() => audioStore.toggle(), []);

  const cycleMode = () => {
    const next: PlayMode =
      displayState.mode === 'order'
        ? 'shuffle'
        : displayState.mode === 'shuffle'
          ? 'repeat-one'
          : 'order';
    audioStore.setMode(next);
  };

  const modeLabel =
    displayState.mode === 'order'
      ? '顺序播放'
      : displayState.mode === 'shuffle'
        ? '随机播放'
        : '单曲循环';

  // 一首播完后自动切到下一首（循环）
  useEffect(() => audioStore.onEnded(() => playNext()), [playNext]);

  useEffect(() => {
    let cancelled = false;
    const lyricsSrc = displayState.track?.lyricsSrc;
    const lyricsText = displayState.track?.lyricsText;
    setLyrics(null);
    setLyricMode(null);
    const applyText = (content: string, isLrc: boolean) => {
      if (cancelled) return;
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) return;
      if (isLrc) {
        const parsed = parseLrc(content);
        if (parsed.length > 0) {
          setLyrics(parsed);
          setLyricMode('lrc');
          return;
        }
      }
      setLyrics(lines.map((line, i) => ({ time: i, text: line })));
      setLyricMode('text');
    };
    if (lyricsText) {
      applyText(lyricsText, true);
      return;
    }
    if (!lyricsSrc) return;
    fetch(lyricsSrc)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('lyrics'))))
      .then((text) => {
        applyText(text, /\.lrc$/i.test(lyricsSrc));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [displayState.track?.lyricsSrc, displayState.track?.lyricsText]);

  const activeIndex =
    lyricMode === 'lrc' && lyrics ? currentLineIndex(lyrics, displayState.currentTime) : -1;

  useEffect(() => {
    if (activeIndex < 0) return;
    const line = activeLineRef.current;
    const container = line?.parentElement;
    if (!line || !container) return;
    // 只滚动歌词容器自身，不带动页面滚动条
    container.scrollTo({
      top: centerScrollTop(line.offsetTop, container.clientHeight, line.clientHeight),
      behavior: 'smooth',
    });
  }, [activeIndex]);

  if (songs.length === 0) {
    return (
      <section className={bare ? '' : 'glass rounded-2xl p-5'}>
        <div className="py-10 text-center text-sm text-[var(--text-3)]">
          音乐库还是空的——打开 <span className="text-[var(--accent)]">/keystatic</span> 在「歌曲」里上传音频和歌词吧。
        </div>
      </section>
    );
  }

  return (
    <section className={bare ? 'flex flex-col gap-3' : 'glass flex flex-col gap-3 rounded-2xl p-4'}>
      <div className="flex items-center gap-4">
        {current?.cover ? (
          <img
            src={current.cover}
            alt={current.title}
            decoding="async"
            className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/60 to-cyan-400/50 text-xl text-white">♪</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-[var(--text)]">{current ? current.title : '选择一首歌'}</div>
          <div className="truncate text-xs text-[var(--text-2)]">{current ? current.artist || '未知歌手' : '从下方列表开始播放'}</div>
          {current && (
            <span className="mt-1.5 inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)]">
              {current.playlist || '未分类'}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={playPrev}
            disabled={currentIndex < 0}
            aria-label="上一首"
            className="widget-glass flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] transition hover:-translate-y-0.5 hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-35"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M6 5h2v14H6zM20 5v14L10 12z"></path>
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
          disabled={!displayState.track}
          aria-label={displayState.playing ? '暂停' : '播放'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
          >
            {displayState.playing ? (
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
            onClick={playNext}
            disabled={currentIndex < 0}
            aria-label="下一首"
            className="widget-glass flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] transition hover:-translate-y-0.5 hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-35"
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
          max={displayState.duration || 0}
          step={0.1}
          value={Math.min(displayState.currentTime, displayState.duration || 0)}
          onChange={(e) => audioStore.setTime(Number(e.target.value))}
          aria-label="播放进度"
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-[var(--text-3)] tabular-nums">
          <span>{formatTime(displayState.currentTime)}</span>
          <span>{displayState.loading ? '加载中…' : formatTime(displayState.duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-3)]">音量</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={displayState.volume}
          onChange={(e) => audioStore.setVolume(Number(e.target.value))}
          aria-label="音量"
          className="w-28 accent-[var(--accent)]"
        />
        <button
          type="button"
          onClick={cycleMode}
          className="widget-glass rounded-full px-3 py-1 text-xs text-[var(--text-2)] transition hover:text-[var(--text)]"
        >
          {modeLabel}
        </button>
        {displayState.error && <span className="text-xs text-rose-400">{displayState.error}</span>}
      </div>

      {displayState.pendingAutoplay && (
        <div className="rounded-xl bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-300">
          浏览器拦截了自动播放，点击页面任意位置即可开始播放
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-medium tracking-widest text-[var(--text-3)] uppercase">歌词</div>
        {lyrics && lyrics.length > 0 ? (
          <div className="relative h-32 overflow-y-auto overscroll-contain rounded-xl bg-black/25 px-4 py-2">
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
