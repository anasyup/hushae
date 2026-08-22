import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import {
  btnGhost, ctl, ctlInline,
  EditorialEmpty, EditorialError, EditorialPagination, TableSkeleton, MonoStatus,
} from './orders/orderUi';

/* ===========================================================================
 * Customers — Phase 06 editorial directory (presentation only).
 * Data: GET /admin/customers · tags PATCH · order history GET /orders/admin
 * ========================================================================== */

const SEGMENTS = [
  { key: 'all',     label: 'All customers',   match: () => true },
  { key: 'buyers',  label: 'Active buyers',   match: (c) => c.orders > 0 },
  { key: 'vip',     label: 'VIP',             match: (c) => c.orders >= 2 },
  { key: 'new',     label: 'New',             match: (c) => (Date.now() - new Date(c.createdAt).getTime()) < 30 * 864e5 },
  { key: 'noorder', label: 'No orders yet',   match: (c) => c.orders === 0 },
];

function segmentOf(c) {
  if (c.orders >= 2) return { label: 'VIP', dim: false };
  if (c.orders > 0) return { label: 'ACTIVE', dim: false };
  const isNew = (Date.now() - new Date(c.createdAt).getTime()) < 30 * 864e5;
  if (isNew) return { label: 'NEW', dim: true };
  return { label: 'NO ORDERS', dim: true };
}

