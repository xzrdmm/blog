import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.3 });

  return (
    <motion.div
      aria-hidden="true"
      className="widget-layer top-0 right-0 left-0 h-1 origin-left"
      style={{ scaleX, background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)' }}
    />
  );
}
