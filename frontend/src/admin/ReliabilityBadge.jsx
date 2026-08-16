/* ============================================================================
 * Customer reliability badge — text-only (coloured word + dot), no pill
 * background. Server-computed in utils/customerReliability.js.
 * ========================================================================== */

const STYLE = {
  reliable: '#5F6B45',
  new: '#A67C52',
  'high-risk': '#9C5A52',
};

export default function ReliabilityBadge({ reliability, compact = false }) {
  if (!reliability || !reliability.label) return null;
  const color = STYLE[reliability.tier] || '#6F6A5E';
  return (
    <span
      title={`${reliability.totalOrders} orders · ${reliability.cancelRate}% cancelled`}
      className={`inline-flex shrink-0 items-center gap-1.5 font-medium uppercase tracking-[0.08em] ${compact ? 'text-[10px]' : 'text-[11px]'}`}
      style={{ color }}
    >
      <span className="h-1 w-1 rounded-full" style={{ background: color }} aria-hidden="true" />
      {reliability.label}
    </span>
  );
}
