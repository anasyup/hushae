import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

const waDigits = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  if (d.startsWith('92')) return d;
  return `92${d}`;
};

const ageHrs = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));

export default function VerificationQueue() {
  const { auth, toast, settings } = useApp();
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    api('/orders/manage/verification-queue', { token: auth.token })
      .then((d) => setOrders(d.orders))
      .catch((e) => { if (e?.status === 401) return; toast('Could not load the queue'); });
  }, [auth.token]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const storePhone = settings?.contactPhone || settings?.integrations?.whatsapp?.number || '';

  const act = async (id, action, extra = {}) => {
    setBusy(true);
    try {
      await api(`/orders/manage/${id}/verify-action`, { method: 'PATCH', token: auth.token, body: { action, ...extra } });
      toast(action === 'verified' ? 'Marked verified' : action === 'no-answer' ? 'No answer logged' : 'Order cancelled');
      setOrders((list) => (list || []).filter((o) => o._id !== id));
    } catch (e) { toast(e.message || 'Action failed'); }
    setBusy(false);
    setCancelFor(null); setReason('');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      const first = orders?.[0];
      if (!first || busy) return;
      if (k === 'v') act(first._id, 'verified');
      else if (k === 'n') act(first._id, 'no-answer');
      else if (k === 'c') { setCancelFor(first._id); setReason(''); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [orders, busy]); // eslint-disable-line

  const pending24h = useMemo(() => (orders || []).length, [orders]);
  const first = orders?.[0];

  return (
    <AdminLayout title="Verification Queue">
      <PageHeader
        title="Verification queue"
        description={orders === null ? 'Loading…' : `${pending24h} order${pending24h === 1 ? '' : 's'} awaiting payment verification for 24h+ — oldest first.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#AAAAAA]">V verify · N no-answer · C cancel</span>
            <button type="button" onClick={load} className={btnGhost}>Refresh</button>
          </div>
        }
      />

      {orders === null ? (
        <TableSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <EditorialEmpty title="All caught up" description="No orders waiting for payment verification." />
      ) : (
        <section>
          <p className="adm-index">01 — Queue</p>
          <div className="border-y border-[#EAEAEA]">
            {orders.map((o, idx) => {
              const phone = waDigits(o.customerInfo?.phone);
              const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${o.customerInfo?.name || 'there'}, this is Hushae. Confirming your order ${o.orderNumber} for PKR ${Number(o.total || 0).toLocaleString('en-PK')}. Please reply YES to confirm or call us at ${storePhone} if you have questions.`)}` : '';
              const flagged = (o.noAnswer?.attempts || 0) >= 3;
              const cancelling = cancelFor === o._id;
              return (
                <div key={o._id} className={`border-b border-[#F0F0F0] px-1 py-4 last:border-0 ${idx === 0 ? 'bg-[#FAFAFA]' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-[#AAAAAA]">{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-[13px] text-white">{o.customerInfo?.name || 'Customer'}</p>
                        <ReliabilityBadge reliability={o.reliability || null} compact />
                        <span className="font-mono text-[12px] text-[#999999]">{o.orderNumber}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#999999]">
                        <a href={`tel:${o.customerInfo?.phone}`} className="hover:text-white">{o.customerInfo?.phone}</a>
                        <span>{o.customerInfo?.city}</span>
                        <span className="tabular-nums text-[#333333]">{pkr(o.total)}</span>
                        <span>{ageHrs(o.createdAt)}h old</span>
                        {(o.noAnswer?.attempts || 0) > 0 && (
                          <MonoStatus label={`${o.noAnswer.attempts} NO-ANSWER${flagged ? ' · REVIEW' : ''}`} dim={!flagged} />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className={btnGhost}>WhatsApp</a>}
                      <button type="button" disabled={busy} onClick={() => act(o._id, 'verified')} className={btnSolid}>Verified</button>
                      <button type="button" disabled={busy} onClick={() => act(o._id, 'no-answer')} className={btnGhost}>No answer</button>
                      <button type="button" disabled={busy} onClick={() => { setCancelFor(o._id); setReason(''); }} className={btnGhost}>Cancel</button>
                    </div>
                  </div>
                  {cancelling && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EAEAEA] pt-3">
                      <span className="adm-label">Reason</span>
                      <select value={reason} onChange={(e) => setReason(e.target.value)} className={`${ctl} max-w-xs`}>
                        <option value="">Select reason…</option>
                        {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {reason === 'Other' && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe…" className={`${ctl} max-w-xs`} />}
                      <button type="button" disabled={!reason || busy} onClick={() => act(o._id, 'cancel', { reason })} className={btnSolid}>Confirm cancel</button>
                      <button type="button" onClick={() => { setCancelFor(null); setReason(''); }} className={btnGhost}>Dismiss</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-white/25">
            {first ? `Next: ${first.customerInfo?.name} — press V to verify` : 'Queue clear'}
          </p>
        </section>
      )}

      <p className="mt-10 max-w-2xl text-[12px] leading-relaxed text-[#AAAAAA]">
        Orders appear here once they have been awaiting payment verification for more than 24 hours. Three or more no-answer attempts flag the order for review.{' '}
        <Link to="/admin/orders?payment=pending" className="text-[#555555] hover:text-white">All pending orders</Link>
      </p>
    </AdminLayout>
  );
}
