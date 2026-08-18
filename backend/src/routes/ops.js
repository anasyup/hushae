const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryBalance = require('../models/InventoryBalance');
const StockMovement = require('../models/StockMovement');
const ReturnCase = require('../models/ReturnCase');
const RefundLedger = require('../models/RefundLedger');
const ShippingProfile = require('../models/ShippingProfile');
const TaxZone = require('../models/TaxZone');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { CommsTemplate, ConsentLog, CommsLog } = require('../models/Comms');
const { ensureDefaultWarehouse, applyMove, variantKeyOf } = require('../utils/inventoryEngine');
const { scoreRisk } = require('../utils/riskEngine');

const router = express.Router();
router.use(protect, adminOnly);

const poNumber = () => `PO-${Date.now().toString(36).toUpperCase()}`;
const rmaNumber = () => `RMA-${Date.now().toString(36).toUpperCase()}`;

router.get('/overview', asyncHandler(async (_req, res) => {
  const wh = await ensureDefaultWarehouse();
  const [warehouses, low, openPo, openRma, flagged, moves] = await Promise.all([
    Warehouse.countDocuments({ isActive: true }),
    Product.countDocuments({ stock: { $lte: 10 }, isActive: true }),
    PurchaseOrder.countDocuments({ status: { $in: ['draft', 'sent', 'partial'] } }),
    ReturnCase.countDocuments({ stage: { $nin: ['completed', 'rejected'] } }),
    Order.countDocuments({ 'fraudFilter.isFlagged': true, 'fraudFilter.status': 'pending' }),
    StockMovement.find({}).sort({ createdAt: -1 }).limit(8).populate('product', 'name sku').lean(),
  ]);
  res.json({
    defaultWarehouse: wh,
    counts: { warehouses, lowStock: low, openPurchaseOrders: openPo, openReturns: openRma, riskHold: flagged },
    recentMoves: moves,
  });
}));

/* ── Warehouses ─────────────────────────────────────────────── */
router.get('/warehouses', asyncHandler(async (_req, res) => {
  await ensureDefaultWarehouse();
  res.json({ warehouses: await Warehouse.find({}).sort({ isDefault: -1, name: 1 }).lean() });
}));
router.post('/warehouses', asyncHandler(async (req, res) => {
  const w = await Warehouse.create(req.body || {});
  if (w.isDefault) await Warehouse.updateMany({ _id: { $ne: w._id } }, { $set: { isDefault: false } });
  res.status(201).json({ warehouse: w });
}));
router.patch('/warehouses/:id', asyncHandler(async (req, res) => {
  const w = await Warehouse.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!w) return res.status(404).json({ message: 'Warehouse not found' });
  if (w.isDefault) await Warehouse.updateMany({ _id: { $ne: w._id } }, { $set: { isDefault: false } });
  res.json({ warehouse: w });
}));

/* ── Stock ──────────────────────────────────────────────────── */
router.get('/stock', asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.warehouse) q.warehouse = req.query.warehouse;
  if (req.query.product) q.product = req.query.product;
  const rows = await InventoryBalance.find(q).populate('product', 'name sku stock price costPrice').populate('warehouse', 'code name').lean();
  res.json({ balances: rows });
}));

router.post('/stock/adjust', asyncHandler(async (req, res) => {
  const { productId, variantKey, warehouseId, qty, note } = req.body || {};
  if (!productId || !warehouseId) return res.status(400).json({ message: 'Product and warehouse required' });
  const actor = req.user?.email || req.user?.name || 'staff';
  const result = await applyMove({
    productId, variantKey, warehouseId, type: 'adjust', qty: Number(qty), note, actor, refType: 'adjust',
  });
  res.json(result);
}));

router.post('/stock/transfer', asyncHandler(async (req, res) => {
  const { productId, variantKey, fromWarehouseId, toWarehouseId, qty, note } = req.body || {};
  if (!productId || !fromWarehouseId || !toWarehouseId) return res.status(400).json({ message: 'Transfer needs from/to warehouse' });
  const n = Math.abs(Number(qty) || 0);
  if (!n) return res.status(400).json({ message: 'Quantity required' });
  const actor = req.user?.email || 'staff';
  await applyMove({ productId, variantKey, warehouseId: fromWarehouseId, type: 'transfer_out', qty: n, note, actor, refType: 'transfer' });
  const dest = await applyMove({ productId, variantKey, warehouseId: toWarehouseId, type: 'transfer_in', qty: n, note, actor, refType: 'transfer' });
  res.json(dest);
}));

