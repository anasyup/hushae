import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Scale, Search, User, X } from 'lucide-react';
import Wordmark from '../Wordmark';
import { storefrontConfig } from '../../lib/storefrontConfig';

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/**
 * Slide-in navigation for mobile and tablet.
 *
 * Behaves like a real dialog: Escape closes, focus is trapped, the page
 * behind cannot scroll, and focus returns to the opener.
 *
 * Second-pass (mobile-first hardening):
 *  · safe-area padding clears the iOS notch and home indicator
 *  · Search, Wishlist, Compare, Account links are promoted out of the bottom
 *    button-row into a clear utility group, so a one-thumb user can reach
 *    them without opening a second drawer
 *  · FAQ / help links always present
 *  · 44px+ tap targets throughout
 */
export default function MobileDrawer({ open, onClose, menu, wCats, mCats, storeName, returnFocusTo }) {
  const panelRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])]
        .filter((n) => n.offsetParent !== null && !n.hasAttribute('disabled'));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    // Lock the page without a layout jump: replace the scrollbar with padding.
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;

    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      panelRef.current?.querySelector(FOCUSABLE)?.focus();
    }, 80);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      returnFocusTo?.current?.focus?.();
    };
  }, [open, onClose, returnFocusTo]);

  // Primary links are the non-dropdown menu items PLUS dropdown root labels.
  // Dropdown roots (Women/Men) live in their own category sections below so
  // we don't duplicate them at the top level.
  const primary = menu
    .filter((m) => m && m.label)
    .filter((m) => !m.dropdown);

  const go = (href) => (e) => {
    e.preventDefault();
    onClose();
    nav(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-obsidian/40 backdrop-blur-[2px] lg:bg-obsidian/30"
          style={{ zIndex: 'var(--z-dialog)' }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true" aria-label="Site menu"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full w-[86%] max-w-sm flex-col bg-alabaster shadow-e-4 motion-reduce:transition-none"
            style={{
              paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Head — wordmark + close, clears the notch. */}
            <div className="mb-6 flex items-center justify-between px-6">
              <Wordmark />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="-mr-3 grid h-11 w-11 place-items-center rounded-full text-obsidian transition-colors duration-base hover:bg-satin/60"
              >
                <X size={20} strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain px-3">
              {/* ── Primary navigation ─────────────────────────────────── */}
              <ul className="space-y-0.5">
                <li>
                  <Link to="/" onClick={onClose}
                    className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body font-semibold text-obsidian transition-colors duration-base ease-standard hover:bg-satin/50">
                    Home
                  </Link>
                </li>
                {primary.map((m) => (
                  <li key={m.href + m.label}>
                    <Link to={m.href || '/'} onClick={onClose}
                      className={`flex min-h-[48px] items-center rounded-control px-3 py-3 text-body font-semibold transition-colors duration-base ease-standard hover:bg-satin/50 ${
                        m.highlight ? 'text-sagedeep' : 'text-obsidian'
                      }`}>
                      {m.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* ── Utility row: Search / Wishlist / Compare / Account ── */}
              <ul className="mt-6 grid grid-cols-2 gap-2 border-t border-line pt-5">
                <li>
                  <button
                    type="button"
                    onClick={go('/search')}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control border border-line px-2 py-3 text-body-sm font-semibold text-obsidian transition-colors duration-base hover:bg-satin/50"
                  >
                    <Search size={15} strokeWidth={1.7} aria-hidden="true" /> Search
                  </button>
                </li>
                <li>
                  <Link to="/account" onClick={onClose}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control border border-line px-2 py-3 text-body-sm font-semibold text-obsidian transition-colors duration-base hover:bg-satin/50">
                    <User size={15} strokeWidth={1.7} aria-hidden="true" /> Account
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" onClick={onClose}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control border border-line px-2 py-3 text-body-sm font-semibold text-obsidian transition-colors duration-base hover:bg-satin/50">
                    <Heart size={15} strokeWidth={1.7} aria-hidden="true" /> Wishlist
                  </Link>
                </li>
                <li>
                  <Link to="/compare" onClick={onClose}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control border border-line px-2 py-3 text-body-sm font-semibold text-obsidian transition-colors duration-base hover:bg-satin/50">
                    <Scale size={15} strokeWidth={1.7} aria-hidden="true" /> Compare
                  </Link>
                </li>
              </ul>

              {/* ── Gender categories ─────────────────────────────────── */}
              {[['Women', '/women', wCats], ['Men', '/men', mCats]].map(([g, to, list]) => (
                Array.isArray(list) && list.length > 0 && (
                  <div key={g} className="mt-7 border-t border-line pt-5">
                    <p className="px-3 pb-1.5 text-label font-bold uppercase tracking-widest text-ash">
                      {storeName} — {g}
                    </p>
                    <ul>
                      {list.map((c) => (
                        <li key={c.slug}>
                          <Link to={`/category/${c.slug}`} onClick={onClose}
                            className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body-sm text-ink transition-colors duration-base ease-standard hover:bg-satin/50 hover:text-obsidian">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link to={to} onClick={onClose}
                          className="flex min-h-[48px] items-center gap-1.5 rounded-control px-3 py-3 text-caption font-bold uppercase tracking-widest text-obsidian transition-colors duration-base ease-standard hover:bg-satin/50">
                          View all {g} <span aria-hidden="true">&rarr;</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                )
              ))}

              {/* ── Help / footer links ──────────────────────────────── */}
              <div className="mt-7 border-t border-line pt-5">
                <p className="px-3 pb-1.5 text-label font-bold uppercase tracking-widest text-ash">Help</p>
                <ul>
                  <li><Link to="/faq" onClick={onClose} className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body-sm text-ink hover:bg-satin/50 hover:text-obsidian">FAQ</Link></li>
                  <li><Link to="/shipping-policy" onClick={onClose} className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body-sm text-ink hover:bg-satin/50 hover:text-obsidian">Shipping &amp; delivery</Link></li>
                  <li><Link to="/returns" onClick={onClose} className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body-sm text-ink hover:bg-satin/50 hover:text-obsidian">Returns &amp; exchange</Link></li>
                  <li><Link to="/track" onClick={onClose} className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body-sm text-ink hover:bg-satin/50 hover:text-obsidian">Track order</Link></li>
                  <li><Link to="/about" onClick={onClose} className="flex min-h-[48px] items-center rounded-control px-3 py-3 text-body-sm text-ink hover:bg-satin/50 hover:text-obsidian">About HUSHAE</Link></li>
                </ul>
              </div>
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
