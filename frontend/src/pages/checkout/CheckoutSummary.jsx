import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';

/* QA - strip the header brand word, Title Case the rest. */
const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));
import Img from '../../components/Img';
import CouponBox from '../cart/CouponBox';
import TrustRow from '../cart/TrustRow';
import Spinner from '../../components/ui/Spinner';
import PromoSummary from '../../components/marketing/PromoSummary';

/* ============================================================================
 * Checkout order summary.
 *
 * Reuses the bag's CouponBox and TrustRow verbatim, and every number comes
 * from the pricing object built by useCartPricing — the same engine the bag
 * and the drawer use. There is no second calculation on this page, which is
 * what let the old checkout quote a different total from the bag.
 * ========================================================================== */
export default function CheckoutSummary({
  cart, pricing, cartCfg, checkoutCfg, applied, onApply, onRemoveCoupon,
  submitRef, onSubmit, busy, disabled, rewardsSlot, promoQuote = null,
}) {
  return (
    <div className="summary-card">
      <h2 className="label-qa">Your order</h2>

      <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
        {cart.map((l, i) => (
          <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-4 border-b border-clay/60 pb-4 last:border-0 last:pb-0">
            <Img src={l.image} alt="" className="h-15 w-[60px] shrink-0 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="clamp-2 text-[12px] font-normal leading-snug text-charcoal">{nameOf(l.name)}</p>
              <p className="mt-0.5 text-[10px] text-smoke">
                {[l.size && `Size ${l.size}`, l.color, `Qty ${l.qty}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="shrink-0 text-[12px] font-medium tabular-nums text-charcoal">{pkr(l.price * l.qty)}</p>
          </li>
        ))}
      </ul>

      {cartCfg.couponEnabled && (
        <div className="mt-5 border-t border-clay pt-5">
          <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
        </div>
      )}

      {/* Automatic promotions, priced by the server. */}
      {promoQuote && (promoQuote.discounts?.length > 0 || promoQuote.rejected?.length > 0) && (
        <PromoSummary
          discounts={promoQuote.discounts}
          rejected={promoQuote.rejected}
          capped={promoQuote.capped}
          className="mt-5 border-t border-clay pt-5"
        />
      )}

      {/* Points, store credit and gift cards. Rendered by the parent so the
          quote it depends on lives next to the pricing that consumes it. */}
      {rewardsSlot}

      {/* Live region: the total changes when a coupon or shipping method changes. */}
      <dl className="mt-5 space-y-3 border-t border-clay pt-5 text-[13px]" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt className="text-smoke">Subtotal ({pricing.count} {pricing.count === 1 ? 'item' : 'items'})</dt>
          <dd className="font-medium tabular-nums">{pkr(pricing.subtotal)}</dd>
        </div>
        {pricing.discount > 0 && (
          <div className="flex justify-between gap-4 text-charcoal">
            <dt>Discount {applied?.code ? `(${applied.code})` : ''}</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-smoke">Shipping</dt>
          <dd className={`font-medium tabular-nums ${pricing.shipping === 0 ? 'text-charcoal' : ''}`}>
            {pricing.shipping === 0 ? 'Free' : pkr(pricing.shipping)}
          </dd>
        </div>
        {pricing.tax > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-smoke">{cartCfg.taxLabel}</dt>
            <dd className="font-medium tabular-nums">{pkr(pricing.tax)}</dd>
          </div>
        )}
        {/* Each reward is its own line. Rolling them into "discount" would
            hide what is a coupon, what is settled points and what is store
            credit — three different things on the merchant's books. */}
        {pricing.pointsValue > 0 && (
          <div className="flex justify-between gap-4 text-charcoal">
            <dt>Points applied</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.pointsValue)}</dd>
          </div>
        )}
        {pricing.creditValue > 0 && (
          <div className="flex justify-between gap-4 text-charcoal">
            <dt>Store credit</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.creditValue)}</dd>
          </div>
        )}
        {pricing.cardValue > 0 && (
          <div className="flex justify-between gap-4 text-charcoal">
            <dt>Gift card</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.cardValue)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-clay pt-4">
          <dt className="text-[13px] font-medium text-charcoal">Total</dt>
          <dd className="text-[20px] font-medium tabular-nums text-charcoal">{pkr(pricing.total)}</dd>
        </div>
        {pricing.savings > 0 && (
          <div className="flex justify-between gap-4 rounded-control bg-sand px-3 py-2">
            <dt className="text-caption font-semibold uppercase tracking-wider text-charcoal">You save</dt>
            <dd className="text-caption font-bold tabular-nums text-charcoal">{pkr(pricing.savings)}</dd>
          </div>
        )}
      </dl>

      <div ref={submitRef} className="mt-6">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || disabled}
          className="btn-primary w-full gap-2 disabled:opacity-50"
        >
          {busy ? <><Spinner label="Working" /> One moment…</> : <><Lock size={14} aria-hidden="true" /> Review order</>}
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-smoke">
        You will see one final summary before anything is placed.
      </p>

      <Link
        to="/cart"
        className="mt-3 flex min-h-[44px] w-full items-center justify-center text-[12px] text-smoke underline underline-offset-4 transition hover:text-charcoal"
      >
        Back to bag
      </Link>

      {checkoutCfg.showTrust && (
        <p className="mt-5 border-t border-clay pt-5 text-center text-[11px] text-smoke">Discreet packaging - Secure checkout</p>
      )}

      {checkoutCfg.privacyText && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-smoke">{checkoutCfg.privacyText}</p>
      )}
    </div>
  );
}
