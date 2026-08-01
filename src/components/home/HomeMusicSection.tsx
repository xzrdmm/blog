import { motion } from 'framer-motion';
import { audioStore, type Track } from '../../lib/audio-store';

export interface MusicCardItem {
  id: string;
  title: string;
  artist: string;
  playlist: string;
  cover?: string;
  audio?: string;
  rating: string;
  review: string;
}

interface Props {
  songs: MusicCardItem[];
}

const toTrack = (song: MusicCardItem): Track => ({
  id: song.id,
  src: song.audio ? `${song.audio}?v=${song.id}` : '',
  title: song.title,
  artist: song.artist,
  cover: song.cover,
  playlist: song.playlist,
});

export default function HomeMusicSection({ songs }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {songs.map((song, i) => {
        const stars = Number(song.rating) || 0;
        return (
          <motion.button
            key={song.id}
            type="button"
            onClick={() => {
              if (song.audio) audioStore.play(toTrack(song));
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08, ease: 'easeOut' }}
            className="glass flex flex-col gap-3 rounded-2xl p-4 text-left transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              {song.cover ? (
                <img src={song.cover} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/50 to-cyan-400/40 text-xl text-white">
                  ♪
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-semibold text-[var(--text)]">{song.title}</div>
                <div className="truncate text-xs text-[var(--text-3)]">{song.artist || '未知歌手'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
                {song.playlist || '未分类'}
              </span>
              <span className="text-amber-400" aria-label={`评分 ${stars} 星`}>
                {'★'.repeat(stars)}
                {'☆'.repeat(5 - stars)}
              </span>
            </div>
            {song.review && <p className="line-clamp-2 text-xs text-[var(--text-2)]">{song.review}</p>}
          </motion.button>
        );
      })}
    </div>
  );
}
