/* Settings PUT whitelist — regression test for the "editor says Saved but the
 * write is discarded" class of bug.
 *
 * MEASURED BUG this covers: `search` and `discovery` were absent from the
 * whitelist in routes/settings.js, so Settings → Search & Discovery has never
 * persisted synonyms, minChars, fuzzy tolerance, blocked terms or the discovery
 * toggles. Same class as the `marketing` omission fixed in c0f0030, and the
 * reason utils/searchEngine.js carries a "settings.search has never been SAVED"
 * note. Fixed 2026-08-28 by adding both keys; this test is what keeps them there.
 *
 * It also pins the deliberate exception: `adminShare` must NOT be settable here,
 * because it mints a share-link admin session and is written only by routes/auth.js.
 *
 * Run: node test-settings-whitelist.js   (needs dev deps; no external services)
 */
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'test-secret-123';
process.env.ADMIN_EMAIL = 'admin@test.pk';
process.env.ADMIN_PASSWORD = 'TestPass123';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${pass ? '' : `  — ${detail || ''}`}`);
};

(async () => {
  const mem = await MongoMemoryServer.create({ instance: { dbName: 'hushae-test' }, binary: { version: '7.0.14' } });
  await mongoose.connect(mem.getUri());

  // Stub the auth middleware *before* the router requires it, so the PUT can be
  // exercised without a real login round-trip. The route under test is what
  // owns the whitelist; auth is a dependency we are not testing here.
  const authPath = require.resolve('./src/middleware/auth');
  require.cache[authPath] = {
    id: authPath, filename: authPath, loaded: true, exports: {
      protect: (req, _res, next) => { req.user = { email: 'admin@test.pk', role: 'admin' }; next(); },
      adminOnly: (_req, _res, next) => next(),
    },
  };

  const express = require('express');
  const Settings = require('./src/models/Settings');
  const app = express();
  app.use(express.json());
  app.use('/api/settings', require('./src/routes/settings'));

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/settings`;

  const put = async (body) => {
    const res = await fetch(base, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const fresh = async () => (await Settings.findOne({ key: 'store' })).toObject();

  // 1. The bug being fixed: search + discovery must survive a PUT.
  const r1 = await put({
    search: { minChars: 3, synonyms: [{ from: 'panty', to: 'brief', both: true }], blockedTerms: ['xyz'] },
    discovery: { similar: { enabled: true, count: 6 } },
  });
  const s1 = await fresh();
  check('PUT search persists (was silently dropped)', r1.status === 200 && s1.search?.minChars === 3,
    `status=${r1.status} minChars=${s1.search?.minChars}`);
  check('PUT search keeps nested arrays', Array.isArray(s1.search?.synonyms) && s1.search.synonyms.length === 1,
    JSON.stringify(s1.search?.synonyms));
  check('PUT discovery persists', s1.discovery?.similar?.count === 6 && s1.discovery.similar.enabled === true,
    JSON.stringify(s1.discovery?.similar));

  // 2. The engine must now be able to read what was saved. This is the actual
  //    user-visible outcome — settings nobody consumes are not a fix.
  const searchEngine = require('./src/utils/searchEngine');
  if (typeof searchEngine.invalidateSettingsCache === 'function') searchEngine.invalidateSettingsCache();
  const cfg = await searchEngine.searchConfig();
  check('searchConfig() reflects the saved minChars', cfg.minChars === 3, `got ${cfg.minChars}`);

  // 3. Previously-fixed keys must stay fixed (marketing regression guard).
  await put({ marketing: { schedule: { timezone: 'Asia/Karachi' } } });
  const s3 = await fresh();
  check('marketing still whitelisted (c0f0030 regression guard)', s3.marketing?.schedule?.timezone === 'Asia/Karachi',
    JSON.stringify(s3.marketing?.schedule));

  // 4. Batch-1 keys, unchanged behaviour.
  await put({ timezone: 'UTC', businessAddress: { city: 'Karachi' } });
  const s4 = await fresh();
  check('timezone + businessAddress unaffected', s4.timezone === 'UTC' && s4.businessAddress?.city === 'Karachi',
    `${s4.timezone}/${s4.businessAddress?.city}`);

  // 5. The security exception: adminShare must NOT be settable via settings PUT.
  await put({ adminShare: { linkId: 'evil', expiresAt: new Date(Date.now() + 864e5).toISOString() } });
  const s5 = await fresh();
  check('adminShare is NOT settable via /settings (security)', !s5.adminShare?.linkId || s5.adminShare.linkId === '',
    `linkId=${s5.adminShare?.linkId}`);

  // 6. Unknown keys are ignored, not stored as schema-less junk.
  await put({ someUnrelatedKey: 'nope' });
  const s6 = await fresh();
  check('unknown key ignored', s6.someUnrelatedKey === undefined, String(s6.someUnrelatedKey));

  // 7. A field the model does not define must not be persisted either.
  await put({ search: { minChars: 5, brandNewUnknownField: 'x' } });
  const s7 = await fresh();
  check('model-defined sub-schema still applies (nested writes only)', s7.search?.minChars === 5,
    `minChars=${s7.search?.minChars}`);
  check('undefined nested field dropped by schema', s7.search?.brandNewUnknownField === undefined,
    String(s7.search?.brandNewUnknownField));

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  server.close();
  await mongoose.disconnect();
  await mem.stop();
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error('\n✗ test crashed:', err?.message || err);
  process.exit(1);
});
