// Vercel serverless entry for the BACKEND SERVICE (services mode).
// The shared handler caches the Mongoose connection and wraps the Express app.
module.exports = require('../src/vercel-handler');
