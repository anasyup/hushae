/* ============================================================================
 * Customer reliability badge — text-only (coloured word + dot), no pill
 * background. Server-computed in utils/customerReliability.js.
 * ========================================================================== */

const STYLE = {
  reliable: 'var(--px-success)',
  new: 'var(--px-warning)',
  'high-risk': 'var(--px-danger)',
};

export default function ReliabilityBadge({ reliability, compact = false }) {
  if (!reliability || !reliability.label) return null;
  const color = STYLE[reliability.tier] || 'var(--px-muted)';
  return (
    <span
      title={`${reliability.totalOrders} orders · ${reliability.cancelRate}% cancelled`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ color, background: `${color}1A` }}
    >
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: color }} aria-hidden="true" />
      {reliability.label}
    </span>
  );
}
