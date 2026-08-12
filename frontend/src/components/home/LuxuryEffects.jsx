import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* ============================================================================
 * LuxuryEffects — the motion engine behind the "Second Skin Studio" home.
 *
 * Everything below the hero is choreographed with GSAP + ScrollTrigger:
 *   [data-reveal]        single element fades up (+ optional data-delay)
 *   [data-reveal-group]  container whose [data-reveal-item] children stagger in
 *   [data-parallax]      image drifts on scroll (data-parallax = speed 0-1)
 *   [data-count]         number counts up when it enters view
 *   [data-draw]          an SVG path draws itself (the seam mark)
 *
 * prefers-reduced-motion is respected via gsap.matchMedia — those visitors
 * get the static layout instantly, with no motion. Everything is scoped to
 * this subtree (display: contents wrapper), so the admin shell and other
 * pages are never touched.
 * ========================================================================== */
gsap.registerPlugin(ScrollTrigger);

export default function LuxuryEffects({ children }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* ── Single reveals ─────────────────────────────────────────── */
      gsap.utils.toArray('[data-reveal]', root).forEach((el) => {
        const delay = parseFloat(el.dataset.delay || 0);
        gsap.fromTo(el, { autoAlpha: 0, y: 30 }, {
          autoAlpha: 1, y: 0, duration: 1.1, delay, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        });
      });

      /* ── Staggered group reveals ────────────────────────────────── */
      gsap.utils.toArray('[data-reveal-group]', root).forEach((group) => {
        const items = group.querySelectorAll('[data-reveal-item]');
        if (!items.length) return;
        gsap.fromTo(items, { autoAlpha: 0, y: 34 }, {
          autoAlpha: 1, y: 0, duration: 1.05, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 82%', once: true },
        });
      });

      /* ── Parallax drift on photography ──────────────────────────── */
      gsap.utils.toArray('[data-parallax]', root).forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || 0.12);
        gsap.fromTo(el, { yPercent: -speed * 100, scale: 1.12 }, {
          yPercent: speed * 100, scale: 1.12, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      /* ── Number counters ────────────────────────────────────────── */
      gsap.utils.toArray('[data-count]', root).forEach((el) => {
        const target = parseFloat(el.dataset.count || 0);
        const suffix = el.dataset.suffix || '';
        const state = { v: 0 };
        gsap.to(state, {
          v: target, duration: 1.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: () => { el.textContent = Math.round(state.v) + suffix; },
        });
      });

      /* ── Seam draws itself (SVG path) ───────────────────────────── */
      gsap.utils.toArray('[data-draw]', root).forEach((el) => {
        const path = el.tagName === 'path' ? el : el.querySelector('path');
        if (!path || typeof path.getTotalLength !== 'function') return;
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, {
          strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    });

    return () => { mm.revert(); };
  }, []);

  return <div ref={rootRef} className="contents">{children}</div>;
}
