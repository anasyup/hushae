import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Crosshair, MapPin, PackageCheck, Truck, User } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import { checkoutConfig, enabledPayments, enabledShipping, methodWindow, shippingCostFor } from '../lib/checkoutConfig';
import { normalizePhone, phoneTypingError } from '../lib/validators';
import { useCartPricing } from './cart/useCartPricing';
import FloatField, { FloatSelect } from './checkout/FloatField';
import MethodPicker from './checkout/MethodPicker';
import CheckoutSummary from './checkout/CheckoutSummary';
import RewardsBox from './checkout/RewardsBox';
import usePromoQuote from '../lib/usePromoQuote';
import ReviewDialog from './checkout/ReviewDialog';
import StickyPlaceOrder from './checkout/StickyPlaceOrder';
import Seo from '../components/Seo';

const PROVINCES_FALLBACK = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Kashmir', 'Islamabad (ICT)'];
const DRAFT_KEY = 'hushae.checkoutDraft';

/* ============================================================================
 * CHECKOUT
 *
 * Configuration
 *   Wording, payment methods, shipping methods, trust badges, terms and the
 *   success screen all come from settings.checkout via checkoutConfig().
 *   Admin → Settings → Checkout rewrites this page without a deploy.
 *
 * Money
 *   Priced by useCartPricing — the same engine as the bag and the drawer.
 *   The chosen shipping method's rate is layered on top through
 *   shippingCostFor(), which mirrors the server's formula exactly. The server
 *   still recomputes everything; the client never sends a total.
 *
 * Accessibility
 *   Every field is a FloatField: real <label for>, autocomplete, aria-invalid
 *   and aria-describedby. On a failed submit focus moves to the first bad
 *   field and the error count is announced.
 * ========================================================================== */
