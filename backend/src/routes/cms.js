const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const CmsPage = require('../models/CmsPage');
const CmsVersion = require('../models/CmsVersion');
const Redirect = require('../models/Redirect');
const E = require('../utils/cmsEngine');

const router = express.Router();

/* ---------------------------------------------------------------------------
 * PUBLIC
 *
 * Deliberately narrow: a shopper gets published content and nothing else. No
 * draft bodies, no schedules, no audit fields. A page scheduled for Friday
 * must not be readable on Tuesday by anyone who guesses the slug.
 * ------------------------------------------------------------------------- */

/** Pages for the footer/header menus. One query, cached shape. */
router.get('/nav', asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  if (!cfg.enabled) return res.json({ footer: [], header: [] });

  const now = new Date();
  const rows = await CmsPage.find({
    status: 'published',
    $or: [{ showInFooter: true }, { showInHeader: true }],
  }).select('title slug navLabel showInFooter showInHeader sortOrder publishAt unpublishAt status');

  const live = rows.filter((p) => p.liveState(now).live);
  const shape = (p) => ({ label: p.navLabel || p.title, slug: p.slug });

  res.json({
    footer: live.filter((p) => p.showInFooter).sort((a, b) => a.sortOrder - b.sortOrder).map(shape),
    header: live.filter((p) => p.showInHeader).sort((a, b) => a.sortOrder - b.sortOrder).map(shape),
  });
}));

/** Resolve a redirect. Called by the SPA before it renders a 404. */
router.get('/redirect', asyncHandler(async (req, res) => {
  const from = String(req.query.from || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!from) return res.json({ found: false });

  const r = await Redirect.findOne({ from, active: true });
  if (!r) return res.json({ found: false });

  // Fire-and-forget: a hit counter must never delay a redirect.
  Redirect.updateOne({ _id: r._id }, { $inc: { hits: 1 }, $set: { lastHit: new Date() } }).catch(() => {});
  res.json({ found: true, to: r.to, code: r.code });
}));

/**
 * One published page.
 *
 * `?preview=<token>` lets an admin see a draft. The token is the admin JWT,
 * checked properly rather than a shared secret in a query string — a guessable
 * preview key is how unreleased pages leak.
 */
router.get('/page/:slug', asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  if (!cfg.enabled) return res.status(404).json({ message: 'Not found' });

  const slug = String(req.params.slug || '').toLowerCase();
  const page = await CmsPage.findOne({ slug });
  if (!page) {
    // Before giving up, check whether this address was renamed.
    const r = await Redirect.findOne({ from: slug, active: true });
    if (r) return res.status(404).json({ message: 'Not found', redirectTo: r.to, code: r.code });
    return res.status(404).json({ message: 'Not found' });
  }

  const state = page.liveState();
  let wantsDraft = false;

  if (req.query.preview) {
    // Verify the caller really is an admin; never trust the flag itself.
    try {
      const jwt = require('jsonwebtoken');
      const config = require('../config');
      const decoded = jwt.verify(String(req.query.preview), config.jwtSecret);
      const User = require('../models/User');
      const u = await User.findById(decoded.id).select('role');
      wantsDraft = u?.role === 'admin';
    } catch { wantsDraft = false; }
  }

  if (!state.live && !wantsDraft) return res.status(404).json({ message: 'Not found' });

  const settings = {};
  const seo = E.resolveSeo(page, cfg, settings);

  res.json({
    page: {
      title: page.title,
      slug: page.slug,
      type: page.type,
      doc: wantsDraft && page.draft ? page.draft : page.doc,
      body: wantsDraft && page.draftBody ? page.draftBody : page.body,
      excerpt: page.excerpt,
      updatedAt: page.updatedAt,
      publishedAt: page.publishedAt,
    },
    seo,
    preview: wantsDraft && !state.live,
  });
}));

/** Which section types exist. Lets the admin build a picker without shipping
 *  the whole editor bundle. */
