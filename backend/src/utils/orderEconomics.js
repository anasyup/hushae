/* ============================================================================
 * Per-order economics — the single source of truth for order-level profit.
 *
 * Every finance surface (order profitability, profit-by-product,
 * profit-by-customer, COD exposure, break-even) resolves costs through this
 * module so the numbers always reconcile with each other and with the
 * aggregate Gross Profit the dashboard already reports.
 *
 * Cost precedence for each line: value stored on the order  →  settings
 * default  →  0. Storing a value on the order (once real courier invoices
 * arrive) therefore overrides the estimate without any code change.
 *
 * Ads are deliberately NOT allocated per order: attribution across COD
 * checkout is unreliable and would make individual orders look arbitrarily
 * unprofitable. They stay an aggregate-only line on the Finance page.
 * ========================================================================== */

const SHIPPED_STAGES = new Set(['Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Completed', 'Failed Delivery']);
const SHIPPED_STATUSES = new Set(['Shipped', 'Out for Delivery', 'Delivered']);

/** Normalises the cost knobs out of a settings document. */
function costConfig(settings = {}) {
  const oc = settings.operatingCosts || {};
  const byCity = new Map(
    (Array.isArray(oc.courierByCity) ? oc.courierByCity : [])
      .filter((r) => r && r.city)
      .map((r) => [String(r.city).trim().toLowerCase(), Number(r.cost) || 0]),
  );
  const fees = oc.paymentFees || {};
  return {
    packaging: Number(oc.packingPerOrder) || 0,
    courierDefault: Number(oc.defaultCourierCost) || Number(oc.shippingSubsidy) || 0,
    courierByCity: byCity,
    returnMultiplier: Number(oc.returnCourierMultiplier) > 0 ? Number(oc.returnCourierMultiplier) : 2,
    feePct: {
      COD: Number(fees.cod) || 0,
      JazzCash: fees.jazzcash !== undefined ? Number(fees.jazzcash) : 2,
      EasyPaisa: fees.easypaisa !== undefined ? Number(fees.easypaisa) : 2,
      'Bank Transfer': fees.bank !== undefined ? Number(fees.bank) : 0,
      Visa: fees.card !== undefined ? Number(fees.card) : 2.75,
    },
    marginThreshold: Number(settings.marginThresholdPercent) >= 0
      ? Number(settings.marginThresholdPercent) : 15,
  };
}

const isCancelled = (o) => o.status === 'Cancelled' || o.stage === 'Cancelled';
const isReturned = (o) => o.status === 'Refunded' || o.stage === 'Returned' || o.stage === 'Refunded';

/**
 * True once the parcel has physically left — the point courier cost is sunk.
 *
 * The current stage is authoritative. Historical `stageTimestamps` are only
 * consulted for terminal orders, where the current stage no longer says
 * whether it ever shipped. Trusting timestamps for live orders would misread
 * any order that was advanced and then rolled back.
 */
function hasShipped(order) {
  if (order.stage && SHIPPED_STAGES.has(order.stage)) return true;
  if (!order.stage && SHIPPED_STATUSES.has(order.status)) return true;
  if (order.stage === 'Returned') return true;          // a return implies it went out
  if (isCancelled(order) || isReturned(order)) {
    const ts = order.stageTimestamps || {};
    return Boolean(ts.Shipped || ts['In Transit'] || ts['Out for Delivery'] || ts.Delivered);
  }
  return false;
}

/**
 * Full economics for one order.
 *
 * `revenue` is 0 for a cancelled/returned order — the money is not kept — but
 * any cost already incurred (courier out, packaging, the return leg) is still
 * reported, which is what makes "Cancelled + refunds: PKR 0" honest.
 */
