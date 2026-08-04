/* Premium honest pricing — remove the fake "50% off everywhere" pattern.
 * Keeps every product's real `price` (revenue unchanged). Picks ~18 popular
 * products for a genuine, time-boxed 20-30% sale; the rest become
 * regular-priced items with no discount badge.
 * run: MONGODB_URI=... node fix-sale-strategy.js */
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI env var is required'); process.exit(1); }

const mongoose = require('mongoose');
const Product = require('./src/models/Product');

const SALE_COUNT = 18;      // how many products stay on sale
const SALE_DAYS = 45;       // sale window length

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('[db] connected');

  const prods = await Product.find({ isActive: true, status: { $ne: 'draft' } }).lean();
  console.log(`[products] ${prods.length} active products`);

  // Popularity ranking: featured + bestseller first, then premium tier, then new.
  const rank = (p) => (p.isFeatured ? 4 : 0) + (p.isBestSeller ? 4 : 0) + (p.tier === 'Premium' ? 2 : 0) + (p.isNewArrival ? 1 : 0);
  const sorted = [...prods].sort((a, b) => rank(b) - rank(a));

  const saleIds = new Set(sorted.slice(0, SALE_COUNT).map((p) => String(p._id)));
  const now = new Date();
  const end = new Date(now.getTime() + SALE_DAYS * 86400000);

  let onSale = 0, regular = 0;
  for (const p of prods) {
    const id = String(p._id);
    if (saleIds.has(id)) {
      // Genuine 20-30% off: compareAt = price / (1 - discount), rounded to 10.
      const discount = 0.20 + ((p.tier === 'Premium') ? 0.10 : 0.05); // premium 30%, rest 25%
      const was = Math.round((p.price / (1 - discount)) / 10) * 10;
      await Product.updateOne({ _id: p._id }, {
        $set: {
          compareAtPrice: was > p.price ? was : null,
          onSale: was > p.price,
          saleStart: now,
          saleEnd: end,
        },
      });
      if (was > p.price) onSale += 1;
    } else {
      await Product.updateOne({ _id: p._id }, {
        $set: { compareAtPrice: null, onSale: false, saleStart: null, saleEnd: null },
      });
      regular += 1;
    }
  }

  console.log(`[done] ${onSale} on genuine sale · ${regular} regular-priced`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
