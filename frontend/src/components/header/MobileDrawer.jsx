import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, User, X } from 'lucide-react';
import Wordmark from '../Wordmark';

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/**
 * Slide-in navigation for mobile and tablet.
 *
 * Behaves like a real dialog: Escape closes it, focus is trapped inside while
 * it is open, the page behind cannot scroll, and focus returns to the button
 * that opened it. None of that was true before.
 */
export default function MobileDrawer({ open, onClose, menu, wCats, mCats, storeName, returnFocusTo }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])]
        .filter((n) => n.offsetParent !== null);
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
    }, 60);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      returnFocusTo?.current?.focus?.();
    };
  }, [open, onClose, returnFocusTo]);

  const flat = menu.filter((m) => m && m.label && !m.dropdown);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-obsidian/40 backdrop-blur-[2px] lg:bg-obsidian/30"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true" aria-label="Site menu"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="on-dark-none h-full w-[86%] max-w-xs overflow-y-auto bg-alabaster p-6 shadow-e-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-7 flex items-center justify-between">
              <Wordmark />
              <button type="button" onClick={onClose} aria-label="Close menu" className="btn-icon -mr-2">
                <X size={20} strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Main">
              <ul className="space-y-0.5">
                {[['/', 'Home'], ...flat.map((m) => [m.href || '/', m.label])].map(([to, label]) => (
                  <li key={to + label}>
                    <Link to={to} onClick={onClose}
                      className="block rounded-control px-3 py-3 text-body font-semibold text-obsidian transition-colors duration-fast hover:bg-satin/50">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              {[['Women', '/women', wCats], ['Men', '/men', mCats]].map(([g, to, list]) => (
                list.length > 0 && (
                  <div key={g} className="mt-7">
                    <Link to={to} onClick={onClose}
                      className="block px-3 pb-1 text-label font-bold uppercase text-ash">
                      {storeName} — {g}
                    </Link>
                    <ul>
                      {list.map((c) => (
                        <li key={c.slug}>
                          <Link to={`/category/${c.slug}`} onClick={onClose}
                            className="block rounded-control px-3 py-2.5 text-body-sm text-ink transition-colors duration-fast hover:bg-satin/50 hover:text-obsidian">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}

              <div className="mt-7 flex gap-2 border-t border-line pt-5">
                <Link to="/wishlist" onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-control border border-line py-3 text-body-sm font-semibold text-obsidian transition-colors duration-fast hover:bg-satin/50">
                  <Heart size={15} strokeWidth={1.7} aria-hidden="true" /> Wishlist
                </Link>
                <Link to="/account" onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-control border border-line py-3 text-body-sm font-semibold text-obsidian transition-colors duration-fast hover:bg-satin/50">
                  <User size={15} strokeWidth={1.7} aria-hidden="true" /> Account
                </Link>
              </div>
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