function orderEconomics(order, cfg) {
  const cancelled = isCancelled(order);
  const returned = isReturned(order);
  const shipped = hasShipped(order);
  const lost = cancelled || returned;

  const gross = Number(order.total) || 0;
  const revenue = lost ? 0 : gross;

  const cogs = (order.items || []).reduce(
    (n, it) => n + (Number(it.costPrice) || 0) * (Number(it.quantity) || 0), 0,
  );

  // Packaging is consumed the moment the parcel is packed. A cancellation
  // before packing costs nothing.
  const packagingRate = order.packagingCost !== undefined && order.packagingCost !== null
    ? Number(order.packagingCost) : cfg.packaging;
  const packaging = (!lost || shipped) ? packagingRate : 0;

  const cityKey = String(order.customerInfo?.city || '').trim().toLowerCase();
  const courierRate = order.courierCost !== undefined && order.courierCost !== null
    ? Number(order.courierCost)
    : (cfg.courierByCity.get(cityKey) ?? cfg.courierDefault);

  // Cancelled before dispatch → nothing paid to the courier.
  // Returned after dispatch → both legs are billed.
  let courier = 0;
  if (!lost) courier = courierRate;
  else if (shipped) courier = returned ? courierRate * cfg.returnMultiplier : courierRate;

  const feePct = cfg.feePct[order.paymentMethod] ?? 0;
  const paymentFee = order.paymentGatewayFee !== undefined && order.paymentGatewayFee !== null
    ? Number(order.paymentGatewayFee)
    : (lost ? 0 : Math.round((gross * feePct) / 100));

  // A lost order keeps no revenue and no COGS (stock returns to shelf on a
  // return; a cancellation was never picked) — only the hard costs remain.
  const effectiveCogs = lost ? 0 : cogs;
  const totalCost = effectiveCogs + packaging + courier + paymentFee;
  const netProfit = revenue - totalCost;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  let health = 'profitable';
  if (lost) health = 'loss';
  else if (netProfit < 0) health = 'loss';
  else if (margin < cfg.marginThreshold) health = 'thin';

  return {
    revenue,
    grossValue: gross,
    cogs: effectiveCogs,
    packaging,
    courier,
    paymentFee,
    feePct,
    totalCost,
    netProfit,
    margin: Math.round(margin * 10) / 10,
    health,
    cancelled,
    returned,
    shipped,
    lostCost: lost ? totalCost : 0,
  };
}

/** Roll a list of orders up into the totals the Finance page shows. */
function summarise(orders, cfg) {
  const acc = {
    orders: 0, revenue: 0, cogs: 0, packaging: 0, courier: 0, paymentFee: 0,
    netProfit: 0, grossProfit: 0,
    profitable: 0, thin: 0, loss: 0,
    cancelledBeforeShip: 0, cancelledBeforeShipCost: 0,
    returnedAfterShip: 0, returnedAfterShipCost: 0,
  };
  for (const o of orders) {
    const e = orderEconomics(o, cfg);
    if (e.cancelled || e.returned) {
      if (e.shipped) { acc.returnedAfterShip += 1; acc.returnedAfterShipCost += e.totalCost; }
      else { acc.cancelledBeforeShip += 1; acc.cancelledBeforeShipCost += e.totalCost; }
      acc.netProfit += e.netProfit;
      acc.packaging += e.packaging;
      acc.courier += e.courier;
      acc.loss += 1;
      continue;
    }
    acc.orders += 1;
    acc.revenue += e.revenue;
    acc.cogs += e.cogs;
    acc.packaging += e.packaging;
    acc.courier += e.courier;
    acc.paymentFee += e.paymentFee;
    acc.netProfit += e.netProfit;
    acc.grossProfit += e.revenue - e.cogs;
    acc[e.health === 'profitable' ? 'profitable' : e.health] += 1;
  }
  acc.margin = acc.revenue > 0 ? Math.round((acc.netProfit / acc.revenue) * 1000) / 10 : 0;
  return acc;
}

module.exports = { costConfig, orderEconomics, summarise, hasShipped, isCancelled, isReturned };
