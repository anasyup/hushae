const express = require('express');
const { Theme, ThemeVersion } = require('../models/Theme');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

const MAX_VERSIONS = 40;

const getTheme = async () =>
  (await Theme.findOne({ key: 'main' })) || (await Theme.create({ key: 'main' }));

/**
 * GET /api/theme
 * Public: the storefront needs the published document.
 * Admin (?draft=1 with a token): returns the working draft instead.
 */
router.get('/', asyncHandler(async (req, res) => {
  const t = await getTheme();
  const wantsDraft = req.query.draft === '1';
  const doc = wantsDraft && t.draft ? t.draft : t.doc;
  const settings = wantsDraft && t.draftSettings ? t.draftSettings : t.settings;
  const versions = await ThemeVersion.find({ key: 'main' })
    .sort({ createdAt: -1 }).limit(MAX_VERSIONS)
    .select('label createdAt doc theme');

  // The editor also needs the autosaved draft so unsaved work survives a
  // refresh; the storefront ignores these fields.
  // The editor seeds a brand-new document from the store's existing settings so
  // activating it reproduces the current storefront exactly.
  let storeSettings = null;
  if (!doc && req.query.seed === '1') {
    const Settings = require('../models/Settings');
    storeSettings = await Settings.findOne({ key: 'store' }).lean();
  }

  res.json({
    theme: { doc: doc || null, settings: settings || {} },
    draft: t.draft || null,
    draftSettings: t.draftSettings || null,
    storeSettings,
    versions,
    publishedAt: t.publishedAt,
  });
}));

/**
 * PUT /api/theme
 * body: { doc, settings, publish?, changedNodes?, removedNodes? }
 * Autosave writes the draft; publish promotes it and snapshots a version.
 */
router.put('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { doc, settings, publish, changedNodes, removedNodes, label } = req.body || {};
  if (!doc || typeof doc !== 'object') return res.status(400).json({ message: 'doc is required' });

  const t = await getTheme();
  t.draft = doc;
  t.draftSettings = settings || {};
  t.updatedBy = req.user?.email || '';

  if (publish) {
    t.doc = doc;
    t.settings = settings || {};
    t.publishedAt = new Date();

    await ThemeVersion.create({
      key: 'main',
      label: (label && String(label).trim().slice(0, 80)) || `Published ${new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      doc,
      theme: settings || {},
      changedNodes: Array.isArray(changedNodes) ? changedNodes.slice(0, 500) : [],
      removedNodes: Array.isArray(removedNodes) ? removedNodes.slice(0, 500) : [],
      createdBy: req.user?.email || '',
    });

    // Trim history
    const stale = await ThemeVersion.find({ key: 'main' })
      .sort({ createdAt: -1 }).skip(MAX_VERSIONS).select('_id');
    if (stale.length) await ThemeVersion.deleteMany({ _id: { $in: stale.map((v) => v._id) } });
  }

  await t.save();

  const versions = await ThemeVersion.find({ key: 'main' })
    .sort({ createdAt: -1 }).limit(MAX_VERSIONS)
    .select('label createdAt doc theme');

  res.json({ ok: true, published: !!publish, versions });
}));

/** POST /api/theme/version — snapshot the current draft with a custom label. */
router.post('/version', protect, adminOnly, asyncHandler(async (req, res) => {
  const t = await getTheme();
  const doc = t.draft || t.doc;
  if (!doc) return res.status(400).json({ message: 'Nothing to snapshot' });
  const v = await ThemeVersion.create({
    key: 'main',
    label: (req.body?.label || 'Manual snapshot').slice(0, 80),
    doc,
    theme: t.draftSettings || t.settings || {},
    createdBy: req.user?.email || '',
  });
  res.json({ ok: true, version: { _id: v._id, label: v.label, createdAt: v.createdAt } });
}));

/** POST /api/theme/restore/:id — promote a stored version back to the draft. */
router.post('/restore/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const v = await ThemeVersion.findById(req.params.id);
  if (!v) return res.status(404).json({ message: 'Version not found' });
  const t = await getTheme();
  t.draft = v.doc;
  t.draftSettings = v.theme || {};
  await t.save();
  res.json({ ok: true, theme: { doc: v.doc, settings: v.theme || {} } });
}));

/** DELETE /api/theme/version/:id */
router.delete('/version/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await ThemeVersion.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
