/* ============================================================================
 * HUSHAE — New Arrivals Catalog Seed (V2 · 8 products · 24 editorial images)
 * ----------------------------------------------------------------------------
 * SAFE FOR PRODUCTION:
 *   · Idempotent — upserts by SKU, never duplicates, never deletes anything.
 *   · Only touches the 8 SKUs below. Existing products/categories untouched.
 *   · onSale defaults to false (launch convention — a fresh launch is NEVER
 *     automatically discounted; flip the sale on in Admin → Products).
 *
 * USAGE:
 *   MONGODB_URI=<atlas uri> npm run seed:newarrivals
 *   (or) node backend/src/seed/seedNewArrivals.js
 *
 * Requires the target category slugs to exist (they do in every HUSHAE
 * environment — bras, panties, camisoles-slips, trunks, boxers,
 * vests-undershirts, sleepwear-loungewear).
 * ========================================================================== */

const mongoose = require('mongoose');
const config = require('../config');
const Category = require('../models/Category');
const Product = require('../models/Product');

const IMG = '/images/products';

/* ── The 8 New Arrivals ──────────────────────────────────────────────────── */
const NEW_ARRIVALS = [
  /* ── WOMEN'S ──────────────────────────────────────────────────────────── */
  {
    name: 'HUSHAE Modal Soft-Cup Lounge Bra',
    slug: 'modal-soft-cup-lounge-bra',
    sku: 'W-BRA-001',
    gender: 'women',
    categorySlug: 'bras',
    tier: 'Premium',
    price: 2850,
    compareAtPrice: 3500,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Chalk White', hex: '#F5F5F5', image: `${IMG}/modal-bra-front.jpg` },
      { name: 'Jet Black', hex: '#111111', image: `${IMG}/modal-bra-front.jpg` },
      { name: 'Nude Sand', hex: '#D9C8B4', image: `${IMG}/modal-bra-front.jpg` },
    ],
    fabric: '92% Micro-Modal · 8% Elastane',
    images: [
      { url: `${IMG}/modal-bra-front.jpg`, alt: 'Modal Soft-Cup Lounge Bra — front view' },
      { url: `${IMG}/modal-bra-back.jpg`, alt: 'Modal Soft-Cup Lounge Bra — alternate angle' },
      { url: `${IMG}/modal-bra-detail.jpg`, alt: 'Modal Soft-Cup Lounge Bra — fabric detail' },
    ],
    shortDescription: 'A feather-light micro-modal lounge bra with a barely-there soft cup.',
    description:
      'A lounge bra that disappears under everything. Cut from 92% micro-modal and 8% elastane, the soft-cup construction supports without structure — no wires, no dig, no compromise. Second-skin comfort for slow mornings and long days alike.',
    badges: ['New Arrival', 'Silk-Touch'],
    tags: ['new arrival', 'premium', 'lounge bra', 'modal', 'wireless', 'women'],
    care: [
      'Hand wash cold or gentle machine cycle in a wash bag',
      'Do not bleach, wring or tumble dry',
      'Lay flat to dry away from direct sunlight',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },
  {
    name: 'HUSHAE Seamless High-Waist Brief',
    slug: 'seamless-high-waist-brief',
    sku: 'W-PNT-002',
    gender: 'women',
    categorySlug: 'panties',
    tier: 'Premium',
    price: 1650,
    compareAtPrice: 2100,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Chalk White', hex: '#F5F5F5', image: `${IMG}/seamless-brief-front.jpg` },
      { name: 'Jet Black', hex: '#111111', image: `${IMG}/seamless-brief-front.jpg` },
      { name: 'Taupe', hex: '#B2A496', image: `${IMG}/seamless-brief-front.jpg` },
    ],
    fabric: 'Laser-cut Second-Skin Microfibre',
    images: [
      { url: `${IMG}/seamless-brief-front.jpg`, alt: 'Seamless High-Waist Brief — front view' },
      { url: `${IMG}/seamless-brief-back.jpg`, alt: 'Seamless High-Waist Brief — alternate angle' },
      { url: `${IMG}/seamless-brief-detail.jpg`, alt: 'Seamless High-Waist Brief — fabric detail' },
    ],
    shortDescription: 'Laser-cut second-skin microfibre with a smoothing high rise.',
    description:
      'Engineered from laser-cut second-skin microfibre, this high-waist brief smooths the silhouette with zero visible lines. The seamless construction moves with you — invisible under tailoring, weightless through the day.',
    badges: ['New Arrival'],
    tags: ['new arrival', 'premium', 'seamless', 'high-waist', 'microfibre', 'women'],
    care: [
      'Hand wash cold or gentle machine cycle in a wash bag',
      'Do not bleach, wring or tumble dry',
      'Lay flat to dry away from direct sunlight',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },
  {
    name: 'HUSHAE Silk-Touch Longline Camisole',
    slug: 'silk-touch-longline-camisole',
    sku: 'W-CAM-003',
    gender: 'women',
    categorySlug: 'camisoles-slips',
    tier: 'Premium',
    price: 3200,
    compareAtPrice: 4000,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Soft Ivory', hex: '#FAF8F5', image: `${IMG}/silk-cami-front.jpg` },
      { name: 'Onyx Black', hex: '#111111', image: `${IMG}/silk-cami-front.jpg` },
    ],
    fabric: '100% Breathable Silk-Touch Viscose',
    images: [
      { url: `${IMG}/silk-cami-front.jpg`, alt: 'Silk-Touch Longline Camisole — front view' },
      { url: `${IMG}/silk-cami-back.jpg`, alt: 'Silk-Touch Longline Camisole — alternate angle' },
      { url: `${IMG}/silk-cami-detail.jpg`, alt: 'Silk-Touch Longline Camisole — fabric detail' },
    ],
    shortDescription: 'A fluid silk-touch camisole that layers or stands alone.',
    description:
      'Cut long and cut clean, this camisole drapes in 100% breathable silk-touch viscose. The fluid fall skims rather than clings — elegant alone, effortless under a blazer, cool against the skin from first wear.',
    badges: ['New Arrival', 'Silk-Touch'],
    tags: ['new arrival', 'premium', 'camisole', 'silk-touch', 'viscose', 'women'],
    care: [
      'Hand wash cold or gentle machine cycle in a wash bag',
      'Do not bleach, wring or tumble dry',
      'Lay flat to dry away from direct sunlight',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },

  /* ── MEN'S ────────────────────────────────────────────────────────────── */
  {
    name: 'HUSHAE Signature Micro-Modal Trunk',
    slug: 'signature-micro-modal-trunk',
    sku: 'M-TRK-001',
    gender: 'men',
    categorySlug: 'trunks',
    tier: 'Premium',
    price: 1950,
    compareAtPrice: 2450,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Jet Black', hex: '#111111', image: `${IMG}/modal-trunk-front.jpg` },
      { name: 'Slate Grey', hex: '#687280', image: `${IMG}/modal-trunk-front.jpg` },
      { name: 'Deep Navy', hex: '#1C2536', image: `${IMG}/modal-trunk-front.jpg` },
    ],
    fabric: '95% Lenzing Modal · 5% Spandex',
    images: [
      { url: `${IMG}/modal-trunk-front.jpg`, alt: 'Signature Micro-Modal Trunk — front view' },
      { url: `${IMG}/modal-trunk-back.jpg`, alt: 'Signature Micro-Modal Trunk — alternate angle' },
      { url: `${IMG}/modal-trunk-detail.jpg`, alt: 'Signature Micro-Modal Trunk — fabric detail' },
    ],
    shortDescription: '95% Lenzing modal with a no-ride waistband that stays put.',
    description:
      'Our signature trunk in 95% Lenzing modal and 5% spandex. The no-ride waistband keeps everything in place without compression, while the modal hand-feel stays cool and dry from first wear to last.',
    badges: ['New Arrival'],
    tags: ['new arrival', 'premium', 'trunk', 'micro-modal', 'no-ride', 'men'],
    care: [
      'Machine wash cold with like colours',
      'Use a gentle detergent; avoid bleach',
      'Line dry in shade to protect elasticity',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },
  {
    name: 'HUSHAE Airlite Cotton Ribbed Boxer',
    slug: 'airlite-cotton-ribbed-boxer',
    sku: 'M-BOX-002',
    gender: 'men',
    categorySlug: 'boxers',
    tier: 'Premium',
    price: 1850,
    compareAtPrice: 2250,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Classic White', hex: '#F8F8F8', image: `${IMG}/airlite-boxer-front.jpg` },
      { name: 'Heather Grey', hex: '#A8A8A8', image: `${IMG}/airlite-boxer-front.jpg` },
      { name: 'Dark Charcoal', hex: '#222222', image: `${IMG}/airlite-boxer-front.jpg` },
    ],
    fabric: '100% Combed Pakistani Cotton',
    images: [
      { url: `${IMG}/airlite-boxer-front.jpg`, alt: 'Airlite Cotton Ribbed Boxer — front view' },
      { url: `${IMG}/airlite-boxer-back.jpg`, alt: 'Airlite Cotton Ribbed Boxer — alternate angle' },
      { url: `${IMG}/airlite-boxer-detail.jpg`, alt: 'Airlite Cotton Ribbed Boxer — fabric detail' },
    ],
    shortDescription: 'Ribbed 100% combed cotton that breathes all day.',
    description:
      'Airlite is our lightest boxer yet — 100% combed Pakistani cotton with a fine ribbed structure that wicks and breathes. A relaxed fit that holds its shape wash after wash, cool through the warmest days.',
    badges: ['New Arrival'],
    tags: ['new arrival', 'premium', 'boxer', 'combed cotton', 'ribbed', 'men'],
    care: [
      'Machine wash cold with like colours',
      'Use a gentle detergent; avoid bleach',
      'Line dry in shade to protect elasticity',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },
  {
    name: 'HUSHAE Tailored Ribbed Undershirt',
    slug: 'tailored-ribbed-undershirt',
    sku: 'M-VST-003',
    gender: 'men',
    categorySlug: 'vests-undershirts',
    tier: 'Premium',
    price: 2100,
    compareAtPrice: 2600,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Pure White', hex: '#FFFFFF', image: `${IMG}/ribbed-vest-front.jpg` },
      { name: 'Deep Black', hex: '#111111', image: `${IMG}/ribbed-vest-front.jpg` },
    ],
    fabric: '2x2 Fine Rib Cotton Stretch',
    images: [
      { url: `${IMG}/ribbed-vest-front.jpg`, alt: 'Tailored Ribbed Undershirt — front view' },
      { url: `${IMG}/ribbed-vest-back.jpg`, alt: 'Tailored Ribbed Undershirt — alternate angle' },
      { url: `${IMG}/ribbed-vest-detail.jpg`, alt: 'Tailored Ribbed Undershirt — fabric detail' },
    ],
    shortDescription: '2x2 fine rib cotton stretch, tailored to sit cleanly.',
    description:
      'The tailored undershirt in 2x2 fine rib cotton with just enough stretch. It sits cleanly under shirts without bulk — a crisp, quiet layer for the working wardrobe that stays in place all day.',
    badges: ['New Arrival'],
    tags: ['new arrival', 'premium', 'undershirt', 'ribbed', 'cotton', 'men'],
    care: [
      'Machine wash cold with like colours',
      'Use a gentle detergent; avoid bleach',
      'Line dry in shade to protect elasticity',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },

  /* ── LOUNGE & SLEEPWEAR ───────────────────────────────────────────────── */
  {
    name: 'HUSHAE Cloud-Knit Relaxed Kimono Robe',
    slug: 'cloud-knit-relaxed-kimono-robe',
    sku: 'L-ROB-001',
    gender: 'women',
    categorySlug: 'sleepwear-loungewear',
    tier: 'Premium',
    price: 6450,
    compareAtPrice: 7800,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['S/M', 'L/XL'],
    colors: [
      { name: 'Warm Oatmeal', hex: '#D7CEBF', image: `${IMG}/kimono-robe-front.jpg` },
      { name: 'Midnight Ink', hex: '#141416', image: `${IMG}/kimono-robe-front.jpg` },
    ],
    fabric: 'Double-Brushed Cloud Cotton',
    images: [
      { url: `${IMG}/kimono-robe-front.jpg`, alt: 'Cloud-Knit Relaxed Kimono Robe — front view' },
      { url: `${IMG}/kimono-robe-back.jpg`, alt: 'Cloud-Knit Relaxed Kimono Robe — alternate angle' },
      { url: `${IMG}/kimono-robe-detail.jpg`, alt: 'Cloud-Knit Relaxed Kimono Robe — fabric detail' },
    ],
    shortDescription: 'Double-brushed cloud cotton in a relaxed kimono cut.',
    description:
      'Wrapped in double-brushed cloud cotton, the relaxed kimono robe is our softest layer. A loose, fluid cut with a deep collar and generous sleeves — made for slow mornings, cool evenings and everything in between.',
    badges: ['New Arrival'],
    tags: ['new arrival', 'premium', 'robe', 'kimono', 'loungewear', 'cloud cotton'],
    care: [
      'Machine wash cold with like colours',
      'Use a gentle detergent; avoid bleach',
      'Line dry in shade to protect elasticity',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },
  {
    name: 'HUSHAE Essential Lounge Trouser',
    slug: 'essential-lounge-trouser',
    sku: 'L-TRS-002',
    gender: 'women',
    categorySlug: 'sleepwear-loungewear',
    tier: 'Premium',
    price: 3850,
    compareAtPrice: 4600,
    onSale: false,
    saleStart: null,
    saleEnd: null,
    stock: 30,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Heather Grey', hex: '#999999', image: `${IMG}/lounge-trouser-front.jpg` },
      { name: 'Black', hex: '#111111', image: `${IMG}/lounge-trouser-front.jpg` },
    ],
    fabric: 'French Terry Modal Blend',
    images: [
      { url: `${IMG}/lounge-trouser-front.jpg`, alt: 'Essential Lounge Trouser — front view' },
      { url: `${IMG}/lounge-trouser-back.jpg`, alt: 'Essential Lounge Trouser — alternate angle' },
      { url: `${IMG}/lounge-trouser-detail.jpg`, alt: 'Essential Lounge Trouser — fabric detail' },
    ],
    shortDescription: 'French terry modal blend with a clean, easy drape.',
    description:
      'The essential lounge trouser in a French terry modal blend — soft on the inside, clean on the outside. An elasticated waist and relaxed leg that dress up with a shirt or down with a tee, without losing their line.',
    badges: ['New Arrival'],
    tags: ['new arrival', 'premium', 'lounge trouser', 'french terry', 'modal', 'women'],
    care: [
      'Machine wash cold with like colours',
      'Use a gentle detergent; avoid bleach',
      'Line dry in shade to protect elasticity',
    ],
    ratingAvg: 4.8,
    ratingCount: 0,
    isNewArrival: true,
    isBestSeller: false,
    isFeatured: false,
    isActive: true,
    status: 'active',
  },
];

