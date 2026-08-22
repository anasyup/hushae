import { forwardRef } from 'react';

/* ============================================================================
 * Admin UI — Button (Phase 03-R editorial language)
 * Primary: jet white bg + jet black text. Secondary: black + white border.
 * Ghost: transparent. Sharp 4px radius. Uppercase micro-label type.
 * No pills, no gradients, no colors.
 * ========================================================================== */

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-[4px] font-medium uppercase tracking-[0.08em] ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' +
  'disabled:pointer-events-none disabled:opacity-40';

const variants = {
  primary: 'bg-white text-black hover:bg-white/85',
  secondary: 'border border-white/20 bg-transparent text-white hover:border-white/45 hover:bg-white/5',
  ghost: 'bg-transparent text-white/60 hover:text-white hover:bg-white/5',
  danger: 'border border-white/20 bg-transparent text-white hover:border-white hover:bg-white/10',
};

const sizes = {
  sm: 'h-8 px-3 text-[10px]',
  md: 'h-9 px-4 text-[11px]',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
