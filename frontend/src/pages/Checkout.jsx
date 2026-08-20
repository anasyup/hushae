import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, Lock, Package, RotateCcw, ShieldCheck, Truck,
  ArrowRight, Banknote
} from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import { checkoutConfig } from '../lib/checkoutConfig';
import { normalizePhone } from '../lib/validators';
import { useCartPricing } from './cart/useCartPricing';
import usePromoQuote from '../lib/usePromoQuote';
import Img from '../components/Img';
import CouponBox from './cart/CouponBox';
import Seo from '../components/Seo';

const POPULAR_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad'
];

const PROVINCES_MAP = {
  'Karachi': 'Sindh',
  'Hyderabad': 'Sindh',
  'Sukkur': 'Sindh',
  'Lahore': 'Punjab',
  'Rawalpindi': 'Punjab',
  'Faisalabad': 'Punjab',
  'Multan': 'Punjab',
  'Sialkot': 'Punjab',
  'Gujranwala': 'Punjab',
  'Gujrat': 'Punjab',
  'Bahawalpur': 'Punjab',
  'Sargodha': 'Punjab',
  'Islamabad': 'Islamabad (ICT)',
  'Peshawar': 'Khyber Pakhtunkhwa',
  'Abbottabad': 'Khyber Pakhtunkhwa',
  'Mardan': 'Khyber Pakhtunkhwa',
  'Quetta': 'Balochistan',
};

const PROVINCES_FALLBACK = ['Punjab', 'Sindh', 'Islamabad (ICT)', 'Khyber Pakhtunkhwa', 'Balochistan', 'Azad Kashmir', 'Gilgit-Baltistan'];
const DRAFT_KEY = 'hushae.checkoutDraft';

