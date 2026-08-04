/* Tier 1 functional test — runs against an in-process Express app + memory Mongo.
 * Verifies: Blog CRUD (public + admin) and Draft Order creation. */
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'test-secret-123';
process.env.ADMIN_EMAIL = 'admin@test.pk';
process.env.ADMIN_PASSWORD = 'TestPass123';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mem = await MongoMemoryServer.create({ instance: { dbName: 'hushae-test' }, binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  // Admin user — model's pre-save hook hashes the password, so pass plain text
  const User = require('./src/models/User');
  await User.create({
    name: 'Test Admin', email: 'admin@test.pk', role: 'admin',
    password: 'TestPass123',
  });

  // Products for the draft order test
  const Product = require('./src/models/Product');
  const Category = require('./src/models/Category');
  const cat = await Category.create({ name: 'Briefs', slug: 'briefs', gender: 'men' });
  const prod = await Product.create({
    name: 'Test Brief', slug: 'test-brief', sku: 'TST-001', gender: 'men',
    category: cat._id, categorySlug: 'briefs', tier: 'Standard',
    price: 500, compareAtPrice: 1000,
    costPrice: 200, stock: 50, isActive: true, status: 'active',
    sizes: ['S', 'M', 'L'], colors: [{ name: 'Black', hex: '#000000' }],
    images: [{ url: '/api/uploads/xyz', alt: 'test' }],
  });

  // Settings
  const Settings = require('./src/models/Settings');
  await Settings.create({ key: 'store', shippingFlatRate: 250, freeShippingThreshold: 3000 });

  const app = require('./src/app');
  const server = app.listen(0);

  const base = `http://127.0.0.1:${server.address().port}`;
  const j = (r) => r.json();
  let pass = 0, fail = 0;
  const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name} ${extra}`); }
  };

  // ── 1. Public blog: empty list ──
  let r = await fetch(`${base}/api/blog`);
  let d = await j(r);
  check('GET /api/blog → 200, empty', r.status === 200 && Array.isArray(d.posts) && d.posts.length === 0);

  // ── 2. Public blog: 404 on missing slug ──
  r = await fetch(`${base}/api/blog/nope`);
  check('GET /api/blog/nope → 404', r.status === 404);

  // ── 3. Admin login ──
  r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.pk', password: 'TestPass123' }) });
  d = await j(r);
  const token = d.token;
  check('Admin login → token', !!token, JSON.stringify(d).slice(0, 120));
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ── 4. Admin create blog post ──
  r = await fetch(`${base}/api/blog/admin`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'How to find your size', content: '# Hello\n\n**bold** text\n\n- one\n- two', status: 'published', author: 'Test' }) });
  d = await j(r);
  const postId = d.post?._id;
  const slug = d.post?.slug;
  check('POST /api/blog/admin → 201 + slug autogen', r.status === 201 && postId && slug === 'how-to-find-your-size', JSON.stringify(d).slice(0, 150));

  // ── 5. Public list now shows it ──
  r = await fetch(`${base}/api/blog`);
  d = await j(r);
  check('GET /api/blog → 1 post', d.posts.length === 1 && d.posts[0].slug === slug);

  // ── 6. Public read post ──
  r = await fetch(`${base}/api/blog/${slug}`);
  d = await j(r);
  check('GET /api/blog/:slug → post', r.status === 200 && d.post.title === 'How to find your size');

  // ── 7. Draft blog is hidden from public ──
  r = await fetch(`${base}/api/blog/admin`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'Secret Draft', status: 'draft' }) });
  d = await j(r);
  const draftSlug = d.post.slug;
  r = await fetch(`${base}/api/blog/${draftSlug}`);
  check('Draft post → public 404', r.status === 404);

  // ── 8. Draft visible with preview token ──
  r = await fetch(`${base}/api/blog/${draftSlug}?preview=${token}`);
  check('Draft post → preview token shows', r.status === 200);

  // ── 9. Admin update post ──
  r = await fetch(`${base}/api/blog/admin/${postId}`, { method: 'PUT', headers: H, body: JSON.stringify({ excerpt: 'A short summary' }) });
  d = await j(r);
  check('PUT /api/blog/admin/:id → excerpt saved', d.post.excerpt === 'A short summary');

  // ── 10. Slug collision → 409 ──
  r = await fetch(`${base}/api/blog/admin`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'How to find your size' }) });
  check('Duplicate slug → 409', r.status === 409);

  // ── 11. Sitemap includes blog (checked BEFORE delete so a post is live) ──
  r = await fetch(`${base}/sitemap.xml`);
  const xml = await r.text();
  check('sitemap 200 + contains /blog/', r.status === 200 && xml.includes('/blog/'), xml.slice(0, 80));

  // ── 12. Admin delete ──
  r = await fetch(`${base}/api/blog/admin/${postId}`, { method: 'DELETE', headers: H });
  check('DELETE → ok', r.status === 200);

  // ── 13. Draft order (admin creates) ──
  r = await fetch(`${base}/api/orders/manage`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      customerInfo: { name: 'Ali', phone: '03001234567', address: 'House 1, St 2', city: 'Lahore', province: 'Punjab', postalCode: '54000' },
      items: [{ product: String(prod._id), size: 'M', quantity: 2 }],
      paymentMethod: 'COD',
      manualDiscount: 100,
    }),
  });
  d = await j(r);
  check('POST /api/orders/manage → 201', r.status === 201, JSON.stringify(d).slice(0, 200));
  const order = d.order;
  check('Order number HS- prefix', /^HS-/.test(order.orderNumber || ''), order.orderNumber);
  check('Order source = admin', order.source === 'admin');
  check('Subtotal = 2 × 500 = 1000', order.subtotal === 1000, order.subtotal);
  check('Discount = 100', order.discount === 100);
  // The store's default "standard" shipping method has rate 0 = free, and the
  // public checkout computes the SAME 0 — the two must never disagree.
  check('Shipping = 0 (standard method is free at rate 0)', order.shippingCharge === 0, order.shippingCharge);
  check('Total = 1000 - 100 = 900', order.total === 900, order.total);
  check('Stock decremented 50→48', (await Product.findById(prod._id)).stock === 48);

  // ── 14. Draft order with bad phone → 400 ──
  r = await fetch(`${base}/api/orders/manage`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      customerInfo: { name: 'X', phone: '123', address: 'A', city: 'Lahore', province: 'Punjab', postalCode: '54000' },
      items: [{ product: String(prod._id), quantity: 1 }], paymentMethod: 'COD',
    }),
  });
  check('Bad phone → 400', r.status === 400);

  // ── 15. Unauthenticated blog admin → 401 ──
  r = await fetch(`${base}/api/blog/admin`);
  check('Unauth admin blog → 401/403', r.status === 401 || r.status === 403, r.status);

  server.close();
  await mongoose.disconnect();
  await mem.stop();

  console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH:', e); process.exit(2); });
