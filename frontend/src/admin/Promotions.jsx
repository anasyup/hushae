import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  BadgePercent, BarChart3, Calendar, Copy, Download, Plus, Settings as SettingsIcon, Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Empty, Stat } from './ui/Controls';
import { PROMO_TYPES, typeOf } from './promotions/promoTypes';
import PromoCalendar from './promotions/PromoCalendar';

/* ============================================================================
 * ADMIN → PROMOTIONS
 *
 * Two views over the same data — a list for editing, a calendar for seeing
 * what collides with what. Which one is showing lives in the URL, so a
 * merchant can bookmark either and Back does what they expect.
 *
 * The state pill is the point of the list. "Off" and "spent its budget" look
 * identical in a bare table and mean completely different things, so the
 * server returns a reason and this renders it.
 * ========================================================================== */

const num = (n) => Number(n || 0).toLocaleString('en-PK');
const money = (n) => `PKR ${num(n)}`;

const STATE_STYLE = {
  live: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  scheduled: 'bg-sky-50 text-sky-800 ring-sky-200',
  ended: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  disabled: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  'limit-reached': 'bg-amber-50 text-amber-900 ring-amber-300',
  'budget-spent': 'bg-amber-50 text-amber-900 ring-amber-300',
  'not-today': 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  'outside-hours': 'bg-neutral-100 text-neutral-600 ring-neutral-200',
};
const STATE_LABEL = {
  live: 'Live', scheduled: 'Scheduled', ended: 'Finished', disabled: 'Off',
  'limit-reached': 'Limit reached', 'budget-spent': 'Budget spent',
  'not-today': 'Not today', 'outside-hours': 'Outside hours',
};

