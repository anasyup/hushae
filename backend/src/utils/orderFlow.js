/* ============================================================================
 * Order pipeline — the single source of truth for fulfilment stages.
 *
 * The detailed pipeline lives in `order.stage`. The original coarse
 * `order.status` is kept in lock-step so every existing screen, email template
 * and report keeps working untouched.
 * ========================================================================== */

const OrderTimeline = require('../models/OrderTimeline');
const OrderNotification = require('../models/OrderNotification');

/** Ordered pipeline. `legacy` maps each stage onto the original status enum. */
const STAGES = [
  // group === the tab the order appears under on the order desk
  { key: 'New',              label: 'New',                 legacy: 'Pending',          group: 'new' },
  { key: 'To Pack',          label: 'To Pack',             legacy: 'Confirmed',        group: 'processing' },
  { key: 'To Arrange',       label: 'To Arrange Shipment', legacy: 'Processing',       group: 'processing' },
  { key: 'Picked',           label: 'Picked',              legacy: 'Processing',       group: 'processing' },
  { key: 'Packed',           label: 'Packed',              legacy: 'Ready to Ship',    group: 'to-ship' },
  { key: 'Manifested',       label: 'Manifested',          legacy: 'Ready to Ship',    group: 'to-ship' },
  { key: 'To Handover',      label: 'To Handover',         legacy: 'Ready to Ship',    group: 'to-ship' },
  { key: 'Shipped',          label: 'Shipped',             legacy: 'Shipped',          group: 'shipped' },
  { key: 'In Transit',       label: 'In Transit',          legacy: 'Shipped',          group: 'shipped' },
  { key: 'Out for Delivery', label: 'Out for Delivery',    legacy: 'Out for Delivery', group: 'shipped' },
  { key: 'Delivered',        label: 'Delivered',           legacy: 'Delivered',        group: 'delivered' },
  { key: 'Completed',        label: 'Completed',           legacy: 'Delivered',        group: 'delivered' },
  // Terminal exits — reachable from almost anywhere.
  { key: 'Cancelled',        label: 'Cancelled',           legacy: 'Cancelled',        group: 'issues', terminal: true },
  { key: 'Refunded',         label: 'Refunded',            legacy: 'Refunded',         group: 'issues', terminal: true },
  { key: 'Returned',         label: 'Returned',            legacy: 'Refunded',         group: 'issues', terminal: true },
  { key: 'Failed Delivery',  label: 'Failed Delivery',     legacy: 'Out for Delivery', group: 'issues' },
  { key: 'On Hold',          label: 'On Hold',             legacy: 'On Hold',          group: 'issues' },
];

const STAGE_KEYS = STAGES.map((s) => s.key);
const STAGE_MAP = new Map(STAGES.map((s) => [s.key, s]));
const FORWARD = STAGES.filter((s) => !s.terminal && s.group !== 'issues').map((s) => s.key);

/** Terminal / exceptional stages an order may jump to from any live stage. */
const EXITS = ['Cancelled', 'Refunded', 'Returned', 'Failed Delivery', 'On Hold'];

/**
 * Which stages may follow `from`.
 * Forward movement is one step by default, but skipping ahead inside the
 * warehouse block is allowed because small teams often pack and manifest in
 * one go. Backwards movement is allowed one step, for corrections.
 */
