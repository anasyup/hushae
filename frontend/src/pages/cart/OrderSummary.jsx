import { Link } from 'react-router-dom';
import { AlertCircle, Lock } from 'lucide-react';
import { pkr } from '../../lib/format';
import PromoSummary from '../../components/marketing/PromoSummary';
import CouponBox from './CouponBox';
import FreeShipProgress from './FreeShipProgress';
import TrustRow from './TrustRow';

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
    <div className="summary-card">
      <h2 className="label-qa">Order summary</h2>

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

      <dl className="mt-6 space-y-3 border-t border-clay pt-5 text-[13px]" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt className="text-smoke">Subtotal ({count} {count === 1 ? 'item' : 'items'})</dt>
          <dd className="font-medium tabular-nums">{pkr(subtotal)}</dd>
        </div>

        {discount > 0 && (
          <div className="flex justify-between gap-4 text-sagedark">
            <dt>Discount {applied?.code ? `(${applied.code})` : ''}</dt>
            <dd className="font-medium tabular-nums">− {pkr(discount)}</dd>
          </div>
        )}

        <div className="flex justify-between gap-4">
          <dt className="text-smoke">Shipping</dt>
          <dd className={`font-medium tabular-nums ${freeShip ? 'text-sagedark' : ''}`}>
            {freeShip ? 'Free' : pkr(shipping)}
          </dd>
        </div>

        {tax > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-smoke">{cfg.taxLabel}</dt>
            <dd className="font-medium tabular-nums">{pkr(tax)}</dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4 border-t border-clay pt-4">
          <dt className="text-[13px] font-medium text-charcoal">Estimated total</dt>
          <dd className="text-[20px] font-medium tabular-nums text-charcoal">{pkr(total)}</dd>
        </div>

        {savings > 0 && (
          <div className="flex justify-between gap-4 rounded-control bg-sage/12 px-3 py-2">
            <dt className="text-caption font-semibold uppercase tracking-wider text-sagedark">You save</dt>
            <dd className="text-caption font-bold tabular-nums text-sagedark">{pkr(savings)}</dd>
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
          <Link to="/checkout" className="btn-qa">{cfg.checkoutLabel}</Link>
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

      {cfg.showTrust && <TrustRow items={cfg.trust} className="mt-5 border-t border-clay pt-5" />}
    </div>
  );
}
