import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { CX_DEFAULTS } from '../lib/cxConfig';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum,
  TableSkeleton, EditorialError,
} from './settings/chrome';

export default function SettingsCX() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  if (!s && !err) {
    return <AdminLayout title="Customer Experience"><PageHeader title="Customer Experience" description="Wishlist, recently viewed and compare." /><TableSkeleton rows={6} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Customer Experience">
        <PageHeader title="Customer Experience" description="Wishlist, recently viewed and compare." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

  const cx = s.customerExperience;
  const set = (group, k, v) => setS({ ...s, customerExperience: { ...cx, [group]: { ...cx[group], [k]: v } } });
  const dirty = original && JSON.stringify(s) !== original;
  const w = cx.wishlist, r = cx.recentlyViewed, c = cx.compare;

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { customerExperience: cx } });
      setOriginal(JSON.stringify(s));
      toast('Customer experience saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Customer Experience">
      <PageHeader
        title="Customer Experience"
        description="Wishlist, recently viewed and product comparison."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Customer Experience' }]}
      />

      <EdSection index={1} title="Wishlist" description="The heart on every product. Turning it off hides the heart and blocks the API.">
        <EdToggle label="Enable wishlist" checked={w.enabled} onChange={(v) => set('wishlist', 'enabled', v)} />
        <EdToggle label="Allow shoppers who are not signed in" description="Saved on their phone and merged when they sign in." checked={w.allowGuest} onChange={(v) => set('wishlist', 'allowGuest', v)} disabled={!w.enabled} />
        <EdToggle label="Allow Move to bag" checked={w.allowMoveToCart} onChange={(v) => set('wishlist', 'allowMoveToCart', v)} disabled={!w.enabled} />
        <EdToggle label="Allow sharing a wishlist" checked={w.allowShare} onChange={(v) => set('wishlist', 'allowShare', v)} disabled={!w.enabled} />
        <EdToggle label="Allow Clear all" checked={w.allowClearAll} onChange={(v) => set('wishlist', 'allowClearAll', v)} disabled={!w.enabled} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Maximum saved items" value={w.maxItems} onChange={(v) => set('wishlist', 'maxItems', v)} min="1" max="500" hint="Enforced on the server too." />
          <EdText label="Page title" value={w.title} onChange={(v) => set('wishlist', 'title', v)} />
          <div className="md:col-span-2">
            <EdText label="Empty-wishlist message" value={w.emptyText} onChange={(v) => set('wishlist', 'emptyText', v)} />
          </div>
        </div>
      </EdSection>

      <EdSection index={2} title="Recently viewed">
        <EdToggle label="Enable recently viewed" checked={r.enabled} onChange={(v) => set('recentlyViewed', 'enabled', v)} />
        <EdToggle label="Show on the home page" checked={r.showOnHome} onChange={(v) => set('recentlyViewed', 'showOnHome', v)} disabled={!r.enabled} />
        <EdToggle label="Show on the product page" checked={r.showOnProduct} onChange={(v) => set('recentlyViewed', 'showOnProduct', v)} disabled={!r.enabled} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <EdNum label="How many to remember" value={r.maxItems} onChange={(v) => set('recentlyViewed', 'maxItems', v)} min="1" max="50" />
          <EdNum label="Forget after (days)" value={r.expiryDays} onChange={(v) => set('recentlyViewed', 'expiryDays', v)} min="1" max="365" />
          <EdText label="Row heading" value={r.title} onChange={(v) => set('recentlyViewed', 'title', v)} />
        </div>
      </EdSection>

      <EdSection index={3} title="Compare">
        <EdToggle label="Enable compare" checked={c.enabled} onChange={(v) => set('compare', 'enabled', v)} />
        <EdToggle label="Show the compare button on product cards" checked={c.showOnCard} onChange={(v) => set('compare', 'showOnCard', v)} disabled={!c.enabled} />
        <EdToggle label="Highlight the rows that differ" description="Rows where the pieces are the same are dimmed." checked={c.highlightDifferences} onChange={(v) => set('compare', 'highlightDifferences', v)} disabled={!c.enabled} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Maximum pieces to compare" value={c.maxItems} onChange={(v) => set('compare', 'maxItems', v)} min="2" max="6" hint="Four fits comfortably on a phone." />
          <EdText label="Page title" value={c.title} onChange={(v) => set('compare', 'title', v)} />
        </div>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} />
    </AdminLayout>
  );
}
