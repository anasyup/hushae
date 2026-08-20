import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowRight, Check, Copy, Lock, RotateCcw,
  ShieldCheck, Truck
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, fmtDateTime } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import { checkoutConfig } from '../lib/checkoutConfig';
import { titleCase } from '../lib/productMeta';
import Img from '../components/Img';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE Order Confirmation — Clean Luxury Flagship (Calvin Klein / SSENSE)
 * ========================================================================== */

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function OrderConfirm() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const { settings } = useApp();

  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [copied, setCopied] = useState(false);

  const cfg = useMemo(() => checkoutConfig(settings), [settings]);
  const cartCfg = useMemo(() => cartConfig(settings), [settings]);

  /* 1. Auto-Fetch Order if direct link or reload */
  useEffect(() => {
    if (order && order.orderNumber === orderNumber) return;
    let alive = true;
    setLoading(true);
    api(`/orders/lookup/${encodeURIComponent(orderNumber)}`)
      .then((d) => {
        if (alive && d?.order) setOrder(d.order);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [orderNumber]);

  const copyNumber = () => {
    navigator.clipboard?.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const firstName = (order?.customerInfo?.name || '').trim().split(/\s+/)[0] || '';
  const isCOD = String(order?.paymentMethod || 'COD').toUpperCase() === 'COD';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] pt-[180px] pb-24 font-sans text-center">
        <div className="mx-auto max-w-md px-6 space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full border-2 border-neutral-200 border-t-black animate-spin" />
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-light">
            Retrieving order details…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[160px] sm:pt-[180px] md:pt-[190px] pb-24 font-sans text-[#111111] antialiased">
      <Seo
        title={`Order ${orderNumber} Confirmed — HUSHAE`}
        description="Thank you for your order with HUSHAE. 100% discreet delivery nationwide."
      />

      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        {/* ═══ 1. MINIMALIST LUXURY HERO HEADER ════════════════════════════ */}
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#000000] text-[#FFFFFF] shadow-sm">
            <Check size={24} strokeWidth={2.2} />
          </div>

          <div className="space-y-1 pt-1.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              CONFIRMATION
            </p>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-[#000000]">
              Thank you{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-xs sm:text-[13px] text-neutral-500 font-light max-w-md mx-auto pt-1 leading-relaxed">
              Your order has been confirmed and is being prepared in our studio. We will contact you prior to courier delivery.
            </p>
          </div>

          {/* 1-Tap Copy Order Number Pill */}
          <div className="pt-2">
            <button
              type="button"
              onClick={copyNumber}
              className="inline-flex items-center gap-2 rounded-full border border-[#EAEAEA] bg-[#FBFBFB] px-5 py-2 text-xs transition-colors hover:border-[#000000]"
              title="Click to copy order number"
            >
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-normal">Order #</span>
              <span className="font-mono font-medium text-[#000000] tracking-wider">{orderNumber}</span>
              <span className="text-[11px] text-neutral-500 pl-1">
                {copied ? <span className="text-emerald-600 font-medium">Copied!</span> : <Copy size={12} />}
              </span>
            </button>
          </div>
        </div>

        {/* ═══ 2. UNIFIED LUXURY ORDER MANIFEST CARD (NO FRAGMENTED BOXES) ═══ */}
        <div className="mt-10 rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 sm:p-8 space-y-6 shadow-xs">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#000000]">
              Order Manifest
            </h2>
            <span className="text-[11px] text-neutral-400 font-light">
              {order?.createdAt ? fmtDateTime(order.createdAt) : 'Just Now'}
            </span>
          </div>

          {/* Delivery & Payment Metadata Grid */}
          {order?.customerInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-[#EAEAEA] pb-6">
              {/* Shipping Details */}
              <div className="space-y-1.5">
                <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
                  Shipping Address
                </p>
                <p className="font-medium text-black">{order.customerInfo.name}</p>
                <p className="text-neutral-600 font-light leading-relaxed">{order.customerInfo.address}</p>
                <p className="text-neutral-600 font-light">
                  {[order.customerInfo.city, order.customerInfo.province, order.customerInfo.postalCode].filter(Boolean).join(', ')}
                </p>
                <p className="text-neutral-600 font-light pt-0.5">Mobile: {order.customerInfo.phone}</p>
              </div>

              {/* Payment & Estimated Delivery */}
              <div className="space-y-2.5 sm:border-l sm:border-[#EAEAEA] sm:pl-6">
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
                    Payment Method
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                      {order.paymentMethod || 'COD'}
                    </span>
                    <span className="text-xs text-neutral-600 font-light">
                      {isCOD ? 'Cash on Delivery' : order.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
                    Estimated Delivery
                  </p>
                  <p className="text-xs font-medium text-black pt-0.5 flex items-center gap-1.5">
                    <Truck size={13} className="text-black" />
                    2–4 Business Days (TCS Express)
                  </p>
                  <p className="text-[10.5px] text-neutral-500 font-light pt-0.5">
                    100% plain, unmarked discreet parcel
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Purchased Items List */}
          {order?.items && order.items.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
                Purchased Pieces ({order.items.length})
              </p>

              <ul className="divide-y divide-[#EAEAEA]">
                {order.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-4 py-3.5 first:pt-1">
                    <div className="aspect-[3/4] w-14 sm:w-16 rounded-xl overflow-hidden bg-[#FFFFFF] border border-[#EAEAEA] shrink-0">
                      <Img src={it.image} alt="" className="h-full w-full object-cover" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-medium text-black truncate leading-snug">
                        {nameOf(it.name)}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-light">
                        {[it.size && `Size ${it.size}`, it.color].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Qty: {it.quantity} &bull; {pkr(it.price)} each
                      </p>
                    </div>

                    <span className="text-xs font-medium text-black tabular-nums shrink-0">
                      {pkr(it.lineTotal || it.price * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing Totals Breakdown */}
          {order && (
            <div className="border-t border-[#EAEAEA] pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-500 font-light">
                <span>Subtotal</span>
                <span className="text-black font-normal tabular-nums">{pkr(order.subtotal)}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-black font-medium">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span className="tabular-nums">− {pkr(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-500 font-light">
                <span>Courier Delivery</span>
                <span className="text-black font-normal tabular-nums">
                  {order.shippingCharge === 0 ? 'Free Express' : pkr(order.shippingCharge)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[#DCDCDC] pt-3.5 text-sm">
                <span className="font-medium text-black">Total to Pay (COD)</span>
                <span className="font-sans text-xl font-medium tabular-nums text-black">{pkr(order.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ 3. DUAL "GOL" LUXURY PILL BUTTONS ═══════════════════════════ */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            to={`/track?orderNumber=${encodeURIComponent(orderNumber)}${order?.customerInfo?.phone ? `&phone=${encodeURIComponent(order.customerInfo.phone)}` : ''}`}
            className="flex h-[52px] w-full sm:w-auto min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-all hover:scale-[1.01]"
          >
            <span>Track Your Order</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            to="/shop"
            className="flex h-[48px] w-full sm:w-auto min-w-[200px] items-center justify-center rounded-full border border-neutral-300 bg-[#FFFFFF] text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:border-black transition-colors"
          >
            Continue Shopping
          </Link>
        </div>

        {/* ═══ 4. OFFICIAL REASSURANCE & CONCIERGE FOOTER ══════════════════ */}
        <div className="mt-12 border-t border-[#EAEAEA] pt-8 text-center space-y-3 text-xs text-neutral-500 font-light">
          <div className="flex flex-wrap items-center justify-center gap-6 text-[11.5px] text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-black" /> 100% Plain Discreet Packaging
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw size={13} className="text-black" /> 14-Day Easy Size Exchanges
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={13} className="text-black" /> 256-Bit SSL Encrypted
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 pt-1">
            Questions regarding your order? Reach our studio concierge at{' '}
            <a href="mailto:care@hushae.pk" className="text-black underline underline-offset-2">
              care@hushae.pk
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
