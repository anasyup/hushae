import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { pkr, fmtDate } from '../lib/format';
import Img from '../components/Img';

export default function OrderConfirm() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const order = state?.order;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/25 text-sagedeep">
          <Check size={28} strokeWidth={2.5} />
        </motion.span>
        <h1 className="mt-6 font-display text-4xl">Thank you — order placed</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ash">
          Your order is confirmed and being prepared. Keep your order number safe — you will need it to track your parcel.
        </p>
      </motion.div>

      <div className="mt-10 rounded-3xl border border-line bg-white/70 p-6 text-center md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Order number</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <p className="font-mono text-2xl tracking-wider md:text-3xl">{orderNumber}</p>
          <button onClick={copy} aria-label="Copy" className="rounded-full border border-line p-2.5 text-ash transition hover:border-obsidian hover:text-obsidian">
            {copied ? <Check size={15} className="text-sagedeep" /> : <Copy size={15} />}
          </button>
        </div>

        {order && (
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-left text-sm md:grid-cols-4">
            {[['Name', order.customerInfo?.name], ['Total', pkr(order.total)], ['Payment', order.paymentMethod], ['Status', order.status]].map(([k, v]) => (
              <div key={k}><p className="text-[10px] font-bold uppercase tracking-wider text-ash">{k}</p><p className="mt-0.5 font-medium">{v}</p></div>
            ))}
          </div>
        )}
      </div>

      {order?.items && (
        <div className="mt-6 rounded-3xl border border-line bg-white/60 p-6">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ash">Items ({order.items.length})</p>
          <div className="space-y-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Img src={it.image} alt="" className="h-12 w-10 rounded-lg object-cover" />
                <span className="flex-1 clamp-2">{it.name} <span className="text-ash">· {it.size} · x{it.quantity}</span></span>
                <span className="font-medium">{pkr(it.lineTotal)}</span>
              </div>
            ))}
          </div>
          {!!order.discount && <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm font-medium text-sagedeep"><span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span><span>− {pkr(order.discount)}</span></div>}
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm"><span className="text-ash">Shipping</span><span>{order.shippingCharge === 0 ? 'Free' : pkr(order.shippingCharge)}</span></div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={`/track?orderNumber=${orderNumber}${order?.customerInfo?.phone ? `&phone=${encodeURIComponent(order.customerInfo.phone)}` : ''}`} className="btn-primary">Track this order</Link>
        <Link to="/shop" className="btn-outline">Continue shopping</Link>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-ash">
        {order?.paymentMethod === 'COD'
          ? 'Payment: Cash on Delivery — please keep the amount ready for the rider.'
          : 'Your payment is pending verification. Our team confirms it within a few hours and ships right after.'}
        <br />Estimated delivery: 2–4 working days · Placed {order ? fmtDate(order.createdAt) : 'today'}
      </p>
    </div>
  );
}
