import { useEffect, useRef, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Loader2, RefreshCcw } from 'lucide-react';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import { GROUPS } from './orderConstants';

/* ============================================================================
 * Live dashboard strip.
 *
 * One endpoint feeds every card, refreshed on a 30s timer. Refetches are
 * silent — the numbers swap in place rather than flashing a spinner, so the
 * strip never steals attention while someone is working the queue.
 * ========================================================================== */

const SLICE = ['#0D0D0D', '#7C8B72', '#B4453C', '#2C4A7C', '#C8A96A', '#6B6B6B'];
const RANGES = [{ d: 7, label: '7d' }, { d: 30, label: '30d' }, { d: 90, label: '90d' }];
const REFRESH_MS = 30000;

export default function OrderDashboard({ token, onPipelineClick, onCustomerClick }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [stamp, setStamp] = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const load = (silent) => {
      if (!token) return;
      if (!silent) { setData(null); setErr(''); }
      api(`/orders/insights/dashboard?days=${days}`, { token })
        .then((d) => { if (alive.current) { setData(d); setStamp(new Date()); setErr(''); } })
        .catch((e) => { if (alive.current && !silent) setErr(e.message || 'Could not load insights'); });
    };
    load(false);
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => { alive.current = false; clearInterval(t); };
  }, [token, days]);

  if (err) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{err}</div>;
  }
  if (!data) {
    return (
      <div className="grid h-36 place-items-center rounded-xl border border-neutral-200 bg-white">
        <Loader2 size={18} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  const k = data.kpis;
  const methodData = Object.entries(data.byMethod).map(([name, value]) => ({ name, value }));
  const maxPipe = Math.max(1, ...data.pipeline.map((p) => p.count));

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-semibold text-neutral-900">Today at a glance</p>
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            live · {stamp ? stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        </div>
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Today" value={k.today.orders} sub={pkr(k.today.revenue)} accent />
        <Kpi label="This week" value={k.week.orders} sub={pkr(k.week.revenue)} />
        <Kpi label="This month" value={k.month.orders} sub={pkr(k.month.revenue)} />
        <Kpi label="Avg order" value={pkr(k.aov)} />
        <Kpi label="Payments verified" value={`${k.paymentVerifiedRate}%`} tone={k.paymentVerifiedRate >= 70 ? 'good' : 'warn'} />
        <Kpi label="Issues" value={`${k.issueRate}%`} tone={k.issueRate <= 5 ? 'good' : 'bad'} />
      </div>

      {/* Quick stats — the three numbers the desk quotes most often. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">Payments</span>
          {['Pending', 'Verified', 'Confirmed'].map((st) => {
            const n = data.paymentBreakdown?.[st] || 0;
            const tone = st === 'Pending' ? 'bg-amber-100 text-amber-800'
              : st === 'Verified' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700';
            return (
              <span key={st} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
                {st} {n}
              </span>
            );
          })}
        </span>

        <span className="hidden h-4 w-px bg-neutral-200 sm:block" />

        <span className="flex items-center gap-1.5">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">Methods</span>
          {Object.entries(data.byMethod).map(([m, n]) => (
            <span key={m} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 ring-1 ring-neutral-200">
              {m} {n}
            </span>
          ))}
        </span>

        <span className="hidden h-4 w-px bg-neutral-200 sm:block" />

        <span className="text-neutral-600">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">Success</span>{' '}
          <span className="font-semibold text-neutral-900">{k.paymentVerifiedRate}%</span>
        </span>

        <span className="text-neutral-600">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">Avg to ship</span>{' '}
          <span className="font-semibold text-neutral-900">
            {data.avgShipHours ? (data.avgShipHours < 1 ? `${Math.round(data.avgShipHours * 60)}m` : `${data.avgShipHours}h`) : '—'}
          </span>
        </span>
      </div>

      {/* Pipeline — clicking a stage filters the list below */}
      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">Pipeline</p>
        <div className="flex flex-wrap items-end gap-2">
          {data.pipeline.map((p) => {
            const g = GROUPS.find((x) => x.key === p.group);
            return (
              <button key={p.group} onClick={() => onPipelineClick?.(p.group)}
                className="group min-w-[92px] flex-1 rounded-lg border border-neutral-200 p-2 text-left transition hover:border-neutral-900">
                <div className="flex items-center gap-1.5">
                  {g?.icon ? <g.icon size={12} className="text-neutral-400" /> : null}
                  <span className="truncate text-[11px] font-medium text-neutral-600">{g?.label || p.group}</span>
                </div>
                <p className="mt-0.5 text-[19px] font-semibold tabular-nums leading-none text-neutral-900">{p.count}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-neutral-900 transition-all duration-500"
                    style={{ width: `${Math.round((p.count / maxPipe) * 100)}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Orders trend">
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data.daily} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D0D0D" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0D0D0D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TIP} formatter={(v, n) => (n === 'revenue' ? pkr(v) : v)} />
              <Area type="monotone" dataKey="orders" stroke="#0D0D0D" strokeWidth={2} fill="url(#dashFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Payment mix">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={34} outerRadius={56} paddingAngle={2}>
                {methodData.map((_, i) => <Cell key={i} fill={SLICE[i % SLICE.length]} />)}
              </Pie>
              <Tooltip contentStyle={TIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {methodData.map((m, i) => (
              <span key={m.name} className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                <span className="h-2 w-2 rounded-full" style={{ background: SLICE[i % SLICE.length] }} />
                {m.name} ({m.value})
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Peak hours">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data.hourly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={AXIS} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TIP} labelFormatter={(h) => `${h}:00 – ${h}:59`} />
              <Bar dataKey="orders" fill="#7C8B72" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Tables */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Top customers">
          {(data.topCustomers || []).length === 0 ? <Empty /> : (
            <ul className="space-y-1">
              {data.topCustomers.map((c) => (
                <li key={c.phone}>
                  <button
                    onClick={() => onCustomerClick?.(c.phone)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-neutral-50"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                      {(c.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-neutral-800">{c.name}</span>
                      <span className="block text-[10.5px] text-neutral-400">
                        {c.orders} order{c.orders === 1 ? '' : 's'}
                        {c.orders >= 3 && <span className="ml-1 font-semibold text-amber-600">· repeat</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11.5px] font-semibold tabular-nums">{pkr(c.spent)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top products">
          {data.topProducts.length === 0 ? <Empty /> : (
            <ul className="space-y-1.5">
              {data.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-4 text-[11px] font-bold text-neutral-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-700">{p.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{p.units}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top cities">
          {data.topCities.length === 0 ? <Empty /> : (
            <ul className="space-y-1.5">
              {data.topCities.map((c) => (
                <li key={c.city} className="flex items-center gap-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-neutral-700">{c.city}</span>
                  <span className="shrink-0 text-[11px] text-neutral-400">{pkr(c.revenue)}</span>
                  <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{c.orders}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Fulfilment speed">
          {data.stageSpeed.length === 0 ? (
            <p className="py-3 text-center text-[11.5px] text-neutral-400">
              Not enough stage history yet — move a few orders through to build an average.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {data.stageSpeed.slice(0, 5).map((s) => (
                <li key={s.stage} className="flex items-center gap-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-neutral-700">{s.stage}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {s.avgHours < 1 ? `${Math.round(s.avgHours * 60)}m` : `${s.avgHours}h`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

const AXIS = { fontSize: 10, fill: '#9A9A9A' };
const TIP = { borderRadius: 10, border: '1px solid #E4E0DA', fontSize: 12, boxShadow: '0 6px 20px rgba(0,0,0,.08)' };
const Empty = () => <p className="py-3 text-center text-[11.5px] text-neutral-400">No data yet</p>;

function Kpi({ label, value, sub, tone, accent }) {
  const cls = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700'
    : tone === 'warn' ? 'text-amber-700' : 'text-neutral-900';
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${accent ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-200 bg-neutral-50/60'}`}>
      <p className={`text-[10.5px] font-semibold uppercase tracking-wider ${accent ? 'text-white/60' : 'text-neutral-500'}`}>{label}</p>
      <p className={`mt-0.5 text-[17px] font-semibold tabular-nums ${accent ? 'text-white' : cls}`}>{value}</p>
      {sub && <p className={`text-[11px] ${accent ? 'text-white/50' : 'text-neutral-400'}`}>{sub}</p>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      {children}
    </div>
  );
}
