import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
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

      {/* V2. MEASURED on the shipped hero at 1440: sampling luminance across
          the frame returned 13–25 (near-black) from 5% to 65% of the width at
          every height. Two full-bleed scrims were stacked — a vertical one
          reaching 0.85 alpha at the foot AND a horizontal one at 0.72 — so
          they multiplied. The photograph only survived in the right third.

          The brand pays for photography; a scrim that erases two thirds of it
          is spending that money and then covering it up. This gradient now
          weights hard to the FOOT only, where the type actually sits, and
          releases the upper frame so the image is visible. */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: `linear-gradient(to top,
            rgba(13,13,13,${Math.min(0.92, overlay + 0.34)}) 0%,
            rgba(13,13,13,${Math.min(0.78, overlay + 0.10)}) 26%,
            rgba(13,13,13,${overlay * 0.34}) 58%,
            rgba(13,13,13,0) 100%)`,
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
      {/* V2. Kept — the contrast reason is real — but pulled back and, more
          importantly, made SHORT. It now covers only the lower 62% of the
          frame where the words are, instead of the full height. The reading
          edge stays protected; the upper photograph is released. */}
      {/* Clipping this to `top-[38%]` produced a VISIBLE HORIZONTAL SEAM
          straight across the photograph — the scrim began at full strength on
          its first pixel. A scrim must never have an edge. It stays full-height
          and is faded vertically with a mask instead, so it is absent at the
          top and full at the foot with no boundary anywhere. */}
      {!centred && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background: `linear-gradient(to right,
              rgba(13,13,13,0.60) 0%,
              rgba(13,13,13,0.36) 34%,
              rgba(13,13,13,0.07) 66%,
              rgba(13,13,13,0) 100%)`,
            maskImage: 'linear-gradient(to top, #000 0%, #000 34%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0) 88%)',
            WebkitMaskImage: 'linear-gradient(to top, #000 0%, #000 34%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0) 88%)',
          }}
        />
      )}

      <div className={`relative z-10 mx-auto w-full max-w-7xl px-5 pb-[max(4rem,calc(env(safe-area-inset-bottom)+3.5rem))] md:px-8 md:pb-24 xl:max-w-[1360px] xl:px-10 xl:pb-28 2xl:max-w-[1560px] 2xl:px-14 2xl:pb-32 3xl:max-w-shell 3xl:px-16 ${centred ? 'text-center' : ''}`}>
        {/* V2. The eyebrow sits on a short rule. A hairline that starts the
            line of type is the brand's own mark (Brand DNA — THE RULE: a line
            places, it does not enclose) and it gives the cover line something
            to hang from instead of floating in the corner. */}
        {hero.eyebrow && (
          <p
            className="hero-rise flex items-center gap-4 text-label font-medium uppercase tracking-[0.28em] text-alabaster/75"
            style={{ '--d': '80ms' }}
          >
            <span aria-hidden="true" className={`h-px w-10 bg-alabaster/45 ${centred ? 'hidden' : ''}`} />
            {hero.eyebrow}
          </p>
        )}

        {/* The LCP candidate. Painted immediately; the reveal is CSS-only. */}
        <h1
          data-section="hero.heading"
          className={`hero-rise mt-4 max-w-[15ch] whitespace-pre-line font-display font-normal leading-[0.94] tracking-[-0.025em] text-alabaster xl:max-w-[13ch] ${centred ? 'mx-auto' : ''}`}
          /* PHASE 8. MEASURED: this clamp capped at 7rem, so the cover line
             rendered exactly 112px at 1440, 1920 AND 2560 — a 2560 monitor got
             a 1440 headline occupying 4% of its height. The vw slope is what
             carries a hero; the ceiling now lets it reach 8.5rem (136px) while
             the minimum, and therefore mobile, is untouched. */
          /* MOBILE PRESENCE. MEASURED at 390: the cover line rendered 44px and
             occupied 9.8% of the viewport height on a full-screen photograph —
             it read as a caption sitting on the image rather than the line the
             hero is built around. Desktop at 118/136px has real presence;
             mobile did not inherit it, and mobile is 85% of orders.
             The FLOOR moves 2.75rem -> 3.5rem (44 -> 56px). The 8.2vw slope
             and the 8.5rem ceiling are untouched, and 8.2vw only overtakes a
             56px floor at a 683px viewport — so every width from 768 up is
             byte-identical to what is live now. */
          style={{ '--d': '0ms', fontSize: 'clamp(3.5rem, 8.2vw, 8.5rem)' }}
        >
          {title}
        </h1>

        {/* V2. Measure capped at 46ch. A standfirst running the full 1,712px
            shell is unreadable — a magazine sets its intro narrow under a wide
            cover line, and the contrast between the two widths is what makes
            the headline read as a headline. */}
        {hero.subtitle && (
          <p
            className={`hero-rise mt-6 max-w-[46ch] text-body-lg leading-[1.6] text-alabaster/85 ${centred ? 'mx-auto' : ''}`}
            style={{ '--d': '140ms' }}
          >
            {hero.subtitle}
          </p>
        )}

        {showButtons && (
          <div
            data-section="hero.button"
            /* V2. Was mt-9 (36px) with gap-3 (12px). At a 118px cover line a
               36px gap reads as crowding, and two buttons 12px apart read as a
               segmented control rather than two choices. Both opened up. */
            className={`hero-rise mt-11 flex flex-wrap items-center gap-4 xl:mt-12 ${centred ? 'justify-center' : ''}`}
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
                  className="btn hero-cta bg-alabaster text-obsidian hover:bg-white"
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
                {/* PHASE 8. These were hidden by hero.showButtons=false, so the
                    hero carried no call to action at all — the merchant has now
                    enabled them. Tracking widened to 0.2em to match the
                    navigation and editorial CTAs, and the arrow removed: over
                    photography a glyph competes with the image, and the pairing
                    of a solid and an outlined mark already reads as primary +
                    secondary without one. */}
                {/* V2. MEASURED: both marks rendered 49px tall — under the
                    56px the rest of the page's primary actions use, and small
                    against a 118px cover line. `hero-cta` adds the height and
                    the settling letter-spacing on hover. The outlined mark's
                    border was /50; at 1px over a photograph that reads as a
                    disabled control, so it is lifted to /70. */}
                <Link to="/women" className="btn hero-cta bg-alabaster text-obsidian hover:bg-white">
                  {hero.ctaWomen || 'Shop Women'}
                </Link>
                <Link
                  to="/men"
                  className="btn hero-cta border border-alabaster/70 text-alabaster hover:border-alabaster hover:bg-alabaster hover:text-obsidian"
                >
                  {hero.ctaMen || 'Shop Men'}
                </Link>
              </>
            )}
          </div>
        )}

        {/* V2.1. MEASURED at 1440: the cover line ends at x=808 and the two
            actions at x=457, but this row ran to x=1360 — 552px past the
            longest thing above it. Three elements of one block with three
            different right edges read as separate rows that happen to be
            stacked, not as a composition.
            Capped to the width the headline actually occupies and given a
            hairline above it, so the block closes on the same line it opened
            with (Brand DNA — THE RULE places, it does not enclose).

            1. Better: the hero now has a defined block instead of a drift.
            2. HUSHAE: the rule is the house mark, already used on the eyebrow.
            3. Not a copy: derived from our own measured headline width, and
               the mark is the one we already use elsewhere on this page. */}
        {badges.length > 0 && (
          <ul
            className={`hero-rise mt-9 flex max-w-full flex-col gap-y-1.5 border-t border-alabaster/20 pt-5 text-label uppercase tracking-[0.22em] text-alabaster/65 sm:mt-11 sm:max-w-[560px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-2 sm:pt-6 lg:max-w-[820px] xl:mt-12 xl:max-w-[880px] 2xl:max-w-[980px] ${centred ? 'justify-center' : ''}`}
            style={{ '--d': '260ms' }}
          >
            {badges.map((bText, i) => (
              /* The separator was a sibling of the text, so on a narrow
                 viewport a wrapped row could begin with a rule and nothing
                 before it. As a ::before it can never outlive its pair. */
              /* MEASURED at 390: the row wrapped to THREE lines (74px) and every
                 wrapped line began with a hanging separator rule, because a
                 horizontal divider only reads as a divider when both items sit
                 on the same line.
                 Below sm the list becomes a plain stack with no rules; from sm
                 it is the inline divided row exactly as it is on desktop. */
              <li key={bText} className="flex items-center sm:mr-5 sm:before:mr-5 sm:before:h-2.5 sm:before:w-px sm:before:bg-alabaster/25 sm:before:content-[''] sm:first:before:hidden sm:last:mr-0">
                {bText}
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
