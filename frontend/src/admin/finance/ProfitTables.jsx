import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';

const useRange = (days, from, to) => useMemo(() => {
  const p = new URLSearchParams();
  if (from && to) { p.set('from', from); p.set('to', to); } else p.set('days', String(days || 30));
  return p.toString();
}, [days, from, to]);

/** Margin-based product view — deliberately distinct from unit-based best sellers. */
export function ProfitByProduct({ days, from, to }) {
  const { auth } = useApp();
  const [rows, setRows] = useState(null);
  const [sort, setSort] = useState('profit-desc');
  const range = useRange(days, from, to);

  useEffect(() => {
    if (!auth?.token) return;
    api(`/finance/profit-by-product?${range}&sort=${sort}&limit=25`, { token: auth.token })
      .then((d) => setRows(d.rows)).catch(() => setRows([]));
  }, [auth?.token, range, sort]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            <Boxes size={13} className="text-neutral-400" /> Profit by product
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">Sort by margin to find high-volume, low-margin lines that need a price review.</p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="min-h-[34px] rounded-full border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-700 outline-none focus:border-neutral-900">
          <option value="profit-desc">Most profit</option>
          <option value="margin-asc">Lowest margin</option>
          <option value="margin-desc">Highest margin</option>
          <option value="units-desc">Most units</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <th className="py-2 text-left">Product</th>
              <th className="py-2 text-right">Units</th>
              <th className="py-2 text-right">Revenue</th>
              <th className="py-2 text-right">COGS</th>
              <th className="py-2 text-right">Profit</th>
              <th className="py-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={6} className="py-8 text-center text-neutral-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-neutral-400">No sales in this range.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.name} className="border-b border-neutral-100">
                <td className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    {r.image && <Img src={r.image} alt="" className="h-9 w-7 shrink-0 rounded border border-neutral-200 object-cover" />}
                    <span className="line-clamp-2 max-w-[220px] text-neutral-800">{r.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-neutral-600">{r.units}</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-900">{r.revenue.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-500">{r.cogs.toLocaleString()}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-neutral-900">{r.profit.toLocaleString()}</td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${r.margin >= 40 ? 'text-emerald-700' : r.margin >= 15 ? 'text-amber-700' : 'text-red-700'}`}>
                  {r.margin}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Top Customers, but by what you keep — not by what they spend. */
export function ProfitByCustomer({ days, from, to }) {
  const { auth } = useApp();
  const [rows, setRows] = useState(null);
  const [sort, setSort] = useState('profit-desc');
  const range = useRange(days, from, to);

  useEffect(() => {
    if (!auth?.token) return;
    api(`/finance/profit-by-customer?${range}&sort=${sort}&limit=15`, { token: auth.token })
      .then((d) => setRows(d.rows)).catch(() => setRows([]));
  }, [auth?.token, range, sort]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            <Users size={13} className="text-neutral-400" /> Profit by customer
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">Flagged customers spend well but leave little behind — usually cancellations or returns.</p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="min-h-[34px] rounded-full border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-700 outline-none focus:border-neutral-900">
          <option value="profit-desc">Most profit</option>
          <option value="revenue-desc">Most revenue</option>
          <option value="margin-asc">Lowest margin</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <th className="py-2 text-left">Customer</th>
              <th className="py-2 text-right">Orders</th>
              <th className="py-2 text-right">Revenue</th>
              <th className="py-2 text-right">Profit</th>
              <th className="py-2 text-right">Margin</th>
              <th className="py-2 text-right">Failed</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={6} className="py-8 text-center text-neutral-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-neutral-400">No customers in this range.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.phone} className={`border-b border-neutral-100 ${r.atRisk ? 'bg-amber-50/40' : ''}`}>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    {r.atRisk && <AlertTriangle size={12} className="shrink-0 text-amber-600" />}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">{r.name}</p>
                      <p className="truncate text-[10.5px] text-neutral-500">{r.city}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-neutral-600">{r.orders}</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-900">{r.revenue.toLocaleString()}</td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${r.profit >= 0 ? 'text-neutral-900' : 'text-red-700'}`}>{r.profit.toLocaleString()}</td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${r.margin >= 15 ? 'text-emerald-700' : 'text-amber-700'}`}>{r.revenue > 0 ? `${r.margin}%` : '—'}</td>
                <td className={`py-2.5 text-right tabular-nums ${r.failRate >= 25 ? 'font-semibold text-red-700' : 'text-neutral-500'}`}>
                  {r.cancelled + r.returned > 0 ? `${r.cancelled + r.returned} (${r.failRate}%)` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Revenue riding on undelivered COD parcels — the exposure a 100% COD store carries. */
export function CodExposure() {
  const { auth } = useApp();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!auth?.token) return;
    api('/finance/cod-exposure', { token: auth.token }).then(setD).catch(() => setD(null));
  }, [auth?.token]);

  if (!d) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">COD exposure</p>
      <p className="mt-1 text-[12px] text-neutral-500">Money you have not been paid yet, because the parcel has not been delivered.</p>

      <p className="mt-4 font-sans text-[26px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{pkr(d.exposure)}</p>
      <p className="mt-1.5 text-[11.5px] text-neutral-500">
        across {d.orders} open order{d.orders === 1 ? '' : 's'} · avg {pkr(d.avgExposure)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-neutral-500">Not shipped yet</p>
          <p className="mt-0.5 font-sans text-[16px] font-semibold tabular-nums text-neutral-900">{d.buckets.notShipped}</p>
          <p className="mt-0.5 text-[10.5px] text-neutral-500">Cancellable at no cost</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-amber-800">With the courier</p>
          <p className="mt-0.5 font-sans text-[16px] font-semibold tabular-nums text-amber-900">{d.buckets.inTransit}</p>
          <p className="mt-0.5 text-[10.5px] text-amber-700">{pkr(d.sunkCost)} already spent</p>
        </div>
      </div>

      {d.oldestDays > 5 && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11.5px] leading-relaxed text-red-800">
          Oldest open order is <b>{d.oldestDays} days</b> old. Anything past a week rarely converts — chase or cancel it.
        </p>
      )}

      {d.risky.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Customers who cancel or return most</p>
          <ul className="mt-2 space-y-1.5">
            {d.risky.slice(0, 4).map((r) => (
              <li key={r.phone} className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="min-w-0 truncate text-neutral-700">{r.name}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.failRate >= 50 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                  {r.failed}/{r.orders} failed · {r.failRate}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10.5px] leading-relaxed text-neutral-500">
            Confirm these by call before dispatch — that alone removes most of the courier loss.
          </p>
        </div>
      )}
    </div>
  );
}

/** Fixed costs ÷ contribution per order = the daily order count that pays the bills. */
export function BreakEven({ days, from, to }) {
  const { auth } = useApp();
  const [d, setD] = useState(null);
  const range = useRange(days, from, to);

  useEffect(() => {
    if (!auth?.token) return;
    api(`/finance/break-even?${range}`, { token: auth.token }).then(setD).catch(() => setD(null));
  }, [auth?.token, range]);

  if (!d) return null;

  const unset = d.monthlyFixed === 0;
  const impossible = d.ordersNeededPerDay === null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Break-even</p>
      <p className="mt-1 text-[12px] text-neutral-500">How many orders a day cover your fixed monthly costs.</p>

      {unset ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-800">
          No fixed monthly costs are set yet. Add ads, SEO and other monthly costs in
          Settings → Shipping &amp; Operating Costs to see your break-even point.
        </p>
      ) : impossible ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[11.5px] leading-relaxed text-red-800">
          Each order currently costs more to fulfil than it brings in, so no order volume reaches break-even.
          Raise prices or cut per-order costs first.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="font-sans text-[30px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{d.ordersNeededPerDay}</p>
            <p className="text-[12px] text-neutral-500">order{d.ordersNeededPerDay === 1 ? '' : 's'} / day needed</p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ${d.onTrack ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
              {d.onTrack ? 'Covering costs' : 'Below break-even'}
            </span>
            <span className="text-[11.5px] text-neutral-500">running at {d.currentPerDay}/day</span>
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-[11.5px]">
            {[
              ['Fixed costs per month', pkr(d.monthlyFixed)],
              ['Average order value', pkr(d.aov)],
              ['Variable cost per order', pkr(d.variablePerOrder)],
              ['Left over per order', pkr(d.contribution)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="shrink-0 font-semibold tabular-nums text-neutral-900">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}
