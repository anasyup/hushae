import { Gift, Info, Tag } from 'lucide-react';
import { pkr } from '../../lib/format';

/* ============================================================================
 * APPLIED PROMOTION SUMMARY + WHY-NOT
 *
 * The brief asks the shopper to understand four things: why a discount
 * applied, why one did not, which promotion won, and which were skipped.
 *
 * The engine already answers all four — Part 1 returns a reason code for every
 * refusal. What was missing was somewhere to say it in words.
 *
 * A deliberate limit: only NEAR MISSES are shown. Telling a shopper their
 * basket was refused a promotion aimed at first-time customers, or at a
 * different city, is confusing and slightly insulting. "Spend PKR 400 more"
 * is useful; "you have ordered before" is not.
 * ========================================================================== */

/* Reasons a shopper can act on. Everything else stays quiet — a customer
   cannot become a first-time buyer again, and telling them a promotion exists
   for other people is a bad experience. */
const ACTIONABLE = {
  'below-minimum': (p) => (p.need ? `Spend ${pkr(p.need)} to unlock ${p.name}` : null),
  'too-few-items': (p) => (p.need ? `Add ${p.need} items to unlock ${p.name}` : null),
};

export default function PromoSummary({ discounts = [], rejected = [], capped, className = '' }) {
  const applied = discounts.filter((d) => d.amount > 0 || d.freeShipping);
  const nudges = rejected
    .map((r) => ACTIONABLE[r.rejectedFor]?.(r))
    .filter(Boolean)
    .slice(0, 2);

  if (!applied.length && !nudges.length) return null;

  return (
    <div className={className}>
      {applied.length > 0 && (
        <ul className="space-y-1.5" aria-label="Offers applied to your bag">
          {applied.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 rounded-control bg-sage/15 px-3 py-2">
              <span className="flex min-w-0 items-start gap-2">
                {d.freeShipping
                  ? <Gift size={13} className="mt-0.5 shrink-0 text-sagedark" aria-hidden="true" />
                  : <Tag size={13} className="mt-0.5 shrink-0 text-sagedark" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block text-caption font-semibold text-sagedark">{d.label || d.name}</span>
                  {d.note && <span className="block text-[11px] text-sagedark/80">{d.note}</span>}
                </span>
              </span>
              <span className="shrink-0 text-caption font-semibold tabular-nums text-sagedark">
                {d.freeShipping && !d.amount ? 'Free delivery' : `− ${pkr(d.amount)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {capped && (
        <p className="mt-2 flex items-start gap-2 rounded-control bg-cream px-3 py-2 text-[11px] leading-relaxed text-graphite">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Your savings have reached the maximum for one order.</span>
        </p>
      )}

      {nudges.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {nudges.map((n) => (
            <li key={n} className="flex items-start gap-2 rounded-control border border-dashed border-stone px-3 py-2 text-caption text-graphite">
              <Info size={12} className="mt-0.5 shrink-0 text-ash" aria-hidden="true" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
