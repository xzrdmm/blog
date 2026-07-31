import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { formatClock, greeting } from '../../lib/clock';

export default function ClockCard() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="glass rounded-2xl p-6 text-center"
      >
        <div className="font-mono text-4xl font-bold tracking-tight text-[var(--text)] tabular-nums">--:--:--</div>
        <div className="mt-2 text-sm text-[var(--text-2)]">加载中</div>
      </motion.div>
    );
  }

  const dateText = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="glass rounded-2xl p-6 text-center"
    >
      <div className="font-mono text-4xl font-bold tracking-tight text-[var(--text)] tabular-nums">{formatClock(now)}</div>
      <div className="mt-2 text-sm text-[var(--text-2)]">{dateText}</div>
      <div className="mt-3 text-xs font-medium text-[var(--accent)]">{greeting(now)}</div>
    </motion.div>
  );
}
