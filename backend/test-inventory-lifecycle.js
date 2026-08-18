/* Reserve → available drop → fulfill → unreserve → oversell → idempotency. */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mem = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  const Product = require('./src/models/Product');
  const Category = require('./src/models/Category');
  const InventoryBalance = require('./src/models/InventoryBalance');
  const {
    allocateOrderLines, releaseOrderLines, fulfillOrderLines,
    applyLedger, ensureDefaultWarehouse, variantKeyOf,
  } = require('./src/utils/inventoryEngine');

  const cat = await Category.create({ name: 'Test', slug: `t-${Date.now()}`, gender: 'women' });
  const product = await Product.create({
    name: 'Test Brief',
    slug: `tb-${Date.now()}`,
    sku: `SKU-${Date.now()}`,
    gender: 'women',
    category: cat._id,
    categorySlug: cat.slug,
    tier: 'Standard',
    price: 1000,
    stock: 10,
    images: [{ url: '/x.jpg' }],
    sizes: ['S', 'M'],
    variants: [
      { key: 'S|Black', size: 'S', color: 'Black', sku: 'TB-S-BK', stock: 4, price: 1000 },
      { key: 'M|Black', size: 'M', color: 'Black', sku: 'TB-M-BK', stock: 6, price: 1100 },
    ],
  });

  const wh = await ensureDefaultWarehouse();
  let failed = 0;
  const assert = (ok, msg) => {
    if (!ok) { failed += 1; console.error('FAIL', msg); }
    else console.log('ok', msg);
  };

  const bal = async (key) => InventoryBalance.findOne({ product: product._id, variantKey: key, warehouse: wh._id });

  await allocateOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 2 }],
    orderNumber: 'HS-TEST-1',
  });
  let row = await bal('S|Black');
  let p = await Product.findById(product._id);
  let vS = p.variants.find((v) => v.key === 'S|Black');
  assert(row.onHand === 4, `onHand stays 4 after reserve (got ${row.onHand})`);
  assert(row.reserved === 2, `reserved is 2 (got ${row.reserved})`);
  assert(vS.stock === 2, `variant available 2 (got ${vS.stock})`);
  assert(p.stock === 8, `storefront stock = available 8 (got ${p.stock})`);

  await allocateOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 2 }],
    orderNumber: 'HS-TEST-1',
  });
  row = await bal('S|Black');
  assert(row.reserved === 2, `idempotent reserve stays 2 (got ${row.reserved})`);

  let oversold = false;
  try {
    await allocateOrderLines({
      lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 3 }],
      orderNumber: 'HS-TEST-2',
    });
  } catch { oversold = true; }
  assert(oversold, 'cannot reserve more than available');

  await fulfillOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 1 }],
    orderNumber: 'HS-TEST-1',
  });
  row = await bal('S|Black');
  assert(row.onHand === 3, `fulfill 1 → onHand 3 (got ${row.onHand})`);
  assert(row.reserved === 1, `fulfill 1 → reserved 1 (got ${row.reserved})`);

  await releaseOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 1 }],
    orderNumber: 'HS-TEST-1',
  });
  row = await bal('S|Black');
  p = await Product.findById(product._id);
  vS = p.variants.find((v) => v.key === 'S|Black');
  assert(row.reserved === 0, `unreserve leftover (got ${row.reserved})`);
  assert(row.onHand === 3, `unreserve does not put units back on shelf (got ${row.onHand})`);
  assert(vS.stock === 3, `available after unreserve 3 (got ${vS.stock})`);

  await applyLedger({
    productId: product._id, variantKey: 'M|Black', warehouseId: wh._id,
    action: 'incoming', qty: 5, refType: 'po', refId: 'po-1:incoming',
  });
  const m = await bal('M|Black');
  assert(m.incoming === 5, `incoming 5 (got ${m.incoming})`);

  await applyLedger({
    productId: product._id, variantKey: 'M|Black', warehouseId: wh._id,
    action: 'receive', qty: 5, refType: 'po', refId: 'po-1:receive',
  });
  const m2 = await bal('M|Black');
  assert(m2.onHand === 11, `receive 5 onto 6 → 11 (got ${m2.onHand})`);
  assert(m2.incoming === 0, `incoming cleared (got ${m2.incoming})`);

  await applyLedger({
    productId: product._id, variantKey: 'M|Black', warehouseId: wh._id,
    action: 'damage', qty: 1, refType: 'rma', refId: 'dmg-1',
  });
  const m3 = await bal('M|Black');
  assert(m3.damaged === 1 && m3.onHand === 10, `damage 1 (onHand ${m3.onHand} damaged ${m3.damaged})`);

  await mongoose.disconnect();
  await mem.stop();
  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\ninventory lifecycle: all assertions passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
