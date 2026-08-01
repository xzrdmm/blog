import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  base: string;
}

export default function SearchButton({ base }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      onClick={() => {
        location.href = `${base}search`;
      }}
      aria-label="站内搜索（按 / 键）"
      className="widget-glass widget-layer bottom-24 left-5 flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-2)] transition hover:text-[var(--accent)]"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </svg>
    </motion.button>
  );
}
