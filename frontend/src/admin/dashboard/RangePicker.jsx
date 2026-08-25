import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

/* ============================================================================
 * Date-range picker for the dashboard. No new dependency — presets plus two
 * native <input type="date"> fields for the custom range (built-in, accessible,
 * keyboard friendly).
 *
 * value shape: { preset, from, to } where from/to are 'YYYY-MM-DD' (inclusive).
 * ========================================================================== */

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
      break; // from = today 00:00
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
      to.setDate(0); // last day of previous month
      break;
    case 'this-year':
      from.setMonth(0); from.setDate(1);
      break;
    default: // custom handled outside
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

  const pretty = (ymd, withYear = false) => {
    if (!ymd) return '';
    const d = new Date(`${ymd}T00:00:00`);
    return d.toLocaleDateString('en-US', withYear
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric' });
  };
  const dateLabel = value?.from && value?.to
    ? `${pretty(value.from)} – ${pretty(value.to, true)}`
    : (RANGE_PRESETS.find((p) => p.key === preset)?.label || 'Custom');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#E7E8EC] bg-white px-3.5 text-[13px] font-medium text-[#374151] transition hover:border-[#D1D5DB] hover:bg-[#FAFAFB]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {dateLabel}
        <CalendarDays size={14} className="text-neutral-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => pick(p.key)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                preset === p.key ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {p.label}
              {p.key === 'custom' && preset === 'custom' && <span className="text-[10px] opacity-70">{value.from} → {value.to}</span>}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="mt-1 space-y-2 border-t border-neutral-100 pt-2">
              <label className="flex items-center justify-between gap-2 px-1 text-[12px] text-neutral-600">
                From
                <input
                  type="date"
                  value={value.from || ''}
                  onChange={(e) => onChange({ ...value, preset: 'custom', from: e.target.value })}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-[12px] outline-none focus:border-neutral-900"
                />
              </label>
              <label className="flex items-center justify-between gap-2 px-1 text-[12px] text-neutral-600">
                To
                <input
                  type="date"
                  value={value.to || ''}
                  onChange={(e) => onChange({ ...value, preset: 'custom', to: e.target.value })}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-[12px] outline-none focus:border-neutral-900"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
