import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, ChevronDown, Clock, ExternalLink, Mail, MessageCircle,
  MousePointerClick, Phone, Search, Send, ShoppingBag,
  Smartphone, TrendingDown, TrendingUp, User, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * ABANDONED CARTS — Phase 6 enhanced recovery centre.
 *
 * Email + WhatsApp recovery options per cart.
 * Expandable customer detail panel with full item breakdown.
 * ========================================================================== */

export default function AbandonedCarts() {
  const { auth, toast } = useApp();
  const [status, setStatus] = useState('open');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    try {
      const d = await api(`/abandoned-cart/admin?status=${status}`, { token: auth.token });
      setData(d);
    } catch { setData({ carts: [], stats: {} }); }
  };
  useEffect(() => { load(); }, [status]);

  const sendEmail = async (id) => {
    setBusy(`email-${id}`);
    try {
      const r = await api(`/abandoned-cart/admin/${id}/send`, { method: 'POST', token: auth.token });
      toast(r.mail?.ok ? 'Recovery email sent!' : (r.mail?.reason || 'Skipped'));
      await load();
    } catch (ex) { toast(ex.message || 'Failed to send email'); }
    setBusy('');
  };

  const sendWhatsApp = (phone) => {
    if (!phone) { toast('No phone number available'); return; }
    const clean = phone.replace(/\D/g, '').replace(/^0/, '92');
    const msg = encodeURIComponent('Hi! We noticed you left some items in your cart at HUSHAE. Would you like to complete your order? We can help! 💫');
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const bulkSend = async () => {
    if (!window.confirm('Send recovery emails to ALL open carts older than 24 hours?')) return;
    setBusy('bulk');
    try {
      const r = await api('/abandoned-cart/admin/auto-send', { method: 'POST', token: auth.token, body: { hours: 24 } });
      toast(`${r.sent} sent · ${r.failed} failed`);
      await load();
    } catch (ex) { toast(ex.message || 'Failed'); }
    setBusy('');
  };

  const del = async (id) => {
    if (!window.confirm('Delete this cart record?')) return;
    try { await api(`/abandoned-cart/admin/${id}`, { method: 'DELETE', token: auth.token }); await load(); }
    catch (ex) { toast(ex.message); }
  };

  if (!data) return <AdminLayout title="Abandoned Carts"><div className="animate-pulse rounded-xl bg-neutral-100 h-64 rounded-2xl" /></AdminLayout>;
  const s = data.stats || {};
  const carts = data.carts || [];
  const filtered = q.trim() ? carts.filter((c) => (c.name || '').toLowerCase().includes(q.toLowerCase()) || (c.email || '').toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q)) : carts;
  const recoveryRate = s.openCount > 0 ? ((s.recoveredCount || 0) / (s.openCount + (s.recoveredCount || 0)) * 100).toFixed(1) : 0;

  return (
    <AdminLayout title="Abandoned Carts">
      {/* ── KPI Bar ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ShoppingBag} label="Open carts" value={s.openCount || 0} sub={`Worth ${pkr(s.openValue || 0)}`} tone="warn" />
        <Kpi icon={MousePointerClick} label="Recovery rate" value={`${recoveryRate}%`} sub={`${s.recoveredCount || 0} recovered`} tone="neutral" />
        <Kpi icon={TrendingUp} label="Recovered value" value={pkr(s.recoveredValue || 0)} sub={`${s.recoveredCount || 0} orders`} tone="up" />
        <Kpi icon={TrendingDown} label="Lost value" value={pkr((s.openValue || 0) - (s.recoveredValue || 0))} sub="Not yet recovered" tone="down" />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
            {[
              { k: 'open', l: 'Open', n: s.openCount },
              { k: 'recovered', l: 'Recovered', n: s.recoveredCount },
              { k: 'all', l: 'All', n: (s.openCount || 0) + (s.recoveredCount || 0) },
            ].map((t) => (
              <button key={t.k} onClick={() => { setStatus(t.k); setQ(''); setExpanded(null); }}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${status === t.k ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>
                {t.l} <span className={`ml-1 rounded-full px-1.5 text-[13px] font-bold ${status === t.k ? 'bg-white/20' : 'bg-neutral-100'}`}>{t.n || 0}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-56 !py-2 !pl-9 !text-[13px]" />
          </div>
        </div>
        {status === 'open' && carts.length > 0 && (
          <button onClick={bulkSend} disabled={busy === 'bulk'}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
            <Send size={12} /> {busy === 'bulk' ? 'Sending…' : 'Bulk email all'}
          </button>
        )}
      </div>

      {/* ── Cart list ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
            <ShoppingBag size={32} className="mb-3 text-neutral-300" />
            <p className="text-[12px] font-medium text-neutral-700">{status === 'open' ? 'No open abandoned carts' : status === 'recovered' ? 'No recovered carts yet' : 'No cart data'}</p>
            <p className="mt-1 text-[12px] text-neutral-500">{status === 'open' ? 'Customers who leave checkout appear here within 24 hours.' : 'Recovered carts are those where the customer returned and placed their order.'}</p>
          </div>
        ) : filtered.map((c) => {
          const isExpanded = expanded === c._id;
          const hasPhone = !!c.phone;
          const hasEmail = !!c.email;
          return (
            <article key={c._id} className={`rounded-2xl border bg-white transition hover:shadow-sm ${isExpanded ? 'border-neutral-400 ring-2 ring-neutral-400/10' : 'border-neutral-200'}`}>
              {/* Main row */}
              <div className="grid gap-4 p-5 md:grid-cols-[1.5fr_1.2fr_auto] md:items-center">
                {/* Customer info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-900 text-[12px] font-bold text-white">{(c.name || c.email || '?').slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-neutral-900">{c.name || 'Anonymous'}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-neutral-500">
                        {hasEmail && <span className="inline-flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                        {hasPhone && <span className="inline-flex items-center gap-1"><Phone size={10} /> {c.phone}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Items preview */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {(c.items || []).slice(0, 5).map((it, i) => (<Img key={i} src={it.image} alt="" className="h-8 w-6 rounded-md border-2 border-white object-cover shadow-sm" />))}
                      {c.items?.length > 5 && <span className="grid h-8 w-6 place-items-center rounded-md border-2 border-white bg-neutral-100 text-[12px] font-bold text-neutral-600 shadow-sm">+{c.items.length - 5}</span>}
                    </div>
                    <span className="text-[12px] text-neutral-500">{c.itemCount} item{c.itemCount === 1 ? '' : 's'} · <Clock size={10} className="inline" /> {fmtDateTime(c.lastSeenAt)}</span>
                  </div>
                </div>

                {/* Value + status */}
                <div>
                  <p className="font-sans text-[14px] font-semibold tabular-nums text-neutral-900">{pkr(c.subtotal)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.recoveryEmailSentAt && <span className="rounded-full bg-[#F1F1F1] px-2 py-0.5 text-[13px] font-bold text-[#5A5A5A]">Email sent</span>}
                    {c.recoveredOrderId && <span className="rounded-full bg-[#E9EFEA] px-2 py-0.5 text-[13px] font-bold text-[#3E5C4B]">Recovered ✓</span>}
                    {c.discountCodeIssued && <span className="rounded-full bg-[#F6F1E6] px-2 py-0.5 text-[13px] font-bold text-[#7A6239]">{c.discountCodeIssued}</span>}
                    {!c.recoveryEmailSentAt && !c.recoveredOrderId && <span className="rounded-full bg-[#F6F1E6] px-2 py-0.5 text-[13px] font-bold text-[#7A6239]">Awaiting action</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!c.recoveredOrderId && (
                    <div className="flex items-center gap-1.5">
                      {hasEmail && (
                        <button onClick={() => sendEmail(c._id)} disabled={busy === `email-${c._id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#525252] px-3.5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#525252] disabled:opacity-50" title="Send recovery email">
                          <Mail size={11} /> {busy === `email-${c._id}` ? '…' : 'Email'}
                        </button>
                      )}
                      {hasPhone && (
                        <button onClick={() => sendWhatsApp(c.phone)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#4A6B58] px-3.5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#3E5C4B]" title="Open WhatsApp">
                          <MessageCircle size={11} /> WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                  <button onClick={() => del(c._id)} className="rounded-full border border-neutral-200 p-2.5 text-neutral-400 transition hover:border-[#D0ABA0] hover:bg-[#F5EDEB] hover:text-[#8A4B3F]" aria-label="Delete"><X size={12} /></button>
                  <button onClick={() => setExpanded(isExpanded ? null : c._id)} aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    className={`rounded-full border p-2.5 transition ${isExpanded ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}>
                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* EXPANDABLE: Customer details + item breakdown */}
              {isExpanded && (
                <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Customer details */}
                    <div>
                      <p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-neutral-500">Customer details</p>
                      <div className="space-y-1.5 rounded-xl border border-neutral-200 bg-white p-3 text-[12px]">
                        {c.name && <p className="flex justify-between"><span className="text-neutral-500">Name</span><span className="font-semibold text-neutral-900">{c.name}</span></p>}
                        {c.email && <p className="flex justify-between"><span className="text-neutral-500">Email</span><span className="font-medium text-neutral-900">{c.email}</span></p>}
                        {c.phone && (
                          <p className="flex justify-between"><span className="text-neutral-500">Phone</span>
                            <a href={`https://wa.me/${c.phone.replace(/\D/g, '').replace(/^0/, '92')}`} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[#3E5C4B] hover:underline">
                              {c.phone} <ExternalLink size={10} />
                            </a>
                          </p>
                        )}
                        <p className="flex justify-between"><span className="text-neutral-500">Last seen</span><span className="text-neutral-900">{fmtDateTime(c.lastSeenAt)}</span></p>
                        {c.createdAt && <p className="flex justify-between"><span className="text-neutral-500">Cart created</span><span className="text-neutral-900">{fmtDateTime(c.createdAt)}</span></p>}
                      </div>
                    </div>

                    {/* Item breakdown */}
                    <div>
                      <p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-neutral-500">Items in cart</p>
                      <div className="space-y-1.5 rounded-xl border border-neutral-200 bg-white p-3">
                        {(c.items || []).map((it, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-[12px]">
                            {it.image ? <img src={it.image} alt="" className="h-8 w-6 rounded object-cover" /> : <span className="h-8 w-6 rounded bg-neutral-100" />}
                            <span className="min-w-0 flex-1 truncate text-neutral-800">{it.name}</span>
                            <span className="shrink-0 text-neutral-500">{[it.size, it.color].filter(Boolean).join(' · ') || '—'}</span>
                            <span className="w-8 text-right tabular-nums text-neutral-500">×{it.quantity}</span>
                            <span className="w-20 text-right font-medium tabular-nums">{pkr((it.price || 0) * (it.quantity || 1))}</span>
                          </div>
                        ))}
                        <div className="border-t border-neutral-100 pt-1.5 mt-1 flex justify-between text-[12px]">
                          <span className="font-semibold text-neutral-900">Subtotal</span>
                          <span className="font-semibold tabular-nums text-neutral-900">{pkr(c.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* ── Recovery tips ───────────────────────────────────────────────── */}
      {status === 'open' && carts.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#D4D4D4] bg-[#F1F1F1] p-5">
          <div className="flex items-start gap-3">
            <BarChart3 size={18} className="mt-0.5 shrink-0 text-[#6B6B6B]" />
            <div>
              <p className="text-[13px] font-semibold text-[#3A3A3A]">Recovery tips</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#4A4A4A]">
                Use <b>Email</b> for automated recovery with discount codes, or <b>WhatsApp</b> for personal follow-up. Best results come from reaching out within the first 2 hours.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link to="/admin/settings/email" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5A5A5A] hover:bg-[#E8E8E8]">Email templates →</Link>
                <Link to="/admin/apps" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5A5A5A] hover:bg-[#E8E8E8]">WhatsApp settings →</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }) {
  const t = { up: 'bg-[#E9EFEA] text-[#3E5C4B]', down: 'bg-[#F5EDEB] text-[#8A4B3F]', warn: 'bg-[#F6F1E6] text-[#7A6239]', neutral: 'bg-neutral-100 text-neutral-700' };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${t[tone] || t.neutral}`}><Icon size={16} /></span>
      <p className="mt-3 text-[13px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-0.5 font-sans text-[13px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-neutral-500">{sub}</p>}
    </div>
  );
}
