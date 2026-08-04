/* Tier 2.5 functional test — Email campaigns + customer tags.
 * Verifies: campaign recipient resolution respects marketing opt-in,
 * campaign records correct matched/optedIn numbers, tags PATCH works,
 * validation, auth, history list. */
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'test-secret-123';
process.env.ADMIN_EMAIL = 'admin@test.pk';
process.env.ADMIN_PASSWORD = 'TestPass123';
// No SMTP → mailer returns { skipped: true }; campaign must count those as skipped, not sent.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mem = await MongoMemoryServer.create({ instance: { dbName: 'hushae-test' }, binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  const User = require('./src/models/User');
  const CustomerGroup = require('./src/models/CustomerGroup');

  await User.create({ name: 'Admin', email: 'admin@test.pk', role: 'admin', password: 'TestPass123' });

  // Customers: one opted-in, one not, one without account (guest matched by phone).
  await User.create({ name: 'Opted In', email: 'optin@test.pk', phone: '03001234501', role: 'customer', password: 'Customer123', notify: { marketingEmail: true } });
  await User.create({ name: 'Not Opted', email: 'notopt@test.pk', phone: '03001234502', role: 'customer', password: 'Customer123', notify: { marketingEmail: false } });
  await User.create({ name: 'Tagged VIP', email: 'vip@test.pk', phone: '03001234503', role: 'customer', password: 'Customer123', notify: { marketingEmail: true }, tags: ['VIP'] });

  // Group matching all registered customers (no rules).
  const group = await CustomerGroup.create({ name: 'Everyone', rules: {}, memberCount: 3, lastEvaluatedAt: new Date() });

  const app = require('./src/app');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const j = (r) => r.json();

  let pass = 0, fail = 0;
  const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name} ${extra}`); }
  };

  let r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.pk', password: 'TestPass123' }) });
  let d = await j(r);
  const token = d.token;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  check('Admin login', !!token);

  // ── Validation: no subject → 400 ──
  r = await fetch(`${base}/api/email-campaigns`, { method: 'POST', headers: H, body: JSON.stringify({ target: 'group', groupId: String(group._id), subject: '', body: 'x' }) });
  check('No subject → 400', r.status === 400);

  // ── No groupId for group target → 400 ──
  r = await fetch(`${base}/api/email-campaigns`, { method: 'POST', headers: H, body: JSON.stringify({ target: 'group', subject: 'Hi', body: 'x' }) });
  check('Group target without groupId → 400', r.status === 400);

  // ── Create campaign to the group (no SMTP → all skipped, matched counts correct) ──
  r = await fetch(`${base}/api/email-campaigns`, { method: 'POST', headers: H, body: JSON.stringify({ target: 'group', groupId: String(group._id), subject: 'Hello from HUSHAE', body: 'Hi there' }) });
  d = await j(r);
  const c = d.campaign;
  check('Campaign created → 201', r.status === 201);
  check('matched = 2 (opted-in only: optin + vip)', c.matched === 2, `matched=${c.matched}`);
  check('sent = 0 (no SMTP configured)', c.sent === 0, `sent=${c.sent}`);
  check('skipped > 0 (smtp not configured)', c.skipped >= 2, `skipped=${c.skipped}`);
  check('status = error (nothing sent)', c.status === 'error', c.status);

  // ── Campaign history list ──
  r = await fetch(`${base}/api/email-campaigns`, { headers: H });
  d = await j(r);
  check('History → 1 campaign', d.campaigns?.length === 1 && d.total === 1);

  // ── Campaign detail ──
  r = await fetch(`${base}/api/email-campaigns/${c._id}`, { headers: H });
  d = await j(r);
  check('Detail → subject matches', d.campaign?.subject === 'Hello from HUSHAE');

  // ── Unauthenticated → 401 ──
  r = await fetch(`${base}/api/email-campaigns`);
  check('Unauth campaigns → 401/403', r.status === 401 || r.status === 403);

  // ── Tags PATCH ──
  const vipUser = await User.findOne({ email: 'vip@test.pk' });
  r = await fetch(`${base}/api/admin/customers/${vipUser._id}/tags`, { method: 'PATCH', headers: H, body: JSON.stringify({ tags: ['VIP', 'Lahore', 'VIP'] }) });
  d = await j(r);
  check('Tags PATCH → deduped + saved', r.status === 200 && d.tags?.length === 2 && d.tags.includes('Lahore'), JSON.stringify(d.tags));

  // ── Tags validation: not array → 400 ──
  r = await fetch(`${base}/api/admin/customers/${vipUser._id}/tags`, { method: 'PATCH', headers: H, body: JSON.stringify({ tags: 'VIP' }) });
  check('Tags non-array → 400', r.status === 400);

  // ── Customers list includes tags now ──
  r = await fetch(`${base}/api/admin/customers`, { headers: H });
  d = await j(r);
  const vipRow = d.customers?.find((x) => x.email === 'vip@test.pk');
  check('Customers list → tags included', vipRow?.tags?.includes('VIP'), JSON.stringify(vipRow?.tags));

  server.close();
  await mongoose.disconnect();
  await mem.stop();

  console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH:', e); process.exit(2); });
