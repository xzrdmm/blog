import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { audioStore } from '../../lib/audio-store';

export default function MiniPlayer() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState(audioStore.state);

  useEffect(() => {
    setMounted(true);
    return audioStore.subscribe(() => setState(audioStore.state));
  }, []);

  if (!mounted) return null;

  const track = state.track;

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="widget-glass widget-layer right-5 bottom-5 z-[90] flex max-w-[290px] items-center gap-3 rounded-2xl py-2 pr-3 pl-2"
        >
          {track.cover ? (
            <img src={track.cover} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/60 to-cyan-400/50 text-lg text-white">♪</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--text)]">{track.title}</div>
            <div className="truncate text-xs text-[var(--text-3)]">{track.artist || track.playlist || '未知歌手'}</div>
          </div>
          <button
            type="button"
            onClick={() => audioStore.toggle()}
            aria-label={state.playing ? '暂停' : '播放'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--text)] transition hover:bg-white/20"
          >
            {state.playing ? (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M8 5.14v13.72L19 12 8 5.14z"></path>
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => audioStore.stop()}
            aria-label="关闭迷你播放器"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-3)] transition hover:bg-white/10 hover:text-[var(--text)]"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
