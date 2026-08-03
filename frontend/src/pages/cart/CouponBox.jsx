import { useId, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Tag, X } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Coupon.
 *
 * Collapsed by default so the summary stays calm; expanding is a disclosure
 * (aria-expanded + aria-controls) rather than a mystery chevron.
 *
 * The panel animates on grid-template-rows, which is the one way to animate
 * "auto" height without measuring the child in JS. When the panel is closed
 * it is inert as well as aria-hidden — aria-hidden alone does not remove
 * focusability and axe flags the field inside it.
 *
 * Four states are all rendered from one `state` value so they can never
 * overlap: idle · loading · applied · error.
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
      setError(err?.message || 'That code is not valid');
      setState('error');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  /* ---------- Applied ---------- */
  if (applied) {
    return (
      <div className="rounded-control border border-sage/50 bg-sage/10 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sagedeep text-white" aria-hidden="true">
            <Check size={13} strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-sagedark">
              {applied.code} applied
            </p>
            <p className="text-caption text-ash">You saved {pkr(applied.discount)}</p>
          </div>
          <button
            type="button"
            onClick={() => { onRemove(); setOpen(true); setState('idle'); }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ash transition hover:bg-white/70 hover:text-obsidian"
            aria-label={`Remove coupon ${applied.code}`}
          >
            <X size={15} />
          </button>
        </div>
        <p className="sr-only" role="status">Coupon {applied.code} applied. You saved {pkr(applied.discount)}.</p>
      </div>
    );
  }

  /* ---------- Collapsed / expanded ---------- */
  return (
    <div className="rounded-control border border-line bg-white/50">
      <button
        type="button"
        onClick={() => { const n = !open; setOpen(n); if (n) requestAnimationFrame(() => inputRef.current?.focus()); }}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <Tag size={14} className="shrink-0 text-ash" aria-hidden="true" />
        <span className="flex-1 text-body-sm font-medium">Have a promo code?</span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`shrink-0 text-ash transition-transform duration-base motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-base ease-standard motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!open}
        inert={!open ? '' : undefined}
      >
        <div className="overflow-hidden">
          <form onSubmit={submit} className="flex gap-2 px-3.5 pb-3.5 pt-0.5">
            <label className="sr-only" htmlFor={`${panelId}-in`}>Promo code</label>
            <input
              id={`${panelId}-in`}
              ref={inputRef}
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); if (state === 'error') { setState('idle'); setError(''); } }}
              placeholder="Enter code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              aria-invalid={state === 'error'}
              aria-describedby={state === 'error' ? `${panelId}-err` : undefined}
              className={`input input-sm min-h-[44px] flex-1 uppercase tracking-wider ${state === 'error' ? 'input-error' : ''}`}
            />
            <button
              type="submit"
              disabled={!code.trim() || state === 'loading'}
              className="btn btn-sm min-h-[44px] shrink-0 bg-obsidian px-5 text-alabaster transition hover:bg-graphite disabled:opacity-40"
            >
              {state === 'loading' ? <Spinner label="Checking code" /> : 'Apply'}
            </button>
          </form>

          {state === 'error' && (
            <p id={`${panelId}-err`} role="alert" className="flex items-start gap-1.5 px-3.5 pb-3.5 text-caption text-red-700">
              <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
