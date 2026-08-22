import { Section, Toggle, Text, Num, Select, Accordion } from '../ui/Controls';
import PageHeader from '../components/PageHeader';
import {
  btnGhost, btnSolid, btnIcon, ctl, ctlInline,
  EditorialEmpty, EditorialError, TableSkeleton, MonoStatus, EditorialPagination,
} from '../orders/orderUi';

/* Shared editorial chrome for Settings / Security. Presentation only. */

export {
  PageHeader, Section, Toggle, Text, Num, Select, Accordion,
  btnGhost, btnSolid, btnIcon, ctl, ctlInline,
  EditorialEmpty, EditorialError, TableSkeleton, MonoStatus, EditorialPagination,
};

export const ta =
  'min-h-[88px] w-full rounded-[4px] border border-[#DCDCDC] bg-white px-3 py-2 text-[12px] leading-relaxed text-black outline-none placeholder:text-[#777777] hover:border-[#999999] focus:border-black disabled:opacity-40';

export function EdSection({ index, title, description, action, children }) {
  const label = index ? `${String(index).padStart(2, '0')} — ${title}` : title;
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="adm-index mb-0">{label}</p>
          {description && <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#777777]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="border-y border-[#EAEAEA] py-6">{children}</div>
    </section>
  );
}

export function EdSaveBar({ dirty, busy, onSave, onDiscard, disabled, label }) {
  if (!dirty) return null;
  return (
    <div className="sticky bottom-4 z-30 mt-8 flex flex-wrap items-center justify-between gap-3 border border-[#EAEAEA] bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#777777]">Unsaved changes</p>
      <div className="flex items-center gap-2">
        {onDiscard && <button type="button" onClick={onDiscard} className={btnGhost}>Discard</button>}
        <button type="button" onClick={onSave} disabled={busy || disabled} className={btnSolid}>
          {busy ? 'Saving…' : (label || 'Save')}
        </button>
      </div>
    </div>
  );
}

export function EdNotice({ children }) {
  return (
    <div role="alert" className="mb-6 border border-[#EAEAEA] px-4 py-3 text-[12px] leading-relaxed text-[#555555]">
      {children}
    </div>
  );
}

export function EdConfirm({ open, title, body, confirmLabel, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="ed-confirm-title">
      <div className="w-full max-w-md border border-[#EAEAEA] bg-white p-6">
        <p id="ed-confirm-title" className="text-[11px] font-medium uppercase tracking-[0.22em] text-black">{title}</p>
        {body && <p className="mt-3 text-[13px] leading-relaxed text-[#555555]">{body}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={btnSolid}>
            {busy ? 'Working…' : (confirmLabel || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EdToggle(props) { return <Toggle variant="editorial" {...props} />; }
export function EdText(props) { return <Text variant="editorial" {...props} />; }
export function EdNum(props) { return <Num variant="editorial" {...props} />; }
export function EdSelect(props) { return <Select variant="editorial" {...props} />; }

export function FieldLabel({ htmlFor, children }) {
  return <label htmlFor={htmlFor} className="adm-label mb-1.5 block">{children}</label>;
}

export function StrengthBar({ pct, label }) {
  if (!label) return null;
  return (
    <div className="mt-2">
      <div className="h-px w-full bg-[#EAEAEA]">
        <div className="h-px bg-black transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-[#777777]">{label}</p>
    </div>
  );
}

export function passwordStrength(next) {
  if (!next) return { label: '', pct: 0 };
  let score = 0;
  if (next.length >= 8) score++;
  if (next.length >= 12) score++;
  if (/[A-Z]/.test(next) && /[a-z]/.test(next)) score++;
  if (/[0-9]/.test(next)) score++;
  if (/[^A-Za-z0-9]/.test(next)) score++;
  const map = [
    { label: 'Very weak', pct: 20 },
    { label: 'Weak', pct: 40 },
    { label: 'Fair', pct: 60 },
    { label: 'Good', pct: 80 },
    { label: 'Strong', pct: 100 },
  ];
  return map[Math.min(score, 4)] || map[0];
}
