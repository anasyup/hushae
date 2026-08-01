import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import HeroMedia from './HeroMedia';

/* Shipped fallback so the hero is never an empty black frame. Overridden by
   settings.hero.poster or settings.hero.image the moment either is set. */
const DEFAULT_HERO_STILL = '/images/hero/hero-still.jpg';

/* ============================================================================
 * Full-bleed hero.
 *
 * Content is bottom-left, the way a printed editorial sets a cover line: the
 * image owns the frame and the type sits in the quiet corner. Everything is
 * admin-editable from /admin/theme.
 *
 * Two deliberate decisions worth knowing:
 *
 * 1. The first paint is CSS, not JavaScript. The wordmark-scale headline is
 *    painted by the server-sent HTML and revealed with a pure CSS animation,
 *    so the largest text is never gated behind React hydration or a
 *    framer-motion tick. Before this the whole block mounted at opacity:0 and
 *    animated in, which delays what the browser can count as LCP.
 *
 * 2. Height is 100svh, not 100vh. On mobile Safari `vh` includes the URL bar,
 *    so a 100vh hero is taller than the visible viewport and the CTA sits
 *    below the fold until the user scrolls.
 * ========================================================================== */
export default function HeroFullScreen({ hero }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);

  const centred = hero.align === 'center';
  const overlay = Math.max(0, Math.min(100, Number(hero.overlayOpacity ?? 55))) / 100;

  const shopMenu = Array.isArray(hero.shopMenu) && hero.shopMenu.length ? hero.shopMenu : [
    { label: 'New Arrivals', href: '/new' },
    { label: 'Women', href: '/women' },
    { label: 'Men', href: '/men' },
    { label: 'Sale', href: '/sale' },
  ];

  const title = hero.title || 'Second Skin,\nFirst Choice.';
  const badges = Array.isArray(hero.badges) ? hero.badges.filter(Boolean) : [];
  const showButtons = hero.showButtons !== false;

  // Close the shop menu on outside click, and on Escape with focus restored.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      menuBtnRef.current?.focus();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  return (
    <section
      data-section="hero"
      aria-label="Featured"
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-obsidian"
    >
      {/* MEASURED, Phase 2 audit: on a 390px viewport the hero rendered PURE
          BLACK for the whole of first paint. settings.hero.video is a 7.5 MB
          MP4 and both `image` and `poster` were empty, so HeroMedia had
          nothing to show while the video downloaded and decoded
          (videoWidth was still 0 after six seconds, opacity 0).

          The most important pixel on the shop was a black rectangle.

          A packaged fallback still fixes it without a database write, and the
          merchant can still override it from Admin -> Content exactly as
          before — this is the same defaulting pattern the title above uses.
          The still is 6 KB as 400px AVIF through the existing pipeline. */}
      <HeroMedia
        video={hero.video}
        image={hero.image}
        poster={hero.poster || hero.image || DEFAULT_HERO_STILL}
      />

      {/* Two-stop scrim. A single flat wash either greys the image or leaves
          the type unreadable; weighting it to the bottom keeps the picture
          bright where it matters and the words legible where they sit. */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: `linear-gradient(to top,
            rgba(13,13,13,${Math.min(0.94, overlay + 0.3)}) 0%,
            rgba(13,13,13,${Math.min(0.9, overlay + 0.08)}) 22%,
            rgba(13,13,13,${overlay * 0.55}) 58%,
            rgba(13,13,13,${Math.max(0, overlay - 0.32)}) 100%)`,
        }}
      />

      {/* HORIZONTAL SCRIM — added in Phase 2 after measuring real pixels.
          The vertical gradient above darkens top-to-bottom, which was enough
          against the old flat-black hero. With a real photograph the light
          shaft on the RIGHT stays bright, and sampling 8,908 background pixels
          behind the headline found a worst case of 2.45:1 against ivory type —
          under the 3.0:1 AA floor for large text.

          This darkens the reading edge only, so the subject and the light keep
          their contrast and the type keeps its legibility. Skipped entirely
          when the hero is centre-aligned, where there is no single reading
          edge to protect. */}
      {!centred && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background: `linear-gradient(to right,
              rgba(13,13,13,0.72) 0%,
              rgba(13,13,13,0.55) 28%,
              rgba(13,13,13,0.16) 62%,
              rgba(13,13,13,0) 100%)`,
          }}
        />
      )}

      <div className={`relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 md:px-8 md:pb-24 xl:max-w-[1360px] xl:px-10 xl:pb-28 2xl:max-w-[1560px] 2xl:px-14 2xl:pb-32 3xl:max-w-shell 3xl:px-16 ${centred ? 'text-center' : ''}`}>
        {hero.eyebrow && (
          <p className="hero-rise text-label font-semibold uppercase text-alabaster/75" style={{ '--d': '80ms' }}>
            {hero.eyebrow}
          </p>
        )}

        {/* The LCP candidate. Painted immediately; the reveal is CSS-only. */}
        <h1
          data-section="hero.heading"
          className={`hero-rise mt-4 max-w-[15ch] whitespace-pre-line font-display font-normal leading-[0.98] tracking-[-0.02em] text-alabaster ${centred ? 'mx-auto' : ''}`}
          style={{ '--d': '0ms', fontSize: 'clamp(2.75rem, 8.2vw, 7rem)' }}
        >
          {title}
        </h1>

        {hero.subtitle && (
          <p
            className={`hero-rise mt-6 max-w-lg text-body-lg leading-relaxed text-alabaster/80 ${centred ? 'mx-auto' : ''}`}
            style={{ '--d': '140ms' }}
          >
            {hero.subtitle}
          </p>
        )}

        {showButtons && (
          <div
            data-section="hero.button"
            className={`hero-rise mt-9 flex flex-wrap items-center gap-3 ${centred ? 'justify-center' : ''}`}
            style={{ '--d': '200ms' }}
          >
            {hero.ctaStyle === 'dropdown' ? (
              <div className="relative" ref={menuRef}>
                <button
                  ref={menuBtnRef}
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="btn btn-lg bg-alabaster text-obsidian hover:bg-white"
                >
                  {hero.ctaWomen || 'Shop Now'}
                  <ChevronDown
                    size={15} strokeWidth={2} aria-hidden="true"
                    className={`transition-transform duration-base ease-standard ${menuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div
                  role="menu"
                  aria-label="Shop"
                  className={`absolute left-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-panel bg-alabaster shadow-e-4 transition-[opacity,transform] duration-base ease-entrance ${
                    menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
                  }`}
                >
                  {shopMenu.map((it, i) => (
                    <Link
                      key={`${it.label}-${i}`}
                      to={it.href || '/shop'}
                      role="menuitem"
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setMenuOpen(false)}
                      className="block px-5 py-3 text-body-sm font-medium text-obsidian transition-colors duration-fast hover:bg-satin"
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Link to="/women" className="btn btn-lg bg-alabaster text-obsidian hover:bg-white">
                  {hero.ctaWomen || 'Shop Women'}
                  <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link
                  to="/men"
                  className="btn btn-lg border border-alabaster/45 text-alabaster hover:border-alabaster hover:bg-alabaster hover:text-obsidian"
                >
                  {hero.ctaMen || 'Shop Men'}
                </Link>
              </>
            )}
          </div>
        )}

        {badges.length > 0 && (
          <ul
            className={`hero-rise mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-label uppercase text-alabaster/70 ${centred ? 'justify-center' : ''}`}
            style={{ '--d': '260ms' }}
          >
            {badges.map((bText, i) => (
              <li key={bText} className="flex items-center gap-5">
                {bText}
                {i < badges.length - 1 && <span className="h-2.5 w-px bg-alabaster/25" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Scroll affordance. Decorative — the page is fully usable without it,
          so it is hidden from assistive tech rather than announced. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-5 z-10 hidden justify-center md:flex"
      >
        <span className="hero-cue h-9 w-px bg-gradient-to-b from-transparent via-alabaster/45 to-transparent" />
      </div>
    </section>
  );
}