router.get('/sections', asyncHandler(async (req, res) => {
  res.json({ sections: E.SECTION_TYPES });
}));

/* ---------------------------------------------------------------------------
 * ADMIN
 * ------------------------------------------------------------------------- */
router.use(protect, adminOnly);

const writeLimit = rateLimit({ windowMs: 60 * 1000, max: 120, key: 'cms-write', message: 'Slow down a moment' });

/** Shared validation. The engine owns the rules; this maps them to fields. */
async function validatePage(body, cfg, { id = null } = {}) {
  const errs = [];
  const title = String(body.title || '').trim();
  if (!title) errs.push({ field: 'title', message: 'Give the page a title' });
  if (title.length > 200) errs.push({ field: 'title', message: 'Title is too long' });

  if (body.slug !== undefined) {
    const chk = E.checkSlug(body.slug, cfg);
    if (!chk.ok) errs.push({ field: 'slug', message: chk.message });
    else {
      const where = { slug: chk.slug };
      if (id) where._id = { $ne: id };
      if (await CmsPage.exists(where)) {
        errs.push({ field: 'slug', message: 'Another page already uses that address' });
      }
    }
  }

  const docCheck = E.validateDoc(body.doc);
  if (!docCheck.ok) errs.push({ field: 'doc', message: docCheck.message });

  const draftCheck = E.validateDoc(body.draft);
  if (!draftCheck.ok) errs.push({ field: 'draft', message: draftCheck.message });

  if (body.seo?.structuredData !== undefined) {
    const sd = E.validateStructuredData(body.seo.structuredData);
    if (!sd.ok) errs.push({ field: 'seo.structuredData', message: sd.message });
  }

  if (cfg.requireSeoTitle && body.status === 'published' && !String(body.seo?.title || '').trim()) {
    errs.push({ field: 'seo.title', message: 'An SEO title is required before publishing' });
  }

  if (body.publishAt && body.unpublishAt
      && new Date(body.unpublishAt) <= new Date(body.publishAt)) {
    errs.push({ field: 'unpublishAt', message: 'The end date must be after the start date' });
  }

  return errs;
}

router.get('/pages', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.q) {
    const rx = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    where.$or = [{ title: { $regex: rx, $options: 'i' } }, { slug: { $regex: rx, $options: 'i' } }];
  }

  const perPage = Math.min(100, parseInt(req.query.limit || '50', 10));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  const [rows, total] = await Promise.all([
    CmsPage.find(where).sort({ updatedAt: -1 }).skip((page - 1) * perPage).limit(perPage)
      .select('-doc -draft -body -draftBody'),
    CmsPage.countDocuments(where),
  ]);

  const now = new Date();
  res.json({
    pages: rows.map((p) => ({ ...p.toObject(), state: p.liveState(now) })),
    total, page, perPage, hasMore: page * perPage < total,
  });
}));

router.get('/pages/:id', asyncHandler(async (req, res) => {
  const p = await CmsPage.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  const versions = await CmsVersion.find({ page: p._id })
    .sort({ createdAt: -1 }).limit(30).select('label createdBy createdAt');
  res.json({ page: { ...p.toObject(), state: p.liveState() }, versions });
}));

/**
 * One version, with its CONTENT.
 *
 * MEASURED GAP, Sprint 2L P2B: /pages/:id returns the version LIST but selects
 * only 'label createdBy createdAt' — deliberately, so opening a page does not
 * drag 30 section trees over the wire. That makes the list cheap and makes a
 * diff impossible: there was no way to read what a version actually contained.
 *
 * Fetched one at a time, on demand, when the merchant opens a comparison.
 */
