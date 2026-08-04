const express = require('express');
const { asyncHandler, slugify } = require('../utils/helpers');
const { protect, adminOnly } = require('../middleware/auth');
const BlogPost = require('../models/BlogPost');

const router = express.Router();

const PUBLIC_SELECT = 'title slug excerpt coverImage coverAlt author tags status publishAt seo viewCount createdAt updatedAt';

/* ============================================================================
 * ADMIN — full CRUD. All routes behind protect + adminOnly.
 *
 * ORDER MATTERS: every /admin route is defined BEFORE the public /:slug route
 * below, or Express would match "admin" as a slug and hand the request to the
 * public single-post handler. Same rule the CMS routes follow.
 * ========================================================================== */

/** GET /api/blog/admin — all posts (any status) with pagination + search. */
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '').trim();

  const filter = {};
  if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { slug: { $regex: q, $options: 'i' } }];
  if (status && ['draft', 'published', 'scheduled', 'archived'].includes(status)) filter.status = status;

  const [total, posts] = await Promise.all([
    BlogPost.countDocuments(filter),
    BlogPost.find(filter)
      .select('title slug excerpt coverImage status publishAt author tags seo viewCount updatedAt createdAt updatedByName')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({ posts, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

/** GET /api/blog/admin/:id — one post for the editor. */
router.get('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Article not found' });
  res.json({ post });
}));

/** POST /api/blog/admin — create. Slug auto-generated when blank. */
router.post('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const { title = '', slug = '', excerpt = '', content = '', coverImage = '', coverAlt = '',
    author = '', tags = [], status = 'draft', publishAt = null, seo = {} } = req.body || {};

  if (!String(title).trim()) return res.status(400).json({ message: 'Title is required' });

  let finalSlug = String(slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!finalSlug) finalSlug = slugify(title);
  if (!finalSlug) return res.status(400).json({ message: 'A valid slug is required' });

  // Slug collision → 409, never silently overwrite another article.
  const exists = await BlogPost.findOne({ slug: finalSlug });
  if (exists) return res.status(409).json({ message: 'An article with this slug already exists — try a different slug' });

  const post = await BlogPost.create({
    title: String(title).trim(),
    slug: finalSlug,
    excerpt: String(excerpt || ''),
    content: String(content || ''),
    coverImage: String(coverImage || ''),
    coverAlt: String(coverAlt || ''),
    author: String(author || ''),
    tags: Array.isArray(tags) ? tags.map(String).filter(Boolean) : [],
    status: ['draft', 'published', 'scheduled', 'archived'].includes(status) ? status : 'draft',
    publishAt: publishAt ? new Date(publishAt) : null,
    seo: seo && typeof seo === 'object' ? seo : {},
    updatedByName: req.user?.name || req.user?.email || '',
  });

  res.status(201).json({ post });
}));

/** PUT /api/blog/admin/:id — update. */
router.put('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Article not found' });

  const { title, slug, excerpt, content, coverImage, coverAlt,
    author, tags, status, publishAt, seo } = req.body || {};

  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  if (slug !== undefined) {
    let finalSlug = String(slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    if (!finalSlug) finalSlug = slugify(post.title);
    if (finalSlug && finalSlug !== post.slug) {
      const clash = await BlogPost.findOne({ slug: finalSlug, _id: { $ne: post._id } });
      if (clash) return res.status(409).json({ message: 'An article with this slug already exists' });
      post.slug = finalSlug;
    }
  }

  if (title !== undefined) post.title = String(title).trim();
  if (excerpt !== undefined) post.excerpt = String(excerpt || '');
  if (content !== undefined) post.content = String(content || '');
  if (coverImage !== undefined) post.coverImage = String(coverImage || '');
  if (coverAlt !== undefined) post.coverAlt = String(coverAlt || '');
  if (author !== undefined) post.author = String(author || '');
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags.map(String).filter(Boolean) : [];
  if (status !== undefined && ['draft', 'published', 'scheduled', 'archived'].includes(status)) {
    post.status = status;
    if (status === 'archived') post.archivedAt = new Date();
  }
  if (publishAt !== undefined) post.publishAt = publishAt ? new Date(publishAt) : null;
  if (seo !== undefined && seo && typeof seo === 'object') post.seo = { ...(post.seo || {}), ...seo };
  post.updatedByName = req.user?.name || req.user?.email || '';

  await post.save();
  res.json({ post });
}));

/** DELETE /api/blog/admin/:id — delete. */
router.delete('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Article not found' });
  await post.deleteOne();
  res.json({ ok: true });
}));

/* ============================================================================
 * PUBLIC — a shopper gets live posts and nothing else. Drafts and scheduled
 * articles are invisible unless the request carries a valid admin token in
 * ?preview= (same pattern CmsPage uses — never trust the flag itself).
 * ========================================================================== */

/** GET /api/blog — published list. ?limit, ?tag= filter. */
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const tag = String(req.query.tag || '').trim();

  const now = new Date();
  const q = { status: { $in: ['published', 'scheduled'] } };
  if (tag) q.tags = tag;

  const rows = await BlogPost.find(q)
    .select(PUBLIC_SELECT)
    .sort({ publishAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  // A scheduled post is not live yet — drop it from the public list.
  const live = rows.filter((p) => {
    if (p.status === 'scheduled' && p.publishAt && now < new Date(p.publishAt)) return false;
    if (p.publishAt && now < new Date(p.publishAt)) return false;
    return true;
  });

  res.json({
    posts: live.map(({ viewCount, ...p }) => p),
    total: live.length,
  });
}));

/** GET /api/blog/:slug — one post. ?preview=<admin-jwt> for drafts. */
router.get('/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  const post = await BlogPost.findOne({ slug });
  if (!post) return res.status(404).json({ message: 'Article not found' });

  let wantsDraft = false;
  if (req.query.preview) {
    try {
      const jwt = require('jsonwebtoken');
      const config = require('../config');
      const decoded = jwt.verify(String(req.query.preview), config.jwtSecret);
      const User = require('../models/User');
      const u = await User.findById(decoded.id).select('role');
      wantsDraft = u?.role === 'admin';
    } catch { wantsDraft = false; }
  }

  if (!post.liveState().live && !wantsDraft) {
    return res.status(404).json({ message: 'Article not found' });
  }

  // Fire-and-forget view counter — a page view must never block the render.
  BlogPost.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } }).catch(() => {});

  res.json({ post });
}));

module.exports = router;
