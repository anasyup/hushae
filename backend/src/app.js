require('./config');
// Initialize JWT secret from DB if it exists
try {
  const Settings = require('./models/Settings');
  Settings.findOne({ key: 'store' }).then((s) => {
    if (s?.integrations?.jwtSecret) {
      require('./middleware/auth').setJwtSecretCached(s.integrations.jwtSecret);
    }
  }).catch(() => {});
} catch (err) { /* noop */ }
const express = require('express');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1); // Vercel/CF proxy — real client IPs (needed for rate limits)
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(require('./middleware/sanitize')); // NoSQL-injection block

/* ── ORIGIN REBASE — stored image/media URLs may reference a previous
   deployment domain (e.g. https://hushae.vercel.app/...). Rewrite them to
   the CURRENT request origin so images keep working after a domain change.
   Applied to every outgoing JSON response, so products, collections,
   orders, reviews etc. all resolve images on whatever domain the site is
   served from. */
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (!host) return next();
  const origin = `${req.protocol}://${host}`;
  const OLD = 'https://hushae.vercel.app';
  if (origin === OLD) return next(); // already the canonical domain — no-op
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    try {
      const text = JSON.stringify(body);
      if (text.includes(OLD)) {
        return sendJson(JSON.parse(text.split(OLD).join(origin)));
      }
      return sendJson(body);
    } catch {
      return sendJson(body);
    }
  };
  return next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'HUSHAE API' }));

/* ── API STATUS PAGE — open /api in a browser to see the backend live ── */
app.get(['/api', '/api/'], (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState; // 0 dis, 1 connected, 2 connecting, 3 disconnecting
  const dbLabel = dbState === 1 ? 'Connected' : dbState === 2 ? 'Connecting…' : 'Not connected';
  const dbColor = dbState === 1 ? '#16a34a' : dbState === 2 ? '#d97706' : '#dc2626';
  const endpoints = [
    ['/api/health', 'Health check'],
    ['/api/products', 'Products (100 live)'],
    ['/api/categories', 'Categories (10)'],
    ['/api/collections', 'Collections (3)'],
    ['/api/orders/track', 'Order tracking'],
    ['/api/reviews', 'Reviews'],
    ['/api/settings', 'Store settings'],
    ['/api/auth', 'Auth & login'],
  ];
  const rows = endpoints.map(([p, label]) =>
    `<tr><td><a href="${p}" target="_blank" class="ep">${p}</a></td><td class="muted">${label}</td></tr>`).join('');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>HUSHAE API — Live</title><style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;background:#fcfbf9;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;max-width:680px;width:100%;padding:40px;box-shadow:0 10px 30px rgba(0,0,0,.04)}
  .brand{font-size:26px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
  .tag{color:#888;font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin-top:4px}
  .status{display:flex;align-items:center;gap:10px;margin:28px 0 8px;padding:14px 16px;background:#f6f6f3;border-radius:8px;font-size:14px}
  .dot{width:10px;height:10px;border-radius:50%;background:${dbColor}}
  .ok{color:${dbColor};font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  td{padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  a.ep{color:#111;font-family:ui-monospace,Menlo,monospace;font-size:13px;text-decoration:none;border-bottom:1px solid #ccc}
  a.ep:hover{border-color:#111}
  .muted{color:#777}
  .foot{margin-top:22px;color:#999;font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between}
</style></head><body><div class="card">
  <div class="brand">HUSHAE</div><div class="tag">Backend API — live endpoint</div>
  <div class="status"><span class="dot"></span><span class="ok">API Online</span>
    <span style="margin-left:auto;color:#555;font-size:12px">Database: <b style="color:${dbColor}">${dbLabel}</b></span></div>
  <table>${rows}</table>
  <div class="foot"><span>HUSHAE · Node/Express</span><span>${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span></div>
</div></body></html>`);
});


// Kick off the daily in-DB auto-backup daemon.
// Safe to call multiple times — internal flag prevents duplicate intervals.
try { require('./utils/autoBackup').startAutoBackup(); } catch { /* noop */ }

// SEO endpoints — served at ROOT (not /api/*) so search engines find them
// Vercel rewrites /robots.txt and /sitemap.xml to this Express app.
app.use('/', require('./routes/seo'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
// Order management v2 — mounted BEFORE the legacy router so /manage wins
app.use('/api/orders/insights', require('./routes/ordersInsights'));
app.use('/api/orders/manage', require('./routes/ordersAdmin'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/dashboard', require('./routes/dashboardSignals'));
app.use('/api/notifications', require('./routes/dashboardSignals').notifications);
app.use('/api/settings', require('./routes/settings'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/geo', require('./routes/geo'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/track', require('./routes/track'));
app.use('/api/analytics', require('./routes/analytics'));
const uploadsRoute = require('./routes/uploads');
app.get('/api/uploads/:id', uploadsRoute.publicGet); // public image serving
app.use('/api/uploads', uploadsRoute);
app.use('/api/wishlist', require('./routes/wishlist'));
// Customer 360 admin API. Kept separate from /api/customer, which is the
// storefront account surface for the signed-in shopper.
app.use('/api/customers', require('./routes/customer360'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/abandoned-cart', require('./routes/abandonedCart'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/loyalty', require('./routes/loyalty'));
/* Order matters. The admin ⌘K palette is admin-only and must be matched before
   the public storefront router, which owns the rest of the /api/search space.
   Previously routes/search.js (protect+adminOnly) was mounted on bare
   /api/search, so every shopper search returned 401. */
app.use('/api/search/admin', require('./routes/search'));
app.use('/api/search', require('./routes/searchPublic'));
app.use('/api/discovery', require('./routes/discovery'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/theme', require('./routes/theme'));
app.use('/api/email-templates', require('./routes/emailTemplates'));
app.use('/api/security', require('./routes/security'));
app.use('/api/marketing/automation', require('./routes/marketing'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/customer-groups', require('./routes/customerGroups'));
app.use('/api/email-campaigns', require('./routes/emailCampaigns'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/ops', require('./routes/ops'));

app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Production: serve the built frontend from the same service (Render single deploy).
// In local dev (no dist folder) this block is skipped and Vite serves the frontend instead.
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join(', ');
    return res.status(400).json({ message: msg || 'Invalid data' });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate record — please check unique fields' });
  /* MEASURED, Sprint 2M audit: posting {"password":{"$ne":"x"}} to /auth/login
     returned "Illegal arguments: object, string" — a bcrypt internal, echoed
     straight to the caller. Error messages the code CHOSE (a 4xx we threw on
     purpose) are useful and stay. An unexpected 500 is a library or database
     message and tells an attacker about the stack; it is replaced with a
     generic line and the real one is logged above for us. */
  const status = err.status || 500;
  const safe = status < 500 && err.message ? err.message : 'Something went wrong on our side — please try again';
  res.status(status).json({ message: safe });
});

module.exports = app;