function allowedNext(from) {
  if (!from || !STAGE_MAP.has(from)) return [...FORWARD, ...EXITS];
  const stage = STAGE_MAP.get(from);
  if (stage.terminal) return from === 'Cancelled' ? ['New'] : [];

  const i = FORWARD.indexOf(from);
  if (i === -1) return [...FORWARD, ...EXITS];

  const next = new Set();
  // Any forward stage within the same block, plus the first stage of the next
  // one. A warehouse that packs straight into a manifest should not have to
  // click through Picked and Packed to get there.
  for (let j = i + 1; j < FORWARD.length; j += 1) {
    const cand = STAGE_MAP.get(FORWARD[j]);
    const sameBlock = cand.group === stage.group;
    const isNextStep = j === i + 1;
    if (sameBlock || isNextStep) next.add(FORWARD[j]);
    else break;
  }

  // The Set-stage menu offers eight plain choices — New, To Pack, To Ship,
  // Shipped, Delivered and the three exits. Every one of those must be
  // reachable from anywhere forward of it, otherwise picking "Shipped" on a
  // To Pack order would be rejected for skipping Packed and Manifested.
  const MENU_TARGETS = ['New', 'To Pack', 'Packed', 'Shipped', 'Delivered'];
  const rank = (k) => FORWARD.indexOf(k);
  MENU_TARGETS.forEach((t) => { if (rank(t) > i) next.add(t); });

  if (i > 0) next.add(FORWARD[i - 1]);           // one step back for corrections
  EXITS.forEach((e) => next.add(e));
  return [...next];
}

function canTransition(from, to) {
  if (!STAGE_MAP.has(to)) return { ok: false, reason: `Unknown stage "${to}"` };
  if (from === to) return { ok: false, reason: 'Order is already at this stage' };
  const allowed = allowedNext(from);
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Cannot move from "${from}" to "${to}"`, allowed };
  }
  return { ok: true };
}

const legacyFor = (stage) => STAGE_MAP.get(stage)?.legacy || 'Pending';
const groupFor = (stage) => STAGE_MAP.get(stage)?.group || 'new';

/** Infer a detailed stage for orders created before the pipeline existed. */
function stageFromLegacy(order) {
  if (order.stage && STAGE_MAP.has(order.stage)) return order.stage;
  switch (order.status) {
    case 'Confirmed': return 'To Pack';
    case 'Processing': return 'To Arrange';
    case 'Ready to Ship': return 'To Handover';
    case 'Shipped': return 'Shipped';
    case 'Out for Delivery': return 'Out for Delivery';
    case 'Delivered': return 'Delivered';
    case 'Cancelled': return 'Cancelled';
    case 'Refunded': return 'Refunded';
    default: return 'New';
  }
}

/**
 * Apply a stage change to an order document (does NOT save).
 * Returns { ok, reason } so callers can surface a precise error.
 */
function applyStage(order, to, { note = '', actor = null, meta = {} } = {}) {
  const from = stageFromLegacy(order);
  const check = canTransition(from, to);
  if (!check.ok) return check;

  order.stage = to;
  if (to === 'On Hold') order.holdFrom = from && from !== 'On Hold' ? from : (order.holdFrom || 'Processing');
  order.status = legacyFor(to);
  order.stageUpdatedAt = new Date();
  order.stageTimestamps = { ...(order.stageTimestamps || {}), [to]: new Date() };
  order.statusHistory.push({ status: order.status, note: note || `Moved to ${to}` });

  return { ok: true, from, to, legacy: order.status, note, actor, meta };
}

/** Persist an immutable timeline row. Never throws into the request path. */
async function recordTransition(order, { from, to, note = '', actor = null, actorType = 'admin', meta = {} }) {
  try {
    await OrderTimeline.create({
      order: order._id,
      orderNumber: order.orderNumber,
      status: to,
      fromStatus: from || '',
      legacyStatus: order.status,
      note: String(note || '').slice(0, 400),
      actorType,
      actorId: actor?._id || null,
      actorName: actor?.name || actor?.email || '',
      meta,
    });
  } catch { /* timeline must never break the operation it records */ }
}

/** Raise an admin notification. Also fire-and-forget. */
async function notify({ type, title, body = '', order = null, severity = 'info', link = '', meta = {} }) {
  try {
    await OrderNotification.create({
      type, title, body, severity, meta,
      order: order?._id || null,
      orderNumber: order?.orderNumber || '',
      link: link || (order ? `/admin/orders/${order._id}` : ''),
    });
  } catch { /* noop */ }
}

module.exports = {
  STAGES, STAGE_KEYS, STAGE_MAP, FORWARD, EXITS,
  allowedNext, canTransition, legacyFor, groupFor, stageFromLegacy,
  applyStage, recordTransition, notify,
};
