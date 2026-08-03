import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CheckCircle2, Download, PackageCheck,
  RotateCcw, Truck, XCircle,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { fmtDate, pkr } from '../../lib/format';
import { accountConfig } from '../../lib/accountConfig';
import Img from '../../components/Img';
import Spinner from '../../components/ui/Spinner';
import RequestDialog from './RequestDialog';

/* ============================================================================
 * ORDER DETAIL  —  /account/orders/:key
 *
 * The old account only listed orders and linked out to the public tracker with
 * the customer's phone number in the query string. This is the private view:
 * every line, the real totals, and the actions the merchant has switched on.
 *
 * Which actions appear is decided by the SERVER, not guessed here:
 *   · cancel  — only before dispatch
 *   · return  — only after delivery
 *   · an existing request replaces the button with its status
 * ========================================================================== */

const STEPS = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered'];
const CANCELLABLE = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'];

export default function OrderDetail() {
  const { key } = useParams();
  const nav = useNavigate();
  const { auth, settings, addToCart, toast } = useApp();
  const cfg = useMemo(() => accountConfig(settings), [settings]);

  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [dialog, setDialog] = useState(null);   // 'cancel' | 'return'
  const liveRef = useRef(null);

  const load = useCallback(() => {
    if (!auth?.token) return;
    api(`/customer/orders/${encodeURIComponent(key)}`, { token: auth.token })
      .then(setData)
      .catch((e) => setErr(e.message || 'We could not load that order'));
  }, [auth, key]);

  useEffect(load, [load]);

  if (!auth) {
    return (
      <div className="container-page py-sect-y text-center">
        <h1 className="font-display text-h3">Please sign in to view this order</h1>
        <Link to="/account" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container-page py-sect-y text-center">
        <h1 className="font-display text-h3">Order not found</h1>
        <p className="mt-3 text-body-sm text-ash">{err}</p>
        <Link to="/account" className="btn-primary mt-6">Back to my account</Link>
      </div>
    );
  }

  if (!data) {
    return (
      /* Measured against the real page: 1034px of content at 390px, 1026px at
         768px, 679px at 1440px. A 500px skeleton let the footer paint high and
         then get shoved down 534px — 0.2182 CLS on a phone. These blocks
         mirror the header, the progress strip and the two-column body. */
      <div className="container-page py-8 md:py-12" role="status" aria-live="polite">
        <span className="sr-only">Loading your order…</span>
        <div className="skeleton h-[57px] w-full rounded-control lg:h-[81px]" />
        <div className="skeleton mt-6 h-[153px] w-full rounded-card sm:h-[121px] lg:h-[89px]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="skeleton h-[470px] w-full rounded-card lg:h-[509px]" />
          <div className="skeleton h-[330px] w-full rounded-card lg:hidden" />
        </div>
      </div>
    );
  }

  const { order, request } = data;
  const stepIndex = STEPS.indexOf(order.status);
  const cancelled = order.status === 'Cancelled';

  const cancelPending = request?.cancellationStatus && request.cancellationStatus !== 'No Cancellation';
  const returnPending = request?.returnStatus && !['Not Required', 'Rejected'].includes(request.returnStatus);

  const canCancel = cfg.allowCancelRequest && !cancelled && CANCELLABLE.includes(order.status) && !cancelPending;
  const canReturn = cfg.allowReturnRequest && order.status === 'Delivered' && !returnPending;

  const reorder = async () => {
    setBusy('reorder');
    try {
      const r = await api(`/customer/orders/${encodeURIComponent(key)}/reorder`, { method: 'POST', token: auth.token });
      let added = 0;
      for (const l of r.lines) {
        addToCart(
          { _id: l.id, id: l.id, slug: l.slug, name: l.name, price: l.price, images: [{ url: l.image }], sizes: l.size ? [l.size] : [], colors: l.color ? [{ name: l.color }] : [] },
          { size: l.size, color: l.color, quantity: l.qty },
        );
        added += 1;
      }
      if (r.unavailable?.length) {
        toast(`${added} added · ${r.unavailable.length} unavailable`);
      } else {
        toast(`${added} item${added === 1 ? '' : 's'} added to your bag`);
      }
      if (added) nav('/cart');
    } catch (e) { toast(e.message || 'Could not reorder'); }
    setBusy('');
  };

  const invoice = async () => {
    setBusy('invoice');
    try {
      const { invoice: inv } = await api(`/customer/orders/${encodeURIComponent(key)}/invoice`, { token: auth.token });
      /* Rendered into a new window and printed. Shipping a PDF library to
         every shopper for a page most will never open is not worth ~300 kB. */
      const w = window.open('', '_blank');
      if (!w) { toast('Please allow pop-ups to download your invoice'); setBusy(''); return; }
      const rows = inv.items.map((i) => `<tr><td>${i.name}${i.size ? ` — ${i.size}` : ''}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${pkr(i.lineTotal)}</td></tr>`).join('');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${inv.orderNumber}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#1A1A1A}
h1{font-size:24px;letter-spacing:.12em;text-transform:uppercase;margin:0}
table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
td,th{padding:9px 0;border-bottom:1px solid #E4DED4;text-align:left}
.tot{margin-top:20px;font-size:14px}.tot div{display:flex;justify-content:space-between;padding:5px 0}
.grand{font-size:19px;font-weight:700;border-top:2px solid #1A1A1A;margin-top:8px;padding-top:10px}
.muted{color:#6E6760;font-size:12.5px;line-height:1.7}
@media print{body{margin:0}}</style></head><body>
<h1>${inv.store.name}</h1>
<p class="muted">Invoice · ${inv.orderNumber}<br>${new Date(inv.placedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
<p class="muted"><strong>Billed to</strong><br>${inv.customer.name}<br>${inv.customer.address}<br>${[inv.customer.city,inv.customer.province,inv.customer.postalCode].filter(Boolean).join(', ')}<br>${inv.customer.phone}</p>
<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot">
<div><span>Subtotal</span><span>${pkr(inv.subtotal)}</span></div>
${inv.discount ? `<div><span>Discount${inv.couponCode ? ` (${inv.couponCode})` : ''}</span><span>− ${pkr(inv.discount)}</span></div>` : ''}
<div><span>Shipping</span><span>${inv.shippingCharge === 0 ? 'Free' : pkr(inv.shippingCharge)}</span></div>
${inv.tax ? `<div><span>Tax</span><span>${pkr(inv.tax)}</span></div>` : ''}
<div class="grand"><span>Total</span><span>${pkr(inv.total)}</span></div>
</div>
<p class="muted" style="margin-top:28px">Payment: ${inv.paymentMethod} · ${inv.paymentStatus}<br>${inv.store.email} ${inv.store.phone ? '· ' + inv.store.phone : ''}</p>
<script>window.onload=()=>window.print()<\/script></body></html>`);
      w.document.close();
    } catch (e) { toast(e.message || 'Could not open the invoice'); }
    setBusy('');
  };

  const submitRequest = async (kind, body) => {
    const r = await api(`/customer/orders/${encodeURIComponent(key)}/${kind}`, { method: 'POST', token: auth.token, body });
    setDialog(null);
    toast(r.message || 'Request sent');
    load();
    requestAnimationFrame(() => liveRef.current?.focus());
  };

  return (
    <div className="container-page py-8 md:py-12">
      <Link to="/account" className="inline-flex min-h-[44px] items-center gap-1.5 text-body-sm text-ash underline-offset-4 transition hover:text-obsidian hover:underline">
        <ArrowLeft size={14} aria-hidden="true" /> Back to my account
      </Link>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-6">
        <div>
          <p className="text-label uppercase tracking-widest text-sagedeep">Order</p>
          <h1 className="mt-0.5 font-mono text-h3">{order.orderNumber}</h1>
          <p className="mt-1 text-body-sm text-ash">
            Placed {fmtDate(order.createdAt)} · {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </p>
        </div>
        <span className={`pill ${cancelled ? 'bg-red-50 text-red-700' : order.status === 'Delivered' ? 'bg-sage/25 text-sagedark' : 'bg-satin text-obsidian'}`}>
          {order.status}
        </span>
      </header>

      {/* ---- open request banner ---- */}
      <div ref={liveRef} tabIndex={-1} aria-live="polite">
        {cancelPending && (
          <p className="mt-5 flex items-start gap-2.5 rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Cancellation <strong>{request.cancellationStatus.toLowerCase()}</strong> — our team will confirm by phone or WhatsApp.
          </p>
        )}
        {returnPending && (
          <p className="mt-5 flex items-start gap-2.5 rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Return <strong>{request.returnStatus.toLowerCase()}</strong> — we will be in touch about collection.
          </p>
        )}
      </div>

      {/* ---- progress ---- */}
      {!cancelled && stepIndex >= 0 && (
        <section className="mt-6 rounded-card border border-line bg-white/60 p-5" aria-labelledby="od-prog">
          <h2 id="od-prog" className="text-label uppercase tracking-widest text-ash">Progress</h2>
          <ol className="mt-4 flex flex-wrap gap-x-2 gap-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                    i <= stepIndex ? 'bg-sagedeep text-white' : 'bg-satin text-ash'
                  }`}
                >
                  {i <= stepIndex ? '✓' : i + 1}
                </span>
                <span className={`text-caption ${i <= stepIndex ? 'font-medium text-ink' : 'text-ash'}`}>{s}</span>
                {i < STEPS.length - 1 && <span className="hidden h-px w-4 bg-line sm:block" aria-hidden="true" />}
              </li>
            ))}
          </ol>
          <p className="sr-only">Current status: {order.status}</p>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---- items ---- */}
        <section className="card-content" aria-labelledby="od-items">
          <h2 id="od-items" className="text-label uppercase tracking-widest text-ash">Items</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3.5 py-4">
                <Img src={it.image} alt="" className="h-20 w-16 shrink-0 rounded-control border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium leading-snug">{it.name}</p>
                  <p className="mt-0.5 text-caption text-ash">
                    {[it.size && `Size ${it.size}`, it.color].filter(Boolean).join(' · ')} · Qty {it.quantity}
                  </p>
                </div>
                <p className="text-body-sm font-semibold tabular-nums">{pkr(it.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-body-sm">
            <div className="flex justify-between"><dt className="text-ash">Subtotal</dt><dd className="tabular-nums">{pkr(order.subtotal)}</dd></div>
            {!!order.discount && (
              <div className="flex justify-between text-sagedark">
                <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                <dd className="tabular-nums">− {pkr(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ash">Shipping</dt>
              <dd className="tabular-nums">{order.shippingCharge === 0 ? 'Free' : pkr(order.shippingCharge)}</dd>
            </div>
            {!!order.tax && <div className="flex justify-between"><dt className="text-ash">Tax</dt><dd className="tabular-nums">{pkr(order.tax)}</dd></div>}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-h5 tabular-nums">{pkr(order.total)}</dd>
            </div>
          </dl>
        </section>

        {/* ---- side ---- */}
        <aside className="space-y-6">
          <section className="card-content" aria-labelledby="od-deliver">
            <h2 id="od-deliver" className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
              <Truck size={13} aria-hidden="true" /> Delivering to
            </h2>
            <p className="mt-3 text-body-sm font-medium">{order.customerInfo?.name}</p>
            <p className="mt-1 text-caption text-ash">{order.customerInfo?.phone}</p>
            <p className="mt-2 text-body-sm">{order.customerInfo?.address}</p>
            <p className="text-caption text-ash">
              {[order.customerInfo?.city, order.customerInfo?.province, order.customerInfo?.postalCode].filter(Boolean).join(', ')}
            </p>
            <p className="mt-3 border-t border-line pt-3 text-caption text-ash">
              Payment: <span className="font-medium text-ink">{order.paymentMethod}</span> · {order.paymentStatus}
            </p>
          </section>

          <section className="card-content" aria-labelledby="od-actions">
            <h2 id="od-actions" className="text-label uppercase tracking-widest text-ash">Actions</h2>
            <div className="mt-4 space-y-2">
              <Link
                to={`/track?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                className="btn btn-sm w-full gap-2 border border-stone bg-white text-graphite hover:bg-satin/60"
              >
                <PackageCheck size={14} aria-hidden="true" /> Track this order
              </Link>

              {cfg.allowInvoice && (
                <button type="button" onClick={invoice} disabled={busy === 'invoice'}
                  className="btn btn-sm w-full gap-2 border border-stone bg-white text-graphite hover:bg-satin/60 disabled:opacity-50">
                  {busy === 'invoice' ? <Spinner label="Opening" /> : <Download size={14} aria-hidden="true" />} Invoice
                </button>
              )}

              {cfg.allowReorder && (
                <button type="button" onClick={reorder} disabled={busy === 'reorder'}
                  className="btn btn-sm w-full gap-2 border border-stone bg-white text-graphite hover:bg-satin/60 disabled:opacity-50">
                  {busy === 'reorder' ? <Spinner label="Adding" /> : <RotateCcw size={14} aria-hidden="true" />} Order again
                </button>
              )}

              {canCancel && (
                <button type="button" onClick={() => setDialog('cancel')}
                  className="btn btn-sm w-full gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50">
                  <XCircle size={14} aria-hidden="true" /> Request cancellation
                </button>
              )}

              {canReturn && (
                <button type="button" onClick={() => setDialog('return')}
                  className="btn btn-sm w-full gap-2 border border-stone bg-white text-graphite hover:bg-satin/60">
                  <RotateCcw size={14} aria-hidden="true" /> Request a return
                </button>
              )}

              {order.status === 'Delivered' && !cfg.allowReturnRequest && (
                <p className="text-caption leading-relaxed text-ash">
                  To return something, please contact us and we will arrange it.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <RequestDialog
        kind={dialog}
        onClose={() => setDialog(null)}
        onSubmit={submitRequest}
      />
    </div>
  );
}
