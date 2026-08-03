import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Img from '../Img';

/* ============================================================================
 * MEGA MENU
 *
 * Replaces NavDropdown's utility list for the two gendered entries. MEASURED
 * on live before writing this: the Women panel was a 216 x 234px box holding
 * five text rows — no imagery, no headings, no grouping, display:block. It is
 * a functional menu and it reads like one; a fashion house's navigation is
 * part of the shopfront, not a filing cabinet.
 *
 * WHAT IT REUSES, AND WHY NOTHING NEW IS FETCHED
 * The brief lists Dresses / Tops / Outerwear / Shoes / Bags for Women and
 * Shirts / Pants / Jackets for Men. HUSHAE does not sell those — the live
 * catalogue is 10 innerwear categories, 5 per gender, and inventing menu
 * entries that lead to empty grids would be worse navigation, not better.
 * So the panel is built from the SAME `cats` array the old dropdown used
 * (already fetched once in Header), plus:
 *   · category imagery — every one of the 10 categories already carries an
 *     `image`, all 10 are in the AVIF manifest at 400w. Zero new assets.
 *   · the shop's own /new, /best and /sale routes as the "Collections" rung.
 * No new endpoint, no new model, no duplicated data.
 *
 * ACCESSIBILITY IS CARRIED OVER WHOLESALE, NOT REWRITTEN
 * NavDropdown's keyboard contract was measured working (ArrowDown enters the
 * list, Escape closes and restores focus to the trigger, aria-expanded flips
 * correctly). That behaviour is reproduced here deliberately rather than
 * redesigned, because it already passed.
 * ========================================================================== */

/* Editorial one-liners. Keyed by the live category slugs, with a neutral
   fallback, so an unknown slug renders without a hole and a merchant adding a
   category never has to touch this file. */
const BLURB = {
  bras: 'Support that disappears under everything.',
  panties: 'Seamless, every day of the week.',
  shapewear: 'Quiet structure, nothing to announce.',
  'sleepwear-loungewear': 'For slow mornings and long evenings.',
  'camisoles-slips': 'The layer that finishes the look.',
  briefs: 'The everyday cut, refined.',
  boxers: 'Room to move, cut to last.',
  trunks: 'Shorter, sharper, stays put.',
  'vests-undershirts': 'The base layer, done properly.',
  'thermal-sports': 'Warmth and performance without bulk.',
};

