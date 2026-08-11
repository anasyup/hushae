import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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
        className={({ isActive }) => `${linkCls({ isActive })} relative inline-flex items-center gap-1`}
        style={navStyle}
        aria-expanded={active}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          size={12} strokeWidth={1.8} aria-hidden="true"
          className={`mt-px transition-transform duration-200 ${active ? 'rotate-180' : ''}`}
        />
        {active && (
          <motion.div
            layoutId="activeUnderline"
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </NavLink>
    </div>
  );
}
