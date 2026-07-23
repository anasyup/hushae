const express = require('express');
const crypto = require('crypto');
const Upload = require('../models/Upload');
const UploadChunk = require('../models/UploadChunk');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SINGLE = 8 * 1024 * 1024;   // one-shot uploads
const MAX_CHUNK = 3 * 1024 * 1024;    // per chunk
const MAX_TOTAL = 45 * 1024 * 1024;   // whole file

const b64ok = (s) => typeof s === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(s);

// ---- One-shot upload (small images) ----
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { mime, dataBase64 } = req.body || {};
  if (!ALLOWED.includes(mime)) return res.status(400).json({ message: 'Ye file type allowed nahi hai' });
  if (!b64ok(dataBase64)) return res.status(400).json({ message: 'Bad file data' });
  const data = Buffer.from(dataBase64, 'base64');
  if (!data.length) return res.status(400).json({ message: 'Empty file' });
  if (data.length > MAX_SINGLE) return res.status(400).json({ message: 'File bohat bari hai — dobara koshish karein' });
  const up = await Upload.create({ mime, data, size: data.length });
  res.status(201).json({ url: `/api/uploads/${up._id}`, id: up._id });
}));

// ---- Chunked upload (videos / big files) ----
router.post('/chunk/start', protect, adminOnly, asyncHandler(async (req, res) => {
  const mime = String((req.body && req.body.mime) || '');
  if (!ALLOWED.includes(mime)) return res.status(400).json({ message: 'Sirf image ya MP4/WebM video allowed hai' });
  const session = crypto.randomBytes(12).toString('hex');
  res.json({ session, maxChunk: MAX_CHUNK, maxTotal: MAX_TOTAL });
}));

router.post('/chunk/:session/:idx', protect, adminOnly, asyncHandler(async (req, res) => {
  const session = req.params.session.replace(/[^a-f0-9]/gi, '');
  const idx = parseInt(req.params.idx, 10);
  if (!session || !(idx >= 0 && idx < 200)) return res.status(400).json({ message: 'Bad chunk' });
  if (!b64ok(req.body && req.body.dataBase64)) return res.status(400).json({ message: 'Bad chunk data' });
  const data = Buffer.from(req.body.dataBase64, 'base64');
  if (!data.length || data.length > MAX_CHUNK * 1.1) return res.status(400).json({ message: 'Bad chunk size' });
  await UploadChunk.create({ session, idx, data });
  res.json({ ok: true });
}));

router.post('/chunk/:session/finish', protect, adminOnly, asyncHandler(async (req, res) => {
  const session = req.params.session.replace(/[^a-f0-9]/gi, '');
  const mime = String((req.body && req.body.mime) || 'video/mp4');
  const chunks = await UploadChunk.find({ session }).sort({ idx: 1 }).select('data');
  if (!chunks.length) return res.status(400).json({ message: 'No chunks received' });
  const size = chunks.reduce((n, c) => n + c.data.length, 0);
  if (size > MAX_TOTAL) {
    await UploadChunk.deleteMany({ session });
    return res.status(400).json({ message: 'File 45MB se bari hai — choti clip try karein ya YouTube link lagayen' });
  }
  const up = await Upload.create({ mime, chunked: true, session, size });
  res.status(201).json({ url: `/api/uploads/${up._id}`, id: up._id });
}));

// ---- Delete (cascades to chunks) ----
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const up = await Upload.findById(req.params.id);
  if (up) {
    if (up.session) await UploadChunk.deleteMany({ session: up.session });
    await up.deleteOne();
  }
  res.json({ ok: true });
}));

module.exports = router;

// ---- Public GET with Range support (needed for video playback) ----
module.exports.publicGet = asyncHandler(async (req, res) => {
  const up = await Upload.findById(req.params.id).select('mime data chunked session size');
  if (!up) return res.status(404).end();

  const base = {
    'Content-Type': up.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  // Small file — direct buffer
  if (!up.chunked) {
    res.set({ ...base, 'Content-Length': String(up.data.length) });
    if (req.method === 'HEAD') return res.end();
    return res.send(up.data);
  }

  // Chunked file — stream chunk docs in order
  const chunks = await UploadChunk.find({ session: up.session }).sort({ idx: 1 }).select('data');
  if (!chunks.length) return res.status(404).end();
  const total = up.size || chunks.reduce((n, c) => n + c.data.length, 0);

  const range = req.headers.range ? /^bytes=(\d+)-(\d*)$/.exec(req.headers.range) : null;
  let start = 0;
  let end = total - 1;
  if (range) {
    start = parseInt(range[1], 10);
    if (range[2]) end = Math.min(end, parseInt(range[2], 10));
  }
  if (start >= total || start > end) {
    res.set({ ...base, 'Content-Range': `bytes */${total}` });
    return res.status(416).end();
  }
  const len = end - start + 1;
  res.set({
    ...base,
    'Content-Length': String(len),
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${total}` } : {}),
  });
  if (range) res.status(206);
  if (req.method === 'HEAD') return res.end();

  let pos = 0;
  for (const c of chunks) {
    const cEnd = pos + c.data.length;
    if (cEnd > start && pos <= end) {
      const from = Math.max(0, start - pos);
      const to = Math.min(c.data.length, end - pos + 1);
      res.write(c.data.subarray(from, to));
    }
    pos = cEnd;
    if (pos > end) break;
  }
  res.end();
});
