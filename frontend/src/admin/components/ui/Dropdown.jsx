/* ============================================================================
 * Admin UI — Dropdown (Phase 03-R)
 * Flat sharp menu: black surface, hairline border, 4px radius, flat rows.
 * Escape / outside click close. Selected = white/10, no colored tints.
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
        className="inline-flex h-9 items-center gap-1.5 rounded-[4px] border border-white/20 px-3 text-[10px] font-medium uppercase tracking-[0.1em] text-white/80 transition-colors hover:border-white/40 hover:text-white"
      >
        {trigger || label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-1 min-w-[180px] rounded-[4px] border border-white/15 bg-[#0D0D0D] py-1 ${
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
              className={`flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] transition-colors ${
                selected === it.value
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {it.icon && <span className="text-white/40">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
