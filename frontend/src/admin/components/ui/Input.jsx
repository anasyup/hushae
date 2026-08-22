import { forwardRef, useId } from 'react';

/* ============================================================================
 * Admin UI — Input / Textarea / Field
 * Height 38–40px, surface #111113, 1px subtle border, 8px radius.
 * Focus: jet white border + soft white glow (never neon).
 * ========================================================================== */

const baseField =
  'w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-[13px] text-admin-text ' +
  'placeholder:text-admin-text-muted outline-none transition ' +
  'focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--admin-accent-soft)] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const sizes = {
  md: 'min-h-[38px]',
  sm: 'min-h-[34px] px-2.5 text-[12px]',
};

export const Input = forwardRef(function Input(
  { size = 'md', invalid = false, className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${baseField} ${sizes[size]} ${invalid ? 'border-admin-danger focus:border-admin-danger' : ''} ${className}`}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { size = 'md', invalid = false, className = '', ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${baseField} ${invalid ? 'border-admin-danger focus:border-admin-danger' : ''} ${className} min-h-[84px] py-2`}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select(
  { size = 'md', invalid = false, className = '', children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${baseField} ${sizes[size]} appearance-none pr-8 ${invalid ? 'border-admin-danger' : ''} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

/* Field wrapper — label + hint + error. Labels are always visible (no
 * placeholder-only labelling) so the admin stays accessible. */
export function Field({ label, hint, error, htmlFor, children, className = '' }) {
  const auto = useId();
  const id = htmlFor || auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-admin-text-2">
          {label}
        </label>
      )}
      <div className={error ? 'relative' : ''}>{children}</div>
      {hint && !error && <p className="mt-1 text-[11px] text-admin-text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-admin-danger">
          {error}
        </p>
      )}
    </div>
  );
}
