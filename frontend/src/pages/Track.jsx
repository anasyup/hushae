import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Search } from 'lucide-react';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import Img from '../components/Img';
import Tx from '../components/Tx';
import Seo from '../components/Seo';

const FLOW = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function Track() {
  const [params, setParams] = useSearchParams();
  const [on, setOn] = useState(params.get('orderNumber') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (a = on, b = phone) => {
    if (!a.trim() || !b.trim()) return;
    setBusy(true); setErr(''); setOrder(null);
    try {
      const d = await api(`/orders/track?orderNumber=${encodeURIComponent(a.trim())}&phone=${encodeURIComponent(b.trim())}`);
      setOrder(d.order);
      setParams({ orderNumber: a.trim(), phone: b.trim() }, { replace: true });
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  useEffect(() => { if (params.get('orderNumber') && params.get('phone')) search(); }, []); // eslint-disable-line

  const cancelled = order && ['Cancelled', 'Refunded'].includes(order.status);
  const activeIdx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-[130px] pb-12 md:px-8"><Seo title="Track Your Order" description="Track your HUSHAE order by order number and phone." />
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Order tracking</p>
        <h1 className="mt-2 font-display text-4xl"><Tx k="trackOrder" /></h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ash">Enter your order number and the phone number used at checkout. No login needed.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="input" placeholder="Order number — HS-20260701-XXXXXX" value={on} onChange={(e) => setOn(e.target.value)} />
        <input className="input" placeholder="Phone — 03xx xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button disabled={busy} className="btn-primary !px-5"><Search size={15} /> {busy ? 'Finding…' : 'Track'}</button>
      </form>

      {err && <p className="mx-auto mt-6 max-w-lg rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-800">{err}</p>}

      {order && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-6">
          <div className="rounded-3xl border border-line bg-white/70 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-lg tracking-wide">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-ash">Placed {fmtDateTime(order.createdAt)} · {order.customerInfo.city}, {order.customerInfo.province}</p>
              </div>
              <div className="flex gap-2">
                <span className={`pill ${cancelled ? 'bg-red-100 text-red-800' : order.status === 'Delivered' ? 'bg-sage/25 text-sagedeep' : 'bg-satin text-obsidian'}`}>{order.status}</span>
                <span className={`pill ${order.paymentStatus === 'Paid' ? 'bg-sage/25 text-sagedeep' : 'bg-satin/70 text-ash'}`}>{order.paymentMethod} · {order.paymentStatus}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-8">
              {cancelled ? (
                <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-800">This order was {order.status.toLowerCase()}. Contact support for details.</p>
              ) : (
                <div className="flex items-center">
                  {FLOW.map((s, i) => (
                    <div key={s} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center">
                        <span className={`grid h-8 w-8 place-items-center rounded-full border-2 transition ${i <= activeIdx ? 'border-sagedeep bg-sagedeep text-white' : 'border-line bg-white text-ash'}`}>
                          {i < activeIdx ? <Check size={13} strokeWidth={3} /> : i === activeIdx ? <Package size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-line" />}
                        </span>
                        <span className={`mt-2 hidden text-center text-[10px] font-semibold uppercase tracking-wide md:block ${i <= activeIdx ? 'text-obsidian' : 'text-ash/60'}`}>{s}</span>
                      </div>
                      {i < FLOW.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded ${i < activeIdx ? 'bg-sagedeep' : 'bg-line'}`} />}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 rounded-2xl bg-satin/40 px-5 py-3.5 text-xs text-ash md:hidden">{order.status}</div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-3xl border border-line bg-white/60 p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ash">Items</p>
            <div className="space-y-3">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Img src={it.image} alt="" className="h-12 w-10 rounded-lg object-cover" />
                  <span className="flex-1 clamp-2">{it.name} <span className="text-ash">· {it.size} · x{it.quantity}</span></span>
                  <span className="font-medium">{pkr(it.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-ash"><span><Tx k="shipping" /></span><span>{order.shippingCharge === 0 ? 'Free' : pkr(order.shippingCharge)}</span></div>
              <div className="flex justify-between font-semibold"><span><Tx k="total" /></span><span>{pkr(order.total)}</span></div>
            </div>
            {order.discreetPackaging && <p className="mt-3 text-xs text-sagedeep">Discreet packaging selected — plain, unmarked parcel.</p>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
