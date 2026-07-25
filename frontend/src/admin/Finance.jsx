import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BadgePercent, Banknote, Boxes,
  Calendar, CircleDollarSign, Coins, Download, FileText, Info, PieChart as PieIcon,
  RefreshCw, ShoppingBag, Target, TrendingDown, TrendingUp, Truck, Wallet, XCircle,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * FINANCE — Business Advisor page.
 * Original design (not a copy of any single seller-portal). Gives the owner
 * a single screen that answers: "Am I actually profitable? Where does my money
 * come from and where does it go?"
 *
 * Sections:
 *   1. Range picker (7/30/90/YTD)
 *   2. 6 headline KPIs (Revenue, Net Profit, Margin, AOV, Orders, Refunds)
 *   3. Cash-flow chart (revenue vs cost stacked area over time)
 *   4. Expense breakdown (donut: COGS / Packing / Shipping subsidy / Ads / SEO / Other)
 *   5. Payment method mix (donut) + Order stage funnel
 *   6. Auto-generated advisor insights ("💡 Ads are 32% of revenue — try
 *      lowering CPA on Meta or shift to influencers")
 *   7. Export CSV (last-N-days orders)
 * ========================================================================== */

const RANGES = [
  { key: '7',   label: 'Last 7 days',  days: 7 },
  { key: '30',  label: 'Last 30 days', days: 30 },
  { key: '90',  label: 'Last 90 days', days: 90 },
  { key: 'ytd', label: 'Year to date', ytd: true },
];

export default function Finance() {
  const { auth, logout } = useApp();
  const [range, setRange] = useState('30');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setBusy(true);
    try {
      const [o, s] = await Promise.all([
        api('/orders/admin', { token: auth.token }),
        api('/settings'),
      ]);
      setOrders(o.orders || []);
      setSettings(s.settings || {});
      setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      setErr('Could not load finance data.');
    }
    setBusy(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  /* -------------- Date-window helpers -------------- */
  const rangeMeta = RANGES.find((r) => r.key === range) || RANGES[1];
  const now = new Date();
  const sinceDate = (() => {
    if (rangeMeta.ytd) return new Date(now.getFullYear(), 0, 1);
    const d = new Date(now);
    d.setDate(d.getDate() - rangeMeta.days + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const rangeDays = Math.max(1, Math.ceil((now - sinceDate) / 86400000));

  /* -------------- Core computations -------------- */
  const summary = useMemo(() => {
    if (!Array.isArray(orders)) return null;
    const inRange = orders.filter((o) => new Date(o.createdAt) >= sinceDate);
    const active = inRange.filter((o) => !['Cancelled', 'Refunded'].includes(o.status));

    let revenue = 0, cogs = 0, orderCount = active.length, itemCount = 0;
    const paymentMix = {};
    const dailyMap = new Map();

    for (const o of active) {
      revenue += o.total || 0;
      paymentMix[o.paymentMethod] = (paymentMix[o.paymentMethod] || 0) + (o.total || 0);
      for (const it of (o.items || [])) {
        itemCount += it.quantity || 0;
        cogs += (it.costPrice || 0) * (it.quantity || 0);
      }
      const dayKey = new Date(o.createdAt).toISOString().slice(0, 10);
      const cur = dailyMap.get(dayKey) || { date: dayKey, revenue: 0, cogs: 0, orders: 0 };
      cur.revenue += o.total || 0;
      for (const it of (o.items || [])) cur.cogs += (it.costPrice || 0) * (it.quantity || 0);
      cur.orders += 1;
      dailyMap.set(dayKey, cur);
    }

    // Refunds & cancels for the ratio card
    const refunded = inRange.filter((o) => o.status === 'Refunded').reduce((n, o) => n + (o.total || 0), 0);
    const cancelled = inRange.filter((o) => o.status === 'Cancelled').length;

    // Operating costs from settings
    const oc = settings?.operatingCosts || {};
    const packingTotal = (oc.packingPerOrder || 0) * orderCount;
    const shipSubsidy = (oc.shippingSubsidy || 0) * orderCount;
    // Monthly costs — prorate for the range
    const monthsInRange = rangeDays / 30;
    const adsTotal = (oc.monthlyMarketing || 0) * monthsInRange;
    const seoTotal = (oc.monthlySeo || 0) * monthsInRange;
    const otherTotal = (oc.monthlyOther || 0) * monthsInRange;

    const totalExpense = cogs + packingTotal + shipSubsidy + adsTotal + seoTotal + otherTotal;
    const netProfit = revenue - totalExpense;
    const grossProfit = revenue - cogs;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const aov = orderCount > 0 ? revenue / orderCount : 0;

    // Fill daily series
    const daily = [];
    for (let d = new Date(sinceDate); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key) || { date: key, revenue: 0, cogs: 0, orders: 0 };
      daily.push({
        ...row,
        label: new Date(key).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        profit: row.revenue - row.cogs, // gross profit
      });
    }

    // Auto advisor insights
    const insights = [];
    if (revenue === 0) insights.push({ tone: 'neutral', text: 'No orders in this range — try running a small promo to jumpstart traffic.' });
    if (cogs === 0 && revenue > 0) insights.push({ tone: 'warn', text: 'Cost prices are not set on your products. Enter Cost / Wholesale prices to see true profit here.' });
    if (revenue > 0 && cogs > 0) {
      if (margin < 10) insights.push({ tone: 'warn', text: `Net margin is only ${margin.toFixed(1)}% — after ads and packaging you keep less than PKR 10 on every 100. Consider raising prices or trimming ad spend.` });
      else if (margin >= 30) insights.push({ tone: 'good', text: `Excellent net margin of ${margin.toFixed(1)}% — reinvest a share into marketing to accelerate growth.` });
    }
    if (adsTotal > revenue * 0.3 && revenue > 0) insights.push({ tone: 'warn', text: `Ads spend is ${((adsTotal / revenue) * 100).toFixed(0)}% of revenue — target under 20% to stay healthy. Try lower-CPC channels (Instagram organic, TikTok).` });
    if (cancelled / (orderCount + cancelled || 1) > 0.15) insights.push({ tone: 'warn', text: `${cancelled} cancellation${cancelled === 1 ? '' : 's'} in this range. Confirm COD orders by call before shipping to reduce this.` });
    if (aov > 0 && aov < 2000) insights.push({ tone: 'neutral', text: `Average order value is ${pkr(aov)}. A free-shipping threshold at ~PKR ${Math.round(aov * 1.4).toLocaleString()} could nudge customers to add one more piece.` });
    if (orderCount === 0 && cancelled > 0) insights.push({ tone: 'warn', text: 'All orders in this range were cancelled — check if payment methods or product quality is causing drop-off.' });
    if (packingTotal > revenue * 0.05 && packingTotal > 0) insights.push({ tone: 'neutral', text: `Packing costs are ${((packingTotal / revenue) * 100).toFixed(1)}% of revenue — buying materials in bulk usually saves 20-30%.` });

    return {
      revenue, cogs, packingTotal, shipSubsidy, adsTotal, seoTotal, otherTotal, totalExpense,
      grossProfit, netProfit, margin, grossMargin, aov, orderCount, itemCount,
      refunded, cancelled,
      paymentMix, daily, insights,
    };
  }, [orders, settings, range, sinceDate, rangeDays, now]);

  /* -------------- CSV export -------------- */
  const exportCsv = () => {
    if (!Array.isArray(orders)) return;
    const inRange = orders.filter((o) => new Date(o.createdAt) >= sinceDate);
    const rows = [
      ['Order #', 'Date', 'Customer', 'Phone', 'City', 'Status', 'Payment', 'Payment Status', 'Items', 'Subtotal', 'Shipping', 'Discount', 'Total (PKR)', 'COGS (PKR)', 'Profit (PKR)'],
    ];
    for (const o of inRange) {
      const cogs = (o.items || []).reduce((n, it) => n + (it.costPrice || 0) * (it.quantity || 0), 0);
      rows.push([
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerInfo?.name || '',
        o.customerInfo?.phone || '',
        o.customerInfo?.city || '',
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        (o.items || []).reduce((n, it) => n + (it.quantity || 0), 0),
        o.subtotal || 0,
        o.shippingCharge || 0,
        o.discount || 0,
        o.total || 0,
        cogs,
        (o.total || 0) - cogs,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veloura-finance-${rangeMeta.key}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (err) {
    return <AdminLayout title="Finance">
      <div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <XCircle size={22} className="mb-2 text-red-600" />
        <p className="text-sm text-red-700">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">Try again</button>
      </div>
    </AdminLayout>;
  }
  if (!summary) {
    return <AdminLayout title="Finance">
      <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-32" />)}</div>
    </AdminLayout>;
  }

  return (
    <AdminLayout title="Finance">
      {/* --- Range picker + export --- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              disabled={busy}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                range === r.key ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >{r.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* --- 6 headline KPIs --- */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <BigKpi icon={CircleDollarSign} label="Revenue" value={pkr(summary.revenue)} sub={`${summary.orderCount} order${summary.orderCount === 1 ? '' : 's'}`} accent="#059669" />
        <BigKpi
          icon={summary.netProfit >= 0 ? TrendingUp : TrendingDown}
          label="Net profit"
          value={pkr(summary.netProfit)}
          sub={`${summary.margin.toFixed(1)}% net margin`}
          accent={summary.netProfit >= 0 ? '#059669' : '#dc2626'}
          highlight={summary.netProfit < 0}
        />
        <BigKpi icon={Coins} label="Gross profit" value={pkr(summary.grossProfit)} sub={`${summary.grossMargin.toFixed(1)}% gross margin`} accent="#2563eb" />
        <BigKpi icon={Wallet} label="Avg. order value" value={pkr(summary.aov)} sub={`${summary.itemCount} items sold`} accent="#7c3aed" />
        <BigKpi icon={ShoppingBag} label="Total expenses" value={pkr(summary.totalExpense)} sub="COGS + costs + ads" accent="#d97706" />
        <BigKpi icon={AlertTriangle} label="Cancelled + refunds" value={`${summary.cancelled} · ${pkr(summary.refunded)}`} sub="Lost or reversed orders" accent="#dc2626" />
      </div>

      {/* --- Cash-flow chart --- */}
      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Cash flow</p>
            <p className="mt-1 text-[12px] text-neutral-500">Revenue vs cost of goods, day by day.</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fin-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fin-cost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#dc2626" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
              <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v, k) => [pkr(v), k === 'revenue' ? 'Revenue' : k === 'cogs' ? 'COGS' : 'Profit']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.2} fill="url(#fin-rev)" />
              <Area type="monotone" dataKey="cogs"    stroke="#dc2626" strokeWidth={2}   fill="url(#fin-cost)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-neutral-600"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Revenue</span>
          <span className="inline-flex items-center gap-1.5 text-neutral-600"><span className="h-2 w-2 rounded-full bg-red-600" /> Cost of goods</span>
        </div>
      </section>

      {/* --- Expense breakdown + Payment mix --- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ExpenseDonut summary={summary} />
        <PaymentDonut mix={summary.paymentMix} />
      </div>

      {/* --- Business advisor insights --- */}
      <section className="mt-6 rounded-2xl border border-neutral-900 bg-neutral-900 p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Business advisor</p>
            <h3 className="mt-1 font-display text-xl">Recommendations for your store</h3>
          </div>
          <Target size={22} className="text-neutral-400" />
        </div>
        {summary.insights.length === 0 ? (
          <p className="text-[12px] text-neutral-400">Everything is on track for this period — check back after more orders come in.</p>
        ) : (
          <div className="space-y-2.5">
            {summary.insights.map((it, i) => {
              const dot = it.tone === 'warn' ? 'bg-amber-400' : it.tone === 'good' ? 'bg-emerald-400' : 'bg-blue-400';
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <p className="text-[12.5px] leading-relaxed text-neutral-100">{it.text}</p>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-neutral-400">
          <b className="text-neutral-200">How this is calculated:</b> Net profit = Revenue − (COGS + packing + courier subsidy + prorated ads + SEO + other). Fixed monthly costs are prorated across the selected date range. Set costs in <Link to="/admin/settings/shipping" className="underline hover:text-white">Settings → Shipping & Operating Costs</Link>.
        </div>
      </section>
    </AdminLayout>
  );
}

/* ============================================================================
 * Sub-components
 * ========================================================================== */

function BigKpi({ icon: Icon, label, value, sub, accent, highlight }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 transition ${highlight ? 'border-red-200 ring-1 ring-red-100' : 'border-neutral-200'}`}>
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${accent}12`, color: accent }}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1 font-sans text-[22px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}

function ExpenseDonut({ summary }) {
  const data = [
    { name: 'Cost of goods',    value: summary.cogs,         color: '#dc2626' },
    { name: 'Packing',          value: summary.packingTotal, color: '#f59e0b' },
    { name: 'Courier subsidy',  value: summary.shipSubsidy,  color: '#d97706' },
    { name: 'Ads',              value: summary.adsTotal,     color: '#7c3aed' },
    { name: 'SEO / Content',    value: summary.seoTotal,     color: '#2563eb' },
    { name: 'Other fixed',      value: summary.otherTotal,   color: '#64748b' },
  ].filter((d) => d.value > 0);
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Where the money goes</p>
          <p className="mt-1 text-[12px] text-neutral-500">Expense breakdown for this period.</p>
        </div>
        <PieIcon size={16} className="text-neutral-400" />
      </div>
      {total === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] leading-relaxed text-amber-800">
          💡 No expenses recorded yet. Set <b>cost prices</b> on products and <b>operating costs</b> in Settings to see this breakdown.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => pkr(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-sans text-[16px] font-semibold tabular-nums leading-none text-neutral-900">{pkr(total)}</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-neutral-500">Total</p>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5">
            {data.sort((a, b) => b.value - a.value).map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 text-neutral-600">{d.name}</span>
                <span className="font-semibold tabular-nums text-neutral-900">{pkr(d.value)}</span>
                <span className="ml-1 text-[10px] text-neutral-400 tabular-nums">{((d.value / total) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PaymentDonut({ mix }) {
  const palette = { COD: '#059669', JazzCash: '#dc2626', EasyPaisa: '#059669', 'Bank Transfer': '#2563eb' };
  const data = Object.entries(mix).map(([name, value]) => ({ name, value, color: palette[name] || '#64748b' }));
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Payment methods</p>
          <p className="mt-1 text-[12px] text-neutral-500">Revenue by how customers paid.</p>
        </div>
        <BadgePercent size={16} className="text-neutral-400" />
      </div>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">No paid orders in this range.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => pkr(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-sans text-[16px] font-semibold tabular-nums leading-none text-neutral-900">{pkr(total)}</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-neutral-500">Total</p>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5">
            {data.sort((a, b) => b.value - a.value).map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 text-neutral-600">{d.name}</span>
                <span className="font-semibold tabular-nums text-neutral-900">{pkr(d.value)}</span>
                <span className="ml-1 text-[10px] text-neutral-400 tabular-nums">{((d.value / total) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