router.get('/pages/:id/versions/:versionId', asyncHandler(async (req, res) => {
  const v = await CmsVersion.findById(req.params.versionId);
  if (!v) return res.status(404).json({ message: 'Version not found' });
  // A version id is guessable; check it belongs to the page being asked about
  // rather than trusting the URL to be consistent with itself.
  if (String(v.page) !== String(req.params.id)) {
    return res.status(404).json({ message: 'Version not found' });
  }
  res.json({ version: v });
}));

/**
 * Compare two versions, or a version against what is live now.
 *
 * The DIFF IS COMPUTED ON THE SERVER. Shipping both documents to the browser
 * to diff them there would mean sending up to 1 MB of section trees so the
 * merchant can read "the heading changed" — and would put the same comparison
 * logic in two places the first time anything else needs it.
 *
 * `to` may be a version id or the literal string "current".
 */
router.get('/pages/:id/diff', asyncHandler(async (req, res) => {
  const page = await CmsPage.findById(req.params.id);
  if (!page) return res.status(404).json({ message: 'Not found' });

  const loadSide = async (ref, label) => {
    if (!ref || ref === 'current') {
      return { label: label || 'Now live', doc: page.doc, body: page.body, seo: page.seo, at: page.updatedAt };
    }
    const v = await CmsVersion.findById(ref);
    if (!v || String(v.page) !== String(page._id)) return null;
    return { label: v.label, doc: v.doc, body: v.body, seo: v.seo, at: v.createdAt, by: v.createdBy };
  };

  const from = await loadSide(req.query.from, 'Earlier');
  const to = await loadSide(req.query.to, 'Now live');
  if (!from || !to) return res.status(404).json({ message: 'Version not found' });

  res.json({ from, to, changes: E.diffContent(from, to) });
}));

router.post('/pages', writeLimit, asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  const body = req.body || {};

  // Derive a slug from the title when none was given, and make it unique
  // rather than rejecting — the merchant asked for a page, not a puzzle.
  if (!body.slug) body.slug = await E.uniqueSlug(body.title, cfg);

  const errs = await validatePage(body, cfg);
  if (errs.length) return res.status(400).json({ message: errs[0].message, errors: errs });

  if (body.seo?.structuredData !== undefined) {
    body.seo.structuredData = E.validateStructuredData(body.seo.structuredData).value;
  }

  /* Always created as a draft, whatever the request says. Publishing is a
     separate, deliberate action. */
  const page = await CmsPage.create({
    ...body,
    slug: E.checkSlug(body.slug, cfg).slug,
    status: 'draft',
    publishedAt: null,
    locked: false,
    createdBy: req.user?.email || '',
    updatedBy: req.user?.email || '',
  });

  res.status(201).json({ page: { ...page.toObject(), state: page.liveState() } });
}));

router.put('/pages/:id', writeLimit, asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  const page = await CmsPage.findById(req.params.id);
  if (!page) return res.status(404).json({ message: 'Not found' });

  const body = req.body || {};
  const errs = await validatePage(body, cfg, { id: page._id });
  if (errs.length) return res.status(400).json({ message: errs[0].message, errors: errs });

  /* SLUG MANAGER.
     Renaming silently breaks every existing link — a saved WhatsApp message, a
     Google result, an influencer's bio. When the address changes we leave a
     301 behind so the old one keeps working. This is the single feature that
     separates a CMS from a text box. */
  const nextSlug = body.slug ? E.checkSlug(body.slug, cfg).slug : page.slug;
  if (nextSlug !== page.slug && cfg.autoRedirectOnRename) {
    try {
      await Redirect.findOneAndUpdate(
        { from: page.slug },
        { $set: { to: `/${nextSlug}`, code: 301, active: true, auto: true, note: `Renamed from ${page.slug}`, createdBy: req.user?.email || '' } },
        { upsert: true },
      );
      // A chain (a → b → c) resolves in one hop after this, rather than
      // bouncing the browser twice.
      await Redirect.updateMany({ to: `/${page.slug}`, auto: true }, { $set: { to: `/${nextSlug}` } });
    } catch (e) {
      console.error('redirect creation failed:', e.message);
    }
  }

  const PROTECTED = ['_id', 'createdBy', 'publishedAt', 'locked', 'createdAt', 'updatedAt', '__v'];
  for (const [k, v] of Object.entries(body)) {
    if (PROTECTED.includes(k)) continue;
    if (k === 'slug') { page.slug = nextSlug; continue; }
    if (k === 'seo' && v?.structuredData !== undefined) {
      page.seo = { ...v, structuredData: E.validateStructuredData(v.structuredData).value };
      continue;
    }
    page[k] = v;
  }
  page.hasDraft = !!(page.draft || page.draftBody);
  page.updatedBy = req.user?.email || '';
  await page.save();

  res.json({ page: { ...page.toObject(), state: page.liveState() } });
}));