export default function Checkout() {
  const { cart, settings, clearCart, auth, toast, updateQty } = useApp();
  const nav = useNavigate();

  const cfg = useMemo(() => checkoutConfig(settings), [settings]);
  const cartCfg = useMemo(() => cartConfig(settings), [settings]);

  const payments = useMemo(() => enabledPayments(cfg), [cfg]);
  const shipOptions = useMemo(() => enabledShipping(cfg), [cfg]);

  /* ---------------- draft restore ---------------- */
  const draft = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
  }, []);
  const addr = auth?.user?.addresses?.[0] || {};

  const [f, setF] = useState({
    name: draft?.name ?? (auth?.user?.name || addr.name || ''),
    phone: draft?.phone ?? (auth?.user?.phone || addr.phone || ''),
    email: draft?.email ?? (auth?.user?.email || ''),
    address: draft?.address ?? (addr.address || ''),
    address2: draft?.address2 ?? '',
    city: draft?.city ?? (addr.city || ''),
    customCity: draft?.customCity ?? '',
    province: draft?.province ?? (addr.province || ''),
    postalCode: draft?.postalCode ?? '',
    notes: draft?.notes ?? '',
  });
  const [country, setCountry] = useState('Pakistan');
  const [method, setMethod] = useState(draft?.method || '');
  const [ship, setShip] = useState(draft?.ship || '');
  const [txn, setTxn] = useState(draft?.txn || '');
  const [discreet, setDiscreet] = useState(draft?.discreet !== false);
  const [terms, setTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(draft?.newsletter ?? false);
  const [applied, setApplied] = useState(null);
  /* Rewards INTENT, never amounts. What these are worth is quoted by the
     server and re-computed by the server when the order is placed. */
  const [rewards, setRewards] = useState({ points: 0, useCredit: false, giftCardCode: '' });
  const [quote, setQuote] = useState(null);
  /* Automatic promotions, priced by the server. Display only — the order route
     recomputes every one of them before charging anything. */
  /* cityLabel is derived further down the component; reading it here would be
     a temporal dead zone crash. The city only narrows city-restricted
     promotions, so it is read straight from form state instead. */
  const promoQuote = usePromoQuote(cart, {
    hasCoupon: !!applied,
    city: f.city === '__other' ? (f.customCity || '').trim() : f.city,
  });

  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topErr, setTopErr] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const submitRef = useRef(null);
  const formRef = useRef(null);

  /* Default the pickers to the merchant's first enabled option. Runs when the
     registry arrives, and only while nothing is chosen — never overrides the
     customer or a restored draft. */
  useEffect(() => {
    if (!method && payments.length) {
      const ok = payments.find((m) => m.id === draft?.method && !m.comingSoon);
      setMethod((ok || payments.find((m) => !m.comingSoon) || payments[0]).id);
    }
  }, [payments, method, draft]);

  useEffect(() => {
    if (!ship && shipOptions.length) {
      const ok = shipOptions.find((m) => m.id === draft?.ship);
      setShip((ok || shipOptions[0]).id);
    }
  }, [shipOptions, ship, draft]);

  const payMethod = payments.find((m) => m.id === method) || null;
  const shipMethod = shipOptions.find((m) => m.id === ship) || null;

  /* ---------------- pricing: ONE engine ---------------- */
  // Checkout has no stock map of its own — the bag already blocks sold-out
  // lines from reaching here, and the server re-verifies on submit.
  const lines = useMemo(() => cart.map((line, index) => ({ line, index, status: 'ok', available: null })), [cart]);
  const base = useCartPricing(lines, settings, cartCfg, applied);

  // Layer the chosen shipping method over the base rate, mirroring the server.
  const withShipping = useMemo(() => {
    const shipping = shipMethod ? shippingCostFor(shipMethod, base) : base.shipping;
    if (shipping === base.shipping) return base;
    const delta = shipping - base.shipping;
    return { ...base, shipping, total: base.total + delta };
  }, [base, shipMethod]);

  /* Rewards are layered ON TOP of useCartPricing rather than inside it.
   *
   * That hook is shared by the bag, the drawer and this page, and rewards only
   * exist at checkout — folding them in would make the bag quote a total that
   * depends on who is signed in. The order of application mirrors the server
   * exactly: points, then credit, then gift card, each capped by what is left.
   *
   * These figures are a PREVIEW. The server recomputes all three from its own
   * ledger when the order is placed; if they ever disagree, the server wins
   * and the customer is charged the server's number. */
  const pricing = useMemo(() => {
    const p = withShipping;
    if (!quote || !quote.enabled) return { ...p, rewardsTotal: 0 };

    let payable = p.total;
    const pointsValue = Math.min(
      Math.floor(rewards.points * (Number(quote.pointValue) || 1)),
      payable,
    );
    payable -= pointsValue;

    const creditValue = rewards.useCredit ? Math.min(quote.creditUsable || 0, payable) : 0;
    payable -= creditValue;

    // The card's balance is known from the check call; the server caps it again.
    const cardValue = rewards.giftCardCode && quote.cardBalance
      ? Math.min(quote.cardBalance, payable)
      : 0;
    payable -= cardValue;

    const rewardsTotal = pointsValue + creditValue + cardValue;
    if (!rewardsTotal) return { ...p, rewardsTotal: 0 };

    return {
      ...p,
      pointsValue,
      creditValue,
      cardValue,
      rewardsTotal,
      total: Math.max(0, p.total - rewardsTotal),
      savings: p.savings + rewardsTotal,
    };
  }, [withShipping, quote, rewards]);

  /* ---------------- draft persistence ---------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...f, method, ship, txn, discreet, newsletter })); } catch { /* quota */ }
    }, 300);
    return () => clearTimeout(t);
  }, [f, method, ship, txn, discreet, newsletter]);

  /* ---------------- locations ---------------- */
  const [provinces, setProvinces] = useState(PROVINCES_FALLBACK);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [postalHint, setPostalHint] = useState('');
  const [postalLive, setPostalLive] = useState(null);

  useEffect(() => {
    api('/locations').then((r) => { if (r?.provinces?.length) setProvinces(r.provinces); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!f.province) { setCities([]); return undefined; }
    let alive = true;
    setCitiesLoading(true);
    api(`/locations/${encodeURIComponent(f.province)}/cities`)
      .then((r) => {
        if (!alive) return;
        const list = r?.cities || [];
        setCities(list);
        setF((x) => (x.city && x.city !== '__other' && !list.includes(x.city) ? { ...x, city: '' } : x));
      })
      .catch(() => { if (alive) setCities([]); })
      .finally(() => { if (alive) setCitiesLoading(false); });
    return () => { alive = false; };
  }, [f.province]);

  useEffect(() => {
    setPostalHint('');
    if (!f.city || f.city === '__other') return;
    api(`/locations/postal-hint/${encodeURIComponent(f.city)}`)
      .then((r) => { if (r?.code) setPostalHint(r.code); })
      .catch(() => {});
  }, [f.city]);

  useEffect(() => {
    setPostalLive(null);
    if (!/^\d{5}$/.test(f.postalCode) || !f.province) return undefined;
    let alive = true;
    const id = setTimeout(() => {
      api('/locations/postal-check', {
        method: 'POST',
        body: { postalCode: f.postalCode, province: f.province, city: f.city === '__other' ? '' : f.city },
      }).then((r) => { if (alive) setPostalLive(r); }).catch(() => {});
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [f.postalCode, f.province, f.city]);

  /* ---------------- pin location ---------------- */
  const [loc, setLoc] = useState(null);
  const [locLink, setLocLink] = useState('');
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState({ type: '', text: '' });
  const inPK = (lat, lng) => lat >= 23.4 && lat <= 37.2 && lng >= 60.4 && lng <= 78;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocMsg({ type: 'err', text: 'Your browser cannot share a location — paste a Google Maps link instead' });
      return;
    }
    setLocBusy(true); setLocMsg({ type: '', text: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        if (!inPK(lat, lng)) setLocMsg({ type: 'err', text: 'That pin looks outside Pakistan — please check it' });
        else { setLoc({ lat, lng, mapsLink: `https://www.google.com/maps?q=${lat},${lng}` }); setLocMsg({ type: 'ok', text: 'Location added' }); }
        setLocBusy(false);
      },
      () => { setLocBusy(false); setLocMsg({ type: 'err', text: 'Location access was denied — paste a Google Maps link instead' }); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const resolveLink = async () => {
    if (!locLink.trim() || locBusy) return;
    setLocBusy(true); setLocMsg({ type: '', text: '' });
    try {
      const r = await api('/geo/resolve', { method: 'POST', body: { url: locLink.trim() } });
      setLoc(r); setLocMsg({ type: 'ok', text: 'Location found — please confirm it on the map' });
    } catch (ex) { setLocMsg({ type: 'err', text: ex.message }); }
    setLocBusy(false);
  };

  /* ---------------- abandoned cart ---------------- */
  useEffect(() => {
    if (!f.email || !/^\S+@\S+\.\S+$/.test(f.email) || cart.length === 0) return undefined;
    const t = setTimeout(() => {
      api('/abandoned-cart/track', {
        method: 'POST',
        body: {
          email: f.email, name: f.name || '', phone: f.phone || '',
          items: cart.map((l) => ({ product: l.id, size: l.size, color: l.color, quantity: l.qty })),
        },
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [f.email, f.name, f.phone, cart.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrs((e) => (e[k] ? { ...e, [k]: '' } : e));
  }, []);

  const cityLabel = f.city === '__other' ? f.customCity.trim() : f.city;

  /* ---------------- validation ---------------- */
  const validate = () => {
    const e = {};
    if (f.name.trim().length < 3) e.name = 'Please enter your full name';
    if (!normalizePhone(f.phone)) e.phone = 'Enter a valid Pakistani mobile, e.g. 0300 1234567';
    if (f.address.trim().length < 6) e.address = 'Please enter your full street address';
    if (!f.province) e.province = 'Please select your province';
    if (!cityLabel) e.city = 'Please choose your city';
    if (!/^\d{5}$/.test(f.postalCode)) e.postalCode = 'Postal code must be 5 digits';
    else if (postalLive && postalLive.ok === false) e.postalCode = 'That postal code does not match your city';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email, or leave it empty';
    if (!method) e.method = 'Please choose how you want to pay';
    if (cfg.termsRequired && !terms) e.terms = 'Please accept the terms to continue';
    return e;
  };

  const openReview = () => {
    setTopErr('');
    const e = validate();
    setErrs(e);
    const keys = Object.keys(e);
    if (keys.length) {
      /* Move focus to the first invalid control. The old form left focus on
         the submit button and scrolled to the top, so a keyboard or screen
         reader user was given no idea what had failed. */
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector('[aria-invalid="true"]');
        if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      });
      setTopErr(`${keys.length} ${keys.length === 1 ? 'detail needs' : 'details need'} your attention before we can continue.`);
      return;
    }
    setReviewOpen(true);
  };

  /* ---------------- place order ---------------- */
  const placeOrder = async () => {
    setBusy(true); setTopErr('');
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        token: auth?.token,
        body: {
          customerInfo: { ...f, phone: normalizePhone(f.phone), city: cityLabel, customCity: undefined, country, location: loc },
          items: cart.map((l) => ({ product: l.id, size: l.size, color: l.color, quantity: l.qty })),
          paymentMethod: method,
          shippingMethod: ship || 'standard',
          transactionId: txn,
          discountCode: applied?.code || '',
          discreetPackaging: discreet,
          /* Intent only. The server reads its own ledger for the values. */
          redeemPoints: rewards.points || 0,
          useCredit: !!rewards.useCredit,
          giftCardCode: rewards.giftCardCode || '',
        },
      });

      if (newsletter && f.email) {
        api('/subscribers', { method: 'POST', body: { email: f.email } }).catch(() => {});
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      clearCart();
      nav(`/order/${order.orderNumber}`, { state: { order }, replace: true });
    } catch (ex) {
      const msg = ex.message || 'We could not place your order. Please try again.';
      const raw = ex.raw || {};
      setBusy(false);
      setReviewOpen(false);

      // Map server-side failures back onto the field that caused them so the
      // customer is taken to the problem instead of reading a generic banner.
      const fieldErrs = {};
      if (/postal/i.test(msg)) fieldErrs.postalCode = 'That postal code does not match your city';
      if (/phone|mobile/i.test(msg)) fieldErrs.phone = 'Enter a valid Pakistani mobile number';
      if (Object.keys(fieldErrs).length) {
        setErrs((e) => ({ ...e, ...fieldErrs }));
        requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      }

      if (['out-of-stock', 'unavailable', 'size-unavailable'].includes(raw.reason)) {
        setTopErr(`${msg} Please open your bag and remove the item that is no longer available.`);
      } else if (raw.field === 'giftCardCode' || /gift card/i.test(msg)) {
        // Drop the card rather than leaving a dead code attached to the order.
        setRewards((r) => ({ ...r, giftCardCode: '' }));
        setTopErr(`${msg} The card has been removed — the total above is what you will pay.`);
      } else if (/coupon|discount|code/i.test(msg)) {
        setApplied(null);
        setTopErr(`${msg} Your promo code has been removed — the total above is what you will pay.`);
      } else {
        setTopErr(msg);
      }
      toast('Order not placed');
    }
  };

  /* ---------------- empty ---------------- */
  if (cart.length === 0) {
    return (
      <div className="container-page py-sect-y text-center md:py-sect-y-lg pt-[150px]"><Seo title="Checkout" description="Complete your order — COD, JazzCash and card payments, discreet packaging." />
        <h1 className="text-[24px] font-light normal-case text-charcoal">Nothing to check out yet</h1>
        <p className="mt-3 text-[13px] text-smoke">Your bag is empty — add a piece and come back.</p>
        <Link to={cartCfg.continueHref} className="btn-qa mt-8 !w-auto px-10">{cartCfg.continueLabel}</Link>
      </div>
    );
  }

  const phoneOk = normalizePhone(f.phone);

  return (
    <div className="bg-white pt-[150px] pb-10"><Seo title="Checkout" description="Complete your order — COD, JazzCash and card payments, discreet packaging." /><div className="mx-auto max-w-[1200px] px-6">
      {/* Checkout steps — matches cart progression */}
      <nav aria-label="Checkout progress" className="mb-7 mt-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em]">
        <Link to="/cart" className="text-[#696969] transition hover:text-[#111111]">Bag</Link>
        <span className="h-px w-8 bg-[#111111]" aria-hidden="true" />
        <span className="text-[#111111]">Checkout</span>
        <span className="h-px w-8 bg-[#E5E5E5]" aria-hidden="true" />
        <span className="text-[#696969]">Confirmation</span>
      </nav>

      <header className="pb-7">
        <h1 className="font-display text-3xl font-light uppercase tracking-wider">{cfg.title}</h1>
        {!auth && cfg.guestCheckout && (
          <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-[12px] text-smoke">
            <User size={13} aria-hidden="true" />
            Checking out as a guest.
            <Link to="/account" className="font-medium text-charcoal underline underline-offset-4">Sign in</Link>
            for faster checkout and order history.
          </p>
        )}
        {auth && <p className="mt-3 text-[12px] text-smoke">Ordering as <span className="font-medium text-charcoal">{auth.user.name}</span></p>}
      </header>

      {/* Express checkout — sleek badges (merchant-gated, disabled until live) */}
      {(cartCfg.applePay || cartCfg.googlePay) && (
        <div className="mt-6">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#696969]">Express Checkout</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {cartCfg.applePay && (
              <button type="button" disabled
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] bg-[#111111] px-6 text-[15px] font-medium text-white opacity-60">
                <span className="text-[17px] leading-none"> </span> Pay
              </button>
            )}
            {cartCfg.googlePay && (
              <button type="button" disabled
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] border border-[#111111] bg-white px-6 text-[15px] font-medium text-[#111111] opacity-60">
                G Pay
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#696969]">
            <span className="h-px flex-1 bg-[#E5E5E5]" aria-hidden="true" />
            or
            <span className="h-px flex-1 bg-[#E5E5E5]" aria-hidden="true" />
          </div>
        </div>
      )}

      {topErr && (
        <p role="alert" className="mt-6 flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3.5 text-[12px] text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {topErr}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
        {/* ================= LEFT ================= */}
        <form
          ref={formRef}
          onSubmit={(e) => { e.preventDefault(); openReview(); }}
          className="space-y-8 lg:col-span-7"
          noValidate
        >
          {/* ---- Contact — compact card ---- */}
          <section aria-labelledby="sec-contact">
            <h2 id="sec-contact" className="text-xs font-semibold uppercase tracking-widest text-neutral-400">1. Contact Information</h2>
            <div className="mt-2.5 grid gap-3">
              <FloatField
                label="Email" type="email" autoComplete="email" inputMode="email"
                value={f.email} onChange={(v) => set('email', v)} error={errs.email}
                hint="For your order confirmation and tracking updates."
              />
              <FloatField
                label="Phone" required autoComplete="tel" inputMode="tel"
                value={f.phone} onChange={(v) => set('phone', v)}
                error={errs.phone || (!errs.phone && phoneTypingError(f.phone) ? 'That does not look like a Pakistani mobile' : '')}
                valid={phoneOk ? `Valid — ${phoneOk}` : ''}
              />
            </div>
          </section>

          {/* ---- Shipping — compact card ---- */}
          <section aria-labelledby="sec-address">
            <h2 id="sec-address" className="text-xs font-semibold uppercase tracking-widest text-neutral-400">2. Delivery Address</h2>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FloatField
                  label="Full name" required autoComplete="name"
                  value={f.name} onChange={(v) => set('name', v)} error={errs.name}
                />
              </div>

              <div className="sm:col-span-2">
                <FloatField
                  label="Address line 1" required autoComplete="street-address"
                  value={f.address} onChange={(v) => set('address', v)} error={errs.address}
                  hint="House or flat number, street, area."
                />
              </div>

              <div className="sm:col-span-2">
                <FloatField
                  label="Address line 2 (optional)" autoComplete="address-line2"
                  value={f.address2} onChange={(v) => set('address2', v)}
                />
              </div>

              <FloatSelect
                label="Province" required value={f.province}
                onChange={(v) => setF((x) => ({ ...x, province: v, city: '', customCity: '' }))}
              >
                <option value="">Select province</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </FloatSelect>

              {f.city === '__other' ? (
                <div>
                  <FloatField
                    label="City" required value={f.customCity}
                    onChange={(v) => { setF((x) => ({ ...x, customCity: v })); setErrs((e) => ({ ...e, city: '' })); }}
                    error={errs.city}
                  />
                  <button
                    type="button"
                    onClick={() => setF((x) => ({ ...x, city: '', customCity: '' }))}
                    className="mt-1.5 min-h-[44px] text-[11px] text-smoke underline underline-offset-4 transition hover:text-charcoal"
                  >
                    ← Choose from the list
                  </button>
                </div>
              ) : (
                <FloatSelect
                  label="City" required value={f.city} disabled={citiesLoading} error={errs.city}
                  onChange={(v) => { setF((x) => ({ ...x, city: v })); setErrs((e) => ({ ...e, city: '' })); }}
                >
                  <option value="">{citiesLoading ? 'Loading cities…' : 'Select your city'}</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__other">My city is not listed</option>
                </FloatSelect>
              )}

              <FloatField
                label="Postal code" required autoComplete="postal-code" inputMode="numeric" maxLength={5}
                value={f.postalCode}
                onChange={(v) => set('postalCode', v.replace(/\D/g, '').slice(0, 5))}
                error={errs.postalCode || (postalLive && postalLive.ok === false ? 'That postal code does not match your city' : '')}
                valid={postalLive?.ok && postalHint && f.postalCode === postalHint ? `Correct for ${f.city}` : ''}
                hint={!f.postalCode && postalHint ? `${f.city} is usually ${postalHint}` : ''}
              />

              <div className="sm:col-span-2">
                <FloatSelect label="Country" value={country} onChange={setCountry}>
                  <option value="Pakistan">Pakistan</option>
                </FloatSelect>
              </div>
            </div>

            {/* ---- Pin location ---- */}
            {cfg.showPinLocation && (
              <div className="mt-3 rounded-lg border border-[#E5E5E5]/70 bg-[#FFFFFF]/70 p-3.5">
                <h3 className="flex flex-wrap items-center gap-2 text-label uppercase tracking-widest text-ash">
                  <MapPin size={13} aria-hidden="true" /> Pin location
                  <span className="font-normal normal-case tracking-normal">(optional — helps the rider find you)</span>
                </h3>
                {!loc ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr]">
                    <button
                      type="button" onClick={useCurrentLocation} disabled={locBusy}
                      className="inline-flex min-h-[40px] items-center gap-1.5 border border-[#E5E5E5]/70 bg-[#FFFFFF]/60 px-4 text-[12px] font-medium text-[#5B5955] transition hover:border-[#C9A96E] disabled:opacity-50"
                    >
                      <Crosshair size={14} aria-hidden="true" /> {locBusy ? 'Getting location…' : 'Use my location'}
                    </button>
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor="maps-link">Google Maps share link</label>
                      <input
                        id="maps-link" className="input-line min-h-[44px] flex-1" value={locLink}
                        onChange={(e) => { setLocLink(e.target.value); setLocMsg({ type: '', text: '' }); }}
                        placeholder="Or paste a Google Maps link"
                      />
                      <button
                        type="button" onClick={resolveLink} disabled={locBusy || !locLink.trim()}
                        className="btn btn-sm shrink-0 bg-obsidian text-alabaster disabled:opacity-40"
                      >
                        Locate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <iframe
                      title="Your delivery location" loading="lazy"
                      src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`}
                      className="h-44 w-full rounded-control border border-line"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-caption text-ash">{loc.lat}, {loc.lng} — please confirm on the map</span>
                      <button
                        type="button" onClick={() => { setLoc(null); setLocMsg({ type: '', text: '' }); }}
                        className="min-h-[44px] text-caption font-semibold text-red-700 underline underline-offset-4"
                      >
                        Remove pin
                      </button>
                    </div>
                  </div>
                )}
                {locMsg.text && (
                  <p role="status" className={`mt-2 text-caption font-medium ${locMsg.type === 'err' ? 'text-red-700' : 'text-sagedark'}`}>
                    {locMsg.text}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ---- Delivery method ---- */}
          {shipOptions.length > 0 && (
            <section aria-labelledby="sec-ship">
              <h2 id="sec-ship" className="text-[13px] font-medium uppercase tracking-[0.1em] text-[#111111]">Delivery Method</h2>
              <div className="mt-3">
                <MethodPicker
                  name="shipping" legend="Choose a delivery method"
                  options={shipOptions} value={ship} onChange={setShip}
                  renderMeta={(m) => (
                    <span className="mt-1 flex items-center gap-1.5 text-[11px] text-smoke">
                      <Truck size={11} aria-hidden="true" />
                      {methodWindow(m)}
                      <span className="font-medium text-charcoal">
                        · {shippingCostFor(m, base) === 0 ? 'Free' : pkr(shippingCostFor(m, base))}
                      </span>
                    </span>
                  )}
                />
              </div>
            </section>
          )}

          {/* ---- Payment — compact card ---- */}
          <section aria-labelledby="sec-pay">
            <h2 id="sec-pay" className="text-xs font-semibold uppercase tracking-widest text-neutral-400">3. Payment</h2>
            {errs.method && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-[11px] text-red-700">
                <AlertCircle size={12} aria-hidden="true" /> {errs.method}
              </p>
            )}
            <div className="mt-3">
              {payments.length === 0 ? (
                <p className="rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
                  No payment method is switched on. Please contact us to place your order.
                </p>
              ) : (
                <MethodPicker
                  name="payment" legend="Choose how to pay"
                  options={payments} value={method} onChange={(v) => { setMethod(v); setErrs((e) => ({ ...e, method: '' })); }}
                />
              )}
            </div>

            {/* Instructions + reference for the selected method */}
            {payMethod?.needsTxn && (
              <div className="mt-3 border border-[#E5E5E5]/70 bg-[#FFFFFF]/60 p-3.5">
                {(payMethod.instructions || (payMethod.id === 'Bank Transfer' && settings?.paymentMethods?.bankDetails)) && (
                  <p className="mb-3 whitespace-pre-wrap text-[11px] leading-relaxed text-smoke">
                    {payMethod.instructions || settings?.paymentMethods?.bankDetails}
                  </p>
                )}
                <FloatField
                  label="Transaction ID / reference (optional)"
                  value={txn} onChange={setTxn}
                  hint="Your payment stays pending until our team verifies it — then your order ships."
                />
              </div>
            )}

            <label className="mt-3 flex cursor-pointer items-start gap-3 border border-[#E5E5E5]/70 p-3.5 transition hover:border-charcoal/40">
              <input
                type="checkbox" checked={discreet} onChange={(e) => setDiscreet(e.target.checked)}
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#111111]"
              />
              <span className="flex items-start gap-3">
                <PackageCheck size={18} className="mt-0.5 shrink-0 text-graphite" aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-medium text-charcoal">Discreet packaging</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-smoke">
                    A plain, unmarked parcel — no brand name or product details on the outside. Always free.
                  </span>
                </span>
              </span>
            </label>
          </section>

          {/* ---- Notes + consent — compact card ---- */}
          <section aria-labelledby="sec-extra">
            <h2 id="sec-extra" className="sr-only">Order notes and consent</h2>
            <div className="space-y-3">
              {cfg.showOrderNotes && (
                <FloatField
                  as="textarea" label={cfg.orderNotesLabel} hint={cfg.orderNotesHint}
                  value={f.notes} onChange={(v) => set('notes', v)}
                />
              )}

              {cfg.showNewsletter && (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#111111]"
                  />
                  <span className="text-body-sm text-ash">{cfg.newsletterText}</span>
                </label>
              )}

              {cfg.termsRequired && (
                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox" checked={terms}
                      onChange={(e) => { setTerms(e.target.checked); setErrs((x) => ({ ...x, terms: '' })); }}
                      aria-invalid={errs.terms ? 'true' : undefined}
                      aria-describedby={errs.terms ? 'terms-err' : undefined}
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#111111]"
                    />
                    <span className="text-body-sm text-ash">{cfg.termsText}</span>
                  </label>
                  {errs.terms && (
                    <p id="terms-err" role="alert" className="mt-1.5 flex items-center gap-1.5 text-caption text-red-700">
                      <AlertCircle size={12} aria-hidden="true" /> {errs.terms}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Native submit so Enter works anywhere in the form. */}
          <button type="submit" className="sr-only">Review order</button>
        </form>

        {/* ================= RIGHT ================= */}
        <aside className="lg:col-span-5 lg:self-start" aria-label="Order summary">
          <CheckoutSummary
            cart={cart}
            pricing={pricing}
            onQty={(line, qty) => {
              updateQty(lineKey(line), qty, cartCfg.maxQty || 10);
            }}
            cartCfg={cartCfg}
            checkoutCfg={cfg}
            applied={applied}
            onApply={setApplied}
            onRemoveCoupon={() => setApplied(null)}
            submitRef={submitRef}
            onSubmit={openReview}
            busy={busy}
            disabled={payments.length === 0}
            promoQuote={promoQuote}
            rewardsSlot={auth?.token ? (
              <RewardsBox
                token={auth.token}
                subtotal={base.subtotal}
                value={rewards}
                onChange={setRewards}
                onQuote={setQuote}
                disabled={busy}
              />
            ) : null}
          />
        </aside>
      </div>

      <StickyPlaceOrder
        watchRef={submitRef}
        total={pricing.total}
        label="Review"
        onClick={openReview}
        busy={busy}
        disabled={payments.length === 0}
      />

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={placeOrder}
        busy={busy}
        error={topErr}
        form={f}
        cityLabel={cityLabel}
        method={payMethod?.label || method}
        shipMethod={shipMethod}
        txn={txn}
        discreet={discreet}
        cart={cart}
        pricing={pricing}
        cfg={cartCfg}
      />

      {/* Clearance for the sticky bar so it never covers the last field. */}
      <div className="h-24 md:hidden" aria-hidden="true" />
    </div>
    </div>
  );
}
