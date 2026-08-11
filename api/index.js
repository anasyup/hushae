// Vercel serverless entry — single-project mode (root). Wraps the shared
// handler that caches the Mongoose connection. Local dev is untouched:
// `npm run dev` still uses backend/src/server.js with its embedded DB.
module.exports = require('../backend/src/vercel-handler');