export default function MegaMenu({ label, to, items, linkCls, navStyle, onDark, collections = [] }) {
  const [open, setOpen] = useState(false);
  /* Horizontal offset that centres the panel on the VIEWPORT.
     It cannot be pure CSS: `absolute left` resolves against the wrapper, and
     the header group carries a transform (its hide-on-scroll translate), which
     makes it the containing block for `position: fixed` too — so neither
     `left: 50vw` nor `fixed` reaches the viewport. Measured on open only, so
     there is no scroll-time cost. */
  const [shift, setShift] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);
  const panelId = useId();

  const cancelClose = () => { clearTimeout(closeTimer.current); };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  /* Measured on mount and on resize — NOT only while open. MEASURED bug: with
     the offset applied lazily, the closed panel kept `left: auto`, so its
     736px box started at the trigger's x and reached 1058px inside a 1024px
     viewport. An invisible box still occupies layout, so the PAGE carried a
     horizontal scrollbar at 1024px before anyone hovered anything. */
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      // Distance from this trigger's left edge to the middle of the screen.
      setShift(Math.round(window.innerWidth / 2 - el.getBoundingClientRect().left));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onFocusIn = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const focusItem = (i) => {
    const links = panelRef.current?.querySelectorAll('a');
    if (!links?.length) return;
    links[(i + links.length) % links.length].focus();
  };

  const onTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !open)) {
      if (!items.length) return;
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    }
  };

  const onPanelKey = (e) => {
    const links = [...(panelRef.current?.querySelectorAll('a') || [])];
    const at = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(at + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(at - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); focusItem(links.length - 1); }
    else if (e.key === 'Tab') { setOpen(false); }
  };

  const hasItems = items.length > 0;
  /* The panel leads with one category photograph. items[0] is the first
     category for this gender, which is stable per gender and already in the
     manifest — so the image is never a new download decision made at runtime. */
  const feature = items.find((c) => c.image) || null;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => { cancelClose(); if (hasItems) setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <NavLink
        ref={triggerRef}
        to={to}
        className={({ isActive }) => `${linkCls({ isActive })} inline-flex items-center gap-1`}
        style={navStyle}
        aria-expanded={hasItems ? open : undefined}
        aria-controls={hasItems && open ? panelId : undefined}
        aria-haspopup={hasItems ? 'true' : undefined}
        onKeyDown={onTriggerKey}
        onFocus={() => { if (hasItems) cancelClose(); }}
      >
        {label}
        {hasItems && (
          <ChevronDown
            size={12} strokeWidth={2} aria-hidden="true"
            className={`mt-px transition-transform duration-base ease-standard motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          />
        )}
      </NavLink>

      {hasItems && (
        <div
          id={panelId}
          ref={panelRef}
          onKeyDown={onPanelKey}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          /* `absolute`, NOT `fixed`, and that distinction cost a measured bug:
             the header group carries `translate-y-0` for its hide-on-scroll
             transform, and a transformed ancestor becomes the containing block
             for a fixed child — so `top: var(--hdr-bottom)` resolved against
             the header, not the viewport, and the panel opened 75px below the
             bar with a hole between them.
             Anchored to the trigger with top-full instead. The width is capped
             at the viewport minus the page gutter, and `right-auto/left-0` is
             overridden below for the second menu so neither panel can run off
             the right edge. */
          className={`absolute top-full z-40 w-[min(46rem,calc(100vw-3rem))] pt-3 transition-[opacity,transform] duration-base ease-entrance motion-reduce:transition-none ${
            open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
          }`}
          /* MEASURED regression at 1024px: anchoring with `left-0` starts the
             736px panel at the trigger's own x. The Women trigger sits ~322px
             in, so the panel reached 1058px against a 1024px viewport and the
             PAGE gained a horizontal scrollbar — even while closed, because an
             invisible box still occupies layout.
             Centred on the viewport instead, using a measured offset (see the
             `shift` state above). Clean at 1024 through 1920. */
          style={shift === null
            /* Before the first measurement the panel is parked off-canvas
               instead of at left:auto, so it can never widen the document. */
            ? { left: 0, transform: 'translateX(-50%)', visibility: 'hidden' }
            : { left: `${shift}px`, transform: 'translateX(-50%)' }}
        >
          <div className="overflow-hidden rounded-panel border border-line bg-alabaster shadow-e-4">
            <div className="grid gap-7 p-6 md:grid-cols-[1.15fr_0.85fr_minmax(0,11rem)] lg:gap-8">

              {/* ── Categories ─────────────────────────────────────────── */}
              <div>
                <p className="text-label font-bold uppercase tracking-widest text-ash">Shop {label}</p>
                <ul className="mt-4 space-y-0.5">
                  {items.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to={`/category/${c.slug}`}
                        tabIndex={open ? 0 : -1}
                        onClick={() => setOpen(false)}
                        className="group/i block rounded-control px-3 py-2 transition-colors duration-base ease-standard hover:bg-satin/50"
                      >
                        <span className="block text-body font-medium text-obsidian">{c.name}</span>
                        <span className="mt-0.5 block text-caption text-ash">
                          {BLURB[c.slug] || `Explore ${c.name.toLowerCase()}.`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Collections — the shop's real routes, not invented ones ─ */}
              <div>
                <p className="text-label font-bold uppercase tracking-widest text-ash">Collections</p>
                <ul className="mt-4 space-y-0.5">
                  {collections.map((c) => (
                    <li key={c.href}>
                      <Link
                        to={c.href}
                        tabIndex={open ? 0 : -1}
                        onClick={() => setOpen(false)}
                        className="block rounded-control px-3 py-2 text-body text-ink transition-colors duration-base ease-standard hover:bg-satin/50 hover:text-obsidian"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      to={to}
                      tabIndex={open ? 0 : -1}
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-caption font-bold uppercase tracking-widest text-obsidian underline-offset-4 transition-colors duration-base ease-standard hover:underline"
                    >
                      View all {label}
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* ── Featured image ─────────────────────────────────────── */}
              {feature && (
                <Link
                  to={`/category/${feature.slug}`}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className="group/f hidden md:block"
                >
                  {/* aspect-[4/5] reserves the box before the AVIF decodes, so
                      opening the panel cannot shift its own contents. */}
                  <span className="block overflow-hidden rounded-card bg-cream">
                    <Img
                      src={feature.image}
                      alt=""
                      sizes="176px"
                      className="aspect-[4/5] w-full object-cover transition-transform duration-slow ease-standard group-hover/f:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/f:scale-100"
                    />
                  </span>
                  <span className="mt-3 block text-label font-bold uppercase tracking-widest text-ash">Featured</span>
                  <span className="mt-1 block font-display text-h5 text-obsidian">{feature.name}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
