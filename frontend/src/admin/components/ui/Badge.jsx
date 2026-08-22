/* ============================================================================
 * Admin UI — Badge (Phase 03-R)
 * Flat, uppercase micro-label. Status differentiation via typography and
 * white-opacity levels + optional icon — never color.
 * ========================================================================== */

const tones = {
  success: 'text-white',
  warning: 'text-white/65',
  danger: 'text-white/90',
  info: 'text-white/50',
  accent: 'text-white',
  neutral: 'text-white/55',
};

const dots = {
  success: 'bg-white',
  warning: 'bg-white/60',
  danger: 'bg-white/85',
  info: 'bg-white/40',
  accent: 'bg-white',
  neutral: 'bg-white/45',
};

export default function Badge({ tone = 'neutral', dot = false, className = '', children, ...rest }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${tones[tone]} ${className}`}
      {...rest}
    >
      {dot && <span aria-hidden className={`h-1 w-1 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}
