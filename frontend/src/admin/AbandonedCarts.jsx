import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Clock, Mail, MousePointerClick, Search, Send, ShoppingBag,
  Smartphone, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * ABANDONED CARTS — Phase 6 enhanced recovery centre.
 *
 * Shopify-style: KPI bar → quick stats → cart list with inline recovery.
 * Key metric: are carts growing faster than they are recovered?
 * ========================================================================== */

export default function AbandonedCarts() {
  const { auth, toast } = useApp();
  const [status, setStatus] = useState('open');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');

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
    if (!window.confirm('Send recovery emails to ALL open carts older than 24 hours?')) return;
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

  if (!data) return <AdminLayout title="Abandoned Carts"><div className="skeleton h-64 rounded-2xl" /></AdminLayout>;
  const s = data.stats || {};
  const carts = data.carts || [];

  const filtered = q.trim() ? carts.filter((c) => (c.name || '').toLowerCase().includes(q.toLowerCase()) || (c.email || '').toLowerCase().includes(q.toLowerCase())) : carts;

  const recoveryRate = s.openCount > 0 ? ((s.recoveredCount || 0) / (s.openCount + (s.recoveredCount || 0)) * 100).toFixed(1) : 0;

  return (
    <AdminLayout title="Abandoned Carts">
      {/* ── KPI Bar ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ShoppingBag}     label="Open carts"      value={s.openCount || 0}                          sub={`Worth ${pkr(s.openValue || 0)}`}                tone="warn" />
        <Kpi icon={MousePointerClick} label="Recovery rate" value={`${recoveryRate}%`}                        sub={`${s.recoveredCount || 0} recovered`}            tone="neutral" />
        <Kpi icon={TrendingUp}      label="Recovered value" value={pkr(s.recoveredValue || 0)}                 sub={`${s.recoveredCount || 0} orders`}               tone="up" />
        <Kpi icon={TrendingDown}    label="Lost value"      value={pkr((s.openValue || 0) - (s.recoveredValue || 0))} sub="Not yet recovered"                          tone="down" />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
            {[
              { k: 'open',      l: 'Open',      n: s.openCount },
              { k: 'recovered', l: 'Recovered', n: s.recoveredCount },
              { k: 'all',       l: 'All',       n: (s.openCount || 0) + (s.recoveredCount || 0) },
            ].map((t) => (
              <button key={t.k} onClick={() => { setStatus(t.k); setQ(''); }}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${status === t.k ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>
                {t.l} <span className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${status === t.k ? 'bg-white/20' : 'bg-neutral-100'}`}>{t.n || 0}</span>
              </button>
            ))}
          </div>
          {carts.length > 5 && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer…" className="input !w-48 !py-2 !pl-9 !text-[13px]" />
            </div>
          )}
        </div>
        {status === 'open' && carts.length > 0 && (
          <button onClick={bulkSend} disabled={busy === 'bulk'}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
            <Send size={12} /> {busy === 'bulk' ? 'Sending…' : 'Send recovery emails'}
          </button>
        )}
      </div>

      {/* ── Cart list ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
            <ShoppingBag size={32} className="mb-3 text-neutral-300" />
            <p className="text-[14px] font-medium text-neutral-700">
              {status === 'open' ? 'No open abandoned carts' : status === 'recovered' ? 'No recovered carts yet' : 'No cart data'}
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">
              {status === 'open' ? 'Customers who leave checkout will appear here within 24 hours.' : 'Recovered carts are those where the customer returned and placed their order.'}
            </p>
          </div>
        ) : filtered.map((c) => (
          <article key={c._id} className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1.5fr_1.2fr_auto] md:items-center">
              {/* Customer info */}
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-900 text-[12px] font-bold text-white">
                    {(c.name || c.email || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-neutral-900">{c.name || 'Anonymous'}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                      {c.email && <span className="inline-flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1"><Smartphone size={10} /> {c.phone}</span>}
                    </div>
                  </div>
                </div>
                {/* Items preview */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {(c.items || []).slice(0, 5).map((it, i) => (
                      <Img key={i} src={it.image} alt="" className="h-8 w-6 rounded-md border-2 border-white object-cover shadow-sm" />
                    ))}
                    {c.items?.length > 5 && (
                      <span className="grid h-8 w-6 place-items-center rounded-md border-2 border-white bg-neutral-100 text-[9px] font-bold text-neutral-600 shadow-sm">+{c.items.length - 5}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    {c.itemCount} item{c.itemCount === 1 ? '' : 's'} · <Clock size={10} className="inline" /> {fmtDateTime(c.lastSeenAt)}
                  </span>
                </div>
              </div>

              {/* Value + status */}
              <div>
                <p className="font-sans text-[18px] font-semibold tabular-nums text-neutral-900">{pkr(c.subtotal)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.recoveryEmailSentAt && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Email sent</span>}
                  {c.recoveredOrderId && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Recovered ✓</span>}
                  {c.discountCodeIssued && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{c.discountCodeIssued}</span>}
                  {!c.recoveryEmailSentAt && !c.recoveredOrderId && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Awaiting action</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!c.recoveredOrderId && (
                  <button onClick={() => sendOne(c._id)} disabled={busy === c._id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-black disabled:opacity-50">
                    <Send size={11} /> {busy === c._id ? 'Sending…' : 'Send email'}
                  </button>
                )}
                <button onClick={() => del(c._id)} className="rounded-full border border-neutral-200 p-2.5 text-neutral-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label="Delete">
                  <X size={12} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ── Tip card ─────────────────────────────────────────────────────── */}
      {status === 'open' && carts.length > 0 && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <BarChart3 size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-[13px] font-semibold text-blue-900">Recovery tips</p>
              <p className="mt-1 text-[12px] leading-relaxed text-blue-800">
                Abandoned cart emails recover <b>10-15%</b> of lost sales on average. Make sure your email template in Settings → Email includes a clear call-to-action and a discount incentive like <b>COMEBACK10</b>.
              </p>
              <Link to="/admin/settings/email" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:underline">
                Configure email templates →
              </Link>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }) {
  const t = {
    up:      'bg-emerald-50 text-emerald-700',
    down:    'bg-red-50 text-red-700',
    warn:    'bg-amber-50 text-amber-700',
    neutral: 'bg-neutral-100 text-neutral-700',
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${t[tone] || t.neutral}`}><Icon size={16} /></span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 font-sans text-[22px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}
