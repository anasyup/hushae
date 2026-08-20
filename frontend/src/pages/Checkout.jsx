import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, Banknote, ArrowRight } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import { checkoutConfig } from '../lib/checkoutConfig';
import { normalizePhone } from '../lib/validators';
import { useCartPricing } from './cart/useCartPricing';
import CheckoutSummary from './checkout/CheckoutSummary';
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

const PROVINCES_FALLBACK = [
  'Punjab',
  'Sindh',
  'Islamabad (ICT)',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Azad Kashmir',
  'Gilgit-Baltistan',
];

const CITY_POSTAL = {
  'Lahore': '54000', 'Faisalabad': '38000', 'Rawalpindi': '46000', 'Multan': '60000',
  'Gujranwala': '52250', 'Sialkot': '51310', 'Bahawalpur': '63100', 'Sargodha': '40100',
  'Gujrat': '50700', 'Karachi': '74200', 'Hyderabad': '71000', 'Sukkur': '65200',
  'Peshawar': '25000', 'Mardan': '23200', 'Abbottabad': '22010', 'Quetta': '87300',
  'Islamabad': '44000', 'Muzaffarabad': '13100', 'Mirpur': '10250', 'Gilgit': '15100',
};

const PROVINCE_POSTAL = {
  'Punjab': '54000',
  'Sindh': '74200',
  'Islamabad (ICT)': '44000',
  'Khyber Pakhtunkhwa': '25000',
  'Balochistan': '87300',
  'Azad Kashmir': '13100',
  'Gilgit-Baltistan': '15100',
};

const DRAFT_KEY = 'hushae.checkoutDraft';

