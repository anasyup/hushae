/* ============================================================================
 * Admin UI — Dropdown
 * Surface-3 panel, subtle border, 8px radius, md shadow. Items 36px,
 * hover surface-2, selected accent-soft. Escape/outside click close.
 * ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({
  trigger,
  label,
  items = [],
  selected,
  onSelect,
  align = 'left',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-2 px-3 text-[13px] font-medium text-admin-text-2 transition hover:bg-admin-surface-3 hover:text-admin-text"
      >
        {trigger || label}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-1 min-w-[180px] rounded-lg border border-admin-border bg-admin-surface-3 py-1 shadow-md ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((it, i) => (
            <button
              key={it.value ?? i}
              role="menuitemradio"
              aria-checked={selected === it.value}
              onClick={() => {
                onSelect?.(it.value);
                setOpen(false);
              }}
              className={`flex min-h-[36px] w-full items-center gap-2 px-3 text-left text-[13px] transition ${
                selected === it.value
                  ? 'bg-admin-accent-soft text-admin-text'
                  : 'text-admin-text-2 hover:bg-admin-surface-2'
              }`}
            >
              {it.icon && <span className="text-admin-text-muted">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
