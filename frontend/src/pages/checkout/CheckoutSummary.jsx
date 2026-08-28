import { Lock, Truck, ShieldCheck, RotateCcw, ArrowRight } from 'lucide-react';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';
import Img from '../../components/Img';
import CouponBox from '../cart/CouponBox';

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

import { money, useFx, fxNote } from '../../lib/fx';

export default function CheckoutSummary({
  cart, pricing, cartCfg, checkoutCfg, applied, onApply, onRemoveCoupon,
  onSubmit, busy, disabled, onQty
}) {
  useFx();
  return (
    <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 sm:p-8 space-y-6 shadow-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#000000]">
            Order Summary
          </h2>
        </div>
        <span className="rounded-full bg-[#EAEAEA] px-3 py-1 text-[11px] font-medium text-[#000000]">
          {pricing.count} {pricing.count === 1 ? 'piece' : 'pieces'}
        </span>
      </div>

      {/* Delivery Assurance */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#EAEAEA] p-4 flex items-center gap-3.5 shadow-xs">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5] shrink-0">
          <Truck size={16} className="text-[#000000]" />
        </div>
        <div className="text-xs text-[#555555] font-light leading-snug">
          Estimated delivery <strong className="font-medium text-[#000000]">2–4 business days</strong>
          <span className="block text-[11px] text-[#888888] mt-0.5">Express Courier Delivery</span>
        </div>
      </div>

      {/* Line Items List */}
      <ul className="divide-y divide-[#EAEAEA] max-h-72 overflow-y-auto no-scrollbar pr-1">
        {cart.map((l, i) => (
          <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-3.5 py-3.5">
            <div className="h-16 w-12 rounded-xl overflow-hidden bg-[#FFFFFF] shrink-0 border border-[#EAEAEA]">
              <Img src={l.image} alt="" className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium text-[#000000] truncate leading-snug">{nameOf(l.name)}</p>
              <p className="text-[11px] text-[#666666] font-light">
                {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')}
              </p>

              {onQty && (
                <div className="inline-flex items-center rounded-full border border-[#E0E0E0] bg-[#FFFFFF] px-1 text-xs">
                  <button
                    type="button"
                    onClick={() => onQty(l, Math.max(1, l.qty - 1))}
                    className="h-5 w-5 grid place-items-center text-[#666666] hover:text-[#000000]"
                  >
                    −
                  </button>
                  <span className="min-w-[18px] text-center text-[11px] font-medium text-[#000000]">{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => onQty(l, Math.min(cartCfg?.maxQty || 10, l.qty + 1))}
                    className="h-5 w-5 grid place-items-center text-[#666666] hover:text-[#000000]"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            <span className="shrink-0 text-xs font-medium text-[#000000]">{money(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>

      {/* Coupon Box */}
      <div className="border-t border-[#EAEAEA] pt-4">
        <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
      </div>

      {/* Totals Breakdown */}
      <div className="border-t border-[#EAEAEA] pt-4 space-y-2.5 text-xs">
        <div className="flex justify-between text-[#555555] font-light">
          <span>Subtotal</span>
          <span className="text-[#000000] font-normal">{money(pricing.subtotal)}</span>
        </div>

        {pricing.discount > 0 && (
          <div className="flex justify-between text-[#000000] font-medium">
            <span>Discount ({applied?.code})</span>
            <span>− {money(pricing.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-[#555555] font-light">
          <span>Delivery</span>
          <span className="text-[#000000] font-normal">
            {pricing.shipping === 0 ? 'Free' : money(pricing.shipping)}
          </span>
        </div>

        <div className="flex items-baseline justify-between border-t border-[#DCDCDC] pt-3.5 text-sm">
          <span className="font-medium text-[#000000]">Total</span>
          <span className="font-sans text-xl font-medium text-[#000000]">{money(pricing.total)}</span>
        {fxNote() && <p className="mt-1 text-right text-[10px] text-[#6b7280]">{fxNote()}</p>}</div>
      </div>

      {/* 1-Tap Place Order Button (Smooth Oval Pill) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || disabled}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md transition-all hover:bg-[#1A1A1A] hover:scale-[1.01] disabled:opacity-50"
        >
          <span>{busy ? 'Placing Order…' : 'Confirm Order'}</span>
          <ArrowRight size={14} />
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#777777] font-light">
          <Lock size={11} className="text-[#000000]" />
          Discreet Packaging &bull; Cash on Delivery
        </p>
      </div>

      {/* Reassurance Pillars (Rounded Oval Card) */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-[#FFFFFF] p-4 space-y-2.5 text-[11.5px] text-[#555555] font-light">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={14} className="text-[#000000] shrink-0" />
          <span>Discreet Packaging Guaranteed</span>
        </div>
        <div className="flex items-center gap-2.5">
          <RotateCcw size={14} className="text-[#000000] shrink-0" />
          <span>14-Day Size Exchanges</span>
        </div>
      </div>
    </div>
  );
}
