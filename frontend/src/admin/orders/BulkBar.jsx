import { useState } from 'react';
import {
  Ban, CheckCheck, ChevronDown, Loader2, Printer, Wallet, X,
} from 'lucide-react';
import { PRINT_DOCS, STAGES } from './orderConstants';

/* ============================================================================
 * Bulk action bar — appears only when rows are selected.
 * Destructive actions route through a confirmation modal.
 * ========================================================================== */

export default function BulkBar({ selected, total, onClear, onSelectAll, onBulk, onExport }) {
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);   // { action, title, body, danger, payload }
  const [stageOpen, setStageOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [reason, setReason] = useState('');

  const count = selected.length;
  if (!count) return null;

  const run = async (action, payload = {}) => {
    setBusy(action);
    try { await onBulk(action, selected, payload); onClear(); }
    finally { setBusy(''); setConfirm(null); setStageOpen(false); setPrintOpen(false); setReason(''); }
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-50';

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions"
        className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-white shadow-lg"
      >
        <span className="mr-1 text-[13px] font-semibold">
          {count} selected
        </span>
        <button onClick={onSelectAll} className="text-[12px] text-white/70 underline underline-offset-2 hover:text-white">
          Select all {total}
        </button>
        <span className="mx-1 h-5 w-px bg-white/20" />

        <button disabled={!!busy} onClick={() => run('approve')} className={`${btn} bg-white text-neutral-900 hover:bg-neutral-100`}>
          {busy === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />} Advance stage
        </button>

        {/* Change stage */}
        <div className="relative">
          <button disabled={!!busy} onClick={() => { setStageOpen((o) => !o); setPrintOpen(false); }}
            className={`${btn} bg-white/10 hover:bg-white/20`}>
            Set stage <ChevronDown size={12} />
          </button>
          {stageOpen && (
            <div className="absolute left-0 top-9 z-40 max-h-72 w-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 text-neutral-800 shadow-xl">
              {STAGES.map((s) => (
                <button key={s.key}
                  onClick={() => setConfirm({
                    action: 'stage', payload: { stage: s.key },
                    title: `Move ${count} order${count === 1 ? '' : 's'} to “${s.label}”?`,
                    body: 'Orders that cannot legally make this jump will be skipped and reported.',
                  })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                  <s.icon size={13} className="text-neutral-500" /> {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button disabled={!!busy}
          onClick={() => setConfirm({
            action: 'mark-paid',
            title: `Mark ${count} order${count === 1 ? '' : 's'} as paid?`,
            body: 'Payment will be recorded as Confirmed and new orders will advance to To Pack.',
          })}
          className={`${btn} bg-white/10 hover:bg-white/20`}>
          <Wallet size={13} /> Mark paid
        </button>

        {/* Print */}
        <div className="relative">
          <button disabled={!!busy} onClick={() => { setPrintOpen((o) => !o); setStageOpen(false); }}
            className={`${btn} bg-white/10 hover:bg-white/20`}>
            {busy === 'print' ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Print <ChevronDown size={12} />
          </button>
          {printOpen && (
            <div className="absolute left-0 top-9 z-40 w-52 rounded-lg border border-neutral-200 bg-white py-1 text-neutral-800 shadow-xl">
              {PRINT_DOCS.map((d) => (
                <button key={d.key} onClick={() => run('print', { docType: d.key })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                  <d.icon size={13} className="text-neutral-500" /> {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button disabled={!!busy} onClick={onExport} className={`${btn} bg-white/10 hover:bg-white/20`}>
          Export CSV
        </button>

        <button disabled={!!busy}
          onClick={() => setConfirm({
            action: 'reject', danger: true, needsReason: true,
            title: `Cancel ${count} order${count === 1 ? '' : 's'}?`,
            body: 'This moves them to Cancelled. Stock is not automatically returned.',
          })}
          className={`${btn} bg-red-500/90 hover:bg-red-500`}>
          <Ban size={13} /> Cancel
        </button>

        <button onClick={onClear} aria-label="Clear selection"
          className="ml-auto grid h-7 w-7 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white">
          <X size={15} />
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <p className="text-[15px] font-semibold text-neutral-900">{confirm.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{confirm.body}</p>

            {confirm.needsReason && (
              <textarea
                autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (recorded on every order)"
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setConfirm(null); setReason(''); }}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50">
                Cancel
              </button>
              <button
                disabled={!!busy || (confirm.needsReason && !reason.trim())}
                onClick={() => run(confirm.action, { ...(confirm.payload || {}), reason: reason.trim() })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50 ${
                  confirm.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-black'
                }`}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : null} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
