const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { buildCatalog } = require('./catalog');

const DEFAULT_TRUST = [
  { title: 'Discreet Packaging', text: 'Plain, unmarked parcels — always.' },
  { title: 'COD Available', text: 'Pay at your doorstep, Pakistan-wide.' },
  { title: 'Easy Exchange', text: '14-day size exchange, no questions.' },
  { title: 'Made in Pakistan', text: 'Crafted locally, finished internationally.' },
];

async function seedIfEmpty(log = console.log) {
  // Auto-seed is OPT-IN via env var. Prevents accidentally re-populating
  // production or your local DB with the demo catalog after you have
  // cleaned it or added your real products.
  if (String(process.env.SEED_ON_START || '').toLowerCase() !== 'true') {
    log('[seed] SEED_ON_START not set to "true" — skipping seed');
    return false;
  }

  const userCount = await User.estimatedDocumentCount();
  const productCount = await Product.estimatedDocumentCount();
  // Only seed if BOTH the users AND products collections are completely empty.
  // If a user or product already exists we assume the store is set up.
  if (userCount > 0 || productCount > 0) {
    log(`[seed] existing data (users=${userCount}, products=${productCount}) — skipping seed`);
    return false;
  }

  log('[seed] seeding database (first-time setup)...');
  // Do NOT deleteMany — we just verified everything is empty above.

  // Admin user
  await User.create({
    name: 'Hushae Admin', email: config.adminEmail, password: config.adminPassword, role: 'admin',
  });
  log(`[seed] admin created: ${config.adminEmail}`);

  // Settings
  await Settings.create({
    key: 'store',
    trustBadges: DEFAULT_TRUST,
    hero: {
      title: 'Second Skin,\nFirst Choice.',
      subtitle: 'Innerwear engineered in breathable, cloud-soft fabrics — designed in Pakistan, finished to an international standard.',
      ctaWomen: 'Shop Women', ctaMen: 'Shop Men',
      image: 'https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?auto=format&fit=crop&w=1600&q=80',
    },
  });

  // Categories + products
  const { categories, products } = buildCatalog();
  const catDocs = await Category.insertMany(categories);
  const idBySlug = Object.fromEntries(catDocs.map((c) => [c.slug, c._id]));

  const now = Date.now();
  const productDocs = products.map((p, i) => ({
    ...p,
    category: idBySlug[p.categorySlug],
    createdAt: new Date(now - (i % 30) * 24 * 3600 * 1000),
    updatedAt: new Date(now - (i % 30) * 24 * 3600 * 1000),
  }));
  await Product.insertMany(productDocs);
  log(`[seed] ${catDocs.length} categories, ${productDocs.length} products created`);
  return true;
}

async function connect(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

module.exports = { seedIfEmpty, connect };
