import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

/* ============================================================================
 * Date-range picker — quiet text trigger + minimal white popover. No new
 * dependency: presets + two native <input type="date"> fields for custom.
 * value shape: { preset, from, to } (YYYY-MM-DD, inclusive).
 * ========================================================================== */

const INK = 'var(--px-ink)';
const MUTED = 'var(--px-muted)';
const HAIRLINE = 'var(--px-border)';
const ACCENT = 'var(--px-accent-soft-text)';

const iso = (d) => d.toISOString().slice(0, 10);

export function resolvePreset(preset) {
  return presetRange(preset);
}

function presetRange(preset) {
  const now = new Date();
  const to = new Date(now); to.setHours(23, 59, 59, 999);
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today':
      break;
    case '7d':
      from.setDate(from.getDate() - 6);
      break;
    case '30d':
      from.setDate(from.getDate() - 29);
      break;
    case 'this-month':
      from.setDate(1);
      break;
    case 'last-month':
      from.setDate(1); from.setMonth(from.getMonth() - 1);
      to.setDate(0);
      break;
    case 'this-year':
      from.setMonth(0); from.setDate(1);
      break;
    default:
      return null;
  }
  return { from: iso(from), to: iso(to) };
}

export const RANGE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

export default function RangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const preset = value?.preset || '30d';

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, []);

  const pick = (key) => {
    setOpen(false);
    if (key === 'custom') {
      const r = presetRange('30d');
      onChange({ preset: 'custom', from: value?.from || r.from, to: value?.to || r.to });
      return;
    }
    const r = presetRange(key);
    onChange({ preset: key, from: r.from, to: r.to });
  };

  const label = RANGE_PRESETS.find((p) => p.key === preset)?.label || 'Custom';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-[13px] transition-opacity hover:opacity-60"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ color: INK }}
      >
        <CalendarDays size={13} strokeWidth={1.5} style={{ color: MUTED }} />
        {label}
        {preset === 'custom' && value?.from && value?.to && (
          <span className="text-[12px]" style={{ color: MUTED }}>{value.from} → {value.to}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg bg-white p-1.5 shadow-sm" style={{ border: `1px solid ${HAIRLINE}` }}>
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => pick(p.key)}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-[13px] transition-colors"
              style={preset === p.key ? { color: INK, fontWeight: 500 } : { color: INK }}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="mt-1 space-y-2 border-t pt-2" style={{ borderColor: HAIRLINE }}>
              <label className="flex items-center justify-between gap-2 px-1 text-[12px]" style={{ color: MUTED }}>
                From
                <input type="date" value={value.from || ''} onChange={(e) => onChange({ ...value, preset: 'custom', from: e.target.value })} className="rounded border px-2 py-1 text-[12px] outline-none" style={{ borderColor: HAIRLINE, color: INK }} />
              </label>
              <label className="flex items-center justify-between gap-2 px-1 text-[12px]" style={{ color: MUTED }}>
                To
                <input type="date" value={value.to || ''} onChange={(e) => onChange({ ...value, preset: 'custom', to: e.target.value })} className="rounded border px-2 py-1 text-[12px] outline-none" style={{ borderColor: HAIRLINE, color: INK }} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
