import { useId } from 'react';
import { AlertCircle, Check } from 'lucide-react';

/* ============================================================================
 * The checkout field.
 *
 * Everything the old checkout was missing is structural here, not optional:
 *   · a real <label htmlFor> bound to an id — the old form had 0 associated
 *     labels, so a screen reader announced every box as "edit text, blank"
 *   · autocomplete — the old form had 0, so no browser could autofill an
 *     address the customer has already typed a hundred times
 *   · aria-invalid + aria-describedby pointing at the message, so the error is
 *     read out when focus lands, not just painted red
 *   · role="alert" on the message itself
 *
 * The label floats using :placeholder-shown rather than JS state. A real
 * placeholder (" ") must stay on the input for the selector to work — it is a
 * single space, so nothing is visible behind the resting label.
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

  const base = `peer w-full rounded-control border bg-white px-3.5 text-body text-ink
    transition-colors duration-fast placeholder-shown:text-transparent
    focus:outline-none disabled:opacity-60
    ${error ? 'border-red-400 focus:border-red-500' : 'border-line focus:border-obsidian'}`;

  return (
    <div className="relative">
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
        className={`${base} ${as === 'textarea' ? 'min-h-[88px] resize-none pb-2.5 pt-6' : 'h-14 pt-5'}`}
      >
        {children}
      </Tag>

      {/* Floating label. pointer-events-none so it never blocks the field. */}
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3.5 top-1.5 origin-left text-caption
          transition-all duration-fast motion-reduce:transition-none
          peer-placeholder-shown:top-4 peer-placeholder-shown:text-body
          peer-focus:top-1.5 peer-focus:text-caption
          ${error ? 'text-red-600' : 'text-ash peer-focus:text-graphite'}`}
      >
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>

      {/* One message slot: error wins, then success, then hint. */}
      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-caption text-red-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : valid ? (
        <p id={msgId} className="mt-1.5 flex items-center gap-1.5 text-caption font-medium text-sagedark">
          <Check size={12} className="shrink-0" aria-hidden="true" />
          {valid}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 text-caption text-ash">{hint}</p>
      ) : null}
    </div>
  );
}

/** Select variant — same label/ARIA contract, native control. */
export function FloatSelect({ label, value, onChange, error, hint, required, disabled, children }) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        aria-required={required || undefined}
        className={`h-14 w-full appearance-none rounded-control border bg-white px-3.5 pt-5 text-body text-ink
          transition-colors duration-fast focus:outline-none disabled:opacity-60
          ${error ? 'border-red-400 focus:border-red-500' : 'border-line focus:border-obsidian'}`}
      >
        {children}
      </select>
      <label htmlFor={id} className={`pointer-events-none absolute left-3.5 top-1.5 text-caption ${error ? 'text-red-600' : 'text-ash'}`}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ash" aria-hidden="true">▾</span>
      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-caption text-red-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 text-caption text-ash">{hint}</p>
      ) : null}
    </div>
  );
}