/**
 * Publish. Promotes the draft, snapshots a version, prunes old ones.
 *
 * The snapshot is taken of what is being published, so "restore" always
 * returns something that was genuinely live at some point.
 */
router.post('/pages/:id/publish', writeLimit, asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  const page = await CmsPage.findById(req.params.id);
  if (!page) return res.status(404).json({ message: 'Not found' });

  if (cfg.requireSeoTitle && !String(page.seo?.title || '').trim()) {
    return res.status(400).json({ field: 'seo.title', message: 'Add an SEO title before publishing' });
  }

  if (page.draft) page.doc = page.draft;
  if (page.draftBody) page.body = page.draftBody;
  page.draft = null;
  page.draftBody = '';
  page.hasDraft = false;

  const when = req.body?.publishAt ? new Date(req.body.publishAt) : null;
  if (when && when > new Date()) {
    page.status = 'scheduled';
    page.publishAt = when;
  } else {
    page.status = 'published';
    page.publishAt = null;
    page.publishedAt = new Date();
  }
  if (req.body?.unpublishAt !== undefined) {
    page.unpublishAt = req.body.unpublishAt ? new Date(req.body.unpublishAt) : null;
  }
  page.updatedBy = req.user?.email || '';
  await page.save();

  try {
    await CmsVersion.create({
      page: page._id,
      pageSlug: page.slug,
      pageTitle: page.title,
      label: req.body?.label || `Published ${new Date().toLocaleDateString('en-GB')}`,
      doc: page.doc,
      body: page.body,
      seo: page.seo,
      createdBy: req.user?.email || '',
    });
    // Keep the newest N. Unbounded history is a slow leak nobody notices.
    const keep = Math.max(5, Number(cfg.maxVersions) || 30);
    const old = await CmsVersion.find({ page: page._id }).sort({ createdAt: -1 }).skip(keep).select('_id');
    if (old.length) await CmsVersion.deleteMany({ _id: { $in: old.map((v) => v._id) } });
  } catch (e) {
    // A snapshot failure must not undo a successful publish.
    console.error('version snapshot failed:', e.message);
  }

  res.json({ page: { ...page.toObject(), state: page.liveState() } });
}));

router.post('/pages/:id/unpublish', writeLimit, asyncHandler(async (req, res) => {
  const page = await CmsPage.findById(req.params.id);
  if (!page) return res.status(404).json({ message: 'Not found' });
  page.status = 'draft';
  page.publishAt = null;
  page.updatedBy = req.user?.email || '';
  await page.save();
  res.json({ page: { ...page.toObject(), state: page.liveState() } });
}));

/** Restore a version — as a DRAFT. An accidental restore must not change what
 *  a customer is currently reading. */
router.post('/pages/:id/restore/:versionId', writeLimit, asyncHandler(async (req, res) => {
  const page = await CmsPage.findById(req.params.id);
  if (!page) return res.status(404).json({ message: 'Not found' });
  const v = await CmsVersion.findById(req.params.versionId);
  if (!v || String(v.page) !== String(page._id)) return res.status(404).json({ message: 'Version not found' });

  page.draft = v.doc;
  page.draftBody = v.body || '';
  page.hasDraft = true;
  page.updatedBy = req.user?.email || '';
  await page.save();

  res.json({ ok: true, restoredAs: 'draft', page: { ...page.toObject(), state: page.liveState() } });
}));

