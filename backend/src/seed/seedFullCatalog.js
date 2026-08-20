/* ============================================================================
 * HUSHAE — Full Catalog Seed (100 SKUs · local real imagery)
 * ----------------------------------------------------------------------------
 * Inserts/updates the full 100-product catalog (buildCatalog) into the DB,
 * preferring the repo's self-hosted real images in
 * frontend/public/images/products/ ({slug}-model.jpg + {slug}-{color}.jpg)
 * over the Unsplash fallbacks in catalog.js.
 *
 * SAFE FOR PRODUCTION: idempotent upsert by SKU — never duplicates, never
 * deletes anything. Skips nothing; updates changed fields.
 *
 * USAGE:
 *   MONGODB_URI=<atlas uri> npm run seed:catalog
 * ========================================================================== */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { buildCatalog } = require('./catalog');

const IMG = '/images/products';
const LOCAL_DIR = path.resolve(__dirname, '../../../frontend/public/images/products');

/* Map a product + its colors to self-hosted local images when the files
 * exist on disk. Order: model shot first (primary), then per-color shots
 * (drive the hover crossfade + swatch image swap). Falls back to the
 * catalog's Unsplash images when no local files exist. */
function resolveImages(product) {
  const base = String(product.name).replace(/^HUSHAE\s+/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const modelFile = `${base}-model.jpg`;
  const images = [];
  const colors = (product.colors || []).map((c) => ({ ...c }));

  const has = (f) => fs.existsSync(path.join(LOCAL_DIR, f));

  if (has(modelFile)) images.push({ url: `${IMG}/${modelFile}`, alt: `${product.name} — model view` });

  for (const c of colors) {
    const slug = String(c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const f = `${base}-${slug}.jpg`;
    if (has(f)) {
      c.image = `${IMG}/${f}`;
      images.push({ url: `${IMG}/${f}`, alt: `${product.name} — ${c.name}` });
    }
  }

  if (images.length === 0) return { images: product.images || [], colors };
  return { images: images.slice(0, 4), colors };
}

async function seedFullCatalog(log = console.log) {
  const { categories, products } = buildCatalog();

  // categories must exist (they do in every HUSHAE env)
  const bySlug = {};
  const cats = await Category.find({});
  for (const c of cats) bySlug[c.slug] = c._id;
  const missing = categories.filter((c) => !bySlug[c.slug]).map((c) => c.slug);
  if (missing.length) throw new Error(`Missing categories: ${missing.join(', ')}`);

  const existing = await Product.find({ sku: { $in: products.map((p) => p.sku) } }, { sku: 1 });
  const existingSkus = new Set(existing.map((d) => d.sku));

  let created = 0;
  let updated = 0;
  for (const p of products) {
    const wasNew = !existingSkus.has(p.sku);
    const { images, colors } = resolveImages(p);
    const doc = {
      ...p,
      category: bySlug[p.categorySlug],
      images,
      colors,
      isActive: true,
      status: 'active',
    };
    await Product.findOneAndUpdate({ sku: p.sku }, { $set: doc }, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });
    if (wasNew) created += 1; else updated += 1;
    log(`[seed:catalog] ${wasNew ? 'CREATED' : 'UPDATED '} ${p.sku} — ${p.name}`);
  }
  log(`[seed:catalog] done — ${created} created, ${updated} updated (${products.length} total)`);
  return { created, updated, total: products.length };
}

async function main() {
  const uri = config.mongoUri;
  if (!uri) {
    console.error('MONGODB_URI is empty. Set it and re-run.');
    process.exit(1);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  try {
    await seedFullCatalog();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[seed:catalog] FAILED:', e.message);
    process.exit(1);
  });
}

module.exports = { seedFullCatalog, resolveImages };
