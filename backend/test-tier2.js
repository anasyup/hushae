/* Tier 2 functional test — Customer Groups (segments) + navigation settings path.
 * Verifies: group CRUD, live rule evaluation (spend/orders/city/tags/noOrders),
 * member counts, and that the settings PUT accepts header.menu/footer.columns
 * (the shape the Navigation builder saves). */
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'test-secret-123';
process.env.ADMIN_EMAIL = 'admin@test.pk';
process.env.ADMIN_PASSWORD = 'TestPass123';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mem = await MongoMemoryServer.create({ instance: { dbName: 'hushae-test' }, binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  const User = require('./src/models/User');
  const Order = require('./src/models/Order');
  const Settings = require('./src/models/Settings');

  // Admin + customers
  await User.create({ name: 'Admin', email: 'admin@test.pk', role: 'admin', password: 'TestPass123' });
  const mkCustomer = (name, email, phone, tags) => User.create({ name, email, phone, role: 'customer', tags, password: 'Customer123' });
  const vip = await mkCustomer('Vip Customer', 'vip@test.pk', '03001234501', ['VIP', 'Lahore']);
  const newbie = await mkCustomer('New Customer', 'new@test.pk', '03001234502', []);
  const never = await mkCustomer('Never Bought', 'never@test.pk', '03001234503', []);
  await User.create({ name: 'Staff', email: 'staff@test.pk', role: 'Staff', password: 'TestPass123' });

  // Orders — VIP has 3 orders (8,000 spend), newbie has 1 (500), never has 0.
  const mkOrder = (phone, total, daysAgo, city = 'Lahore') => Order.create({
    orderNumber: `HS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    customerInfo: { name: phone, phone, address: 'A', city, province: 'Punjab', postalCode: '54000' },
    items: [{ product: new mongoose.Types.ObjectId(), name: 'X', price: total, quantity: 1, lineTotal: total }],
    subtotal: total, total, paymentMethod: 'COD', status: 'Delivered',
    createdAt: new Date(Date.now() - daysAgo * 86400000),
  });
  await mkOrder('03001234501', 3000, 40);
  await mkOrder('03001234501', 2500, 20);
  await mkOrder('03001234501', 2500, 5);
  await mkOrder('03001234502', 500, 2);

  await Settings.create({ key: 'store' });

  const app = require('./src/app');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const j = (r) => r.json();

  let pass = 0, fail = 0;
  const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name} ${extra}`); }
  };

  // ── Login ──
  let r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.pk', password: 'TestPass123' }) });
  let d = await j(r);
  const token = d.token;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  check('Admin login', !!token);

  // ── Create group: VIP (spend ≥ 2000, min 2 orders) ──
  r = await fetch(`${base}/api/customer-groups`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'VIP', rules: { minSpend: 2000, minOrders: 2 } }) });
  d = await j(r);
  check('Create group → 201', r.status === 201 && d.group?.name === 'VIP');
  const vipGroupId = d.group?._id;

  r = await fetch(`${base}/api/customer-groups/${vipGroupId}/members`, { headers: H });
  d = await j(r);
  check('VIP group → 1 member (Vip Customer)', d.total === 1 && d.members[0]?.email === 'vip@test.pk', JSON.stringify(d.members?.map((m) => m.email)));

  // ── Group: recent buyers (last 10 days) → VIP (last order 5d ago) + newbie (2d ago) ──
  r = await fetch(`${base}/api/customer-groups`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Recent', rules: { lastOrderDays: 10 } }) });
  d = await j(r);
  r = await fetch(`${base}/api/customer-groups/${d.group._id}/members`, { headers: H });
  d = await j(r);
  check('Recent group → VIP + newbie (both ordered within 10 days)', d.total === 2, `total=${d.total} emails=${d.members?.map((m) => m.email).join(',')}`);

  // ── Group: never ordered → Never Bought ──
  r = await fetch(`${base}/api/customer-groups`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Win back', rules: { noOrders: true } }) });
  d = await j(r);
  r = await fetch(`${base}/api/customer-groups/${d.group._id}/members`, { headers: H });
  d = await j(r);
  check('No-orders group → Never Bought', d.total === 1 && d.members[0]?.email === 'never@test.pk');

  // ── Group: tag VIP → Vip Customer (tag rule works) ──
  r = await fetch(`${base}/api/customer-groups`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Tagged', rules: { anyTag: ['VIP'] } }) });
  d = await j(r);
  r = await fetch(`${base}/api/customer-groups/${d.group._id}/members`, { headers: H });
  d = await j(r);
  check('Tag rule → Vip Customer', d.total === 1 && d.members[0]?.email === 'vip@test.pk');

  // ── Group: city Lahore → all 3 customers with orders? (registered only) ──
  r = await fetch(`${base}/api/customer-groups`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Lahore', rules: { city: 'Lahore' } }) });
  d = await j(r);
  r = await fetch(`${base}/api/customer-groups/${d.group._id}/members`, { headers: H });
  d = await j(r);
  check('City rule → 2 (vip + newbie have orders; never has no city)', d.total === 2, `total=${d.total}`);

  // ── Preview endpoint (no save) ──
  r = await fetch(`${base}/api/customer-groups/preview?rules=${encodeURIComponent(JSON.stringify({ minOrders: 3 }))}`, { headers: H });
  d = await j(r);
  check('Preview endpoint → VIP only', d.total === 1 && d.members[0]?.email === 'vip@test.pk');

  // ── Update group (rename + new rules) ──
  r = await fetch(`${base}/api/customer-groups/${vipGroupId}`, { method: 'PUT', headers: H, body: JSON.stringify({ name: 'Super VIP', rules: { minSpend: 5000 } }) });
  d = await j(r);
  check('Update group → renamed', d.group?.name === 'Super VIP');
  r = await fetch(`${base}/api/customer-groups/${vipGroupId}/members`, { headers: H });
  d = await j(r);
  check('Updated rules → still VIP only (spend 8000 ≥ 5000)', d.total === 1 && d.members[0]?.email === 'vip@test.pk');

  // ── List groups (5 created: VIP, Recent, Win back, Tagged, Lahore) ──
  r = await fetch(`${base}/api/customer-groups`, { headers: H });
  d = await j(r);
  check('List groups → 5', d.groups?.length === 5, d.groups?.length);

  // ── Delete group ──
  r = await fetch(`${base}/api/customer-groups/${vipGroupId}`, { method: 'DELETE', headers: H });
  check('Delete group → ok', r.status === 200);

  // ── Unauthenticated → 401 ──
  r = await fetch(`${base}/api/customer-groups`);
  check('Unauth → 401/403', r.status === 401 || r.status === 403, r.status);

  // ── Navigation save path: PUT /settings with header.menu + footer.columns ──
  r = await fetch(`${base}/api/settings`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({
      header: { menu: [{ label: 'Women', href: '/women', dropdown: 'women', highlight: false }, { label: 'Sale', href: '/sale', dropdown: '', highlight: true }] },
      footer: { columns: [{ title: 'Shop', links: [{ label: 'Women', href: '/women' }, { label: 'Men', href: '/men' }] }] },
    }),
  });
  check('Settings PUT (navigation shape) → 200', r.status === 200, r.status);
  r = await fetch(`${base}/api/settings/admin`, { headers: H });
  d = await j(r);
  const s = d.settings || {};
  check('Header menu saved', Array.isArray(s.header?.menu) && s.header.menu.length === 2 && s.header.menu[1].highlight === true);
  check('Footer columns saved', Array.isArray(s.footer?.columns) && s.footer.columns[0]?.links?.length === 2);

  server.close();
  await mongoose.disconnect();
  await mem.stop();

  console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH:', e); process.exit(2); });
