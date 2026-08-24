import { useState } from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { api } from '../../api/client';
import { PRINT_DOCS, SET_STAGE_CHOICES } from './orderConstants';
import { btnGhost, btnSolid, ctl } from './orderUi';

/* ===========================================================================
 * Bulk action bar — compact editorial. Appears only when rows are selected.
 * ========================================================================== */

export default function BulkBar({ selected, total, onClear, onSelectAll, onBulk, onExport, onPrint, canAdvance = true, token, toast }) {
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);
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

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions"
        className="sticky top-14 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#EAEAEA] bg-[#050505] py-2.5"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-black">
          {count} selected
        </span>
        <button onClick={onSelectAll} className="text-[11px] text-[#999999] underline underline-offset-2 hover:text-black">
          Select all {total}
        </button>

        <button disabled={!!busy || !canAdvance} onClick={() => run('approve')}
          title={canAdvance ? 'Move every selected order one stage forward' : 'Nothing in this selection can move forward'}
          className={btnSolid}>
          {busy === 'approve' ? <Loader2 size={12} className="animate-spin" /> : null} Advance
        </button>

        <div className="relative">
          <button disabled={!!busy} onClick={() => { setStageOpen((o) => !o); setPrintOpen(false); setMoreOpen(false); }}
            className={btnGhost}>
            Set stage <ChevronDown size={11} />
          </button>
          {stageOpen && (
            <div className="absolute left-0 top-9 z-40 max-h-80 w-60 overflow-y-auto border border-[#EAEAEA] bg-[#0D0D0D] py-1">
              {SET_STAGE_CHOICES.map((s) => (
                <button key={s.key}
                  onClick={() => setConfirm({
                    action: 'stage', payload: { stage: s.key },
                    title: `Move ${count} order${count === 1 ? '' : 's'} to “${s.label}”?`,
                    body: `${s.hint}. Orders that cannot legally make this jump are skipped and reported back.`,
                  })}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#FAFAFA]">
                  <span className="min-w-0">
                    <span className="block text-[12px] text-black">{s.label}</span>
                    <span className="block text-[11px] text-[#AAAAAA]">{s.hint}</span>
                  </span>
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
          className={btnGhost}>
          Mark paid
        </button>

        <div className="relative">
          <button disabled={!!busy} onClick={() => { setPrintOpen((o) => !o); setStageOpen(false); setMoreOpen(false); }}
            className={btnGhost}>
            {busy === 'print' ? <Loader2 size={12} className="animate-spin" /> : null} Print <ChevronDown size={11} />
          </button>
          {printOpen && (
            <div className="absolute left-0 top-9 z-40 w-52 border border-[#EAEAEA] bg-[#0D0D0D] py-1">
              {PRINT_DOCS.map((d) => (
                <button key={d.key} onClick={() => { setPrintOpen(false); onPrint(d.key); }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#FAFAFA]">
                  <span>
                    <span className="block text-[12px] text-black">{d.label}</span>
                    <span className="block text-[11px] text-[#AAAAAA]">{d.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button disabled={!!busy} onClick={onExport} className={btnGhost}>Export</button>

        <div className="relative">
          <button disabled={!!busy} onClick={() => { setMoreOpen((o) => !o); setStageOpen(false); setPrintOpen(false); }}
            className={btnGhost}>
            More <ChevronDown size={11} />
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-9 z-40 w-56 border border-[#EAEAEA] bg-[#0D0D0D] py-1">
              <button onClick={() => { setMoreOpen(false); setConfirm({ action: 'note', needsNote: true, title: `Add a note to ${count} order${count === 1 ? '' : 's'}`, body: 'The same note is written to every selected order.' }); }}
                className="flex w-full px-3 py-2 text-left text-[12px] text-[#333333] hover:bg-[#FAFAFA]">
                Add internal note
              </button>
              <button onClick={() => { setMoreOpen(false); run('qc', { result: 'pass' }); }}
                className="flex w-full px-3 py-2 text-left text-[12px] text-[#333333] hover:bg-[#FAFAFA]">
                Mark QC passed
              </button>
              <button onClick={() => { setMoreOpen(false); run('qc', { result: 'fail' }); }}
                className="flex w-full px-3 py-2 text-left text-[12px] text-[#333333] hover:bg-[#FAFAFA]">
                Flag for review
              </button>
              <div className="my-1 border-t border-[#EAEAEA]" />
              <button onClick={() => { setMoreOpen(false); run('priority', { flag: 'rush' }); }}
                className="flex w-full px-3 py-2 text-left text-[12px] text-[#333333] hover:bg-[#FAFAFA]">
                Flag as rush
              </button>
              <button onClick={() => { setMoreOpen(false); run('priority', { flag: 'clear' }); }}
                className="flex w-full px-3 py-2 text-left text-[12px] text-[#333333] hover:bg-[#FAFAFA]">
                Clear priority
              </button>
              <div className="my-1 border-t border-[#EAEAEA]" />
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
                className="flex w-full px-3 py-2 text-left text-[12px] text-[#333333] hover:bg-[#FAFAFA]">
                WhatsApp customers
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
          className={btnGhost}>
          Cancel
        </button>

        <button onClick={onClear} aria-label="Clear selection"
          className="ml-auto grid h-7 w-7 place-items-center text-[#999999] hover:text-black">
          <X size={15} />
        </button>
      </div>

      {waLinks && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col border border-[#EAEAEA] bg-[#0D0D0D]">
            <div className="flex items-start justify-between border-b border-[#EAEAEA] p-5">
              <div>
                <p className="text-[13px] font-medium text-black">WhatsApp {waLinks.length} customer{waLinks.length === 1 ? '' : 's'}</p>
                <p className="mt-1 text-[12px] text-[#999999]">Each opens in WhatsApp with the message ready — you press send.</p>
              </div>
              <button onClick={() => setWaLinks(null)} className="text-[#999999] hover:text-black"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {waLinks.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
                  className="block px-3 py-2.5 hover:bg-[#FAFAFA]">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-black">{l.name}</span>
                    <span className="ml-auto font-mono text-[11px] text-[#AAAAAA]">{l.orderNumber}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-[#999999]">{l.preview}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md border border-[#EAEAEA] bg-[#0D0D0D] p-6">
            <p className="text-[14px] font-medium text-black">{confirm.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#999999]">{confirm.body}</p>

            {confirm.needsReason && (
              <textarea
                autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (recorded on every order)"
                className={`${ctl} mt-4 py-2`}
              />
            )}

            {confirm.needsNote && (
              <textarea
                autoFocus rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Quality checked by Ahmed"
                className={`${ctl} mt-4 py-2`}
              />
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirm(null); setReason(''); }} className={btnGhost}>
                Cancel
              </button>
              <button
                disabled={!!busy || (confirm.needsReason && !reason.trim()) || (confirm.needsNote && !noteText.trim())}
                onClick={() => run(confirm.action, { ...(confirm.payload || {}), reason: reason.trim(), note: noteText.trim() })}
                className={btnSolid}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : null} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