export default function Checkout() {
  const { cart, settings, clearCart, auth, toast, updateQty } = useApp();
  const nav = useNavigate();

  const cfg = useMemo(() => checkoutConfig(settings), [settings]);
  const cartCfg = useMemo(() => cartConfig(settings), [settings]);

  const draft = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
  }, []);
  const addr = auth?.user?.addresses?.[0] || {};

  /* City & Province start UNSELECTED / EMPTY by default unless user has a saved profile/draft */
  const [f, setF] = useState({
    name: draft?.name ?? (auth?.user?.name || addr.name || ''),
    phone: draft?.phone ?? (auth?.user?.phone || addr.phone || ''),
    email: draft?.email ?? (auth?.user?.email || ''),
    address: draft?.address ?? (addr.address || ''),
    city: draft?.city || addr.city || '',
    customCity: draft?.customCity || '',
    province: draft?.province || addr.province || '',
    notes: draft?.notes || '',
  });

  const [applied, setApplied] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topErr, setTopErr] = useState('');
  const formRef = useRef(null);

  const handleCityChange = (chosenCity) => {
    if (chosenCity === '__other') {
      setF((x) => ({ ...x, city: '__other', customCity: '', province: '' }));
      setErrs((e) => ({ ...e, city: '', customCity: '' }));
    } else if (chosenCity === '') {
      setF((x) => ({ ...x, city: '', customCity: '', province: '' }));
      setErrs((e) => ({ ...e, city: '', province: '' }));
    } else {
      const autoProvince = PROVINCES_MAP[chosenCity] || f.province || '';
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
    if (!f.name || f.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!phoneOk) e.phone = 'Please enter a valid mobile number (e.g. 0300 1234567)';
    if (!f.address || f.address.trim().length < 5) e.address = 'Please enter your delivery address';
    if (!cityLabel) e.city = 'Please select or enter your city';
    if (!f.province) e.province = 'Please select your province';
    return e;
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setTopErr('');
    const validationErrors = validate();
    setErrs(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setTopErr('Please complete your delivery details below.');
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
            postalCode: CITY_POSTAL[cityLabel] || PROVINCE_POSTAL[f.province] || '54000',
            country: 'Pakistan',
            notes: f.notes.trim() || undefined,
          },
          items: cart.map((l) => ({
            product: l.id,
            size: l.size || '',
            color: l.color || '',
            quantity: l.qty || 1,
          })),
          paymentMethod: 'COD',
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
      <div className="min-h-screen bg-[#FFFFFF] pt-[140px] pb-24 text-center font-sans antialiased">
        <Seo title="Checkout — HUSHAE" description="Your bag is empty." />
        <div className="mx-auto max-w-md px-6 space-y-4">
          <h1 className="text-2xl font-light uppercase tracking-wide text-[#000000]">Your bag is empty</h1>
          <p className="text-xs text-[#666666] font-light">Add pieces to your bag to proceed to checkout.</p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#000000] px-8 text-xs font-medium uppercase tracking-widest text-[#FFFFFF] hover:bg-[#1A1A1A] transition-colors"
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
      <Seo title="Checkout — HUSHAE" description="Complete your order with Cash on Delivery." />

      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
        {/* Top Header Bar */}
        <div className="border-b border-[#EAEAEA] pb-5 mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-[#000000]">
            Checkout
          </h1>

          <div className="flex items-center gap-2 rounded-full border border-[#EAEAEA] bg-[#FBFBFB] px-4 py-1.5 text-xs text-[#555555] font-light">
            <Lock size={12} className="text-[#000000]" />
            <span>Discreet Delivery Nationwide</span>
          </div>
        </div>

        {topErr && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {topErr}
          </div>
        )}

        {/* ═══ 2-COLUMN CHECKOUT SUITE ════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 items-start">

          {/* ── LEFT: DELIVERY & PAYMENT (7 COLS — SOFT OVAL CARDS) ──────── */}
          <form
            ref={formRef}
            onSubmit={handlePlaceOrder}
            className="space-y-6 lg:col-span-7"
            noValidate
          >
            {/* Delivery Address Card */}
            <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="border-b border-[#EAEAEA] pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#000000]">
                  Shipping Address
                </h2>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#000000]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={f.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full rounded-2xl border bg-[#FFFFFF] px-4 py-3 text-xs text-[#000000] placeholder:text-[#999999] focus:border-[#000000] focus:outline-none transition-colors ${
                      errs.name ? 'border-red-500' : 'border-[#E0E0E0]'
                    }`}
                  />
                  {errs.name && <p className="text-[11px] text-red-600 mt-1">{errs.name}</p>}
                </div>

                {/* Mobile / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#000000]">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={f.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="0300 1234567"
                    className={`w-full rounded-2xl border bg-[#FFFFFF] px-4 py-3 text-xs text-[#000000] placeholder:text-[#999999] focus:border-[#000000] focus:outline-none transition-colors ${
                      errs.phone ? 'border-red-500' : 'border-[#E0E0E0]'
                    }`}
                  />
                  {errs.phone ? (
                    <p className="text-[11px] text-red-600 mt-1">{errs.phone}</p>
                  ) : phoneOk ? (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-light">
                      <Check size={11} /> {phoneOk}
                    </p>
                  ) : null}
                </div>

                {/* Street Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#000000]">
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    required
                    rows={2}
                    value={f.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="House / Flat #, Street, Area name, Landmark"
                    className={`w-full rounded-2xl border bg-[#FFFFFF] px-4 py-3 text-xs text-[#000000] placeholder:text-[#999999] focus:border-[#000000] focus:outline-none transition-colors resize-none ${
                      errs.address ? 'border-red-500' : 'border-[#E0E0E0]'
                    }`}
                  />
                  {errs.address && <p className="text-[11px] text-red-600 mt-1">{errs.address}</p>}
                </div>

                {/* Popular City Chips & Selector */}
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#000000]">
                    City <span className="text-red-500">*</span>
                  </label>

                  {/* Fast Oval City Chips (No default selected) */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {POPULAR_CITIES.slice(0, 8).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCityChange(c)}
                        className={`rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-wider border transition-all ${
                          f.city === c
                            ? 'border-[#000000] bg-[#000000] text-[#FFFFFF]'
                            : 'border-[#E5E5E5] bg-[#FFFFFF] text-[#333333] hover:border-[#000000]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {f.city === '__other' ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        required
                        value={f.customCity}
                        onChange={(e) => set('customCity', e.target.value)}
                        placeholder="Enter your city name"
                        className={`w-full rounded-2xl border bg-[#FFFFFF] px-4 py-3 text-xs text-[#000000] focus:outline-none ${
                          errs.city ? 'border-red-500' : 'border-[#000000]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleCityChange('')}
                        className="text-[11px] text-[#666666] underline hover:text-[#000000]"
                      >
                        &larr; Choose from city list
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={f.city || ''}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className={`w-full appearance-none rounded-2xl border bg-[#FFFFFF] px-4 py-3 pr-8 text-xs text-[#000000] focus:border-[#000000] focus:outline-none cursor-pointer transition-colors ${
                          errs.city ? 'border-red-500' : 'border-[#E0E0E0]'
                        }`}
                      >
                        <option value="" disabled>Select City</option>
                        {POPULAR_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__other">Other city (Enter manually)...</option>
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] text-xs">▾</span>
                    </div>
                  )}
                  {errs.city && <p className="text-[11px] text-red-600 mt-1">{errs.city}</p>}
                </div>

                {/* Province & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#000000]">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={f.province || ''}
                        onChange={(e) => set('province', e.target.value)}
                        className={`w-full appearance-none rounded-2xl border bg-[#FFFFFF] px-4 py-3 pr-8 text-xs text-[#000000] focus:border-[#000000] focus:outline-none cursor-pointer transition-colors ${
                          errs.province ? 'border-red-500' : 'border-[#E0E0E0]'
                        }`}
                      >
                        <option value="" disabled>Select Province</option>
                        {PROVINCES_FALLBACK.map((pr) => (
                          <option key={pr} value={pr}>{pr}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] text-xs">▾</span>
                    </div>
                    {errs.province && <p className="text-[11px] text-red-600 mt-1">{errs.province}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#000000]">
                      Email <span className="text-neutral-400 lowercase">(optional)</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={f.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="For order updates"
                      className="w-full rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] px-4 py-3 text-xs text-[#000000] placeholder:text-[#999999] focus:border-[#000000] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#000000] border-b border-[#EAEAEA] pb-3">
                Payment Method
              </h2>

              <div className="rounded-2xl border-2 border-[#000000] p-4 bg-[#FFFFFF] shadow-xs flex items-start gap-3.5">
                <input
                  type="radio"
                  name="payment"
                  checked
                  readOnly
                  className="mt-1 text-black focus:ring-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Banknote size={17} className="text-[#000000]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#000000]">
                      Cash on Delivery (COD)
                    </span>
                  </div>
                  <p className="text-xs text-[#666666] font-light leading-relaxed">
                    Pay with cash at your doorstep when your courier delivers the parcel.
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Submit Button */}
            <div className="pt-2 lg:hidden">
              <button
                type="submit"
                disabled={busy}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.18em] text-[#FFFFFF] shadow-lg hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
              >
                <span>{busy ? 'Placing Order…' : `Confirm Order · ${pkr(pricing.total)}`}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* ── RIGHT: STICKY ORDER SUMMARY (5 COLS) ────────────────────── */}
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
