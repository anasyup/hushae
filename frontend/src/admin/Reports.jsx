import { useState } from 'react';
import { FileBarChart2, FileSpreadsheet, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * Reports — operational & financial reporting hub (Master Spec §17)
 * Every card links to the owning screen; CSV exports are generated from the
 * same admin APIs the screens use (client-side, Excel-friendly BOM).
 * ========================================================================== */

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
    { id: 'sales', title: 'Sales report', desc: 'Revenue, orders and AOV trends — full P&L view.', to: '/admin/finance', icon: FileBarChart2, primary: true },
    { id: 'orders', title: 'Orders report', desc: 'All orders with filters — export the current view as CSV.', to: '/admin/orders', icon: FileSpreadsheet, onExport: downloadOrdersCsv, primary: true },
    { id: 'products', title: 'Product report', desc: 'SKU, price, stock and status for the full catalog.', to: '/admin/products', icon: FileSpreadsheet,
      onExport: () => run('products', () => api('/products/admin/list?limit=500', { token: auth.token }), productMapper, 'hushae-products') },
    { id: 'inventory', title: 'Inventory report', desc: 'Available vs reserved stock per SKU and warehouse.', to: '/admin/ops/inventory', icon: FileSpreadsheet,
      onExport: () => run('inventory', () => api('/ops/stock', { token: auth.token }), stockMapper, 'hushae-inventory') },
    { id: 'customers', title: 'Customer report', desc: 'Customer directory — orders, spend and status.', to: '/admin/customers', icon: FileSpreadsheet,
      onExport: () => run('customers', () => api('/admin/customers', { token: auth.token }), customerMapper, 'hushae-customers') },
    { id: 'discounts', title: 'Discount report', desc: 'Codes, types, usage and limits.', to: '/admin/discounts', icon: FileSpreadsheet,
      onExport: () => run('discounts', () => api('/discounts', { token: auth.token }), discountMapper, 'hushae-discounts') },
    { id: 'refunds', title: 'Refund & return report', desc: 'Return cases and refund ledger.', to: '/admin/ops/returns', icon: FileBarChart2 },
    { id: 'payments', title: 'Payment reconciliation', desc: 'Transactions, capture and refund status.', to: '/admin/payments', icon: FileBarChart2 },
    { id: 'shipping', title: 'Shipping report', desc: 'Zones, rates and fulfillment rules.', to: '/admin/settings/shipping', icon: FileBarChart2 },
    { id: 'tax', title: 'Tax report', desc: 'Global rate and per-zone configuration.', to: '/admin/settings/taxes', icon: FileBarChart2 },
    { id: 'staff', title: 'Staff activity report', desc: 'Audit trail — who did what, when.', to: '/admin/settings/security', icon: FileSpreadsheet,
      onExport: () => run('staff', () => api('/security/audit-logs?limit=200', { token: auth.token }), auditMapper, 'hushae-staff-activity') },
  ];

  return (
    <AdminLayout title="Reports">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white"><FileBarChart2 size={17} /></span>
          <div>
            <h2 className="text-[15px] font-medium text-neutral-900">Reports</h2>
            <p className="mt-0.5 text-[12px] text-neutral-500">Exportable operational and financial reports. CSV files open directly in Excel.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.id} className="group flex flex-col rounded-md border border-neutral-200 bg-white p-4 transition hover:border-neutral-300">
              <div className="flex items-start justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-neutral-50 text-neutral-600"><c.icon size={14} /></span>
                {c.onExport && (
                  <button
                    onClick={c.onExport}
                    disabled={busyKey === c.id}
                    title="Export CSV"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[11px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 disabled:opacity-50"
                  >
                    {busyKey === c.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} CSV
                  </button>
                )}
              </div>
              <p className="mt-3 text-[13px] font-medium text-neutral-900">{c.title}</p>
              <p className="mt-1 flex-1 text-[12px] leading-relaxed text-neutral-500">{c.desc}</p>
              <Link to={c.to} className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-neutral-700 transition hover:text-neutral-900">
                Open module <ExternalLink size={11} className="opacity-50" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
