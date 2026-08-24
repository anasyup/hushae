import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Copy, Download, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { typeOf } from './promotions/promoTypes';
import PromoCalendar from './promotions/PromoCalendar';
import {
  btnGhost, btnSolid, ctlInline,
  EditorialEmpty, TableSkeleton, MonoStatus,
} from './orders/orderUi';

const num = (n) => Number(n || 0).toLocaleString('en-PK');
const money = (n) => `PKR ${num(n)}`;

const STATE_LABEL = {
  live: 'ACTIVE', scheduled: 'SCHEDULED', ended: 'EXPIRED', disabled: 'OFF',
  'limit-reached': 'LIMIT', 'budget-spent': 'BUDGET',
  'not-today': 'NOT TODAY', 'outside-hours': 'OUTSIDE HOURS',
};

function promoStatus(state) {
  const r = state?.reason || 'disabled';
  const label = STATE_LABEL[r] || String(r).toUpperCase();
  const dim = !['live'].includes(r);
  return { label, dim };
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
  const routeType = pathname === '/admin/bundles' ? 'bundle'
    : pathname === '/admin/flash-sales' ? 'flash' : '';
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const filter = params.get('state') || '';
  const q = params.get('q') || '';

  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const title = routeType === 'bundle' ? 'Bundles' : routeType === 'flash' ? 'Flash sales' : 'Promotions';

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
  const setQ = (v) => {
    const p = new URLSearchParams(params);
    if (v) p.set('q', v); else p.delete('q');
    setParams(p, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!rows) return null;
    let rowsIn = routeType ? rows.filter((r) => r.type === routeType) : rows;
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      rowsIn = rowsIn.filter((r) => r.name?.toLowerCase().includes(n) || typeOf(r.type).label.toLowerCase().includes(n));
    }
    if (!filter) return rowsIn;
    if (filter === 'live') return rowsIn.filter((r) => r.state?.reason === 'live');
    if (filter === 'scheduled') return rowsIn.filter((r) => r.state?.reason === 'scheduled');
    if (filter === 'ended') return rowsIn.filter((r) => ['ended', 'limit-reached', 'budget-spent'].includes(r.state?.reason));
    if (filter === 'off') return rowsIn.filter((r) => r.state?.reason === 'disabled');
    return rowsIn;
  }, [rows, filter, routeType, q]);

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
    <AdminLayout title={title}>
      <PageHeader
        title={title}
        description="Automatic discounts. Customers do not type a code."
        actions={(
          <>
            <Link to="/admin/marketing/analytics" className={btnGhost}>Performance</Link>
            <Link to="/admin/marketing/settings" className={btnGhost}>Rules</Link>
            <Link to="/admin/promotions/new" className={btnSolid}><Plus size={12} /> New promotion</Link>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Promotion workspace</p>
        <div className="adm-divide-x mb-5 grid grid-cols-2 border-y border-[#EAEAEA] lg:grid-cols-4">
          {[
            { label: 'Live now', value: num(counts.live) },
            { label: 'Scheduled', value: num(counts.scheduled) },
            { label: 'Given away (30d)', value: stats ? money(stats.totalGiven) : '—' },
            { label: 'Orders affected', value: stats ? num(stats.ordersAffected) : '—' },
          ].map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[26px] leading-none text-black">{x.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search promotions…" aria-label="Search promotions" className="h-8 min-w-[200px] flex-1 rounded-[4px] border border-[#DCDCDC] bg-[#0A0A0A] px-3 text-[12px] text-black outline-none placeholder:text-[#AAAAAA]" />
          <select
            value={filter}
            onChange={(e) => { const p = new URLSearchParams(params); if (e.target.value) p.set('state', e.target.value); else p.delete('state'); setParams(p); }}
            aria-label="Status"
            className={`${ctlInline} max-w-[160px]`}
          >
            <option value="">All ({counts.all})</option>
            <option value="live">Active ({counts.live})</option>
            <option value="scheduled">Scheduled ({counts.scheduled})</option>
            <option value="ended">Finished ({counts.ended})</option>
            <option value="off">Off ({counts.off})</option>
          </select>
          <button type="button" onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} className={btnGhost}>
            {view === 'calendar' ? 'List' : 'Calendar'}
          </button>
          <button type="button" onClick={exportCsv} className={btnGhost}><Download size={12} /> Export</button>
        </div>
      </section>

      {view === 'calendar' ? (
        <PromoCalendar rows={rows} />
      ) : (
        <section>
          <p className="adm-index">02 — Promotions</p>
          {selected.length > 0 && (
            <div className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-[#EAEAEA] bg-[#050505] py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-black">{selected.length} selected</span>
              <button type="button" disabled={busy} onClick={() => bulk('enable')} className={btnGhost}>Turn on</button>
              <button type="button" disabled={busy} onClick={() => bulk('disable')} className={btnGhost}>Turn off</button>
              <button type="button" disabled={busy} onClick={duplicate} className={btnGhost}><Copy size={11} /> Duplicate</button>
              <button type="button" disabled={busy} onClick={() => bulk('delete')} className={btnGhost}><Trash2 size={11} /> Delete</button>
              <button type="button" onClick={() => setSelected([])} className="ml-auto text-[11px] uppercase tracking-[0.12em] text-[#999999] hover:text-black">Clear</button>
            </div>
          )}

          {rows === null && <TableSkeleton rows={6} />}
          {rows && !filtered.length && (
            <EditorialEmpty
              title={filter || q ? 'Nothing in this group' : 'No promotions'}
              description={filter || q ? 'Try another filter.' : 'A promotion applies itself at checkout — no code for the customer to remember.'}
              action={!filter && !q && <Link to="/admin/promotions/new" className={btnSolid}>Create promotion</Link>}
            />
          )}

          {filtered?.length > 0 && (
            <div className="min-w-0 overflow-x-hidden">
              <div className="hidden border-b border-[#EAEAEA] px-1 py-2.5 md:grid md:grid-cols-[32px_minmax(0,1.4fr)_0.8fr_0.7fr_0.5fr_0.5fr_0.7fr] md:items-center md:gap-3">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" className="h-3.5 w-3.5 rounded-none accent-white" />
                <p className="adm-label">Promotion</p>
                <p className="adm-label">Value</p>
                <p className="adm-label">Status</p>
                <p className="adm-label">Uses</p>
                <p className="adm-label hidden xl:block">Given</p>
                <p className="adm-label" />
              </div>
              {filtered.map((p) => {
                const st = promoStatus(p.state);
                return (
                  <div key={p._id} className={`border-b border-[#EAEAEA] ${selected.includes(p._id) ? 'bg-[#FAFAFA]' : ''} adm-row-hover`}>
                    <div className="hidden md:grid md:grid-cols-[32px_minmax(0,1.4fr)_0.8fr_0.7fr_0.5fr_0.5fr_0.7fr] md:items-center md:gap-3 md:px-1 md:py-3.5">
                      <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} aria-label={`Select ${p.name}`} className="h-3.5 w-3.5 rounded-none accent-white" />
                      <div className="min-w-0">
                        <Link to={`/admin/promotions/${p._id}`} className="truncate text-[13px] font-medium text-black hover:text-[#555555]">{p.name}</Link>
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[#AAAAAA]">
                          {typeOf(p.type).label}{p.exclusive ? ' · exclusive' : ''}{p.stackable ? ' · stackable' : ''}
                        </p>
                      </div>
                      <p className="text-[12px] text-[#333333]">{rewardText(p)}</p>
                      <MonoStatus label={st.label} dim={st.dim} />
                      <p className="text-[12px] tabular-nums text-[#555555]">{num(p.usedCount)}</p>
                      <p className="hidden text-[12px] tabular-nums text-[#999999] xl:block">{p.totalDiscounted ? money(p.totalDiscounted) : '—'}</p>
                      <p className="text-right text-[11px] text-[#AAAAAA]">P{p.priority}</p>
                    </div>
                    <div className="flex items-start gap-3 px-1 py-4 md:hidden">
                      <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} className="mt-1 h-3.5 w-3.5 rounded-none accent-white" />
                      <Link to={`/admin/promotions/${p._id}`} className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-black">{p.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#AAAAAA]">{typeOf(p.type).short} · {rewardText(p)}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <MonoStatus label={st.label} dim={st.dim} />
                          <span className="text-[11px] text-[#999999]">{num(p.usedCount)} uses</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </AdminLayout>
  );
}
