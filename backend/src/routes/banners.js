const express = require('express');
const mongoose = require('mongoose');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly } = require('../middleware/auth');
const Banner = require('../models/Banner');
const BannerSlot = require('../models/BannerSlot');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

/* Public tracking is cheap and idempotent-ish — light rate limit so a runaway
   client can't inflate counters. */
const trackLimit = rateLimit({ windowMs: 60 * 1000, max: 120, key: 'banner-track', message: 'Slow down' });

/* ── Seed the five predefined slots (idempotent) ─────────────────────────── */
const SEED_SLOTS = [
  { key: 'homepage-hero',     name: 'Homepage Hero',    type: 'hero',    width: 1920, height: 800,  description: 'Full-width hero at the top of the homepage' },
  { key: 'homepage-below',    name: 'Below Products',   type: 'banner',  width: 1200, height: 400,  description: 'Banner between the product rail and the brand story' },
  { key: 'category-sidebar',  name: 'Category Sidebar', type: 'sidebar', width: 300,  height: 600,  description: 'Sidebar unit on category pages' },
  { key: 'product-inline',    name: 'Product Page',     type: 'inline',  width: 800,  height: 200,  description: 'Inline strip on the product detail page' },
  { key: 'cart-banner',       name: 'Cart Drawer',      type: 'banner',  width: 400,  height: 200,  description: 'Banner inside the mini cart drawer' },
];

async function seedSlots() {
  for (const s of SEED_SLOTS) {
    await BannerSlot.updateOne({ key: s.key }, { $setOnInsert: { ...s } }, { upsert: true });
  }
}
seedSlots().catch(() => {});

/* ============================================================================
 * PUBLIC — resolve the active banner for a slot (schedule + priority).
 *   GET /api/banners?slot=homepage-hero&device=mobile
 * Returns the single most-relevant banner, or null. Analytics are counted via
 * POST /api/banners/:id/impression and /api/banners/:id/click.
 * ========================================================================== */
router.get('/', asyncHandler(async (req, res) => {
  const key = String(req.query.slot || '').trim().toLowerCase();
  const device = String(req.query.device || 'all').trim().toLowerCase();
  if (!key) return res.status(400).json({ message: 'slot is required' });

  const slot = await BannerSlot.findOne({ key, active: true }).lean();
  if (!slot) return res.json({ banner: null, slot: null });

  const now = new Date();
  const q = { slot: slot._id, status: 'active' };
  // Schedule window: only banners that can be live right now.
  q.$or = [
    { alwaysActive: true },
    { startAt: { $lte: now }, $or: [{ endAt: null }, { endAt: { $gte: now } }] },
  ];
  /* lean() documents have no instance methods — resolve "live" from fields
     directly (same rule as Banner#isLive, kept inline so the sort+limit query
     stays one round trip). */
  const candidates = await Banner.find(q).sort({ priority: -1, createdAt: -1 }).limit(5).lean();
  const banner = candidates.find((b) => {
    if (b.alwaysActive) return true;
    if (b.startAt && now < new Date(b.startAt)) return false;
    if (b.endAt && now > new Date(b.endAt)) return false;
    if (b.device !== 'all' && b.device !== device) return false;
    return true;
  }) || null;
  res.json({ banner, slot: { key: slot.key, name: slot.name, width: slot.width, height: slot.height } });
}));

/** POST /api/banners/:id/impression — increment the view counter. */
router.post('/:id/impression', trackLimit, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ ok: false });
  await Banner.updateOne({ _id: req.params.id }, { $inc: { impressions: 1 } });
  res.json({ ok: true });
}));

/** POST /api/banners/:id/click — increment the click counter. */
router.post('/:id/click', trackLimit, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ ok: false });
  await Banner.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } });
  res.json({ ok: true });
}));

/* ============================================================================
 * ADMIN — slots + banners CRUD. All behind protect + adminOnly.
 * ========================================================================== */

