import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Save, Sparkles } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { CX_DEFAULTS } from '../lib/cxConfig';

/* ============================================================================
 * ADMIN → SETTINGS → CUSTOMER EXPERIENCE
 *
 * Writes exactly one top-level field: `customerExperience`.
 * Three sub-blocks — wishlist, recently viewed, compare — because all three
 * live on the product card and are read together in one API call.
 * ========================================================================== */

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition ${disabled ? 'opacity-55' : 'cursor-pointer hover:border-neutral-300'}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Num({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
      {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function Text({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

export default function SettingsCX() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const saved = d.settings.customerExperience || {};
        const merged = {};
        for (const g of Object.keys(CX_DEFAULTS)) merged[g] = { ...CX_DEFAULTS[g], ...(saved[g] || {}) };
        const next = { ...d.settings, customerExperience: merged };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Customer Experience"><div className="skeleton h-96 w-full" /></AdminLayout>;

  const cx = s.customerExperience;
  const set = (group, k, v) => setS({ ...s, customerExperience: { ...cx, [group]: { ...cx[group], [k]: v } } });
  const dirty = original && JSON.stringify(s) !== original;

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { customerExperience: cx } });
      setOriginal(JSON.stringify(s));
      toast('Customer experience saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  const w = cx.wishlist, r = cx.recentlyViewed, c = cx.compare;

  return (
    <AdminLayout title="Customer Experience">
      <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
          <Sparkles size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-2xl leading-tight text-neutral-900">Customer Experience</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            Wishlist, recently viewed and product comparison — the three tools shoppers use to decide.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ---------------- Wishlist ---------------- */}
        <Section title="Wishlist" description="The heart on every product. Turning it off hides the heart everywhere and blocks the API.">
          <div className="space-y-3">
            <Toggle label="Enable wishlist" checked={w.enabled} onChange={(v) => set('wishlist', 'enabled', v)} />
            <Toggle label="Allow shoppers who are not signed in" description="Saved on their phone and merged into their account when they sign in. Recommended — asking for an account first loses saves." checked={w.allowGuest} onChange={(v) => set('wishlist', 'allowGuest', v)} disabled={!w.enabled} />
            <Toggle label="Allow “Move to bag”" checked={w.allowMoveToCart} onChange={(v) => set('wishlist', 'allowMoveToCart', v)} disabled={!w.enabled} />
            <Toggle label="Allow sharing a wishlist" checked={w.allowShare} onChange={(v) => set('wishlist', 'allowShare', v)} disabled={!w.enabled} />
            <Toggle label="Allow “Clear all”" checked={w.allowClearAll} onChange={(v) => set('wishlist', 'allowClearAll', v)} disabled={!w.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Maximum saved items" value={w.maxItems} onChange={(v) => set('wishlist', 'maxItems', v)} min="1" max="500" hint="Enforced on the server too, not just in the browser." />
            <Text label="Page title" value={w.title} onChange={(v) => set('wishlist', 'title', v)} />
            <div className="md:col-span-2">
              <Text label="Empty-wishlist message" value={w.emptyText} onChange={(v) => set('wishlist', 'emptyText', v)} />
            </div>
          </div>
        </Section>

        {/* ---------------- Recently viewed ---------------- */}
        <Section title="Recently viewed" description="Pieces a shopper has already looked at, shown again so they can find their way back.">
          <div className="space-y-3">
            <Toggle label="Enable recently viewed" checked={r.enabled} onChange={(v) => set('recentlyViewed', 'enabled', v)} />
            <Toggle label="Show on the home page" checked={r.showOnHome} onChange={(v) => set('recentlyViewed', 'showOnHome', v)} disabled={!r.enabled} />
            <Toggle label="Show on the product page" checked={r.showOnProduct} onChange={(v) => set('recentlyViewed', 'showOnProduct', v)} disabled={!r.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Num label="How many to remember" value={r.maxItems} onChange={(v) => set('recentlyViewed', 'maxItems', v)} min="1" max="50" />
            <Num label="Forget after (days)" value={r.expiryDays} onChange={(v) => set('recentlyViewed', 'expiryDays', v)} min="1" max="365" />
            <Text label="Row heading" value={r.title} onChange={(v) => set('recentlyViewed', 'title', v)} />
          </div>
        </Section>

        {/* ---------------- Compare ---------------- */}
        <Section title="Compare" description="Lets shoppers put pieces side by side — useful when several styles look similar.">
          <div className="space-y-3">
            <Toggle label="Enable compare" checked={c.enabled} onChange={(v) => set('compare', 'enabled', v)} />
            <Toggle label="Show the compare button on product cards" checked={c.showOnCard} onChange={(v) => set('compare', 'showOnCard', v)} disabled={!c.enabled} />
            <Toggle label="Highlight the rows that differ" description="Rows where the pieces are the same are dimmed, so differences stand out." checked={c.highlightDifferences} onChange={(v) => set('compare', 'highlightDifferences', v)} disabled={!c.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Maximum pieces to compare" value={c.maxItems} onChange={(v) => set('compare', 'maxItems', v)} min="2" max="6" hint="Four fits comfortably on a phone. More than that scrolls sideways." />
            <Text label="Page title" value={c.title} onChange={(v) => set('compare', 'title', v)} />
          </div>
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
