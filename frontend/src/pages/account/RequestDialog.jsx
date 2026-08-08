import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import FloatField, { FloatSelect } from '../checkout/FloatField';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Cancellation / return request dialog.
 *
 * A real dialog, matching the pattern proven in Sprint 2E: role="dialog",
 * aria-modal, labelled, focus moved in on open, trapped while open, Escape
 * closes, and focus returned to whatever opened it.
 *
 * The server re-checks every rule this form assumes (order state, duplicate
 * requests), so a stale page cannot submit something invalid.
 * ========================================================================== */

const RETURN_REASONS = ['Wrong Item', 'Damaged', 'Missing', 'Quality Issue', 'Other'];

export default function RequestDialog({ kind, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [issueType, setIssueType] = useState('Quality Issue');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const panelRef = useRef(null);
  const opener = useRef(null);
  const titleId = useId();

  const isReturn = kind === 'return';

  useEffect(() => {
    if (!kind) return undefined;
    setReason(''); setErr(''); setIssueType('Quality Issue');
    opener.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll('button:not([disabled]),input,select,textarea,a[href]');
      if (!f?.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('input,select,textarea')?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [kind, busy, onClose]);

  if (!kind) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (isReturn && reason.trim().length < 5) {
      setErr('Please tell us briefly what went wrong');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(kind, isReturn ? { issueType, reason: reason.trim() } : { reason: reason.trim() });
    } catch (ex) {
      setErr(ex.message || 'Could not send your request');
    }
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-obsidian/60 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={() => !busy && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="w-full max-w-lg overflow-hidden rounded-t-panel bg-alabaster shadow-e-4 sm:rounded-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-display text-h5">
            {isReturn ? 'Request a return' : 'Request cancellation'}
          </h2>
          <button
            type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian disabled:opacity-40"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-5" noValidate>
          <p className="text-body-sm leading-relaxed text-ash">
            {isReturn
              ? 'Tell us what went wrong and our team will arrange collection. Hygiene items cannot be returned once opened.'
              : 'We will try to stop this order before it is dispatched. If it has already left, we will help you return it instead.'}
          </p>

          {err && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-3.5 py-2.5 text-caption text-red-800">
              <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{err}
            </p>
          )}

          <div className="mt-4 space-y-4">
            {isReturn && (
              <FloatSelect label="What is the problem?" required value={issueType} onChange={setIssueType}>
                {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </FloatSelect>
            )}
            <FloatField
              as="textarea"
              label={isReturn ? 'Tell us more' : 'Reason (optional)'}
              required={isReturn}
              value={reason}
              onChange={(v) => { setReason(v); setErr(''); }}
              error={err && isReturn ? ' ' : ''}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary gap-2 disabled:opacity-50">
              {busy ? <><Spinner label="Sending" /> Sending…</> : 'Send request'}
            </button>
            <button type="button" onClick={onClose} disabled={busy} className="btn border border-bronze bg-white text-graphite hover:bg-satin/60">
              Never mind
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
