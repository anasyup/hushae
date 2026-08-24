import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Send, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import Img from '../components/Img';
import { btnGhost, btnSolid, ctl, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

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
  useEffect(() => { load(); }, [status]); // eslint-disable-line

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
    const msg = encodeURIComponent('Hi! We noticed you left some items in your cart at HUSHAE. Would you like to complete your order?');
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

  if (!data) {
    return <AdminLayout title="Abandoned carts"><TableSkeleton rows={6} /></AdminLayout>;
  }

  const s = data.stats || {};
  const carts = data.carts || [];
  const filtered = q.trim()
    ? carts.filter((c) => (c.name || '').toLowerCase().includes(q.toLowerCase()) || (c.email || '').toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q))
    : carts;
  const recoveryRate = s.openCount > 0 ? (((s.recoveredCount || 0) / (s.openCount + (s.recoveredCount || 0))) * 100).toFixed(1) : 0;

  const recoveryLabel = (c) => {
    if (c.recoveredOrderId) return { label: 'RECOVERED', dim: false };
    if (c.recoveryEmailSentAt) return { label: 'EMAILED', dim: true };
    return { label: 'OPEN', dim: true };
  };

  return (
    <AdminLayout title="Abandoned carts">
      <PageHeader
        title="Abandoned carts"
        description="Recovery for incomplete checkouts."
        actions={status === 'open' && carts.length > 0 ? (
          <button type="button" onClick={bulkSend} disabled={busy === 'bulk'} className={btnSolid}>
            <Send size={12} /> {busy === 'bulk' ? 'Sending…' : 'Bulk email'}
          </button>
        ) : null}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Recovery</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] lg:grid-cols-4">
          {[
            { label: 'Open carts', value: s.openCount || 0, sub: pkr(s.openValue || 0) },
            { label: 'Recovery rate', value: `${recoveryRate}%`, sub: `${s.recoveredCount || 0} recovered` },
            { label: 'Recovered value', value: pkr(s.recoveredValue || 0), sub: `${s.recoveredCount || 0} orders` },
            { label: 'Still open', value: pkr(s.openValue || 0), sub: 'Not yet recovered' },
          ].map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[26px] leading-none text-black">{x.value}</p>
              <p className="mt-2 text-[11px] text-[#AAAAAA]">{x.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="adm-index">02 — Carts</p>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setQ(''); setExpanded(null); }}
            aria-label="Status"
            className="h-8 rounded-[4px] border border-[#DCDCDC] bg-[#0A0A0A] px-3 text-[12px] text-black"
          >
            <option value="open">Open ({s.openCount || 0})</option>
            <option value="recovered">Recovered ({s.recoveredCount || 0})</option>
            <option value="all">All</option>
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className={`${ctl} max-w-xs`} />
        </div>

        {filtered.length === 0 && (
          <EditorialEmpty
            title={status === 'open' ? 'No open carts' : status === 'recovered' ? 'No recovered carts' : 'No cart data'}
            description={status === 'open' ? 'Customers who leave checkout appear here.' : 'Recovered carts are those where the customer returned and ordered.'}
          />
        )}

        {filtered.map((c) => {
          const isExpanded = expanded === c._id;
          const rec = recoveryLabel(c);
          return (
            <article key={c._id} className="border-b border-[#EAEAEA]">
              <div className="flex flex-wrap items-start gap-4 px-1 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#EAEAEA] bg-white text-[10px] font-medium text-black">
                  {(c.name || c.email || '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-black">{c.name || 'Anonymous'}</p>
                  <p className="mt-0.5 text-[11px] text-[#AAAAAA]">{c.email || c.phone || '—'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {(c.items || []).slice(0, 4).map((it, i) => (
                        <Img key={i} src={it.image} alt="" className="h-8 w-8 border border-[#EAEAEA] object-cover" />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#AAAAAA]">{c.itemCount} item{c.itemCount === 1 ? '' : 's'} · {fmtDateTime(c.lastSeenAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="adm-metric text-[15px] text-black">{pkr(c.subtotal)}</p>
                  <div className="mt-1"><MonoStatus label={rec.label} dim={rec.dim} /></div>
                  {c.discountCodeIssued && <p className="mt-1 font-mono text-[10px] text-[#999999]">{c.discountCodeIssued}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {!c.recoveredOrderId && c.email && (
                    <button type="button" onClick={() => sendEmail(c._id)} disabled={busy === `email-${c._id}`} className={btnGhost}>
                      {busy === `email-${c._id}` ? '…' : 'Email'}
                    </button>
                  )}
                  {!c.recoveredOrderId && c.phone && (
                    <button type="button" onClick={() => sendWhatsApp(c.phone)} className={btnGhost}>WhatsApp</button>
                  )}
                  <button type="button" onClick={() => del(c._id)} className="grid h-8 w-8 place-items-center text-[#AAAAAA] hover:text-black" aria-label="Delete"><X size={13} /></button>
                  <button type="button" onClick={() => setExpanded(isExpanded ? null : c._id)} className="grid h-8 w-8 place-items-center text-[#999999] hover:text-black" aria-expanded={isExpanded}>
                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="grid gap-6 border-t border-[#F0F0F0] px-1 py-5 md:grid-cols-2">
                  <div>
                    <p className="adm-label mb-3">Customer</p>
                    <dl className="space-y-2 text-[13px]">
                      {c.name && <div className="flex justify-between"><dt className="text-[#AAAAAA]">Name</dt><dd className="text-black">{c.name}</dd></div>}
                      {c.email && <div className="flex justify-between"><dt className="text-[#AAAAAA]">Email</dt><dd className="text-black">{c.email}</dd></div>}
                      {c.phone && <div className="flex justify-between"><dt className="text-[#AAAAAA]">Phone</dt><dd className="text-black">{c.phone}</dd></div>}
                      <div className="flex justify-between"><dt className="text-[#AAAAAA]">Last seen</dt><dd className="text-[#555555]">{fmtDateTime(c.lastSeenAt)}</dd></div>
                      {c.createdAt && <div className="flex justify-between"><dt className="text-[#AAAAAA]">Created</dt><dd className="text-[#555555]">{fmtDateTime(c.createdAt)}</dd></div>}
                    </dl>
                  </div>
                  <div>
                    <p className="adm-label mb-3">Items</p>
                    <div className="space-y-2">
                      {(c.items || []).map((it, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-[12px]">
                          {it.image ? <img src={it.image} alt="" className="h-8 w-6 object-cover" /> : <span className="h-8 w-6 bg-[#F5F5F5]" />}
                          <span className="min-w-0 flex-1 truncate text-[#333333]">{it.name}</span>
                          <span className="text-[#AAAAAA]">×{it.quantity}</span>
                          <span className="w-20 text-right tabular-nums text-black">{pkr((it.price || 0) * (it.quantity || 1))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-[#EAEAEA] pt-2 text-[13px]">
                        <span className="text-[#999999]">Subtotal</span>
                        <span className="text-black">{pkr(c.subtotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {status === 'open' && carts.length > 0 && (
          <p className="mt-6 text-[12px] text-[#AAAAAA]">
            Best results within the first 2 hours.{' '}
            <Link to="/admin/settings/email" className="text-[#777777] hover:text-black">Email templates →</Link>
          </p>
        )}
      </section>
    </AdminLayout>
  );
}