/** GET /api/banners/admin/slots — all slots with banner counts. */
router.get('/admin/slots', protect, adminOnly, asyncHandler(async (req, res) => {
  const slots = await BannerSlot.find().sort({ createdAt: 1 }).lean();
  const counts = await Banner.aggregate([
    { $group: { _id: '$slot', n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({ slots: slots.map((s) => ({ ...s, bannerCount: map[String(s._id)] || 0 })) });
}));

/** POST /api/banners/admin/slots — create a custom slot. */
router.post('/admin/slots', protect, adminOnly, asyncHandler(async (req, res) => {
  const { key, name, type, width, height, description } = req.body || {};
  const k = String(key || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!k || !String(name || '').trim()) return res.status(400).json({ message: 'Key and name are required' });
  const dup = await BannerSlot.findOne({ key: k });
  if (dup) return res.status(409).json({ message: 'A slot with this key already exists' });
  const slot = await BannerSlot.create({
    key: k, name: String(name).trim(), type: type || 'banner',
    width: Number(width) || 1200, height: Number(height) || 400,
    description: String(description || ''),
  });
  res.status(201).json({ slot });
}));

/** PUT /api/banners/admin/slots/:id — rename / resize a slot. */
router.put('/admin/slots/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const slot = await BannerSlot.findById(req.params.id);
  if (!slot) return res.status(404).json({ message: 'Slot not found' });
  const { name, type, width, height, description } = req.body || {};
  if (name !== undefined) slot.name = String(name).trim();
  if (type !== undefined) slot.type = type;
  if (width !== undefined) slot.width = Number(width) || slot.width;
  if (height !== undefined) slot.height = Number(height) || slot.height;
  if (description !== undefined) slot.description = String(description || '');
  await slot.save();
  res.json({ slot });
}));

/** DELETE /api/banners/admin/slots/:id — archive a slot (banners kept). */
router.delete('/admin/slots/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await BannerSlot.findByIdAndUpdate(req.params.id, { active: false });
  res.json({ ok: true });
}));

/** GET /api/banners/admin — list all banners (with slot + schedule state). */
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const { slot, status } = req.query;
  const filter = {};
  if (slot) filter.slot = slot;
  if (status) filter.status = status;
  const banners = await Banner.find(filter).sort({ createdAt: -1 });
  const slotIds = [...new Set(banners.map((b) => String(b.slot)))];
  const slots = await BannerSlot.find({ _id: { $in: slotIds } }).lean();
  const slotMap = Object.fromEntries(slots.map((s) => [String(s._id), s]));
  const now = new Date();
  res.json({
    banners: banners.map((b) => ({ ...b.toObject(), slotName: slotMap[String(b.slot)]?.name || '—', slotKey: slotMap[String(b.slot)]?.key || '', scheduleState: b.scheduleState(now) })),
  });
}));

/** GET /api/banners/admin/:id — one banner for the editor. */
router.get('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ message: 'Banner not found' });
  res.json({ banner });
}));

/** POST /api/banners/admin — create. */
router.post('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || '').trim()) return res.status(400).json({ message: 'Banner name is required' });
  if (!mongoose.Types.ObjectId.isValid(b.slot)) return res.status(400).json({ message: 'Choose a slot' });
  const banner = await Banner.create({
    name: String(b.name).trim(),
    slot: b.slot,
    type: b.type || 'image',
    mediaUrl: String(b.mediaUrl || ''),
    html: String(b.html || ''),
    heading: String(b.heading || ''),
    subtitle: String(b.subtitle || ''),
    ctaText: String(b.ctaText || ''),
    ctaLink: String(b.ctaLink || ''),
    textPosition: b.textPosition || 'left',
    textColor: b.textColor || '#FFFFFF',
    overlayOpacity: Math.min(100, Math.max(0, Number(b.overlayOpacity) || 40)),
    priority: Math.min(10, Math.max(1, Number(b.priority) || 5)),
    status: b.status || 'draft',
    startAt: b.startAt ? new Date(b.startAt) : null,
    endAt: b.endAt ? new Date(b.endAt) : null,
    alwaysActive: !!b.alwaysActive,
    device: b.device || 'all',
    createdBy: req.user?.email || '',
  });
  res.status(201).json({ banner });
}));

/** PUT /api/banners/admin/:id — update. */
router.put('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ message: 'Banner not found' });
  const b = req.body || {};
  const fields = ['name', 'slot', 'type', 'mediaUrl', 'html', 'heading', 'subtitle', 'ctaText', 'ctaLink',
    'textPosition', 'textColor', 'overlayOpacity', 'priority', 'status', 'startAt', 'endAt', 'alwaysActive', 'device'];
  for (const f of fields) {
    if (b[f] === undefined) continue;
    if (f === 'startAt' || f === 'endAt') { banner[f] = b[f] ? new Date(b[f]) : null; continue; }
    if (f === 'overlayOpacity') { banner[f] = Math.min(100, Math.max(0, Number(b[f]) || 40)); continue; }
    if (f === 'priority') { banner[f] = Math.min(10, Math.max(1, Number(b[f]) || 5)); continue; }
    if (f === 'alwaysActive') { banner[f] = !!b[f]; continue; }
    banner[f] = b[f];
  }
  await banner.save();
  res.json({ banner });
}));

/** DELETE /api/banners/admin/:id. */
router.delete('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
