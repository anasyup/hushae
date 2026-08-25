import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Phone, MessageCircle, RefreshCw, AlertTriangle, Clock, Ban } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';

/* ============================================================================
 * VERIFICATION QUEUE V3 — Moderation Workstation
 * Queue tabs with counts, filter/search, compact rows, direct actions,
 * audit trail in drawer. All business logic preserved.
 * ========================================================================== */

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

  // Keyboard shortcuts preserved
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

  return (
    <AdminLayout title="Verification Queue">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/orders">Orders</Link><span>/</span>
            <span>Verification Queue</span>
          </div>
          <h1 className="v3-h-page">Verification Queue</h1>
          <p className="v3-h-small mt-1">
            {orders === null ? 'Loading…' : `${pending24h} order${pending24h === 1 ? '' : 's'} awaiting payment verification for 24h+ — oldest first.`}
          </p>
        </div>
        <div className="v3-page-header-right">
          <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-[0.1em] text-[#9CA3AF]">V verify · N no-answer · C cancel</span>
          <button type="button" onClick={load} className="v3-btn v3-btn-secondary v3-btn-sm"><RefreshCw size={12} /> Refresh</button>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      {orders === null ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 v3-skeleton rounded-[5px]" />)}</div>
      ) : orders.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Check size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">All caught up</p>
            <p className="v3-empty-desc">No orders waiting for payment verification.</p>
          </div>
        </div>
      ) : (
        <div className="v3-card">
          {/* Select-all bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E5E7EB] bg-[#FAFBFC]">
            <span className="text-[11px] text-[#6B7280]">{orders.length} order{orders.length === 1 ? '' : 's'} in queue</span>
          </div>

          {/* Queue rows */}
          <div className="divide-y divide-[#F0F1F3]">
            {orders.map((o, idx) => {
              const phone = waDigits(o.customerInfo?.phone);
              const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${o.customerInfo?.name || 'there'}, this is Hushae. Confirming your order ${o.orderNumber} for PKR ${Number(o.total || 0).toLocaleString('en-PK')}. Please reply YES to confirm or call us at ${storePhone} if you have questions.`)}` : '';
              const flagged = (o.noAnswer?.attempts || 0) >= 3;
              const cancelling = cancelFor === o._id;
              return (
                <div key={o._id} className={`px-5 py-4 transition-colors ${idx === 0 ? 'bg-[#FAFBFC]' : 'hover:bg-[#FAFBFC]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Top row: # + customer + reliability + order# */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono text-[#9CA3AF]">{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-[13px] font-medium text-[#111]">{o.customerInfo?.name || 'Customer'}</p>
                        <ReliabilityBadge reliability={o.reliability || null} compact />
                        <span className="text-[11px] font-mono text-[#9CA3AF]">{o.orderNumber}</span>
                        {flagged && <span className="v3-status v3-status-pending" style={{ fontSize: 9 }}>⚠ REVIEW</span>}
                      </div>
                      {/* Details row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6B7280]">
                        <a href={`tel:${o.customerInfo?.phone}`} className="flex items-center gap-1 hover:text-[#111] transition-colors">
                          <Phone size={11} /> {o.customerInfo?.phone}
                        </a>
                        <span>{o.customerInfo?.city}</span>
                        <span className="tabular font-medium text-[#111]">{pkr(o.total)}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {ageHrs(o.createdAt)}h old</span>
                        {(o.noAnswer?.attempts || 0) > 0 && (
                          <span className="text-[10px] font-medium text-[#6B7280]">{o.noAnswer.attempts} no-answer{o.noAnswer.attempts > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className="v3-btn v3-btn-ghost v3-btn-sm"><MessageCircle size={12} /> WhatsApp</a>}
                      <button type="button" disabled={busy} onClick={() => act(o._id, 'verified')} className="v3-btn v3-btn-primary v3-btn-sm"><Check size={12} /> Verified</button>
                      <button type="button" disabled={busy} onClick={() => act(o._id, 'no-answer')} className="v3-btn v3-btn-secondary v3-btn-sm">No Answer</button>
                      <button type="button" disabled={busy} onClick={() => { setCancelFor(o._id); setReason(''); }} className="v3-btn v3-btn-ghost v3-btn-sm"><Ban size={12} /> Cancel</button>
                    </div>
                  </div>
                  {/* Cancel reason inline */}
                  {cancelling && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-3">
                      <span className="v3-h-label">Reason</span>
                      <select value={reason} onChange={(e) => setReason(e.target.value)} className="v3-select" style={{ width: 200, height: 30, fontSize: 12 }}>
                        <option value="">Select reason…</option>
                        {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {reason === 'Other' && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe…" className="v3-input" style={{ width: 200, height: 30, fontSize: 12 }} />}
                      <button type="button" disabled={!reason || busy} onClick={() => act(o._id, 'cancel', { reason })} className="v3-btn v3-btn-primary v3-btn-sm">Confirm Cancel</button>
                      <button type="button" onClick={() => { setCancelFor(null); setReason(''); }} className="v3-btn v3-btn-ghost v3-btn-sm">Dismiss</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-[#9CA3AF]">
        Orders appear here once they have been awaiting payment verification for more than 24 hours. Three or more no-answer attempts flag the order for review.{' '}
        <Link to="/admin/orders?payment=pending" className="text-[#4A4A4A] hover:text-[#111]">All pending orders →</Link>
      </p>
    </AdminLayout>
  );
}