router.get('/stock/history', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.product) filter.product = req.query.product;
  const rows = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(200)
    .populate('product', 'name sku').populate('warehouse', 'code name').lean();
  res.json({ movements: rows });
}));

router.get('/stock/insights', asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 14 * 86400000);
  const products = await Product.find({ isActive: true }).select('name sku stock price costPrice reorderPoint safetyStock').lean();
  const sales = await StockMovement.aggregate([
    { $match: { type: 'sale', createdAt: { $gte: since } } },
    { $group: { _id: '$product', sold: { $sum: { $abs: '$qty' } } } },
  ]);
  const soldMap = new Map(sales.map((s) => [String(s._id), s.sold]));
  const rows = products.map((p) => {
    const sold = soldMap.get(String(p._id)) || 0;
    const daily = sold / 14;
    const cover = daily > 0 ? p.stock / daily : (p.stock > 0 ? 999 : 0);
    const value = (p.stock || 0) * (p.costPrice || p.price || 0);
    const dead = sold === 0 && (p.stock || 0) > 0;
    const stockoutSoon = daily > 0 && cover < 7;
    return {
      productId: p._id, name: p.name, sku: p.sku, stock: p.stock, sold14: sold,
      daily, coverDays: Math.round(cover * 10) / 10, value, dead, stockoutSoon,
      reorderPoint: p.reorderPoint ?? 10,
    };
  });
  res.json({
    valuation: rows.reduce((n, r) => n + r.value, 0),
    dead: rows.filter((r) => r.dead).length,
    stockoutSoon: rows.filter((r) => r.stockoutSoon).length,
    rows: rows.sort((a, b) => a.coverDays - b.coverDays).slice(0, 80),
  });
}));

/* ── Suppliers + POs ────────────────────────────────────────── */
router.get('/suppliers', asyncHandler(async (_req, res) => {
  res.json({ suppliers: await Supplier.find({}).sort({ name: 1 }).lean() });
}));
router.post('/suppliers', asyncHandler(async (req, res) => {
  res.status(201).json({ supplier: await Supplier.create(req.body || {}) });
}));
router.patch('/suppliers/:id', asyncHandler(async (req, res) => {
  const s = await Supplier.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!s) return res.status(404).json({ message: 'Supplier not found' });
  res.json({ supplier: s });
}));

router.get('/purchase-orders', asyncHandler(async (_req, res) => {
  const list = await PurchaseOrder.find({}).sort({ createdAt: -1 }).limit(80)
    .populate('supplier', 'name').populate('warehouse', 'code name').lean();
  res.json({ purchaseOrders: list });
}));
router.post('/purchase-orders', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const po = await PurchaseOrder.create({
    number: poNumber(),
    supplier: body.supplier,
    warehouse: body.warehouse,
    lines: body.lines || [],
    notes: body.notes || '',
    expectedAt: body.expectedAt || null,
    status: 'sent',
  });
  try {
    const { applyLedger, variantKeyOf } = require('../utils/inventoryEngine');
    for (const line of po.lines) {
      await applyLedger({
        productId: line.product,
        variantKey: line.variantKey || variantKeyOf('', ''),
        warehouseId: po.warehouse,
        action: 'incoming',
        qty: line.qtyOrdered,
        note: `PO ${po.number} expected`,
        actor: req.user?.email || 'staff',
        refType: 'po',
        refId: `${po._id}:${line.product}:incoming`,
      });
    }
  } catch (e) { console.error('incoming stock mark failed', e.message); }
  res.status(201).json({ purchaseOrder: po });
}));
router.post('/purchase-orders/:id/receive', asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ message: 'PO not found' });
  const actor = req.user?.email || 'staff';
  for (const line of po.lines) {
    const remaining = Math.max(0, (line.qtyOrdered || 0) - (line.qtyReceived || 0));
    if (!remaining) continue;
    await applyMove({
      productId: line.product,
      variantKey: line.variantKey || '',
      warehouseId: po.warehouse,
      type: 'receive',
      qty: remaining,
      note: `PO ${po.number}`,
      actor,
      refType: 'po',
      refId: String(po._id),
    });
    line.qtyReceived = line.qtyOrdered;
  }
  po.status = 'received';
  po.receivedAt = new Date();
  await po.save();
  res.json({ purchaseOrder: po });
}));

