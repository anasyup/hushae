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
  const userCount = await User.estimatedDocumentCount();
  const productCount = await Product.estimatedDocumentCount();
  if (productCount >= 100 && userCount >= 1) {
    log('[seed] database already seeded — skipping');
    return false;
  }

  log('[seed] seeding database...');
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Settings.deleteMany({})]);

  // Admin user
  await User.create({
    name: 'Veloura Admin', email: config.adminEmail, password: config.adminPassword, role: 'admin',
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
