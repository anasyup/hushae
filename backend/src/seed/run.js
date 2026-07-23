// Standalone seed runner: `npm run seed`
const config = require('../config');
const { seedIfEmpty, connect } = require('./seed');
const mongoose = require('mongoose');

(async () => {
  const uri = config.mongoUri;
  if (!uri) {
    console.error('MONGODB_URI is empty. For local zero-config dev just run `npm run dev` — the embedded database seeds itself automatically.');
    process.exit(1);
  }
  await connect(uri);
  await seedIfEmpty();
  await mongoose.disconnect();
  console.log('[seed] done');
})();
