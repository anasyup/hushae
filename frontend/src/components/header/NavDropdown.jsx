import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/**
 * A category dropdown that a keyboard can actually open.
 *
 * The previous version was pure CSS `group-hover`, so it was unreachable
 * without a mouse and announced nothing. This keeps the hover feel — with a
 * close delay so the pointer can cross the gap — and adds the parts a
 * keyboard and a screen reader need: aria-expanded, Escape to close, arrow
 * keys to walk the list, and focus returning to the trigger on close.
 */
export default function NavDropdown({ label, to, items, linkCls, navStyle, onDark }) {
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

  // Close when focus or the pointer leaves the whole group.
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
    const idx = (i + links.length) % links.length;
    links[idx].focus();
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
            className={`mt-px transition-transform duration-base ease-standard ${open ? 'rotate-180' : ''}`}
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
          className={`absolute left-1/2 top-full z-40 -translate-x-1/2 pt-4 transition-[opacity,transform] duration-base ease-entrance ${
            open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
          }`}
        >
          <ul
            className={`min-w-[13.5rem] rounded-panel border border-line bg-alabaster p-1.5 shadow-e-4 ${onDark ? '' : ''}`}
            role="list"
          >
            {items.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/category/${c.slug}`}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className="block rounded-control px-3.5 py-2.5 text-body-sm text-ink transition-colors duration-fast hover:bg-satin/60 hover:text-obsidian"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
