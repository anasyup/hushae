import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';

/* Analytics strip shown above the order list. */

const SLICE = ['#0D0D0D', '#7C8B72', '#B4453C', '#2C4A7C', '#C8A96A', '#6B6B6B'];
const RANGES = [{ d: 7, label: '7 days' }, { d: 30, label: '30 days' }, { d: 90, label: '90 days' }];

export default function OrderAnalytics({ token }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setData(null); setErr('');
    api(`/orders/manage/analytics/summary?days=${days}`, { token })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load analytics'); });
    return () => { alive = false; };
  }, [token, days]);

  if (err) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{err}</div>;
  }
  if (!data) {
    return (
      <div className="grid h-40 place-items-center rounded-xl border border-neutral-200 bg-white">
        <Loader2 size={18} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  const k = data.kpis;
  const methodData = Object.entries(data.byMethod).map(([name, value]) => ({ name, value }));
  const stageData = Object.entries(data.byStage).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-neutral-900">Performance</p>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5">
          {RANGES.map((r) => (
            <button key={r.d} onClick={() => setDays(r.d)}
              className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition ${
                days === r.d ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Today" value={k.today.orders} sub={pkr(k.today.revenue)} />
        <Kpi label="This week" value={k.week.orders} sub={pkr(k.week.revenue)} />
        <Kpi label="This month" value={k.month.orders} sub={pkr(k.month.revenue)} />
        <Kpi label="Avg order" value={pkr(k.aov)} />
        <Kpi label="Avg to ship" value={k.avgShipHours ? `${k.avgShipHours}h` : '—'} />
        <Kpi label="Payments verified" value={`${k.paymentVerifiedRate}%`} tone={k.paymentVerifiedRate >= 70 ? 'good' : 'warn'} />
        <Kpi label="Cancel rate" value={`${k.cancelRate}%`} tone={k.cancelRate <= 10 ? 'good' : 'bad'} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Orders & revenue">
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={data.daily} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="ordFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D0D0D" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0D0D0D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: '#9A9A9A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9A9A9A' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tip} formatter={(v, n) => (n === 'revenue' ? pkr(v) : v)} />
              <Area type="monotone" dataKey="orders" stroke="#0D0D0D" strokeWidth={2} fill="url(#ordFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="By payment method">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                {methodData.map((_, i) => <Cell key={i} fill={SLICE[i % SLICE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {methodData.map((m, i) => (
              <span key={m.name} className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                <span className="h-2 w-2 rounded-full" style={{ background: SLICE[i % SLICE.length] }} />
                {m.name} ({m.value})
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Pipeline">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stageData} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9A9A9A' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 10, fill: '#9A9A9A' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="value" fill="#0D0D0D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Peak order hours">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data.hourly} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" vertical={false} />
            <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 9, fill: '#9A9A9A' }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: '#9A9A9A' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tip} labelFormatter={(h) => `${h}:00 – ${h}:59`} />
            <Bar dataKey="orders" fill="#7C8B72" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

const tip = { borderRadius: 10, border: '1px solid #E4E0DA', fontSize: 12, boxShadow: '0 6px 20px rgba(0,0,0,.08)' };

function Kpi({ label, value, sub, tone }) {
  const toneCls = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : 'text-neutral-900';
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-[17px] font-semibold tabular-nums ${toneCls}`}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      {children}
    </div>
  );
}
