import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, RefreshCw } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import OrderProfitability from './finance/OrderProfitability';
import { BreakEven, CodExposure, ProfitByCustomer, ProfitByProduct } from './finance/ProfitTables';
import { exportPnlReport } from './finance/exportPnl';
import { btnGhost, btnSolid, EditorialError, TableSkeleton } from './orders/orderUi';
import { monoAxis, monoGrid, monoTooltip } from './analytics/charts';

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

    // Real loss on failed orders. A cancellation before dispatch costs nothing;
    // once the parcel is with the courier that money is gone, and a return
    // bills both legs. Reporting these as "PKR 0" understated the damage.
    const oc0 = settings?.operatingCosts || {};
    const courierRate = Number(oc0.defaultCourierCost) || Number(oc0.shippingSubsidy) || 0;
    const packRate = Number(oc0.packingPerOrder) || 0;
    const returnMult = Number(oc0.returnCourierMultiplier) > 0 ? Number(oc0.returnCourierMultiplier) : 2;
    const SHIPPED = new Set(['Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Completed', 'Failed Delivery', 'Returned']);
    const failed = inRange.filter((o) => ['Cancelled', 'Refunded'].includes(o.status));
    let lostBeforeShip = 0, lostAfterShip = 0, lostBeforeCost = 0, lostAfterCost = 0;
    for (const o of failed) {
      const ts = o.stageTimestamps || {};
      const wasShipped = SHIPPED.has(o.stage)
        || Boolean(ts.Shipped || ts['In Transit'] || ts['Out for Delivery'] || ts.Delivered);
      if (wasShipped) {
        lostAfterShip += 1;
        lostAfterCost += packRate + courierRate * (o.status === 'Refunded' ? returnMult : 1);
      } else {
        lostBeforeShip += 1;
      }
    }
    const failedLoss = lostBeforeCost + lostAfterCost;

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

    // --- Extra advisor rules ------------------------------------------------
    // Failure rate trend: this half of the range vs the previous half.
    const mid = new Date(sinceDate.getTime() + (now - sinceDate) / 2);
    const failRate = (list) => {
      const all = list.length;
      if (!all) return null;
      return list.filter((o) => ['Cancelled', 'Refunded'].includes(o.status)).length / all;
    };
    const recentFail = failRate(inRange.filter((o) => new Date(o.createdAt) >= mid));
    const priorFail = failRate(inRange.filter((o) => new Date(o.createdAt) < mid));
    if (recentFail !== null && priorFail !== null && priorFail > 0 && recentFail > priorFail * 1.25) {
      insights.push({
        tone: 'warn',
        text: `COD cancellations and returns are trending up — ${(recentFail * 100).toFixed(0)}% recently vs ${(priorFail * 100).toFixed(0)}% earlier in this range. A confirmation call before dispatch is the cheapest fix.`,
      });
    }

    // Specific low-margin product, named — more actionable than a global figure.
    const perProduct = new Map();
    for (const o of active) {
      for (const it of o.items || []) {
        const key = it.name || 'Unknown';
        const cur = perProduct.get(key) || { rev: 0, cost: 0, units: 0 };
        const q = Number(it.quantity) || 0;
        cur.rev += Number(it.lineTotal) || 0;
        cur.cost += (Number(it.costPrice) || 0) * q;
        cur.units += q;
        perProduct.set(key, cur);
      }
    }
    const worst = [...perProduct.entries()]
      .filter(([, v]) => v.rev > 0 && v.units >= 2)
      .map(([name, v]) => ({ name, units: v.units, margin: ((v.rev - v.cost) / v.rev) * 100 }))
      .sort((a, b) => a.margin - b.margin)[0];
    if (worst && worst.margin < 25) {
      insights.push({
        tone: 'warn',
        text: `${worst.name} sells well (${worst.units} units) but only returns a ${worst.margin.toFixed(0)}% margin. Re-price it or renegotiate the unit cost.`,
      });
    }

    // Courier cost per order drifting up.
    const courierPerOrder = orderCount > 0 ? shipSubsidy / orderCount : 0;
    if (courierPerOrder > 0 && aov > 0 && courierPerOrder / aov > 0.12) {
      insights.push({
        tone: 'warn',
        text: `Courier costs eat ${((courierPerOrder / aov) * 100).toFixed(0)}% of an average order. Negotiating a volume rate, or nudging basket size up, recovers this directly.`,
      });
    }

    // Real money lost on failed orders.
    if (lostAfterCost > 0) {
      insights.push({
        tone: 'warn',
        text: `${lostAfterShip} order${lostAfterShip === 1 ? '' : 's'} failed after dispatch, costing ${pkr(lostAfterCost)} in courier and packaging you cannot recover.`,
      });
    }

    return {
      revenue, cogs, packingTotal, shipSubsidy, adsTotal, seoTotal, otherTotal, totalExpense,
      grossProfit, netProfit, margin, grossMargin, aov, orderCount, itemCount,
      refunded, cancelled,
      lostBeforeShip, lostAfterShip, lostAfterCost, failedLoss,
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
    a.download = `hushae-finance-${rangeMeta.key}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const actions = (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            disabled={busy}
            className={range === r.key ? btnSolid : btnGhost}
          >{r.label}</button>
        ))}
      </div>
      <button type="button" onClick={load} disabled={busy} className={btnGhost}>
        <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
      </button>
      {summary && (
        <>
          <button
            type="button"
            onClick={() => exportPnlReport({ summary, rangeLabel: rangeMeta.label, sinceDate, until: now })}
            className={btnGhost}
          >
            <FileText size={12} /> P&amp;L
          </button>
          <button type="button" onClick={exportCsv} className={btnSolid}>
            <Download size={12} /> Export
          </button>
        </>
      )}
    </>
  );

  if (err) {
    return (
      <AdminLayout title="Finance">
        <PageHeader title="Finance" description="Profit, cost and cash." />
        <EditorialError title="Unable to load finance" description={err} onRetry={() => { setErr(''); load(); }} />
      </AdminLayout>
    );
  }
  if (!summary) {
    return (
      <AdminLayout title="Finance">
        <PageHeader title="Finance" description="Profit, cost and cash." actions={actions} />
        <TableSkeleton rows={8} />
      </AdminLayout>
    );
  }

  const signed = (n) => (n < 0 ? `↓ ${pkr(n)}` : pkr(n));

  const kpis = [
    { label: 'Revenue', value: pkr(summary.revenue), sub: `${summary.orderCount} order${summary.orderCount === 1 ? '' : 's'}` },
    { label: 'Net profit', value: signed(summary.netProfit), sub: `${summary.margin.toFixed(1)}% net margin` },
    { label: 'Gross profit', value: pkr(summary.grossProfit), sub: `${summary.grossMargin.toFixed(1)}% gross margin` },
    { label: 'Aov', value: pkr(summary.aov), sub: `${summary.itemCount} items sold` },
    { label: 'Cost', value: pkr(summary.totalExpense), sub: 'COGS + costs + ads' },
    { label: 'Failed after ship', value: summary.lostAfterCost > 0 ? `↓ ${pkr(summary.lostAfterCost)}` : pkr(0), sub: `${summary.lostBeforeShip} before · ${summary.lostAfterShip} after` },
  ];

  return (
    <AdminLayout title="Finance">
      <PageHeader title="Finance" description="Profit, cost and cash." actions={actions} />

      <section className="mb-10">
        <p className="adm-index">01 — Performance</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((x) => (
            <div key={x.label} className="px-4 py-6 sm:px-5">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[20px] leading-none text-black xl:text-[24px]">{x.value}</p>
              <p className="mt-2 text-[11px] text-[#AAAAAA]">{x.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Cash flow</p>
        <p className="mb-4 text-[12px] text-[#AAAAAA]">Revenue vs cost of goods, day by day.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.daily} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...monoGrid} />
              <XAxis dataKey="label" {...monoAxis} interval="preserveStartEnd" />
              <YAxis {...monoAxis} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
              <Tooltip
                {...monoTooltip}
                formatter={(v, k) => [pkr(v), k === 'revenue' ? 'Revenue' : k === 'cogs' ? 'COGS' : 'Profit']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#FFFFFF" strokeWidth={1.8} fill="rgba(255,255,255,0.10)" fillOpacity={1} />
              <Area type="monotone" dataKey="cogs" stroke="rgba(255,255,255,0.45)" strokeWidth={1.4} fill="rgba(255,255,255,0.04)" fillOpacity={1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.16em] text-[#999999]">
          <span className="inline-flex items-center gap-2"><span className="h-px w-4 bg-white" /> Revenue</span>
          <span className="inline-flex items-center gap-2"><span className="h-px w-4 bg-white/40" /> Cost of goods</span>
        </div>
      </section>

      <div className="mb-10 grid gap-10 lg:grid-cols-2">
        <ExpenseList summary={summary} />
        <PaymentList mix={summary.paymentMix} />
      </div>

      <OrderProfitability days={rangeDays} />

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <ProfitByProduct days={rangeDays} />
        <ProfitByCustomer days={rangeDays} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <CodExposure />
        <BreakEven days={rangeDays} />
      </div>

      <section className="mt-10">
        <p className="adm-index">08 — Advisor</p>
        {summary.insights.length === 0 ? (
          <p className="border-y border-[#EAEAEA] py-8 text-[13px] text-[#AAAAAA]">Everything is on track for this period — check back after more orders come in.</p>
        ) : (
          <div className="divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
            {summary.insights.map((it, i) => (
              <div key={i} className="flex items-start gap-4 py-4">
                <span className="mt-0.5 shrink-0 text-[10px] uppercase tracking-[0.18em] text-[#AAAAAA]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[13px] leading-relaxed text-[#333333]">{it.text}</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-[#AAAAAA]">
          Net profit = Revenue − (COGS + packing + courier subsidy + prorated ads + SEO + other). Fixed monthly costs are prorated across the selected date range. Set costs in{' '}
          <Link to="/admin/settings/shipping" className="text-[#777777] underline decoration-white/20 underline-offset-4 hover:text-black">Settings → Shipping &amp; Operating Costs</Link>.
        </p>
      </section>
    </AdminLayout>
  );
}

function RankedMoney({ title, hint, rows, empty }) {
  const total = rows.reduce((n, d) => n + d.value, 0);
  return (
    <section>
      <p className="adm-index">{title}</p>
      <p className="mb-4 text-[12px] text-[#AAAAAA]">{hint}</p>
      {total === 0 ? (
        <p className="border-y border-[#EAEAEA] py-8 text-[12px] leading-relaxed text-[#AAAAAA]">{empty}</p>
      ) : (
        <ul>
          {rows.sort((a, b) => b.value - a.value).map((d) => (
            <li key={d.name} className="flex items-center gap-3 border-b border-[#F0F0F0] py-2.5">
              <span className="min-w-0 flex-1 truncate text-[12px] text-white/75">{d.name}</span>
              <span className="text-[12px] tabular-nums text-black">{pkr(d.value)}</span>
              <span className="w-10 text-right text-[11px] tabular-nums text-[#AAAAAA]">{((d.value / total) * 100).toFixed(0)}%</span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-[#DCDCDC] py-3">
            <span className="adm-label">Total</span>
            <span className="adm-metric text-[16px] text-black">{pkr(total)}</span>
          </li>
        </ul>
      )}
    </section>
  );
}

function ExpenseList({ summary }) {
  const data = [
    { name: 'Cost of goods', value: summary.cogs },
    { name: 'Packing', value: summary.packingTotal },
    { name: 'Courier subsidy', value: summary.shipSubsidy },
    { name: 'Ads', value: summary.adsTotal },
    { name: 'SEO / Content', value: summary.seoTotal },
    { name: 'Other fixed', value: summary.otherTotal },
  ].filter((d) => d.value > 0);
  return (
    <RankedMoney
      title="03 — Cost"
      hint="Where the money goes in this period."
      rows={data}
      empty="No expenses recorded yet. Set cost prices on products and operating costs in Settings to see this breakdown."
    />
  );
}

function PaymentList({ mix }) {
  const data = Object.entries(mix).map(([name, value]) => ({ name, value }));
  return (
    <RankedMoney
      title="04 — Payment"
      hint="Revenue by how customers paid."
      rows={data}
      empty="No paid orders in this range."
    />
  );
}
