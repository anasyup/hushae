/* Seed demo reviews for the pre-launch storefront.
 * The public review API is "buyers only" (requires order verification), so for
 * a demo store we insert approved reviews directly. Each carries verified:false
 * and status:'approved' so the storefront shows them like a live store.
 * Product ratingAvg/ratingCount are recalculated exactly like routes/reviews.js.
 * Usage: MONGODB_URI=your-uri node seed-demo-reviews.js */
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }

const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Review = require('./src/models/Review');

const REVIEWS = [
  // rating, title, body
  [5, 'Perfect fit, soft fabric', 'Used the fit finder and the size was spot on. Fabric is genuinely soft and the stitching is clean. Packaging was completely discreet.'],
  [5, 'Better than imported brands', 'I usually buy imported innerwear but this is softer and holds shape better after a few washes. Genuinely impressed.'],
  [4, 'Very comfortable', 'Comfortable for all-day wear, size runs true. Slightly expensive but quality justifies it.'],
  [4, 'Good quality, fast delivery', 'Ordered on Monday, delivered Wednesday. Quality is great for the price.'],
  [5, 'The fabric is incredible', 'You can feel the quality the moment you touch it. Washed three times already, no pilling, no fading.'],
  [5, 'Worth every rupee', 'Discreet packaging as promised, beautiful fabric, fits perfectly. Will definitely reorder.'],
  [4, 'Nice and breathable', 'Breathable in our heat, comfortable fit. Would recommend.'],
  [3, 'Good but size up', 'Quality is good but I would size up. Fabric is lovely though.'],
  [5, 'My third order from them', 'Third time ordering. Consistent quality every time — that is rare.'],
  [4, 'Soft and well made', 'Very soft, seams sit flat, no irritation. Happy with the purchase.'],
  [5, 'Excellent quality', 'Excellent stitching, true to size, arrived in plain packaging. Great experience.'],
  [4, 'Very happy', 'Really comfortable and the quality is premium. Delivery was quick too.'],
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('[db] connected');

  // Pick the popular products: featured/best-sellers first, then premium tier.
  const prods = await Product.find({ isActive: true, status: { $ne: 'draft' } })
    .sort({ isFeatured: -1, isBestSeller: -1, createdAt: -1 })
    .limit(14)
    .lean();
  console.log(`[products] ${prods.length} target products`);

  const NAMES = ['Ayesha K.', 'Bilal M.', 'Fatima S.', 'Hamza R.', 'Mahnoor A.', 'Usman T.', 'Zara H.', 'Ali Z.', 'Sana P.', 'Omar F.', 'Nimra J.', 'Daniyal S.'];

  let created = 0, skipped = 0;
  for (let i = 0; i < prods.length; i += 1) {
    const p = prods[i];
    const count = 3 + (i % 3); // 3-5 reviews per product
    for (let j = 0; j < count; j += 1) {
      const [rating, title, body] = REVIEWS[(i * 3 + j) % REVIEWS.length];
      const name = NAMES[(i * 5 + j * 7) % NAMES.length];
      // Skip if this exact review already exists (idempotent re-runs).
      const exists = await Review.findOne({ product: p._id, customerName: name, body: { $regex: body.slice(0, 40) } });
      if (exists) { skipped += 1; continue; }
      await Review.create({
        product: p._id,
        customerName: name,
        rating,
        title,
        body,
        status: 'approved',
        verified: false,
        featured: j === 0,
        createdAt: new Date(Date.now() - (j * 3 + i) * 86400000),
      });
      created += 1;
    }
  }

  // Recalculate product ratings exactly like routes/reviews.js recalcProduct.
  let recalced = 0;
  for (const p of prods) {
    const agg = await Review.aggregate([
      { $match: { product: p._id, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } },
    ]);
    const avg = agg[0]?.avg || 0;
    const cnt = agg[0]?.cnt || 0;
    await Product.findByIdAndUpdate(p._id, { ratingAvg: Math.round(avg * 10) / 10, ratingCount: cnt });
    recalced += 1;
  }

  console.log(`[done] created=${created} skipped=${skipped} recalced=${recalced}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error('SEED FAIL:', e.message); process.exit(1); });
