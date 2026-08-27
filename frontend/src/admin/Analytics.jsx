import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { ctlInline, EditorialError, TableSkeleton } from './orders/orderUi';
import { MonoLine, RankedBars } from './analytics/charts';
import LiveView from './LiveView';

const RANGES = [
  { v: 'today', label: 'Today' },
  { v: '7d', label: 'Last 7 days' },
  { v: '30d', label: 'Last 30 days' },
  { v: '90d', label: 'Last 90 days' },
  { v: 'all', label: 'All time' },
  { v: 'custom', label: 'Custom range' },
];

const REPORT_CATEGORIES = [
  { key: 'sales', label: 'Sales', icon: '💰', desc: 'Revenue trends, orders over time, by payment method and city.', metric: 'Revenue' },
  { key: 'customers', label: 'Customers', icon: '👥', desc: 'New vs returning buyers, top cities, and customer profiles.', metric: 'Customers' },
  { key: 'marketing', label: 'Marketing', icon: '📣', desc: 'Campaign performance, traffic sources, and attribution.', metric: 'Sessions' },
  { key: 'traffic', label: 'Acquisition & Traffic', icon: '🔍', desc: 'Sessions, bounce rate, top pages, and referrer breakdown.', metric: 'Sessions' },
  { key: 'finance', label: 'Finance', icon: '💳', desc: 'Payouts, refunds, payment failures, and transaction records.', metric: 'Revenue' },
  { key: 'inventory', label: 'Inventory', icon: '📦', desc: 'Stock levels, low stock alerts, and inventory movement history.', metric: 'Items' },
];

