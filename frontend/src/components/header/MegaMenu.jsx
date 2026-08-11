import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';

/* ============================================================================
 * MEGA MENU — exact client reference (luxury animated mega menu).
 *
 * Full-width dropdown, #FAF9F6, shadow-2xl, framer-motion opacity/y entrance:
 *   promo banner card (4/3, hover zoom + overlay) | FEATURED | Shop {label}
 *   | More — a 12-column grid with translate-x link hovers, plus an animated
 *   underline indicator (layoutId) under the trigger.
 *
 * Categories come from the `cats` array Header already fetches (first 3 →
 * "Shop {label}", the rest → "More"). Featured = /new, /best, /collection,
 * /sale routes. Keyboard arrows, Escape and aria states carried over.
 * ========================================================================== */

const HEAD = 'text-[11px] font-semibold uppercase tracking-widest text-neutral-400';
const LINK = 'inline-block text-sm tracking-wide text-neutral-800 transition-all duration-200 hover:translate-x-1.5 hover:text-black';

/* Promo per gender — reference copy with HUSHAE images. */
const PROMO = {
  men: { image: '/images/campaign/qa/hero-men.jpg', title: 'Essential Comfort', cta: 'Shop Men' },
  women: { image: '/images/campaign/qa/hero-women.jpg', title: 'Cloud Lounge Collection', cta: 'Explore Women' },
};

export default function MegaMenu({ label, to, items, linkCls, navStyle, collections = [] }) {
  const [open, setOpen] = useState(false);
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
  const promo = PROMO[to?.replace('/', '')] || { image: items.find((c) => c.image)?.image || '', title: `Shop ${label}`, cta: `Shop ${label}` };
  const categories = items.slice(0, 3);
  const more = items.slice(3);

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
        className={({ isActive }) => `${linkCls({ isActive })} relative inline-flex items-center gap-1`}
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
            size={12} strokeWidth={1.8} aria-hidden="true"
            className={`mt-px transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
        {/* Animated underline indicator — slides between items (layoutId) */}
        {open && (
          <motion.div
            layoutId="activeUnderline"
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </NavLink>

      <AnimatePresence>
        {hasItems && open && (
          <motion.div
            id={panelId}
            key="panel"
            ref={panelRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={onPanelKey}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="absolute left-0 right-0 top-full z-40 overflow-hidden border-b border-neutral-200 bg-[#FAF9F6] shadow-2xl"
          >
            <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-8 px-6 py-12 lg:px-12">
              {/* Promo banner card */}
              {promo.image && (
                <Link
                  to={to}
                  tabIndex={0}
                  onClick={() => setOpen(false)}
                  className="group relative col-span-4 overflow-hidden bg-neutral-200"
                  style={{ aspectRatio: '4 / 3' }}
                >
                  <img
                    src={promo.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/30" aria-hidden="true" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <p className="mb-2 text-lg font-light normal-case tracking-wide">{promo.title}</p>
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest underline underline-offset-4">
                      {promo.cta} <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              )}

              {/* Featured */}
              <div className="col-span-3 pl-6">
                <h4 className={`${HEAD} mb-6`}>Featured</h4>
                <ul className="space-y-4">
                  {collections.map((c) => (
                    <li key={c.href}>
                      <Link to={c.href} tabIndex={0} onClick={() => setOpen(false)} className={LINK}>
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shop {label} — first 3 categories */}
              <div className="col-span-3">
                <h4 className={`${HEAD} mb-6`}>Shop {label}</h4>
                <ul className="space-y-4">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/category/${c.slug}`} tabIndex={0} onClick={() => setOpen(false)} className={LINK}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to={to} tabIndex={0} onClick={() => setOpen(false)} className={LINK}>
                      View all {label}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* More — remaining categories */}
              {more.length > 0 && (
                <div className="col-span-2">
                  <h4 className={`${HEAD} mb-6`}>More</h4>
                  <ul className="space-y-4">
                    {more.map((c) => (
                      <li key={c.slug}>
                        <Link to={`/category/${c.slug}`} tabIndex={0} onClick={() => setOpen(false)} className={LINK}>
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
