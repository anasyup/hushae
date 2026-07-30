import { useMemo } from 'react';
import { shippingRules } from '../../lib/cartConfig';

/* ============================================================================
 * The one place bag money is calculated.
 *
 * Before this hook the Cart page priced from a stock-capped subtotal while the
 * CartDrawer priced from the raw cart total, so the two could quote different
 * numbers for the same bag. Everything now derives from this single function:
 * the page summary, the drawer, and the sticky mobile bar.
 *
 * Rules, in order:
 *   1. Sold-out and no-longer-available lines are worth 0 — they cannot be
 *      bought, so they must not inflate the total or unlock free shipping.
 *   2. A low-stock line is charged at the quantity that can actually ship.
 *   3. Discount applies to the goods subtotal only, never to shipping.
 *   4. Free shipping is judged on the subtotal AFTER discount, which is what
 *      the customer is really paying.
 *   5. Tax is a percentage of the discounted goods total. 0 → not shown.
 * ========================================================================== */

const BLOCKED = new Set(['oos', 'unavailable', 'size-gone']);

export function payableQty(line, status, available) {
  if (BLOCKED.has(status)) return 0;
  if (status === 'low' && available != null) return Math.min(line.qty, available);
  return line.qty;
}

export function useCartPricing(lines, settings, cfg, applied) {
  return useMemo(() => {
    const { flat, threshold } = shippingRules(settings);

    let subtotal = 0;
    let count = 0;
    let compareTotal = 0;

    for (const { line, status, available } of lines) {
      const q = payableQty(line, status, available);
      if (!q) continue;
      subtotal += line.price * q;
      count += q;
      compareTotal += (line.compareAtPrice || line.price) * q;
    }

    // A coupon validated against an older, larger subtotal must never exceed
    // the current goods total — that would produce a negative order.
    const discount = Math.min(applied?.discount || 0, subtotal);
    const afterDiscount = Math.max(0, subtotal - discount);

    const freeShip = count === 0 || threshold <= 0 || afterDiscount >= threshold;
    const shipping = count === 0 ? 0 : (freeShip ? 0 : flat);

    const taxPct = Number(cfg.taxPercent) || 0;
    const tax = taxPct > 0 ? Math.round((afterDiscount * taxPct) / 100) : 0;

    const total = afterDiscount + shipping + tax;
    const savings = Math.max(0, compareTotal - subtotal) + discount + (count > 0 && freeShip && threshold > 0 ? flat : 0);

    return {
      subtotal, discount, shipping, tax, total, savings, count,
      threshold, flat, freeShip,
      remaining: Math.max(0, threshold - afterDiscount),
    };
  }, [lines, settings, cfg.taxPercent, applied]);
}
