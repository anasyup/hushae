import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle, Copy, Share2, Truck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, fmtDate, snap } from '../lib/format';
import { cartConfig, deliveryWindow } from '../lib/cartConfig';
import { checkoutConfig, enabledShipping, methodWindow } from '../lib/checkoutConfig';
import { titleCase } from '../lib/productMeta';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import TrustRow from './cart/TrustRow';
import Seo from '../components/Seo';

/* ============================================================================
 * ORDER SUCCESS — Calvin Klein register.
 * Clean, calm, monochrome. Black check, hairline cards, one black button.
 * ========================================================================== */

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
    } catch { /* user dismissed */ }
  };

  const firstName = (order?.customerInfo?.name || '').trim().split(/\s+/)[0] || '';
  const supportEmail = settings?.contactEmail && !/veloura/i.test(settings.contactEmail)
    ? settings.contactEmail
    : 'care@hushae.pk';

  const iconBtn = 'grid h-11 w-11 place-items-center border border-[#E5E5E5] text-[#707070] transition-colors duration-300 hover:border-[#111111] hover:text-[#111111]';

  return (
    <div className="surface-cream pt-[220px] pb-16 text-[#111111] md:pb-24"><Seo title="Order Confirmed" description="Thank you — your HUSHAE order is confirmed." /><div className="container-page">
      <div className="mx-auto max-w-3xl">
        {/* ═══ HERO — reference: black CheckCircle + serif title ═══ */}
        <div className="text-center">
          <CheckCircle size={48} strokeWidth={1.2} aria-hidden="true" className="mx-auto text-black" />
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Thank You</p>
          <h1 className="mt-1 font-display text-2xl font-light uppercase tracking-wider md:text-3xl">
            Order Confirmed
          </h1>
          {firstName && <p className="mt-2 text-xs text-neutral-500">Thank you, {firstName}.</p>}
          <p className="mx-auto mt-4 max-w-md text-[14px] font-light leading-[1.7] text-[#707070]">{cfg.successText}</p>
        </div>

        {/* ═══ ORDER CARD — hairline ════════════════════════════════ */}
        <div className="mx-auto mt-12 border border-neutral-200 bg-[#FAF9F6] p-6 md:p-10">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#707070]">Order number</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <p className="font-mono text-[22px] font-normal tracking-[0.08em] text-[#111111] md:text-[26px]">{orderNumber}</p>
              <button type="button" onClick={copy} aria-label={`Copy order number ${orderNumber}`} className={iconBtn}>
                {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              </button>
              {cfg.showSuccessShare && (
                <button type="button" onClick={share} aria-label="Share this order" className={iconBtn}>
                  {shared ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
                </button>
              )}
            </div>
            <p className="sr-only" role="status">{copied ? 'Order number copied' : ''}{shared ? 'Order link copied' : ''}</p>

            <p className="mt-5 inline-flex items-center gap-2 border border-[#E5E5E5] bg-[#FFFFFF] px-5 py-2.5 text-[12px] text-[#707070]">
              <Truck size={13} aria-hidden="true" />
              Estimated delivery <span className="font-medium text-[#111111]">{eta}</span>
            </p>
          </div>

          {order && (
            <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 border-t border-[#E5E5E5] pt-7 md:grid-cols-4">
              {[
                ['Name', order.customerInfo?.name],
                ['Total', pkr(order.total)],
                ['Payment', order.paymentMethod],
                ['Status', order.status],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#707070]">{k}</dt>
                  <dd className="mt-1.5 text-[13px] font-normal normal-case text-[#111111]">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* ═══ ITEMS ════════════════════════════════════════════════ */}
        {order?.items?.length > 0 && (
          <div className="card-cream mx-auto mt-6 p-6 md:p-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#707070]">Items ({order.items.length})</h2>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#707070]">
                {order.items.length} piece{order.items.length === 1 ? '' : 's'}
              </span>
            </div>

            <ul className="mt-6 space-y-5">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-4 border-b border-[#E5E5E5] pb-5 last:border-0 last:pb-0">
                  <Img src={it.image} alt="" className="h-20 w-[60px] shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="clamp-1 text-[13px] font-normal normal-case text-[#111111]">{nameOf(it.name)}</p>
                    <p className="mt-1 text-[11px] text-[#707070]">
                      {[it.size && `Size ${it.size}`, it.quantity > 1 ? `Qty ${it.quantity}` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-medium tabular-nums text-[#111111]">{pkr(it.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2.5 border-t border-[#E5E5E5] pt-5 text-[13px]">
              {!!order.discount && (
                <div className="flex justify-between text-[#707070]">
                  <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd className="tabular-nums">− {pkr(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#707070]">Shipping</dt>
                <dd className="tabular-nums text-[#111111]">{order.shippingCharge === 0 ? 'Free' : pkr(order.shippingCharge)}</dd>
              </div>
              {!!order.tax && (
                <div className="flex justify-between">
                  <dt className="text-[#707070]">{cartCfg.taxLabel}</dt>
                  <dd className="tabular-nums text-[#111111]">{pkr(order.tax)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
                <dt className="text-[13px] font-medium text-[#111111]">Total</dt>
                <dd className="text-[22px] font-medium tabular-nums text-[#111111]">{pkr(order.total)}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* ═══ ACTIONS ══════════════════════════════════════════════ */}
        <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-5">
          <Link
            to={`/track?orderNumber=${orderNumber}${order?.customerInfo?.phone ? `&phone=${encodeURIComponent(order.customerInfo.phone)}` : ''}`}
            className="inline-flex min-h-[52px] w-full items-center justify-center bg-gold px-12 text-[13px] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:bg-bronze sm:w-auto"
          >
            Track this order
          </Link>
          <Link
            to={cartCfg.continueHref}
            className="group inline-flex items-center justify-center gap-2 bg-black px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-neutral-800"
          >
            {cartCfg.continueLabel} <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* ═══ SUPPORT + TRUST ═══════════════════════════════════════ */}
        <p className="mx-auto mt-10 max-w-xl text-center text-[12px] leading-[1.8] text-[#707070]">
          {order?.paymentMethod === 'COD'
            ? 'Cash on Delivery — please keep the exact amount ready for the rider.'
            : 'Your payment is pending verification. We confirm it within a few hours and ship straight after.'}
          {order?.createdAt && <><br />Placed {fmtDate(order.createdAt)}</>}
          {cfg.successNote && <><br />{cfg.successNote}</>}
        </p>

        <p className="mt-6 text-center text-[11px] text-[#707070]">
          Questions? <a href={`mailto:${supportEmail}`} className="text-[#111111] underline underline-offset-4">{supportEmail}</a>
        </p>

        {cfg.showTrust && (
          <div className="mx-auto mt-8 max-w-md">
            <TrustRow items={cfg.trust} />
          </div>
        )}

        {/* ═══ CROSS-SELL — below the confirmation ═══════════════════ */}
        {cfg.showSuccessRecommend && recommend.length > 0 && (
          <div className="mt-16 border-t border-[#E5E5E5] pt-12">
            <ProductRow eyebrow="Complete your set" title="You may also like" products={recommend} />
          </div>
        )}

        {!cfg.showSuccessRecommend && recent.length > 0 && (
          <div className="mt-16 border-t border-[#E5E5E5] pt-12">
            <ProductRow eyebrow="Recently viewed" title="Pick up where you left off" products={recent.slice(0, 6)} />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
