import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, BarChart3, Globe, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';

/* ============================================================================
 * ANALYTICS OVERVIEW — Phase 8: Unified Business Intelligence
 * Every metric from shared analyticsService.js definitions.
 * ========================================================================== */

const RANGES = [
  { v: '7d', label: '7 days' },
  { v: '30d', label: '30 days' },
  { v: '90d', label: '90 days' },
  { v: 'this_year', label: 'This year' },
  { v: 'all', label: 'All time' },
];

function KpiCard({ label, value, growth, icon: Icon, format = 'number' }) {
  const display = format === 'money' ? pkr(value) : typeof value === 'number' ? value.toLocaleString() : value;
  const hasGrowth = growth !== null && growth !== undefined;
  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</p>
        {Icon && <Icon size={14} strokeWidth={1.5} className="text-[#DCDCDC]" />}
      </div>
      <p className="mt-3 text-[24px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</p>
      {hasGrowth && (
        <div className="mt-2 flex items-center gap-1">
          {growth >= 0 ? <ArrowUpRight size={12} className="text-black" /> : <ArrowDownRight size={12} className="text-[#777777]" />}
          <span className={`text-[11px] font-medium ${growth >= 0 ? 'text-black' : 'text-[#777777]'}`}>{Math.abs(growth)}%</span>
          <span className="text-[10px] text-[#AAAAAA]">vs prev period</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white">
      <div className="border-b border-[#EAEAEA] px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Analytics() {
  const { auth, toast } = useApp();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api(`/analytics/overview?range=${range}`, { token: auth.token });
      setData(d);
    } catch { toast('Failed to load analytics'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [range]); // eslint-disable-line

  if (loading) return <AdminLayout title="Analytics"><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 v2-skeleton rounded-md" />)}</div></AdminLayout>;

  const k = data?.kpis || {};
  const series = data?.series || [];
  const top = data?.topProducts || [];
  const status = data?.breakdowns?.status || {};
  const payment = data?.breakdowns?.payment || {};
  const cities = data?.breakdowns?.cities || [];
  const funnel = data?.funnel || {};

  return (
    <AdminLayout title="Analytics">
      <PageHeader
        title="Analytics"
        description="Unified business intelligence — revenue, customers, products, orders."
      />

      {/* Date range */}
      <div className="mb-6 flex gap-2">
        {RANGES.map(r => (
          <button key={r.v} onClick={() => setRange(r.v)}
            className={`rounded-md px-4 py-2 text-[12px] font-medium transition ${range === r.v ? 'bg-black text-white' : 'border border-[#EAEAEA] text-[#555555] hover:border-[#DCDCDC]'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Primary KPIs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={k.revenue || 0} growth={k.revenueGrowth} icon={TrendingUp} format="money" />
        <KpiCard label="Orders" value={k.orders || 0} growth={k.ordersGrowth} icon={ShoppingBag} />
        <KpiCard label="AOV" value={k.aov || 0} icon={BarChart3} format="money" />
        <KpiCard label="New Customers" value={k.newCustomers || 0} icon={Users} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Unique Customers" value={k.uniqueCustomers || 0} />
        <KpiCard label="Repeat Rate" value={`${k.repeatRate || 0}%`} />
        <KpiCard label="Refunds" value={k.refunds || 0} format="money" />
        <KpiCard label="Discounts Given" value={k.discounts || 0} format="money" />
      </div>

      {/* Sales Trend Chart */}
      {series.length > 1 && (
        <div className="mb-6">
          <Section title="Sales Trend">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#000000" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#000000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#AAAAAA' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#AAAAAA' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #EAEAEA', background: '#FFF', fontSize: 12 }} formatter={(v, name) => [name === 'revenue' ? pkr(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                  <Area type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={2} fill="url(#rev-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      )}

      {/* Orders Trend */}
      {series.length > 1 && (
        <div className="mb-6">
          <Section title="Orders Trend">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#AAAAAA' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#AAAAAA' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #EAEAEA', background: '#FFF', fontSize: 12 }} />
                  <Bar dataKey="orders" fill="#DCDCDC" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      )}

      {/* Breakdowns */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Section title="Top Products">
          {top.length === 0 ? <p className="text-[13px] text-[#AAAAAA]">No product data in this period.</p> : (
            <div className="space-y-3">
              {top.slice(0, 8).map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 text-[14px] font-semibold text-[#DCDCDC]" style={{ fontVariantNumeric: 'tabular-nums' }}>{String(i+1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-black">{p.name}</p>
                    <p className="text-[11px] text-[#999999]">{p.qty} units</p>
                  </div>
                  <p className="text-[13px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(p.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Order Status */}
        <Section title="Orders by Status">
          <div className="space-y-2">
            {Object.entries(status).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-[13px] text-[#555555]">{s}</span>
                <span className="text-[13px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Payment Methods */}
        <Section title="Revenue by Payment Method">
          <div className="space-y-2">
            {Object.entries(payment).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
              <div key={m} className="flex items-center justify-between">
                <span className="text-[13px] text-[#555555]">{m}</span>
                <span className="text-[13px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(v)}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Top Cities */}
        <Section title="Revenue by City">
          {cities.length === 0 ? <p className="text-[13px] text-[#AAAAAA]">No city data.</p> : (
            <div className="space-y-2">
              {cities.slice(0, 8).map(c => (
                <div key={c.city} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#555555]">{c.city}</span>
                  <span className="text-[13px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(c.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Conversion Funnel */}
      {(funnel.pageviews || 0) > 0 && (
        <Section title="Conversion Funnel">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Pageviews', value: funnel.pageviews },
              { label: 'Add to Cart', value: funnel.addToCart },
              { label: 'Checkout', value: funnel.checkout },
              { label: 'Purchased', value: funnel.purchased },
            ].map((s, i) => (
              <div key={s.label} className="rounded-md border border-[#EAEAEA] p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{s.label}</p>
                <p className="mt-2 text-[20px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{(s.value || 0).toLocaleString()}</p>
                {i > 0 && funnel.pageviews > 0 && (
                  <p className="mt-1 text-[11px] text-[#AAAAAA]">{Math.round((s.value / funnel.pageviews) * 100)}% of views</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Quick Links */}
      <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { to: '/admin/insights', label: 'Deep Insights' },
          { to: '/admin/reports', label: 'Reports' },
          { to: '/admin/finance', label: 'Finance & P&L' },
          { to: '/admin/search-analytics', label: 'Search Analytics' },
          { to: '/admin/live', label: 'Live View' },
          { to: '/admin/growth', label: 'Growth' },
        ].map(l => (
          <Link key={l.label} to={l.to} className="rounded-md border border-[#EAEAEA] p-3 text-center text-[12px] font-medium text-black transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA]">
            {l.label}
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
