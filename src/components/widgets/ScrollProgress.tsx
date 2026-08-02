import { useEffect, useRef } from 'react';
import { clampProgress } from '../../lib/scroll';

export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const progress = clampProgress(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
        );
        if (ref.current) ref.current.style.transform = `scaleX(${progress})`;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="widget-layer top-0 right-0 left-0 h-1 origin-left"
      style={{ transform: 'scaleX(0)', background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)' }}
    />
  );
}
