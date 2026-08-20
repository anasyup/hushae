import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { CART_DEFAULTS } from '../lib/cartConfig';
import { TRUST_ICON_NAMES } from '../pages/cart/TrustRow';

/* ============================================================================
 * ADMIN → SETTINGS → SHOPPING BAG
 *
 * Everything the bag renders is editable here. The page writes exactly two
 * top-level fields: `cart` (presentation + behaviour) and the two shipping
 * money fields, which stay at the top level because Checkout reads the same
 * two — one source of truth for money.
 *
 * Unset keys fall back to CART_DEFAULTS, the same object the storefront
 * resolves against, so what is previewed here is what ships.
 * ========================================================================== */

function Section({ title, description, children }) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start justify-between gap-4 rounded-md border border-neutral-200 bg-white px-4 py-3 transition hover:border-neutral-300">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[12px] text-neutral-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Text({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="mt-1.5 text-[12px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function Num({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
      {hint && <p className="mt-1.5 text-[12px] text-neutral-500">{hint}</p>}
    </div>
  );
}

export default function SettingsCart() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        // Merge saved values over defaults so a store that has never opened
        // this page still shows the real, live configuration.
        const next = { ...d.settings, cart: { ...CART_DEFAULTS, ...(d.settings.cart || {}) } };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Shopping Bag"><div className="animate-pulse rounded-md bg-neutral-100 h-96 w-full" /></AdminLayout>;

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
      <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-neutral-900 text-white">
          <ShoppingBag size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-2xl leading-tight text-neutral-900">Shopping Bag</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            Every word, badge and rule on the cart page and the slide-out bag. Changes go live the moment you save — no developer needed.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ---------------- Wording ---------------- */}
        <Section title="Wording" description="The headings and buttons customers read on the bag page.">
          <div className="grid gap-4 md:grid-cols-2">
            <Text label="Page title" value={c.title} onChange={(v) => set('title', v)} placeholder="Shopping Bag" />
            <Text label="Checkout button" value={c.checkoutLabel} onChange={(v) => set('checkoutLabel', v)} placeholder="Proceed to checkout" />
            <Text label="Continue shopping link" value={c.continueLabel} onChange={(v) => set('continueLabel', v)} />
            <Text label="Continue shopping goes to" value={c.continueHref} onChange={(v) => set('continueHref', v)} hint="A page address, e.g. /women or /new" />
          </div>
        </Section>

        {/* ---------------- Empty bag ---------------- */}
        <Section title="Empty bag" description="Shown when there is nothing in the bag yet.">
          <div className="space-y-4">
            <Text label="Heading" value={c.emptyTitle} onChange={(v) => set('emptyTitle', v)} />
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Message</label>
              <textarea className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 min-h-[80px]" value={c.emptyText} onChange={(e) => set('emptyText', e.target.value)} />
            </div>
          </div>
        </Section>

        {/* ---------------- Shipping ---------------- */}
        <Section title="Shipping & free-shipping bar" description="These two amounts are shared with checkout, so the customer is never quoted two different totals.">
          <div className="grid gap-4 md:grid-cols-2">
            <Num label="Flat delivery charge (PKR)" value={s.shippingFlatRate ?? 350} onChange={(v) => setTop('shippingFlatRate', v)} min="0" />
            <Num label="Free delivery over (PKR)" value={s.freeShippingThreshold ?? 4999} onChange={(v) => setTop('freeShippingThreshold', v)} min="0" hint="Set to 0 to turn free delivery off completely." />
          </div>
          <div className="mt-4 space-y-3">
            <Toggle label="Show the free-shipping progress bar" description="A bar that fills as the bag grows — proven to lift basket size." checked={c.showProgress} onChange={(v) => set('showProgress', v)} />
            <Toggle label="Celebrate when free shipping unlocks" description="A short confetti burst. Automatically skipped for visitors who prefer reduced motion." checked={c.confetti} onChange={(v) => set('confetti', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Bar text — not there yet" value={c.progressAway} onChange={(v) => set('progressAway', v)} hint="Write {amount} where the remaining rupees should appear." />
            <Text label="Bar text — unlocked" value={c.progressDone} onChange={(v) => set('progressDone', v)} />
          </div>
        </Section>

        {/* ---------------- Delivery promise ---------------- */}
        <Section title="Delivery promise" description="An arrival window shown on each item and at the top of the bag.">
          <Toggle label="Show estimated delivery" checked={c.showDelivery} onChange={(v) => set('showDelivery', v)} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Fastest (days)" value={c.deliveryMinDays} onChange={(v) => set('deliveryMinDays', v)} min="1" max="60" />
            <Num label="Slowest (days)" value={c.deliveryMaxDays} onChange={(v) => set('deliveryMaxDays', v)} min="1" max="90" />
          </div>
          <div className="mt-4">
            <Text label="Reassurance line under the checkout button" value={c.deliveryNote} onChange={(v) => set('deliveryNote', v)} />
          </div>
        </Section>

        {/* ---------------- Behaviour ---------------- */}
        <Section title="How the bag behaves">
          <div className="space-y-3">
            <Toggle label="Allow promo codes on the bag page" description="Turn off if you only want codes entered at checkout." checked={c.couponEnabled} onChange={(v) => set('couponEnabled', v)} />
            <Toggle label="Allow 'Save for later'" description="Customers can park an item without losing it." checked={c.saveForLater} onChange={(v) => set('saveForLater', v)} />
            <Toggle label="Show recommended products" checked={c.recommendEnabled} onChange={(v) => set('recommendEnabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Undo window after removing (seconds)" value={c.undoSeconds} onChange={(v) => set('undoSeconds', v)} min="1" max="30" hint="How long the 'Undo' bar stays on screen." />
            <Num label="Maximum quantity per item" value={c.maxQty} onChange={(v) => set('maxQty', v)} min="1" max="99" />
            <Text label="Recommendations heading" value={c.recommendTitle} onChange={(v) => set('recommendTitle', v)} />
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">How to pick recommendations</label>
              <select className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={c.recommendStrategy} onChange={(e) => set('recommendStrategy', e.target.value)}>
                <option value="auto">Smart — pairs with what is in the bag</option>
                <option value="category">Same category</option>
                <option value="recent">Recently viewed</option>
                <option value="bestsellers">Best sellers</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ---------------- Tax ---------------- */}
        <Section title="Tax" description="Leave at 0 if your prices already include tax — then no tax line is shown at all.">
          <div className="grid gap-4 md:grid-cols-2">
            <Num label="Tax percentage" value={c.taxPercent} onChange={(v) => set('taxPercent', v)} min="0" max="100" step="0.5" />
            <Text label="What to call it" value={c.taxLabel} onChange={(v) => set('taxLabel', v)} placeholder="Estimated tax" />
          </div>
        </Section>

        {/* ---------------- Trust ---------------- */}
        <Section title="Trust badges" description="Short reassurances shown beside the checkout button.">
          <Toggle label="Show trust badges" checked={c.showTrust} onChange={(v) => set('showTrust', v)} />
          <div className="mt-4 space-y-2">
            {(c.trust || []).map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 w-40 shrink-0" value={t.icon} onChange={(e) => setTrust(i, 'icon', e.target.value)} aria-label={`Icon for badge ${i + 1}`}>
                  {TRUST_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <input className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 flex-1" value={t.label} placeholder="e.g. Secure checkout" onChange={(e) => setTrust(i, 'label', e.target.value)} aria-label={`Text for badge ${i + 1}`} />
                <button
                  type="button"
                  onClick={() => set('trust', c.trust.filter((_, j) => j !== i))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-neutral-500 transition hover:bg-[#F5EDEB] hover:text-[#9A5548]"
                  aria-label={`Remove badge ${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('trust', [...(c.trust || []), { icon: 'ShieldCheck', label: '' }])}
              className="w-full rounded-md border border-dashed border-neutral-300 py-2 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              + Add a badge
            </button>
          </div>
        </Section>

        {/* ---------------- Express checkout ---------------- */}
        <Section title="Express checkout buttons" description="Placeholders for Apple Pay and Google Pay. Switch one on to reserve its place in the layout — it stays disabled until a payment provider is connected.">
          <div className="space-y-3">
            <Toggle label="Show Apple Pay button" checked={c.applePay} onChange={(v) => set('applePay', v)} />
            <Toggle label="Show Google Pay button" checked={c.googlePay} onChange={(v) => set('googlePay', v)} />
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-md border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-md">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setS(JSON.parse(original))} className="rounded-md border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