export default function Customers() {
  const { auth } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const [orders, setOrders] = useState({});
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('all');
  const [tagDraft, setTagDraft] = useState({});
  const [tagBusy, setTagBusy] = useState(null);

  const load = () => {
    api('/admin/customers', { token: auth.token })
      .then((d) => { setList(d.customers); setErr(''); })
      .catch(() => { setList([]); setErr('Something prevented the customer directory from loading.'); });
  };
  useEffect(load, [auth]); // eslint-disable-line

  const saveTags = async (c, tags) => {
    setTagBusy(c.id);
    try {
      const d = await api(`/admin/customers/${c.id}/tags`, { method: 'PATCH', token: auth.token, body: { tags } });
      setList((ls) => ls.map((x) => (x.id === c.id ? { ...x, tags: d.tags } : x)));
      setTagDraft((t) => ({ ...t, [c.id]: '' }));
    } catch { /* toast handled by api client if any */ }
    setTagBusy(null);
  };
  const addTag = (c) => {
    const t = (tagDraft[c.id] || '').trim();
    if (!t) return;
    saveTags(c, [...(c.tags || []), t]);
  };
  const removeTag = (c, t) => saveTags(c, (c.tags || []).filter((x) => x !== t));

  const toggle = async (id) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next && !orders[id]) {
      const d = await api(`/orders/admin?customer=${id}`, { token: auth.token }).catch(() => ({ orders: [] }));
      setOrders((o) => ({ ...o, [id]: d.orders }));
    }
  };

  const filtered = useMemo(() => {
    if (!Array.isArray(list)) return [];
    const seg = SEGMENTS.find((s) => s.key === segment) || SEGMENTS[0];
    let out = list.filter(seg.match);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((c) =>
        c.name?.toLowerCase().includes(needle) ||
        c.email?.toLowerCase().includes(needle) ||
        c.phone?.toLowerCase().includes(needle)
      );
    }
    return out;
  }, [list, q, segment]);

  const summary = useMemo(() => {
    if (!Array.isArray(list)) return { total: 0, buyers: 0, vip: 0, newThisMonth: 0 };
    let buyers = 0, vip = 0, newThisMonth = 0;
    const cutoff = Date.now() - 30 * 864e5;
    for (const c of list) {
      if (c.orders > 0) buyers++;
      if (c.orders >= 2) vip++;
      if (new Date(c.createdAt).getTime() > cutoff) newThisMonth++;
    }
    return { total: list.length, buyers, vip, newThisMonth };
  }, [list]);

  const segmentCounts = useMemo(() => {
    if (!Array.isArray(list)) return {};
    const out = {};
    for (const s of SEGMENTS) out[s.key] = list.filter(s.match).length;
    return out;
  }, [list]);

  const PER_PAGE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q, segment]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const metrics = [
    { label: 'Total customers', value: summary.total, onClick: () => setSegment('all'), active: segment === 'all' },
    { label: 'Active', value: summary.buyers, onClick: () => setSegment('buyers'), active: segment === 'buyers' },
    { label: 'New', value: summary.newThisMonth, onClick: () => setSegment('new'), active: segment === 'new' },
    { label: 'VIP', value: summary.vip, onClick: () => setSegment('vip'), active: segment === 'vip' },
  ];

  return (
    <AdminLayout title="Customers">
      <PageHeader
        title="Customers"
        description="Customer relationships and activity."
        actions={(
          <Link to="/admin/customers/groups" className={btnGhost}>Groups</Link>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Customer overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 lg:grid-cols-4">
          {metrics.map((m) => (
            <button key={m.label} type="button" onClick={m.onClick} className="px-5 py-6 text-left adm-row-hover">
              <p className={`adm-label ${m.active ? 'text-white/70' : ''}`}>{m.label}</p>
              <p className="adm-metric mt-3 text-[32px] leading-none text-white">
                {list === null ? '—' : m.value.toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Customer workspace</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers…"
              aria-label="Search customers"
              className={ctl}
            />
          </div>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            aria-label="Segment"
            className={`${ctlInline} max-w-[180px]`}
          >
            {SEGMENTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}{segmentCounts[s.key] != null ? ` (${segmentCounts[s.key]})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4">
          {SEGMENTS.filter((s) => s.key !== 'all').map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSegment(s.key)}
              className={`text-left ${segment === s.key ? 'text-white' : 'text-white/40 hover:text-white/75'}`}
            >
              <span className="block text-[9px] font-medium uppercase tracking-[0.16em]">{s.label}</span>
              <span className="adm-metric mt-0.5 block text-[16px]">
                {list === null ? '—' : (segmentCounts[s.key] || 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <p className="adm-index">03 — Customers</p>

        {err && (
          <EditorialError title="Unable to load customers" description={err} onRetry={() => { setList(null); setErr(''); load(); }} />
        )}
        {list === null && !err && <TableSkeleton rows={7} />}
        {!err && list !== null && list.length === 0 && (
          <EditorialEmpty
            title="No customers"
            description="Customers will appear here as orders and accounts are created. Guest orders do not create accounts."
          />
        )}
        {!err && list?.length > 0 && filtered.length === 0 && (
          <EditorialEmpty
            title="No matches"
            description="No customers match your search or filter."
            action={<button type="button" onClick={() => { setQ(''); setSegment('all'); }} className={btnGhost}>Clear</button>}
          />
        )}

        {!err && paged.length > 0 && (
          <div className="min-w-0 overflow-x-hidden">
            <div className="hidden border-b border-white/10 px-1 py-2.5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_0.55fr_0.85fr_0.7fr_auto] lg:items-center lg:gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.15fr)_0.55fr_0.75fr_0.7fr_0.7fr_0.85fr_auto]">
              <p className="adm-label">Customer</p>
              <p className="adm-label">Contact</p>
              <p className="adm-label">Orders</p>
              <p className="adm-label">Revenue</p>
              <p className="adm-label hidden xl:block">Aov</p>
              <p className="adm-label">Segment</p>
              <p className="adm-label hidden xl:block">Joined</p>
              <p className="adm-label" />
            </div>

            {paged.map((c) => {
              const seg = segmentOf(c);
              const aov = c.orders > 0 ? Math.round((c.spent || 0) / c.orders) : 0;
              const initials = (c.name || '?').slice(0, 2).toUpperCase();
              const expanded = open === c.id;
              return (
                <Fragment key={c.id}>
                  <div className={`border-b border-white/10 ${expanded ? 'bg-white/[0.03]' : ''} adm-row-hover`}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="hidden w-full text-left lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_0.55fr_0.85fr_0.7fr_auto] lg:items-center lg:gap-3 lg:px-1 lg:py-3.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.15fr)_0.55fr_0.75fr_0.7fr_0.7fr_0.85fr_auto]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/15 bg-white text-[10px] font-medium tracking-[0.08em] text-black">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-white">{c.name || '—'}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/30">{c.email || '—'}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] text-white/70">{c.email || '—'}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-white/35">{c.phone || '—'}</p>
                      </div>
                      <p className="text-[12px] tabular-nums text-white/80">{c.orders}</p>
                      <p className="adm-metric text-[13px] text-white">{c.spent ? pkr(c.spent) : '—'}</p>
                      <p className="hidden text-[12px] tabular-nums text-white/45 xl:block">{aov ? pkr(aov) : '—'}</p>
                      <MonoStatus label={seg.label} dim={seg.dim} />
                      <p className="hidden text-[11px] text-white/30 xl:block">{fmtDate(c.createdAt)}</p>
                      <ChevronDown size={14} className={`ml-auto text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    <button type="button" onClick={() => toggle(c.id)} className="flex w-full items-start gap-3 px-1 py-4 text-left lg:hidden">
                      <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 bg-white text-[10px] font-medium text-black">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white">{c.name || '—'}</p>
                        <p className="mt-0.5 truncate text-[11px] text-white/35">{c.email || c.phone || '—'}</p>
                        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                          <p className="adm-metric text-[14px] text-white">{c.spent ? pkr(c.spent) : '—'}</p>
                          <p className="text-[11px] text-white/40">{c.orders} order{c.orders === 1 ? '' : 's'}</p>
                        </div>
                        <div className="mt-2"><MonoStatus label={seg.label} dim={seg.dim} /></div>
                      </div>
                      <ChevronDown size={14} className={`mt-1 shrink-0 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {expanded && (
                    <CustomerDossier
                      customer={c}
                      orders={orders[c.id]}
                      tagDraft={tagDraft[c.id] || ''}
                      tagBusy={tagBusy === c.id}
                      onDraft={(v) => setTagDraft((t) => ({ ...t, [c.id]: v }))}
                      onAdd={() => addTag(c)}
                      onRemove={(t) => removeTag(c, t)}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <EditorialPagination page={page} pages={pageCount} onPage={setPage} />
        )}
      </section>
    </AdminLayout>
  );
}

function CustomerDossier({ customer: c, orders, tagDraft, tagBusy, onDraft, onAdd, onRemove }) {
  const aov = c.orders > 0 ? Math.round((c.spent || 0) / c.orders) : 0;
  return (
    <div className="border-b border-white/10 bg-white/[0.02] px-1 py-6 lg:px-4">
      <section className="mb-8">
        <p className="adm-index">Customer</p>
        <div className="grid gap-6 border-y border-white/10 py-5 md:grid-cols-2">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-4"><dt className="text-white/35">Name</dt><dd className="text-white">{c.name || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/35">Email</dt><dd className="truncate text-white">{c.email || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/35">Phone</dt><dd className="font-mono text-white">{c.phone || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/35">Joined</dt><dd className="text-white/70">{fmtDate(c.createdAt)}</dd></div>
          </dl>
          <div>
            <p className="adm-label mb-2">Tags</p>
            <div className="flex flex-wrap items-center gap-2">
              {(c.tags || []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 border border-white/20 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/70">
                  {t}
                  {tagBusy ? <Loader2 size={9} className="animate-spin" /> : (
                    <button type="button" onClick={() => onRemove(t)} className="text-white/40 hover:text-white" aria-label={`Remove tag ${t}`}><X size={9} /></button>
                  )}
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  className={`${ctl} !h-7 !w-28`}
                  placeholder="Add tag…"
                  value={tagDraft}
                  onChange={(e) => onDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button type="button" onClick={onAdd} className="grid h-7 w-7 place-items-center border border-white/20 text-white/60 hover:text-white" aria-label="Add tag">
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <p className="adm-index">02 — Customer value</p>
        <div className="adm-divide-x grid grid-cols-3 border-y border-white/10">
          <div className="px-4 py-5">
            <p className="adm-label">Lifetime value</p>
            <p className="adm-metric mt-2 text-[26px] text-white">{c.spent ? pkr(c.spent) : '—'}</p>
          </div>
          <div className="px-4 py-5">
            <p className="adm-label">Orders</p>
            <p className="adm-metric mt-2 text-[26px] text-white">{c.orders}</p>
          </div>
          <div className="px-4 py-5">
            <p className="adm-label">Aov</p>
            <p className="adm-metric mt-2 text-[26px] text-white">{aov ? pkr(aov) : '—'}</p>
          </div>
        </div>
      </section>

      <section>
        <p className="adm-index">03 — Order history</p>
        {orders == null && <p className="border-y border-white/10 py-6 text-[12px] text-white/35">Loading orders…</p>}
        {orders && orders.length === 0 && (
          <p className="border-y border-white/10 py-6 text-[12px] text-white/35">This customer has not placed any orders yet.</p>
        )}
        {orders && orders.length > 0 && (
          <div>
            <div className="hidden border-b border-white/10 py-2 md:grid md:grid-cols-[1.2fr_1fr_1fr_1fr] md:gap-3">
              <p className="adm-label">Order</p>
              <p className="adm-label">Date</p>
              <p className="adm-label">Status</p>
              <p className="adm-label text-right">Total</p>
            </div>
            {orders.map((o) => (
              <Link
                key={o._id}
                to={`/admin/orders/${o._id}`}
                className="grid grid-cols-2 items-center gap-2 border-b border-white/5 py-3 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:gap-3 adm-row-hover"
              >
                <span className="font-mono text-[12px] text-white">{o.orderNumber}</span>
                <span className="text-[12px] text-white/40">{fmtDate(o.createdAt)}</span>
                <span className="col-span-2 md:col-span-1"><MonoStatus label={String(o.status || '').toUpperCase()} dim={['Cancelled', 'Refunded', 'Pending'].includes(o.status)} /></span>
                <span className="adm-metric text-right text-[13px] text-white">{pkr(o.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