/* ── Returns + refunds ──────────────────────────────────────── */
router.get('/returns', asyncHandler(async (_req, res) => {
  const list = await ReturnCase.find({}).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ returns: list, stages: ReturnCase.STAGES });
}));
router.post('/returns', asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.orderId || !body.reason) return res.status(400).json({ message: 'Order and reason required' });
  const order = await Order.findById(body.orderId);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const doc = await ReturnCase.create({
    rma: rmaNumber(),
    order: order._id,
    orderNumber: order.orderNumber,
    reason: body.reason,
    notes: body.notes || '',
    items: body.items || order.items.map((i) => ({
      product: i.product, name: i.name, size: i.size, color: i.color, qty: i.quantity,
    })),
    photos: body.photos || [],
    history: [{ stage: 'requested', note: 'Opened', actor: req.user?.email || 'staff' }],
  });
  res.status(201).json({ return: doc });
}));
router.patch('/returns/:id/stage', asyncHandler(async (req, res) => {
  const doc = await ReturnCase.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Return not found' });
  const stage = String(req.body?.stage || '');
  if (!ReturnCase.STAGES.includes(stage)) return res.status(400).json({ message: 'Invalid stage' });
  doc.stage = stage;
  if (req.body.resolution) doc.resolution = req.body.resolution;
  if (req.body.refundAmount != null) doc.refundAmount = Number(req.body.refundAmount) || 0;
  doc.history.push({ stage, note: req.body.note || '', actor: req.user?.email || 'staff' });
  if (stage === 'completed' && doc.restock && doc.resolution !== 'reject') {
    const wh = await ensureDefaultWarehouse();
    for (const it of doc.items) {
      if (it.product) {
        await applyMove({
          productId: it.product,
          variantKey: variantKeyOf(it.size, it.color),
          warehouseId: wh._id,
          type: 'return',
          qty: it.qty || 1,
          note: `RMA ${doc.rma}`,
          actor: req.user?.email || 'staff',
          refType: 'rma',
          refId: String(doc._id),
        });
      }
    }
  }
  await doc.save();
  res.json({ return: doc });
}));

router.get('/refunds', asyncHandler(async (req, res) => {
  const q = req.query.order ? { order: req.query.order } : {};
  res.json({ refunds: await RefundLedger.find(q).sort({ createdAt: -1 }).limit(100).lean() });
}));
router.post('/refunds', asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.orderId || !body.amount) return res.status(400).json({ message: 'Order and amount required' });
  const order = await Order.findById(body.orderId);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const row = await RefundLedger.create({
    order: order._id,
    orderNumber: order.orderNumber,
    returnCase: body.returnId || null,
    method: body.method || 'manual',
    amount: Number(body.amount),
    includesShipping: !!body.includesShipping,
    includesTax: !!body.includesTax,
    note: body.note || '',
    actor: req.user?.email || 'staff',
  });
  const totalRefunded = await RefundLedger.aggregate([
    { $match: { order: order._id } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const sum = totalRefunded[0]?.sum || 0;
  if (sum >= (order.total || 0) - 1) {
    order.paymentStatus = 'Refunded';
    order.paymentState = 'Refunded';
    if (order.status !== 'Cancelled') order.status = 'Refunded';
    await order.save();
  }
  res.status(201).json({ refund: row, refundedTotal: sum });
}));

/* ── Comms ──────────────────────────────────────────────────── */
router.get('/comms/templates', asyncHandler(async (_req, res) => {
  let list = await CommsTemplate.find({}).sort({ channel: 1, key: 1 }).lean();
  if (!list.length) {
    await CommsTemplate.insertMany([
      { channel: 'whatsapp', key: 'order_confirm', name: 'Order confirm', body: 'Hi {name}, confirm order {order} for {total}. Reply YES.' },
      { channel: 'whatsapp', key: 'shipped', name: 'Shipped', body: 'Hi {name}, {order} is on the way. Track: {tracking}' },
      { channel: 'whatsapp', key: 'abandoned', name: 'Abandoned cart', body: 'Hi {name}, you left items in your HUSHAE bag. Complete checkout when ready.' },
      { channel: 'sms', key: 'otp', name: 'OTP', body: 'Your HUSHAE code is {code}' },
    ]);
    list = await CommsTemplate.find({}).lean();
  }
  res.json({ templates: list });
}));
router.post('/comms/templates', asyncHandler(async (req, res) => {
  res.status(201).json({ template: await CommsTemplate.create(req.body || {}) });
}));
router.patch('/comms/templates/:id', asyncHandler(async (req, res) => {
  const t = await CommsTemplate.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!t) return res.status(404).json({ message: 'Template not found' });
  res.json({ template: t });
}));
router.get('/comms/consent', asyncHandler(async (_req, res) => {
  res.json({ consent: await ConsentLog.find({}).sort({ createdAt: -1 }).limit(200).lean() });
}));
router.post('/comms/consent', asyncHandler(async (req, res) => {
  const row = await ConsentLog.create(req.body || {});
  res.status(201).json({ consent: row });
}));
router.get('/comms/log', asyncHandler(async (_req, res) => {
  res.json({ log: await CommsLog.find({}).sort({ createdAt: -1 }).limit(200).lean() });
}));
router.post('/comms/send', asyncHandler(async (req, res) => {
  const { channel = 'whatsapp', to, body, templateKey, orderNumber } = req.body || {};
  if (!to || !body) return res.status(400).json({ message: 'Recipient and body required' });
  const latest = await ConsentLog.findOne({ phone: to, channel }).sort({ createdAt: -1 }).lean();
  if (latest?.status === 'opt_out') return res.status(403).json({ message: 'Customer opted out of this channel' });
  const digits = String(to).replace(/\D/g, '').replace(/^0/, '92');
  const url = channel === 'whatsapp' ? `https://wa.me/${digits}?text=${encodeURIComponent(body)}` : '';
  const log = await CommsLog.create({
    channel, to, body, templateKey: templateKey || '', orderNumber: orderNumber || '',
    status: 'sent', actor: req.user?.email || 'staff',
  });
  res.status(201).json({ log, openUrl: url });
}));

