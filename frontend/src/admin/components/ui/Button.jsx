import { forwardRef } from 'react';

/* ============================================================================
 * Admin UI — Button (Phase 01 design system)
 * Variants: primary (jet white) · secondary (bordered) · ghost · danger
 * Sizes: sm (32) · md (38)
 * Radius: 8px (rounded-lg). No pills, no gradients, no gold.
 * ========================================================================== */

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variants = {
  primary: 'bg-admin-text text-admin-bg hover:bg-admin-accent-hover',
  secondary:
    'border border-admin-border bg-admin-surface-2 text-admin-text-2 hover:bg-admin-surface-3 hover:text-admin-text',
  ghost: 'text-admin-text-2 hover:bg-admin-surface-2 hover:text-admin-text',
  danger: 'bg-admin-danger/15 text-admin-danger hover:bg-admin-danger/25',
};

const sizes = {
  sm: 'min-h-[32px] px-2.5 text-[12px]',
  md: 'min-h-[38px] px-3.5 text-[13px]',
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
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
