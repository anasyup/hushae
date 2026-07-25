import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Mail, Send, ShoppingBag, Trash2, TrendingUp, User, XCircle,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/*
 * Abandoned Cart Recovery admin page.
 * Lists carts where a customer entered an email at checkout but did not
 * complete. Admin can send a one-off recovery email (with a COMEBACK10 code)
 * or bulk-send to everything older than 24 hours.
 */

export default function AbandonedCarts() {
  const { auth, toast } = useApp();
  const [status, setStatus] = useState('open');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const d = await api(`/abandoned-cart/admin?status=${status}`, { token: auth.token });
      setData(d);
    } catch { setData({ carts: [], stats: {} }); }
  };
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const sendOne = async (id) => {
    setBusy(id);
    try {
      const r = await api(`/abandoned-cart/admin/${id}/send`, { method: 'POST', token: auth.token });
      toast(r.mail?.ok ? 'Recovery email sent' : (r.mail?.reason || 'Skipped'));
      await load();
    } catch (ex) { toast(ex.message || 'Failed'); }
    setBusy('');
  };

  const bulkSend = async () => {
    if (!window.confirm('Send recovery emails to all open carts older than 24 hours that were not yet emailed?')) return;
    setBusy('bulk');
    try {
      const r = await api('/abandoned-cart/admin/auto-send', { method: 'POST', token: auth.token, body: { hours: 24 } });
      toast(`Sent ${r.sent} · Failed ${r.failed}`);
      await load();
    } catch (ex) { toast(ex.message || 'Failed'); }
    setBusy('');
  };

  const del = async (id) => {
    if (!window.confirm('Delete this cart record?')) return;
    try { await api(`/abandoned-cart/admin/${id}`, { method: 'DELETE', token: auth.token }); await load(); }
    catch (ex) { toast(ex.message); }
  };

  if (!data) return <AdminLayout title="Abandoned Carts"><div className="skeleton h-64" /></AdminLayout>;
  const s = data.stats || {};

  return (
    <AdminLayout title="Abandoned Carts">
      {/* KPIs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ShoppingBag} label="Open carts"       value={s.openCount || 0}                            accent="#d97706" />
        <Kpi icon={Clock}       label="Value at risk"    value={pkr(s.openValue || 0)}                       accent="#dc2626" />
        <Kpi icon={TrendingUp}  label="Recovered"        value={s.recoveredCount || 0}                       accent="#059669" sub={pkr(s.recoveredValue || 0)} />
        <Kpi icon={Mail}        label="Recovery rate"    value={`${s.recoveryRate || 0}%`}                   accent="#2563eb" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {[
            { k: 'open',      l: 'Open' },
            { k: 'recovered', l: 'Recovered' },
            { k: 'all',       l: 'All' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setStatus(t.k)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                status === t.k ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >{t.l}</button>
          ))}
        </div>
        <button
          onClick={bulkSend}
          disabled={busy === 'bulk'}
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          <Send size={12} /> {busy === 'bulk' ? 'Sending…' : 'Auto-send >24h olds'}
        </button>
      </div>

      {/* Cart list */}
      <div className="space-y-3">
        {data.carts.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
            <ShoppingBag size={26} className="mb-2 text-neutral-300" />
            <p className="text-sm text-neutral-500">No abandoned carts in this view.</p>
          </div>
        ) : data.carts.map((c) => (
          <article key={c._id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                    {(c.name || c.email || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-neutral-900">{c.name || 'Anonymous'}</p>
                    <p className="truncate text-[11px] text-neutral-500">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {(c.items || []).slice(0, 4).map((it, i) => (
                      <Img key={i} src={it.image} alt="" className="h-9 w-7 rounded-md border-2 border-white object-cover shadow-sm" />
                    ))}
                    {c.items?.length > 4 && (
                      <span className="grid h-9 w-7 place-items-center rounded-md border-2 border-white bg-neutral-100 text-[10px] font-bold text-neutral-600 shadow-sm">+{c.items.length - 4}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {c.itemCount} item{c.itemCount === 1 ? '' : 's'} · last seen {fmtDateTime(c.lastSeenAt)}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-sans text-[16px] font-semibold tabular-nums text-neutral-900">{pkr(c.subtotal)}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.recoveryEmailSentAt && (
                    <span className="pill bg-blue-50 text-blue-700">Email sent</span>
                  )}
                  {c.recoveredOrderId && (
                    <span className="pill bg-emerald-50 text-emerald-700">Recovered ✓</span>
                  )}
                  {c.discountCodeIssued && (
                    <span className="pill bg-amber-50 text-amber-700">{c.discountCodeIssued}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!c.recoveredOrderId && (
                  <button
                    onClick={() => sendOne(c._id)}
                    disabled={busy === c._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
                    title="Send recovery email"
                  >
                    <Send size={11} /> {busy === c._id ? 'Sending…' : 'Send email'}
                  </button>
                )}
                <button
                  onClick={() => del(c._id)}
                  className="rounded-lg border border-neutral-200 p-2 text-neutral-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  aria-label="Delete"
                ><Trash2 size={12} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}12`, color: accent }}>
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 font-sans text-[22px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}
