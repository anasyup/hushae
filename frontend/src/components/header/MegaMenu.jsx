import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/* ============================================================================
 * MEGA MENU TRIGGER — exact client reference v2.
 * Just the nav trigger (label + rotating chevron + animated underline).
 * The full-width dropdown panel lives in Header as a direct child (MegaPanel),
 * driven by the header's `mega` state via onOpen/active.
 * ========================================================================== */

export default function MegaMenu({ label, to, linkCls, navStyle, active, onOpen, onClose }) {
  const triggerRef = useRef(null);

  const onTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      onOpen();
    } else if (e.key === 'Escape') {
      onClose();
      triggerRef.current?.focus();
    }
  };

  return (
    <div className="relative flex h-full items-center">
      <NavLink
        ref={triggerRef}
        to={to}
        onMouseEnter={onOpen}
        onKeyDown={onTriggerKey}
        className={({ isActive }) => `${linkCls({ isActive })} relative inline-flex items-center gap-1 transition-colors ${active ? 'border-b-2 border-black font-semibold' : ''}`}
        style={navStyle}
        aria-expanded={active}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          size={12} strokeWidth={2.5} aria-hidden="true"
          className={`mt-px transition-transform duration-200 ${active ? 'rotate-180' : ''}`}
        />
      </NavLink>
    </div>
  );
}
