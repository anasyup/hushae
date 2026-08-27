import { useState } from 'react';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { api } from '../../api/client';
import { PRINT_DOCS, SET_STAGE_CHOICES } from './orderConstants';
import s from './adesk.module.css';

/* ===========================================================================
 * Bulk action bar — ATELIER. Shows only when rows are selected, and sits at
 * the head of the orders card (sticky bars cannot work inside an overflow
 * context, so it is deliberately in-flow). Every action is the desk's own.
 * ========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

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
    try { await onBulk(action, selected, payload); onClear(); } finally {
      setBusy(''); setConfirm(null); setStageOpen(false); setPrintOpen(false); setReason(''); setNoteText('');
    }
  };

  const menuCls = (on) => cx(s.menu, on && s.show);

  return (
    <>
      <div role="region" aria-label="Bulk actions" style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
        border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px',
        background: '#fbfbfa', marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,.03)',
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '-.1px' }}>{count} selected</span>
        <button type="button" className={s.btnSm} onClick={onSelectAll}>Select all {total}</button>

        <button type="button" className={s.btnBlack} style={{ height: 30, fontSize: 11.5, padding: '0 12px' }}
          disabled={!!busy || !canAdvance} onClick={() => run('approve')}
          title={canAdvance ? 'Move every selected order one stage forward' : 'Nothing in this selection can move forward'}>
          {busy === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Advance
        </button>

        <div style={{ position: 'relative' }}>
          <button type="button" className={cx(s.pill, stageOpen && s.pillOn)} style={{ height: 30, fontSize: 11.5 }}
            disabled={!!busy} onClick={() => { setStageOpen((o) => !o); setPrintOpen(false); setMoreOpen(false); }}>
            Set stage <ChevronDown size={11} />
          </button>
          <div className={menuCls(stageOpen)} style={{ zIndex: 200 }}>
            {SET_STAGE_CHOICES.map((st) => (
              <button key={st.key} type="button" className={s.menuItem}
                onClick={() => setConfirm({
                  action: 'stage', payload: { stage: st.key },
                  title: `Move ${count} order${count === 1 ? '' : 's'} to “${st.label}”?`,
                  body: `${st.hint}. Orders that cannot legally make this jump are skipped and reported back.`,
                })}>
                <span>
                  <span style={{ display: 'block' }}>{st.label}</span>
                  <i>{st.hint}</i>
                </span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={s.pill} style={{ height: 30, fontSize: 11.5 }} disabled={!!busy}
          onClick={() => setConfirm({
            action: 'mark-paid',
            title: `Mark ${count} order${count === 1 ? '' : 's'} as paid?`,
            body: 'Payment will be recorded as Confirmed and new orders will advance to To Pack.',
          })}>
          Mark paid
        </button>

        <div style={{ position: 'relative' }}>
          <button type="button" className={cx(s.pill, printOpen && s.pillOn)} style={{ height: 30, fontSize: 11.5 }}
            disabled={!!busy} onClick={() => { setPrintOpen((o) => !o); setStageOpen(false); setMoreOpen(false); }}>
            {busy === 'print' ? <Loader2 size={11} className="animate-spin" /> : null} Print <ChevronDown size={11} />
          </button>
          <div className={menuCls(printOpen)} style={{ zIndex: 200 }}>
            {PRINT_DOCS.map((d) => (
              <button key={d.key} type="button" className={s.menuItem} onClick={() => { setPrintOpen(false); onPrint(d.key); }}>
                <span>
                  <span style={{ display: 'block' }}>{d.label}</span>
                  <i>{d.hint}</i>
                </span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={s.pill} style={{ height: 30, fontSize: 11.5 }} disabled={!!busy} onClick={onExport}>Export</button>

        <div style={{ position: 'relative' }}>
          <button type="button" className={cx(s.pill, moreOpen && s.pillOn)} style={{ height: 30, fontSize: 11.5 }}
            disabled={!!busy} onClick={() => { setMoreOpen((o) => !o); setStageOpen(false); setPrintOpen(false); }}>
            More <ChevronDown size={11} />
          </button>
          <div className={menuCls(moreOpen)} style={{ zIndex: 200 }}>
            <button type="button" className={s.menuItem}
              onClick={() => { setMoreOpen(false); setConfirm({ action: 'note', needsNote: true, title: `Add a note to ${count} order${count === 1 ? '' : 's'}`, body: 'The same note is written to every selected order.' }); }}>
              Add internal note
            </button>
            <button type="button" className={s.menuItem} onClick={() => { setMoreOpen(false); run('qc', { result: 'pass' }); }}>Mark QC passed</button>
            <button type="button" className={s.menuItem} onClick={() => { setMoreOpen(false); run('qc', { result: 'fail' }); }}>Flag for review</button>
            <div className={s.menuDiv} />
            <button type="button" className={s.menuItem} onClick={() => { setMoreOpen(false); run('priority', { flag: 'rush' }); }}>Flag as rush</button>
            <button type="button" className={s.menuItem} onClick={() => { setMoreOpen(false); run('priority', { flag: 'clear' }); }}>Clear priority</button>
            <div className={s.menuDiv} />
            <button type="button" className={s.menuItem} onClick={async () => {
              setMoreOpen(false);
              try {
                const d = await api('/orders/manage/bulk/whatsapp', {
                  method: 'POST', token,
                  body: { ids: selected, template: 'Hi {name}, your order {id} is {status}. Track it here: {link}' },
                });
                setWaLinks(d.links);
              } catch (e) { toast?.(e.message || 'Could not build messages'); }
            }}>
              WhatsApp customers
            </button>
          </div>
        </div>

        <button type="button" className={s.pill} style={{ height: 30, fontSize: 11.5, color: 'var(--red-text)', borderColor: '#fecaca' }}
          disabled={!!busy}
          onClick={() => setConfirm({
            action: 'reject', danger: true, needsReason: true,
            title: `Cancel ${count} order${count === 1 ? '' : 's'}?`,
            body: 'This moves them to Cancelled. Stock is not automatically returned.',
          })}>
          Cancel
        </button>

        <button type="button" onClick={onClear} aria-label="Clear selection"
          className={s.iconBtn} style={{ width: 30, height: 30, marginLeft: 'auto' }}>
          <X size={14} />
        </button>
      </div>

      {(stageOpen || printOpen || moreOpen) && (
        <div className={s.menuScrim} onClick={() => { setStageOpen(false); setPrintOpen(false); setMoreOpen(false); }} />
      )}

      {waLinks && (
        <div className={s.overlay} role="dialog" aria-modal="true" onClick={() => setWaLinks(null)}>
          <div className={s.modalBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p className={s.modalTitle}>WhatsApp {waLinks.length} customer{waLinks.length === 1 ? '' : 's'}</p>
                <p className={s.modalText}>Each opens in WhatsApp with the message ready — you press send.</p>
              </div>
              <button type="button" className={s.searchBtn} aria-label="Close" onClick={() => setWaLinks(null)}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginTop: 6 }}>
              {waLinks.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className={s.menuItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--muted2)' }}>{l.orderNumber}</span>
                  </span>
                  <i style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.preview}</i>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className={s.overlay} role="dialog" aria-modal="true" onClick={() => { setConfirm(null); setReason(''); }}>
          <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <p className={s.modalTitle}>{confirm.title}</p>
            <p className={s.modalText}>{confirm.body}</p>

            {confirm.needsReason && (
              <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (recorded on every order)" className={s.ctlArea} style={{ marginTop: 12 }} />
            )}
            {confirm.needsNote && (
              <textarea autoFocus rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Quality checked by Ahmed" className={s.ctlArea} style={{ marginTop: 12 }} />
            )}

            <div className={s.modalActions}>
              <button type="button" className={s.btnSm} onClick={() => { setConfirm(null); setReason(''); }}>Cancel</button>
              <button type="button" className={s.btnBlack}
                disabled={!!busy || (confirm.needsReason && !reason.trim()) || (confirm.needsNote && !noteText.trim())}
                onClick={() => run(confirm.action, { ...(confirm.payload || {}), reason: reason.trim(), note: noteText.trim() })}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : null} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
