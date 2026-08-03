import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Play, Search, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { reasonText } from './promoTypes';

/* ============================================================================
 * LIVE PREVIEW
 *
 * Build a basket, choose a customer type, run it through the real engine.
 * Nothing is written — the endpoint is a dry run behind adminOnly.
 *
 * The part that matters is the REJECTED list. A merchant whose promotion does
 * not fire needs to know it was "customer has ordered before", not stare at an
 * unchanged total wondering whether they saved it. The engine already returns
 * a reason code for every refusal; this turns those into sentences.
 *
 * Mobile-first: a bottom sheet under md, a centred dialog above it.
 * ========================================================================== */

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;

export default function PromoPreview({ draft, onClose }) {
  const { auth, toast } = useApp();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderCount, setOrderCount] = useState(0);
  const [hasCoupon, setHasCoupon] = useState(false);
  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { closeRef.current?.focus(); }, []);

  // Escape closes, Tab is trapped. A dialog you cannot leave by keyboard is a
  // failure, not a detail.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll('button, input, select, a[href]');
      if (!f?.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Reuse the search engine built in Sprint 2J rather than adding a product
     picker endpoint — it already handles typos, colours and fabrics. */
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setFound([]); return undefined; }
    const t = setTimeout(() => {
      api(`/search/suggest?q=${encodeURIComponent(term)}`)
        .then((d) => setFound(d.products || []))
        .catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (p) => {
    setCart((c) => (c.some((x) => x._id === p._id)
      ? c.map((x) => (x._id === p._id ? { ...x, qty: x.qty + 1 } : x))
      : [...c, { _id: p._id, name: p.name, price: p.price, qty: 1 }]));
    setQ(''); setFound([]);
  };

  const run = useCallback(async () => {
    if (!cart.length) { toast('Add a product to the test basket first'); return; }
    setBusy(true);
    try {
      const r = await api('/promotions/preview', {
        method: 'POST',
        token: auth.token,
        body: {
          items: cart.map((c) => ({ product: c._id, quantity: c.qty })),
          orderCount, hasCoupon, city,
          // The unsaved form is sent as a draft, so a merchant can test a rule
          // BEFORE committing it.
          draft: draft ? { ...draft, _id: draft._id || undefined } : undefined,
        },
      });
      setResult(r);
    } catch (e) { toast(e.message || 'Could not run the test'); }
    setBusy(false);
  }, [cart, orderCount, hasCoupon, city, draft, auth?.token, toast]);

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pp-title"
        className="flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl bg-white md:max-w-2xl md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="pp-title" className="text-[12px] font-semibold text-neutral-900">Test this promotion</h2>
            <p className="mt-0.5 text-[12px] text-neutral-600">Nothing is saved or charged.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-600 transition hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* ---- basket ---- */}
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-600">Test basket</p>
          <div className="relative mt-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <label htmlFor="pp-search" className="sr-only">Search products to add</label>
            <input
              id="pp-search" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-[44px] pl-9" value={q}
              onChange={(e) => setQ(e.target.value)} placeholder="Search a product to add"
              autoComplete="off"
            />
          </div>
          {found.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-neutral-200">
              {found.map((p) => (
                <li key={p._id}>
                  <button
                    type="button" onClick={() => add(p)}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-neutral-50"
                  >
                    <span className="min-w-0 truncate text-[13px] text-neutral-900">{p.name}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-neutral-600">{money(p.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {cart.length > 0 && (
            <ul className="mt-3 space-y-2">
              {cart.map((c) => (
                <li key={c._id} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-900">{c.name}</span>
                  <label className="sr-only" htmlFor={`qty-${c._id}`}>Quantity for {c.name}</label>
                  <input
                    id={`qty-${c._id}`} type="number" min="1" max="20" value={c.qty}
                    onChange={(e) => setCart((x) => x.map((y) => (y._id === c._id ? { ...y, qty: Math.max(1, Number(e.target.value) || 1) } : y)))}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-[44px] w-20"
                  />
                  <span className="w-24 shrink-0 text-right text-[12px] tabular-nums text-neutral-600">{money(c.price * c.qty)}</span>
                  <button
                    type="button" onClick={() => setCart((x) => x.filter((y) => y._id !== c._id))}
                    aria-label={`Remove ${c.name}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* ---- customer ---- */}
          <p className="mt-5 text-[12px] font-bold uppercase tracking-widest text-neutral-600">Pretend customer</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor="pp-orders">Past orders</label>
              <select id="pp-orders" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-[44px]" value={orderCount} onChange={(e) => setOrderCount(Number(e.target.value))}>
                <option value={0}>None — first-time customer</option>
                <option value={1}>1 order</option>
                <option value={5}>5 orders — regular</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor="pp-city">City</label>
              <input id="pp-city" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-[44px]" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any" />
            </div>
          </div>
          <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 px-4">
            <input type="checkbox" checked={hasCoupon} onChange={(e) => setHasCoupon(e.target.checked)} className="h-4 w-4 accent-neutral-900" />
            <span className="text-[13px] text-neutral-900">They also entered a coupon code</span>
          </label>

          <button
            type="button" onClick={run} disabled={busy || !cart.length}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <Play size={14} /> {busy ? 'Running…' : 'Run the test'}
          </button>

          {/* ---- result ---- */}
          {result && (
            <div className="mt-5 border-t border-neutral-200 pt-5" aria-live="polite">
              {!result.programmeLive && (
                <p className="mb-3 rounded-xl bg-sky-50 px-4 py-2.5 text-[12px] text-sky-900">
                  Marketing is switched off, so this is a simulation only — real customers
                  are not seeing any of this yet.
                </p>
              )}

              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">Basket</dt>
                  <dd className="tabular-nums">{money(result.subtotal)}</dd>
                </div>
                {(result.discounts || []).map((d) => (
                  <div key={d.id} className="flex justify-between gap-4 text-emerald-800">
                    <dt className="min-w-0 truncate">{d.label || d.name}{d.note ? ` (${d.note})` : ''}</dt>
                    <dd className="shrink-0 tabular-nums">− {money(d.amount)}</dd>
                  </div>
                ))}
                {result.capped && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    Trimmed to your ceiling of {money(result.capAmount)}. Raise the maximum in
                    Rules if you meant to give more.
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 border-t border-neutral-200 pt-2 font-semibold">
                  <dt>Customer pays</dt>
                  <dd className="text-lg tabular-nums">{money(result.payable)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-[12px] text-neutral-600">
                  <dt>Effective discount</dt>
                  <dd className="tabular-nums">{result.effectivePercent}%</dd>
                </div>
              </dl>

              {(result.discounts || []).length > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-900">
                  <Check size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span><strong>{result.discounts[0].label || result.discounts[0].name}</strong> applied.</span>
                </p>
              )}

              {(result.rejected || []).length > 0 && (
                <div className="mt-4">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-600">Did not apply</p>
                  <ul className="mt-2 space-y-1.5">
                    {result.rejected.map((r, i) => (
                      <li key={`${r.id}-${i}`} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-[12px]">
                        <span className="min-w-0 truncate text-neutral-900">{r.name || 'Promotion'}</span>
                        <span className="shrink-0 text-neutral-600">{reasonText(r.rejectedFor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!(result.discounts || []).length && !(result.rejected || []).length && (
                <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-[12px] text-neutral-600">
                  No promotion matched this basket.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
