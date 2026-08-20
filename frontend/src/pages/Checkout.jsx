import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, Lock, MapPin, Package, RotateCcw, ShieldCheck, Truck,
  ArrowRight, Banknote, Sparkles, Gift, Compass, ChevronDown, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import { checkoutConfig, enabledPayments, enabledShipping } from '../lib/checkoutConfig';
import { normalizePhone, phoneTypingError } from '../lib/validators';
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
  const { cart, settings, clearCart, auth, toast, updateQty } = useApp();
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
    postalCode: draft?.postalCode ?? '',
    notes: draft?.notes ?? '',
  });

  const [method, setMethod] = useState(draft?.method || 'cod');
  const [ship, setShip] = useState(draft?.ship || 'standard');
  const [applied, setApplied] = useState(null);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topErr, setTopErr] = useState('');
  const [packagingOption, setPackagingOption] = useState('discreet'); // discreet | signature
  const formRef = useRef(null);

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

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...f, method, ship })); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [f, method, ship]);

  const phoneOk = normalizePhone(f.phone);

  const lines = useMemo(() => cart.map((line, index) => ({ line, index, status: 'ok' })), [cart]);
  const pricing = useCartPricing(lines, settings, cartCfg, applied);
  const promoQuote = usePromoQuote(cart, {
    hasCoupon: !!applied,
    city: cityLabel,
  });

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

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setTopErr('');
    const validationErrors = validate();
    setErrs(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErr = Object.keys(validationErrors)[0];
      setTopErr('Please complete your delivery details highlighted below.');
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
            notes: f.notes.trim() || undefined,
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
          discreetPackaging: packagingOption === 'discreet',
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

  /* ── Empty Cart ────────────────────────────────────────────────────────── */
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-[140px] pb-24 text-center">
        <Seo title="Bespoke Checkout — HUSHAE" description="Your luxury wardrobe is currently empty." />
        <div className="mx-auto max-w-md px-6 space-y-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-neutral-400">ATELIER MANIFEST</p>
          <h1 className="text-3xl font-light uppercase tracking-tight text-black">Your bag is empty</h1>
          <p className="text-xs text-neutral-500 font-light leading-relaxed">
            Select your second-skin foundations and return here to complete your private order.
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
    <div className="min-h-screen bg-[#FAFAFA] pt-[120px] pb-28 font-sans text-[#111111] antialiased">
      <Seo
        title="Private Atelier Checkout — HUSHAE"
        description="Frictionless luxury checkout with Cash on Delivery nationwide and 100% blind discreet packaging."
      />

      <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-14">
        
        {/* ── TOP ATELIER CONCIERGE HEADER ───────────────────────────────── */}
        <div className="border-b border-neutral-200/80 pb-6 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              <span>HUSHAE ATELIER</span>
              <span>&bull;</span>
              <span>PRIVATE ORDER CONCIERGE</span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-light uppercase tracking-tight text-[#000000]">
              Order Confirmation Suite
            </h1>
          </div>

          {/* Luxury Security Stamp */}
          <div className="flex items-center gap-4 text-xs text-neutral-600 font-light">
            <div className="flex items-center gap-1.5 border border-neutral-200 bg-white px-3 py-1.5 shadow-xs">
              <ShieldCheck size={14} className="text-black" />
              <span>256-Bit Encrypted Protocol</span>
            </div>
            <div className="flex items-center gap-1.5 border border-neutral-200 bg-white px-3 py-1.5 shadow-xs">
              <Lock size={13} className="text-black" />
              <span>100% Blind Discreet Parcel</span>
            </div>
          </div>
        </div>

        {topErr && (
          <div className="mb-8 flex items-center gap-3 border border-red-300 bg-red-50 p-4 text-xs text-red-800">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{topErr}</span>
          </div>
        )}

        {/* ═══ REVOLUTIONARY SPLIT SUITE (60% WARDROBE / 40% CONCIERGE LEDGER) ═══ */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">

          {/* ── LEFT: CONCIERGE ORDER LEDGER (7 COLUMNS) ─────────────────── */}
          <div className="lg:col-span-7 space-y-8">
            
            <form
              ref={formRef}
              onSubmit={handlePlaceOrder}
              className="space-y-8"
              noValidate
            >
              {/* SECTION 1: CLIENT IDENTITY */}
              <div className="bg-white border border-neutral-200/90 p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center bg-black text-[10px] font-medium text-white">01</span>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
                      Recipient Identity & Contact
                    </h2>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-widest text-neutral-400">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Full Name */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={f.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. Ayesha Khan"
                      className={`w-full border bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors ${
                        errs.name ? 'border-red-500' : 'border-neutral-200'
                      }`}
                    />
                    {errs.name && <p className="text-[11px] text-red-600 font-light">{errs.name}</p>}
                  </div>

                  {/* WhatsApp / Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                      WhatsApp / Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
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
                          errs.phone ? 'border-red-500' : 'border-neutral-200'
                        }`}
                      />
                    </div>
                    {phoneOk ? (
                      <p className="text-[10.5px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check size={11} /> Valid Pakistani Number ({phoneOk})
                      </p>
                    ) : errs.phone ? (
                      <p className="text-[11px] text-red-600 font-light">{errs.phone}</p>
                    ) : (
                      <p className="text-[10.5px] text-neutral-400 font-light">Courier calls this number prior to doorstep delivery.</p>
                    )}
                  </div>

                  {/* Email (Optional) */}
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
                      className="w-full border border-neutral-200 bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: DESTINATION SUITE & ADDRESS */}
              <div className="bg-white border border-neutral-200/90 p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center bg-black text-[10px] font-medium text-white">02</span>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
                      Doorstep Delivery Destination
                    </h2>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-widest text-neutral-400">Step 2 of 3</span>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Street Address */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                      Street / House / Apartment Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      required
                      rows={2}
                      autoComplete="street-address"
                      value={f.address}
                      onChange={(e) => set('address', e.target.value)}
                      placeholder="House/Flat #, Building name, Street #, Sector / Area name, Nearby Landmark"
                      className={`w-full border bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors resize-none ${
                        errs.address ? 'border-red-500' : 'border-neutral-200'
                      }`}
                    />
                    {errs.address && <p className="text-[11px] text-red-600 font-light">{errs.address}</p>}
                  </div>

                  {/* Fast City Selector Chips */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                      City of Residence <span className="text-red-500">*</span>
                    </label>

                    {/* Quick Cities Grid */}
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {POPULAR_CITIES.slice(0, 8).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleCityChange(c)}
                          className={`px-3 py-1.5 text-[11px] uppercase tracking-wider border transition-all ${
                            f.city === c
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-black'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    {/* Dropdown for All Cities */}
                    {f.city === '__other' ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          required
                          value={f.customCity}
                          onChange={(e) => set('customCity', e.target.value)}
                          placeholder="Type your city / town name"
                          className="w-full border border-black bg-white px-4 py-3 text-xs text-black focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCityChange('Karachi')}
                          className="text-[10.5px] text-neutral-500 underline hover:text-black"
                        >
                          &larr; Return to popular city list
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={f.city}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="w-full appearance-none border border-neutral-200 bg-white px-4 py-3 pr-8 text-xs text-black focus:border-black focus:outline-none cursor-pointer"
                        >
                          {POPULAR_CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__other">Other City / Town (Type Manually)...</option>
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
                      </div>
                    )}
                  </div>

                  {/* Province Selector & Delivery Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={f.province}
                          onChange={(e) => set('province', e.target.value)}
                          className="w-full appearance-none border border-neutral-200 bg-white px-4 py-3 pr-8 text-xs text-black focus:border-black focus:outline-none cursor-pointer"
                        >
                          {PROVINCES_FALLBACK.map((pr) => (
                            <option key={pr} value={pr}>{pr}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">▾</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                        Special Instructions <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={f.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        placeholder="e.g. Leave with security / Call after 2pm"
                        className="w-full border border-neutral-200 bg-white px-4 py-3 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ATELIER PACKAGING & PAYMENT PROTOCOL */}
              <div className="bg-white border border-neutral-200/90 p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center bg-black text-[10px] font-medium text-white">03</span>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
                      Payment Protocol & Packaging
                    </h2>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-widest text-neutral-400">Step 3 of 3</span>
                </div>

                {/* Packaging Choice */}
                <div className="space-y-2.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Packaging Protocol
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPackagingOption('discreet')}
                      className={`flex flex-col text-left p-4 border transition-all ${
                        packagingOption === 'discreet'
                          ? 'border-black bg-neutral-50/70 shadow-xs'
                          : 'border-neutral-200 bg-white hover:border-neutral-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-black uppercase tracking-wider">
                        <Lock size={12} /> 100% Blind Discreet Parcel
                      </span>
                      <span className="mt-1 text-[11px] text-neutral-500 font-light leading-relaxed">
                        Unmarked brown outer box with zero product markings. Complete privacy.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPackagingOption('signature')}
                      className={`flex flex-col text-left p-4 border transition-all ${
                        packagingOption === 'signature'
                          ? 'border-black bg-neutral-50/70 shadow-xs'
                          : 'border-neutral-200 bg-white hover:border-neutral-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-black uppercase tracking-wider">
                        <Gift size={12} /> Signature Atelier Box
                      </span>
                      <span className="mt-1 text-[11px] text-neutral-500 font-light leading-relaxed">
                        HUSHAE matte black presentation box wrapped in archival tissue.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Payment Option: Cash on Delivery (Pre-selected) */}
                <div className="space-y-2.5 pt-2">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-black">
                    Payment Method
                  </label>
                  <div className="border-2 border-black p-5 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Banknote size={18} className="text-black" />
                        <span className="text-[13px] font-semibold uppercase tracking-wider text-black">
                          Cash on Delivery (COD)
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-medium bg-neutral-100 px-2 py-0.5 text-black">
                        Guaranteed
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 font-light leading-relaxed pl-7">
                      Pay cash directly to the courier rider upon receiving your parcel at your doorstep. No advance payment required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Submission Button */}
              <div className="pt-2 lg:hidden">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-[54px] w-full items-center justify-center gap-2 bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-lg transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                  <span>{busy ? 'Securing Order…' : `Confirm Order · ${pkr(pricing.total)}`}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>

          </div>

          {/* ── RIGHT: STICKY BESPOKE WARDROBE MANIFEST (5 COLUMNS) ──────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[124px] space-y-6">
              
              <div className="border border-neutral-200/90 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-neutral-400">
                      BESPOKE MANIFEST
                    </p>
                    <h3 className="mt-1 text-sm font-semibold uppercase tracking-wider text-black">
                      Your Selected Pieces ({pricing.count})
                    </h3>
                  </div>

                  <Link to="/cart" className="text-[11px] text-neutral-400 hover:text-black underline underline-offset-4">
                    Edit Bag
                  </Link>
                </div>

                {/* Garments List */}
                <ul className="divide-y divide-neutral-100 max-h-80 overflow-y-auto no-scrollbar pr-1">
                  {cart.map((l, i) => (
                    <li key={`${l.id}-${l.size}-${l.color}-${i}`} className="flex items-center gap-4 py-3.5">
                      <div className="relative aspect-[3/4] h-20 w-16 overflow-hidden bg-[#F6F6F6] shrink-0 border border-neutral-100">
                        <Img src={l.image} alt={l.name} className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 font-mono">
                          x{l.qty}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-medium text-black truncate leading-snug">
                          {l.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-light">
                          <span>Size: <strong className="font-normal text-black">{l.size || 'Regular'}</strong></span>
                          <span>&bull;</span>
                          <span>{l.color || 'Classic'}</span>
                        </div>
                        <p className="text-xs font-medium text-black">
                          {pkr(l.price * l.qty)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Promo Code Input */}
                <div className="border-t border-neutral-100 pt-4">
                  <CouponBox subtotal={pricing.subtotal} applied={applied} onApply={setApplied} onRemove={() => setApplied(null)} />
                </div>

                {/* Financial Ledger */}
                <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
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
                    <span>Courier Delivery (TCS Express)</span>
                    <span className="text-black font-normal">
                      {pricing.shipping === 0 ? 'Complimentary Express' : pkr(pricing.shipping)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3.5 text-sm">
                    <span className="font-medium text-black">Total to Pay on Delivery</span>
                    <span className="font-sans text-2xl font-medium text-black">{pkr(pricing.total)}</span>
                  </div>
                </div>

                {/* Direct 1-Tap Place Order Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={busy}
                    className="flex h-[54px] w-full items-center justify-center gap-2 bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md transition-colors hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <span>{busy ? 'Securing Order…' : `Confirm Order · ${pkr(pricing.total)}`}</span>
                    <ArrowRight size={14} />
                  </button>

                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-neutral-400 font-light">
                    <Lock size={11} className="text-black" />
                    256-Bit Encrypted Protocol &bull; Cash on Delivery Verified
                  </p>
                </div>

                {/* 3 Golden House Seals */}
                <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-[11px] text-neutral-600 font-light">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={14} className="text-black shrink-0" />
                    <span>100% Blind Discreet Parcel Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Truck size={14} className="text-black shrink-0" />
                    <span>TCS Express 2–4 Business Days Delivery</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <RotateCcw size={14} className="text-black shrink-0" />
                    <span>14-Day Hassle-Free Size Exchange Concierge</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
