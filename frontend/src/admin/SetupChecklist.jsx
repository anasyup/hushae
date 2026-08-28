import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * SETUP GUIDE — the Shopify-style onboarding checklist, computed live.
 * Read-only: it only reads existing endpoints and links to the right pages,
 * so nothing can break. Progress bar fills as the merchant completes steps.
 * ========================================================================== */

export default function SetupChecklist() {
  const { auth } = useApp();
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    const [products, settings, orders] = await Promise.all([
      api('/products/admin/list?limit=1', { token: auth?.token }).catch(() => null),
      api('/settings', { token: auth?.token }).catch(() => null),
      api('/orders/manage/counts', { token: auth?.token }).catch(() => null),
    ]);
    setD({
      products: products?.total ?? products?.products?.length ?? 0,
      s: settings?.settings || {},
      orders: orders?.total ?? 0,
    });
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  if (!d) {
    return (
      <AdminLayout title="Setup Guide">
        <p className="py-10 text-center text-[12px]" style={{ color: 'var(--adm-label)' }}>Checking your store…</p>
      </AdminLayout>
    );
  }

  const s = d.s;
  const gw = s.integrations?.payments || {};
  const gwOn = !!(gw.safepay?.apiKey && gw.safepay?.secret) || !!(gw.jazzcash?.merchantId) || !!(gw.easypaisa?.storeId);
  const steps = [
    { done: d.products > 0, label: 'Add your first products', note: `${d.products} product${d.products === 1 ? '' : 's'} live`, to: d.products ? '/admin/products' : '/admin/products/new' },
    { done: !!(s.paymentMethods?.cod) || gwOn, label: 'Choose payment methods', note: 'COD is on by default; add online gateways when approved', to: '/admin/settings/payments' },
    { done: !!(s.shippingFlatRate || s.freeShippingThreshold), label: 'Set shipping rates', note: 'Flat rate + free-shipping threshold', to: '/admin/settings/shipping' },
    { done: !!s.storeName, label: 'Brand your store', note: 'Store name, hero and trust badges', to: '/admin/settings/store' },
    { done: d.orders > 0, label: 'Receive your first order', note: d.orders > 0 ? `${d.orders} order${d.orders === 1 ? '' : 's'} received` : 'Place a test order to try the flow', to: '/admin/orders' },
    { done: !!(s.theme || s.header || s.footer), label: 'Publish your theme', note: 'Storefront theme + menus', to: '/admin/theme' },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <AdminLayout title="Setup Guide">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Home</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Setup Guide</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Six steps to a fully live store. Tick them off in any order.
          </p>
        </div>
        <button type="button" className="adm-chip" onClick={load}><RefreshCcw size={13} /> Refresh</button>
      </div>

      <div className="mb-6 border p-5" style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)' }}>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">{doneCount} of {steps.length} complete</p>
          <p className="adm-metric text-[18px]">{pct}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--od-hover)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--admin-accent)' }} />
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map((st) => (
          <Link key={st.label} to={st.to} className="flex items-center gap-4 border p-4 transition-colors"
            style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)', textDecoration: 'none', opacity: st.done ? 0.75 : 1 }}>
            {st.done
              ? <CheckCircle2 size={17} style={{ color: '#10b981', flexShrink: 0 }} />
              : <Circle size={17} style={{ color: 'var(--adm-label)', flexShrink: 0 }} />}
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold" style={{ color: 'var(--admin-text)', textDecoration: st.done ? 'line-through' : 'none' }}>{st.label}</span>
              <span className="mt-0.5 block text-[11.5px]" style={{ color: 'var(--adm-label)' }}>{st.note}</span>
            </span>
            <span className="adm-chip">{st.done ? 'Done' : 'Do it'}</span>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