export default function Analytics() {
  const { auth, logout } = useApp();
  const [tab, setTab] = useState('dashboard'); // dashboard | reports | live
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [a, setA] = useState(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setA(null); setErr('');
    const qs = range === 'custom' ? `range=custom&from=${customFrom}&to=${customTo}` : `range=${range}`;
    api(`/analytics/overview?${qs}`, { token: auth.token })
      .then(setA)
      .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Failed to load analytics — please try again.'); });
  }, [auth, range, tick]); // eslint-disable-line

  const handleRangeChange = (v) => {
    setRange(v);
  };

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={range}
        onChange={(e) => setRange(e.target.value)}
        className={`${ctlInline} w-auto`}
        aria-label="Date range"
      >
        {RANGES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
      </select>
      {range === 'custom' && (
        <>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={`${ctlInline} [color-scheme:dark]`} aria-label="From" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-white/30">to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={`${ctlInline} [color-scheme:dark]`} aria-label="To" />
        </>
      )}
    </div>
  );

  const delta = (v, p) => {
    if (!a?.prev) return null;
    if (p === 0) return v > 0 ? { txt: 'new', up: true } : { txt: '0%', up: null };
    const pc = Math.round(((v - p) / p) * 100);
    return { txt: `${pc >= 0 ? '+' : ''}${pc}%`, up: pc >= 0 };
  };
  const Delta = ({ d }) => {
    if (!d) return null;
    if (d.up === null) return <span className="ml-2 text-[11px] uppercase tracking-[0.12em] text-white/30">{d.txt}</span>;
    return (
      <span className={`ml-2 text-[11px] tabular-nums ${d.up ? 'text-white/55' : 'text-white/30'}`}>
        {d.up ? '↑' : '↓'} {d.txt}
      </span>
    );
  };

  const kpis = [
    { label: 'Revenue', value: pkr(a?.kpis?.revenue ?? 0), d: delta(a?.kpis?.revenue, a?.prev?.revenue) },
    { label: 'Orders', value: a?.kpis?.orders ?? 0, d: delta(a?.kpis?.orders, a?.prev?.orders) },
    { label: 'AOV', value: pkr(a?.kpis?.aov ?? 0) },
    { label: 'Items sold', value: a?.kpis?.itemsSold ?? 0 },
    { label: 'Sessions', value: a?.kpis?.sessions ?? 0 },
    { label: 'Conversion', value: `${a?.kpis?.conversion ?? 0}%` },
  ];

  const catName = (s) => s?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';

  // TABS
  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'reports', label: 'Reports' },
    { key: 'live', label: 'Live View' },
  ];

  return (
    <AdminLayout title="Analytics">
      <PageHeader
        title="Analytics"
        description="Store performance and business intelligence."
        actions={controls}
      />

      {/* Tab Bar — Shopify style */}
      <div className="mb-8 flex items-center gap-1 border-b border-[#EAEAEA]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors ${
              tab === t.key
                ? 'border-b-2 border-black text-black'
                : 'text-[#777777] hover:text-black'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── DASHBOARD TAB ─── */}
      {tab === 'dashboard' && (
        <>
          {err ? (
            <EditorialError title="Unable to load analytics" description={err} onRetry={loadData} />
          ) : !a ? (
            <TableSkeleton rows={8} />
          ) : (
            <>
              {a.prev && range !== 'custom' && (
                <p className="mb-8 text-[11px] uppercase tracking-[0.14em] text-white/30">
                  Compared with the previous {RANGES.find((r) => r.v === range)?.label.toLowerCase()}
                </p>
              )}

              <section className="mb-10">
                <p className="adm-index">01 — Performance</p>
                <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 sm:grid-cols-3 xl:grid-cols-6">
                  {kpis.map((x) => (
                    <div key={x.label} className="px-4 py-6 sm:px-5">
                      <p className="adm-label">{x.label}</p>
                      <p className="adm-metric mt-3 text-[22px] leading-none text-white xl:text-[26px]">
                        {x.value}
                        <Delta d={x.d} />
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-10">
                <p className="adm-index">02 — Sales</p>
                <div className="mb-8">
                  <p className="adm-label mb-4">Revenue over time</p>
                  <MonoLine data={a.series} k="revenue" fmt={(v) => pkr(v)} />
                </div>
                <div className="mb-8">
                  <p className="adm-label mb-4">Orders over time</p>
                  <MonoLine data={a.series} k="orders" height={160} />
                </div>
                <div className="grid gap-10 lg:grid-cols-2">
                  <div>
                    <p className="adm-label mb-3">By payment</p>
                    <RankedBars rows={(a.byPayment || []).map((p) => ({ label: p.method, value: p.revenue }))} fmt={(v) => pkr(v)} />
                  </div>
                  <div>
                    <p className="adm-label mb-3">By status</p>
                    <RankedBars rows={(a.byStatus || []).map((s) => ({ label: s.status, value: s.count }))} />
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <p className="adm-index">03 — Customers</p>
                <div className="adm-divide-x mb-8 grid grid-cols-2 border-y border-white/10">
                  <div className="px-5 py-6">
                    <p className="adm-label">First-time buyers</p>
                    <p className="adm-metric mt-3 text-[32px] leading-none text-white">{a.customerSplit?.fresh ?? 0}</p>
                  </div>
                  <div className="px-5 py-6">
                    <p className="adm-label">Returning buyers</p>
                    <p className="adm-metric mt-3 text-[32px] leading-none text-white">{a.customerSplit?.returning ?? 0}</p>
                  </div>
                </div>
                <p className="adm-label mb-3">Orders by city</p>
                <RankedBars rows={(a.orderCities || []).map((c) => ({ label: c.city, value: c.orders }))} />
              </section>

              <section className="mb-10">
                <p className="adm-index">04 — Products</p>
                <div className="grid gap-10 lg:grid-cols-2">
                  <div>
                    <p className="adm-label mb-3">By product</p>
                    <RankedBars rows={(a.topProducts || []).map((p) => ({ label: p.name, value: p.revenue, sub: `· ${p.qty}` }))} fmt={(v) => pkr(v)} />
                  </div>
                  <div>
                    <p className="adm-label mb-3">By category</p>
                    <RankedBars rows={(a.byCategory || []).map((c) => ({ label: catName(c.cat), value: c.revenue }))} fmt={(v) => pkr(v)} />
                  </div>
                </div>
              </section>

              <section>
                <p className="adm-index">05 — Traffic</p>
                <div className="mb-8">
                  <p className="adm-label mb-4">Sessions over time</p>
                  <MonoLine data={a.traffic?.sessionsSeries || []} k="sessions" height={160} />
                </div>
                <div className="grid gap-10 lg:grid-cols-2">
                  <div>
                    <p className="adm-label mb-3">By device</p>
                    <RankedBars rows={(a.traffic?.byDevice || []).map((d) => ({ label: d.device, value: d.sessions }))} />
                  </div>
                  <div>
                    <p className="adm-label mb-3">By city</p>
                    <RankedBars rows={(a.traffic?.visitCities || []).map((c) => ({ label: c.city, value: c.sessions }))} empty="City data visits aane par dikhegi" />
                  </div>
                  <div>
                    <p className="adm-label mb-3">Top pages</p>
                    <RankedBars rows={(a.traffic?.landing || []).map((l) => ({ label: l.path, value: l.views }))} />
                  </div>
                  <div>
                    <p className="adm-label mb-3">Referrers</p>
                    <RankedBars
                      rows={(a.traffic?.refs || []).map((r) => ({ label: r.ref?.replace(/^https?:\/\//, '').slice(0, 38) || '', value: r.views }))}
                      empty="All traffic is direct so far — once links are shared, sources will appear here"
                    />
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* ─── REPORTS TAB ─── */}
      {tab === 'reports' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REPORT_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="border border-[#EAEAEA] p-5 hover:border-black transition-colors cursor-pointer group"
                onClick={() => {/* TODO: drill into specific report */}}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[20px]" role="img" aria-label={cat.label}>{cat.icon}</span>
                </div>
                <p className="text-[13px] font-semibold text-black mb-1">{cat.label}</p>
                <p className="text-[12px] text-[#777777] leading-relaxed">{cat.desc}</p>
                <div className="mt-4 pt-3 border-t border-[#EAEAEA] flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[#999999]">Primary metric</span>
                  <span className="text-[11px] font-medium text-black">{cat.metric}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border border-[#EAEAEA] px-6 py-5">
            <p className="adm-eyebrow mb-2">Pro tip</p>
            <p className="text-[12px] text-[#777777] leading-relaxed">
              Click on any category above to see detailed reports. More granular reports (by product variant, by hour, by cohort) will be added in a future update. Export data as CSV from the Dashboard tab.
            </p>
          </div>
        </>
      )}

      {/* ─── LIVE VIEW TAB ─── */}
      {tab === 'live' && <LiveView />}
    </AdminLayout>
  );
}
