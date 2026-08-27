import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Search, Truck, ShieldCheck, Clock } from 'lucide-react';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import Img from '../components/Img';
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
    } catch (ex) { setErr(ex.message || 'Order not found. Please verify order number and phone.'); }
    setBusy(false);
  };

  useEffect(() => { if (params.get('orderNumber') && params.get('phone')) search(); }, []); // eslint-disable-line

  const cancelled = order && ['Cancelled', 'Refunded'].includes(order.status);
  const activeIdx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="min-h-screen bg-white pt-[140px] pb-24 font-sans text-[#111111]">
      <Seo title="Track Your Order — HUSHAE" description="Live order status and express delivery tracker." />
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-neutral-400">Order Concierge</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-light uppercase tracking-tight text-[#000000]">Track Your Order</h1>
          <p className="mx-auto mt-2 max-w-sm text-xs text-neutral-500 font-light leading-relaxed">
            Enter your order number and the mobile number used at checkout for real-time parcel status.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="mt-8 grid gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
          <input
            className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
            placeholder="Order # (HS-...)"
            value={on}
            onChange={(e) => setOn(e.target.value)}
            aria-label="Order number"
            autoComplete="off"
            required
          />
          <input
            className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
            placeholder="Mobile (03xx xxxxxxx)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Phone number used at checkout"
            autoComplete="tel"
            inputMode="tel"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 bg-[#000000] px-6 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Search size={13} /> {busy ? '…' : 'Track'}
          </button>
        </form>

        {err && (
          <p className="mt-6 border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700">
            {err}
          </p>
        )}

        {order && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-6">
            {/* Status Summary Box */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
                <div>
                  <p className="font-mono text-base sm:text-lg font-medium text-black">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-neutral-500 font-light">
                    Placed {fmtDateTime(order.createdAt)} · {order.customerInfo.city}, {order.customerInfo.province}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-black text-white px-3 py-1 text-[10px] font-medium uppercase tracking-wider">
                    {order.status}
                  </span>
                  <span className="border border-neutral-200 px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-700">
                    {order.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Timeline Progress */}
              <div>
                {cancelled ? (
                  <p className="border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                    This order was {order.status.toLowerCase()}. Please contact customer support for further assistance.
                  </p>
                ) : (
                  <div className="py-2">
                    <div className="flex items-center">
                      {FLOW.map((s, i) => (
                        <div key={s} className="flex flex-1 items-center last:flex-none">
                          <div className="flex flex-col items-center">
                            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs transition ${
                              i <= activeIdx ? 'bg-black text-white' : 'border border-neutral-200 bg-white text-neutral-400'
                            }`}>
                              {i < activeIdx ? <Check size={12} strokeWidth={2.5} /> : i === activeIdx ? <Package size={12} /> : <span className="h-1 w-1 rounded-full bg-neutral-300" />}
                            </span>
                            <span className={`mt-2 hidden text-center text-[9.5px] font-medium uppercase tracking-wider md:block ${
                              i <= activeIdx ? 'text-black' : 'text-neutral-400'
                            }`}>
                              {s}
                            </span>
                          </div>
                          {i < FLOW.length - 1 && (
                            <div className={`mx-1 h-[1px] flex-1 ${i < activeIdx ? 'bg-black' : 'bg-neutral-200'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Summary */}
            <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">
                Order Items ({order.items.length})
              </p>
              <div className="divide-y divide-neutral-100">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 text-xs">
                    <Img src={it.image} alt="" className="h-14 w-11 object-cover bg-neutral-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-black truncate">{it.name}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-500 font-light">
                        {[it.size && `Size ${it.size}`, it.color].filter(Boolean).join(' · ')} · Qty: {it.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-black">{pkr(it.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Shipping</span>
                  <span>{order.shippingCharge === 0 ? 'Free Express' : pkr(order.shippingCharge)}</span>
                </div>
                <div className="flex justify-between font-medium text-black text-sm pt-1 border-t border-neutral-100">
                  <span>Total Amount</span>
                  <span>{pkr(order.total)}</span>
                </div>
              </div>

              {order.discreetPackaging && (
                <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-light pt-2">
                  <ShieldCheck size={13} className="text-black" /> 100% Plain discreet packaging verified
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
