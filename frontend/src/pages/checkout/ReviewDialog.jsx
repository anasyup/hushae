import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Lock, X } from 'lucide-react';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Final review dialog.
 *
 * The old one was a bare <div> with a click-away handler: no role, no
 * aria-modal, no label, no focus trap, no focus return, and Escape only
 * worked because the overlay happened to close on click. Measured: role
 * "(none)", aria-modal "(none)", focus stayed outside the dialog entirely.
 *
 * This is a real dialog. Focus moves in on open, is trapped while open,
 * Escape closes, and focus returns to the button that opened it.
 * ========================================================================== */
export default function ReviewDialog({
  open, onClose, onConfirm, busy, error,
  form, cityLabel, method, shipMethod, txn, discreet, cart, pricing, cfg,
}) {
  const panelRef = useRef(null);
  const opener = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (!f?.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      panelRef.current?.querySelector('button, a')?.focus();
    }, 40);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-obsidian/60 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={() => !busy && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-panel bg-alabaster shadow-e-4 sm:rounded-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="text-caption font-bold uppercase tracking-widest text-ash">Final review</p>
            <h2 id={titleId} className="mt-0.5 text-[24px] font-light normal-case text-charcoal">Confirm your order</h2>
          </div>
          <button
            type="button" onClick={onClose} disabled={busy} aria-label="Close review"
            className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian disabled:opacity-40"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-5 py-5 sm:px-6">
          {error && (
            <p role="alert" className="mb-4 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <section className="mb-4 rounded-card border border-line bg-white/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-caption font-bold uppercase tracking-widest text-ash">Delivering to</h3>
              <button type="button" onClick={onClose} className="min-h-[44px] text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline">Edit</button>
            </div>
            <p className="text-[13px] font-medium normal-case text-charcoal">{form.name}</p>
            <p className="mt-0.5 text-caption text-ash">{form.phone}{form.email ? ` · ${form.email}` : ''}</p>
            <p className="mt-2 text-caption">{form.address}</p>
            <p className="text-caption text-ash">{cityLabel}, {form.province} — {form.postalCode}</p>
            {form.notes && <p className="mt-2 text-caption italic text-ash">Note: {form.notes}</p>}
          </section>

          <section className="mb-4 rounded-card border border-line bg-white/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-caption font-bold uppercase tracking-widest text-ash">
                Items ({cart.reduce((n, l) => n + l.qty, 0)})
              </h3>
              <Link to="/cart" className="min-h-[44px] text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline">Edit bag</Link>
            </div>
            <ul className="space-y-2.5">
              {cart.map((l, i) => (
                <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-3">
                  <Img src={l.image} alt="" className="h-12 w-9 shrink-0 rounded-md border border-line object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="clamp-1 text-[12px] font-normal normal-case text-charcoal">{l.name}</p>
                    <p className="text-caption text-ash">{l.size}{l.color ? ` · ${l.color}` : ''} · Qty {l.qty}</p>
                  </div>
                  <p className="text-body-sm font-semibold tabular-nums">{pkr(l.price * l.qty)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-white/60 p-4">
              <h3 className="text-caption font-bold uppercase tracking-widest text-ash">Payment</h3>
              <p className="mt-1.5 text-body-sm font-semibold">{method}</p>
              {txn && <p className="mt-0.5 text-caption text-ash">Ref: <span className="font-mono">{txn}</span></p>}
            </div>
            <div className="rounded-card border border-line bg-white/60 p-4">
              <h3 className="text-caption font-bold uppercase tracking-widest text-ash">Delivery</h3>
              <p className="mt-1.5 text-body-sm font-semibold">{shipMethod?.label || 'Standard delivery'}</p>
              {discreet && <p className="mt-0.5 text-caption text-ash">Discreet packaging</p>}
            </div>
          </section>

          <section className="rounded-card bg-cream/60 p-4">
            <dl className="space-y-2 text-body-sm">
              <div className="flex justify-between"><dt className="text-ash">Subtotal</dt><dd className="tabular-nums">{pkr(pricing.subtotal)}</dd></div>
              {pricing.discount > 0 && (
                <div className="flex justify-between text-sagedark"><dt>Discount</dt><dd className="tabular-nums">− {pkr(pricing.discount)}</dd></div>
              )}
              <div className="flex justify-between">
                <dt className="text-ash">Shipping</dt>
                <dd className={`tabular-nums ${pricing.shipping === 0 ? 'font-semibold text-sagedark' : ''}`}>
                  {pricing.shipping === 0 ? 'Free' : pkr(pricing.shipping)}
                </dd>
              </div>
              {pricing.tax > 0 && (
                <div className="flex justify-between"><dt className="text-ash">{cfg.taxLabel || 'Estimated tax'}</dt><dd className="tabular-nums">{pkr(pricing.tax)}</dd></div>
              )}
              <div className="flex items-end justify-between border-t border-line pt-3">
                <dt className="text-body font-bold">Total</dt>
                <dd className="text-[20px] font-medium tabular-nums text-charcoal">{pkr(pricing.total)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-line bg-cream/40 px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-6">
          <button
            type="button" onClick={onClose} disabled={busy}
            className="btn btn-sm border border-bronze bg-white text-graphite hover:bg-satin/60 disabled:opacity-40"
          >
            Edit details
          </button>
          <button
            type="button" onClick={onConfirm} disabled={busy}
            className="btn-qa !w-auto px-10 disabled:opacity-50"
          >
            {busy ? <><Spinner label="Placing your order" /> Placing order…</> : <><Lock size={13} aria-hidden="true" /> Confirm · {pkr(pricing.total)}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