export default function Checkout() {
  const { cart, settings, clearCart, auth, toast } = useApp();
  const nav = useNavigate();

  const cfg = useMemo(() => checkoutConfig(settings), [settings]);
  const cartCfg = useMemo(() => cartConfig(settings), [settings]);

  const draft = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
  }, []);
  const addr = auth?.user?.addresses?.[0] || {};

  const [f, setF] = useState({
    name: draft?.name ?? (auth?.user?.name || addr.name || ''),
    phone: draft?.phone ?? (auth?.user?.phone || addr.phone || ''),
    email: draft?.email ?? (auth?.user?.email || ''),
    address: draft?.address ?? (addr.address || ''),
    city: draft?.city ?? (addr.city || 'Karachi'),
    customCity: draft?.customCity ?? '',
    province: draft?.province ?? (addr.province || 'Sindh'),
    notes: draft?.notes ?? '',
  });

  const [method] = useState('cod'); // Default Cash on Delivery
  const [applied, setApplied] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topErr, setTopErr] = useState('');
  const formRef = useRef(null);

  const handleCityChange = (chosenCity) => {
    if (chosenCity === '__other') {
      setF((x) => ({ ...x, city: '__other', customCity: '' }));
    } else {
      const autoProvince = PROVINCES_MAP[chosenCity] || f.province || 'Punjab';
      setF((x) => ({ ...x, city: chosenCity, province: autoProvince, customCity: '' }));
      setErrs((e) => ({ ...e, city: '', province: '' }));
    }
  };

  const set = useCallback((k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrs((e) => (e[k] ? { ...e, [k]: '' } : e));
  }, []);

  const cityLabel = f.city === '__other' ? f.customCity.trim() : f.city;

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [f]);

  const phoneOk = normalizePhone(f.phone);

  const lines = useMemo(() => cart.map((line, index) => ({ line, index, status: 'ok' })), [cart]);
  const pricing = useCartPricing(lines, settings, cartCfg, applied);

  const validate = () => {
    const e = {};
    if (!f.name || f.name.trim().length < 2) e.name = 'Please enter your name';
    if (!phoneOk) e.phone = 'Please enter a valid mobile number (e.g. 0300 1234567)';
    if (!f.address || f.address.trim().length < 5) e.address = 'Please enter your delivery address';
    if (!cityLabel) e.city = 'Please select or enter your city';
    return e;
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setTopErr('');
    const validationErrors = validate();
    setErrs(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setTopErr('Please fill in the required fields below.');
      return;
    }

    setBusy(true);
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        token: auth?.token,
        body: {
          customerInfo: {
            name: f.name.trim(),
            phone: phoneOk,
            email: f.email.trim() || undefined,
            address: f.address.trim(),
            city: cityLabel,
            province: f.province,
            postalCode: '00000',
            country: 'Pakistan',
            notes: f.notes.trim() || undefined,
          },
          items: cart.map((l) => ({
            product: l.id,
            size: l.size || '',
            color: l.color || '',
            quantity: l.qty || 1,
          })),
          paymentMethod: 'cod',
          shippingMethod: 'standard',
          discountCode: applied?.code || '',
          discreetPackaging: true,
        },
      });

      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      clearCart();
      nav(`/order/${order.orderNumber}`, { state: { order }, replace: true });
    } catch (ex) {
      setBusy(false);
      setTopErr(ex.message || 'We could not place your order. Please try again.');
      toast(ex.message || 'Order failed');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-[140px] pb-24 text-center">
        <Seo title="Checkout — HUSHAE" description="Your bag is empty." />
        <div className="mx-auto max-w-md px-6 space-y-4">
          <h1 className="text-2xl font-light uppercase tracking-wide text-black">Your bag is empty</h1>
          <p className="text-xs text-neutral-500 font-light">Add items to your bag to proceed to checkout.</p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex min-h-[44px] items-center justify-center bg-black px-8 text-xs font-medium uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors"
            >
              Continue Shopping &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[120px] pb-24 font-sans text-[#111111] antialiased">
      <Seo title="Checkout — HUSHAE" description="Complete your order with Cash on Delivery." />

      <div className="mx-auto max-w-[1400px] px-6 sm:px-8 md:px-12">
        {/* Simple Minimal Header */}
        <div className="border-b border-neutral-200 pb-5 mb-8 flex items-baseline justify-between">
          <h1 className="text-2xl font-light uppercase tracking-[0.1em] text-black">
            Checkout
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-light">
            <Lock size={12} className="text-black" />
            <span>Secure 256-Bit Checkout</span>
          </div>
        </div>

        {topErr && (
          <div className="mb-6 border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            {topErr}
          </div>
        )}

        {/* ═══ CLEAN 2-COLUMN CHECKOUT ════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">

          {/* ── LEFT: DELIVERY & PAYMENT FORM (7 COLS) ───────────────────── */}
          <form
            ref={formRef}
            onSubmit={handlePlaceOrder}
            className="space-y-8 lg:col-span-7"
            noValidate
          >
            {/* Delivery Address */}
            <div className="space-y-4">
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-black border-b border-neutral-100 pb-2">
                Shipping Address
              </h2>

              <div className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-normal text-neutral-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={f.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full border bg-white px-3.5 py-2.5 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors ${
                      errs.name ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {errs.name && <p className="text-[11px] text-red-600 mt-1">{errs.name}</p>}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-normal text-neutral-600 mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={f.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="0300 1234567"
                    className={`w-full border bg-white px-3.5 py-2.5 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors ${
                      errs.phone ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {phoneOk ? (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                      <Check size={11} /> Valid Pakistani Number ({phoneOk})
                    </p>
                  ) : errs.phone ? (
                    <p className="text-[11px] text-red-600 mt-1">{errs.phone}</p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-light">Courier calls before delivery.</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-normal text-neutral-600 mb-1">
                    Street Address *
                  </label>
                  <textarea
                    name="address"
                    required
                    rows={2}
                    value={f.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="House / Flat #, Street, Area, Landmark"
                    className={`w-full border bg-white px-3.5 py-2.5 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors resize-none ${
                      errs.address ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {errs.address && <p className="text-[11px] text-red-600 mt-1">{errs.address}</p>}
                </div>

                {/* City Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-normal text-neutral-600 mb-1">
                      City *
                    </label>
                    {f.city === '__other' ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          value={f.customCity}
                          onChange={(e) => set('customCity', e.target.value)}
                          placeholder="Type your city"
                          className="w-full border border-black px-3.5 py-2.5 text-xs text-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCityChange('Karachi')}
                          className="text-[10px] text-neutral-500 underline"
                        >
                          &larr; Choose from city list
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={f.city}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="w-full appearance-none border border-neutral-300 bg-white px-3.5 py-2.5 pr-8 text-xs text-black focus:border-black focus:outline-none cursor-pointer"
                        >
                          {POPULAR_CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__other">Other city...</option>
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-neutral-600 mb-1">
                      Province *
                    </label>
                    <div className="relative">
                      <select
                        value={f.province}
                        onChange={(e) => set('province', e.target.value)}
                        className="w-full appearance-none border border-neutral-300 bg-white px-3.5 py-2.5 pr-8 text-xs text-black focus:border-black focus:outline-none cursor-pointer"
                      >
                        {PROVINCES_FALLBACK.map((pr) => (
                          <option key={pr} value={pr}>{pr}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
                    </div>
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-normal text-neutral-600 mb-1">
                    Email Address <span className="text-neutral-400 lowercase">(optional)</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={f.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="For tracking updates"
                    className="w-full border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-black border-b border-neutral-100 pb-2">
                Payment Method
              </h2>

              <div className="border border-black p-4 bg-neutral-50/50 flex items-start gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked
                  readOnly
                  className="mt-0.5 text-black focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-black">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-[10px] bg-black text-white px-1.5 py-0.5">Recommended</span>
                  </div>
                  <p className="text-xs text-neutral-500 font-light mt-1">
                    Pay with cash at your doorstep when your order arrives.
                  </p>
                </div>
              </div>
            </div>

            {/* Discreet Packaging Note */}
            <div className="border-t border-neutral-100 pt-4 flex items-center gap-2 text-xs text-neutral-500 font-light">
              <ShieldCheck size={14} className="text-black shrink-0" />
              <span>100% Plain, unmarked packaging guaranteed on every order.</span>
            </div>

            {/* Mobile Submit Button */}
            <div className="pt-2 lg:hidden">
              <button
                type="submit"
                disabled={busy}
                className="flex h-[48px] w-full items-center justify-center gap-2 bg-black text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <span>{busy ? 'Placing Order…' : `Place Order · ${pkr(pricing.total)}`}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>

          {/* ── RIGHT: STICKY ORDER SUMMARY (5 COLS) ────────────────────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[120px] space-y-6">
              
              <div className="border border-neutral-200 bg-[#FAFAFA] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-black">
                    Order Summary
                  </h3>
                  <span className="text-xs text-neutral-500">
                    {pricing.count} {pricing.count === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Items */}
                <ul className="divide-y divide-neutral-200 max-h-72 overflow-y-auto no-scrollbar pr-1">
                  {cart.map((l, i) => (
                    <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-3.5 py-3">
                      <Img src={l.image} alt={l.name} className="h-14 w-11 object-cover bg-white shrink-0 border border-neutral-200" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-medium text-black truncate">{l.name}</p>
                        <p className="text-[11px] text-neutral-500 font-light">
                          {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')} &bull; Qty: {l.qty}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-black">{pkr(l.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>

                {/* Coupon Box */}
                <div className="border-t border-neutral-200 pt-3">
                  <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={setApplied} onRemove={() => setApplied(null)} />
                </div>

                {/* Totals */}
                <div className="border-t border-neutral-200 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-600 font-light">
                    <span>Subtotal</span>
                    <span className="text-black font-normal">{pkr(pricing.subtotal)}</span>
                  </div>

                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-black font-medium">
                      <span>Discount ({applied?.code})</span>
                      <span>− {pkr(pricing.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-600 font-light">
                    <span>Delivery</span>
                    <span className="text-black font-normal">
                      {pricing.shipping === 0 ? 'Free Express' : pkr(pricing.shipping)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-neutral-300 pt-3 text-sm">
                    <span className="font-medium text-black">Total to Pay (COD)</span>
                    <span className="font-medium text-lg text-black">{pkr(pricing.total)}</span>
                  </div>
                </div>

                {/* Desktop Place Order CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={busy}
                    className="flex h-[48px] w-full items-center justify-center gap-2 bg-black text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    <span>{busy ? 'Placing Order…' : `Place Order · ${pkr(pricing.total)}`}</span>
                    <ArrowRight size={13} />
                  </button>

                  <p className="mt-2.5 text-center text-[10.5px] text-neutral-400 font-light">
                    Pay upon delivery &bull; 14-day exchange guarantee
                  </p>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
