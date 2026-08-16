import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/* ============================================================================
 * Motion primitives for the admin dashboard — all respect prefers-reduced-motion
 * (framer's useReducedMotion + the global CSS override as belt-and-braces).
 *
 *  · useCountUp — the "number ticker": animates 0 → value over ~700ms, ease-out.
 *  · Rise       — fade + slide-up entrance used to stagger sections on mount.
 *  · staggerOf  — reading-order delay helper (50ms between sections).
 * ========================================================================== */

const easeOut = [0.16, 1, 0.3, 1];

/** Animates a number from its previous value to `target` over `duration` ms. */
export function useCountUp(target, { duration = 700 } = {}) {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(target);
  const fromRef = useRef(0);

  useEffect(() => {
    const to = Number(target) || 0;
    if (reduce) { setVal(to); return; }
    const from = fromRef.current;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setVal(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); fromRef.current = to; };
  }, [target, duration, reduce]);

  return val;
}

/** Fade + slide-up wrapper. `delay` seconds; instant under reduced motion. */
export function Rise({ children, delay = 0, className = '', ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: easeOut }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Reading-order stagger — top-to-bottom. */
export const staggerOf = (index, step = 0.05) => Math.min(0.6, index * step);
