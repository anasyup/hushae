import { forwardRef, useId } from 'react';

/* ============================================================================
 * Admin UI — Input / Textarea / Select / Field (Phase 03-R)
 * Sharp 4px, hairline border, flat black surface, white focus border.
 * ========================================================================== */

const baseField =
  'w-full rounded-[4px] border border-[#EAEAEA] bg-black px-3 text-[13px] text-black ' +
  'placeholder:text-[#AAAAAA] outline-none transition-colors duration-150 ' +
  'focus:border-white ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const sizes = {
  md: 'h-9',
  sm: 'h-8 px-2.5 text-[12px]',
};

export const Input = forwardRef(function Input(
  { size = 'md', invalid = false, className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${baseField} ${sizes[size]} ${invalid ? 'border-white/60' : ''} ${className}`}
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
      className={`${baseField} ${invalid ? 'border-white/60' : ''} ${className} min-h-[84px] py-2`}
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
      className={`${baseField} ${sizes[size]} appearance-none pr-8 ${invalid ? 'border-white/60' : ''} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Field({ label, hint, error, htmlFor, children, className = '' }) {
  const auto = useId();
  const id = htmlFor || auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#777777]">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-[#AAAAAA]">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-[#333333]">
          {error}
        </p>
      )}
    </div>
  );
}
