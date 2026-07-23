require('./config');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'VÉLOURA API' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/geo', require('./routes/geo'));
app.use('/api/otp', require('./routes/otp'));
const uploadsRoute = require('./routes/uploads');
app.get('/api/uploads/:id', uploadsRoute.publicGet); // public image serving
app.use('/api/uploads', uploadsRoute);
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/customer', require('./routes/customer'));

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
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong' });
});

module.exports = app;
