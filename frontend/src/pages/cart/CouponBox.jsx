import { useId, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, X } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * HUSHAE CouponBox — Minimalist Luxury Promo Code Suite
 * ========================================================================== */

export default function CouponBox({ subtotal, applied, onApply, onRemove }) {
  const [open, setOpen] = useState(!!applied);
  const [code, setCode] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const panelId = useId();
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim();
    if (!c || state === 'loading') return;
    setState('loading'); setError('');
    try {
      const r = await api('/discounts/validate', { method: 'POST', body: { code: c, subtotal } });
      if (!r || !r.discount) throw new Error(r?.message || 'This code cannot be applied to your bag');
      onApply({ code: r.code, discount: r.discount, type: r.type, value: r.value });
      setState('idle'); setCode('');
    } catch (err) {
      setError(err?.message || 'Invalid promo code');
      setState('error');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  /* Applied State */
  if (applied) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Check size={11} strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-950 truncate">
              {applied.code} Applied
            </p>
            <p className="text-[11px] text-emerald-700 font-light">
              You saved {pkr(applied.discount)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { onRemove(); setOpen(true); setState('idle'); }}
          className="text-emerald-700 hover:text-emerald-950 text-xs font-medium underline underline-offset-2 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  /* Collapsed / Expanded Input */
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => { const n = !open; setOpen(n); if (n) requestAnimationFrame(() => inputRef.current?.focus()); }}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center justify-between w-full text-xs text-neutral-500 hover:text-black transition-colors"
      >
        <span className="underline underline-offset-4">Add promo or discount code</span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? 'rotate-180 text-black' : ''}`}
        />
      </button>

      {open && (
        <form onSubmit={submit} className="space-y-1.5 pt-1">
          <div className="flex gap-2">
            <input
              id={`${panelId}-in`}
              ref={inputRef}
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); if (state === 'error') { setState('idle'); setError(''); } }}
              placeholder="Promo Code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-xs uppercase tracking-wider text-black placeholder:text-neutral-400 placeholder:normal-case focus:border-black focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!code.trim() || state === 'loading'}
              className="rounded-full bg-black px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              {state === 'loading' ? 'Applying…' : 'Apply'}
            </button>
          </div>

          {state === 'error' && (
            <p role="alert" className="text-[11px] text-red-600 font-light flex items-center gap-1 pt-0.5">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
