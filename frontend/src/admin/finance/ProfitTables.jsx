import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';
import { ctlInline, MonoStatus } from '../orders/orderUi';

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
    <section>
      <p className="adm-index">06 — Profit by product</p>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-sm text-[12px] text-[#AAAAAA]">Sort by margin to find high-volume, low-margin lines that need a price review.</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={ctlInline} aria-label="Sort products">
          <option value="profit-desc">Most profit</option>
          <option value="margin-asc">Lowest margin</option>
          <option value="margin-desc">Highest margin</option>
          <option value="units-desc">Most units</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[#EAEAEA]">
              {['Product', 'Units', 'Revenue', 'Cogs', 'Profit', 'Margin'].map((h, i) => (
                <th key={h} className={`py-2 ${i === 0 ? 'text-left' : 'text-right'}`}><span className="adm-label">{h}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#AAAAAA]">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#AAAAAA]">No sales in this range.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.name} className="border-b border-[#F0F0F0]">
                <td className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    {r.image && <Img src={r.image} alt="" className="h-9 w-7 shrink-0 border border-[#EAEAEA] object-cover" />}
                    <span className="line-clamp-2 max-w-[220px] text-black">{r.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#777777]">{r.units}</td>
                <td className="py-2.5 text-right tabular-nums text-black">{r.revenue.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums text-[#999999]">{r.cogs.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums text-black">{r.profit.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums text-[#555555]">{r.margin}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
    <section>
      <p className="adm-index">06 — Profit by customer</p>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-sm text-[12px] text-[#AAAAAA]">Flagged customers spend well but leave little behind — usually cancellations or returns.</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={ctlInline} aria-label="Sort customers">
          <option value="profit-desc">Most profit</option>
          <option value="revenue-desc">Most revenue</option>
          <option value="margin-asc">Lowest margin</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[#EAEAEA]">
              {['Customer', 'Orders', 'Revenue', 'Profit', 'Margin', 'Failed'].map((h, i) => (
                <th key={h} className={`py-2 ${i === 0 ? 'text-left' : 'text-right'}`}><span className="adm-label">{h}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#AAAAAA]">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#AAAAAA]">No customers in this range.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.phone} className="border-b border-[#F0F0F0]">
                <td className="py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-black">
                      {r.atRisk ? <span className="mr-2 text-[#AAAAAA]">●</span> : null}
                      {r.name}
                    </p>
                    <p className="truncate text-[11px] text-[#AAAAAA]">{r.city}</p>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#777777]">{r.orders}</td>
                <td className="py-2.5 text-right tabular-nums text-black">{r.revenue.toLocaleString()}</td>
                <td className="py-2.5 text-right tabular-nums text-black">
                  {r.profit < 0 ? `↓ ${r.profit.toLocaleString()}` : r.profit.toLocaleString()}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#555555]">{r.revenue > 0 ? `${r.margin}%` : '—'}</td>
                <td className="py-2.5 text-right tabular-nums text-[#999999]">
                  {r.cancelled + r.returned > 0 ? `${r.cancelled + r.returned} (${r.failRate}%)` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
    <section>
      <p className="adm-index">07 — Cod exposure</p>
      <p className="text-[12px] text-[#AAAAAA]">Money you have not been paid yet, because the parcel has not been delivered.</p>

      <p className="adm-metric mt-5 text-[28px] leading-none text-black">{pkr(d.exposure)}</p>
      <p className="mt-2 text-[12px] text-[#AAAAAA]">
        across {d.orders} open order{d.orders === 1 ? '' : 's'} · avg {pkr(d.avgExposure)}
      </p>

      <div className="adm-divide-x mt-5 grid grid-cols-2 border-y border-[#EAEAEA]">
        <div className="px-4 py-4">
          <p className="adm-label">Not shipped yet</p>
          <p className="adm-metric mt-2 text-[20px] text-black">{d.buckets.notShipped}</p>
          <p className="mt-1 text-[11px] text-[#AAAAAA]">Cancellable at no cost</p>
        </div>
        <div className="px-4 py-4">
          <p className="adm-label">With the courier</p>
          <p className="adm-metric mt-2 text-[20px] text-black">{d.buckets.inTransit}</p>
          <p className="mt-1 text-[11px] text-[#AAAAAA]">{pkr(d.sunkCost)} already spent</p>
        </div>
      </div>

      {d.oldestDays > 5 && (
        <p className="mt-4 text-[13px] leading-relaxed text-[#777777]">
          Oldest open order is {d.oldestDays} days old. Anything past a week rarely converts — chase or cancel it.
        </p>
      )}

      {d.risky.length > 0 && (
        <div className="mt-5">
          <p className="adm-label mb-3">Customers who cancel or return most</p>
          <ul>
            {d.risky.slice(0, 4).map((r) => (
              <li key={r.phone} className="flex items-center justify-between gap-2 border-b border-[#F0F0F0] py-2 text-[13px]">
                <span className="min-w-0 truncate text-white/75">{r.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-[#999999]">
                  {r.failed}/{r.orders} failed · {r.failRate}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-[#AAAAAA]">
            Confirm these by call before dispatch — that alone removes most of the courier loss.
          </p>
        </div>
      )}
    </section>
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
    <section>
      <p className="adm-index">07 — Break-even</p>
      <p className="text-[12px] text-[#AAAAAA]">How many orders a day cover your fixed monthly costs.</p>

      {unset ? (
        <p className="mt-5 border-y border-[#EAEAEA] py-6 text-[13px] leading-relaxed text-[#999999]">
          No fixed monthly costs are set yet. Add ads, SEO and other monthly costs in
          Settings → Shipping &amp; Operating Costs to see your break-even point.
        </p>
      ) : impossible ? (
        <p className="mt-5 border-y border-[#EAEAEA] py-6 text-[13px] leading-relaxed text-[#777777]">
          Each order currently costs more to fulfil than it brings in, so no order volume reaches break-even.
          Raise prices or cut per-order costs first.
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-baseline gap-2">
            <p className="adm-metric text-[32px] leading-none text-black">{d.ordersNeededPerDay}</p>
            <p className="text-[12px] text-[#AAAAAA]">order{d.ordersNeededPerDay === 1 ? '' : 's'} / day needed</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <MonoStatus label={d.onTrack ? 'COVERING COSTS' : 'BELOW BREAK-EVEN'} dim={!d.onTrack} />
            <span className="text-[12px] text-[#AAAAAA]">running at {d.currentPerDay}/day</span>
          </div>

          <dl className="mt-5 space-y-2 border-t border-[#EAEAEA] pt-4 text-[13px]">
            {[
              ['Fixed costs per month', pkr(d.monthlyFixed)],
              ['Average order value', pkr(d.aov)],
              ['Variable cost per order', pkr(d.variablePerOrder)],
              ['Left over per order', pkr(d.contribution)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-[#999999]">{k}</dt>
                <dd className="shrink-0 tabular-nums text-black">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
