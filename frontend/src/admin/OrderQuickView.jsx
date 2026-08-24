import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, MessageCircle, X } from 'lucide-react';
import { api } from '../api/client';
import { fmtDate, fmtDateTime, pkr } from '../lib/format';

/* ============================================================================
 * Order quick view — right-side drawer opened from the dashboard Recent Orders
 * and (optionally) the orders desk. Real data only: GET /orders/manage/:id
 * returns the order + timeline + reliability. Actions use existing endpoints.
 * ========================================================================== */

const statusTone = (s) =>
  s === 'Delivered' ? 'var(--px-success)' : s === 'Cancelled' || s === 'Refunded' ? 'var(--px-danger)'
    : s === 'Pending' ? 'var(--px-warning)' : 'var(--px-info)';

export default function OrderQuickView({ id, token, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null); setErr('');
    api(`/orders/manage/${id}`, { token })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load order'); });
    return () => { alive = false; };
  }, [id, token]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const o = data?.order;
  const next = (o?.allowedNext || []).find((s) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(s));

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    try {
      await api(`/orders/manage/${id}/stage`, { method: 'PATCH', token, body: { stage: next, note: 'Quick view' } });
      const d = await api(`/orders/manage/${id}`, { token });
      setData(d);
    } catch (e) { setErr(e.message || 'Could not update'); }
    setBusy(false);
  };

  const phone = String(o?.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92');

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col shadow-2xl" style={{ background: 'var(--px-bg-card)', color: 'var(--px-ink)' }} role="dialog" aria-modal="true" aria-label={`Order ${o?.orderNumber || ''}`}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--px-border)' }}>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Order</p>
            <p className="font-mono text-[15px] font-semibold">{o?.orderNumber || '…'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 transition-colors hover:bg-[var(--px-bg-hover)]" style={{ color: 'var(--px-muted)' }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {err && !o && (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--px-danger)' }}>{err}</div>
          )}
          {!o && !err && (
            <div className="grid place-items-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--px-accent)' }} /></div>
          )}
          {o && (
            <div className="space-y-5">
              {/* status + payment */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: statusTone(o.status), background: `${statusTone(o.status)}1A` }}>
                  {o.status}
                </span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: 'var(--px-secondary)', background: 'var(--px-bg-hover)' }}>
                  {o.paymentMethod} · {o.paymentState || o.paymentStatus}
                </span>
                {o.isTestOrder && <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: 'var(--px-warning)', background: 'var(--px-bg-hover)' }}>Test order</span>}
              </div>

              {/* customer */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Customer</p>
                <p className="mt-1 text-[14px] font-semibold">{o.customerInfo?.name}</p>
                <p className="text-[12px]" style={{ color: 'var(--px-muted)' }}>{o.customerInfo?.phone} · {o.customerInfo?.city}</p>
                <p className="text-[12px]" style={{ color: 'var(--px-muted)' }}>{o.customerInfo?.address}</p>
              </div>

              {/* items */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Items</p>
                <div className="mt-2 space-y-2">
                  {(o.items || []).map((it, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--px-secondary)' }}>
                        {it.name} <span className="opacity-60">× {it.quantity}</span>{it.size ? ` · ${it.size}` : ''}
                      </span>
                      <span className="font-medium tabular-nums">{pkr(it.lineTotal ?? it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* totals */}
              <div className="rounded-[10px] border p-3 text-[13px]" style={{ borderColor: 'var(--px-border)' }}>
                <p className="flex justify-between" style={{ color: 'var(--px-secondary)' }}><span>Subtotal</span><span className="tabular-nums">{pkr(o.subtotal)}</span></p>
                {o.discount > 0 && <p className="mt-1 flex justify-between" style={{ color: 'var(--px-secondary)' }}><span>Discount</span><span className="tabular-nums">−{pkr(o.discount)}</span></p>}
                <p className="mt-1 flex justify-between" style={{ color: 'var(--px-secondary)' }}><span>Shipping</span><span className="tabular-nums">{pkr(o.shippingCharge || 0)}</span></p>
                <p className="mt-2 flex justify-between border-t pt-2 text-[15px] font-bold" style={{ borderColor: 'var(--px-border)' }}><span>Total</span><span className="tabular-nums">{pkr(o.total)}</span></p>
              </div>

              {/* timeline */}
              {(o.stageTimestamps && Object.keys(o.stageTimestamps).length > 0) || (data?.timeline?.length > 0) ? (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Timeline</p>
                  <ol className="mt-2 space-y-1.5">
                    {(data?.timeline || []).slice(-6).map((t, i) => (
                      <li key={i} className="flex gap-2 text-[12px]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--px-primary)' }} />
                        <span style={{ color: 'var(--px-secondary)' }}>{t.note || t.title || t.status || 'Update'}</span>
                        <span className="ml-auto shrink-0" style={{ color: 'var(--px-muted)' }}>{fmtDateTime(t.createdAt || t.at)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {o && (
          <div className="flex items-center gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--px-border)' }}>
            {phone && (
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--px-bg-hover)]" style={{ borderColor: 'var(--px-border)', color: 'var(--px-secondary)' }}>
                <MessageCircle size={13} /> Contact
              </a>
            )}
            <Link to={`/admin/orders/${id}`} className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--px-bg-hover)]" style={{ borderColor: 'var(--px-border)', color: 'var(--px-secondary)' }}>
              View full order <ArrowRight size={12} />
            </Link>
            <div className="flex-1" />
            {next && (
              <button onClick={advance} disabled={busy} className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[12px] font-semibold text-black transition-colors active:scale-[0.98] disabled:opacity-50" style={{ background: 'var(--px-primary)' }}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} {next}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
