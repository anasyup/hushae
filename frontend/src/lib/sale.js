/* ============================================================================
 * SALE WINDOWS — single source of truth for "is this product on sale right
 * now?" on the storefront.
 *
 * A product is ON SALE only when ALL of these hold:
 *   1. onSale === true            (merchant explicitly switched the sale on)
 *   2. compareAtPrice > price     (a real "was" price exists)
 *   3. saleStart unset or <= now  (window opened)
 *   4. saleEnd   unset or >= now  (window not closed)
 *
 * compareAtPrice alone NEVER means on sale — that old rule printed "% off" on
 * every product in the catalogue and destroyed price anchoring. The backend
 * filters with the identical rule (Product.saleFilter / utils/helpers.isOnSale).
 * ========================================================================== */

export function isOnSale(p, now = Date.now()) {
  if (!p) return false;
  if (p.onSale !== true) return false;
  if (typeof p.price !== 'number' || typeof p.compareAtPrice !== 'number') return false;
  if (!(p.compareAtPrice > p.price)) return false;
  if (p.saleStart) { const t = new Date(p.saleStart).getTime(); if (Number.isFinite(t) && t > now) return false; }
  if (p.saleEnd) { const t = new Date(p.saleEnd).getTime(); if (Number.isFinite(t) && t < now) return false; }
  return true;
}

/* Whole-number discount percent (0 when not on sale). */
export function salePercent(p) {
  if (!isOnSale(p)) return 0;
  if (!(p.compareAtPrice > p.price)) return 0;
  return Math.round((1 - p.price / p.compareAtPrice) * 100);
}

/* Date the sale window closes (null when there is no end date). */
export function saleEndDate(p) {
  if (!isOnSale(p) || !p.saleEnd) return null;
  const d = new Date(p.saleEnd);
  return Number.isFinite(d.getTime()) ? d : null;
}

/* True when the sale window closes within `days` — for urgency messaging. */
export function saleEndsSoon(p, days = 7, now = Date.now()) {
  const end = saleEndDate(p);
  return end ? end.getTime() - now <= days * 864e5 : false;
}

/* Human "ends on" string, e.g. "Sep 2, 2026". */
export function saleEndsOnLabel(p) {
  const d = saleEndDate(p);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
