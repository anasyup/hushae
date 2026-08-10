import { useId } from 'react';
import { AlertCircle, Check } from 'lucide-react';

/* ============================================================================
 * The checkout field — QA "Quiet Architecture".
 *
 * Borderless bottom-line input (1px clay), static label above (10px smoke),
 * 16px Inter 400 with 14px vertical padding. Keeps the full ARIA contract:
 *   · a real <label htmlFor> bound to an id
 *   · autocomplete
 *   · aria-invalid + aria-describedby pointing at the message
 *   · role="alert" on the message
 * ========================================================================== */
export default function FloatField({
  label, value, onChange, error, valid, hint,
  type = 'text', autoComplete, inputMode, maxLength, required,
  as = 'input', rows = 3, children, disabled,
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  const describedBy = error || hint || valid ? msgId : undefined;
  const Tag = as;

  return (
    <div>
      <label htmlFor={id} className={`label-qa mb-0.5 block ${error ? 'text-red-700' : ''}`}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <Tag
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        type={as === 'input' ? type : undefined}
        rows={as === 'textarea' ? rows : undefined}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={`input-line ${as === 'textarea' ? 'min-h-[88px] resize-none' : ''} ${error ? '!border-red-500' : ''}`}
      >
        {children}
      </Tag>

      {error ? (
        <p id={msgId} role="alert" className="mt-1 flex items-start gap-1.5 text-[11px] text-red-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : valid ? (
        <p id={msgId} className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-charcoal">
          <Check size={12} className="shrink-0" aria-hidden="true" />
          {valid}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1 text-[11px] text-smoke">{hint}</p>
      ) : null}
    </div>
  );
}

/** Select variant — same label/ARIA contract, native control, bottom line. */
export function FloatSelect({ label, value, onChange, error, hint, required, disabled, children }) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="relative">
      <label htmlFor={id} className={`label-qa mb-0.5 block ${error ? 'text-red-700' : ''}`}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        aria-required={required || undefined}
        className={`input-line appearance-none pr-8 focus:outline-none focus:ring-0 focus-visible:ring-0 ${error ? '!border-red-500' : ''} ${disabled ? 'opacity-60' : ''}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute bottom-4 right-1 text-smoke" aria-hidden="true">▾</span>
      {error ? (
        <p id={msgId} role="alert" className="mt-1 flex items-start gap-1.5 text-[11px] text-red-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1 text-[11px] text-smoke">{hint}</p>
      ) : null}
    </div>
  );
}
