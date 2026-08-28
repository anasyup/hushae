import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Banknote, Boxes, Calculator, CreditCard, Download, FileSearch,
  Loader2, Package, RotateCcw, ShoppingCart, Tag, TrendingUp, Truck, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import styles from './Reports.module.css';

/* ============================================================================
 * REPORTS — ATELIER design language (Overview family).
 * Same tokens, type scale, radii and hover language as Overview.module.css,
 * light + dark-admin parity. Live stat cards on real data + grouped export
 * directory. CSV exports unchanged: every file opens directly in Excel.
 * ========================================================================== */

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const cx = (...names) => names.map((n) => styles[n]).join(' ');

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

/* Count-up for stat values — same feel as the Overview dashboard. */
function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined) return undefined;
    const dur = 750;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function StatCard({ icon: Icon, label, value, sub, chip, chipTone, delay }) {
  return (
    <div className={styles.stat} style={{ animationDelay: `${delay}s` }}>
      <div className={styles['stat-head']}>
        <Icon size={14} strokeWidth={1.8} />
        {label}
      </div>
      <div className={styles['stat-val']}>{value}</div>
      <div className={styles['stat-sub']}>
        {sub}
        {chip && <span className={cx('stat-chip', chipTone === 'amber' ? 'amber' : 'green')}>{chip}</span>}
      </div>
    </div>
  );
}

