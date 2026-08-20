import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, Info, Receipt,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import { fmtDate, pkr } from '../../lib/format';

const HEALTH = {
  profitable: { label: 'Profitable', cls: 'bg-[#E9EFEA] text-[#3E5C4B] ring-[#C9D8CE]' },
  thin:       { label: 'Thin margin', cls: 'bg-[#F6F1E6] text-[#6B552F] ring-[#DCCBA5]' },
  loss:       { label: 'Loss',        cls: 'bg-[#F5EDEB] text-[#8A4B3F] ring-[#E0C6BE]' },
};

const FILTERS = [
  { key: 'all', label: 'All orders' },
  { key: 'loss', label: 'Loss-making only' },
  { key: 'thin', label: 'Thin margin only' },
  { key: 'profitable', label: 'Profitable only' },
];

const csvCell = (c) => {
  const s = String(c ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

/**
 * Order-level profitability. Sorting by margin ascending is the whole point of
 * the screen: it puts the orders that are quietly losing money at the top.
 */
export default function OrderProfitability({ days, from, to }) {
  const { auth } = useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ filter, sort, page: String(page), limit: '25' });
    if (from && to) { p.set('from', from); p.set('to', to); } else p.set('days', String(days || 30));
    return p.toString();
  }, [filter, sort, page, days, from, to]);

  useEffect(() => {
    if (!auth?.token) return;
    setBusy(true);
    api(`/finance/order-profitability?${qs}`, { token: auth.token })
      .then(setData).catch(() => setData(null)).finally(() => setBusy(false));
  }, [auth?.token, qs]);

  useEffect(() => { setPage(1); }, [filter, sort, days, from, to]);

  const exportCsv = async () => {
    const all = new URLSearchParams({ filter, sort, page: '1', limit: '1000' });
    if (from && to) { all.set('from', from); all.set('to', to); } else all.set('days', String(days || 30));
    const full = await api(`/finance/order-profitability?${all}`, { token: auth.token });
    const rows = [[
      'Order #', 'Date', 'Customer', 'Phone', 'City', 'Status', 'Payment', 'Items',
      'Revenue', 'COGS', 'Packaging', 'Courier', 'Payment fee', 'Net profit', 'Margin %', 'Health',
    ]];
    for (const r of full.rows) {
      rows.push([
        r.orderNumber, new Date(r.date).toISOString(), r.customer, r.phone, r.city, r.status,
        r.paymentMethod, r.items, r.revenue, r.cogs, r.packaging, r.courier, r.paymentFee,
        r.netProfit, r.margin, HEALTH[r.health]?.label || r.health,
      ]);
    }
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hushae-order-profitability-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SortBtn = ({ id, label, align = 'right' }) => {
    const asc = `${id}-asc`;
    const desc = `${id}-desc`;
    const active = sort === asc || sort === desc;
    return (
      <button
        onClick={() => setSort(sort === desc ? asc : desc)}
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''} w-full transition hover:text-neutral-900 ${active ? 'text-neutral-900' : ''}`}
      >
        {label}
        {active ? (sort === asc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : null}
      </button>
    );
  };

  const t = data?.totals;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Order profitability</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            What you actually keep on every single order, after cost of goods, packaging, courier and gateway fees.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="min-h-[34px] rounded-full border border-neutral-200 bg-white px-3 text-[12px] font-semibold text-neutral-700 outline-none focus:border-neutral-900">
            {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <button onClick={() => setSort('margin-asc')}
            className={`min-h-[34px] rounded-full border px-3 text-[12px] font-semibold transition ${sort === 'margin-asc' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
            Worst first
          </button>
          <button onClick={exportCsv}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      {/* Roll-up strip */}
      {t && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-3 sm:grid-cols-4">
          {[
            ['Net profit', pkr(t.netProfit), t.netProfit >= 0 ? 'text-[#3E5C4B]' : 'text-[#8A4B3F]'],
            ['Net margin', `${t.margin}%`, ''],
            ['Profitable', `${t.profitable} order${t.profitable === 1 ? '' : 's'}`, 'text-[#3E5C4B]'],
            ['Needs a look', `${t.thin + t.loss}`, t.thin + t.loss > 0 ? 'text-[#7A6239]' : ''],
          ].map(([label, value, cls]) => (
            <div key={label}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
              <p className={`mt-0.5 font-sans text-[13px] font-semibold tabular-nums ${cls || 'text-neutral-900'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ads caveat — stated where the numbers are read, not buried in a footnote */}
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#F1F1F1] px-3 py-2 text-[12px] leading-relaxed text-[#4A4A4A]">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Ad spend is <b>not</b> split across individual orders — attribution on COD checkout is unreliable and would
          make random orders look unprofitable. Ads stay a whole-business cost in the expense breakdown above.
        </span>
      </p>

      {/* Table — scrolls horizontally on phones rather than squeezing */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-neutral-200 text-[13px] font-bold uppercase tracking-wider text-neutral-500">
              <th className="w-6 py-2" />
              <th className="py-2 text-left">Order</th>
              <th className="py-2 text-left">Customer</th>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-right"><SortBtn id="revenue" label="Revenue" /></th>
              <th className="py-2 text-right">COGS</th>
              <th className="py-2 text-right">Pack</th>
              <th className="py-2 text-right">Courier</th>
              <th className="py-2 text-right">Fee</th>
              <th className="py-2 text-right"><SortBtn id="profit" label="Net profit" /></th>
              <th className="py-2 text-right"><SortBtn id="margin" label="Margin" /></th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {busy && !data ? (
              <tr><td colSpan={12} className="py-10 text-center text-neutral-400">Loading…</td></tr>
            ) : !data || data.rows.length === 0 ? (
              <tr><td colSpan={12} className="py-10 text-center text-neutral-400">No orders in this range.</td></tr>
            ) : data.rows.map((r) => {
              const h = HEALTH[r.health] || HEALTH.profitable;
              const expanded = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setOpen(expanded ? null : r.id)}
                    className={`cursor-pointer border-b border-neutral-100 transition hover:bg-neutral-50 ${expanded ? 'bg-neutral-50' : ''}`}
                  >
                    <td className="py-2.5 text-neutral-400">
                      {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </td>
                    <td className="py-2.5 font-mono text-[13px] font-semibold text-neutral-900">{r.orderNumber}</td>
                    <td className="max-w-[150px] truncate py-2.5 text-neutral-700">{r.customer}</td>
                    <td className="whitespace-nowrap py-2.5 text-neutral-500">{fmtDate(r.date)}</td>
                    <td className="py-2.5 text-right tabular-nums text-neutral-900">{r.revenue.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums text-neutral-500">{r.cogs.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums text-neutral-500">{r.packaging.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums text-neutral-500">{r.courier.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums text-neutral-500">{r.paymentFee.toLocaleString()}</td>
                    <td className={`py-2.5 text-right font-semibold tabular-nums ${r.netProfit >= 0 ? 'text-neutral-900' : 'text-[#8A4B3F]'}`}>
                      {r.netProfit.toLocaleString()}
                    </td>
                    <td className={`py-2.5 text-right font-semibold tabular-nums ${r.margin >= (data.marginThreshold || 15) ? 'text-[#3E5C4B]' : r.margin > 0 ? 'text-[#7A6239]' : 'text-[#8A4B3F]'}`}>
                      {r.revenue > 0 ? `${r.margin}%` : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-bold ring-1 ${h.cls}`}>{h.label}</span>
                    </td>
                  </tr>

                  {expanded && (
                    <tr className="border-b border-neutral-100 bg-neutral-50">
                      <td />
                      <td colSpan={11} className="px-2 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="max-w-sm">
                            <p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-neutral-500">Full breakdown</p>
                            <dl className="space-y-1">
                              <Line label="Revenue" value={r.revenue} strong />
                              <Line label={`Cost of goods (${r.items} item${r.items === 1 ? '' : 's'})`} value={-r.cogs} />
                              <Line label="Packaging" value={-r.packaging} />
                              <Line label="Courier" value={-r.courier} />
                              <Line label={`Payment gateway fee${r.paymentMethod === 'COD' ? ' (COD — none)' : ` (${r.feePct}%)`}`} value={-r.paymentFee} />
                              <div className="!mt-2 flex items-center justify-between border-t border-neutral-300 pt-2">
                                <dt className="text-[12px] font-bold text-neutral-900">Net profit</dt>
                                <dd className={`font-sans text-[13px] font-bold tabular-nums ${r.netProfit >= 0 ? 'text-[#3E5C4B]' : 'text-[#8A4B3F]'}`}>
                                  {pkr(r.netProfit)} {r.revenue > 0 && <span className="text-[12px] font-semibold">({r.margin}%)</span>}
                                </dd>
                              </div>
                            </dl>
                          </div>
                          <div className="space-y-2 text-[13px] text-neutral-600">
                            <p><span className="text-neutral-500">City:</span> {r.city || '—'}</p>
                            <p><span className="text-neutral-500">Payment:</span> {r.paymentMethod}</p>
                            <p><span className="text-neutral-500">Stage:</span> {r.stage || r.status}</p>
                            {(r.cancelled || r.returned) && (
                              <p className="flex items-start gap-1.5 rounded-lg bg-[#F5EDEB] p-2 text-[#7C4237]">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                <span>
                                  {r.returned ? 'Returned' : 'Cancelled'} — no revenue kept.
                                  {r.shipped
                                    ? ` The courier leg was already paid, so ${pkr(r.totalCost)} is a real loss.`
                                    : ' Nothing had shipped, so no courier cost was incurred.'}
                                </span>
                              </p>
                            )}
                            <Link to={`/admin/orders/${r.id}`} className="inline-flex items-center gap-1 pt-1 font-semibold text-neutral-900 underline underline-offset-4">
                              Open order <ChevronRight size={11} />
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.total > data.limit && (
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <p className="text-neutral-500">
            {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="min-h-[32px] rounded-full border border-neutral-200 px-3 font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
              className="min-h-[32px] rounded-full border border-neutral-200 px-3 font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Line({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={`text-[13px] ${strong ? 'font-semibold text-neutral-800' : 'text-neutral-500'}`}>{label}</dt>
      <dd className={`shrink-0 tabular-nums ${value < 0 ? 'text-neutral-600' : 'font-semibold text-neutral-900'}`}>
        {value < 0 ? `− ${pkr(Math.abs(value))}` : pkr(value)}
      </dd>
    </div>
  );
}
