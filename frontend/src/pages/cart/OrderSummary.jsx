import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { pkr } from '../../lib/format';
import PromoSummary from '../../components/marketing/PromoSummary';
import CouponBox from './CouponBox';
import FreeShipProgress from './FreeShipProgress';

/* ============================================================================
 * HUSHAE Shopping Bag Order Summary — Minimalist Luxury Suite (The Row / SSENSE)
 * ========================================================================== */

export default function OrderSummary({ pricing, cfg, applied, onApply, onRemoveCoupon, blocked, ctaRef, promoQuote = null }) {
  const { subtotal, discount, shipping, tax, total, savings, count, threshold, freeShip } = pricing;

  return (
    <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 sm:p-7 space-y-5 font-sans shadow-xs">
      {/* Summary Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#000000]">
          Order Summary
        </h2>
        <span className="rounded-full bg-[#EAEAEA] px-2.5 py-0.5 text-[11px] font-medium text-[#000000]">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Free Shipping Progress */}
      {cfg.showProgress && (
        <FreeShipProgress subtotal={subtotal} threshold={threshold} cfg={cfg} />
      )}

      {/* Totals Breakdown */}
      <div className="space-y-2.5 text-xs border-t border-[#EAEAEA] pt-3.5" aria-live="polite">
        <div className="flex justify-between text-neutral-500 font-light">
          <span>Subtotal</span>
          <span className="text-black font-normal tabular-nums">{pkr(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-black font-medium">
            <span>Discount {applied?.code ? `(${applied.code})` : ''}</span>
            <span className="tabular-nums">− {pkr(discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-neutral-500 font-light">
          <span>Courier Delivery</span>
          <span className="text-black font-normal tabular-nums">
            {freeShip || shipping === 0 ? 'Free Express' : pkr(shipping)}
          </span>
        </div>

        {tax > 0 && (
          <div className="flex justify-between text-neutral-500 font-light">
            <span>{cfg.taxLabel}</span>
            <span className="text-black font-normal tabular-nums">{pkr(tax)}</span>
          </div>
        )}

        <div className="flex items-baseline justify-between border-t border-[#EAEAEA] pt-3.5 text-sm">
          <span className="font-medium text-black">Total</span>
          <span className="text-lg font-medium tabular-nums text-black">{pkr(total)}</span>
        </div>

        {savings > 0 && (
          <div className="flex justify-between rounded-xl bg-neutral-100 px-3 py-2 text-[11px] font-medium text-black">
            <span>Your Savings</span>
            <span className="tabular-nums">{pkr(savings)}</span>
          </div>
        )}
      </div>

      {/* Promo Code Box */}
      {cfg.couponEnabled && (
        <div className="border-t border-[#EAEAEA] pt-3">
          <CouponBox subtotal={subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
        </div>
      )}

      {promoQuote && (promoQuote.discounts?.length > 0 || promoQuote.rejected?.length > 0) && (
        <PromoSummary
          discounts={promoQuote.discounts}
          rejected={promoQuote.rejected}
          capped={promoQuote.capped}
          className="mt-2"
        />
      )}

      {/* Checkout CTA */}
      <div ref={ctaRef} className="pt-1">
        {blocked ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            <AlertCircle size={14} aria-hidden="true" /> Remove sold-out items to continue
          </p>
        ) : (
          <Link
            to="/checkout"
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md transition-all hover:bg-[#1A1A1A] hover:scale-[1.01]"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}

        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-neutral-400 font-light">
          <Lock size={11} className="text-black" />
          Discreet Packaging &bull; Cash on Delivery
        </p>
      </div>

      {/* Reassurance Strip */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-[#FFFFFF] p-3.5 space-y-2 text-[11px] text-neutral-500 font-light">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-black shrink-0" />
          <span>Discreet Packaging Guaranteed</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck size={13} className="text-black shrink-0" />
          <span>Express Delivery Across Pakistan (2–4 Days)</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw size={13} className="text-black shrink-0" />
          <span>14-Day Easy Size Exchanges</span>
        </div>
      </div>
    </div>
  );
}