function StatePill({ state }) {
  const r = state?.reason || 'disabled';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATE_STYLE[r] || STATE_STYLE.disabled}`}>
      {STATE_LABEL[r] || r}
    </span>
  );
}

function rewardText(p) {
  if (p.type === 'freeship') return 'Free delivery';
  if (p.type === 'bxgy') return `Buy ${p.bxgy?.buyQty ?? 2} get ${p.bxgy?.getQty ?? 1}`;
  if (p.type === 'bundle') return p.bundle?.bundlePrice ? money(p.bundle.bundlePrice) : `${p.discountPercent}%`;
  if (p.type === 'tiered') return `${(p.tiers || []).length} tiers`;
  if (p.discountPercent > 0) return `${p.discountPercent}% off`;
  if (p.discountFixed > 0) return `${money(p.discountFixed)} off`;
  return '—';
}

export default function Promotions() {
  const { auth, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  /* One component serves three routes. Deriving the type filter from the path
     keeps /admin/bundles honest without duplicating the table three times. */
  const routeType = pathname === '/admin/bundles' ? 'bundle'
    : pathname === '/admin/flash-sales' ? 'flash' : '';
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const filter = params.get('state') || '';

  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!auth?.token) return;
    api('/promotions?limit=100', { token: auth.token })
      .then((d) => { setRows(d.promotions || []); setSelected([]); })
      .catch(() => { setRows([]); toast('Could not load promotions'); });
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auth?.token) return;
    api('/promotions/admin/stats?days=30', { token: auth.token }).then(setStats).catch(() => {});
  }, [auth?.token]);

  const setView = (v) => {
    const p = new URLSearchParams(params);
    if (v === 'list') p.delete('view'); else p.set('view', v);
    setParams(p, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!rows) return null;
    const base = routeType ? rows.filter((r) => r.type === routeType) : rows;
    const rowsIn = base;
    if (!filter) return rowsIn;
    if (filter === 'live') return rowsIn.filter((r) => r.state?.reason === 'live');
    if (filter === 'scheduled') return rowsIn.filter((r) => r.state?.reason === 'scheduled');
    if (filter === 'ended') return rowsIn.filter((r) => ['ended', 'limit-reached', 'budget-spent'].includes(r.state?.reason));
    if (filter === 'off') return rowsIn.filter((r) => r.state?.reason === 'disabled');
    return rowsIn;
  }, [rows, filter, routeType]);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0, live: 0, scheduled: 0, ended: 0, off: 0 };
    (rows || []).forEach((r) => {
      const s = r.state?.reason;
      if (s === 'live') c.live += 1;
      else if (s === 'scheduled') c.scheduled += 1;
      else if (['ended', 'limit-reached', 'budget-spent'].includes(s)) c.ended += 1;
      else if (s === 'disabled') c.off += 1;
    });
    return c;
  }, [rows]);

  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allChecked = filtered?.length > 0 && selected.length === filtered.length;
  const toggleAll = () => setSelected(allChecked ? [] : (filtered || []).map((r) => r._id));

  const bulk = async (action, extra = {}) => {
    if (!selected.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${selected.length} promotion(s)? Their usage history is kept.`)) return;
    setBusy(true);
    try {
      const r = await api('/promotions/bulk', { method: 'POST', token: auth.token, body: { ids: selected, action, ...extra } });
      toast(`${r.affected} promotion${r.affected === 1 ? '' : 's'} updated`);
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(false); }
  };

  /* Duplicate is a client-side read-then-create rather than a bulk action:
     each copy needs its own name, and the server should not be inventing
     "Copy of Copy of…" naming rules. */
  const duplicate = async () => {
    if (!selected.length) return;
    setBusy(true);
    let made = 0;
    try {
      for (const id of selected) {
        const { promotion } = await api(`/promotions/${id}`, { token: auth.token });
        const { _id, createdAt, updatedAt, state, usedCount, totalDiscounted, __v, ...copy } = promotion;
        await api('/promotions', { method: 'POST', token: auth.token, body: { ...copy, name: `${copy.name} (copy)`, enabled: false } });
        made += 1;
      }
      toast(`${made} copied — each is switched off`);
      load();
    } catch (e) { toast(e.message || 'Could not duplicate'); } finally { setBusy(false); }
  };

  const exportCsv = async () => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/promotions/admin/export?days=90`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'promotions.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e.message || 'Export failed'); }
  };

  return (
    <AdminLayout title={routeType === 'bundle' ? 'Bundles' : routeType === 'flash' ? 'Flash sales' : 'Promotions'}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <BadgePercent size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">{routeType === 'bundle' ? 'Bundles' : routeType === 'flash' ? 'Flash sales' : 'Promotions'}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
              Automatic discounts. Customers do not type a code — these apply themselves.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/marketing/analytics" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <BarChart3 size={13} /> Analytics
          </Link>
          <Link to="/admin/marketing/settings" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <SettingsIcon size={13} /> Rules
          </Link>
          <Link to="/admin/promotions/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
            <Plus size={13} /> New promotion
          </Link>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Live now" value={num(counts.live)} />
        <Stat label="Scheduled" value={num(counts.scheduled)} />
        <Stat label="Given away (30d)" value={stats ? money(stats.totalGiven) : '—'} sub={stats ? `${num(stats.uses)} uses` : '\u00A0'} />
        <Stat label="Orders affected" value={stats ? num(stats.ordersAffected) : '—'} sub={stats ? `avg ${money(stats.avgPerOrder)}` : '\u00A0'} />
      </div>

      {/* ---- view switch ---- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[['list', 'List'], ['calendar', 'Calendar']].map(([id, label]) => (
          <button
            key={id} type="button" onClick={() => setView(id)}
            aria-current={view === id ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${view === id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900'}`}
          >
            {id === 'calendar' && <Calendar size={14} aria-hidden="true" />}
            {label}
          </button>
        ))}
        <button type="button" onClick={exportCsv} className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
          <Download size={13} /> Export
        </button>
      </div>

      {view === 'calendar' ? (
        <PromoCalendar rows={rows} />
      ) : (
        <>
          {/* ---- state filter ---- */}
          <div className="mb-4 flex flex-wrap gap-2">
            {[['', 'All', counts.all], ['live', 'Live', counts.live], ['scheduled', 'Scheduled', counts.scheduled],
              ['ended', 'Finished', counts.ended], ['off', 'Off', counts.off]].map(([id, label, n]) => (
              <button
                key={id || 'all'} type="button"
                onClick={() => { const p = new URLSearchParams(params); if (id) p.set('state', id); else p.delete('state'); setParams(p); }}
                aria-pressed={filter === id}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-medium transition ${filter === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}
              >
                {label}<span className={filter === id ? 'text-white/70' : 'text-neutral-500'}>{n}</span>
              </button>
            ))}
          </div>

          {rows === null ? (
            <div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" />
          ) : !filtered.length ? (
            <Empty
              title={filter ? 'Nothing in this group' : 'No promotions yet'}
              description={filter
                ? 'Try another filter.'
                : 'A promotion applies itself at checkout — no code for the customer to remember. Start with something simple, like 10% off one category.'}
              action={!filter && (
                <Link to="/admin/promotions/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
                  <Plus size={13} /> Create your first promotion
                </Link>
              )}
            />
          ) : (
            <>
              {/* ---- bulk bar: only with a selection, so it never competes
                      with the list for attention ---- */}
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-700">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-neutral-900" />
                  Select all ({filtered.length})
                </label>
                {selected.length > 0 && (
                  <>
                    <span className="text-[12px] text-neutral-600">{selected.length} selected</span>
                    <div className="ml-auto flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => bulk('enable')} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">Turn on</button>
                      <button type="button" disabled={busy} onClick={() => bulk('disable')} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">Turn off</button>
                      <button type="button" disabled={busy} onClick={duplicate} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">
                        <Copy size={13} /> Duplicate
                      </button>
                      <button type="button" disabled={busy} onClick={() => bulk('delete')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Cards on mobile, table from md. A seven-column table on a
                  360px phone is unreadable however it is styled. */}
              <ul className="space-y-2 md:hidden">
                {filtered.map((p) => (
                  <li key={p._id} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)}
                        aria-label={`Select ${p.name}`} className="mt-1 h-4 w-4 shrink-0 accent-neutral-900"
                      />
                      <Link to={`/admin/promotions/${p._id}`} className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-neutral-900">{p.name}</p>
                        <p className="mt-0.5 text-[11px] text-neutral-600">{typeOf(p.type).short} · {rewardText(p)}</p>
                      </Link>
                      <StatePill state={p.state} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 pl-7 text-[11px] text-neutral-600">
                      <span>Priority {p.priority}</span>
                      <span>{num(p.usedCount)} uses</span>
                      {p.totalDiscounted > 0 && <span>{money(p.totalDiscounted)} given</span>}
                      {p.exclusive && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900">Exclusive</span>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block">
                <table className="w-full text-left">
                  <caption className="sr-only">Promotions, {filtered.length} shown</caption>
                  <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-600">
                    <tr>
                      <th scope="col" className="w-10 px-4 py-3">
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all promotions" className="h-4 w-4 accent-neutral-900" />
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">Promotion</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Reward</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Priority</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Uses</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Given</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-[13px]">
                    {filtered.map((p) => (
                      <tr key={p._id} className="bg-white transition hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} aria-label={`Select ${p.name}`} className="h-4 w-4 accent-neutral-900" />
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/admin/promotions/${p._id}`} className="font-medium text-neutral-900 underline-offset-2 hover:underline">{p.name}</Link>
                          <p className="mt-0.5 text-[11px] text-neutral-600">
                            {typeOf(p.type).label}
                            {p.exclusive && ' · exclusive'}
                            {p.stackable && ' · stackable'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{rewardText(p)}</td>
                        <td className="px-4 py-3"><StatePill state={p.state} /></td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{p.priority}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{num(p.usedCount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{p.totalDiscounted ? money(p.totalDiscounted) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
}
