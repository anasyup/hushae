import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, Crown, Filter, Loader2, Mail, Phone, Plus, Search, ShoppingBag, Tag as TagIcon, X,
  TrendingUp, Users as UsersIcon,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * Customers — premium admin view.
 * Header: KPI cards (Total / Active buyers / VIP / New this month)
 * Search + segment filter
 * Table rows expand inline to reveal each customer's orders
 * ========================================================================== */

const SEGMENTS = [
  { key: 'all',     label: 'All customers',   match: () => true },
  { key: 'buyers',  label: 'Active buyers',   match: (c) => c.orders > 0 },
  { key: 'vip',     label: 'VIP (2+ orders)', match: (c) => c.orders >= 2 },
  { key: 'new',     label: 'New (30 days)',   match: (c) => (Date.now() - new Date(c.createdAt).getTime()) < 30 * 864e5 },
  { key: 'noorder', label: 'No orders yet',   match: (c) => c.orders === 0 },
];

export default function Customers() {
  const { auth } = useApp();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [orders, setOrders] = useState({});
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('all');
  const [tagDraft, setTagDraft] = useState('');   // per-customer input: {id: 'text'}
  const [tagBusy, setTagBusy] = useState(null);   // customer id currently saving

  /* Save a customer's tag set (Shopify-style). */
  const saveTags = async (c, tags) => {
    setTagBusy(c.id);
    try {
      const d = await api(`/admin/customers/${c.id}/tags`, { method: 'PATCH', token: auth.token, body: { tags } });
      setList((ls) => ls.map((x) => (x.id === c.id ? { ...x, tags: d.tags } : x)));
      setTagDraft((t) => ({ ...t, [c.id]: '' }));
    } catch { /* toast handled below */ }
    setTagBusy(null);
  };

  const addTag = (c) => {
    const t = (tagDraft[c.id] || '').trim();
    if (!t) return;
    const next = [...(c.tags || []), t];
    saveTags(c, next);
  };

  const removeTag = (c, t) => saveTags(c, (c.tags || []).filter((x) => x !== t));

  useEffect(() => {
    api('/admin/customers', { token: auth.token })
      .then((d) => setList(d.customers))
      .catch(() => setList([]));
  }, [auth]);

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
    if (!Array.isArray(list)) return { total: 0, buyers: 0, vip: 0, newThisMonth: 0, totalSpent: 0 };
    let buyers = 0, vip = 0, newThisMonth = 0, totalSpent = 0;
    const cutoff = Date.now() - 30 * 864e5;
    for (const c of list) {
      if (c.orders > 0) buyers++;
      if (c.orders >= 2) vip++;
      if (new Date(c.createdAt).getTime() > cutoff) newThisMonth++;
      totalSpent += c.spent || 0;
    }
    return { total: list.length, buyers, vip, newThisMonth, totalSpent };
  }, [list]);

  return (
    <AdminLayout title="Customers">
      {/* Summary KPIs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={UsersIcon}    label="Total customers"  value={summary.total.toLocaleString()}         accent="#111111" />
        <Kpi icon={ShoppingBag}  label="Active buyers"    value={summary.buyers.toLocaleString()}         accent="#2563eb" />
        <Kpi icon={Crown}        label="VIP customers"    value={summary.vip.toLocaleString()}            accent="#d97706" hint="≥ 2 orders" />
        <Kpi icon={TrendingUp}   label="New this month"   value={summary.newThisMonth.toLocaleString()}   accent="#059669" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or phone…"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-72 !py-2.5 !pl-9 !text-[13px]"
            />
          </div>
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSegment(s.key)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  segment === s.key ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-neutral-500">
          <b className="text-neutral-900">{filtered.length}</b> of {list?.length || 0}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/60">
              <th className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400">Customer</th>
              <th className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400">Contact</th>
              <th className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400">Joined</th>
              <th className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400">Orders</th>
              <th className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400">Spent</th>
              <th className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Fragment key={c.id}>
                <tr
                  className="cursor-pointer border-b border-neutral-100 transition hover:bg-neutral-50/70"
                  onClick={() => toggle(c.id)}
                >
                  <td className="px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-neutral-900 text-[12px] font-bold uppercase text-white">
                        {(c.name || '?').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">{c.name}</p>
                        {c.orders >= 2 && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-amber-700">
                            <Crown size={9} /> VIP
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    <p className="flex items-center gap-1.5 text-[12px] text-neutral-700">
                      <Mail size={11} className="text-neutral-400" /> {c.email}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-500">
                      <Phone size={11} className="text-neutral-400" /> {c.phone || '—'}
                    </p>
                  </td>
                  <td className="table-cell text-[12px] text-neutral-500">{fmtDate(c.createdAt)}</td>
                  <td className="px-3 py-2 text-[12px]">
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[12px] font-bold text-neutral-800 tabular-nums">
                      {c.orders}
                    </span>
                  </td>
                  <td className="table-cell font-sans font-semibold tabular-nums text-neutral-900">
                    {c.spent ? pkr(c.spent) : <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open === c.id ? 'rotate-180' : ''}`} />
                  </td>
                </tr>
                {open === c.id && (
                  <tr className="border-b border-neutral-100 bg-neutral-50/60">
                    <td colSpan={6} className="px-6 py-4">
                      {/* ── Tags (merchant labels — power the group rules) ── */}
                      <p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-neutral-500">Tags</p>
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {(c.tags || []).map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-white">
                            <TagIcon size={10} />
                            {t}
                            {tagBusy === c.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); removeTag(c, t); }} className="rounded-full hover:text-red-300" aria-label={`Remove tag ${t}`}>
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        ))}
                        <div className="inline-flex items-center gap-1">
                          <input
                            className="w-32 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] outline-none focus:border-neutral-900"
                            placeholder="Add tag…"
                            value={tagDraft[c.id] || ''}
                            onChange={(e) => setTagDraft((t) => ({ ...t, [c.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') addTag(c); }}
                          />
                          <button onClick={() => addTag(c)} className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900 text-white hover:bg-black" aria-label="Add tag">
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                      <p className="mb-3 text-[13px] font-bold uppercase tracking-widest text-neutral-500">Order history</p>
                      {(orders[c.id] || []).length === 0 ? (
                        <p className="text-[12px] text-neutral-500">
                          {orders[c.id] ? 'This customer has not placed any orders yet.' : 'Loading orders…'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {orders[c.id].map((o) => (
                            <Link
                              key={o._id}
                              to={`/admin/orders/${o._id}`}
                              className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[12px] transition hover:border-neutral-300 hover:shadow-sm"
                            >
                              <span className="font-mono font-semibold text-neutral-900">{o.orderNumber}</span>
                              <span className="text-neutral-500">{fmtDate(o.createdAt)}</span>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[13px] font-semibold bg-neutral-100 text-neutral-700 justify-self-start">{o.status}</span>
                              <b className="justify-self-end tabular-nums">{pkr(o.total)}</b>
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {list === null && <div className="p-6"><div className="animate-pulse rounded-xl bg-neutral-100 h-40" /></div>}
        {list?.length === 0 && (
          <div className="grid place-items-center py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
              <UsersIcon size={22} />
            </span>
            <p className="mt-3 text-sm font-medium text-neutral-700">No registered customers yet</p>
            <p className="mt-1 max-w-xs text-[12px] text-neutral-500">Guest orders do not create accounts — customers must sign up to appear here.</p>
          </div>
        )}
        {list?.length > 0 && filtered.length === 0 && (
          <div className="grid place-items-center py-16 text-center">
            <Filter size={22} className="text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">No customers match your search or filter.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, accent, hint }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}12`, color: accent }}>
          <Icon size={16} strokeWidth={1.9} />
        </span>
        {hint && <span className="text-[13px] font-semibold uppercase tracking-wider text-neutral-400">{hint}</span>}
      </div>
      <p className="mt-3 text-[13px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 font-sans text-[7px] font-semibold leading-none tabular-nums tracking-tight text-neutral-900">
        {value}
      </p>
    </div>
  );
}
