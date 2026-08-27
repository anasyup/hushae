import { useState } from 'react';
import { Truck, X } from 'lucide-react';

/* ============================================================================
 * TRACKING MODAL — courier + tracking number at ship time.
 *
 * Same editorial chrome as the desk's other modals. Tracking is encouraged
 * but never a blocker: "Skip for now" always lets the stage move, because a
 * stuck pipeline costs more than a missing number.
 * ========================================================================== */

const COURIERS = ['TCS', 'Leopards', 'BlueEx', 'Dawlance', 'PostEx', 'M&P', 'Call Courier', 'Swirl'];

export default function TrackingModal({ order, stageLabel, busy, onSubmit, onClose }) {
  const [courier, setCourier] = useState(order?.courierName || COURIERS[0]);
  const [custom, setCustom] = useState('');
  const [tracking, setTracking] = useState(order?.trackingNumber || '');

  const courierName = courier === 'Other' ? (custom.trim() || 'Courier') : courier;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Courier and tracking">
      <div className="w-full max-w-md border border-white/15 bg-[#0D0D0D]">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-[13px] font-medium text-white">
              {stageLabel ? `Ship ${order?.orderNumber || ''} — courier details` : `Tracking — ${order?.orderNumber || ''}`}
            </p>
            <p className="mt-1 text-[12px] text-white/40">
              {stageLabel
                ? 'Add the courier and tracking number now, or skip and add them later from the order.'
                : 'Customers get the number on their order track page.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/40 hover:text-white">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="adm-label mb-1.5 block" htmlFor="tm-courier">Courier</label>
            <select
              id="tm-courier"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className="w-full border border-white/15 bg-[#111] px-3 py-2 text-[13px] text-white focus:border-white/40 focus:outline-none"
            >
              {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other…</option>
            </select>
            {courier === 'Other' && (
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Courier name"
                className="mt-2 w-full border border-white/15 bg-[#111] px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="adm-label mb-1.5 block" htmlFor="tm-tracking">Tracking number</label>
            <input
              id="tm-tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. TCS-1029384756"
              className="w-full border border-white/15 bg-[#111] px-3 py-2 font-mono text-[13px] text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
          {stageLabel && (
            <button type="button" disabled={busy} onClick={() => onSubmit({ courier: courierName, tracking: tracking.trim(), skip: true })}
              className="px-3 py-2 text-[12px] text-white/45 transition-colors hover:text-white disabled:opacity-40">
              Skip for now
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit({ courier: courierName, tracking: tracking.trim(), skip: false })}
            className="inline-flex h-8 items-center gap-2 bg-white px-4 text-[12px] font-semibold text-black transition-colors hover:bg-white/85 disabled:opacity-40"
          >
            <Truck size={13} />
            {stageLabel ? 'Save & move stage' : 'Save tracking'}
          </button>
        </div>
      </div>
    </div>
  );
}
