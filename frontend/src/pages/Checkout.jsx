import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgePercent, Banknote, CreditCard, Crosshair, Landmark, Lock, MapPin, PackageCheck, Smartphone, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import Img from '../components/Img';
import Tx from '../components/Tx';
import { normalizePhone } from '../lib/validators';

// Fallback if the locations API is unreachable
const PROVINCES_FALLBACK = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Kashmir', 'Islamabad (ICT)'];

const PM = [
  { id: 'COD', icon: Banknote, title: 'Cash on Delivery', note: 'Pay at your doorstep' },
  { id: 'JazzCash', icon: Smartphone, title: 'JazzCash', note: 'Send to 0300-VELAURA then enter txn ID' },
  { id: 'EasyPaisa', icon: Smartphone, title: 'EasyPaisa', note: 'Send to 0345-VELAURA then enter txn ID' },
  { id: 'Bank Transfer', icon: Landmark, title: 'Bank Transfer', note: 'Transfer then enter reference' },
];

// Module-level field (component identity stays stable while typing — no focus loss)
function Field({ k, label, f, errs, set, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className={`input ${errs[k] ? '!border-red-400 !ring-red-50' : ''}`} value={f[k]} onChange={(e) => set(k, e.target.value)} {...props} />
      {errs[k] && <p className="mt-1 text-xs text-red-700">{errs[k]}</p>}
    </div>
  );
}

