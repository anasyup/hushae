const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const InventoryBalance = require('../models/InventoryBalance');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

function variantKeyOf(size, color) {
  return [size || '', color || ''].join('|');
}

function pickVariant(product, size, color) {
  const list = product.variants || [];
  if (!list.length) return null;
  const key = variantKeyOf(size, color);
  return list.find((v) => v.key === key || (v.size === (size || '') && v.color === (color || ''))) || null;
}

async function ensureDefaultWarehouse() {
  let w = await Warehouse.findOne({ isDefault: true, isActive: true });
  if (!w) w = await Warehouse.findOne({ isActive: true });
  if (!w) {
    w = await Warehouse.create({
      code: 'PK-LHE', name: 'Lahore HQ', city: 'Lahore', country: 'PK', isDefault: true,
    });
  }
  return w;
}

function oid(productId) {
  return typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;
}

async function snapshot(productId) {
  const pid = oid(productId);
  const sums = await InventoryBalance.aggregate([
    { $match: { product: pid } },
    {
      $group: {
        _id: '$product',
        onHand: { $sum: '$onHand' },
        reserved: { $sum: '$reserved' },
        incoming: { $sum: '$incoming' },
        damaged: { $sum: '$damaged' },
      },
    },
  ]);
  const row = sums[0] || { onHand: 0, reserved: 0, incoming: 0, damaged: 0 };
  const available = Math.max(0, row.onHand - row.reserved);
  await Product.findByIdAndUpdate(productId, { stock: available });
  return { ...row, available };
}

async function seedBalance({ product, variantKey, warehouseId }) {
  const filter = { product: product._id, variantKey: variantKey || '', warehouse: warehouseId };
  let row = await InventoryBalance.findOne(filter);
  if (row) return row;
  const v = (product.variants || []).find((x) => (x.key || variantKeyOf(x.size, x.color)) === (variantKey || ''));
  const seed = v && Number.isFinite(Number(v.stock)) ? Number(v.stock) : Number(product.stock) || 0;
  row = await InventoryBalance.create({ ...filter, onHand: seed, reserved: 0, incoming: 0, damaged: 0 });
  return row;
}

async function seedAll(product, warehouseId, variantKey) {
  const keys = (product.variants || []).length
    ? product.variants.map((v) => v.key || variantKeyOf(v.size, v.color))
    : [variantKey || ''];
  for (const k of keys) await seedBalance({ product, variantKey: k, warehouseId });
  if (!keys.includes(variantKey || '')) await seedBalance({ product, variantKey, warehouseId });
}

async function alreadyMoved({ refType, refId, type }) {
  if (!refType || !refId) return null;
  return StockMovement.findOne({ refType, refId, type }).lean();
}

async function writeMove({ productId, variantKey, warehouseId, type, qty, balanceAfter, note, actor, refType, refId }) {
  await StockMovement.create({
    product: productId, variantKey: variantKey || '', warehouse: warehouseId,
    type, qty, balanceAfter, note, actor, refType, refId,
  });
}

async function bumpVariantAvailable(product, variantKey, availableDelta) {
  const [size, color] = String(variantKey || '').split('|');
  const v = pickVariant(product, size, color);
  if (!v) return;
  v.stock = Math.max(0, (Number(v.stock) || 0) + availableDelta);
  product.markModified('variants');
  await product.save();
}

/**
 * Reserve: available goes down, onHand unchanged, reserved up.
 * Fulfill: reserved down, onHand down (units leave the building).
 * Unreserve: reserved down (cancel before ship).
 * Receive: onHand up, incoming down if any.
 * Incoming: incoming up (PO sent).
 * Damage: onHand down, damaged up.
 */
