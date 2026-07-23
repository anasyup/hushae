const express = require('express');
const Upload = require('../models/Upload');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

// ---- Admin: store an uploaded image in the database, returns its URL ----
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { mime, dataBase64 } = req.body || {};
  if (!ALLOWED.includes(mime)) return res.status(400).json({ message: 'Only image files are allowed' });
  const data = Buffer.from(String(dataBase64 || ''), 'base64');
  if (!data.length) return res.status(400).json({ message: 'Empty file' });
  if (data.length > MAX_BYTES) return res.status(400).json({ message: 'File too large (max 8MB)' });
  const up = await Upload.create({ mime, data, size: data.length });
  res.status(201).json({ url: `/api/uploads/${up._id}`, id: up._id });
}));

router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await Upload.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;

// Public GET — mounted separately without auth
module.exports.publicGet = asyncHandler(async (req, res) => {
  const up = await Upload.findById(req.params.id).select('mime data');
  if (!up) return res.status(404).end();
  res.set({
    'Content-Type': up.mime,
    'Content-Length': String(up.data.length),
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  res.send(up.data);
});
