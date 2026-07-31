import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { formatClock } from '../../lib/clock';

export default function FloatingClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="widget-glass widget-layer bottom-5 left-5 hidden rounded-2xl px-4 py-2.5 text-right sm:block">
        <div className="font-mono text-lg font-semibold text-[var(--text)] tabular-nums">--:--:--</div>
        <div className="text-xs text-[var(--text-3)]">加载中</div>
      </div>
    );
  }

  const dateText = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="widget-glass widget-layer bottom-5 left-5 hidden rounded-2xl px-4 py-2.5 text-right sm:block"
    >
      <div className="font-mono text-lg font-semibold text-[var(--text)] tabular-nums">{formatClock(now)}</div>
      <div className="text-xs text-[var(--text-3)]">{dateText}</div>
    </motion.div>
  );
}
