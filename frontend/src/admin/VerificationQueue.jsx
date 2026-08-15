import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Check, CheckCircle2, Loader2, MessageCircle, Phone, PhoneOff, RefreshCw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';

/* ============================================================================
 * VERIFICATION / CALL QUEUE — the worklist behind the "orders pending payment
 * verification 24h+" alert. Compact single-column list, one-tap actions,
 * keyboard shortcuts (V/N/C), auto-advance.
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
  const [cancelFor, setCancelFor] = useState(null); // order _id being cancelled
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    api('/orders/manage/verification-queue', { token: auth.token })
      .then((d) => setOrders(d.orders))
      .catch((e) => { if (e?.status === 401) return; toast('Could not load the queue'); });
  }, [auth.token]);

  useEffect(() => { load(); }, [load]);

  const storePhone = settings?.contactPhone || settings?.integrations?.whatsapp?.number || '';

  const act = async (id, action, extra = {}) => {
    setBusy(true);
    try {
      await api(`/orders/manage/${id}/verify-action`, { method: 'PATCH', token: auth.token, body: { action, ...extra } });
      toast(action === 'verified' ? 'Marked verified' : action === 'no-answer' ? 'No answer logged' : 'Order cancelled');
      // auto-advance: drop it from the local queue immediately
      setOrders((list) => (list || []).filter((o) => o._id !== id));
    } catch (e) { toast(e.message || 'Action failed'); }
    setBusy(false);
    setCancelFor(null); setReason('');
  };

  // Keyboard shortcuts — V verify, N no-answer, C cancel (skip while typing)
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
  }, [orders, busy, act]);

  const pending24h = useMemo(() => (orders || []).length, [orders]);

  const first = orders?.[0];

  return (
    <AdminLayout title="Verification Queue">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-semibold text-neutral-900">Verification queue</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {orders === null ? 'Loading…' : `${pending24h} order${pending24h === 1 ? '' : 's'} awaiting payment verification for 24h+ — oldest first.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-semibold text-neutral-600">Keys: V verify · N no-answer · C cancel</span>
          <button onClick={load} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"><RefreshCw size={12} /> Refresh</button>
        </div>
      </div>

      {orders === null ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white py-20 text-center">
          <CheckCircle2 size={30} className="mx-auto text-emerald-500" />
          <p className="mt-3 text-[15px] font-semibold text-neutral-900">All caught up</p>
          <p className="mt-1 text-[13px] text-neutral-500">No orders waiting for payment verification.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o, idx) => {
            const phone = waDigits(o.customerInfo?.phone);
            const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${o.customerInfo?.name || 'there'}, this is Hushae. Confirming your order ${o.orderNumber} for PKR ${Number(o.total || 0).toLocaleString('en-PK')}. Please reply YES to confirm or call us at ${storePhone} if you have questions.`)}` : '';
            const flagged = (o.noAnswer?.attempts || 0) >= 3;
            const cancelling = cancelFor === o._id;
            return (
              <div key={o._id} className={`rounded-2xl border bg-white p-4 transition ${idx === 0 ? 'border-neutral-900 ring-1 ring-neutral-900/10' : 'border-neutral-200'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ${idx === 0 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-sans text-[14px] font-semibold text-neutral-900">{o.customerInfo?.name || 'Customer'}</p>
                      <ReliabilityBadge reliability={o.reliability || null} compact />
                      <span className="font-mono text-[12px] text-neutral-500">{o.orderNumber}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
                      <a href={`tel:${o.customerInfo?.phone}`} className="inline-flex items-center gap-1 text-neutral-700 hover:underline"><Phone size={11} /> {o.customerInfo?.phone}</a>
                      <span>{o.customerInfo?.city}</span>
                      <span className="font-semibold tabular-nums text-neutral-900">{pkr(o.total)}</span>
                      <span>{ageHrs(o.createdAt)}h old</span>
                      {(o.noAnswer?.attempts || 0) > 0 && <span className={flagged ? 'font-semibold text-red-600' : 'text-amber-600'}>{o.noAnswer.attempts} no-answer{o.noAnswer.attempts === 1 ? '' : 's'}{flagged ? ' — review' : ''}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${o.orderNumber}`} title="Verify via WhatsApp" className="grid h-9 w-9 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"><MessageCircle size={15} /></a>}
                    <button disabled={busy} onClick={() => act(o._id, 'verified')} className="inline-flex h-9 items-center gap-1 rounded-full bg-brand px-3.5 text-[12px] font-semibold text-white shadow-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Verified</button>
                    <button disabled={busy} onClick={() => act(o._id, 'no-answer')} className="inline-flex h-9 items-center gap-1 rounded-full border border-neutral-300 bg-white px-3.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"><PhoneOff size={13} /> No Answer</button>
                    <button disabled={busy} onClick={() => { setCancelFor(o._id); setReason(''); }} className="inline-flex h-9 items-center gap-1 rounded-full border border-red-200 bg-white px-3.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"><Ban size={13} /> Cancel</button>
                  </div>
                </div>

                {cancelling && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
                    <span className="text-[12px] font-semibold text-red-700">Reason:</span>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-md border border-red-200 bg-white px-2 py-1.5 text-[12px] outline-none">
                      <option value="">Select reason…</option>
                      {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {reason === 'Other' && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe…" className="rounded-md border border-red-200 bg-white px-2 py-1.5 text-[12px] outline-none" />}
                    <button disabled={!reason || busy} onClick={() => act(o._id, 'cancel', { reason })} className="rounded-full bg-red-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">Confirm cancel</button>
                    <button onClick={() => { setCancelFor(null); setReason(''); }} className="rounded-full px-2 py-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">Dismiss</button>
                  </div>
                )}
              </div>
            );
          })}
          <p className="pt-2 text-center text-[12px] text-neutral-400">{first ? `Next: ${first.customerInfo?.name} — press V to verify` : 'Queue clear'}</p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 text-[12px] text-neutral-500">
        <p className="font-bold uppercase tracking-widest text-neutral-500">About this queue</p>
        <p className="mt-1">Orders appear here once they have been awaiting payment verification for more than 24 hours. "No Answer" attempts are counted — 3 or more flags the order for review before dispatch. See also <Link to="/admin/orders?payment=pending" className="font-semibold text-neutral-900 underline">all pending orders</Link>.</p>
      </div>
    </AdminLayout>
  );
}
