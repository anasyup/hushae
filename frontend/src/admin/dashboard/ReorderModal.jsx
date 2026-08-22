import { useState } from 'react';
import { MessageCircle, PackageCheck, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';

/* ============================================================================
 * Low-stock reorder modal — suggested quantity (to reach the target stock),
 * a shareable WhatsApp summary for the supplier, and a "reorder pending" flag
 * so staff never double-order. "Mark received" clears the flag and optionally
 * sets the new stock count.
 * ========================================================================== */

export default function ReorderModal({ product, onClose, onSaved }) {
  const { auth, toast, settings } = useApp();
  const target = product.targetStock || settings?.reorderTargetStock || 50;
  const suggested = Math.max(1, target - (product.stock || 0));
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const [newStock, setNewStock] = useState('');

  const supplierMsg = encodeURIComponent(
    `Reorder request — HUSHAE\n\nProduct: ${product.name}\nSKU: ${product.sku || '—'}\nCurrent stock: ${product.stock}\nReorder quantity: ${suggested} (target ${target})\n\nPlease confirm availability and ETA.`
  );

  const place = async () => {
    setBusy(true);
    try {
      await api(`/products/${product._id}/reorder`, { method: 'PATCH', token: auth.token });
      toast('Reorder marked as pending'); onSaved?.(); onClose();
    } catch (e) { toast(e.message); }
    setBusy(false);
  };

  const receive = async () => {
    setBusy(true);
    try {
      const body = newStock !== '' ? { stock: Number(newStock) } : {};
      await api(`/products/${product._id}/reorder/received`, { method: 'PATCH', token: auth.token, body });
      toast('Reorder received'); onSaved?.(); onClose();
    } catch (e) { toast(e.message); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Reorder</p>
            <p className="mt-1 text-[14px] font-semibold text-neutral-900">{product.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"><X size={16} /></button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wider text-neutral-500">Current</p><p className="font-sans text-[18px] font-semibold tabular-nums text-neutral-900">{product.stock}</p></div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wider text-neutral-500">Target</p><p className="font-sans text-[18px] font-semibold tabular-nums text-neutral-900">{target}</p></div>
          <div className="rounded-xl bg-neutral-900 p-3"><p className="text-[11px] uppercase tracking-wider text-neutral-300">Suggest</p><p className="font-sans text-[18px] font-semibold tabular-nums text-white">{suggested}</p></div>
        </div>

        {received ? (
          <div className="mt-4">
            <label className="mb-1 block text-[12px] font-semibold text-neutral-600">New stock count (optional)</label>
            <input type="number" min="0" value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder={`${(product.stock || 0) + suggested} received`} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-[13px] outline-none focus:border-neutral-900" />
            <button onClick={receive} disabled={busy} className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"><PackageCheck size={15} /> Mark received</button>
          </div>
        ) : (
          <>
            <a href={`https://wa.me/?text=${supplierMsg}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 text-[13px] font-medium text-white transition hover:bg-white/15">
              <MessageCircle size={15} /> Send to supplier via WhatsApp
            </a>
            <div className="mt-3 flex gap-2">
              <button onClick={place} disabled={busy} className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg bg-neutral-900 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">Mark reorder placed</button>
              <button onClick={() => setReceived(true)} className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-neutral-300 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50">Mark received</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
