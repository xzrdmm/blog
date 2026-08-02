import { useEffect, useState } from 'react';
import { formatClock, greeting } from '../../lib/clock';
import MusicPlayer, { type SongItem } from '../music/MusicPlayer';

interface Props {
  songs: SongItem[];
}

export default function HeroPanel({ songs }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateText = now
    ? new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(now)
    : '';

  return (
    <div className="glass anim-fade-up flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-3xl font-bold tracking-tight text-[var(--text)] tabular-nums sm:text-4xl">
            {now ? formatClock(now) : '--:--:--'}
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-2)]">{now ? dateText : ''}</div>
        </div>
        <div className="shrink-0 text-xs font-medium text-[var(--accent)]">
          {now ? greeting(now) : ''}
        </div>
      </div>
      <MusicPlayer songs={songs} bare />
    </div>
  );
}
