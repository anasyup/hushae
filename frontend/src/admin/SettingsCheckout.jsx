import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { CHECKOUT_DEFAULTS } from '../lib/checkoutConfig';
import { TRUST_ICON_NAMES } from '../pages/cart/TrustRow';
import { METHOD_ICON_NAMES } from '../pages/checkout/MethodPicker';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText,
  TableSkeleton, EditorialError, ctl, ta, btnGhost,
} from './settings/chrome';

export default function SettingsCheckout() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, checkout: { ...CHECKOUT_DEFAULTS, ...(d.settings.checkout || {}) } };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  if (!s && !err) {
    return <AdminLayout title="Checkout"><PageHeader title="Checkout" description="Payment, delivery and thank-you page." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Checkout">
        <PageHeader title="Checkout" description="Payment, delivery and thank-you page." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

  const c = s.checkout;
  const set = (k, v) => setS({ ...s, checkout: { ...s.checkout, [k]: v } });
  const setRow = (list, i, k, v) => set(list, c[list].map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const dirty = original && JSON.stringify(s) !== original;

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...s.checkout, checkoutMigrated: true };
      await api('/settings', { method: 'PUT', token: auth.token, body: { checkout: payload } });
      setS((x) => ({ ...x, checkout: payload }));
      setOriginal(JSON.stringify({ ...s, checkout: { ...s.checkout, checkoutMigrated: true } }));
      toast('Checkout saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  const Switch = ({ on, label, onClick }) => (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 rounded-full ${on ? 'bg-white' : 'bg-white/20'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${on ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
    </button>
  );

  return (
    <AdminLayout title="Checkout">
      <PageHeader
        title="Checkout"
        description="Payment methods, delivery options, wording and the thank-you page."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Checkout' }]}
      />

      <EdSection index={1} title="Checkout" description="Page title and reassurance line.">
        <div className="space-y-4">
          <EdText label="Page title" value={c.title} onChange={(v) => set('title', v)} />
          <EdText label="Subtitle" value={c.subtitle} onChange={(v) => set('subtitle', v)} hint="The reassurance line under the heading." />
        </div>
      </EdSection>

      <EdSection index={2} title="Payment" description="Switch a method on to offer it. Keep at least one on.">
        <div className="space-y-6">
          {(c.paymentList || []).map((m, i) => (
            <div key={m.id || i} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-3">
                <Switch on={m.enabled} label={`Enable ${m.label || m.id}`} onClick={() => setRow('paymentList', i, 'enabled', !m.enabled)} />
                <input className={`${ctl} min-w-[140px] flex-1`} value={m.label} placeholder="Shown to customers" onChange={(e) => setRow('paymentList', i, 'label', e.target.value)} aria-label={`Label for ${m.id}`} />
                <select className={`${ctl} w-36 shrink-0`} value={m.icon} onChange={(e) => setRow('paymentList', i, 'icon', e.target.value)} aria-label={`Icon for ${m.id}`}>
                  {METHOD_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button type="button" onClick={() => set('paymentList', c.paymentList.filter((_, j) => j !== i))} className={btnGhost} aria-label={`Remove ${m.label || m.id}`}>Remove</button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input className={ctl} value={m.note} placeholder="Short note, e.g. Pay the rider at your door" onChange={(e) => setRow('paymentList', i, 'note', e.target.value)} aria-label={`Note for ${m.id}`} />
                <input className={ctl} value={m.id} placeholder="Internal id" onChange={(e) => setRow('paymentList', i, 'id', e.target.value)} aria-label={`Internal id for ${m.label || 'method'}`} />
              </div>
              <textarea className={`${ta} mt-3 min-h-[64px]`} value={m.instructions || ''} placeholder="Instructions shown when the customer picks this" onChange={(e) => setRow('paymentList', i, 'instructions', e.target.value)} aria-label={`Instructions for ${m.id}`} />
              <div className="mt-3 flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-[12px] text-white/70">
                  <input type="checkbox" checked={!!m.needsTxn} onChange={(e) => setRow('paymentList', i, 'needsTxn', e.target.checked)} className="h-4 w-4 accent-white" />
                  Ask for a transaction reference
                </label>
                <label className="flex items-center gap-2 text-[12px] text-white/70">
                  <input type="checkbox" checked={!!m.comingSoon} onChange={(e) => setRow('paymentList', i, 'comingSoon', e.target.checked)} className="h-4 w-4 accent-white" />
                  Show as coming soon (cannot be selected)
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set('paymentList', [...(c.paymentList || []), { id: '', label: '', note: '', icon: 'CreditCard', enabled: false, needsTxn: false, instructions: '', comingSoon: true }])} className={btnGhost}>
            Add a payment method
          </button>
          <p className="text-[12px] leading-relaxed text-white/30">
            To add a brand-new provider, add a row here and leave “coming soon” ticked until the provider is connected.
          </p>
        </div>
      </EdSection>

      <EdSection index={3} title="Fulfillment" description="Rate 0 uses your normal flat delivery charge from Settings → Shipping.">
        <div className="space-y-6">
          {(c.shippingMethods || []).map((m, i) => (
            <div key={m.id || i} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-3">
                <Switch on={m.enabled} label={`Enable ${m.label || m.id}`} onClick={() => setRow('shippingMethods', i, 'enabled', !m.enabled)} />
                <input className={`${ctl} min-w-[140px] flex-1`} value={m.label} onChange={(e) => setRow('shippingMethods', i, 'label', e.target.value)} aria-label={`Label for ${m.id}`} />
                <button type="button" onClick={() => set('shippingMethods', c.shippingMethods.filter((_, j) => j !== i))} className={btnGhost} aria-label={`Remove ${m.label || m.id}`}>Remove</button>
              </div>
              <div className="mt-3">
                <input className={ctl} value={m.note} placeholder="Short note" onChange={(e) => setRow('shippingMethods', i, 'note', e.target.value)} aria-label={`Note for ${m.id}`} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <EdText label="Charge (PKR)" type="number" value={m.rate} onChange={(v) => setRow('shippingMethods', i, 'rate', Number(v))} />
                <EdText label="Fastest (days)" type="number" value={m.minDays} onChange={(v) => setRow('shippingMethods', i, 'minDays', Number(v))} />
                <EdText label="Slowest (days)" type="number" value={m.maxDays} onChange={(v) => setRow('shippingMethods', i, 'maxDays', Number(v))} />
                <label className="flex items-end gap-2 pb-1 text-[12px] text-white/70">
                  <input type="checkbox" checked={m.freeEligible !== false} onChange={(e) => setRow('shippingMethods', i, 'freeEligible', e.target.checked)} className="h-4 w-4 accent-white" />
                  Free-shipping applies
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set('shippingMethods', [...(c.shippingMethods || []), { id: '', label: '', note: '', rate: 0, minDays: 2, maxDays: 5, enabled: false, freeEligible: true }])} className={btnGhost}>
            Add a delivery method
          </button>
        </div>
      </EdSection>

      <EdSection index={4} title="Customer">
        <EdToggle label="Allow guest checkout" description="Customers can order without making an account." checked={c.guestCheckout} onChange={(v) => set('guestCheckout', v)} />
        <EdToggle label="Remember customer details" description="Saves what they typed so a refresh does not lose it." checked={c.rememberCustomer} onChange={(v) => set('rememberCustomer', v)} />
      </EdSection>

      <EdSection index={5} title="Form">
        <EdToggle label="Order notes box" checked={c.showOrderNotes} onChange={(v) => set('showOrderNotes', v)} />
        <EdToggle label="Pin location on a map" description="Helps riders find hard-to-reach addresses." checked={c.showPinLocation} onChange={(v) => set('showPinLocation', v)} />
        <EdToggle label="Newsletter opt-in" checked={c.showNewsletter} onChange={(v) => set('showNewsletter', v)} />
        <EdToggle label="Require the terms checkbox" description="Customer must tick it before ordering." checked={c.termsRequired} onChange={(v) => set('termsRequired', v)} />
        <div className="mt-4 grid gap-4">
          <EdText label="Order notes label" value={c.orderNotesLabel} onChange={(v) => set('orderNotesLabel', v)} />
          <EdText label="Order notes hint" value={c.orderNotesHint} onChange={(v) => set('orderNotesHint', v)} />
          <EdText label="Newsletter text" value={c.newsletterText} onChange={(v) => set('newsletterText', v)} />
          <EdText label="Terms text" value={c.termsText} onChange={(v) => set('termsText', v)} />
          <EdText label="Privacy note" value={c.privacyText} onChange={(v) => set('privacyText', v)} />
        </div>
      </EdSection>

      <EdSection index={6} title="Trust badges">
        <EdToggle label="Show trust badges" checked={c.showTrust} onChange={(v) => set('showTrust', v)} />
        <div className="mt-4 space-y-2">
          {(c.trust || []).map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select className={`${ctl} w-40 shrink-0`} value={t.icon} onChange={(e) => setRow('trust', i, 'icon', e.target.value)} aria-label={`Icon for badge ${i + 1}`}>
                {TRUST_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input className={`${ctl} min-w-[140px] flex-1`} value={t.label} placeholder="e.g. Secure checkout" onChange={(e) => setRow('trust', i, 'label', e.target.value)} aria-label={`Text for badge ${i + 1}`} />
              <button type="button" onClick={() => set('trust', c.trust.filter((_, j) => j !== i))} className={btnGhost} aria-label={`Remove badge ${i + 1}`}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => set('trust', [...(c.trust || []), { icon: 'ShieldCheck', label: '' }])} className={btnGhost}>Add a badge</button>
        </div>
      </EdSection>

      <EdSection index={7} title="Thank-you page">
        <div className="space-y-4">
          <EdText label="Heading" value={c.successTitle} onChange={(v) => set('successTitle', v)} />
          <div>
            <label className="adm-label mb-1.5 block">Message</label>
            <textarea className={ta} value={c.successText} onChange={(e) => set('successText', e.target.value)} />
          </div>
          <EdText label="Extra note (optional)" value={c.successNote} onChange={(v) => set('successNote', v)} hint="Appears in small text at the bottom." />
        </div>
        <div className="mt-4">
          <EdToggle label="Show recommended products" description="Off by default." checked={c.showSuccessRecommend} onChange={(v) => set('showSuccessRecommend', v)} />
          <EdToggle label="Show a share button" checked={c.showSuccessShare} onChange={(v) => set('showSuccessShare', v)} />
          <EdToggle label="Entrance animations" description="Skipped for reduced motion." checked={c.animations} onChange={(v) => set('animations', v)} />
        </div>
        {c.showSuccessShare && (
          <div className="mt-4">
            <EdText label="Share message" value={c.successShareText} onChange={(v) => set('successShareText', v)} />
          </div>
        )}
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} />
    </AdminLayout>
  );
}
