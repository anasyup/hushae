/* ============================================================================
 * Admin UI — Badge (Phase 01 status system)
 * Muted semantic tones ONLY: success / warning / danger / info / neutral /
 * accent. Never bright rainbow. Status is never communicated by color alone —
 * always include text (the label prop IS the text).
 * ========================================================================== */

const tones = {
  success: 'bg-admin-accent-soft text-admin-text',
  warning: 'bg-admin-accent-soft text-admin-text',
  danger: 'bg-admin-accent-soft text-admin-text',
  info: 'bg-admin-accent-soft text-admin-text-2',
  accent: 'bg-admin-accent-soft text-admin-text',
  neutral: 'bg-admin-surface-2 text-admin-text-2',
};

const dots = {
  success: 'bg-admin-text',
  warning: 'bg-admin-text-muted',
  danger: 'bg-admin-text',
  info: 'bg-admin-text-muted',
  accent: 'bg-admin-text',
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