/* ── Idempotent upsert by SKU ────────────────────────────────────────────── */
async function upsertNewArrivals(log = console.log) {
  const bySlug = {};
  const slugs = [...new Set(NEW_ARRIVALS.map((p) => p.categorySlug))];
  const cats = await Category.find({ slug: { $in: slugs } });
  for (const c of cats) bySlug[c.slug] = c._id;
  const missing = slugs.filter((s) => !bySlug[s]);
  if (missing.length) throw new Error(`Missing categories: ${missing.join(', ')}`);

  let created = 0;
  let updated = 0;
  const existing = await Product.find({ sku: { $in: NEW_ARRIVALS.map((p) => p.sku) } }, { sku: 1 });
  const existingSkus = new Set(existing.map((d) => d.sku));
  for (const p of NEW_ARRIVALS) {
    const doc = { ...p, category: bySlug[p.categorySlug] };
    const wasNew = !existingSkus.has(p.sku);
    await Product.findOneAndUpdate({ sku: p.sku }, { $set: doc }, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });
    if (wasNew) created += 1; else updated += 1;
    log(`[seed:newarrivals] ${wasNew ? 'CREATED' : 'UPDATED '} ${p.sku} — ${p.slug}`);
  }
  log(`[seed:newarrivals] done — ${created} created, ${updated} updated (${NEW_ARRIVALS.length} total)`);
  return { created, updated, total: NEW_ARRIVALS.length };
}

/* ── CLI entry ───────────────────────────────────────────────────────────── */
async function main() {
  const uri = config.mongoUri;
  if (!uri) {
    console.error('MONGODB_URI is empty. Set it in backend/.env or the environment and re-run.');
    process.exit(1);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  try {
    await upsertNewArrivals();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[seed:newarrivals] FAILED:', e.message);
    process.exit(1);
  });
}

module.exports = { NEW_ARRIVALS, upsertNewArrivals };
