import { Link } from 'react-router-dom';
import { Lock, Truck, ShieldCheck, RotateCcw, ArrowRight } from 'lucide-react';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';
import Img from '../../components/Img';
import CouponBox from '../cart/CouponBox';

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function CheckoutSummary({
  cart, pricing, cartCfg, checkoutCfg, applied, onApply, onRemoveCoupon,
  onSubmit, busy, disabled, onQty
}) {
  return (
    <div className="rounded-3xl border border-neutral-200/90 bg-[#FAFAFA] p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
            SUMMARY
          </p>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#000000] mt-0.5">
            Order Review
          </h2>
        </div>
        <span className="rounded-full bg-neutral-200/70 px-3 py-1 text-[11px] font-medium text-black">
          {pricing.count} {pricing.count === 1 ? 'piece' : 'pieces'}
        </span>
      </div>

      {/* Delivery Assurance Oval Card */}
      <div className="rounded-2xl bg-white border border-neutral-200/80 p-4 flex items-center gap-3.5 shadow-xs">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 shrink-0">
          <Truck size={16} className="text-black" />
        </div>
        <div className="text-xs text-neutral-600 font-light leading-snug">
          Estimated delivery <strong className="font-medium text-black">2–4 business days</strong>
          <span className="block text-[10.5px] text-neutral-400 mt-0.5">100% plain discreet parcel &bull; TCS Courier</span>
        </div>
      </div>

      {/* Line Items List */}
      <ul className="divide-y divide-neutral-200/60 max-h-72 overflow-y-auto no-scrollbar pr-1">
        {cart.map((l, i) => (
          <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-3.5 py-3.5">
            <div className="h-16 w-12 rounded-xl overflow-hidden bg-white shrink-0 border border-neutral-200">
              <Img src={l.image} alt="" className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-black truncate leading-snug">{nameOf(l.name)}</p>
              <p className="text-[11px] text-neutral-500 font-light">
                {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')}
              </p>

              {onQty && (
                <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-1 text-xs">
                  <button
                    type="button"
                    onClick={() => onQty(l, Math.max(1, l.qty - 1))}
                    className="h-5 w-5 grid place-items-center text-neutral-500 hover:text-black"
                  >
                    −
                  </button>
                  <span className="min-w-[18px] text-center text-[11px] font-medium">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => onQty(l, Math.min(cartCfg?.maxQty || 10, l.qty + 1))}
                    className="h-5 w-5 grid place-items-center text-neutral-500 hover:text-black"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            <span className="shrink-0 text-xs font-medium text-black">{pkr(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>

      {/* Coupon Box */}
      <div className="border-t border-neutral-200/80 pt-4">
        <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
      </div>

      {/* Totals Breakdown */}
      <div className="border-t border-neutral-200/80 pt-4 space-y-2.5 text-xs">
        <div className="flex justify-between text-neutral-600 font-light">
          <span>Subtotal</span>
          <span className="text-black font-normal">{pkr(pricing.subtotal)}</span>
        </div>

        {pricing.discount > 0 && (
          <div className="flex justify-between text-black font-medium">
            <span>Discount ({applied?.code})</span>
            <span>− {pkr(pricing.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-neutral-600 font-light">
          <span>Delivery</span>
          <span className="text-black font-normal">
            {pricing.shipping === 0 ? 'Free Express' : pkr(pricing.shipping)}
          </span>
        </div>

        <div className="flex items-baseline justify-between border-t border-neutral-300 pt-3.5 text-sm">
          <span className="font-medium text-black">Total to Pay (COD)</span>
          <span className="font-sans text-xl font-medium text-black">{pkr(pricing.total)}</span>
        </div>
      </div>

      {/* 1-Tap Place Order Button (Smooth Oval Pill) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || disabled}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md transition-all hover:bg-neutral-800 hover:scale-[1.01] disabled:opacity-50"
        >
          <span>{busy ? 'Placing Order…' : `Confirm Order · ${pkr(pricing.total)}`}</span>
          <ArrowRight size={14} />
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-neutral-400 font-light">
          <Lock size={11} className="text-black" />
          256-Bit SSL encrypted &bull; Cash on Delivery verified
        </p>
      </div>

      {/* Reassurance Pillars (Rounded Oval Card) */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 space-y-2.5 text-[11px] text-neutral-600 font-light">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={14} className="text-black shrink-0" />
          <span>100% Plain Discreet Packaging Guaranteed</span>
        </div>
        <div className="flex items-center gap-2.5">
          <RotateCcw size={14} className="text-black shrink-0" />
          <span>14-Day Easy Exchange Policy</span>
        </div>
      </div>
    </div>
  );
}
