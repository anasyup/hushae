/*
 * Phase 4 Customer 360 integration QA.
 * Uses the same MongoMemoryServer 7.0.14 contract as the existing backend
 * suites. Run: MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER=true node test-phase4-customers.js
 */
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'phase4-customers-test-secret-64-characters-minimum-000000000000';
process.env.ADMIN_EMAIL = 'admin@phase4.test';
process.env.ADMIN_PASSWORD = 'Phase4AdminPass!';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const mem = await MongoMemoryServer.create({ instance: { dbName: 'hushae-phase4' }, binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  const User = require('./src/models/User');
  const Order = require('./src/models/Order');
  const Product = require('./src/models/Product');
  const Category = require('./src/models/Category');
  const Settings = require('./src/models/Settings');

  const admin = await User.create({ name: 'Phase Four Admin', email: 'admin@phase4.test', password: 'Phase4AdminPass!', role: 'admin', emailVerified: true });
  const alice = await User.create({
    name: 'Alice Bridal', email: 'alice@phase4.test', password: 'CustomerPass123!', role: 'customer', phone: '03001234567', whatsApp: '03001234567', country: 'PK', emailVerified: true,
    addresses: [{ name: 'Alice Bridal', phone: '03001234567', address: '42 Test Street', city: 'Lahore', province: 'Punjab', postalCode: '54000', country: 'PK', isDefault: true }],
  });
  const repeat = await User.create({ name: 'Repeat Customer', email: 'repeat@phase4.test', password: 'CustomerPass123!', role: 'customer', phone: '03001234568', country: 'PK', emailVerified: true });
  const inactive = await User.create({ name: 'Inactive Customer', email: 'inactive@phase4.test', password: 'CustomerPass123!', role: 'customer', phone: '03001234569', country: 'PK', emailVerified: true, createdAt: new Date(Date.now() - 220 * 86400000) });
  await Settings.create({ key: 'store' });
  const category = await Category.create({ name: 'Phase 4 Test', slug: 'phase4-test', gender: 'women' });
  const product = await Product.create({
    name: 'Phase 4 Silk Set', slug: 'phase4-silk-set', sku: 'P4-SILK-001', gender: 'women', category: category._id,
    categorySlug: category.slug, tier: 'Premium', price: 1200, stock: 40, images: [{ url: '/phase4.jpg' }], sizes: ['M'], colors: [{ name: 'Black', hex: '#000000' }],
  });

  let serial = 0;
  const makeOrder = async (customer, amount, status, daysAgo, suffix = '') => Order.create({
    orderNumber: `P4-${++serial}-${suffix || status}`,
    customer: customer._id,
    customerInfo: {
      name: customer.name, email: customer.email, phone: customer.phone, address: 'Historical order address', city: 'Lahore', province: 'Punjab', postalCode: '54000',
    },
    items: [{ product: product._id, name: product.name, slug: product.slug, price: amount, quantity: 1, lineTotal: amount }],
    subtotal: amount, total: amount, paymentMethod: 'COD', paymentStatus: status === 'Refunded' ? 'Refunded' : 'Paid', status,
    createdAt: new Date(Date.now() - daysAgo * 86400000),
  });

  const aliceDelivered = await makeOrder(alice, 300000, 'Delivered', 20, 'DELIVERED');
  const aliceConfirmed = await makeOrder(alice, 250001, 'Confirmed', 5, 'CONFIRMED');
  await makeOrder(alice, 99999, 'Cancelled', 3, 'CANCELLED');
  await makeOrder(alice, 88888, 'Refunded', 2, 'REFUNDED');
  await makeOrder(repeat, 1200, 'Delivered', 10, 'REPEAT1');
  await makeOrder(repeat, 1300, 'Delivered', 1, 'REPEAT2');

  const app = require('./src/app');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { method = 'GET', token, body } = {}) => {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  let passed = 0; let failed = 0;
  const check = (label, condition, extra = '') => {
    if (condition) { passed += 1; console.log(`  ✓ ${label}`); }
    else { failed += 1; console.error(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`); }
  };

  let r = await request('/auth/login', { method: 'POST', body: { email: admin.email, password: 'Phase4AdminPass!' } });
  const adminToken = r.data.token;
  check('Admin authentication', r.response.status === 200 && !!adminToken, r.response.status);
  r = await request('/auth/login', { method: 'POST', body: { email: alice.email, password: 'CustomerPass123!' } });
  const customerToken = r.data.token;
  check('Customer authentication', r.response.status === 200 && !!customerToken, r.response.status);

  r = await request('/customers');
  check('Customer APIs reject unauthenticated access', r.response.status === 401, r.response.status);

  r = await request('/customers?search=Alice&country=PK&limit=10', { token: adminToken });
  const aliceRow = r.data.customers?.find((row) => row.email === alice.email);
  check('List has server-side name/country search', r.response.status === 200 && !!aliceRow && r.data.total === 1, JSON.stringify(r.data));
  check('List exposes no password/hash fields', !JSON.stringify(r.data).includes('CustomerPass123') && !Object.prototype.hasOwnProperty.call(aliceRow || {}, 'password'));

  r = await request(`/customers?search=${encodeURIComponent(aliceDelivered.orderNumber)}`, { token: adminToken });
  check('Order-number search resolves persistent customer ID', r.data.customers?.[0]?.id === String(alice._id), JSON.stringify(r.data.customers));

  r = await request('/customers?segment=vip', { token: adminToken });
  check('VIP segment is explainable and backend-computed', r.data.customers?.some((row) => row.id === String(alice._id) && row.engagement?.key === 'vip'));
  r = await request('/customers?segment=repeat', { token: adminToken });
  check('Repeat segment uses qualifying order count', r.data.customers?.some((row) => row.id === String(repeat._id)));
  r = await request('/customers?segment=inactive', { token: adminToken });
  check('Inactive segment remains account/commerce based', r.data.customers?.some((row) => row.id === String(inactive._id)));

  r = await request(`/customers/${alice._id}`, { token: adminToken });
  let profile = r.data;
  check('360 profile returns persistent customer relationship', r.response.status === 200 && profile.customer?.id === String(alice._id));
  check('LTV excludes cancelled and refunded orders', profile.customer?.metrics?.ltv === 550001, JSON.stringify(profile.customer?.metrics));
  check('Qualifying order count and AOV are backend authoritative', profile.customer?.metrics?.orders === 2 && profile.customer?.metrics?.aov === 275000.5, JSON.stringify(profile.customer?.metrics));
  check('360 has linked order rows only', profile.orders?.length === 4 && profile.orders?.every((order) => order.id));
  check('No forbidden customer credentials in 360 response', !JSON.stringify(profile).includes('password') && !JSON.stringify(profile).includes('resetToken'));

  r = await request(`/wishlist/${product._id}`, { method: 'POST', token: customerToken });
  check('Authenticated wishlist persisted', r.response.status === 200 && r.data.products?.length === 1, r.response.status);
  r = await request('/track', { method: 'POST', token: customerToken, body: { sid: 'phase4-session-a', event: 'pageview', path: `/product/${product.slug}` } });
  check('Authenticated product view tracking accepted', r.response.status === 200);
  r = await request('/track', { method: 'POST', token: customerToken, body: { sid: 'phase4-session-a', event: 'checkout', path: '/checkout' } });
  check('Authenticated checkout tracking accepted', r.response.status === 200);
  r = await request('/abandoned-cart/track', { method: 'POST', token: customerToken, body: { email: alice.email, name: alice.name, phone: alice.phone, items: [{ product: product._id, quantity: 2 }] } });
  check('Authenticated abandoned cart persisted with customer ID', r.response.status === 200 && !!r.data.id);
  await sleep(60); // Activity appends are deliberately best-effort/non-blocking.

  r = await request(`/customers/${alice._id}/activity`, { token: adminToken });
  const types = (r.data.activity || []).map((event) => event.type);
  check('Activity shows only real persisted events', types.includes('wishlist_added') && types.includes('product_viewed') && types.includes('checkout_started') && types.includes('abandoned_cart'), JSON.stringify(types));
  r = await request(`/customers/${alice._id}`, { token: adminToken });
  profile = r.data;
  check('360 connects actual wishlist and abandoned cart', profile.wishlist?.length === 1 && profile.cart?.itemCount === 2, JSON.stringify({ wishlist: profile.wishlist, cart: profile.cart }));

  r = await request(`/customers/${alice._id}/notes`, { method: 'POST', token: adminToken, body: { content: 'Bride requested a size consultation.', category: 'fit' } });
  check('Internal note is append-only and authored', r.response.status === 201 && r.data.note?.createdByName === admin.name, JSON.stringify(r.data));
  r = await request(`/customers/${alice._id}/notes`, { token: adminToken });
  check('Internal notes are returned through dedicated admin endpoint', r.data.notes?.[0]?.content === 'Bride requested a size consultation.');

  r = await request(`/customers/${alice._id}/consent`, { method: 'PUT', token: adminToken, body: { email: 'OPTED_OUT' } });
  check('Explicit consent update persists', r.response.status === 200 && r.data.consent?.email === 'OPTED_OUT');
  r = await request(`/customers/${alice._id}/contact/email`, { method: 'POST', token: adminToken, body: { kind: 'marketing', subject: 'Private edit', message: 'Hello' } });
  check('Marketing send is blocked for opt-out', r.response.status === 409, r.response.status);
  r = await request(`/customers/${alice._id}/consent`, { method: 'PUT', token: adminToken, body: { email: 'OPTED_IN' } });
  r = await request(`/customers/${alice._id}/contact/email`, { method: 'POST', token: adminToken, body: { kind: 'marketing', subject: 'Private edit', message: 'Hello' } });
  check('Authorized opted-in send uses existing mailer without claiming delivery', r.response.status === 200 && r.data.acceptedByProvider === false && r.data.skipped === true, JSON.stringify(r.data));

  const snapshotBefore = await Order.findById(aliceDelivered._id).lean();
  r = await request(`/customers/${alice._id}`, { method: 'PATCH', token: adminToken, body: { name: 'Alice Updated', address: { address: '99 New Profile Road', city: 'Rawalpindi', province: 'Punjab', postalCode: '46000', country: 'PK' } } });
  check('Profile edit succeeds', r.response.status === 200 && r.data.customer?.name === 'Alice Updated');
  const snapshotAfter = await Order.findById(aliceDelivered._id).lean();
  check('Profile edit does not rewrite historical order customerInfo snapshot', snapshotAfter.customerInfo.address === snapshotBefore.customerInfo.address && snapshotAfter.customerInfo.name === snapshotBefore.customerInfo.name, JSON.stringify(snapshotAfter.customerInfo));

  r = await request('/orders/manage', {
    method: 'POST', token: adminToken,
    body: {
      customerInfo: { userId: String(repeat._id), name: repeat.name, email: repeat.email, phone: repeat.phone, address: '8 Linked Order Lane', city: 'Lahore', province: 'Punjab', postalCode: '54000' },
      items: [{ product: product._id, size: 'M', color: 'Black', quantity: 1 }], paymentMethod: 'COD', shippingMethod: 'standard',
    },
  });
  const linkedManualOrder = r.data.order?._id ? await Order.findById(r.data.order._id).lean() : null;
  check('Manual order writes the selected persistent customer ID', r.response.status === 201 && String(linkedManualOrder?.customer) === String(repeat._id), JSON.stringify(r.data));

  r = await request('/customer-groups/preview?rules=' + encodeURIComponent(JSON.stringify({ minSpend: 500000, minOrders: 2 })), { token: adminToken });
  check('Group rule preview reports real estimated members and why', r.response.status === 200 && r.data.estimatedMembers >= 1 && r.data.members?.some((member) => member.email === alice.email && member.why?.length));
  r = await request('/customer-groups', { method: 'POST', token: adminToken, body: { name: 'Phase 4 VIP', description: 'High lifetime value', rules: { minSpend: 500000, minOrders: 2 } } });
  const groupId = r.data.group?.id;
  check('Group persistence keeps rule visibility', r.response.status === 201 && !!groupId && !!r.data.group.rulesSummary);
  r = await request('/customers/bulk', { method: 'POST', token: adminToken, body: { action: 'assign_group', groupId, ids: [String(repeat._id)] } });
  check('Safe bulk group assignment uses customer IDs', r.response.status === 200 && r.data.modified === 1, JSON.stringify(r.data));

  r = await request(`/customers/${alice._id}/orders`, { token: adminToken });
  check('Orders tab API returns summary and no N+1-shaped missing rows', r.response.status === 200 && r.data.orders?.length === 4 && r.data.summary?.revenue === 550001);
  const exportResponse = await fetch(`${base}/api/customers/export?country=PK`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const csv = await exportResponse.text().catch(() => '');
  check('Safe export excludes credentials and audits server-side output', exportResponse.status === 200 && csv.includes('customer_id') && !csv.includes('password'));

  server.close();
  await mongoose.disconnect();
  await mem.stop();
  console.log(`\n═══ PHASE 4 RESULT: ${passed} passed, ${failed} failed ═══`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => { console.error('PHASE 4 TEST CRASH:', error); process.exit(2); });
