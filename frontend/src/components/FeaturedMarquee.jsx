import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';

/**
 * FeaturedMarquee — dark strip of featured products that drifts on its own and
 * can also be dragged, swiped, wheel-scrolled or stepped with arrow buttons.
 *
 * The track is a real scroll container rather than a CSS transform, which is
 * what makes every input work at once: the browser handles touch momentum
 * natively, and the auto-drift is just a rAF loop nudging scrollLeft. The list
 * is tripled so scrolling past either end silently teleports back to the middle
 * copy — the loop stays seamless in both directions.
 *
 * Auto-drift pauses while the pointer is over the strip, while the visitor is
 * dragging, when the tab is hidden, and for anyone who prefers reduced motion.
 */
export default function FeaturedMarquee({ products, title = 'HUSHAE — Signature Pieces', speed = 55 }) {
  const list = Array.isArray(products) ? products.filter((p) => p && p.images && p.images.length) : [];

  const trackRef = useRef(null);
  // Paused only by real interaction: a drag in progress, or keyboard focus.
  // Hover deliberately does not pause — see the note on the wrapper below.
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Mutable drag state — kept in a ref so pointer moves never re-render.
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });
  const reduceMotion = useRef(false);
  // Mirrored into a ref so the rAF loop reads it without re-subscribing.
  const hoverRef = useRef(false);

  // Three copies: the middle one is what the visitor sees, the outer two give
  // room to scroll before we wrap.
  const loop = useMemo(() => [...list, ...list, ...list], [list]);
  const copyWidth = () => (trackRef.current ? trackRef.current.scrollWidth / 3 : 0);

  useEffect(() => {
    reduceMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }, []);

  useEffect(() => { hoverRef.current = hovering; }, [hovering]);

  // Start in the middle copy so there is headroom on both sides.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !list.length) return;
    const id = requestAnimationFrame(() => { el.scrollLeft = copyWidth(); });
    return () => cancelAnimationFrame(id);
  }, [list.length]);

  /**
   * Keep scrollLeft inside the middle copy.
   *
   * Only touches scrollLeft when a boundary is genuinely crossed: assigning it
   * on every scroll event would cancel the browser's smooth-scroll animation
   * and stall the drift, since both report as scroll events too.
   */
  const smoothing = useRef(false);
  const wrap = useCallback(() => {
    const el = trackRef.current;
    if (!el || smoothing.current) return;
    const w = copyWidth();
    if (w <= 0) return;
    if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
    else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
  }, []);

  // ── Auto-drift ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !list.length) return undefined;

    // Match the old cadence: a full copy scrolls past in roughly `duration`s.
    const duration = Math.max(20, Math.min(120, Math.round((list.length * speed) / 6)));
    let raf = 0;
    let last = performance.now();
    // scrollLeft is rounded to whole pixels, so a ~0.9px-per-frame nudge would
    // be discarded every time and the strip would never move. Accumulate the
    // fractional distance here and only write once a whole pixel is owed.
    let owed = 0;

    const tick = (now) => {
      const dt = Math.min(now - last, 100);          // ignore tab-switch gaps
      last = now;
      const w = copyWidth();
      const stop = paused || drag.current.active || document.hidden
        || reduceMotion.current || smoothing.current;

      if (!stop && w > 0) {
        // Ease off under the pointer instead of freezing: the visitor can read
        // a card without it sliding away, and the strip still looks alive.
        const rate = hoverRef.current ? 0.25 : 1;
        owed += (w / (duration * 1000)) * dt * rate;
        const whole = Math.trunc(owed);
        if (whole >= 1) {
          owed -= whole;
          el.scrollLeft += whole;
          wrap();
        }
      } else {
        owed = 0;                                    // don't lurch after a pause
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [list.length, speed, paused, wrap]);

  // ── Pointer drag (mouse and pen; touch uses native scrolling) ───────────
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') return;          // let the browser do touch
    const el = trackRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
    setDragging(true);
    el.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const el = trackRef.current;
    if (!drag.current.active || !el) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.abs(dx);
    el.scrollLeft = drag.current.startScroll - dx;
    wrap();
  };

  const endDrag = (e) => {
    const el = trackRef.current;
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    if (e?.pointerId != null) el?.releasePointerCapture?.(e.pointerId);
  };

  // A drag that travelled more than a few pixels should not open the product.
  const swallowClick = (e) => {
    if (drag.current.moved > 6) { e.preventDefault(); e.stopPropagation(); }
    drag.current.moved = 0;
  };

  /** Keyboard arrows step by roughly one card — the strip's only keyboard route. */
  const step = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const by = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    smoothing.current = true;
    el.scrollBy({ left: dir * by, behavior: 'smooth' });
    // Re-enable wrapping once the animation has had time to settle.
    window.setTimeout(() => { smoothing.current = false; wrap(); }, 600);
  };

  // Reserve the strip's box while the products are still in flight. Returning
  // null used to collapse the section to zero height and then expand it to
  // ~620px when the API answered, which pushed everything below it down —
  // measured as a 0.2933 layout shift on the home page, the largest on the
  // site. The placeholder matches the real height so nothing moves.
  if (!list.length) {
    return (
      <section
        aria-hidden="true"
        className="relative overflow-hidden bg-obsidian py-10 md:py-14"
        style={{ minHeight: 'clamp(420px, 52vw, 620px)' }}
      />
    );
  }

  return (
    <section className="relative overflow-hidden bg-obsidian py-10 md:py-14">
      <div className="container-page mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-alabaster/60">Featured</p>
          <h2 className="mt-1 font-display text-2xl text-alabaster md:text-3xl">{title}</h2>
        </div>
        <Link
          to="/best"
          className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-widest text-alabaster/70 hover:text-alabaster md:inline-block"
        >
          View all →
        </Link>
      </div>

      <div
        className="group relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); endDrag(); }}
      >
        <div
          ref={trackRef}
          role="region"
          aria-label="Featured products — drag or swipe to browse"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onScroll={wrap}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
          }}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className={`no-scrollbar flex gap-4 overflow-x-auto px-4 md:gap-6 md:px-8 ${
            dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{
            // Horizontal panning stays with the browser so touch momentum and
            // vertical page scrolling both feel native.
            touchAction: 'pan-x pan-y',
            overscrollBehaviorX: 'contain',
            scrollbarWidth: 'none',
          }}
        >
          {loop.map((p, i) => (
            <Link
              data-card
              key={`${p._id || p.id}-${i}`}
              to={`/product/${p.slug}`}
              onClickCapture={swallowClick}
              draggable={false}
              className="group/card block w-[52vw] shrink-0 sm:w-[280px] md:w-[300px]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-graphite">
                <Img
                  src={p.images?.[0]?.url}
                  alt={p.name}
                  draggable={false}
                  className="pointer-events-none h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.05]"
                />
                {isOnSale(p) && (
                  <span className="absolute left-3 top-3 rounded-full bg-bronze px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-obsidian">
                    Sale
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className="line-clamp-1 text-[13px] font-semibold text-alabaster">{p.name}</p>
                <p className="shrink-0 text-[13px] font-semibold text-alabaster/90">{pkr(p.price)}</p>
              </div>
              {p.tier && (
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-alabaster/50">{p.tier}</p>
              )}
            </Link>
          ))}
        </div>

        {/* Gradient edges hint that the strip continues past the fold. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-obsidian to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-obsidian to-transparent md:w-24" />
      </div>

      {/* Mobile hint — shown once, then it just gets in the way. */}
      <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-alabaster/70 md:hidden">
        Swipe to browse
      </p>
    </section>
  );
}
