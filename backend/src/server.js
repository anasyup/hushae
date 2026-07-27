const config = require('./config');
const { seedIfEmpty, connect } = require('./seed/seed');

async function resolveMongoUri() {
  if (config.mongoUri) return config.mongoUri;

  // Zero-config local dev: embedded MongoDB (downloads once, then cached).
  console.log('[db] MONGODB_URI not set — starting embedded MongoDB for local development...');
  console.log('[db] first run downloads ~90 MB once; afterwards it starts in seconds.');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mem = await MongoMemoryServer.create({
    instance: { dbName: 'hushae', storageEngine: 'wiredTiger' },
    binary: { version: '7.0.14' },
  });
  const uri = mem.getUri();
  console.log('[db] embedded MongoDB ready (data resets when the server stops — set MONGODB_URI in .env for persistent data)');
  process.on('SIGINT', async () => { await mem.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { await mem.stop(); process.exit(0); });
  return uri;
}

(async () => {
  const uri = await resolveMongoUri();
  await connect(uri);
  console.log(`[db] connected`);
  await seedIfEmpty();

  const app = require('./app');
  app.listen(config.port, () => {
    console.log('');
    console.log('  HUSHAE API is running');
    console.log(`  → API:     http://localhost:${config.port}/api`);
    console.log(`  → Health:  http://localhost:${config.port}/api/health`);
    console.log('');
    console.log(`  Admin login → ${config.adminEmail} / (password set via ADMIN_PASSWORD env var)`);
    console.log('');
  });
})().catch((e) => {
  console.error('Failed to start server:', e.message);
  process.exit(1);
});
