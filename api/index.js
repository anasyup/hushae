// Vercel serverless entry — wraps the Express app with a cached Mongoose connection.
// Local dev is untouched: `npm run dev` still uses src/server.js with its embedded DB.
const mongoose = require('../backend/node_modules/mongoose');
const config = require('../backend/src/config');
const app = require('../backend/src/app');

// Reuse one connection across warm invocations (serverless best practice).
let cached = global.__VELOURA_DB;
async function db() {
  if (cached) return cached;
  if (!config.mongoUri) throw new Error('MONGODB_URI environment variable is not set');
  cached = mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  global.__VELOURA_DB = cached;
  return cached;
}

module.exports = async (req, res) => {
  try {
    await db();
  } catch (e) {
    res.statusCode = 500;
    return res.json({ message: 'Database connection failed', detail: e.message });
  }
  return app(req, res);
};