router.delete('/pages/:id', writeLimit, asyncHandler(async (req, res) => {
  const page = await CmsPage.findById(req.params.id);
  if (!page) return res.status(404).json({ message: 'Not found' });
  if (page.locked) {
    return res.status(400).json({ message: 'This page is part of the shop and cannot be deleted. Unpublish it instead.' });
  }
  await CmsPage.deleteOne({ _id: page._id });
  await CmsVersion.deleteMany({ page: page._id });
  res.json({ ok: true });
}));

/** Bulk. A seasonal set of landing pages is published and retired together. */
router.post('/pages/bulk', writeLimit, asyncHandler(async (req, res) => {
  const ids = (req.body?.ids || []).filter((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
  const action = String(req.body?.action || '');
  if (!ids.length) return res.status(400).json({ message: 'Select at least one page' });

  if (action === 'delete') {
    const r = await CmsPage.deleteMany({ _id: { $in: ids }, locked: { $ne: true } });
    await CmsVersion.deleteMany({ page: { $in: ids } });
    return res.json({ ok: true, affected: r.deletedCount });
  }
  const map = {
    publish: { status: 'published', publishedAt: new Date(), publishAt: null },
    unpublish: { status: 'draft', publishAt: null },
    archive: { status: 'archived' },
  };
  if (!map[action]) return res.status(400).json({ message: 'Unknown action' });
  const r = await CmsPage.updateMany({ _id: { $in: ids } }, { $set: map[action] });
  res.json({ ok: true, affected: r.modifiedCount });
}));

/* ---- Slug helper: what would this title become? ---- */
router.post('/slug', asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  const slug = await E.uniqueSlug(req.body?.title || '', cfg, req.body?.excludeId || null);
  res.json({ slug });
}));

/**
 * BROKEN LINK CHECK.
 *
 * A merchant links "size guide" in the footer, later renames the page, and the
 * footer link now 404s. The rename leaves a 301 so the link still WORKS, but a
 * link that only works via a redirect is a link that will break the day someone
 * tidies the redirect table. This reports both cases separately.
 *
 * Checks internal targets only. Pinging external URLs from a serverless
 * function would be slow, flaky and occasionally look like abuse.
 */
