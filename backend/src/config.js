require('dotenv').config();

// HUSHAE backend config
// NOTE: Never hardcode secrets here — everything sensitive must come from
// environment variables. Local dev without env vars will fail loudly so
// misconfigured setups don't silently fall back to a public default.

function must(key) {
  if (process.env[key] && String(process.env[key]).trim()) return process.env[key];
  return '';
}

/* An older .env.example shipped a placeholder Atlas URI. Because it is non-empty,
   `must()` returned it, and Mongoose then died at connect time with
   `querySrv ENOTFOUND _mongodb._tcp.cluster0.xxxxx.mongodb.net` — which reads
   like a broken install rather than an unfilled template, and it also suppressed
   the embedded-Mongo fallback that README documents for an empty value.
   Recognise the template strings and treat them as "not set". */
const MONGO_PLACEHOLDER = /USER:PASSWORD|<user>:<pass>|cluster0\.x{4,5}\.mongodb\.net/i;

function mongoUri() {
  const value = must('MONGODB_URI').trim();
  if (!value) return '';
  if (MONGO_PLACEHOLDER.test(value)) {
    console.warn('[config] MONGODB_URI still contains the .env.example placeholder — ignoring it and using the embedded local MongoDB. Paste a real connection string for persistent data.');
    return '';
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: mongoUri(),
  jwtSecret: must('JWT_SECRET'),
  adminEmail: must('ADMIN_EMAIL'),
  adminPassword: must('ADMIN_PASSWORD'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
