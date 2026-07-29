/* ============================================================================
 * Order quality scoring and warehouse hints.
 *
 * Both are derived, never stored: they always reflect the order's current
 * state, so marking a payment verified immediately lifts the score without a
 * migration or a background job.
 * ========================================================================== */

/** Pakistani mobile numbers normalise to 10 digits starting 3. */
function phoneLooksValid(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  const tail = d.slice(-10);
  return tail.length === 10 && tail.startsWith('3');
}

function addressLooksComplete(c = {}) {
  const addr = String(c.address || '').trim();
  return addr.length >= 12 && !!String(c.city || '').trim() && !!String(c.province || '').trim();
}

const HIGH_VALUE_PKR = 50000;
const BULK_UNITS = 10;

/**
 * Score an order out of five and explain every point.
 *
 * @returns {{ score:number, max:number, reasons:Array<{label:string,ok:boolean}>,
 *             flags:string[], priority:'rush'|'high'|'normal' }}
 */
function scoreOrder(order) {
  const c = order.customerInfo || {};
  const items = order.items || [];
  const units = items.reduce((a, i) => a + (i.quantity || 0), 0);

  const paid = order.paymentState === 'Confirmed'
    || order.paymentState === 'Verified'
    || order.paymentStatus === 'Paid'
    || order.verifiedByCall === true;

  // An item is a stock risk when the snapshot we hold says it ran out.
  const stockOk = !items.some((i) => i.stockAtOrder === 0);
  const noIssue = !order.customerService?.hasIssue;

  const reasons = [
    { label: 'Payment verified', ok: paid },
    { label: 'Address complete', ok: addressLooksComplete(c) },
    { label: 'Phone number valid', ok: phoneLooksValid(c.phone) },
    { label: 'Items in stock', ok: stockOk },
    { label: 'No customer issue', ok: noIssue },
  ];

  const score = reasons.filter((r) => r.ok).length;

  const flags = [];
  if (units >= BULK_UNITS) flags.push('bulk');
  if ((order.total || 0) >= HIGH_VALUE_PKR) flags.push('high-value');
  if (order.customerService?.hasIssue) flags.push('issue');

  // Stage age drives the "delayed" flag used by the Needs-attention filter.
  const since = order.stageUpdatedAt || order.updatedAt || order.createdAt;
  const hoursInStage = since ? (Date.now() - new Date(since).getTime()) / 3600000 : 0;
  if (hoursInStage > 24 && !['Delivered', 'Completed', 'Cancelled'].includes(order.stage)) {
    flags.push('delayed');
  }

  const priority = flags.includes('high-value') ? 'rush'
    : flags.includes('bulk') ? 'high'
      : 'normal';

  return { score, max: 5, reasons, flags, priority, hoursInStage: Math.round(hoursInStage) };
}

/* ── Warehouse hints ──────────────────────────────────────────────────────
 * HUSHAE has no warehouse-management system yet, so a location is derived
 * from the SKU. It is stable (the same SKU always maps to the same bin) and
 * groups a category onto one aisle, which is what makes a pick route useful.
 * When a real WMS arrives, swap this function and nothing else changes.
 * ----------------------------------------------------------------------- */
const AISLE_BY_CATEGORY = {
  bras: 'A', panties: 'B', briefs: 'C', boxers: 'C', shapewear: 'D',
  sleepwear: 'E', 'vests-undershirts': 'F', thermals: 'F', socks: 'G',
};

function locationFor(item) {
  const sku = String(item.sku || item.slug || item.name || '');
  const cat = String(item.categorySlug || '').toLowerCase();
  const aisle = AISLE_BY_CATEGORY[cat]
    || String.fromCharCode(65 + (hash(sku) % 7));           // A–G fallback
  const rack = (hash(sku + 'r') % 6) + 1;                   // 1–6
  const shelf = (hash(sku + 's') % 4) + 1;                  // 1–4
  return `${aisle}-${rack}.${shelf}`;
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Attach location, live stock and pick priority to each line of an order.
 * `stockMap` is a Map of productId → { stock, sku, categorySlug }.
 */
function enrichItems(order, stockMap) {
  return (order.items || []).map((it) => {
    const live = stockMap?.get(String(it.product)) || {};
    const available = live.stock ?? null;
    const ordered = it.quantity || 0;

    const stockStatus = available === null ? 'unknown'
      : available <= 0 ? 'out_of_stock'
        : available < ordered ? 'insufficient'
          : available <= 5 ? 'low_stock'
            : 'in_stock';

    return {
      ...it,
      sku: live.sku || it.sku || '',
      warehouseLocation: locationFor({ ...it, sku: live.sku, categorySlug: live.categorySlug }),
      stockStatus,
      stockAvailable: available,
      // 1 = pick first. Anything short or low gets picked before it disappears.
      pickPriority: stockStatus === 'out_of_stock' || stockStatus === 'insufficient' ? 1
        : stockStatus === 'low_stock' ? 2 : 3,
    };
  });
}

/** Group enriched lines into an efficient walking route. */
function pickRoute(items) {
  const byAisle = new Map();
  for (const it of items) {
    const aisle = String(it.warehouseLocation || 'Z').split('-')[0];
    if (!byAisle.has(aisle)) byAisle.set(aisle, []);
    byAisle.get(aisle).push(it);
  }
  return [...byAisle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([aisle, list]) => ({
      aisle,
      items: list.sort((a, b) => String(a.warehouseLocation).localeCompare(String(b.warehouseLocation))),
    }));
}

module.exports = { scoreOrder, enrichItems, locationFor, pickRoute, phoneLooksValid, addressLooksComplete };
