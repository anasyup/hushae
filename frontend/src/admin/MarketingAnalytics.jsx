import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Download, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Empty, Stat } from './ui/Controls';
import { typeOf } from './promotions/promoTypes';

/* ============================================================================
 * ADMIN → MARKETING ANALYTICS
 *
 * Built around one question a merchant actually asks: "is this promotion
 * worth what it costs me?"
 *
 * So every row shows what was GIVEN AWAY next to what it moved. A promotion
 * used 200 times is not automatically good — a promotion that gave away
 * PKR 80,000 to shift stock that would have sold anyway is a loss with a
 * flattering usage count.
 * ========================================================================== */

const num = (n) => Number(n || 0).toLocaleString('en-PK');
const money = (n) => `PKR ${num(n)}`;

export default function MarketingAnalytics() {
  const { auth, toast } = useApp();
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [promos, setPromos] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!auth?.token) return;
    setLoading(true);
    api(`/promotions/admin/stats?days=${days}`, { token: auth.token })
      .then(setD)
      .catch(() => toast('Could not load analytics'))
      .finally(() => setLoading(false));
  }, [auth?.token, days, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auth?.token) return;
    api('/promotions?limit=100', { token: auth.token })
      .then((r) => setPromos(r.promotions || []))
      .catch(() => setPromos([]));
  }, [auth?.token]);

  const exportCsv = async () => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/promotions/admin/export?days=${days}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `promotions-${days}d.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e.message || 'Export failed'); }
  };

  const now = Date.now();
  const upcoming = (promos || []).filter((p) => p.state?.reason === 'scheduled');
  const expired = (promos || []).filter((p) => ['ended', 'limit-reached', 'budget-spent'].includes(p.state?.reason));
  const bundles = (d?.byPromotion || []).filter((x) => x.type === 'bundle');

  return (
    <AdminLayout title="Marketing analytics">
      <Link to="/admin/promotions" className="mb-4 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[9px] font-semibold text-neutral-600 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Promotions
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <BarChart3 size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Marketing analytics</h2>
            <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">
              What your promotions cost, and what they moved.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="ma-days" className="sr-only">Time period</label>
          <select id="ma-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900 min-h-[44px] max-w-[150px]">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[9px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Download size={13} /> Export CSV
          </button>
          <Link to="/admin/marketing/settings" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[9px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <SettingsIcon size={13} /> Rules
          </Link>
        </div>
      </div>

      {/* Always mounted, dash while loading — mounting on arrival shifts the
          page down, which is the CLS bug found twice in earlier sprints. */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Times used" value={d ? num(d.uses) : '—'} />
        <Stat label="Given away" value={d ? money(d.totalGiven) : '—'} />
        <Stat label="Orders affected" value={d ? num(d.ordersAffected) : '—'} />
        <Stat label="Average per order" value={d ? money(d.avgPerOrder) : '—'} />
        <Stat label="Live right now" value={d ? num(d.activePromotions) : '—'} />
      </div>

      {loading && !d ? (
        <div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" />
      ) : (
        <div className="space-y-5">
          {d?.uses === 0 && (
            <Empty
              title="No promotions have run yet"
              description="Once a promotion applies to a real order it appears here — how often, what it cost you, and which products it moved."
              action={(
                <Link to="/admin/promotions/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[9px] font-semibold text-white transition hover:bg-neutral-800">
                  Create a promotion
                </Link>
              )}
            />
          )}

          {(d?.byPromotion || []).length > 0 && (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Top promotions</p>
              <p className="mt-1 text-[9px] leading-relaxed text-neutral-600">
                Ordered by what they cost you. A high usage count with a high giveaway is only
                good if those customers would not have bought anyway.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[10px]">
                  <caption className="sr-only">Top promotions by amount given away</caption>
                  <thead className="text-[9px] uppercase tracking-wider text-neutral-600">
                    <tr>
                      <th scope="col" className="pb-2 font-semibold">Promotion</th>
                      <th scope="col" className="pb-2 font-semibold">Type</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Uses</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Given away</th>
                      <th scope="col" className="pb-2 text-right font-semibold">Avg each</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {d.byPromotion.map((x) => (
                      <tr key={x.id}>
                        <td className="py-2.5">
                          <Link to={`/admin/promotions/${x.id}`} className="font-medium text-neutral-900 underline-offset-2 hover:underline">
                            {x.name || 'Untitled'}
                          </Link>
                        </td>
                        <td className="py-2.5 text-neutral-600">{typeOf(x.type).short}</td>
                        <td className="py-2.5 text-right tabular-nums">{num(x.uses)}</td>
                        <td className="py-2.5 text-right tabular-nums">{money(x.given)}</td>
                        <td className="py-2.5 text-right tabular-nums text-neutral-600">{money(Math.round(x.given / Math.max(1, x.uses)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {bundles.length > 0 && (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Top bundles</p>
              <ul className="mt-4 space-y-2">
                {bundles.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-2.5">
                    <Link to={`/admin/promotions/${x.id}`} className="min-w-0 truncate text-[10px] font-medium text-neutral-900 underline-offset-2 hover:underline">{x.name}</Link>
                    <span className="shrink-0 text-[9px] tabular-nums text-neutral-600">{num(x.uses)} uses · {money(x.given)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Starting soon</p>
              {!upcoming.length ? (
                <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-6 text-center text-[9px] text-neutral-600">Nothing scheduled.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {upcoming.map((p) => (
                    <li key={p._id}>
                      <Link to={`/admin/promotions/${p._id}`} className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-2.5 transition hover:border-neutral-300">
                        <span className="min-w-0 truncate text-[10px] text-neutral-900">{p.name}</span>
                        <span className="shrink-0 text-[9px] text-neutral-600">
                          {p.startsAt ? new Date(p.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Finished</p>
              <p className="mt-1 text-[9px] text-neutral-600">Ended, or hit a limit. Duplicate one to run it again.</p>
              {!expired.length ? (
                <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-6 text-center text-[9px] text-neutral-600">Nothing has finished yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {expired.map((p) => (
                    <li key={p._id}>
                      <Link to={`/admin/promotions/${p._id}`} className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-2.5 transition hover:border-neutral-300">
                        <span className="min-w-0 truncate text-[10px] text-neutral-900">{p.name}</span>
                        <span className="shrink-0 text-[9px] text-neutral-600">{num(p.usedCount)} uses</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {(d?.daily || []).length > 0 && (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Day by day</p>
              <ul className="mt-4 space-y-1.5">
                {d.daily.slice(-14).map((row) => {
                  const max = Math.max(...d.daily.map((x) => x.given), 1);
                  return (
                    <li key={row.date} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-[9px] tabular-nums text-neutral-600">
                        {new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
                        <span className="block h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(2, (row.given / max) * 100)}%` }} />
                      </span>
                      <span className="w-28 shrink-0 text-right text-[9px] tabular-nums text-neutral-600">
                        {money(row.given)} · {num(row.uses)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
