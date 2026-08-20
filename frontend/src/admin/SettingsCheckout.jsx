import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Save, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { Toggle } from './ui/Controls';
import { CHECKOUT_DEFAULTS } from '../lib/checkoutConfig';
import { TRUST_ICON_NAMES } from '../pages/cart/TrustRow';
import { METHOD_ICON_NAMES } from '../pages/checkout/MethodPicker';

/* ============================================================================
 * ADMIN → SETTINGS → CHECKOUT
 *
 * Writes exactly one top-level field: `checkout`.
 *
 * Payment and shipping are edited as LISTS, so the merchant can switch a
 * provider on, rename it, change its instructions or reorder it without a
 * developer. Adding a brand-new provider later is a row in this table plus a
 * value in the Order.paymentMethod enum — no component changes.
 * ========================================================================== */

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


function Text({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="mt-1.5 text-[12px] text-neutral-500">{hint}</p>}
    </div>
  );
}

export default function SettingsCheckout() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, checkout: { ...CHECKOUT_DEFAULTS, ...(d.settings.checkout || {}) } };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Checkout"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const c = s.checkout;
  const set = (k, v) => setS({ ...s, checkout: { ...s.checkout, [k]: v } });
  const setRow = (list, i, k, v) => set(list, c[list].map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const dirty = original && JSON.stringify(s) !== original;

  const save = async () => {
    setBusy(true);
    try {
      // Stamp the migration flag: from now on this list is the merchant's
      // own, and the legacy paymentMethods booleans stop overriding it.
      const payload = { ...s.checkout, checkoutMigrated: true };
      await api('/settings', { method: 'PUT', token: auth.token, body: { checkout: payload } });
      setS((x) => ({ ...x, checkout: payload }));
      setOriginal(JSON.stringify({ ...s, checkout: { ...s.checkout, checkoutMigrated: true } }));
      toast('Checkout saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Checkout">
      <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
          <CreditCard size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-2xl leading-tight text-neutral-900">Checkout</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            Payment methods, delivery options, wording and the thank-you page. Changes go live the moment you save.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ---------------- Wording ---------------- */}
        <Section title="Wording">
          <div className="space-y-4">
            <Text label="Page title" value={c.title} onChange={(v) => set('title', v)} />
            <Text label="Subtitle" value={c.subtitle} onChange={(v) => set('subtitle', v)} hint="The reassurance line under the heading." />
          </div>
        </Section>

        {/* ---------------- Payment ---------------- */}
        <Section title="Payment methods" description="Switch a method on to offer it. Turn everything off and customers cannot order — so keep at least one on.">
          <div className="space-y-3">
            {(c.paymentList || []).map((m, i) => (
              <div key={m.id || i} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button" role="switch" aria-checked={!!m.enabled} aria-label={`Enable ${m.label || m.id}`}
                    onClick={() => setRow('paymentList', i, 'enabled', !m.enabled)}
                    /* MEASURED: these pills are 36x20 and, unlike the <Toggle>
                       rows, have no <label> wrapper to enlarge the hit area —
                       8 of the 18 switches on this page were 20px tall. The
                       padding keeps the pill looking identical while making
                       the actual target 44px. */
                    className={`relative -my-3 box-content h-5 w-9 shrink-0 rounded-full bg-clip-content py-3 transition ${m.enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                  >
                    <span className={`absolute top-3.5 h-4 w-4 rounded-full bg-white shadow transition-all ${m.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 flex-1 min-w-[140px]" value={m.label} placeholder="Shown to customers"
                    onChange={(e) => setRow('paymentList', i, 'label', e.target.value)}
                    aria-label={`Label for ${m.id}`}
                  />
                  <select
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 w-36 shrink-0" value={m.icon}
                    onChange={(e) => setRow('paymentList', i, 'icon', e.target.value)}
                    aria-label={`Icon for ${m.id}`}
                  >
                    {METHOD_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button
                    type="button" onClick={() => set('paymentList', c.paymentList.filter((_, j) => j !== i))}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-[#F5EDEB] hover:text-[#9A5548]"
                    aria-label={`Remove ${m.label || m.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={m.note} placeholder="Short note, e.g. Pay the rider at your door"
                    onChange={(e) => setRow('paymentList', i, 'note', e.target.value)}
                    aria-label={`Note for ${m.id}`}
                  />
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={m.id} placeholder="Internal id"
                    onChange={(e) => setRow('paymentList', i, 'id', e.target.value)}
                    aria-label={`Internal id for ${m.label || 'method'}`}
                  />
                </div>
                <textarea
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 mt-3 min-h-[64px]" value={m.instructions || ''}
                  placeholder="Instructions shown when the customer picks this (account number, steps…)"
                  onChange={(e) => setRow('paymentList', i, 'instructions', e.target.value)}
                  aria-label={`Instructions for ${m.id}`}
                />
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-[12px] text-neutral-700">
                    <input type="checkbox" checked={!!m.needsTxn} onChange={(e) => setRow('paymentList', i, 'needsTxn', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
                    Ask for a transaction reference
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-neutral-700">
                    <input type="checkbox" checked={!!m.comingSoon} onChange={(e) => setRow('paymentList', i, 'comingSoon', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
                    Show as “coming soon” (cannot be selected)
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('paymentList', [...(c.paymentList || []), { id: '', label: '', note: '', icon: 'CreditCard', enabled: false, needsTxn: false, instructions: '', comingSoon: true }])}
              className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              + Add a payment method
            </button>
            <p className="text-[12px] leading-relaxed text-neutral-500">
              To add a brand-new provider (Stripe, PayPal, Apple Pay), add a row here and leave “coming soon” ticked until the provider is connected.
            </p>
          </div>
        </Section>

        {/* ---------------- Shipping ---------------- */}
        <Section title="Delivery methods" description="What the customer can choose. Rate 0 uses your normal flat delivery charge from Settings → Shipping.">
          <div className="space-y-3">
            {(c.shippingMethods || []).map((m, i) => (
              <div key={m.id || i} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button" role="switch" aria-checked={!!m.enabled} aria-label={`Enable ${m.label || m.id}`}
                    onClick={() => setRow('shippingMethods', i, 'enabled', !m.enabled)}
                    /* MEASURED: these pills are 36x20 and, unlike the <Toggle>
                       rows, have no <label> wrapper to enlarge the hit area —
                       8 of the 18 switches on this page were 20px tall. The
                       padding keeps the pill looking identical while making
                       the actual target 44px. */
                    className={`relative -my-3 box-content h-5 w-9 shrink-0 rounded-full bg-clip-content py-3 transition ${m.enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                  >
                    <span className={`absolute top-3.5 h-4 w-4 rounded-full bg-white shadow transition-all ${m.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 min-w-[140px] flex-1" value={m.label}
                    onChange={(e) => setRow('shippingMethods', i, 'label', e.target.value)}
                    aria-label={`Label for ${m.id}`}
                  />
                  <button
                    type="button" onClick={() => set('shippingMethods', c.shippingMethods.filter((_, j) => j !== i))}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-[#F5EDEB] hover:text-[#9A5548]"
                    aria-label={`Remove ${m.label || m.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-4">
                    <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={m.note} placeholder="Short note" onChange={(e) => setRow('shippingMethods', i, 'note', e.target.value)} aria-label={`Note for ${m.id}`} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Charge (PKR)</label>
                    <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={m.rate} onChange={(e) => setRow('shippingMethods', i, 'rate', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Fastest (days)</label>
                    <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={m.minDays} onChange={(e) => setRow('shippingMethods', i, 'minDays', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Slowest (days)</label>
                    <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={m.maxDays} onChange={(e) => setRow('shippingMethods', i, 'maxDays', Number(e.target.value))} />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-[12px] text-neutral-700">
                      <input type="checkbox" checked={m.freeEligible !== false} onChange={(e) => setRow('shippingMethods', i, 'freeEligible', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
                      Free-shipping applies
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('shippingMethods', [...(c.shippingMethods || []), { id: '', label: '', note: '', rate: 0, minDays: 2, maxDays: 5, enabled: false, freeEligible: true }])}
              className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              + Add a delivery method
            </button>
          </div>
        </Section>

        {/* ---------------- Who may check out ---------------- */}
        <Section title="Who can check out">
          <div className="space-y-3">
            <Toggle label="Allow guest checkout" description="Customers can order without making an account. Recommended." checked={c.guestCheckout} onChange={(v) => set('guestCheckout', v)} />
            <Toggle label="Remember customer details" description="Saves what they typed so a refresh does not lose it." checked={c.rememberCustomer} onChange={(v) => set('rememberCustomer', v)} />
          </div>
        </Section>

        {/* ---------------- Form sections ---------------- */}
        <Section title="What appears on the form">
          <div className="space-y-3">
            <Toggle label="Order notes box" checked={c.showOrderNotes} onChange={(v) => set('showOrderNotes', v)} />
            <Toggle label="Pin location on a map" description="Helps riders find hard-to-reach addresses." checked={c.showPinLocation} onChange={(v) => set('showPinLocation', v)} />
            <Toggle label="Newsletter opt-in" checked={c.showNewsletter} onChange={(v) => set('showNewsletter', v)} />
            <Toggle label="Require the terms checkbox" description="Customer must tick it before ordering." checked={c.termsRequired} onChange={(v) => set('termsRequired', v)} />
          </div>
          <div className="mt-4 grid gap-4">
            <Text label="Order notes label" value={c.orderNotesLabel} onChange={(v) => set('orderNotesLabel', v)} />
            <Text label="Order notes hint" value={c.orderNotesHint} onChange={(v) => set('orderNotesHint', v)} />
            <Text label="Newsletter text" value={c.newsletterText} onChange={(v) => set('newsletterText', v)} />
            <Text label="Terms text" value={c.termsText} onChange={(v) => set('termsText', v)} />
            <Text label="Privacy note" value={c.privacyText} onChange={(v) => set('privacyText', v)} />
          </div>
        </Section>

        {/* ---------------- Trust ---------------- */}
        <Section title="Trust badges" description="Shown beside the order summary and on the thank-you page.">
          <Toggle label="Show trust badges" checked={c.showTrust} onChange={(v) => set('showTrust', v)} />
          <div className="mt-4 space-y-2">
            {(c.trust || []).map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 w-40 shrink-0" value={t.icon} onChange={(e) => setRow('trust', i, 'icon', e.target.value)} aria-label={`Icon for badge ${i + 1}`}>
                  {TRUST_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 flex-1" value={t.label} placeholder="e.g. Secure checkout" onChange={(e) => setRow('trust', i, 'label', e.target.value)} aria-label={`Text for badge ${i + 1}`} />
                <button
                  type="button" onClick={() => set('trust', c.trust.filter((_, j) => j !== i))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-[#F5EDEB] hover:text-[#9A5548]"
                  aria-label={`Remove badge ${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button" onClick={() => set('trust', [...(c.trust || []), { icon: 'ShieldCheck', label: '' }])}
              className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              + Add a badge
            </button>
          </div>
        </Section>

        {/* ---------------- Success ---------------- */}
        <Section title="Thank-you page" description="What customers see straight after ordering.">
          <div className="space-y-4">
            <Text label="Heading" value={c.successTitle} onChange={(v) => set('successTitle', v)} />
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Message</label>
              <textarea className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 min-h-[80px]" value={c.successText} onChange={(e) => set('successText', e.target.value)} />
            </div>
            <Text label="Extra note (optional)" value={c.successNote} onChange={(v) => set('successNote', v)} hint="Appears in small text at the bottom." />
          </div>
          <div className="mt-4 space-y-3">
            <Toggle label="Show recommended products" description="Off by default — some merchants prefer a clean confirmation." checked={c.showSuccessRecommend} onChange={(v) => set('showSuccessRecommend', v)} />
            <Toggle label="Show a share button" checked={c.showSuccessShare} onChange={(v) => set('showSuccessShare', v)} />
            <Toggle label="Entrance animations" description="Automatically skipped for visitors who prefer reduced motion." checked={c.animations} onChange={(v) => set('animations', v)} />
          </div>
          {c.showSuccessShare && (
            <div className="mt-4">
              <Text label="Share message" value={c.successShareText} onChange={(v) => set('successShareText', v)} />
            </div>
          )}
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setS(JSON.parse(original))} className="rounded-lg border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
