import Badge from '../ui/Badge';
import { BADGE_TONE } from '../../lib/marketingConfig';

/* ============================================================================
 * PROMO BADGES
 *
 * Renders the badges the SERVER computed, plus any live promotion covering
 * this product. Reuses the existing <Badge> primitive rather than inventing a
 * second badge look — the storefront already had one and a parallel system
 * would drift, which is exactly what happened to admin's Toggle (five copies
 * across nine files by the time Part 2 measured it).
 *
 * Measured constraint: 101 of 101 products carry a compareAtPrice. Without the
 * merchant's minSalePercent floor a "Sale" badge prints on every single card
 * and stops carrying information. That floor is applied server-side; this
 * component only draws what came back.
 *
 * Capped by maxPerCard. Two badges is information, four is a sticker sheet.
 * ========================================================================== */

export default function PromoBadges({ badges = [], promos = [], max = 2, className = '' }) {
  /* Promotions first: a merchant who set up a flash sale wants it seen ahead
     of an automatic "New" tag. */
  const items = [
    ...promos
      .filter((p) => p.badge?.text)
      .map((p) => ({ key: `p-${p.id}`, label: p.badge.text, tone: p.type === 'flash' ? 'flash' : 'bundle' })),
    ...badges.map((b) => ({ key: `b-${b.id}`, label: b.label, tone: b.tone })),
  ].slice(0, Math.max(1, max));

  if (!items.length) return null;

  return (
    <span className={`pointer-events-none flex flex-wrap gap-1 ${className}`}>
      {items.map((b) => (
        <Badge key={b.key} variant={(BADGE_TONE[b.tone] ? b.tone : 'neutral')} className={BADGE_TONE[b.tone] ? '' : undefined}>
          {b.label}
        </Badge>
      ))}
    </span>
  );
}
