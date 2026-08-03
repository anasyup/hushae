import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, Copy, Package, Share2, Truck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, fmtDate, snap } from '../lib/format';
import { cartConfig, deliveryWindow } from '../lib/cartConfig';
import { checkoutConfig, enabledShipping, methodWindow } from '../lib/checkoutConfig';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import TrustRow from './cart/TrustRow';

/* ============================================================================
 * ORDER SUCCESS
 *
 * Every string comes from settings.checkout. The delivery estimate is derived
 * from the shipping method actually stored on the order — the old page
 * hardcoded "2–4 working days" regardless of what the customer chose, and
 * contradicted both the returns policy and the bag.
 *
 * The success animation is CSS, not framer-motion: this is the first paint
 * after a navigation, and holding the confirmation at opacity:0 until React
 * ticks is exactly what delayed LCP on the hero in Sprint 2B.
 * ========================================================================== */
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

  const animate = cfg.animations ? 'hero-rise' : '';

  return (
    <div className="container-page py-sect-y md:py-sect-y-lg">
      <div className="mx-auto max-w-2xl text-center">
        <span
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/25 text-sagedeep ${animate}`}
          aria-hidden="true"
        >
          <Check size={28} strokeWidth={2.5} />
        </span>
        <h1 className={`mt-6 font-display text-h1 ${animate}`} style={{ '--d': '60ms' }}>{cfg.successTitle}</h1>
        <p className={`mx-auto mt-3 max-w-md text-body leading-relaxed text-ash ${animate}`} style={{ '--d': '120ms' }}>
          {cfg.successText}
        </p>
      </div>

      {/* ---- Order number ---- */}
      <div className="mx-auto mt-10 max-w-2xl rounded-panel border border-line bg-white/70 p-6 text-center md:p-8">
        <h2 className="text-label uppercase tracking-widest text-ash">Order number</h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <p className="font-mono text-h3 tracking-wider">{orderNumber}</p>
          <button
            type="button" onClick={copy}
            aria-label={`Copy order number ${orderNumber}`}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-ash transition hover:border-obsidian hover:text-obsidian"
          >
            {copied ? <Check size={15} className="text-sagedark" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          </button>
          {cfg.showSuccessShare && (
            <button
              type="button" onClick={share}
              aria-label="Share this order"
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-ash transition hover:border-obsidian hover:text-obsidian"
            >
              {shared ? <Check size={15} className="text-sagedark" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
            </button>
          )}
        </div>
        <p className="sr-only" role="status">{copied ? 'Order number copied' : ''}{shared ? 'Order link copied' : ''}</p>

        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-body-sm">
          <Truck size={14} aria-hidden="true" />
          Estimated delivery <span className="font-semibold">{eta}</span>
        </p>

        {order && (
          <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-left md:grid-cols-4">
            {[
              ['Name', order.customerInfo?.name],
              ['Total', pkr(order.total)],
              ['Payment', order.paymentMethod],
              ['Status', order.status],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-caption font-bold uppercase tracking-wider text-ash">{k}</dt>
                <dd className="mt-0.5 text-body-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* ---- Items ---- */}
      {order?.items?.length > 0 && (
        <div className="mx-auto mt-6 max-w-2xl rounded-panel border border-line bg-white/60 p-6">
          <h2 className="text-label uppercase tracking-widest text-ash">Items ({order.items.length})</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3">
                <Img src={it.image} alt="" className="h-14 w-11 shrink-0 rounded-control border border-line object-cover" />
                <span className="min-w-0 flex-1 text-body-sm">
                  <span className="clamp-1 font-medium">{it.name}</span>
                  <span className="text-caption text-ash">{it.size} · Qty {it.quantity}</span>
                </span>
                <span className="text-body-sm font-semibold tabular-nums">{pkr(it.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-body-sm">
            {!!order.discount && (
              <div className="flex justify-between text-sagedark">
                <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                <dd className="tabular-nums">− {pkr(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ash">Shipping</dt>
              <dd className="tabular-nums">{order.shippingCharge === 0 ? 'Free' : pkr(order.shippingCharge)}</dd>
            </div>
            {!!order.tax && (
              <div className="flex justify-between">
                <dt className="text-ash">{cartCfg.taxLabel}</dt>
                <dd className="tabular-nums">{pkr(order.tax)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-h5 tabular-nums">{pkr(order.total)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to={`/track?orderNumber=${orderNumber}${order?.customerInfo?.phone ? `&phone=${encodeURIComponent(order.customerInfo.phone)}` : ''}`}
          className="btn-primary sm:px-8"
        >
          Track this order
        </Link>
        <Link to={cartCfg.continueHref} className="btn-outline sm:px-8">{cartCfg.continueLabel}</Link>
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-caption leading-relaxed text-ash">
        {order?.paymentMethod === 'COD'
          ? 'Cash on Delivery — please keep the exact amount ready for the rider.'
          : 'Your payment is pending verification. We confirm it within a few hours and ship straight after.'}
        {order?.createdAt && <><br />Placed {fmtDate(order.createdAt)}</>}
        {cfg.successNote && <><br />{cfg.successNote}</>}
      </p>

      {cfg.showTrust && (
        <div className="mx-auto mt-8 max-w-md">
          <TrustRow items={cfg.trust} />
        </div>
      )}

      {cfg.showSuccessRecommend && recommend.length > 0 && (
        <div className="mt-16 border-t border-line pt-12">
          <ProductRow eyebrow="Complete your set" title="You may also like" products={recommend} />
        </div>
      )}

      {!cfg.showSuccessRecommend && recent.length > 0 && (
        <div className="mt-16 border-t border-line pt-12">
          <ProductRow eyebrow="Recently viewed" title="Pick up where you left off" products={recent.slice(0, 6)} />
        </div>
      )}
    </div>
  );
}
