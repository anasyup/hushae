import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/* ============================================================================
 * MEGA MENU — Calvin Klein reference structure.
 *
 * Layout (mirrors the client's reference HTML/CSS):
 *   promo-card (image + "Shop …" button) | FEATURED column | category columns
 *
 * Built from the SAME `cats` array the Header already fetches (5 categories
 * per gender) plus the shop's own /new, /best, /collection and /sale routes.
 * Accessibility (keyboard arrows, Escape, aria-expanded/controls) carried
 * over from the previous implementation — measured working.
 * ========================================================================== */

const COL_HEAD = 'text-[11px] font-medium uppercase tracking-[0.08em] text-[#767676]';
const LINK = 'block text-[13px] text-[#333333] transition-colors duration-150 hover:text-black hover:underline';

export default function MegaMenu({ label, to, items, linkCls, navStyle, onDark, collections = [] }) {
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
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
  /* Promo image — first category with an image for this gender. */
  const promo = items.find((c) => c.image) || null;
  /* Split the gender's categories into two columns (3 + 2). */
  const half = Math.ceil(items.length / 2);
  const colA = items.slice(0, half);
  const colB = items.slice(half);

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
            size={12} strokeWidth={1.8} aria-hidden="true"
            className={`mt-px transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
          className={`absolute top-full z-40 w-[min(64rem,calc(100vw-3rem))] pt-3 transition-[opacity,transform] duration-200 ease-out ${
            open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
          }`}
          style={shift === null
            ? { left: 0, transform: 'translateX(-50%)', visibility: 'hidden' }
            : { left: `${shift}px`, transform: 'translateX(-50%)' }}
        >
          <div className="overflow-hidden border border-[#e5e5e5] bg-white shadow-[0_10px_20px_rgba(0,0,0,0.03)]">
            <div className="mx-auto flex max-w-[1600px] gap-10 px-10 py-8">
              {/* ── Promo card (image + button) ─────────────────────────── */}
              {promo && (
                <Link
                  to={to}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className="group block w-[200px] shrink-0"
                >
                  <span className="block overflow-hidden bg-[#f5f5f5]">
                    <img
                      src={promo.image}
                      alt=""
                      loading="lazy"
                      className="h-[260px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="mt-3 block bg-[#28231E] py-2 text-center text-[11px] tracking-[0.02em] text-white">
                    Shop {label}
                  </span>
                </Link>
              )}

              {/* ── FEATURED column ─────────────────────────────────────── */}
              <div className="w-44 shrink-0">
                <span className={`${COL_HEAD} mb-4 block`}>Featured</span>
                <ul className="space-y-2.5">
                  {collections.map((c) => (
                    <li key={c.href}>
                      <Link
                        to={c.href}
                        tabIndex={open ? 0 : -1}
                        onClick={() => setOpen(false)}
                        className={`${LINK} ${c.bold ? 'font-medium text-black' : ''}`}
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
                      className="mt-1 inline-block text-[12px] font-medium uppercase tracking-[0.08em] text-black underline underline-offset-4"
                    >
                      View all {label} →
                    </Link>
                  </li>
                </ul>
              </div>

              {/* ── Category column A ───────────────────────────────────── */}
              <div className="min-w-0 flex-1">
                <span className={`${COL_HEAD} mb-4 block`}>Shop {label}</span>
                <ul className="space-y-2.5">
                  {colA.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to={`/category/${c.slug}`}
                        tabIndex={open ? 0 : -1}
                        onClick={() => setOpen(false)}
                        className={LINK}
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Category column B ───────────────────────────────────── */}
              {colB.length > 0 && (
                <div className="min-w-0 flex-1">
                  <span className={`${COL_HEAD} mb-4 block`}>More</span>
                  <ul className="space-y-2.5">
                    {colB.map((c) => (
                      <li key={c.slug}>
                        <Link
                          to={`/category/${c.slug}`}
                          tabIndex={open ? 0 : -1}
                          onClick={() => setOpen(false)}
                          className={LINK}
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
