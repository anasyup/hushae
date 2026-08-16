import { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';

/* ============================================================================
 * "Customize" — simple persistent widget visibility. No drag-and-drop engine:
 * the architecture has no server-side layout store, so this is the lightweight
 * fallback from the brief (hide widgets, saved in localStorage, survives refresh).
 * ========================================================================== */

const KEY = 'hushae.dashWidgets';

export const WIDGETS = [
  { key: 'attention', label: 'Attention centre' },
  { key: 'kpis', label: 'Key metrics' },
  { key: 'sales', label: 'Sales overview + order status' },
  { key: 'pipeline', label: 'Order pipeline' },
  { key: 'payments', label: 'Payment health + peak hours' },
  { key: 'health', label: 'Store health + activity' },
  { key: 'goal', label: 'Revenue goal + insight' },
  { key: 'pnl', label: 'Profit & loss' },
  { key: 'reasons', label: 'Cancellation reasons + abandoned carts' },
  { key: 'lists', label: 'Best sellers + recent orders' },
  { key: 'lowtop', label: 'Low stock + top customers' },
];

export function readWidgetPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return raw; // { key: true/false }
  } catch { /* ignore */ }
  return null;
}

export function useWidgetVisibility() {
  const [prefs, setPrefs] = useState(() => readWidgetPrefs());
  const visible = (key) => (prefs ? prefs[key] !== false : true);
  const toggle = (key) => {
    const next = { ...(prefs || {}), [key]: !visible(key) };
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  return { visible, toggle };
}

export default function CustomizeWidgets({ visible, toggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--px-bg-hover)]"
        style={{ borderColor: 'var(--px-border)', color: 'var(--px-secondary)' }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <LayoutGrid size={13} strokeWidth={1.5} /> Customize
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-[10px] border p-1.5" style={{ background: 'var(--px-bg-card)', borderColor: 'var(--px-border)', boxShadow: 'var(--px-shadow-pop)' }}>
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Dashboard widgets</p>
          <p className="px-3 pb-2 text-[11px]" style={{ color: 'var(--px-faint)' }}>Hide or show sections. Saved on this device.</p>
          <div className="max-h-72 overflow-y-auto">
            {WIDGETS.map((w) => (
              <label key={w.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-2 transition-colors hover:bg-[var(--px-bg-hover)]">
                <span className="text-[13px]" style={{ color: 'var(--px-secondary)' }}>{w.label}</span>
                <input
                  type="checkbox"
                  checked={visible(w.key)}
                  onChange={() => toggle(w.key)}
                  className="h-4 w-4 cursor-pointer rounded accent-[var(--px-accent)]"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
