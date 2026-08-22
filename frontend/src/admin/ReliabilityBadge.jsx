import { ShieldCheck, ShieldAlert, UserPlus } from 'lucide-react';

/* ============================================================================
 * Customer reliability badge — computed SERVER-side (utils/customerReliability),
 * keyed by phone number. Shown next to the customer name on the Orders list,
 * Order Detail and the verification queue.
 *
 *   · green  "Reliable"     — cancelRate < 10% AND 2+ delivered
 *   · yellow "New customer" — first or second order
 *   · red    "High risk"    — cancelRate > 40% with 3+ historical orders
 * ========================================================================== */

const STYLES = {
  reliable: 'bg-white/10 text-white/90 ring-white/20',
  new: 'bg-white/8 text-white/70 ring-white/15',
  'high-risk': 'bg-white/5 text-white/60 ring-white/10',
};

export default function ReliabilityBadge({ reliability, compact = false }) {
  if (!reliability || !reliability.label) return null;
  const Icon = reliability.tier === 'reliable' ? ShieldCheck : reliability.tier === 'high-risk' ? ShieldAlert : UserPlus;
  const cls = STYLES[reliability.tier] || 'bg-neutral-50 text-neutral-600 ring-neutral-200';
  return (
    <span
      title={`${reliability.totalOrders} orders · ${reliability.cancelRate}% cancelled`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ring-1 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'} ${cls}`}
    >
      <Icon size={compact ? 10 : 11} aria-hidden="true" />
      {reliability.label}
    </span>
  );
}
