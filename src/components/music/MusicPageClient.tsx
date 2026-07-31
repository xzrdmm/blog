import { useEffect, useMemo, useRef, useState } from 'react';
import MusicPlayer, { type MusicPlayerHandle, type SongItem } from './MusicPlayer';
import { groupByPlaylist } from '../../lib/music';

export interface SongWithReview extends SongItem {
  rating: string;
  review: string;
}

interface Props {
  songs: SongWithReview[];
}

export default function MusicPageClient({ songs }: Props) {
  const [playlist, setPlaylist] = useState('全部');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const playerRef = useRef<MusicPlayerHandle>(null);

  const groups = useMemo(() => groupByPlaylist(songs), [songs]);
  const filtered = useMemo(
    () => (playlist === '全部' ? songs : songs.filter((song) => (song.playlist.trim() || '未分类') === playlist)),
    [songs, playlist],
  );
  const selected = useMemo(
    () => filtered.find((song) => song.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    setSelectedId(null);
  }, [playlist]);

  const stars = selected ? Number(selected.rating) || 0 : 0;
  const chips = ['全部', ...groups.map((group) => group.playlist)];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {chips.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setPlaylist(name)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              playlist === name
                ? 'border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'widget-glass text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {songs.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-[var(--text-3)]">
          音乐库还是空的。打开后台「歌曲」，上传音频（mp3 等）和 .lrc 歌词即可开始。
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            <MusicPlayer ref={playerRef} songs={filtered} />
            <ul className="glass divide-y divide-white/10 overflow-hidden rounded-2xl">
              {filtered.map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(song.id);
                      playerRef.current?.playById(song.id);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
                      selected?.id === song.id ? 'bg-white/5' : ''
                    }`}
                  >
                    {song.cover ? (
                      <img src={song.cover} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/50 to-cyan-400/40 text-base text-white">♪</div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--text)]">{song.title}</span>
                      <span className="block truncate text-xs text-[var(--text-3)]">{song.artist || '未知歌手'}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                      {song.playlist || '未分类'}
                    </span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="shrink-0 text-[var(--text-3)]" aria-hidden="true">
                      <path d="M8 5.14v13.72L19 12 8 5.14z"></path>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="widget-glass h-fit rounded-2xl p-5 lg:sticky lg:top-24">
            {selected ? (
              <>
                <div className="flex items-center gap-3">
                  {selected.cover ? (
                    <img src={selected.cover} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/50 to-cyan-400/40 text-xl text-white">♪</div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[var(--text)]">{selected.title}</div>
                    <div className="truncate text-xs text-[var(--text-3)]">{selected.artist || '未知歌手'}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-amber-400" aria-label={`评分 ${stars} 星`}>
                  {'★'.repeat(stars)}
                  {stars < 5 ? '☆'.repeat(5 - stars) : ''}
                  {stars === 0 && <span className="ml-1 text-xs text-[var(--text-3)]">未评分</span>}
                </div>
                <div className="mt-4 mb-1 text-xs font-medium tracking-widest text-[var(--text-3)] uppercase">乐评</div>
                {selected.review ? (
                  <p className="text-sm whitespace-pre-wrap text-[var(--text-2)]">{selected.review}</p>
                ) : (
                  <p className="text-sm text-[var(--text-3)]">还没有乐评，去后台「歌曲」里写一段吧。</p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-3)]">添加歌曲后，这里会显示选中的歌曲与乐评。</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