/* ── Risk ───────────────────────────────────────────────────── */
router.get('/risk', asyncHandler(async (_req, res) => {
  const orders = await Order.find({ 'fraudFilter.isFlagged': true })
    .sort({ createdAt: -1 }).limit(80)
    .select('orderNumber total paymentMethod status fraudFilter customerInfo createdAt').lean();
  res.json({ orders });
}));
router.post('/risk/:id/review', asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const status = req.body?.status === 'rejected' ? 'rejected' : 'approved';
  order.fraudFilter = { ...(order.fraudFilter || {}), status, isFlagged: status !== 'approved' };
  if (status === 'rejected' && order.status === 'Pending') {
    order.status = 'Cancelled';
    order.cancelReason = 'High risk — rejected';
  }
  await order.save();
  res.json({ order });
}));
router.post('/risk/score', asyncHandler(async (req, res) => {
  res.json(await scoreRisk(req.body || {}));
}));

/* ── Shipping + tax ─────────────────────────────────────────── */
router.get('/shipping', asyncHandler(async (_req, res) => {
  res.json({ profiles: await ShippingProfile.find({}).sort({ name: 1 }).lean() });
}));
router.post('/shipping', asyncHandler(async (req, res) => {
  res.status(201).json({ profile: await ShippingProfile.create(req.body || {}) });
}));
router.patch('/shipping/:id', asyncHandler(async (req, res) => {
  const p = await ShippingProfile.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!p) return res.status(404).json({ message: 'Profile not found' });
  res.json({ profile: p });
}));

router.get('/tax', asyncHandler(async (_req, res) => {
  res.json({ zones: await TaxZone.find({}).sort({ country: 1 }).lean() });
}));
router.post('/tax', asyncHandler(async (req, res) => {
  res.status(201).json({ zone: await TaxZone.create(req.body || {}) });
}));
router.patch('/tax/:id', asyncHandler(async (req, res) => {
  const z = await TaxZone.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!z) return res.status(404).json({ message: 'Zone not found' });
  res.json({ zone: z });
}));

/* ── Launchpad (schedule + activate sale windows) ───────────── */
const CampaignLaunch = require('../models/CampaignLaunch');

router.get('/launches', asyncHandler(async (_req, res) => {
  res.json({ launches: await CampaignLaunch.find({}).sort({ createdAt: -1 }).limit(40).lean() });
}));
router.post('/launches', asyncHandler(async (req, res) => {
  const row = await CampaignLaunch.create(req.body || {});
  res.status(201).json({ launch: row });
}));
router.post('/launches/:id/go-live', asyncHandler(async (req, res) => {
  const row = await CampaignLaunch.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Launch not found' });
  if (row.productIds?.length) {
    await Product.updateMany(
      { _id: { $in: row.productIds } },
      { $set: { onSale: true, saleStart: row.startsAt || new Date(), saleEnd: row.endsAt || null } },
    );
  }
  row.status = 'live';
  row.launchedAt = new Date();
  await row.save();
  res.json({ launch: row });
}));
router.post('/launches/:id/end', asyncHandler(async (req, res) => {
  const row = await CampaignLaunch.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Launch not found' });
  if (row.productIds?.length) {
    await Product.updateMany(
      { _id: { $in: row.productIds } },
      { $set: { onSale: false, saleEnd: new Date() } },
    );
  }
  row.status = 'ended';
  row.endedAt = new Date();
  await row.save();
  res.json({ launch: row });
}));

module.exports = router;