export default function Reports() {
  const { auth, toast } = useApp();
  const [busyKey, setBusyKey] = useState(null);
  const [stats, setStats] = useState(null);   // null = loading
  const [statsErr, setStatsErr] = useState(false);

  /* Live directory stats — all admin-authed, tolerant of failure. */
  useEffect(() => {
    let alive = true;
    Promise.all([
      api('/orders/manage/counts', { token: auth.token }),
      api('/admin/customers', { token: auth.token }),
      api('/admin/dashboard', { token: auth.token }),
    ])
      .then(([oc, cust, dash]) => {
        if (!alive) return;
        const customers = Array.isArray(cust) ? cust.length : (cust?.customers?.length ?? null);
        setStats({
          orders: oc?.total ?? null,
          revenue: oc?.revenue ?? null,
          customers,
          lowStock: Array.isArray(dash?.lowStock) ? dash.lowStock.length : null,
        });
      })
      .catch(() => { if (alive) { setStats(null); setStatsErr(true); } });
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const oCount = useCountUp(stats?.orders ?? 0);
  const rCount = useCountUp(stats?.revenue ?? 0);
  const cCount = useCountUp(stats?.customers ?? 0);
  const lCount = useCountUp(stats?.lowStock ?? 0);

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
    Orders: c.orders ?? c.orderCount ?? '', Spent: c.spent ?? c.totalSpent ?? '', Status: c.isActive === false ? 'Inactive' : 'Active',
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

  const GROUPS = [
    {
      key: 'financial', title: 'Financial', icon: Banknote,
      rows: [
        { id: 'sales', icon: TrendingUp, title: 'Sales report', desc: 'Revenue, orders and AOV trends — full P&L view.', to: '/admin/finance', primary: true },
        { id: 'orders', icon: ShoppingCart, title: 'Orders report', desc: 'All orders with filters — export the current view as CSV.', to: '/admin/orders', onExport: downloadOrdersCsv, primary: true },
        { id: 'payments', icon: CreditCard, title: 'Payment reconciliation', desc: 'Transactions, capture and refund status.', to: '/admin/payments' },
        { id: 'refunds', icon: RotateCcw, title: 'Refund & return report', desc: 'Return cases and refund ledger.', to: '/admin/ops/returns' },
      ],
    },
    {
      key: 'catalog', title: 'Catalog & Operations', icon: Boxes,
      rows: [
        { id: 'products', icon: Package, title: 'Product report', desc: 'SKU, price, stock and status for the full catalog.', to: '/admin/products',
          onExport: () => run('products', () => api('/products/admin/list?limit=500', { token: auth.token }), productMapper, 'hushae-products') },
        { id: 'inventory', icon: Boxes, title: 'Inventory report', desc: 'Available vs reserved stock per SKU and warehouse.', to: '/admin/ops/inventory',
          onExport: () => run('inventory', () => api('/ops/stock', { token: auth.token }), stockMapper, 'hushae-inventory') },
        { id: 'shipping', icon: Truck, title: 'Shipping report', desc: 'Zones, rates and fulfillment rules.', to: '/admin/settings/shipping' },
        { id: 'tax', icon: Calculator, title: 'Tax report', desc: 'Global rate and per-zone configuration.', to: '/admin/settings/taxes' },
      ],
    },
    {
      key: 'growth', title: 'Customers & Activity', icon: Users,
      rows: [
        { id: 'customers', icon: Users, title: 'Customer report', desc: 'Customer directory — orders, spend and status.', to: '/admin/customers',
          onExport: () => run('customers', () => api('/admin/customers', { token: auth.token }), customerMapper, 'hushae-customers') },
        { id: 'discounts', icon: Tag, title: 'Discount report', desc: 'Codes, types, usage and limits.', to: '/admin/discounts',
          onExport: () => run('discounts', () => api('/discounts', { token: auth.token }), discountMapper, 'hushae-discounts') },
        { id: 'staff', icon: FileSearch, title: 'Staff activity report', desc: 'Audit trail — who did what, when.', to: '/admin/settings/security',
          onExport: () => run('staff', () => api('/security/audit-logs?limit=200', { token: auth.token }), auditMapper, 'hushae-staff-activity') },
      ],
    },
  ];

  const statVal = (raw) => (raw === null || raw === undefined ? (statsErr ? '—' : <span className={cx('skeleton')} style={{ display: 'inline-block', width: 64, height: 16 }} />) : raw);

  return (
    <AdminLayout title="Reports">
      <div className={styles.rpw}>
        {/* ── Head ─────────────────────────────────────────────── */}
        <div className={styles.head}>
          <div className={styles['head-left']}>
            <p className={styles.eyebrow}>Reports</p>
            <h1 className={styles.title}>Exportable operational &amp; financial reports</h1>
            <p className={styles.sub}>
              Eleven ready-made reports across finance, catalog and customers — export any of them
              as a CSV that opens directly in Excel.
            </p>
          </div>
          <p className={styles['head-note']}>
            <span className={styles['live-dot']} />
            Live store data · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Live stats ───────────────────────────────────────── */}
        <div className={styles.stats}>
          <StatCard icon={ShoppingCart} label="Orders" value={statVal(stats ? oCount.toLocaleString('en-US') : null)}
            sub="Total in the pipeline" chip={stats ? 'Live' : ''} chipTone="green" delay={0.04} />
          <StatCard icon={Banknote} label="Revenue" value={statVal(stats ? pkr(rCount) : null)}
            sub="Order value, all time" chip={stats ? 'PKR' : ''} delay={0.09} />
          <StatCard icon={Users} label="Customers" value={statVal(stats ? cCount.toLocaleString('en-US') : null)}
            sub="Registered accounts" delay={0.14} />
          <StatCard icon={AlertTriangle} label="Low stock SKUs" value={statVal(stats ? lCount.toLocaleString('en-US') : null)}
            sub="At or below reorder point" chip={stats && lCount > 0 ? 'Action' : ''} chipTone="amber" delay={0.19} />
        </div>

        {/* ── Directory ────────────────────────────────────────── */}
        <div className={styles.groups}>
          {GROUPS.map((g, gi) => (
            <section key={g.key} className={styles.group} aria-label={g.title}>
              <div className={styles['group-h']}>
                <span className={styles['group-ico']}><g.icon size={13} strokeWidth={1.8} /></span>
                <span className={styles['group-t']}>{g.title}</span>
                <span className={styles['group-n']}>{String(gi + 1).padStart(2, '0')} · {g.rows.length} reports</span>
              </div>
              {g.rows.map((c, i) => (
                <div key={c.id} className={styles.row}>
                  <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles['row-body']}>
                    <p className={styles['row-t']}><c.icon className={styles['row-ico']} strokeWidth={1.8} />{c.title}</p>
                    <p className={styles['row-d']}>{c.desc}</p>
                  </div>
                  <div className={styles['row-actions']}>
                    {c.onExport && (
                      <button
                        type="button"
                        onClick={c.onExport}
                        disabled={busyKey === c.id}
                        className={styles.btn}
                      >
                        {busyKey === c.id ? <Loader2 className="animate-spin" /> : <Download />}
                        CSV
                      </button>
                    )}
                    <Link to={c.to} className={styles['btn-dark']}>
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        {/* ── Footer note ──────────────────────────────────────── */}
        <div className={styles.note}>
          <p>CSV exports are UTF-8 with a BOM, so Excel opens them with correct characters on the first try.</p>
          <p><code>hushae-{new Date().toISOString().slice(0, 10)}.csv</code></p>
        </div>
      </div>
    </AdminLayout>
  );
}