async function applyLedger({
  productId, variantKey = '', warehouseId, action, qty, note = '', actor = '', refType = '', refId = '',
}) {
  const n = Math.abs(Number(qty) || 0);
  if (!n) {
    const err = new Error('Quantity required');
    err.status = 400;
    throw err;
  }
  const type = action;
  const dup = await alreadyMoved({ refType, refId, type });
  if (dup) {
    const snap = await snapshot(productId);
    return { ...snap, idempotent: true, onHand: dup.balanceAfter };
  }

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  await seedAll(product, warehouseId, variantKey);
  const filter = { product: productId, variantKey: variantKey || '', warehouse: warehouseId };

  let row;
  if (action === 'reserve') {
    row = await InventoryBalance.findOneAndUpdate(
      { ...filter, $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, n] } },
      { $inc: { reserved: n } },
      { new: true },
    );
    if (!row) {
      const err = new Error('Not enough available stock at this location');
      err.status = 409;
      throw err;
    }
    await bumpVariantAvailable(product, variantKey, -n);
  } else if (action === 'unreserve') {
    row = await InventoryBalance.findOneAndUpdate(
      { ...filter, reserved: { $gte: n } },
      { $inc: { reserved: -n } },
      { new: true },
    );
    if (!row) {
      const err = new Error('Nothing reserved to release');
      err.status = 409;
      throw err;
    }
    await bumpVariantAvailable(product, variantKey, n);
  } else if (action === 'fulfill') {
    row = await InventoryBalance.findOneAndUpdate(
      { ...filter, reserved: { $gte: n }, onHand: { $gte: n } },
      { $inc: { reserved: -n, onHand: -n } },
      { new: true },
    );
    if (!row) {
      const err = new Error('Cannot fulfill — reserved/on-hand short');
      err.status = 409;
      throw err;
    }
  } else if (action === 'receive') {
    row = await InventoryBalance.findOneAndUpdate(
      filter,
      { $inc: { onHand: n, incoming: -Math.min(n, 999999) } },
      { new: true },
    );
    if (row.incoming < 0) {
      row.incoming = 0;
      await row.save();
    }
    await bumpVariantAvailable(product, variantKey, n);
  } else if (action === 'incoming') {
    row = await InventoryBalance.findOneAndUpdate(filter, { $inc: { incoming: n } }, { new: true });
  } else if (action === 'damage') {
    row = await InventoryBalance.findOneAndUpdate(
      { ...filter, onHand: { $gte: n } },
      { $inc: { onHand: -n, damaged: n } },
      { new: true },
    );
    if (!row) {
      const err = new Error('Not enough on-hand to mark damaged');
      err.status = 409;
      throw err;
    }
    await bumpVariantAvailable(product, variantKey, -n);
  } else if (action === 'adjust') {
    const signed = Number(qty);
    if (signed < 0) {
      row = await InventoryBalance.findOneAndUpdate(
        { ...filter, $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, Math.abs(signed)] } },
        { $inc: { onHand: signed } },
        { new: true },
      );
      if (!row) {
        const err = new Error('Adjust would take available below zero');
        err.status = 409;
        throw err;
      }
    } else {
      row = await InventoryBalance.findOneAndUpdate(filter, { $inc: { onHand: signed } }, { new: true });
    }
    await bumpVariantAvailable(product, variantKey, signed);
  } else if (action === 'transfer_out') {
    row = await InventoryBalance.findOneAndUpdate(
      { ...filter, $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, n] } },
      { $inc: { onHand: -n } },
      { new: true },
    );
    if (!row) {
      const err = new Error('Not enough available to transfer');
      err.status = 409;
      throw err;
    }
    await bumpVariantAvailable(product, variantKey, -n);
  } else if (action === 'transfer_in') {
    row = await InventoryBalance.findOneAndUpdate(filter, { $inc: { onHand: n } }, { new: true });
    await bumpVariantAvailable(product, variantKey, n);
  } else if (action === 'return') {
    row = await InventoryBalance.findOneAndUpdate(filter, { $inc: { onHand: n } }, { new: true });
    await bumpVariantAvailable(product, variantKey, n);
  } else {
    const err = new Error(`Unknown inventory action ${action}`);
    err.status = 400;
    throw err;
  }

  await writeMove({
    productId, variantKey, warehouseId, type, qty: action === 'adjust' ? Number(qty) : (['unreserve', 'fulfill', 'transfer_out', 'damage'].includes(action) ? -n : n),
    balanceAfter: row.onHand, note, actor, refType, refId,
  });
  const snap = await snapshot(productId);
  return { ...snap, onHand: row.onHand, reserved: row.reserved, incoming: row.incoming, damaged: row.damaged, idempotent: false };
}

/** Back-compat wrapper used by ops routes. */
async function applyMove(opts) {
  const map = {
    sale: 'fulfill',
    receive: 'receive',
    adjust: 'adjust',
    transfer_out: 'transfer_out',
    transfer_in: 'transfer_in',
    return: 'return',
    count: 'adjust',
  };
  const action = map[opts.type] || opts.type;
  return applyLedger({ ...opts, action });
}

async function runLines({ lines, orderNumber, action, actor, suffix }) {
  const wh = await ensureDefaultWarehouse();
  const done = [];
  try {
    for (const li of lines) {
      const qty = Number(li.quantity);
      if (!qty) continue;
      const variantKey = variantKeyOf(li.size, li.color);
      const warehouseId = li.warehouse || wh._id;
      await applyLedger({
        productId: li.product,
        variantKey,
        warehouseId,
        action,
        qty,
        note: `${action} ${orderNumber}`,
        actor,
        refType: 'order',
        refId: `${orderNumber}:${li.product}:${variantKey}:${suffix}:${Number(li.fromQty || 0)}-${Number(li.fromQty || 0) + qty}`,
      });
      done.push({ ...li, warehouseId, variantKey });
    }
    return { warehouse: wh, done };
  } catch (e) {
    throw e;
  }
}

async function allocateOrderLines({ lines, orderNumber, actor = 'checkout' }) {
  return runLines({ lines, orderNumber, action: 'reserve', actor, suffix: 'reserve' });
}

async function releaseOrderLines({ lines, orderNumber, actor = 'cancel' }) {
  return runLines({ lines, orderNumber, action: 'unreserve', actor, suffix: 'unreserve' });
}

async function fulfillOrderLines({ lines, orderNumber, actor = 'fulfill' }) {
  return runLines({ lines, orderNumber, action: 'fulfill', actor, suffix: 'fulfill' });
}

function forecastFromMovements(moves, days = 14) {
  const sales = moves.filter((m) => m.type === 'sale' || m.type === 'fulfill');
  const units = Math.abs(sales.reduce((n, m) => n + (m.qty || 0), 0));
  const daily = days > 0 ? units / days : 0;
  return { sold: units, daily, daysCover: daily > 0 ? null : Infinity };
}

module.exports = {
  ensureDefaultWarehouse,
  applyMove,
  applyLedger,
  variantKeyOf,
  pickVariant,
  forecastFromMovements,
  allocateOrderLines,
  releaseOrderLines,
  fulfillOrderLines,
  syncProductStock: snapshot,
  snapshot,
  seedBalance,
};
