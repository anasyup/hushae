import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost } from './orders/orderUi';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function csvFromRows(rows, filename) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const asArray = (d) => (Array.isArray(d) ? d : d?.products || d?.customers || d?.zones || d?.items || d?.list || d?.rows || d?.logs || d?.auditLogs || d?.discounts || []);

export default function Reports() {
  const { auth, toast } = useApp();
  const [busyKey, setBusyKey] = useState(null);

  const run = async (key, fetcher, mapper, filename) => {
    setBusyKey(key);
    try {
      const d = await fetcher();
      const rows = mapper ? mapper(asArray(d)) : asArray(d);
      if (!rows.length) { toast('No rows to export'); return; }
      csvFromRows(rows, filename);
      toast('Report exported');
    } catch (e) { toast(e?.message || 'Could not export report'); }
    setBusyKey(null);
  };

  const downloadOrdersCsv = async () => {
    setBusyKey('orders');
    try {
      const res = await fetch(`${BASE}/api/orders/admin/export/csv`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hushae-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Orders exported');
    } catch (e) { toast(e?.message || 'Could not export orders'); }
    setBusyKey(null);
  };

  const productMapper = (ps) => ps.map((p) => ({
    SKU: p.sku, Name: p.name, Category: p.categorySlug, Tier: p.tier,
    Price: p.price, CompareAt: p.compareAtPrice ?? '', Stock: p.stock,
    Status: p.status, New: p.isNewArrival ? 'Yes' : 'No', BestSeller: p.isBestSeller ? 'Yes' : 'No',
  }));

  const customerMapper = (cs) => cs.map((c) => ({
    Name: c.name, Email: c.email || '', Phone: c.phone || '', City: c.city || '',
    Orders: c.orderCount ?? '', Spent: c.totalSpent ?? '', Status: c.isActive === false ? 'Inactive' : 'Active',
  }));

  const stockMapper = (rows) => rows.map((r) => ({
    SKU: r.sku || r.productSku || '', Product: r.name || r.productName || '',
    Variant: r.variantKey || '', Available: r.available ?? r.stock ?? r.qty ?? '',
    Reserved: r.reserved ?? '', Warehouse: r.warehouse || '',
  }));

  const auditMapper = (logs) => logs.map((l) => ({
    Time: l.createdAt ? new Date(l.createdAt).toLocaleString() : '',
    Actor: l.actor || l.userEmail || '', Action: l.action || '', Resource: l.resource || l.resourceType || '',
    Detail: l.detail || l.message || '',
  }));

  const discountMapper = (ds) => ds.map((d) => ({
    Code: d.code || d.name || '', Type: d.type || d.discountType || '',
    Value: d.value ?? d.percentOff ?? d.amountOff ?? '', Used: d.uses ?? d.usageCount ?? 0,
    Limit: d.usageLimit ?? d.maxUses ?? '', Active: d.isActive === false ? 'No' : 'Yes',
  }));

  const CARDS = [
    { id: 'sales', title: 'Sales report', desc: 'Revenue, orders and AOV trends — full P&L view.', to: '/admin/finance', primary: true },
    { id: 'orders', title: 'Orders report', desc: 'All orders with filters — export the current view as CSV.', to: '/admin/orders', onExport: downloadOrdersCsv, primary: true },
    { id: 'products', title: 'Product report', desc: 'SKU, price, stock and status for the full catalog.', to: '/admin/products',
      onExport: () => run('products', () => api('/products/admin/list?limit=500', { token: auth.token }), productMapper, 'hushae-products') },
    { id: 'inventory', title: 'Inventory report', desc: 'Available vs reserved stock per SKU and warehouse.', to: '/admin/ops/inventory',
      onExport: () => run('inventory', () => api('/ops/stock', { token: auth.token }), stockMapper, 'hushae-inventory') },
    { id: 'customers', title: 'Customer report', desc: 'Customer directory — orders, spend and status.', to: '/admin/customers',
      onExport: () => run('customers', () => api('/admin/customers', { token: auth.token }), customerMapper, 'hushae-customers') },
    { id: 'discounts', title: 'Discount report', desc: 'Codes, types, usage and limits.', to: '/admin/discounts',
      onExport: () => run('discounts', () => api('/discounts', { token: auth.token }), discountMapper, 'hushae-discounts') },
    { id: 'refunds', title: 'Refund & return report', desc: 'Return cases and refund ledger.', to: '/admin/ops/returns' },
    { id: 'payments', title: 'Payment reconciliation', desc: 'Transactions, capture and refund status.', to: '/admin/payments' },
    { id: 'shipping', title: 'Shipping report', desc: 'Zones, rates and fulfillment rules.', to: '/admin/settings/shipping' },
    { id: 'tax', title: 'Tax report', desc: 'Global rate and per-zone configuration.', to: '/admin/settings/taxes' },
    { id: 'staff', title: 'Staff activity report', desc: 'Audit trail — who did what, when.', to: '/admin/settings/security',
      onExport: () => run('staff', () => api('/security/audit-logs?limit=200', { token: auth.token }), auditMapper, 'hushae-staff-activity') },
  ];

  return (
    <AdminLayout title="Reports">
      <PageHeader
        title="Reports"
        description="Exportable operational and financial reports. CSV files open directly in Excel."
      />

      <section>
        <p className="adm-index">01 — Directory</p>
        <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[3rem_minmax(0,1.2fr)_minmax(0,1.8fr)_auto] md:gap-4">
          {['#', 'Report', 'Detail', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
        </div>
        {CARDS.map((c, i) => (
          <div key={c.id} className="grid grid-cols-1 items-center gap-2 border-b border-[#EAEAEA] py-4 md:grid-cols-[3rem_minmax(0,1.2fr)_minmax(0,1.8fr)_auto] md:gap-4 adm-row-hover">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[#AAAAAA]">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="text-[13px] text-white">{c.title}</p>
              <p className="mt-0.5 text-[12px] text-[#AAAAAA] md:hidden">{c.desc}</p>
            </div>
            <p className="hidden text-[12px] text-[#AAAAAA] md:block">{c.desc}</p>
            <div className="flex items-center gap-2 justify-self-start md:justify-self-end">
              {c.onExport && (
                <button
                  type="button"
                  onClick={c.onExport}
                  disabled={busyKey === c.id}
                  className={btnGhost}
                >
                  {busyKey === c.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} CSV
                </button>
              )}
              <Link to={c.to} className="text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-white">
                Open →
              </Link>
            </div>
          </div>
        ))}
      </section>
    </AdminLayout>
  );
}
