import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, Lock, MapPin, Package, RotateCcw, ShieldCheck, Truck, User, ArrowRight, Banknote
} from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import { checkoutConfig, enabledPayments, enabledShipping } from '../lib/checkoutConfig';
import { normalizePhone, phoneTypingError } from '../lib/validators';
import { useCartPricing } from './cart/useCartPricing';
import FloatField, { FloatSelect } from './checkout/FloatField';
import CheckoutSummary from './checkout/CheckoutSummary';
import usePromoQuote from '../lib/usePromoQuote';
import Seo from '../components/Seo';

const POPULAR_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad',
  'Abbottabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Gujrat', 'Mardan'
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

/* ============================================================================
 * HUSHAE CHECKOUT — Ultra-Luxury 1-Page Express COD Architecture
 *
 * SPECIFICATION:
 *   1. Distraction-Free High-Fashion Minimalist Layout
 *   2. Streamlined Pakistan COD Flow (No Postal Code Blockers)
 *   3. Intelligent City & Province Auto-Mapping
 *   4. Persistent Sticky Order Summary with Live PKR Totals
 *   5. 1-Tap Direct Order Submission + 256-Bit SSL Reassurance
 * ========================================================================== */

export default function Checkout() {
  const { cart, settings, clearCart, auth, toast, updateQty } = useApp();
  const nav = useNavigate();

  const cfg = useMemo(() => checkoutConfig(settings), [settings]);
  const cartCfg = useMemo(() => cartConfig(settings), [settings]);

  const payments = useMemo(() => enabledPayments(cfg), [cfg]);
  const shipOptions = useMemo(() => enabledShipping(cfg), [cfg]);

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
    postalCode: draft?.postalCode ?? '',
    notes: draft?.notes ?? '',
  });

  const [method, setMethod] = useState(draft?.method || 'cod');
  const [ship, setShip] = useState(draft?.ship || 'standard');
  const [applied, setApplied] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topErr, setTopErr] = useState('');
  const formRef = useRef(null);
  const submitRef = useRef(null);

  // Auto-set province when city changes
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

  // Persist draft
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...f, method, ship })); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [f, method, ship]);

  const phoneOk = normalizePhone(f.phone);

  /* ---------------- Pricing & Promotions ---------------- */
  const lines = useMemo(() => cart.map((line, index) => ({ line, index, status: 'ok' })), [cart]);
  const pricing = useCartPricing(lines, settings, cartCfg, applied);
  const promoQuote = usePromoQuote(cart, {
    hasCoupon: !!applied,
    city: cityLabel,
  });

  /* ---------------- Validation ---------------- */
  const validate = () => {
    const e = {};
    if (!f.name || f.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!phoneOk) e.phone = 'Please enter a valid Pakistani mobile (e.g. 0300 1234567)';
    if (!f.address || f.address.trim().length < 5) e.address = 'Please enter your complete delivery address';
    if (!cityLabel) e.city = 'Please choose or enter your city';
    if (!f.province) e.province = 'Please select your province';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Please enter a valid email format';
    return e;
  };

  /* ---------------- Place Order Action ---------------- */
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setTopErr('');
    const validationErrors = validate();
    setErrs(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErr = Object.keys(validationErrors)[0];
      setTopErr('Please complete the required details highlighted below.');
      requestAnimationFrame(() => {
        formRef.current?.querySelector(`[name="${firstErr}"]`)?.focus();
      });
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
            postalCode: f.postalCode || '00000',
            country: 'Pakistan',
          },
          items: cart.map((l) => ({
            product: l.id,
            size: l.size || '',
            color: l.color || '',
            quantity: l.qty || 1,
          })),
          paymentMethod: method || 'cod',
          shippingMethod: ship || 'standard',
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

  /* ---------------- Empty Cart Screen ---------------- */
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-[140px] pb-24 text-center">
        <Seo title="Checkout — HUSHAE" description="Secure express checkout." />
        <div className="mx-auto max-w-md px-6 space-y-4">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-neutral-400">YOUR BAG</p>
          <h1 className="text-3xl font-light uppercase tracking-tight text-black">Your bag is empty</h1>
          <p className="text-xs text-neutral-500 font-light leading-relaxed">
            Discover our second-skin foundations and return here to complete your order.
          </p>
          <div className="pt-4">
            <Link
              to="/shop"
              className="inline-flex min-h-[46px] items-center justify-center bg-black px-8 text-xs font-medium uppercase tracking-[0.2em] text-white hover:bg-neutral-800 transition-colors"
            >
              Explore Collection &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[120px] pb-24 font-sans text-[#111111] antialiased">
      <Seo
        title="Express Checkout — HUSHAE"
        description="Frictionless 1-page checkout with Cash on Delivery nationwide and 100% discreet packaging."
      />

      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
        {/* Top Header Bar */}
        <div className="border-b border-neutral-100 pb-6 mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
              FAST & SECURE CHECKOUT
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-light uppercase tracking-tight text-[#000000]">
              Express Checkout
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-light">
            <ShieldCheck size={15} className="text-black" />
            <span>256-Bit Encrypted · 100% Discreet Packaging</span>
          </div>
        </div>

        {topErr && (
          <div className="mb-6 flex items-center gap-2.5 border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <AlertCircle size={15} className="shrink-0" />
            <span>{topErr}</span>
          </div>
        )}

        {/* ═══ 2-COLUMN LUXURY CHECKOUT GRID ══════════════════════════════ */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">

          {/* ── LEFT: 1-PAGE EXPRESS COD FORM (7 COLUMNS) ───────────────── */}
          <form
            ref={formRef}
            onSubmit={handlePlaceOrder}
            className="space-y-10 lg:col-span-7"
            noValidate
          >
            {/* 1. CONTACT & DELIVERY DETAILS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-medium text-white">1</span>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#000000]">
                  Contact & Delivery Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Full Name */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={f.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Enter your first & last name"
                    className={`w-full border bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors ${
                      errs.name ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {errs.name && <p className="text-[11px] text-red-600 font-light">{errs.name}</p>}
                </div>

                {/* WhatsApp / Mobile Number */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Mobile / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    value={f.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="0300 1234567"
                    className={`w-full border bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors ${
                      errs.phone ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {phoneOk ? (
                    <p className="text-[10.5px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check size={11} /> Valid Pakistani Number ({phoneOk})
                    </p>
                  ) : errs.phone ? (
                    <p className="text-[11px] text-red-600 font-light">{errs.phone}</p>
                  ) : (
                    <p className="text-[10.5px] text-neutral-400 font-light">Courier will call you prior to delivery.</p>
                  )}
                </div>

                {/* Email Address (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Email Address <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={f.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="For tracking receipt & updates"
                    className="w-full border border-neutral-300 bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                {/* Delivery Street Address */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Complete Street Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    required
                    rows={2}
                    autoComplete="street-address"
                    value={f.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="House / Flat #, Street address, Area or Sector, Landmark"
                    className={`w-full border bg-white px-4 py-2.5 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors resize-none ${
                      errs.address ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {errs.address && <p className="text-[11px] text-red-600 font-light">{errs.address}</p>}
                </div>

                {/* City Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    City <span className="text-red-500">*</span>
                  </label>
                  {f.city === '__other' ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        required
                        value={f.customCity}
                        onChange={(e) => set('customCity', e.target.value)}
                        placeholder="Enter your city name"
                        className="w-full border border-black bg-white px-4 py-3 text-xs text-black focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCityChange('Karachi')}
                        className="text-[10.5px] text-neutral-500 underline hover:text-black"
                      >
                        &larr; Choose from city list
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={f.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full appearance-none border border-neutral-300 bg-white px-4 py-3 pr-8 text-xs text-black focus:border-black focus:outline-none cursor-pointer"
                      >
                        {POPULAR_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__other">Other City (Enter manually)...</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
                    </div>
                  )}
                </div>

                {/* Province Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={f.province}
                      onChange={(e) => set('province', e.target.value)}
                      className="w-full appearance-none border border-neutral-300 bg-white px-4 py-3 pr-8 text-xs text-black focus:border-black focus:outline-none cursor-pointer"
                    >
                      {PROVINCES_FALLBACK.map((pr) => (
                        <option key={pr} value={pr}>{pr}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SHIPPING & PACKAGING */}
            <section className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-medium text-white">2</span>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#000000]">
                  Shipping & Packaging Method
                </h2>
              </div>

              <div className="border border-neutral-200 p-4 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Truck size={16} className="text-black" />
                    <span className="text-xs font-medium uppercase tracking-wider text-black">
                      Express Courier Delivery (2–4 Days)
                    </span>
                  </div>
                  <span className="text-xs font-medium text-black">
                    {pricing.shipping === 0 ? 'Free Express' : pkr(pricing.shipping)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light pl-6">
                  Dispatched via TCS / Leopards Express in 100% plain, unmarked, discreet packaging.
                </p>
              </div>
            </section>

            {/* 3. PAYMENT METHOD (CASH ON DELIVERY) */}
            <section className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-medium text-white">3</span>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#000000]">
                  Payment Method
                </h2>
              </div>

              <div className="space-y-2.5">
                {/* Cash on Delivery (Pre-selected) */}
                <label className="flex items-start gap-3.5 border-2 border-black p-4 bg-[#FFFFFF] cursor-pointer shadow-xs">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={method === 'cod'}
                    onChange={() => setMethod('cod')}
                    className="mt-0.5 text-black focus:ring-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Banknote size={16} className="text-black" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-black">
                        Cash on Delivery (COD)
                      </span>
                    </div>
                    <p className="text-[11.5px] text-neutral-600 font-light leading-relaxed">
                      Pay with cash when your parcel is delivered to your doorstep. No advance deposit needed.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Submit Button on Mobile View (Visible on small screens) */}
            <div className="pt-4 lg:hidden">
              <button
                type="submit"
                disabled={busy}
                className="flex h-[52px] w-full items-center justify-center gap-2 bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-lg transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                <span>{busy ? 'Placing Order…' : `Place COD Order · ${pkr(pricing.total)}`}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* ── RIGHT: STICKY ORDER SUMMARY (5 COLUMNS) ─────────────────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[120px] space-y-6">
              <CheckoutSummary
                cart={cart}
                pricing={pricing}
                cartCfg={cartCfg}
                checkoutCfg={cfg}
                applied={applied}
                onApply={setApplied}
                onRemoveCoupon={() => setApplied(null)}
                onSubmit={handlePlaceOrder}
                busy={busy}
                onQty={(line, q) => updateQty(lineKey(line), q, cartCfg.maxQty || 10)}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
