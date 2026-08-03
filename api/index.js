// Vercel serverless entry — wraps the Express app with a cached Mongoose connection.
// Local dev is untouched: `npm run dev` still uses src/server.js with its embedded DB.
const mongoose = require('../backend/node_modules/mongoose');
const config = require('../backend/src/config');
const app = require('../backend/src/app');

/* ============================================================================
 * RELIABLE CONNECTION CACHE — fixes intermittent 500s on concurrent requests.
 *
 * Vercel reuses warm lambdas but can invoke a NEW lambda while the previous
 * one's `mongoose.connect()` promise has not resolved yet. Two concurrent
 * invocations both see `cached === undefined` and race to open a second
 * connection, which Mongoose rejects. The fix stores the connecting promise
 * so every invocation waits on the same one.
 * ========================================================================== */

let cached = global.__HUSHAE_DB;
let connecting = global.__HUSHAE_DB_CONNECTING;

async function db() {
  // Already connected — return immediately.
  if (cached && mongoose.connection.readyState === 1) return cached;

  // A connection is in progress — wait for it instead of racing.
  if (connecting) {
    try { cached = await connecting; } catch { /* retry below */ }
    if (cached && mongoose.connection.readyState === 1) return cached;
  }

  // Fresh connect with a generous timeout for cold starts.
  if (!config.mongoUri) throw new Error('MONGODB_URI environment variable is not set');

  connecting = mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  global.__HUSHAE_DB_CONNECTING = connecting;

  try {
    cached = await connecting;
    global.__HUSHAE_DB = cached;
    return cached;
  } catch (e) {
    connecting = null;
    global.__HUSHAE_DB_CONNECTING = null;
    throw e;
  }
}

module.exports = async (req, res) => {
  try {
    await db();
  } catch (e) {
    console.error('DB connection error:', e.message);
    res.statusCode = 500;
    return res.json({ message: 'Database connection failed', detail: e.message });
  }
  return app(req, res);
};
