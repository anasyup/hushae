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
    <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#000000]">
          Order Summary
        </h2>
        <span className="text-xs text-neutral-500 font-light">
          {pricing.count} {pricing.count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Delivery Assurance */}
      <div className="flex items-center gap-3 bg-neutral-50 p-3.5 border border-neutral-100">
        <Truck size={16} className="text-black shrink-0" />
        <div className="text-[11.5px] text-neutral-600 font-light leading-snug">
          Estimated delivery <strong className="font-medium text-black">2–4 business days</strong>
          <span className="block text-[10.5px] text-neutral-400">100% plain parcel &bull; discreet courier</span>
        </div>
      </div>

      {/* Line Items List */}
      <ul className="divide-y divide-neutral-100 max-h-72 overflow-y-auto no-scrollbar pr-1">
        {cart.map((l, i) => (
          <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-3.5 py-3.5">
            <Img src={l.image} alt="" className="h-16 w-12 object-cover bg-neutral-100 shrink-0" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-xs font-normal text-black truncate leading-snug">{nameOf(l.name)}</p>
              <p className="text-[10.5px] text-neutral-400 font-light">
                {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')}
              </p>
              {onQty && (
                <div className="mt-1 inline-flex items-center border border-neutral-200 text-xs">
                  <button
                    type="button"
                    onClick={() => onQty(l, Math.max(1, l.qty - 1))}
                    className="h-6 w-6 grid place-items-center text-neutral-500 hover:text-black"
                  >
                    −
                  </button>
                  <span className="min-w-[20px] text-center text-[11px] font-medium">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => onQty(l, Math.min(cartCfg?.maxQty || 10, l.qty + 1))}
                    className="h-6 w-6 grid place-items-center text-neutral-500 hover:text-black"
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
      <div className="border-t border-neutral-100 pt-4">
        <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
      </div>

      {/* Totals Breakdown */}
      <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
        <div className="flex justify-between text-neutral-600 font-light">
          <span>Subtotal</span>
          <span className="text-black font-normal">{pkr(pricing.subtotal)}</span>
        </div>

        {pricing.discount > 0 && (
          <div className="flex justify-between text-black">
            <span>Discount {applied?.code ? `(${applied.code})` : ''}</span>
            <span className="font-medium">− {pkr(pricing.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-neutral-600 font-light">
          <span>Courier Delivery</span>
          <span className="text-black font-normal">
            {pricing.shipping === 0 ? 'Free Express' : pkr(pricing.shipping)}
          </span>
        </div>

        <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3 text-sm">
          <span className="font-medium text-black">Total to Pay</span>
          <span className="font-sans text-xl font-medium text-black">{pkr(pricing.total)}</span>
        </div>
      </div>

      {/* 1-Tap Place Order Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || disabled}
          className="flex h-[52px] w-full items-center justify-center gap-2 bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          <span>{busy ? 'Placing Order…' : `Place COD Order · ${pkr(pricing.total)}`}</span>
          <ArrowRight size={14} />
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-neutral-400 font-light">
          <Lock size={11} className="text-black" />
          256-Bit SSL encrypted &bull; Cash on Delivery verified
        </p>
      </div>

      {/* 3 Reassurance Pillars */}
      <div className="border-t border-neutral-100 pt-4 space-y-2 text-[11px] text-neutral-500 font-light">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-black shrink-0" />
          <span>100% Plain Discreet Packaging Guaranteed</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw size={13} className="text-black shrink-0" />
          <span>14-Day Easy Exchange Policy</span>
        </div>
      </div>
    </div>
  );
}
