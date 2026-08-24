import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { typeOf } from './promotions/promoTypes';
import { btnGhost, ctlInline, EditorialEmpty, TableSkeleton } from './orders/orderUi';

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

  const upcoming = (promos || []).filter((p) => p.state?.reason === 'scheduled');
  const expired = (promos || []).filter((p) => ['ended', 'limit-reached', 'budget-spent'].includes(p.state?.reason));
  const bundles = (d?.byPromotion || []).filter((x) => x.type === 'bundle');

  return (
    <AdminLayout title="Marketing analytics">
      <PageHeader
        title="Performance"
        description="What your promotions cost, and what they moved."
        actions={(
          <>
            <select id="ma-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={ctlInline} aria-label="Time period">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button type="button" onClick={exportCsv} className={btnGhost}><Download size={12} /> Export</button>
            <Link to="/admin/marketing/settings" className={btnGhost}>Rules</Link>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Performance</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] lg:grid-cols-5">
          {[
            { label: 'Times used', value: d ? num(d.uses) : '—' },
            { label: 'Given away', value: d ? money(d.totalGiven) : '—' },
            { label: 'Orders affected', value: d ? num(d.ordersAffected) : '—' },
            { label: 'Average per order', value: d ? money(d.avgPerOrder) : '—' },
            { label: 'Live now', value: d ? num(d.activePromotions) : '—' },
          ].map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[22px] leading-none text-black">{x.value}</p>
            </div>
          ))}
        </div>
      </section>

      {loading && !d ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {d?.uses === 0 && (
            <EditorialEmpty
              title="No promotions have run yet"
              description="Once a promotion applies to a real order it appears here."
              action={<Link to="/admin/promotions/new" className={btnGhost}>Create a promotion</Link>}
            />
          )}

          {(d?.byPromotion || []).length > 0 && (
            <section className="mb-10">
              <p className="adm-index">02 — Top promotions</p>
              <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_0.6fr_0.5fr_0.8fr_0.6fr] md:gap-3">
                {['Promotion', 'Type', 'Uses', 'Given away', 'Avg'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {d.byPromotion.map((x) => (
                <Link key={x.id} to={`/admin/promotions/${x.id}`} className="grid grid-cols-2 items-center gap-2 border-b border-[#EAEAEA] py-3 md:grid-cols-[minmax(0,1.4fr)_0.6fr_0.5fr_0.8fr_0.6fr] md:gap-3 adm-row-hover">
                  <span className="truncate text-[13px] text-black">{x.name || 'Untitled'}</span>
                  <span className="text-[11px] uppercase tracking-[0.1em] text-[#AAAAAA]">{typeOf(x.type).short}</span>
                  <span className="text-[12px] tabular-nums text-[#555555]">{num(x.uses)}</span>
                  <span className="text-[12px] tabular-nums text-black">{money(x.given)}</span>
                  <span className="text-[12px] tabular-nums text-[#999999]">{money(Math.round(x.given / Math.max(1, x.uses)))}</span>
                </Link>
              ))}
            </section>
          )}

          {bundles.length > 0 && (
            <section className="mb-10">
              <p className="adm-index">Bundles</p>
              {bundles.map((x) => (
                <Link key={x.id} to={`/admin/promotions/${x.id}`} className="flex items-center justify-between border-b border-[#EAEAEA] py-3 adm-row-hover">
                  <span className="truncate text-[13px] text-black">{x.name}</span>
                  <span className="text-[12px] text-[#999999]">{num(x.uses)} · {money(x.given)}</span>
                </Link>
              ))}
            </section>
          )}

          <div className="mb-10 grid gap-10 lg:grid-cols-2">
            <section>
              <p className="adm-index">Starting soon</p>
              {!upcoming.length ? <p className="border-y border-[#EAEAEA] py-6 text-[12px] text-[#AAAAAA]">Nothing scheduled.</p> : upcoming.map((p) => (
                <Link key={p._id} to={`/admin/promotions/${p._id}`} className="flex items-center justify-between border-b border-[#EAEAEA] py-3 adm-row-hover">
                  <span className="truncate text-[13px] text-black">{p.name}</span>
                  <span className="text-[11px] text-[#AAAAAA]">{p.startsAt ? new Date(p.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>
                </Link>
              ))}
            </section>
            <section>
              <p className="adm-index">Finished</p>
              {!expired.length ? <p className="border-y border-[#EAEAEA] py-6 text-[12px] text-[#AAAAAA]">Nothing has finished yet.</p> : expired.map((p) => (
                <Link key={p._id} to={`/admin/promotions/${p._id}`} className="flex items-center justify-between border-b border-[#EAEAEA] py-3 adm-row-hover">
                  <span className="truncate text-[13px] text-black">{p.name}</span>
                  <span className="text-[11px] text-[#AAAAAA]">{num(p.usedCount)} uses</span>
                </Link>
              ))}
            </section>
          </div>

          {(d?.daily || []).length > 0 && (
            <section>
              <p className="adm-index">Day by day</p>
              <ul>
                {d.daily.slice(-14).map((row) => {
                  const max = Math.max(...d.daily.map((x) => x.given), 1);
                  return (
                    <li key={row.date} className="flex items-center gap-3 border-b border-[#F0F0F0] py-2">
                      <span className="w-20 shrink-0 text-[11px] tabular-nums text-[#AAAAAA]">
                        {new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="h-px min-w-0 flex-1 bg-[#F5F5F5]" aria-hidden>
                        <span className="block h-px bg-white" style={{ width: `${Math.max(2, (row.given / max) * 100)}%` }} />
                      </span>
                      <span className="w-28 shrink-0 text-right text-[11px] tabular-nums text-[#777777]">
                        {money(row.given)} · {num(row.uses)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </AdminLayout>
  );
}
