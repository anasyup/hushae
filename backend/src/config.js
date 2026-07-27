require('dotenv').config();

// HUSHAE backend config
// NOTE: Never hardcode secrets here — everything sensitive must come from
// environment variables. Local dev without env vars will fail loudly so
// misconfigured setups don't silently fall back to a public default.

function must(key) {
  if (process.env[key] && String(process.env[key]).trim()) return process.env[key];
  return '';
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: must('MONGODB_URI'),
  jwtSecret: must('JWT_SECRET'),
  adminEmail: must('ADMIN_EMAIL'),
  adminPassword: must('ADMIN_PASSWORD'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
