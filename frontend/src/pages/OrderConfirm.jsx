import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, Share2, Truck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, fmtDate, snap } from '../lib/format';
import { cartConfig, deliveryWindow } from '../lib/cartConfig';
import { checkoutConfig, enabledShipping, methodWindow } from '../lib/checkoutConfig';
import { titleCase } from '../lib/productMeta';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import TrustRow from './cart/TrustRow';

/* ============================================================================
 * ORDER SUCCESS — "minimal 3D, cool" redesign (warm ivory register).
 *
 * Research-backed (Baymard / top conversion pages):
 *   · personalized thank-you with the customer's first name
 *   · order number front-and-centre, copy + share
 *   · delivery ETA made obvious
 *   · item summary WITH images — verify at a glance
 *   · one clear primary action (Track), one quiet continuation link
 *   · support line for post-purchase anxiety
 *   · cross-sell BELOW the confirmation, never above it
 *
 * The "3D" is an accent, not decoration: a gold confirmation badge that
 * floats on a slow 3D arc, and the order card that settles in with a gentle
 * perspective tilt. Typography stays quiet (Inter light, tracked caps),
 * surfaces stay warm (stone/sand/clay), and every animation respects
 * prefers-reduced-motion via the global rule.
 * ========================================================================== */

/* QA — strip the brand prefix, Title Case the rest (same rule as cards). */
const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function OrderConfirm() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const { settings, recent } = useApp();
  const order = state?.order;

  const cfg = useMemo(() => checkoutConfig(settings), [settings]);
  const cartCfg = useMemo(() => cartConfig(settings), [settings]);

  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [recommend, setRecommend] = useState([]);

  const shipMethod = useMemo(
    () => enabledShipping(cfg).find((m) => m.id === order?.shippingMethod) || null,
    [cfg, order],
  );
  const eta = shipMethod ? methodWindow(shipMethod) : deliveryWindow(cartCfg);

  useEffect(() => {
    if (!cfg.showSuccessRecommend) return undefined;
    let alive = true;
    api('/products?sort=best&limit=8')
      .then((d) => { if (alive) setRecommend((d.products || []).slice(0, 6).map(snap)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [cfg.showSuccessRecommend]);

  const copy = () => {
    navigator.clipboard?.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    const text = `${cfg.successShareText} — order ${orderNumber}`;
    const url = `${window.location.origin}/track?orderNumber=${encodeURIComponent(orderNumber)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'HUSHAE', text, url });
      else { await navigator.clipboard?.writeText(`${text} ${url}`); setShared(true); setTimeout(() => setShared(false), 1600); }
    } catch { /* user dismissed the sheet */ }
  };

  const firstName = (order?.customerInfo?.name || '').trim().split(/\s+/)[0] || '';
  const supportEmail = settings?.contactEmail && !/veloura/i.test(settings.contactEmail)
    ? settings.contactEmail
    : 'care@hushae.pk';

  const iconBtn = 'grid h-11 w-11 place-items-center border border-clay text-smoke transition-colors duration-300 hover:border-charcoal hover:text-charcoal';

  return (
    <div className="container-page bg-stone py-16 text-charcoal md:py-24">
      <div className="mx-auto max-w-3xl">
        {/* ═══ HERO — 3D badge + personalized thank-you ═══════════════ */}
        <div className="text-center">
          {/* Gold confirmation badge — slow 3D float */}
          <div className="relative mx-auto grid h-24 w-24 place-items-center" style={{ perspective: '600px' }}>
            {/* layered depth — a coin, not a flat circle */}
            <div
              className="absolute inset-0 rounded-full bg-bronze/30 blur-xl"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 animate-[float-3d_5s_ease-in-out_infinite] rounded-full bg-gradient-to-b from-gold via-gold to-bronze shadow-[0_18px_40px_-12px_rgba(166,138,86,0.55)]"
              aria-hidden="true"
            />
            <div
              className="absolute inset-[3px] animate-[float-3d_5s_ease-in-out_infinite] rounded-full border border-white/40 bg-gradient-to-b from-white/25 to-transparent"
              aria-hidden="true"
            />
            <span
              className="relative z-10 grid h-full w-full animate-[check-pop_0.6s_cubic-bezier(0.25,1,0.5,1)_0.2s_both] place-items-center text-white"
            >
              <Check size={40} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </div>

          <p className="mt-9 text-[10px] font-medium uppercase tracking-[0.32em] text-smoke">
            Order confirmed
          </p>
          <h1 className="mt-4 text-[clamp(32px,4vw,46px)] font-light normal-case leading-[1.1] tracking-[0.02em] text-charcoal">
            {firstName ? <>Thank you, {firstName}.</> : 'Thank you.'}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14px] font-light leading-[1.7] text-smoke">
            {cfg.successText}
          </p>
        </div>

        {/* ═══ ORDER CARD — gentle 3D settle ═════════════════════════ */}
        <div
          className="mx-auto mt-12 animate-[card-3d-in_0.7s_cubic-bezier(0.25,1,0.5,1)_0.15s_both] border border-clay bg-sand p-6 md:p-10"
          style={{ transformOrigin: 'center top' }}
        >
          {/* Order number */}
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-smoke">Order number</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <p className="font-mono text-[22px] font-normal tracking-[0.08em] text-charcoal md:text-[26px]">
                {orderNumber}
              </p>
              <button type="button" onClick={copy} aria-label={`Copy order number ${orderNumber}`} className={iconBtn}>
                {copied ? <Check size={15} className="text-gold" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              </button>
              {cfg.showSuccessShare && (
                <button type="button" onClick={share} aria-label="Share this order" className={iconBtn}>
                  {shared ? <Check size={15} className="text-gold" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
                </button>
              )}
            </div>
            <p className="sr-only" role="status">{copied ? 'Order number copied' : ''}{shared ? 'Order link copied' : ''}</p>

            {/* ETA — obvious, gold icon */}
            <p className="mt-5 inline-flex items-center gap-2 border border-clay bg-stone px-5 py-2.5 text-[12px] text-smoke">
              <Truck size={13} className="text-gold" aria-hidden="true" />
              Estimated delivery <span className="font-medium text-charcoal">{eta}</span>
            </p>
          </div>

          {/* Quick facts — clean 2×2 grid */}
          {order && (
            <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 border-t border-clay pt-7 md:grid-cols-4">
              {[
                ['Name', order.customerInfo?.name],
                ['Total', pkr(order.total)],
                ['Payment', order.paymentMethod],
                ['Status', order.status],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-smoke">{k}</dt>
                  <dd className="mt-1.5 text-[13px] font-normal normal-case text-charcoal">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* ═══ ITEMS — images, verify at a glance ═════════════════════ */}
        {order?.items?.length > 0 && (
          <div className="mx-auto mt-6 border border-clay bg-pearl/60 p-6 md:p-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-smoke">
                Items ({order.items.length})
              </h2>
              <span className="font-mono text-[10px] tracking-[0.2em] text-smoke">
                {order.items.length} piece{order.items.length === 1 ? '' : 's'}
              </span>
            </div>

            <ul className="mt-6 space-y-5">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-4 border-b border-clay/50 pb-5 last:border-0 last:pb-0">
                  <Img src={it.image} alt="" className="h-20 w-[60px] shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="clamp-1 text-[13px] font-normal normal-case text-charcoal">{nameOf(it.name)}</p>
                    <p className="mt-1 text-[11px] text-smoke">
                      {[it.size && `Size ${it.size}`, it.quantity > 1 ? `Qty ${it.quantity}` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-medium tabular-nums text-charcoal">{pkr(it.lineTotal)}</p>
                </li>
              ))}
            </ul>

            {/* Totals — clean, no green */}
            <dl className="mt-6 space-y-2.5 border-t border-clay pt-5 text-[13px]">
              {!!order.discount && (
                <div className="flex justify-between text-smoke">
                  <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd className="tabular-nums">− {pkr(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-smoke">Shipping</dt>
                <dd className="tabular-nums text-charcoal">{order.shippingCharge === 0 ? 'Free' : pkr(order.shippingCharge)}</dd>
              </div>
              {!!order.tax && (
                <div className="flex justify-between">
                  <dt className="text-smoke">{cartCfg.taxLabel}</dt>
                  <dd className="tabular-nums text-charcoal">{pkr(order.tax)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-clay pt-4">
                <dt className="text-[13px] font-medium text-charcoal">Total</dt>
                <dd className="text-[22px] font-medium tabular-nums text-charcoal">{pkr(order.total)}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* ═══ ACTIONS — one primary, one quiet ══════════════════════ */}
        <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-5">
          <Link
            to={`/track?orderNumber=${orderNumber}${order?.customerInfo?.phone ? `&phone=${encodeURIComponent(order.customerInfo.phone)}` : ''}`}
            className="inline-flex min-h-[52px] w-full items-center justify-center bg-charcoal px-12 text-[13px] font-medium uppercase tracking-[0.16em] text-pearl transition-colors duration-300 hover:bg-graphite sm:w-auto"
          >
            Track this order
          </Link>
          <Link
            to={cartCfg.continueHref}
            className="group inline-flex items-center gap-2 border-b border-charcoal/25 pb-1 text-[12px] font-medium uppercase tracking-[0.16em] text-charcoal transition-colors duration-300 hover:border-charcoal"
          >
            {cartCfg.continueLabel} <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* ═══ SUPPORT + TRUST — post-purchase reassurance ═══════════ */}
        <p className="mx-auto mt-10 max-w-xl text-center text-[12px] leading-[1.8] text-smoke">
          {order?.paymentMethod === 'COD'
            ? 'Cash on Delivery — please keep the exact amount ready for the rider.'
            : 'Your payment is pending verification. We confirm it within a few hours and ship straight after.'}
          {order?.createdAt && <><br />Placed {fmtDate(order.createdAt)}</>}
          {cfg.successNote && <><br />{cfg.successNote}</>}
        </p>

        <p className="mt-6 text-center text-[11px] text-smoke">
          Questions? <a href={`mailto:${supportEmail}`} className="text-charcoal underline underline-offset-4 transition hover:text-gold">{supportEmail}</a>
        </p>

        {cfg.showTrust && (
          <div className="mx-auto mt-8 max-w-md">
            <TrustRow items={cfg.trust} />
          </div>
        )}

        {/* ═══ CROSS-SELL — below the confirmation, never above ══════ */}
        {cfg.showSuccessRecommend && recommend.length > 0 && (
          <div className="mt-16 border-t border-clay/50 pt-12">
            <ProductRow eyebrow="Complete your set" title="You may also like" products={recommend} />
          </div>
        )}

        {!cfg.showSuccessRecommend && recent.length > 0 && (
          <div className="mt-16 border-t border-clay/50 pt-12">
            <ProductRow eyebrow="Recently viewed" title="Pick up where you left off" products={recent.slice(0, 6)} />
          </div>
        )}
      </div>
    </div>
  );
}
