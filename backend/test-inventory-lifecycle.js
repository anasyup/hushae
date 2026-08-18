/* Inventory lifecycle: seed → allocate → idempotent sale → release → restock. */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mem = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  const Product = require('./src/models/Product');
  const Category = require('./src/models/Category');
  const { allocateOrderLines, releaseOrderLines, applyMove, ensureDefaultWarehouse } = require('./src/utils/inventoryEngine');

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

  await allocateOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 2 }],
    orderNumber: 'HS-TEST-1',
  });
  const after1 = await Product.findById(product._id);
  const vS = after1.variants.find((v) => v.key === 'S|Black');
  assert(vS.stock === 2, `variant stock after sale is 2 (got ${vS.stock})`);
  assert(after1.stock === 8, `parent stock is warehouse sum 8 (got ${after1.stock})`);

  await allocateOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 2 }],
    orderNumber: 'HS-TEST-1',
  });
  const afterDup = await Product.findById(product._id);
  const vS2 = afterDup.variants.find((v) => v.key === 'S|Black');
  assert(vS2.stock === 2, `idempotent sale does not double-decrement (got ${vS2.stock})`);

  let oversold = false;
  try {
    await allocateOrderLines({
      lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 9 }],
      orderNumber: 'HS-TEST-2',
    });
  } catch { oversold = true; }
  assert(oversold, 'oversell is rejected');

  await releaseOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 2 }],
    orderNumber: 'HS-TEST-1',
  });
  const afterRel = await Product.findById(product._id);
  const vS3 = afterRel.variants.find((v) => v.key === 'S|Black');
  assert(vS3.stock === 4, `release restores variant to 4 (got ${vS3.stock})`);

  await releaseOrderLines({
    lines: [{ product: product._id, size: 'S', color: 'Black', quantity: 2 }],
    orderNumber: 'HS-TEST-1',
  });
  const afterRel2 = await Product.findById(product._id);
  const vS4 = afterRel2.variants.find((v) => v.key === 'S|Black');
  assert(vS4.stock === 4, `idempotent release does not double-credit (got ${vS4.stock})`);

  await applyMove({
    productId: product._id,
    variantKey: 'M|Black',
    warehouseId: wh._id,
    type: 'adjust',
    qty: 3,
    refType: 'test',
    refId: 'adj-1',
  });
  const adj = await Product.findById(product._id);
  const vM = adj.variants.find((v) => v.key === 'M|Black');
  assert(vM.stock === 9, `adjust +3 on M → 9 (got ${vM.stock})`);

  await mongoose.disconnect();
  await mem.stop();
  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\ninventory lifecycle: all assertions passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
