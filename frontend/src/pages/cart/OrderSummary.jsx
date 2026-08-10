import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { pkr } from '../../lib/format';
import PromoSummary from '../../components/marketing/PromoSummary';
import CouponBox from './CouponBox';
import FreeShipProgress from './FreeShipProgress';

/* ============================================================================
 * Order summary.
 *
 * Every number arrives already computed from useCartPricing so the summary,
 * the sticky mobile bar and the checkout page can never disagree — there is no
 * second calculation anywhere in the bag.
 *
 * The totals block is wrapped in aria-live="polite" so a screen reader hears
 * the new total after a quantity change instead of silently re-rendering.
 * ========================================================================== */
export default function OrderSummary({ pricing, cfg, applied, onApply, onRemoveCoupon, blocked, ctaRef, promoQuote = null }) {
  const { subtotal, discount, shipping, tax, total, savings, count, threshold, freeShip } = pricing;

  return (
    <div className="border border-[#E5E5E5] bg-white p-6 md:p-8">
      <h2 className="text-[15px] font-medium uppercase tracking-[0.08em] text-[#111111]">Order Summary</h2>

      {cfg.showProgress && (
        <div className="mt-5">
          <FreeShipProgress subtotal={subtotal} threshold={threshold} cfg={cfg} />
        </div>
      )}

      {cfg.couponEnabled && (
        <div className="mt-5">
          <CouponBox subtotal={subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
        </div>
      )}

      {/* Totals. Live region: the numbers change under the customer's hands. */}
      {/* Automatic offers, straight from the server's own calculation. Sits
          above the totals because it explains them. */}
      {promoQuote && (promoQuote.discounts?.length > 0 || promoQuote.rejected?.length > 0) && (
        <PromoSummary
          discounts={promoQuote.discounts}
          rejected={promoQuote.rejected}
          capped={promoQuote.capped}
          className="mt-5"
        />
      )}

      <dl className="mt-6 space-y-3 border-t border-[#E5E5E5] pt-5 text-[13px]" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt className="text-smoke">Subtotal ({count} {count === 1 ? 'item' : 'items'})</dt>
          <dd className="font-medium tabular-nums">{pkr(subtotal)}</dd>
        </div>

        {discount > 0 && (
          <div className="flex justify-between gap-4 text-charcoal">
            <dt>Discount {applied?.code ? `(${applied.code})` : ''}</dt>
            <dd className="font-medium tabular-nums">− {pkr(discount)}</dd>
          </div>
        )}

        <div className="flex justify-between gap-4">
          <dt className="text-smoke">Shipping</dt>
          <dd className={`font-medium tabular-nums ${freeShip ? 'text-charcoal' : ''}`}>
            {freeShip ? 'Free' : pkr(shipping)}
          </dd>
        </div>

        {tax > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-smoke">{cfg.taxLabel}</dt>
            <dd className="font-medium tabular-nums">{pkr(tax)}</dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4 border-t border-[#E5E5E5] pt-4">
          <dt className="text-[13px] font-medium text-[#111111]">Total</dt>
          <dd className="text-[26px] font-medium tabular-nums text-[#111111]">{pkr(total)}</dd>
        </div>

        {savings > 0 && (
          <div className="flex justify-between gap-4 bg-[#FAFAFA] px-3 py-2">
            <dt className="text-caption font-semibold uppercase tracking-wider text-charcoal">You save</dt>
            <dd className="text-caption font-bold tabular-nums text-charcoal">{pkr(savings)}</dd>
          </div>
        )}
      </dl>

      {/* ---- Checkout ----
          ctaRef sits on the button row itself, NOT on the summary card. An
          observer on the whole card fires when the card's edge leaves the
          viewport, which on a tall summary is hundreds of pixels away from
          the moment the customer actually loses sight of the button. */}
      <div ref={ctaRef} className="mt-6">
        {blocked ? (
          <p className="flex items-center justify-center gap-2 rounded-control bg-red-50 px-4 py-3.5 text-body-sm font-semibold text-red-700">
            <AlertCircle size={15} aria-hidden="true" /> Remove sold-out items to continue
          </p>
        ) : (
          <Link to="/checkout" className="btn-qa group gap-2">{cfg.checkoutLabel} <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></Link>
        )}
      </div>

      {/* Express payment placeholders — merchant switches these on once a
          provider is live. Disabled, never a dead-end click. */}
      {(cfg.applePay || cfg.googlePay) && (
        <div className="mt-3 space-y-2">
          {cfg.applePay && (
            <button type="button" disabled className="btn w-full cursor-not-allowed border border-line bg-white/60 text-ash opacity-70">
               Pay — coming soon
            </button>
          )}
          {cfg.googlePay && (
            <button type="button" disabled className="btn w-full cursor-not-allowed border border-line bg-white/60 text-ash opacity-70">
              G Pay — coming soon
            </button>
          )}
        </div>
      )}

      <Link
        to={cfg.continueHref}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center text-[12px] text-smoke underline underline-offset-4 transition hover:text-charcoal"
      >
        {cfg.continueLabel}
      </Link>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-smoke">
        <Lock size={11} aria-hidden="true" /> {cfg.deliveryNote}
      </p>

      {cfg.showTrust && (
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#E5E5E5] pt-5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#696969]">
          <span className="inline-flex items-center gap-1.5"><Truck size={13} aria-hidden="true" /> Delivery 2–5 days</span>
          <span className="inline-flex items-center gap-1.5"><RotateCcw size={13} aria-hidden="true" /> 14-day exchange</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} aria-hidden="true" /> Secure</span>
        </div>
      )}
    </div>
  );
}
