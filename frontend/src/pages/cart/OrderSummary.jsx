import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { pkr } from '../../lib/format';
import CouponBox from './CouponBox';

/* ============================================================================
 * HUSHAE Shopping Bag Order Summary — Pure Minimal Luxury (The Row / SSENSE)
 * ========================================================================== */

export default function OrderSummary({ pricing, cfg, applied, onApply, onRemoveCoupon, blocked, ctaRef }) {
  const { subtotal, discount, shipping, tax, total, count, freeShip } = pricing;

  return (
    <div className="space-y-6 font-sans">
      {/* Summary Header */}
      <div className="border-b border-[#EAEAEA] pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#000000]">
          Summary
        </h2>
      </div>

      {/* Totals Breakdown */}
      <div className="space-y-3 text-xs" aria-live="polite">
        <div className="flex justify-between text-neutral-500 font-light">
          <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
          <span className="text-black font-normal tabular-nums">{pkr(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-black font-medium">
            <span>Discount {applied?.code ? `(${applied.code})` : ''}</span>
            <span className="tabular-nums">− {pkr(discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-neutral-500 font-light">
          <span>Shipping</span>
          <span className="text-black font-normal tabular-nums">
            {freeShip || shipping === 0 ? 'Complimentary' : pkr(shipping)}
          </span>
        </div>

        {tax > 0 && (
          <div className="flex justify-between text-neutral-500 font-light">
            <span>{cfg.taxLabel}</span>
            <span className="text-black font-normal tabular-nums">{pkr(tax)}</span>
          </div>
        )}

        <div className="flex items-baseline justify-between border-t border-[#EAEAEA] pt-4 text-sm">
          <span className="font-medium text-black">Total</span>
          <span className="text-lg font-medium tabular-nums text-black">{pkr(total)}</span>
        </div>
      </div>

      {/* Promo Code Box */}
      {cfg.couponEnabled && (
        <div className="border-t border-[#EAEAEA] pt-3">
          <CouponBox subtotal={subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
        </div>
      )}

      {/* Checkout CTA */}
      <div ref={ctaRef} className="pt-2">
        {blocked ? (
          <p className="flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            <AlertCircle size={14} aria-hidden="true" /> Remove sold-out items to continue
          </p>
        ) : (
          <Link
            to="/checkout"
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md transition-all hover:bg-neutral-800 hover:scale-[1.01]"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-neutral-400 font-light">
          <Lock size={11} className="text-black" />
          100% Discreet Packaging &bull; Cash on Delivery
        </p>
      </div>
    </div>
  );
}
