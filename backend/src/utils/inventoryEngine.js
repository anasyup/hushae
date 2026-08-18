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
      code: 'PK-LHE',
      name: 'Lahore HQ',
      city: 'Lahore',
      country: 'PK',
      isDefault: true,
    });
  }
  return w;
}

async function syncProductStock(productId) {
  const pid = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;
  const sums = await InventoryBalance.aggregate([
    { $match: { product: pid } },
    { $group: { _id: '$product', onHand: { $sum: '$onHand' }, reserved: { $sum: '$reserved' } } },
  ]);
  const onHand = sums[0]?.onHand ?? 0;
  await Product.findByIdAndUpdate(productId, { stock: onHand });
  return onHand;
}

async function seedBalance({ product, variantKey, warehouseId }) {
  const filter = { product: product._id, variantKey: variantKey || '', warehouse: warehouseId };
  let row = await InventoryBalance.findOne(filter);
  if (row) return row;
  const v = (product.variants || []).find((x) => (x.key || variantKeyOf(x.size, x.color)) === (variantKey || ''));
  const seed = v && Number.isFinite(v.stock) ? Number(v.stock) : Number(product.stock) || 0;
  row = await InventoryBalance.create({ ...filter, onHand: seed, reserved: 0 });
  return row;
}

async function alreadyMoved({ refType, refId, type }) {
  if (!refType || !refId) return null;
  return StockMovement.findOne({ refType, refId, type }).lean();
}

async function applyMove({
  productId, variantKey = '', warehouseId, type, qty, note = '', actor = '', refType = '', refId = '',
}) {
  const delta = Number(qty);
  if (!Number.isFinite(delta) || delta === 0) {
    const err = new Error('Quantity required');
    err.status = 400;
    throw err;
  }

  const dup = await alreadyMoved({ refType, refId, type });
  if (dup) return { onHand: dup.balanceAfter, productStock: null, idempotent: true };

  const sign = (type === 'sale' || type === 'transfer_out')
    ? -Math.abs(delta)
    : type === 'adjust'
      ? delta
      : Math.abs(delta);

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }

  const keys = (product.variants || []).length
    ? product.variants.map((v) => v.key || variantKeyOf(v.size, v.color))
    : [variantKey || ''];
  for (const k of keys) await seedBalance({ product, variantKey: k, warehouseId });
  if (!keys.includes(variantKey || '')) await seedBalance({ product, variantKey, warehouseId });

  const filter = { product: productId, variantKey: variantKey || '', warehouse: warehouseId };
  if (sign < 0) {
    const row = await InventoryBalance.findOneAndUpdate(
      { ...filter, onHand: { $gte: Math.abs(sign) } },
      { $inc: { onHand: sign } },
      { new: true },
    );
    if (!row) {
      const err = new Error('Not enough stock at this location');
      err.status = 409;
      throw err;
    }
    const v = pickVariant(product, ...(String(variantKey).split('|')));
    if (v) {
      v.stock = Math.max(0, (Number(v.stock) || 0) + sign);
      product.markModified('variants');
      await product.save();
    }
    await StockMovement.create({
      product: productId, variantKey: variantKey || '', warehouse: warehouseId,
      type, qty: sign, balanceAfter: row.onHand, note, actor, refType, refId,
    });
    const productStock = await syncProductStock(productId);
    return { onHand: row.onHand, productStock, idempotent: false };
  }

  const row = await InventoryBalance.findOneAndUpdate(filter, { $inc: { onHand: sign } }, { new: true });
  const v = pickVariant(product, ...(String(variantKey).split('|')));
  if (v) {
    v.stock = Math.max(0, (Number(v.stock) || 0) + sign);
    product.markModified('variants');
    await product.save();
  }
  await StockMovement.create({
    product: productId, variantKey: variantKey || '', warehouse: warehouseId,
    type, qty: sign, balanceAfter: row.onHand, note, actor, refType, refId,
  });
  const productStock = await syncProductStock(productId);
  return { onHand: row.onHand, productStock, idempotent: false };
}

async function allocateOrderLines({ lines, orderNumber, actor = 'checkout' }) {
  const wh = await ensureDefaultWarehouse();
  const done = [];
  try {
    for (const li of lines) {
      const variantKey = variantKeyOf(li.size, li.color);
      const result = await applyMove({
        productId: li.product,
        variantKey,
        warehouseId: wh._id,
        type: 'sale',
        qty: li.quantity,
        note: `Order ${orderNumber}`,
        actor,
        refType: 'order',
        refId: `${orderNumber}:${li.product}:${variantKey}:sale`,
      });
      done.push(li);
      li._stock = result;
    }
    return { warehouse: wh, lines };
  } catch (e) {
    for (const li of done) {
      const variantKey = variantKeyOf(li.size, li.color);
      await applyMove({
        productId: li.product,
        variantKey,
        warehouseId: wh._id,
        type: 'return',
        qty: li.quantity,
        note: `Rollback ${orderNumber}`,
        actor,
        refType: 'order',
        refId: `${orderNumber}:${li.product}:${variantKey}:rollback`,
      }).catch(() => {});
    }
    throw e;
  }
}

async function releaseOrderLines({ lines, orderNumber, actor = 'cancel' }) {
  const wh = await ensureDefaultWarehouse();
  for (const li of lines) {
    const variantKey = variantKeyOf(li.size, li.color);
    await applyMove({
      productId: li.product,
      variantKey,
      warehouseId: wh._id,
      type: 'return',
      qty: li.quantity,
      note: `Release ${orderNumber}`,
      actor,
      refType: 'order',
      refId: `${orderNumber}:${li.product}:${variantKey}:release`,
    });
  }
}

function forecastFromMovements(moves, days = 14) {
  const sales = moves.filter((m) => m.type === 'sale');
  const units = Math.abs(sales.reduce((n, m) => n + (m.qty || 0), 0));
  const daily = days > 0 ? units / days : 0;
  return { sold: units, daily, daysCover: daily > 0 ? null : Infinity };
}

module.exports = {
  ensureDefaultWarehouse,
  applyMove,
  variantKeyOf,
  pickVariant,
  forecastFromMovements,
  allocateOrderLines,
  releaseOrderLines,
  syncProductStock,
  seedBalance,
};
