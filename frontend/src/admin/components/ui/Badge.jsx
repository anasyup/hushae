/* ============================================================================
 * Admin UI — Badge (Phase 01 status system)
 * Muted semantic tones ONLY: success / warning / danger / info / neutral /
 * accent. Never bright rainbow. Status is never communicated by color alone —
 * always include text (the label prop IS the text).
 * ========================================================================== */

const tones = {
  success: 'bg-admin-success/15 text-admin-success',
  warning: 'bg-admin-warning/15 text-admin-warning',
  danger: 'bg-admin-danger/15 text-admin-danger',
  info: 'bg-admin-info/15 text-admin-info',
  accent: 'bg-admin-accent-soft text-admin-accent-hover',
  neutral: 'bg-admin-surface-2 text-admin-text-2',
};

const dots = {
  success: 'bg-admin-success',
  warning: 'bg-admin-warning',
  danger: 'bg-admin-danger',
  info: 'bg-admin-info',
  accent: 'bg-admin-accent',
  neutral: 'bg-admin-text-muted',
};

export default function Badge({ tone = 'neutral', dot = false, className = '', children, ...rest }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
      {...rest}
    >
      {dot && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}
