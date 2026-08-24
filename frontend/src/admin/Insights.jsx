import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import Img from '../components/Img';
import { btnGhost, btnSolid, EditorialError, TableSkeleton } from './orders/orderUi';
import { RankedBars, monoAxis, monoGrid, monoTooltip } from './analytics/charts';
import { RefreshCw } from 'lucide-react';

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

  const actions = (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {[30, 60, 90, 180].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => { setDays(n); load(n); }}
            disabled={busy}
            className={days === n ? btnSolid : btnGhost}
          >{n}d</button>
        ))}
      </div>
      <button type="button" onClick={() => load()} disabled={busy} className={btnGhost}>
        <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
      </button>
    </>
  );

  if (err) {
    return (
      <AdminLayout title="Insights">
        <PageHeader title="Insights" description="Patterns in orders, cities and repeat buying." />
        <EditorialError title="Unable to load insights" description={err} onRetry={() => { setErr(''); load(); }} />
      </AdminLayout>
    );
  }

  if (!d) {
    return (
      <AdminLayout title="Insights">
        <PageHeader title="Insights" description="Patterns in orders, cities and repeat buying." actions={actions} />
        <TableSkeleton rows={6} />
      </AdminLayout>
    );
  }

  const peakHour = d.hourly.reduce((m, h) => h.orders > m.orders ? h : m, { hour: 0, orders: 0 });

  return (
    <AdminLayout title="Insights">
      <PageHeader
        title="Insights"
        description={`Patterns in orders, cities and repeat buying — last ${d.days} days.`}
        actions={actions}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Signals</p>
        <div className="adm-divide-x grid grid-cols-1 border-y border-[#EAEAEA] sm:grid-cols-3">
          <div className="px-5 py-6">
            <p className="adm-label">Peak hour</p>
            <p className="adm-metric mt-3 text-[32px] leading-none text-white">{String(peakHour.hour).padStart(2, '0')}:00</p>
            <p className="mt-2 text-[11px] text-[#AAAAAA]">{peakHour.orders} orders</p>
          </div>
          <div className="px-5 py-6">
            <p className="adm-label">Repeat rate</p>
            <p className="adm-metric mt-3 text-[32px] leading-none text-white">{d.repeat.rate}%</p>
            <p className="mt-2 text-[11px] text-[#AAAAAA]">{d.repeat.repeat} of {d.repeat.total} buyers came back</p>
          </div>
          <div className="px-5 py-6">
            <p className="adm-label">Top city</p>
            <p className="adm-metric mt-3 text-[28px] leading-none text-white">{d.topCities[0]?._id || '—'}</p>
            <p className="mt-2 text-[11px] text-[#AAAAAA]">
              {d.topCities[0] ? `${pkr(d.topCities[0].revenue)} · ${d.topCities[0].orders} orders` : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Hours</p>
        <p className="mb-4 text-[12px] text-[#AAAAAA]">Distribution of orders across the day — plan promotions at the peak.</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...monoGrid} />
              <XAxis dataKey="hour" {...monoAxis} tickFormatter={(h) => `${String(h).padStart(2, '0')}`} />
              <YAxis {...monoAxis} allowDecimals={false} />
              <Tooltip
                {...monoTooltip}
                formatter={(v, k) => [k === 'revenue' ? pkr(v) : v, k === 'revenue' ? 'Revenue' : 'Orders']}
                labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="orders" radius={0}>
                {d.hourly.map((h, i) => (
                  <Cell key={i} fill={h.hour === peakHour.hour && peakHour.orders > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.28)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mb-10 grid gap-10 lg:grid-cols-2">
        <section>
          <p className="adm-index">03 — Cities</p>
          <p className="mb-4 text-[12px] text-[#AAAAAA]">By revenue — focus your ads here.</p>
          {d.topCities.length === 0 ? (
            <p className="border-y border-[#EAEAEA] py-8 text-center text-[12px] text-[#AAAAAA]">No delivery data yet.</p>
          ) : (
            <RankedBars
              rows={d.topCities.map((c) => ({
                label: c._id || '—',
                value: c.revenue,
                sub: `· ${c.orders}`,
              }))}
              fmt={(v) => pkr(v)}
            />
          )}
        </section>

        <section>
          <p className="adm-index">04 — Product profit</p>
          <p className="mb-4 text-[12px] text-[#AAAAAA]">Top 10 by gross profit (needs cost prices set).</p>
          {d.topProfit.length === 0 || d.topProfit.every((p) => p.profit === 0) ? (
            <p className="border-y border-[#EAEAEA] py-8 text-[12px] leading-relaxed text-[#AAAAAA]">
              Set the Cost / Wholesale price field on each product to see accurate profit ranking here.
            </p>
          ) : (
            <ol>
              {d.topProfit.map((p, i) => (
                <li key={p._id} className="flex items-center gap-3 border-b border-[#F0F0F0] py-2.5">
                  <span className="w-6 shrink-0 text-[10px] uppercase tracking-[0.16em] text-[#AAAAAA]">{String(i + 1).padStart(2, '0')}</span>
                  {p.image && <Img src={p.image} alt="" className="h-10 w-8 shrink-0 border border-[#EAEAEA] object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[12px] text-white">{p.name}</p>
                    <p className="text-[11px] text-[#AAAAAA]">{p.unitsSold} sold · {pkr(p.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="adm-metric text-[13px] text-white">{pkr(p.profit)}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA]">profit</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section>
        <p className="adm-index">05 — Cohorts</p>
        <p className="mb-4 text-[12px] text-[#AAAAAA]">Customers grouped by the month of their first order.</p>
        {d.cohort.length === 0 ? (
          <p className="border-y border-[#EAEAEA] py-8 text-center text-[12px] text-[#AAAAAA]">Need more historical orders to build cohorts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead>
                <tr className="border-b border-[#EAEAEA] text-left">
                  {['First-order month', 'New customers', 'Repeat buyers', 'Repeat %', 'Total spent'].map((h, i) => (
                    <th key={h} className={`py-2 ${i === 0 ? '' : 'text-right'}`}><span className="adm-label">{h}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohort.map((c) => {
                  const pct = c.newCustomers ? Math.round((c.repeatCustomers / c.newCustomers) * 1000) / 10 : 0;
                  return (
                    <tr key={c._id} className="border-b border-[#F0F0F0]">
                      <td className="py-2.5 font-mono text-[12px] text-[#333333]">{c._id}</td>
                      <td className="py-2.5 text-right tabular-nums text-[#555555]">{c.newCustomers}</td>
                      <td className="py-2.5 text-right tabular-nums text-[#555555]">{c.repeatCustomers}</td>
                      <td className="py-2.5 text-right tabular-nums text-white">{pct}%</td>
                      <td className="py-2.5 text-right tabular-nums text-white">{pkr(c.totalSpent)}</td>
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
