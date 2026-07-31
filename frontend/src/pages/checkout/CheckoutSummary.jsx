import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';
import CouponBox from '../cart/CouponBox';
import TrustRow from '../cart/TrustRow';
import Spinner from '../../components/ui/Spinner';

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
  submitRef, onSubmit, busy, disabled, rewardsSlot,
}) {
  return (
    <div className="card-content">
      <h2 className="text-label uppercase tracking-widest text-ash">Your order</h2>

      <ul className="mt-5 max-h-72 space-y-3.5 overflow-y-auto pr-1">
        {cart.map((l, i) => (
          <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Img src={l.image} alt="" className="h-16 w-12 rounded-control border border-line object-cover" />
              <span
                className="absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-obsidian px-1 text-[10px] font-bold text-alabaster"
                aria-hidden="true"
              >
                {l.qty}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="clamp-2 text-body-sm font-medium leading-snug">{l.name}</p>
              <p className="text-caption text-ash">
                {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')}
                <span className="sr-only">, quantity {l.qty}</span>
              </p>
            </div>
            <p className="text-body-sm font-semibold tabular-nums">{pkr(l.price * l.qty)}</p>
          </li>
        ))}
      </ul>

      {cartCfg.couponEnabled && (
        <div className="mt-5 border-t border-line pt-5">
          <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={onApply} onRemove={onRemoveCoupon} />
        </div>
      )}

      {/* Points, store credit and gift cards. Rendered by the parent so the
          quote it depends on lives next to the pricing that consumes it. */}
      {rewardsSlot}

      {/* Live region: the total changes when a coupon or shipping method changes. */}
      <dl className="mt-5 space-y-3 border-t border-line pt-5 text-body-sm" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt className="text-ash">Subtotal ({pricing.count} {pricing.count === 1 ? 'item' : 'items'})</dt>
          <dd className="font-medium tabular-nums">{pkr(pricing.subtotal)}</dd>
        </div>
        {pricing.discount > 0 && (
          <div className="flex justify-between gap-4 text-sagedark">
            <dt>Discount {applied?.code ? `(${applied.code})` : ''}</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ash">Shipping</dt>
          <dd className={`font-medium tabular-nums ${pricing.shipping === 0 ? 'text-sagedark' : ''}`}>
            {pricing.shipping === 0 ? 'Free' : pkr(pricing.shipping)}
          </dd>
        </div>
        {pricing.tax > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ash">{cartCfg.taxLabel}</dt>
            <dd className="font-medium tabular-nums">{pkr(pricing.tax)}</dd>
          </div>
        )}
        {/* Each reward is its own line. Rolling them into "discount" would
            hide what is a coupon, what is settled points and what is store
            credit — three different things on the merchant's books. */}
        {pricing.pointsValue > 0 && (
          <div className="flex justify-between gap-4 text-sagedark">
            <dt>Points applied</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.pointsValue)}</dd>
          </div>
        )}
        {pricing.creditValue > 0 && (
          <div className="flex justify-between gap-4 text-sagedark">
            <dt>Store credit</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.creditValue)}</dd>
          </div>
        )}
        {pricing.cardValue > 0 && (
          <div className="flex justify-between gap-4 text-sagedark">
            <dt>Gift card</dt>
            <dd className="font-medium tabular-nums">− {pkr(pricing.cardValue)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <dt className="text-body font-semibold">Total</dt>
          <dd className="font-display text-h4 tabular-nums">{pkr(pricing.total)}</dd>
        </div>
        {pricing.savings > 0 && (
          <div className="flex justify-between gap-4 rounded-control bg-sage/12 px-3 py-2">
            <dt className="text-caption font-semibold uppercase tracking-wider text-sagedark">You save</dt>
            <dd className="text-caption font-bold tabular-nums text-sagedark">{pkr(pricing.savings)}</dd>
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

      <p className="mt-3 text-center text-caption text-ash">
        You will see one final summary before anything is placed.
      </p>

      <Link
        to="/cart"
        className="mt-2 flex min-h-[44px] w-full items-center justify-center text-body-sm text-ash underline-offset-4 transition hover:text-obsidian hover:underline"
      >
        Back to bag
      </Link>

      {checkoutCfg.showTrust && (
        <TrustRow items={checkoutCfg.trust} className="mt-5 border-t border-line pt-5" />
      )}

      {checkoutCfg.privacyText && (
        <p className="mt-4 text-center text-caption leading-relaxed text-ash">{checkoutCfg.privacyText}</p>
      )}
    </div>
  );
}