router.get('/links/check', asyncHandler(async (req, res) => {
  const cfg = await E.cmsConfig();
  const [pages, redirects] = await Promise.all([
    CmsPage.find({}).select('title slug status publishAt unpublishAt showInFooter showInHeader navLabel seo').lean(),
    Redirect.find({ active: true }).select('from to').lean(),
  ]);

  const now = new Date();
  const liveSlugs = new Set();
  for (const p of pages) {
    if (p.status === 'draft' || p.status === 'archived') continue;
    if (p.publishAt && now < new Date(p.publishAt)) continue;
    if (p.unpublishAt && now > new Date(p.unpublishAt)) continue;
    liveSlugs.add(p.slug);
  }

  // Routes the app itself owns. Reserved slugs plus the real storefront paths.
  const APP_ROUTES = new Set([
    '', 'shop', 'women', 'men', 'new', 'best', 'sale', 'cart', 'checkout', 'track',
    'fit-finder', 'wishlist', 'search', 'rewards', 'compare', 'account', 'faq',
    'privacy', 'terms', 'returns', 'shipping-policy', 'reset-password', 'verify-email',
    ...(cfg.slug?.reserved || []),
  ]);
  const redirectFrom = new Map(redirects.map((r) => [r.from, r.to]));

  const classify = (href) => {
    const raw = String(href || '').trim();
    if (!raw) return { state: 'empty' };
    if (/^(https?:)?\/\//i.test(raw) || /^(mailto|tel):/i.test(raw)) return { state: 'external' };
    const path = raw.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '').toLowerCase();
    if (!path) return { state: 'ok' };                       // "/" is home
    const first = path.split('/')[0];
    if (APP_ROUTES.has(first)) return { state: 'ok' };       // a real app route
    if (liveSlugs.has(path)) return { state: 'ok' };         // a live CMS page
    if (redirectFrom.has(path)) return { state: 'redirected', to: redirectFrom.get(path) };
    // A page that exists but is not live is a different problem from a typo.
    const exists = pages.find((p) => p.slug === path);
    if (exists) return { state: 'not-live', status: exists.status };
    return { state: 'broken' };
  };

  const findings = [];

  // 1. Footer/header columns configured in settings.
  try {
    const Settings = require('../models/Settings');
    const st = (await Settings.findOne({ key: 'store' }).lean()) || {};
    for (const [i, col] of ((st.footer?.columns) || []).entries()) {
      for (const l of col.links || []) {
        const r = classify(l?.href);
        if (['broken', 'redirected', 'not-live', 'empty'].includes(r.state)) {
          findings.push({ where: `Footer column ${i + 1}`, label: l?.label || '(no label)', href: l?.href || '', ...r });
        }
      }
    }
  } catch (e) { console.error('link check: settings failed:', e.message); }

  // 2. Canonical URLs pointing at addresses that do not exist.
  for (const p of pages) {
    const c = p.seo?.canonical;
    if (!c) continue;
    const r = classify(c);
    if (['broken', 'not-live'].includes(r.state)) {
      findings.push({ where: `Page "${p.title}" canonical`, label: p.title, href: c, ...r });
    }
  }

  // 3. Redirects that point somewhere that does not exist — the note on the old
  //    door sends people to another empty room.
  for (const r0 of redirects) {
    const r = classify(r0.to);
    if (['broken', 'not-live'].includes(r.state)) {
      findings.push({ where: `Redirect from /${r0.from}`, label: r0.from, href: r0.to, ...r });
    }
  }

  res.json({
    checked: { pages: pages.length, redirects: redirects.length },
    livePages: liveSlugs.size,
    findings,
    ok: findings.filter((f) => f.state === 'broken').length === 0,
  });
}));

/* ---------------------------------------------------------------------------
 * REDIRECTS
 * ------------------------------------------------------------------------- */
router.get('/redirects', asyncHandler(async (req, res) => {
  const rows = await Redirect.find({}).sort({ createdAt: -1 }).limit(500);
  res.json({ redirects: rows });
}));

router.post('/redirects', writeLimit, asyncHandler(async (req, res) => {
  const from = String(req.body?.from || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  const to = String(req.body?.to || '').trim();
  if (!from) return res.status(400).json({ field: 'from', message: 'Enter the old address' });
  if (!to) return res.status(400).json({ field: 'to', message: 'Enter where it should go' });
  if (`/${from}` === to || from === to.replace(/^\//, '')) {
    return res.status(400).json({ field: 'to', message: 'A page cannot redirect to itself' });
  }
  // A → B → A bounces the browser forever.
  const reverse = await Redirect.findOne({ from: to.replace(/^\//, ''), active: true });
  if (reverse && reverse.to.replace(/^\//, '') === from) {
    return res.status(400).json({ field: 'to', message: 'That would create a loop — the other address already points back here' });
  }

  const r = await Redirect.findOneAndUpdate(
    { from },
    { $set: { to, code: Number(req.body?.code) || 301, active: req.body?.active !== false, auto: false, note: String(req.body?.note || '').slice(0, 200), createdBy: req.user?.email || '' } },
    { upsert: true, new: true },
  );
  res.status(201).json({ redirect: r });
}));

router.delete('/redirects/:id', writeLimit, asyncHandler(async (req, res) => {
  const r = await Redirect.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
}));

module.exports = router;
