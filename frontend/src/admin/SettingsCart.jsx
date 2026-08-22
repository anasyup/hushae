import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { CART_DEFAULTS } from '../lib/cartConfig';
import { TRUST_ICON_NAMES } from '../pages/cart/TrustRow';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum, EdSelect,
  TableSkeleton, EditorialError, ctl, ta, btnGhost,
} from './settings/chrome';

export default function SettingsCart() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, cart: { ...CART_DEFAULTS, ...(d.settings.cart || {}) } };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  if (!s && !err) {
    return <AdminLayout title="Shopping Bag"><PageHeader title="Shopping Bag" description="Cart wording and behaviour." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Shopping Bag">
        <PageHeader title="Shopping Bag" description="Cart wording and behaviour." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

  const c = s.cart;
  const set = (k, v) => setS({ ...s, cart: { ...s.cart, [k]: v } });
  const setTop = (k, v) => setS({ ...s, [k]: v });
  const setTrust = (i, k, v) => set('trust', c.trust.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const dirty = original && JSON.stringify(s) !== original;

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', {
        method: 'PUT',
        token: auth.token,
        body: {
          cart: s.cart,
          shippingFlatRate: s.shippingFlatRate,
          freeShippingThreshold: s.freeShippingThreshold,
        },
      });
      setOriginal(JSON.stringify(s));
      toast('Shopping bag saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Shopping Bag">
      <PageHeader
        title="Shopping Bag"
        description="Every word, badge and rule on the cart page and the slide-out bag."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Shopping Bag' }]}
      />

      <EdSection index={1} title="Wording" description="Headings and buttons customers read on the bag page.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdText label="Page title" value={c.title} onChange={(v) => set('title', v)} placeholder="Shopping Bag" />
          <EdText label="Checkout button" value={c.checkoutLabel} onChange={(v) => set('checkoutLabel', v)} placeholder="Proceed to checkout" />
          <EdText label="Continue shopping link" value={c.continueLabel} onChange={(v) => set('continueLabel', v)} />
          <EdText label="Continue shopping goes to" value={c.continueHref} onChange={(v) => set('continueHref', v)} hint="A page address, e.g. /women or /new" />
        </div>
      </EdSection>

      <EdSection index={2} title="Empty bag" description="Shown when there is nothing in the bag yet.">
        <EdText label="Heading" value={c.emptyTitle} onChange={(v) => set('emptyTitle', v)} />
        <div className="mt-4">
          <label className="adm-label mb-1.5 block">Message</label>
          <textarea className={ta} value={c.emptyText} onChange={(e) => set('emptyText', e.target.value)} />
        </div>
      </EdSection>

      <EdSection index={3} title="Shipping" description="These two amounts are shared with checkout.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Flat delivery charge (PKR)" value={s.shippingFlatRate ?? 350} onChange={(v) => setTop('shippingFlatRate', v)} min="0" />
          <EdNum label="Free delivery over (PKR)" value={s.freeShippingThreshold ?? 4999} onChange={(v) => setTop('freeShippingThreshold', v)} min="0" hint="Set to 0 to turn free delivery off completely." />
        </div>
        <div className="mt-4">
          <EdToggle label="Show the free-shipping progress bar" description="A bar that fills as the bag grows." checked={c.showProgress} onChange={(v) => set('showProgress', v)} />
          <EdToggle label="Celebrate when free shipping unlocks" description="A short confetti burst. Skipped for reduced motion." checked={c.confetti} onChange={(v) => set('confetti', v)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdText label="Bar text — not there yet" value={c.progressAway} onChange={(v) => set('progressAway', v)} hint="Write {amount} where the remaining rupees should appear." />
          <EdText label="Bar text — unlocked" value={c.progressDone} onChange={(v) => set('progressDone', v)} />
        </div>
      </EdSection>

      <EdSection index={4} title="Delivery promise">
        <EdToggle label="Show estimated delivery" checked={c.showDelivery} onChange={(v) => set('showDelivery', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Fastest (days)" value={c.deliveryMinDays} onChange={(v) => set('deliveryMinDays', v)} min="1" max="60" />
          <EdNum label="Slowest (days)" value={c.deliveryMaxDays} onChange={(v) => set('deliveryMaxDays', v)} min="1" max="90" />
        </div>
        <div className="mt-4">
          <EdText label="Reassurance line under the checkout button" value={c.deliveryNote} onChange={(v) => set('deliveryNote', v)} />
        </div>
      </EdSection>

      <EdSection index={5} title="Behaviour">
        <EdToggle label="Allow promo codes on the bag page" description="Turn off if you only want codes entered at checkout." checked={c.couponEnabled} onChange={(v) => set('couponEnabled', v)} />
        <EdToggle label="Allow Save for later" description="Customers can park an item without losing it." checked={c.saveForLater} onChange={(v) => set('saveForLater', v)} />
        <EdToggle label="Show recommended products" checked={c.recommendEnabled} onChange={(v) => set('recommendEnabled', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Undo window after removing (seconds)" value={c.undoSeconds} onChange={(v) => set('undoSeconds', v)} min="1" max="30" hint="How long the Undo bar stays on screen." />
          <EdNum label="Maximum quantity per item" value={c.maxQty} onChange={(v) => set('maxQty', v)} min="1" max="99" />
          <EdText label="Recommendations heading" value={c.recommendTitle} onChange={(v) => set('recommendTitle', v)} />
          <EdSelect
            label="How to pick recommendations"
            value={c.recommendStrategy}
            onChange={(v) => set('recommendStrategy', v)}
            options={[
              { value: 'auto', label: 'Smart — pairs with what is in the bag' },
              { value: 'category', label: 'Same category' },
              { value: 'recent', label: 'Recently viewed' },
              { value: 'bestsellers', label: 'Best sellers' },
            ]}
          />
        </div>
      </EdSection>

      <EdSection index={6} title="Tax" description="Leave at 0 if prices already include tax.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Tax percentage" value={c.taxPercent} onChange={(v) => set('taxPercent', v)} min="0" max="100" step="0.5" />
          <EdText label="What to call it" value={c.taxLabel} onChange={(v) => set('taxLabel', v)} placeholder="Estimated tax" />
        </div>
      </EdSection>

      <EdSection index={7} title="Trust badges">
        <EdToggle label="Show trust badges" checked={c.showTrust} onChange={(v) => set('showTrust', v)} />
        <div className="mt-4 space-y-2">
          {(c.trust || []).map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select className={`${ctl} w-40 shrink-0`} value={t.icon} onChange={(e) => setTrust(i, 'icon', e.target.value)} aria-label={`Icon for badge ${i + 1}`}>
                {TRUST_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input className={`${ctl} min-w-[140px] flex-1`} value={t.label} placeholder="e.g. Secure checkout" onChange={(e) => setTrust(i, 'label', e.target.value)} aria-label={`Text for badge ${i + 1}`} />
              <button type="button" onClick={() => set('trust', c.trust.filter((_, j) => j !== i))} className={btnGhost} aria-label={`Remove badge ${i + 1}`}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => set('trust', [...(c.trust || []), { icon: 'ShieldCheck', label: '' }])} className={btnGhost}>Add a badge</button>
        </div>
      </EdSection>

      <EdSection index={8} title="Express checkout" description="Placeholders for Apple Pay and Google Pay. They stay disabled until a provider is connected.">
        <EdToggle label="Show Apple Pay button" checked={c.applePay} onChange={(v) => set('applePay', v)} />
        <EdToggle label="Show Google Pay button" checked={c.googlePay} onChange={(v) => set('googlePay', v)} />
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} />
    </AdminLayout>
  );
}
