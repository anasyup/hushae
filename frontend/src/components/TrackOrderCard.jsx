import { useState } from 'react';
import { Check, Package, Search } from 'lucide-react';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import Img from './Img';

/* ============================================================================
 * TRACK ORDER CARD — lives inside the Account → Order history section.
 * Same API as the public /track page (no login needed): order number + the
 * phone used at checkout. Kept compact — status pill, mini timeline, items.
 * ========================================================================== */

const FLOW = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function TrackOrderCard() {
  const [on, setOn] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!on.trim() || !phone.trim()) return;
    setBusy(true); setErr(''); setOrder(null);
    try {
      const d = await api(`/orders/track?orderNumber=${encodeURIComponent(on.trim())}&phone=${encodeURIComponent(phone.trim())}`);
      setOrder(d.order);
    } catch (ex) { setErr(ex.message || 'We could not find that order. Check the number and phone and try again.'); }
    setBusy(false);
  };

  const cancelled = order && ['Cancelled', 'Refunded'].includes(order.status);
  const activeIdx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Package size={15} className="text-ash" aria-hidden="true" />
        <h4 className="text-label uppercase tracking-widest text-ash">Track an order</h4>
      </div>
      <p className="mt-1 text-caption text-ash">Order number and the phone number used at checkout — no login needed.</p>

      <form onSubmit={search} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="input"
          placeholder="Order number — HS-2026…"
          value={on}
          onChange={(e) => setOn(e.target.value)}
          aria-label="Order number"
        />
        <input
          className="input"
          placeholder="Phone — 03xx xxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-label="Phone number used at checkout"
        />
        <button type="submit" disabled={busy} className="btn-primary !px-4">
          <Search size={14} aria-hidden="true" /> {busy ? 'Finding…' : 'Track'}
        </button>
      </form>

      {err && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}

      {order && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-body-sm">{order.orderNumber}</p>
            <span className={`pill ${cancelled ? 'bg-red-100 text-red-800' : order.status === 'Delivered' ? 'bg-sage/25 text-sagedeep' : 'bg-satin text-obsidian'}`}>
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-caption text-ash">Placed {fmtDateTime(order.createdAt)}</p>

          {cancelled ? (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">
              This order was {order.status.toLowerCase()}. Contact support for details.
            </p>
          ) : (
            <div className="mt-4 flex items-center">
              {FLOW.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${i <= activeIdx ? 'border-sagedeep bg-sagedeep text-white' : 'border-line bg-white text-ash'}`}>
                      {i < activeIdx ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : i === activeIdx ? <Package size={11} aria-hidden="true" /> : <span className="h-1 w-1 rounded-full bg-line" aria-hidden="true" />}
                    </span>
                    <span className={`mt-1.5 hidden text-center text-[9px] font-semibold uppercase tracking-wide md:block ${i <= activeIdx ? 'text-obsidian' : 'text-ash/60'}`}>
                      {s}
                    </span>
                  </div>
                  {i < FLOW.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded ${i < activeIdx ? 'bg-sagedeep' : 'bg-line'}`} />}
                </div>
              ))}
            </div>
          )}

          {order.items?.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              {order.items.slice(0, 4).map((it, i) => (
                <Img key={i} src={it.image} alt="" className="h-12 w-10 rounded-md border border-line object-cover" />
              ))}
              <span className="ml-auto text-caption text-ash">
                {order.items.length} item{order.items.length > 1 ? 's' : ''} · {pkr(order.total)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