export default function Checkout() {
  const { cart, cartSubtotal, settings, clearCart, auth, t } = useApp();
  const nav = useNavigate();
  const flat = settings?.shippingFlatRate ?? 350;
  const threshold = settings?.freeShippingThreshold ?? 4999;
  const shipping = cartSubtotal >= threshold ? 0 : flat;

  // Promo code
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(null); // { code, discount }
  const [codeErr, setCodeErr] = useState('');
  const [applying, setApplying] = useState(false);
  const discountAmt = applied?.discount || 0;
  const grandTotal = Math.max(0, cartSubtotal - discountAmt) + shipping;

  const applyCode = async () => {
    if (!code.trim() || applying) return;
    setApplying(true); setCodeErr('');
    try {
      const r = await api('/discounts/validate', { method: 'POST', body: { code: code.trim(), subtotal: cartSubtotal } });
      setApplied(r); setCodeErr('');
    } catch (ex) { setApplied(null); setCodeErr(ex.message || 'Invalid code'); }
    setApplying(false);
  };
  const pmCfg = settings?.paymentMethods || { cod: true, jazzcash: true, easypaisa: true, bank: true };
  const enabled = PM.filter((m) =>
    (m.id === 'COD' && pmCfg.cod) || (m.id === 'JazzCash' && pmCfg.jazzcash) || (m.id === 'EasyPaisa' && pmCfg.easypaisa) || (m.id === 'Bank Transfer' && pmCfg.bank));

  const addr = auth?.user?.addresses?.[0] || {};
  const [f, setF] = useState({
    name: auth?.user?.name || addr.name || '', phone: auth?.user?.phone || addr.phone || '', email: auth?.user?.email || '',
    address: addr.address || '', city: addr.city || '', customCity: '', province: addr.province || 'Punjab', postalCode: '', notes: '',
  });
  const [method, setMethod] = useState('COD');
  const [txn, setTxn] = useState('');
  const [discreet, setDiscreet] = useState(true);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [topErr, setTopErr] = useState('');

  // Provinces + cities from the backend API
  const [provinces, setProvinces] = useState(PROVINCES_FALLBACK);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    api('/locations').then((r) => { if (r?.provinces?.length) setProvinces(r.provinces); }).catch(() => {});
  }, []);

  // Jab province badle → us province ke cities API se lao
  useEffect(() => {
    if (!f.province) { setCities([]); return; }
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

  // City ka postal code hint (e.g. Lahore → 54000)
  const [postalHint, setPostalHint] = useState('');
  useEffect(() => {
    setPostalHint('');
    if (!f.city || f.city === '__other') return;
    api(`/locations/postal-hint/${encodeURIComponent(f.city)}`)
      .then((r) => { if (r?.code) setPostalHint(r.code); })
      .catch(() => {});
  }, [f.city]);

  // Live postal verification against province + city (backend is the source of truth)
  const [postalLive, setPostalLive] = useState(null); // { ok, message?, suggestion? }
  useEffect(() => {
    setPostalLive(null);
    const code = f.postalCode;
    if (!/^\d{5}$/.test(code) || !f.province) return undefined;
    const city = f.city === '__other' ? '' : f.city;
    let alive = true;
    const id = setTimeout(() => {
      api('/locations/postal-check', { method: 'POST', body: { postalCode: code, province: f.province, city } })
        .then((r) => { if (alive) setPostalLive(r); })
        .catch(() => {});
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [f.postalCode, f.province, f.city]);

  // Pin location (Google Maps)
  const [loc, setLoc] = useState(null); // { lat, lng, mapsLink }
  const [locLink, setLocLink] = useState('');
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState({ type: '', text: '' });

  const inPK = (lat, lng) => lat >= 23.4 && lat <= 37.2 && lng >= 60.4 && lng <= 78;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocMsg({ type: 'err', text: 'Your browser does not support location — paste a Google Maps link below instead' });
      return;
    }
    setLocBusy(true); setLocMsg({ type: '', text: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6); const lng = +pos.coords.longitude.toFixed(6);
        if (!inPK(lat, lng)) { setLocMsg({ type: 'err', text: 'That location looks outside Pakistan — please check the pin' }); }
        else { setLoc({ lat, lng, mapsLink: `https://www.google.com/maps?q=${lat},${lng}` }); setLocMsg({ type: 'ok', text: 'Location added ✓' }); }
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
      setLoc(r); setLocMsg({ type: 'ok', text: 'Location found ✓ please confirm it on the map' });
    } catch (ex) { setLocMsg({ type: 'err', text: ex.message }); }
    setLocBusy(false);
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="font-display text-3xl">Nothing to check out yet</p>
        <Link to="/shop" className="btn-primary mt-8">Back to Shop</Link>
      </div>
    );
  }

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrs((e) => ({ ...e, [k]: '' })); };

  const submit = async (e) => {
    e.preventDefault();
    setTopErr('');
    const e2 = {};
    if (f.name.trim().length < 3) e2.name = 'Your full name';
    const phoneNorm = normalizePhone(f.phone);
    if (!phoneNorm) e2.phone = 'Incorrect number';
    if (f.address.trim().length < 6) e2.address = 'Complete street address';
    const cityVal = f.city === '__other' ? f.customCity.trim() : f.city;
    if (!cityVal) e2.city = 'Please select your city';
    if (!/^\d{5}$/.test(f.postalCode)) e2.postalCode = 'Incorrect postal code';
    else if (postalLive && postalLive.ok === false) e2.postalCode = 'Incorrect postal code';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e2.email = 'Valid email (or leave empty)';
    setErrs(e2);
    if (Object.keys(e2).length) return;

    setBusy(true);
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        token: auth?.token,
        body: {
          customerInfo: { ...f, phone: phoneNorm, city: cityVal, customCity: undefined, location: loc },
          items: cart.map((l) => ({ product: l.id, size: l.size, color: l.color, quantity: l.qty })),
          paymentMethod: method, transactionId: txn, discountCode: applied?.code || '', discreetPackaging: discreet,
        },
      });
      clearCart();
      nav(`/order/${order.orderNumber}`, { state: { order }, replace: true });
    } catch (ex) {
      const msg = ex.message || 'Could not place order — please try again';
      if (/postal/i.test(msg)) setErrs((er) => ({ ...er, postalCode: 'Incorrect postal code' }));
      if (/phone|mobile/i.test(msg)) setErrs((er) => ({ ...er, phone: 'Incorrect number' }));
      setTopErr(msg);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <h1 className="font-display text-4xl"><Tx k="checkout" /></h1>
      <p className="mt-2 text-sm text-ash">
        {auth ? `Ordering as ${auth.user.name}` : <>Guest checkout — no account needed. <Link to="/account" className="font-semibold text-obsidian underline">Sign in</Link> for faster checkout.</>}
      </p>

      {topErr && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{topErr}</div>}

      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* Contact + address */}
          <section className="card p-6 md:p-8">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-widest text-ash">Delivery details</p>
            <div className="grid gap-5 md:grid-cols-2">
              <Field k="name" label="Full name *" placeholder="e.g. Ayesha Khan" f={f} errs={errs} set={set} />
              <div>
                <label className="label">Mobile number *</label>
                <input className={`input ${errs.phone ? '!border-red-400 !ring-red-50' : ''}`}
                  value={f.phone} inputMode="tel" placeholder="03XX-XXXXXXX"
                  onChange={(e) => set('phone', e.target.value)} />
                {errs.phone ? (
                  <p className="mt-1 text-xs text-red-700">{errs.phone}</p>
                ) : (normalizePhone(f.phone) ? (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">✓ Valid mobile number — {normalizePhone(f.phone)}</p>
                ) : (f.phone.replace(/\D/g, '').length > 4 && (
                  <p className="mt-1 text-[11px] font-medium text-red-700">Incorrect number</p>
                )))}
              </div>
              <Field k="email" label="Email (optional)" placeholder="you@example.com" type="email" f={f} errs={errs} set={set} />
              <div>
                <label className="label">Province *</label>
                <select className="input" value={f.province}
                  onChange={(e) => setF((x) => ({ ...x, province: e.target.value, city: '', customCity: '' }))}>
                  {provinces.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="md:col-span-2"><Field k="address" label="Street address *" placeholder="House, street, area" f={f} errs={errs} set={set} /></div>

              {/* Pin location — rider ke liye */}
              <div className="md:col-span-2 rounded-2xl border border-line bg-satin/40 p-4">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ash">
                  <MapPin size={14} /> Pin location <span className="normal-case tracking-normal text-ash/80">(optional — helps the rider find you)</span>
                </p>
                {!loc ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr]">
                    <button type="button" onClick={useCurrentLocation} disabled={locBusy}
                      className="btn-outline flex items-center justify-center gap-2 !px-4 !py-2.5 text-xs disabled:opacity-50">
                      <Crosshair size={14} /> {locBusy ? 'Getting location…' : 'Use my current location'}
                    </button>
                    <div className="flex gap-2">
                      <input className="input flex-1 !py-2.5 text-xs" value={locLink}
                        onChange={(e) => { setLocLink(e.target.value); setLocMsg({ type: '', text: '' }); }}
                        placeholder='Or paste a Google Maps "Share" link' />
                      <button type="button" onClick={resolveLink} disabled={locBusy || !locLink.trim()}
                        className="btn-primary !px-4 !py-2.5 text-xs disabled:opacity-50">{locBusy ? '…' : 'Locate'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <iframe title="Delivery location" loading="lazy"
                      src={`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`}
                      className="h-44 w-full rounded-xl border border-line" />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-ash">📍 {loc.lat}, {loc.lng} — please confirm on the map</span>
                      <button type="button" className="font-semibold text-red-700 underline underline-offset-2"
                        onClick={() => { setLoc(null); setLocMsg({ type: '', text: '' }); }}>Remove</button>
                    </div>
                  </div>
                )}
                {locMsg.text && <p className={`mt-2 text-xs font-medium ${locMsg.type === 'err' ? 'text-red-700' : 'text-emerald-700'}`}>{locMsg.text}</p>}
              </div>
              <div>
                <label className="label">City *</label>
                {f.city === '__other' ? (
                  <div className="space-y-1.5">
                    <input className={`input ${errs.city ? '!border-red-400 !ring-red-50' : ''}`} autoFocus
                      value={f.customCity} onChange={(e) => { setF((x) => ({ ...x, customCity: e.target.value })); setErrs((er) => ({ ...er, city: '' })); }}
                      placeholder="Type your city name" />
                    <button type="button" className="text-[11px] font-semibold text-obsidian underline underline-offset-2"
                      onClick={() => setF((x) => ({ ...x, city: '', customCity: '' }))}>← Choose from list</button>
                  </div>
                ) : (
                  <select className={`input ${errs.city ? '!border-red-400 !ring-red-50' : ''}`} value={f.city}
                    disabled={citiesLoading}
                    onChange={(e) => { setF((x) => ({ ...x, city: e.target.value })); setErrs((er) => ({ ...er, city: '' })); }}>
                    <option value="">{citiesLoading ? 'Loading cities…' : 'Select your city'}</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__other">My city is not listed</option>
                  </select>
                )}
                {errs.city && <p className="mt-1 text-xs text-red-700">{errs.city}</p>}
              </div>
              <div>
                <label className="label">Postal code *</label>
                <input className={`input ${(errs.postalCode || (postalLive && !postalLive.ok)) ? '!border-red-400 !ring-red-50' : ''}`}
                  value={f.postalCode} inputMode="numeric" maxLength={5} placeholder={postalHint || '54000'}
                  onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))} />
                {/* priority: form error > live verification error > verified tick */}
                {errs.postalCode ? (
                  <p className="mt-1 text-xs text-red-700">{errs.postalCode}</p>
                ) : postalLive && !postalLive.ok ? (
                  <p className="mt-1 text-xs font-medium text-red-700">❌ Incorrect postal code</p>
                ) : postalLive?.ok && postalHint && f.postalCode === postalHint ? (
                  <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">✓ Correct for {f.city}</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="label">Order notes (optional)</label>
                <textarea className="input min-h-20 resize-none" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Rider instructions, landmarks…" />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="card p-6 md:p-8">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-widest text-ash"><Tx k="payment" /></p>
            <div className="grid gap-3 md:grid-cols-2">
              {enabled.map(({ id, icon: Icon, title, note }) => (
                <button type="button" key={id} onClick={() => setMethod(id)}
                  className={`rounded-2xl border p-4 text-left transition ${method === id ? 'border-obsidian bg-obsidian/[0.04] ring-1 ring-obsidian' : 'border-line hover:border-obsidian/40'}`}>
                  <span className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-full ${method === id ? 'bg-obsidian text-alabaster' : 'bg-satin/70 text-obsidian'}`}><Icon size={16} /></span>
                    <span><b className="block text-sm">{title}</b><span className="text-xs text-ash">{note}</span></span>
                  </span>
                </button>
              ))}
            </div>

            {method !== 'COD' && (
              <div className="mt-5 rounded-2xl bg-satin/40 p-5">
                {method === 'Bank Transfer' && <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ash">{pmCfg.bankDetails}</pre>}
                <label className="label mt-2">Transaction ID / reference (optional)</label>
                <input className="input" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="e.g. 0392XXXXX or bank reference" />
                <p className="mt-2 text-xs text-ash">Payment stays <b>Pending</b> until our team verifies it — then your order ships.</p>
              </div>
            )}

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
              <input type="checkbox" checked={discreet} onChange={(e) => setDiscreet(e.target.checked)} className="mt-1 h-4 w-4 accent-[#0D0D0D]" />
              <span className="flex items-start gap-3">
                <PackageCheck size={18} className="mt-0.5 shrink-0 text-obsidian" />
                <span><b className="block text-sm">Discreet packaging</b>
                  <span className="text-xs leading-relaxed text-ash">Plain, unmarked parcel. No brand name, no product details on the outside. Recommended — and it is on us.</span></span>
              </span>
            </label>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Your order</p>
            <div className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
              {cart.map((l) => (
                <div key={`${l.id}-${l.size}`} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Img src={l.image} alt="" className="h-14 w-11 rounded-lg object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-obsidian px-1 text-[9px] font-bold text-alabaster" style={{ height: 18, minWidth: 18 }}>{l.qty}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="clamp-2 text-xs font-medium leading-snug">{l.name}</p>
                    <p className="text-[11px] text-ash">{l.size}{l.color ? ` · ${l.color}` : ''}</p>
                  </div>
                  <p className="text-xs font-semibold">{pkr(l.price * l.qty)}</p>
                </div>
              ))}
            </div>
            {/* Promo code */}
            <div className="mt-5 border-t border-line pt-4">
              {applied ? (
                <div className="flex items-center justify-between rounded-xl bg-sage/20 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-sagedeep"><BadgePercent size={15} /> {applied.code}</span>
                  <button type="button" onClick={() => { setApplied(null); setCode(''); }} className="flex items-center gap-1 text-xs text-sagedeep hover:underline"><X size={12} /> <Tx k="remove" /></button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input className="input flex-1 uppercase" placeholder={t('promoPlaceholder')} value={code}
                      onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } }} />
                    <button type="button" onClick={applyCode} disabled={applying || !code.trim()} className="btn-outline whitespace-nowrap">{applying ? '…' : <Tx k="apply" />}</button>
                  </div>
                  {codeErr && <p className="mt-1.5 text-xs text-red-700">{codeErr}</p>}
                </div>
              )}
            </div>
            <div className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><span className="text-ash"><Tx k="subtotal" /></span><span>{pkr(cartSubtotal)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between font-medium text-sagedeep"><span><Tx k="discount" /> ({applied.code})</span><span>− {pkr(discountAmt)}</span></div>}
              <div className="flex justify-between"><span className="text-ash"><Tx k="shipping" /></span><span className={shipping === 0 ? 'text-sagedeep' : ''}>{shipping === 0 ? 'Free' : pkr(shipping)}</span></div>
              <div className="flex justify-between border-t border-line pt-3"><b>Total</b><span className="font-display text-2xl">{pkr(grandTotal)}</span></div>
            </div>
            <button disabled={busy} className="btn-primary mt-5 w-full">
              {busy ? 'Placing order…' : <><Lock size={14} /> <Tx k="placeOrder" /></>}
            </button>
            <p className="mt-3 text-center text-[11px] text-ash">By ordering you agree to our 14-day exchange policy.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
