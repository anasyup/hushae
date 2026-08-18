const Warehouse = require('../models/Warehouse');
const InventoryBalance = require('../models/InventoryBalance');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

async function ensureDefaultWarehouse() {
  let w = await Warehouse.findOne({ isDefault: true, isActive: true });
  if (!w) {
    w = await Warehouse.findOne({ isActive: true });
  }
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

async function applyMove({
  productId, variantKey = '', warehouseId, type, qty, note = '', actor = '', refType = '', refId = '',
}) {
  const delta = Number(qty);
  if (!Number.isFinite(delta) || delta === 0) throw Object.assign(new Error('Quantity required'), { status: 400 });
  const sign = ['sale', 'transfer_out', 'adjust'].includes(type) && delta > 0 && type === 'sale'
    ? -Math.abs(delta)
    : type === 'sale' || type === 'transfer_out'
      ? -Math.abs(delta)
      : type === 'adjust'
        ? delta
        : Math.abs(delta);

  const filter = { product: productId, variantKey: variantKey || '', warehouse: warehouseId };
  let row = await InventoryBalance.findOne(filter);
  if (!row) row = await InventoryBalance.create({ ...filter, onHand: 0, reserved: 0 });
  const next = Math.max(0, (row.onHand || 0) + sign);
  row.onHand = next;
  await row.save();

  await StockMovement.create({
    product: productId,
    variantKey: variantKey || '',
    warehouse: warehouseId,
    type,
    qty: sign,
    balanceAfter: next,
    note,
    actor,
    refType,
    refId,
  });

  const sums = await InventoryBalance.aggregate([
    { $match: { product: row.product } },
    { $group: { _id: '$product', onHand: { $sum: '$onHand' } } },
  ]);
  const total = sums[0]?.onHand ?? next;
  await Product.findByIdAndUpdate(productId, { stock: total });
  return { onHand: next, productStock: total };
}

function variantKeyOf(size, color) {
  return [size || '', color || ''].join('|');
}

function forecastFromMovements(moves, days = 14) {
  const sales = moves.filter((m) => m.type === 'sale');
  const units = Math.abs(sales.reduce((n, m) => n + (m.qty || 0), 0));
  const daily = days > 0 ? units / days : 0;
  return { sold: units, daily, daysCover: daily > 0 ? null : Infinity };
}

module.exports = { ensureDefaultWarehouse, applyMove, variantKeyOf, forecastFromMovements };
