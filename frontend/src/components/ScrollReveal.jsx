import { useRef, useEffect, useState } from 'react';

/* ============================================================================
 * ScrollReveal — subtle fade-up entrance for page sections.
 *
 * Wraps a child element and applies a CSS opacity/translate animation once
 * the element enters the viewport. Uses IntersectionObserver (no extra lib)
 * and respects prefers-reduced-motion.
 *
 * Usage:
 *   <ScrollReveal className="md:delay-[200ms]">
 *     <section>...</section>
 *   </ScrollReveal>
 *
 * The optional `className` is applied to the wrapper div. The `delay` prop
 * sets --reveal-delay on the wrapper so CSS can stagger sibling sections.
 * ========================================================================== */

export default function ScrollReveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion — reveal immediately
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: visible ? `${delay}ms` : '0ms',
        willChange: visible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}