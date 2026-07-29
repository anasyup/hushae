import { useState } from 'react';
import {
  Ban, BadgeCheck, CheckCheck, ChevronDown, Loader2, MessageCircle, NotebookPen,
  Printer, Wallet, X, Zap,
} from 'lucide-react';
import { api } from '../../api/client';
import { PRINT_DOCS, STAGES } from './orderConstants';

/* ============================================================================
 * Bulk action bar — appears only when rows are selected.
 * Destructive actions route through a confirmation modal.
 * ========================================================================== */

export default function BulkBar({ selected, total, onClear, onSelectAll, onBulk, onExport, onPrint, canAdvance = true, token, toast }) {
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);   // { action, title, body, danger, payload }
  const [stageOpen, setStageOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [waLinks, setWaLinks] = useState(null);

  const count = selected.length;
  if (!count) return null;

  const run = async (action, payload = {}) => {
    setBusy(action);
    try { await onBulk(action, selected, payload); onClear(); }
    finally { setBusy(''); setConfirm(null); setStageOpen(false); setPrintOpen(false); setReason(''); setNoteText(''); }
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

        <button disabled={!!busy || !canAdvance} onClick={() => run('approve')}
          title={canAdvance ? 'Move every selected order one stage forward' : 'Nothing in this selection can move forward'}
          className={`${btn} bg-white text-neutral-900 hover:bg-neutral-100`}>
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
                <button key={d.key} onClick={() => { setPrintOpen(false); onPrint(d.key); }}
                  className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-neutral-100">
                  <d.icon size={13} className="mt-0.5 shrink-0 text-neutral-500" />
                  <span>
                    <span className="block text-[13px]">{d.label}</span>
                    <span className="block text-[10.5px] text-neutral-400">{d.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button disabled={!!busy} onClick={onExport} className={`${btn} bg-white/10 hover:bg-white/20`}>
          Export CSV
        </button>

        {/* Everything the warehouse needs, tucked behind one menu so the bar
            stays readable on a laptop. */}
        <div className="relative">
          <button disabled={!!busy} onClick={() => { setMoreOpen((o) => !o); setStageOpen(false); setPrintOpen(false); }}
            className={`${btn} bg-white/10 hover:bg-white/20`}>
            More <ChevronDown size={12} />
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-9 z-40 w-56 rounded-lg border border-neutral-200 bg-white py-1 text-neutral-800 shadow-xl">
              <button onClick={() => { setMoreOpen(false); setConfirm({ action: 'note', needsNote: true, title: `Add a note to ${count} order${count === 1 ? '' : 's'}`, body: 'The same note is written to every selected order.' }); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                <NotebookPen size={13} className="text-neutral-500" /> Add internal note
              </button>
              <button onClick={() => { setMoreOpen(false); run('qc', { result: 'pass' }); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                <BadgeCheck size={13} className="text-emerald-600" /> Mark QC passed
              </button>
              <button onClick={() => { setMoreOpen(false); run('qc', { result: 'fail' }); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                <BadgeCheck size={13} className="text-amber-600" /> Flag for review
              </button>
              <div className="my-1 border-t border-neutral-100" />
              <button onClick={() => { setMoreOpen(false); run('priority', { flag: 'rush' }); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                <Zap size={13} className="text-neutral-900" /> Flag as rush
              </button>
              <button onClick={() => { setMoreOpen(false); run('priority', { flag: 'clear' }); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                <Zap size={13} className="text-neutral-300" /> Clear priority
              </button>
              <div className="my-1 border-t border-neutral-100" />
              <button onClick={async () => {
                setMoreOpen(false);
                try {
                  const d = await api('/orders/manage/bulk/whatsapp', {
                    method: 'POST', token,
                    body: { ids: selected, template: 'Hi {name}, your order {id} is {status}. Track it here: {link}' },
                  });
                  setWaLinks(d.links);
                } catch (e) { toast?.(e.message || 'Could not build messages'); }
              }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100">
                <MessageCircle size={13} className="text-emerald-600" /> WhatsApp customers
              </button>
            </div>
          )}
        </div>

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

      {waLinks && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-100 p-4">
              <div>
                <p className="text-[15px] font-semibold text-neutral-900">WhatsApp {waLinks.length} customer{waLinks.length === 1 ? '' : 's'}</p>
                <p className="mt-0.5 text-[12.5px] text-neutral-500">
                  Each opens in WhatsApp with the message ready — you press send.
                </p>
              </div>
              <button onClick={() => setWaLinks(null)} className="text-neutral-400 hover:text-neutral-900"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {waLinks.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
                  className="block rounded-lg p-2.5 hover:bg-neutral-50">
                  <span className="flex items-center gap-2">
                    <MessageCircle size={13} className="shrink-0 text-emerald-600" />
                    <span className="text-[13px] font-medium text-neutral-900">{l.name}</span>
                    <span className="ml-auto font-mono text-[11px] text-neutral-400">{l.orderNumber}</span>
                  </span>
                  <span className="mt-0.5 block truncate pl-5 text-[11.5px] text-neutral-500">{l.preview}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

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

            {confirm.needsNote && (
              <textarea
                autoFocus rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Quality checked by Ahmed"
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setConfirm(null); setReason(''); }}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50">
                Cancel
              </button>
              <button
                disabled={!!busy || (confirm.needsReason && !reason.trim()) || (confirm.needsNote && !noteText.trim())}
                onClick={() => run(confirm.action, { ...(confirm.payload || {}), reason: reason.trim(), note: noteText.trim() })}
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
