import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Ban, Building2, ChevronRight, CreditCard, Eye, EyeOff, FileText,
  Landmark, Lock, MapPin, Package, Palette, Phone, Save, ShieldCheck,
  Smartphone, Sparkles, Store, Truck,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * SETTINGS SUB-PAGES — one file, one export per screen.
 * Each page loads /settings, edits a slice, and PUTs back.
 * ========================================================================== */

/* --- shared helpers --- */
function BackToSettings() {
  return (
    <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
      <ArrowLeft size={13} /> Settings
    </Link>
  );
}

function PageIntro({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="font-sans text-2xl leading-tight text-neutral-900">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SaveBar({ dirty, busy, onSave, onReset }) {
  if (!dirty) return null;
  return (
    <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
      <p className="text-[13px] font-medium">Unsaved changes</p>
      <div className="flex items-center gap-2">
        <button onClick={onReset} className="rounded-lg border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
        <button onClick={onSave} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-60">
          <Save size={12} /> {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-neutral-300">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[12px] text-neutral-500">{description}</p>}
      </div>
      <span onClick={(e) => { e.preventDefault(); onChange(!checked); }} className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </label>
  );
}

/* --- hook: load settings, track dirty, save --- */
function useSettingsSlice() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/settings/admin', { token: auth.token }).then((d) => { setS(d.settings); setOriginal(JSON.stringify(d.settings)); }).catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  const dirty = s && original && JSON.stringify(s) !== original;
  const reset = () => { if (original) setS(JSON.parse(original)); };

  const save = async (fieldsToSend) => {
    setBusy(true);
    try {
      const body = {};
      for (const f of fieldsToSend) if (s[f] !== undefined) body[f] = s[f];
      await api('/settings', { method: 'PUT', token: auth.token, body });
      setOriginal(JSON.stringify(s));
      toast('Saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return { s, setS, dirty, reset, save, busy, auth, toast };
}

/* ==========================================================================
 * STORE DETAILS
 * ======================================================================== */
export function SettingsStore() {
  const { s, setS, dirty, reset, save, busy } = useSettingsSlice();
  if (!s) return <AdminLayout title="Store details"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const set = (k, v) => setS({ ...s, [k]: v });
  const setBadge = (i, k, v) => setS({ ...s, trustBadges: (s.trustBadges || []).map((b, j) => j === i ? { ...b, [k]: v } : b) });

  return (
    <AdminLayout title="Store details">
      <BackToSettings />
      <PageIntro icon={Store} title="Store details" description="Your public identity — the name, tagline, and contact info that customers see across the site and emails." />

      <div className="space-y-5">
        <Section title="Identity" description="These appear in the header, footer, and every automated email.">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Store name</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={s.storeName || ''} onChange={(e) => set('storeName', e.target.value)} /></div>
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Tagline</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={s.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></div>
          </div>
        </Section>

        <Section title="Contact" description="Shown in the footer, order confirmations, and used by customers to reach you.">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Contact email</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="email" value={s.contactEmail || ''} onChange={(e) => set('contactEmail', e.target.value)} placeholder="care@yourstore.com" /></div>
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Contact phone</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={s.contactPhone || ''} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+92 300 1234567" /></div>
          </div>
        </Section>

        <Section title="Trust badges" description="Short credibility statements shown below the hero (delivery, quality, packaging).">
          <div className="space-y-3">
            {(s.trustBadges || []).map((b, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[220px_1fr]">
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !py-2 !text-[12px] font-semibold" value={b.title || ''} onChange={(e) => setBadge(i, 'title', e.target.value)} placeholder="Badge title" />
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !py-2 !text-[12px]" value={b.text || ''} onChange={(e) => setBadge(i, 'text', e.target.value)} placeholder="Short supporting text" />
              </div>
            ))}
          </div>
        </Section>
      </div>

      <SaveBar dirty={dirty} busy={busy} onSave={() => save(['storeName', 'tagline', 'contactEmail', 'contactPhone', 'trustBadges'])} onReset={reset} />
    </AdminLayout>
  );
}

/* ==========================================================================
 * PAYMENTS
 * ======================================================================== */
export function SettingsPayments() {
  const { s, setS, dirty, reset, save, busy } = useSettingsSlice();
  if (!s) return <AdminLayout title="Payments"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const pm = s.paymentMethods || {};
  const setPM = (k, v) => setS({ ...s, paymentMethods: { ...pm, [k]: v } });

  /* ── Online card gateways ────────────────────────────────────────────────
     Credentials live in s.integrations.payments.{safepay,jazzcash}. The Visa
     entry in s.checkout.paymentList is what makes the option appear at
     checkout, so enabling a gateway also flips that entry on. */
  const ints = s.integrations || {};
  const gw = ints.payments || {};
  const sp = gw.safepay || {};
  const jz = gw.jazzcash || {};
  const setGW = (id, patch) => setS({ ...s, integrations: { ...ints, payments: { ...gw, [id]: { ...(gw[id] || {}), ...patch } } } });
  const setSP = (k, v) => setGW('safepay', { [k]: v });
  const setJZ = (k, v) => setGW('jazzcash', { [k]: v });

  const spConfigured = !!(sp.apiKey && sp.secret);
  const jzConfigured = !!(jz.merchantId && jz.password && jz.integritySalt);

  /* The Visa row in paymentList. Defaults to comingSoon=true so it never
     shows until a gateway is actually configured. */
  const list = (s.checkout && s.checkout.paymentList) || [];
  const visaRow = list.find((m) => m.id === 'Visa');
  const gatewayOn = (which) => {
    if (which === 'safepay') return visaRow?.enabled && spConfigured;
    if (which === 'jazzcash-api') return visaRow?.enabled && jzConfigured;
    return false;
  };
  const setGatewayEnabled = (which, on) => {
    const id = which === 'safepay' ? 'Visa' : 'Visa'; // both light up the card option
    const nextList = list.some((m) => m.id === 'Visa')
      ? list.map((m) => (m.id === 'Visa' ? { ...m, enabled: on && (which === 'safepay' ? spConfigured : jzConfigured), comingSoon: false } : m))
      : [...list, { id: 'Visa', label: 'Visa / Mastercard', note: 'Pay online with your card', icon: 'CreditCard', enabled: on && (which === 'safepay' ? spConfigured : jzConfigured), needsTxn: false, instructions: '', comingSoon: false }];
    setS({ ...s, checkout: { ...(s.checkout || {}), paymentList: nextList } });
  };

  return (
    <AdminLayout title="Payments">
      <BackToSettings />
      <PageIntro icon={CreditCard} title="Payments" description="Enable payment methods and add your account details. Customers see only the methods you enable." />

      <div className="space-y-5">
        <Section title="Cash on Delivery" description="Standard for Pakistan — customer pays cash to the courier at delivery.">
          <Toggle
            label="Enable Cash on Delivery"
            description="Recommended — 60–70% of Pakistani e-commerce is COD."
            checked={!!pm.cod}
            onChange={(v) => setPM('cod', v)}
          />
        </Section>

        <Section title="Mobile wallets" description="Customer transfers money to your account, then enters the transaction ID at checkout.">
          <div className="space-y-3">
            <Toggle
              label="JazzCash"
              description="Enable this to accept JazzCash mobile transfers."
              checked={!!pm.jazzcash}
              onChange={(v) => setPM('jazzcash', v)}
            />
            {pm.jazzcash && (
              <div className="ml-4 grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-2">
                <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">JazzCash number</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono" value={pm.jazzcashNumber || ''} onChange={(e) => setPM('jazzcashNumber', e.target.value)} placeholder="0300 1234567" /></div>
                <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Account title</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={pm.jazzcashTitle || ''} onChange={(e) => setPM('jazzcashTitle', e.target.value)} placeholder="Your Name" /></div>
              </div>
            )}

            <Toggle
              label="EasyPaisa"
              description="Enable this to accept EasyPaisa mobile transfers."
              checked={!!pm.easypaisa}
              onChange={(v) => setPM('easypaisa', v)}
            />
            {pm.easypaisa && (
              <div className="ml-4 grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-2">
                <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">EasyPaisa number</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono" value={pm.easypaisaNumber || ''} onChange={(e) => setPM('easypaisaNumber', e.target.value)} placeholder="0345 1234567" /></div>
                <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Account title</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={pm.easypaisaTitle || ''} onChange={(e) => setPM('easypaisaTitle', e.target.value)} placeholder="Your Name" /></div>
              </div>
            )}
          </div>
        </Section>

        <Section title="Bank transfer" description="For customers who prefer a direct bank transfer.">
          <Toggle
            label="Enable Bank Transfer"
            checked={!!pm.bank}
            onChange={(v) => setPM('bank', v)}
          />
          {pm.bank && (
            <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Bank details (shown to customers at checkout)</label>
              <textarea className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-28 font-mono text-[12px]" value={pm.bankDetails || ''} onChange={(e) => setPM('bankDetails', e.target.value)} placeholder={'Bank: Meezan Bank\nTitle: Your Business Name\nIBAN: PK00 MEZN 0000 0000 0000 0000'} />
              <p className="mt-2 text-[12px] text-neutral-500">Multi-line supported. Include bank name, account title, and IBAN.</p>
            </div>
          )}
        </Section>

        <Section title="Online card gateway" description="Accept Visa / Mastercard payments online. Enter your provider keys — sandbox first, switch to live when you are ready to launch. Customers see cards at checkout only once a gateway is configured and enabled.">
          {/* SafePay */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-neutral-800">SafePay <span className="ml-1 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">Visa · Mastercard</span></p>
                <p className="mt-0.5 text-[12px] text-neutral-500">The leading Pakistani card gateway. Apply at getsafepay.com (needs STRN + bank account).</p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-semibold text-neutral-700">
                <span>{gatewayOn('safepay') ? 'Enabled' : 'Disabled'}</span>
                <input type="checkbox" className="sr-only" checked={gatewayOn('safepay')} onChange={(e) => setGatewayEnabled('safepay', e.target.checked)} />
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${gatewayOn('safepay') ? 'bg-[#4A6B58]' : 'bg-neutral-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${gatewayOn('safepay') ? 'translate-x-4.5 ml-1' : 'ml-0.5'}`} />
                </span>
              </label>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${sp.sandbox ? 'bg-[#F6F1E6] text-[#7A6239]' : 'bg-[#E9EFEA] text-[#3E5C4B]'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sp.sandbox ? 'bg-[#C9A96E]' : 'bg-[#5B7F6A]'}`} />
                {sp.sandbox ? 'Sandbox (test mode)' : 'Live'}
              </span>
              <button type="button" onClick={() => setSP('sandbox', !sp.sandbox)} className="text-[12px] font-semibold text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline">
                Switch to {sp.sandbox ? 'live' : 'sandbox'}
              </button>
            </div>

            {sp.sandbox && (
              <p className="mt-2 rounded-lg bg-[#F6F1E6] px-3 py-2 text-[12px] text-[#6B552F]">
                Test mode — no real money moves. Paste your sandbox keys from the SafePay dashboard to try the flow end-to-end.
              </p>
            )}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">API key (client)</label>
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-mono text-[12px] outline-none transition focus:border-neutral-900" value={sp.apiKey || ''} onChange={(e) => setSP('apiKey', e.target.value)} placeholder="SF-XXXX-…" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">Secret key</label>
                <input type="password" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-mono text-[12px] outline-none transition focus:border-neutral-900" value={sp.secret || ''} onChange={(e) => setSP('secret', e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <p className="mt-2 text-[12px] text-neutral-500">
              {spConfigured ? 'Gateway is configured — cards will appear at checkout.' : 'Fill both keys to enable cards at checkout.'}
            </p>
          </div>

          {/* JazzCash Merchant API */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-neutral-800">JazzCash Merchant API <span className="ml-1 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">JazzCash · Cards</span></p>
                <p className="mt-0.5 text-[12px] text-neutral-500">Full merchant checkout (hosted payment page). Register at payments.jazzcash.com.pk.</p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-semibold text-neutral-700">
                <span>{gatewayOn('jazzcash-api') ? 'Enabled' : 'Disabled'}</span>
                <input type="checkbox" className="sr-only" checked={gatewayOn('jazzcash-api')} onChange={(e) => setGatewayEnabled('jazzcash-api', e.target.checked)} />
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${gatewayOn('jazzcash-api') ? 'bg-[#4A6B58]' : 'bg-neutral-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${gatewayOn('jazzcash-api') ? 'translate-x-4.5 ml-1' : 'ml-0.5'}`} />
                </span>
              </label>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${jz.sandbox ? 'bg-[#F6F1E6] text-[#7A6239]' : 'bg-[#E9EFEA] text-[#3E5C4B]'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${jz.sandbox ? 'bg-[#C9A96E]' : 'bg-[#5B7F6A]'}`} />
                {jz.sandbox ? 'Sandbox (test mode)' : 'Live'}
              </span>
              <button type="button" onClick={() => setJZ('sandbox', !jz.sandbox)} className="text-[12px] font-semibold text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline">
                Switch to {jz.sandbox ? 'live' : 'sandbox'}
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">Merchant ID</label>
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-mono text-[12px] outline-none transition focus:border-neutral-900" value={jz.merchantId || ''} onChange={(e) => setJZ('merchantId', e.target.value)} placeholder="MC-…" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">Password</label>
                <input type="password" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-mono text-[12px] outline-none transition focus:border-neutral-900" value={jz.password || ''} onChange={(e) => setJZ('password', e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">Integrity salt</label>
                <input type="password" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-mono text-[12px] outline-none transition focus:border-neutral-900" value={jz.integritySalt || ''} onChange={(e) => setJZ('integritySalt', e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <p className="mt-2 text-[12px] text-neutral-500">
              {jzConfigured ? 'Gateway is configured — JazzCash checkout will be offered.' : 'Fill merchant ID, password and integrity salt to enable.'}
            </p>
          </div>

          <p className="text-[12px] text-neutral-400">
            ⚠️ Credentials are encrypted at rest and never shown to shoppers. Use sandbox keys until launch day — then flip to live.
          </p>
        </Section>
      </div>

      <SaveBar dirty={dirty} busy={busy} onSave={() => save(['paymentMethods', 'integrations', 'checkout'])} onReset={reset} />
    </AdminLayout>
  );
}

/* ==========================================================================
 * SHIPPING
 * ======================================================================== */
export function SettingsShipping() {
  const { s, setS, dirty, reset, save, busy } = useSettingsSlice();
  if (!s) return <AdminLayout title="Shipping"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const set = (k, v) => setS({ ...s, [k]: v });
  const oc = s.operatingCosts || {};
  const setOC = (k, v) => setS({ ...s, operatingCosts: { ...oc, [k]: Number(v) || 0 } });

  return (
    <AdminLayout title="Shipping & Operating Costs">
      <BackToSettings />
      <PageIntro icon={Truck} title="Shipping & Operating Costs" description="Set delivery rates and the true costs of running your store — used by the Dashboard to compute real profit." />

      <div className="space-y-5">
        <Section title="Shipping rates" description="Flat rate applies to every order below the free-shipping threshold.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Flat rate (PKR)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.shippingFlatRate ?? 350} onChange={(e) => set('shippingFlatRate', Number(e.target.value))} />
              <p className="mt-1.5 text-[12px] text-neutral-500">Standard for Pakistan: PKR 200–400 nationwide.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Free shipping over (PKR)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.freeShippingThreshold ?? 4999} onChange={(e) => set('freeShippingThreshold', Number(e.target.value))} />
              <p className="mt-1.5 text-[12px] text-neutral-500">Encourages larger baskets. Set to 0 to disable.</p>
            </div>
          </div>
        </Section>

        <Section title="Per-order operating costs" description="These are subtracted from your gross profit — set them for accurate P&L.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Packing materials (PKR / order)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={oc.packingPerOrder || 0} onChange={(e) => setOC('packingPerOrder', e.target.value)} placeholder="e.g. 40" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Boxes, tape, tissue paper, thank-you cards.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Courier subsidy (PKR / order)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={oc.shippingSubsidy || 0} onChange={(e) => setOC('shippingSubsidy', e.target.value)} placeholder="e.g. 50" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Difference between what courier charges you and what you charged the customer.</p>
            </div>
          </div>
        </Section>

        <Section title="Courier cost per parcel" description="What the courier bills you. Used by Finance → Order profitability to work out what you keep on each order.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Default courier cost (PKR / parcel)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={oc.defaultCourierCost || 0} onChange={(e) => setOC('defaultCourierCost', e.target.value)} placeholder="e.g. 250" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Applies to every city unless overridden below.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Return costs this many times the outbound leg</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="1" step="0.5" value={oc.returnCourierMultiplier ?? 2} onChange={(e) => setOC('returnCourierMultiplier', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">A returned parcel is usually billed both ways — that is 2.</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Per-city rates (optional)</label>
            <div className="mt-1.5 space-y-2">
              {(oc.courierByCity || []).map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 flex-1" placeholder="City, e.g. Karachi" value={row.city || ''}
                    onChange={(e) => setS({ ...s, operatingCosts: { ...oc, courierByCity: oc.courierByCity.map((r, j) => (j === i ? { ...r, city: e.target.value } : r)) } })}
                  />
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 w-32" type="number" min="0" placeholder="PKR" value={row.cost ?? ''}
                    onChange={(e) => setS({ ...s, operatingCosts: { ...oc, courierByCity: oc.courierByCity.map((r, j) => (j === i ? { ...r, cost: Number(e.target.value) || 0 } : r)) } })}
                  />
                  <button
                    onClick={() => setS({ ...s, operatingCosts: { ...oc, courierByCity: oc.courierByCity.filter((_, j) => j !== i) } })}
                    className="shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold text-neutral-500 hover:bg-[#F5EDEB] hover:text-[#9A5548]"
                  >Remove</button>
                </div>
              ))}
              <button
                onClick={() => setS({ ...s, operatingCosts: { ...oc, courierByCity: [...(oc.courierByCity || []), { city: '', cost: 0 }] } })}
                className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-[13px] font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
              >+ Add a city rate</button>
            </div>
          </div>
        </Section>

        <Section title="Payment gateway fees" description="The percentage each method keeps. COD is normally 0 — you collect the cash yourself.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['cod', 'COD (%)', '0'],
              ['jazzcash', 'JazzCash (%)', '2'],
              ['easypaisa', 'EasyPaisa (%)', '2'],
              ['bank', 'Bank transfer (%)', '0'],
              ['card', 'Card / Visa (%)', '2.75'],
            ].map(([key, label, ph]) => (
              <div key={key}>
                <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" step="0.05" placeholder={ph}
                  value={(oc.paymentFees || {})[key] ?? ''}
                  onChange={(e) => setS({ ...s, operatingCosts: { ...oc, paymentFees: { ...(oc.paymentFees || {}), [key]: Number(e.target.value) || 0 } } })}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Targets & thresholds" description="Drive the dashboard goal tracker and the profitability warnings.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Monthly revenue goal (PKR)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.monthlyRevenueGoal || 0} onChange={(e) => set('monthlyRevenueGoal', Number(e.target.value) || 0)} placeholder="e.g. 500000" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Shown as a progress bar with a pace read on the Dashboard.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Minimum acceptable margin (%)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" max="100" value={s.marginThresholdPercent ?? 15} onChange={(e) => set('marginThresholdPercent', Number(e.target.value) || 0)} placeholder="e.g. 15" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Orders below this are flagged amber in Finance → Order profitability.</p>
            </div>
          </div>
        </Section>

        <Section title="Monthly marketing & fixed costs" description="Fixed costs you pay every month — divided across all monthly orders in the P&L view.">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Ads (PKR / month)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={oc.monthlyMarketing || 0} onChange={(e) => setOC('monthlyMarketing', e.target.value)} placeholder="e.g. 25000" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Meta, Google, TikTok spend.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">SEO / Content (PKR / month)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={oc.monthlySeo || 0} onChange={(e) => setOC('monthlySeo', e.target.value)} placeholder="e.g. 10000" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Blog writing, agency retainer, backlinks.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Other fixed (PKR / month)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={oc.monthlyOther || 0} onChange={(e) => setOC('monthlyOther', e.target.value)} placeholder="e.g. 5000" />
              <p className="mt-1.5 text-[12px] text-neutral-500">Hosting, tools, subscriptions.</p>
            </div>
          </div>
        </Section>

        <Section title="Live preview" description="This is exactly what customers see at checkout.">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-neutral-500">Shipping</span>
              <span className="font-semibold">Flat PKR {(s.shippingFlatRate ?? 350).toLocaleString()}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[13px]">
              <span className="text-neutral-500">Free over</span>
              <span className="font-semibold">PKR {(s.freeShippingThreshold ?? 4999).toLocaleString()}</span>
            </div>
          </div>
        </Section>
      </div>

      <SaveBar dirty={dirty} busy={busy} onSave={() => save(['shippingFlatRate', 'freeShippingThreshold', 'operatingCosts', 'monthlyRevenueGoal', 'marginThresholdPercent'])} onReset={reset} />
    </AdminLayout>
  );
}

/* ==========================================================================
 * SECURITY (password + admin theme)
 * ======================================================================== */
export function SettingsSecurity() {
  const { auth, setAuth, toast } = useApp();

  // Password change state
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ c: false, n: false, x: false });
  const [busy, setBusy] = useState(false);

  // Username change state (separate form)
  const [uCurrent, setUCurrent] = useState('');
  const [uNew, setUNew] = useState('');
  const [uShow, setUShow] = useState(false);
  const [uBusy, setUBusy] = useState(false);

  const strength = (() => {
    if (!next) return { label: '', color: 'transparent', pct: 0 };
    let score = 0;
    if (next.length >= 8) score++;
    if (next.length >= 12) score++;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) score++;
    if (/[0-9]/.test(next)) score++;
    if (/[^A-Za-z0-9]/.test(next)) score++;
    const map = [
      { label: 'Very weak', color: '#9A5548', pct: 20 },
      { label: 'Weak',      color: '#A68A56', pct: 40 },
      { label: 'Fair',      color: '#ca8a04', pct: 60 },
      { label: 'Good',      color: '#65a30d', pct: 80 },
      { label: 'Strong',    color: '#16a34a', pct: 100 },
    ];
    return map[Math.min(score, 4)] || map[0];
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (!current || !next) return toast('Fill both current and new password');
    if (next.length < 8) return toast('New password must be at least 8 characters');
    if (!/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) return toast('Include letters and numbers');
    if (next !== confirm) return toast('Passwords do not match');
    if (next === current) return toast('New password must be different');
    setBusy(true);
    try {
      const res = await api('/auth/change-password', { method: 'POST', token: auth.token, body: { currentPassword: current, newPassword: next } });
      if (res?.token && setAuth) setAuth({ token: res.token, user: res.user });
      toast('Password changed — other devices signed out');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (ex) { toast(ex?.message || 'Failed'); }
    setBusy(false);
  };

  const submitUsername = async (e) => {
    e.preventDefault();
    if (!uCurrent || !uNew) return toast('Enter current password and new username');
    if (uNew.trim().toLowerCase() === (auth?.user?.email || '').toLowerCase()) return toast('That is already your current username');
    setUBusy(true);
    try {
      const res = await api('/auth/change-username', { method: 'POST', token: auth.token, body: { currentPassword: uCurrent, newUsername: uNew.trim() } });
      if (res?.token && setAuth) setAuth({ token: res.token, user: res.user });
      toast('Username changed — other devices signed out');
      setUCurrent(''); setUNew('');
    } catch (ex) { toast(ex?.message || 'Failed'); }
    setUBusy(false);
  };

  const eyeBtn = (which) => (
    <button type="button" onClick={() => setShow((s) => ({ ...s, [which]: !s[which] }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 hover:text-neutral-900" aria-label="Toggle visibility">
      {show[which] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <AdminLayout title="Security & Access">
      <BackToSettings />
      <PageIntro icon={ShieldCheck} title="Security & Access" description="Protect your store — change your admin password and choose how the admin panel looks on this device." />

      <div className="space-y-5">
        <Section title="Change username" description="Your login identifier. Any signed-in device will be signed out after you change it.">
          <form onSubmit={submitUsername} className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[12px] text-neutral-600">
              <span className="font-semibold text-neutral-500">Current username: </span>
              <span className="font-mono text-neutral-900">{auth?.user?.email || '—'}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">New username</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                  value={uNew}
                  onChange={(e) => setUNew(e.target.value)}
                  placeholder="e.g. hushae_admin or you@hushae.pk"
                  autoComplete="off"
                />
                <p className="mt-1.5 text-[12px] text-neutral-500">Letters, numbers, dot, underscore or dash. Or use a valid email.</p>
              </div>
              <div className="relative">
                <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Confirm with current password</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 pr-10"
                  type={uShow ? 'text' : 'password'}
                  value={uCurrent}
                  onChange={(e) => setUCurrent(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setUShow((v) => !v)} className="absolute right-2.5 top-[42px] rounded-full p-1.5 text-neutral-400 hover:text-neutral-900" aria-label="Toggle visibility">
                  {uShow ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <p className="text-[12px] text-neutral-500">After changing, you will be signed out from every other browser and device.</p>
            <button
              type="submit"
              disabled={uBusy || !uCurrent || !uNew || uNew.trim().toLowerCase() === (auth?.user?.email || '').toLowerCase()}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-6 py-2.5 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
            >
              <Lock size={13} /> {uBusy ? 'Updating…' : 'Update username'}
            </button>
          </form>
        </Section>

        <Section title="Change password" description="A strong password uses at least 12 characters with upper- and lower-case letters, numbers, and a symbol.">
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Current password</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 pr-10" type={show.c ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
              {eyeBtn('c')}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">New password</label>
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 pr-10" type={show.n ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="Min 8 characters, letters + numbers" />
                {eyeBtn('n')}
                {next && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                      <div className="h-full transition-all" style={{ width: `${strength.pct}%`, background: strength.color }} />
                    </div>
                    <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Confirm new password</label>
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 pr-10" type={show.x ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                {eyeBtn('x')}
                {confirm && next && confirm !== next && <p className="mt-1 text-[12px] font-semibold text-[#9A5548]">Passwords do not match</p>}
              </div>
            </div>
            <p className="text-[12px] text-neutral-500">After changing, you will be signed out from other devices.</p>
            <button type="submit" disabled={busy || !current || !next || next !== confirm} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-6 py-2.5 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40">
              <Lock size={13} /> {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </Section>
      </div>
    </AdminLayout>
  );
}

/* ==========================================================================
 * LEGAL & POLICIES (placeholder)
 * ======================================================================== */
export function SettingsLegal() {
  return (
    <AdminLayout title="Legal & Policies">
      <BackToSettings />
      <PageIntro icon={FileText} title="Legal & Policies" description="Terms of service, privacy policy, refund policy, and cookie consent text — coming in a future update." />

      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
          <Sparkles size={20} />
        </span>
        <p className="mt-4 text-[12px] font-semibold text-neutral-900">Coming soon</p>
        <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-neutral-500">
          A dedicated editor for your Terms of Service, Privacy Policy, Refund Policy, and Cookie
          Consent text — with autosave and public pages published automatically.
        </p>
      </div>
    </AdminLayout>
  );
}
