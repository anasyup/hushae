/* ============================================================================
 * Customer reliability badge — soft-fill pill (12-15% status-colour tint bg,
 * full-saturation text, 5px dot). Server-computed in utils/customerReliability.
 * ========================================================================== */

const STYLE = {
  reliable: '#4ADE80',
  new: '#F0B429',
  'high-risk': '#F87171',
};

export default function ReliabilityBadge({ reliability, compact = false }) {
  if (!reliability || !reliability.label) return null;
  const color = STYLE[reliability.tier] || '#8A8A93';
  return (
    <span
      title={`${reliability.totalOrders} orders · ${reliability.cancelRate}% cancelled`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ color, background: `${color}1F` }}
    >
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: color }} aria-hidden="true" />
      {reliability.label}
    </span>
  );
}
