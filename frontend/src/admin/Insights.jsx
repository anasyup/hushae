import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, Clock, MapPin, RefreshCw, RotateCcw, Sparkles, TrendingUp, Users, XCircle,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * INSIGHTS — deep business analytics page.
 * Shows: best hours (traffic pattern), top cities, product profit ranking,
 * repeat-purchase rate, cohort table.
 * ========================================================================== */

export default function Insights() {
  const { auth, logout } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);

  const load = async (nextDays = days) => {
    setBusy(true);
    try {
      const data = await api(`/admin/insights?days=${nextDays}`, { token: auth.token });
      setD(data); setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      setErr('Could not load insights.');
    }
    setBusy(false);
  };
  useEffect(() => { load(); }, [auth]); // eslint-disable-line

  if (err) return <AdminLayout title="Insights">
    <div className="grid place-items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <XCircle size={22} className="mb-2 text-red-600" />
      <p className="text-sm text-red-700">{err}</p>
      <button onClick={() => { setErr(''); load(); }} className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-[9px] font-semibold text-red-700 hover:bg-red-100">Try again</button>
    </div>
  </AdminLayout>;

  if (!d) return <AdminLayout title="Insights"><div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="animate-pulse rounded-xl bg-neutral-100 h-56"/>)}</div></AdminLayout>;

  const peakHour = d.hourly.reduce((m, h) => h.orders > m.orders ? h : m, { hour: 0, orders: 0 });

  return (
    <AdminLayout title="Insights">
      {/* Range picker */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] text-neutral-500">Deep business metrics across the last <b className="text-neutral-900">{d.days} days</b>.</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
            {[30, 60, 90, 180].map((n) => (
              <button
                key={n}
                onClick={() => { setDays(n); load(n); }}
                disabled={busy}
                className={`rounded-full px-3 py-1.5 text-[9px] font-semibold transition ${
                  days === n ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >{n}d</button>
            ))}
          </div>
          <button
            onClick={() => load()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MiniKpi icon={Clock} label="Peak hour" value={`${String(peakHour.hour).padStart(2, '0')}:00`} sub={`${peakHour.orders} orders`} accent="#2563eb" />
        <MiniKpi icon={RotateCcw} label="Repeat rate" value={`${d.repeat.rate}%`} sub={`${d.repeat.repeat} of ${d.repeat.total} buyers came back`} accent="#059669" />
        <MiniKpi icon={MapPin} label="Top city" value={d.topCities[0]?._id || '—'} sub={d.topCities[0] ? `${pkr(d.topCities[0].revenue)} · ${d.topCities[0].orders} orders` : ''} accent="#7c3aed" />
      </div>

      {/* Best selling hours */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Best selling hours</p>
            <p className="mt-1 text-[9px] text-neutral-500">Distribution of orders across the day — plan promotions at the peak.</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Clock size={15}/></span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={(h) => `${String(h).padStart(2, '0')}`} />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v, k) => [k === 'revenue' ? pkr(v) : v, k === 'revenue' ? 'Revenue' : 'Orders']}
                labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
              />
              <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                {d.hourly.map((h, i) => (
                  <Cell key={i} fill={h.hour === peakHour.hour && peakHour.orders > 0 ? '#111111' : '#c9bfb4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cities + Profit ranking */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Top cities</p>
              <p className="mt-1 text-[9px] text-neutral-500">By revenue — focus your ads here.</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700"><MapPin size={15}/></span>
          </div>
          {d.topCities.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">No delivery data yet.</p>
          ) : (
            <div className="space-y-2">
              {d.topCities.map((c, i) => {
                const max = d.topCities[0].revenue || 1;
                const w = Math.max(5, Math.round((c.revenue / max) * 100));
                return (
                  <div key={c._id + i} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-neutral-900">
                        <span className="mr-2 inline-block w-4 text-neutral-400">{i + 1}.</span>
                        {c._id || '—'}
                      </p>
                      <p className="font-sans text-[7px] font-semibold tabular-nums text-neutral-900">{pkr(c.revenue)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[9px] text-neutral-500">
                      <span>{c.province}</span>
                      <span>·</span>
                      <span>{c.orders} order{c.orders === 1 ? '' : 's'}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Product profit ranking</p>
              <p className="mt-1 text-[9px] text-neutral-500">Top 10 by gross profit (needs cost prices set).</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp size={15}/></span>
          </div>
          {d.topProfit.length === 0 || d.topProfit.every((p) => p.profit === 0) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[9px] leading-relaxed text-amber-800">
              💡 Set the <b>Cost / Wholesale price</b> field on each product to see accurate profit ranking here.
            </div>
          ) : (
            <ol className="space-y-2">
              {d.topProfit.map((p, i) => (
                <li key={p._id} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-bold ${
                    i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-neutral-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}>{i + 1}</span>
                  {p.image && <Img src={p.image} alt="" className="h-10 w-8 shrink-0 rounded-md border border-neutral-200 object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[9px] font-medium text-neutral-900">{p.name}</p>
                    <p className="text-[9px] text-neutral-500">{p.unitsSold} sold · Revenue {pkr(p.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-[7px] font-semibold tabular-nums text-emerald-700">{pkr(p.profit)}</p>
                    <p className="text-[10px] text-neutral-400">profit</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Cohort table */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Cohort analysis</p>
            <p className="mt-1 text-[9px] text-neutral-500">Customers grouped by the month of their first order.</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900 text-white"><Users size={15}/></span>
        </div>
        {d.cohort.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Need more historical orders to build cohorts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[10px]">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">First-order month</th>
                  <th className="py-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">New customers</th>
                  <th className="py-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Repeat buyers</th>
                  <th className="py-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Repeat %</th>
                  <th className="py-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total spent</th>
                </tr>
              </thead>
              <tbody>
                {d.cohort.map((c) => {
                  const pct = c.newCustomers ? Math.round((c.repeatCustomers / c.newCustomers) * 1000) / 10 : 0;
                  return (
                    <tr key={c._id} className="border-b border-neutral-100">
                      <td className="py-2.5 font-mono text-[9px] text-neutral-700">{c._id}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.newCustomers}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.repeatCustomers}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${pct >= 25 ? 'bg-emerald-50 text-emerald-700' : pct >= 10 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>{pct}%</span>
                      </td>
                      <td className="py-2.5 text-right font-sans font-semibold tabular-nums text-neutral-900">{pkr(c.totalSpent)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

function MiniKpi({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}12`, color: accent }}>
          <Icon size={16} strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 font-sans text-[7px] font-semibold leading-none tabular-nums tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-1.5 text-[9px] text-neutral-500">{sub}</p>}
    </div>
  );
}
