const mongoose = require('mongoose');

/**
 * A CMS page.
 *
 * WHY A NEW MODEL RATHER THAN EXTENDING Theme
 *
 * The Theme model already holds a page tree, a draft, a publish step and
 * version history — but it is deliberately a SINGLE document keyed 'main'.
 * Its whole API assumes one homepage: getTheme() reads one row, versions are
 * filtered by key:'main', and the editor autosaves into one draft slot.
 *
 * A CMS needs many pages, each with its own slug, SEO block, schedule and
 * history. Bending Theme into that means every existing call site has to learn
 * about page ids, and the homepage — the one thing already working — is the
 * first thing at risk.
 *
 * So: same SHAPE (a `doc` tree of sections, drafts, publish), separate
 * collection. The frontend section registry is reused unchanged, which is the
 * part that actually matters for "no duplicated code" — a section written for
 * the theme editor renders on a CMS page with no new code.
 *
 * MEASURED GAP THIS FILLS
 *   /privacy /terms /returns /shipping-policy all render from a hardcoded DOCS
 *   object in frontend/src/pages/Legal.jsx. The merchant cannot change a word
 *   of their own returns policy without a developer.
 */

/* Open-ended on purpose: the section tree's shape is defined by the client-side
   registry, and pinning it here would mean a schema migration every time a new
   section type is added. Validation of the tree happens in the route. */
const TYPES = ['page', 'landing', 'legal', 'home'];
const STATUSES = ['draft', 'published', 'scheduled', 'archived'];

const seoSchema = new mongoose.Schema({
  title:       { type: String, default: '' },
  description: { type: String, default: '' },
  keywords:    { type: [String], default: [] },
  canonical:   { type: String, default: '' },
  noIndex:     { type: Boolean, default: false },
  noFollow:    { type: Boolean, default: false },

  // OpenGraph / social. Falls back to the SEO fields when blank, resolved at
  // read time rather than duplicated on save — a merchant who edits the title
  // should not have to remember to edit the OG title too.
  ogTitle:       { type: String, default: '' },
  ogDescription: { type: String, default: '' },
  ogImage:       { type: String, default: '' },
  ogType:        { type: String, default: 'website' },
  twitterCard:   { type: String, default: 'summary_large_image' },

  /* Structured data. Stored as the merchant's own JSON-LD object so a page can
     carry an FAQPage, Article or BreadcrumbList without this schema having to
     know every schema.org type that exists. Validated as JSON on save. */
  structuredData: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const cmsPageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  /* The URL. Unique across all pages, lowercase, no leading slash. The slug
     manager in the route owns collision handling and history. */
  slug:  { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  type:  { type: String, enum: TYPES, default: 'page', index: true },

  /* ---- Content -------------------------------------------------------
   * `doc` is the same section-tree shape the Theme editor produces, so the
   * existing registry, renderer and inspector all work on it untouched.
   * `body` is a plain-text/markdown fallback for simple legal pages that do
   * not need a builder — the returns policy is prose, not a layout. */
  doc:  { type: mongoose.Schema.Types.Mixed, default: null },
  body: { type: String, default: '' },
  excerpt: { type: String, default: '' },

  /* ---- Draft / published ---------------------------------------------
   * Two copies, exactly like Theme: `doc` is what the storefront serves and
   * `draft` is what the editor autosaves into. Editing a live page must never
   * change what a customer is reading mid-session. */
  draft:     { type: mongoose.Schema.Types.Mixed, default: null },
  draftBody: { type: String, default: '' },
  hasDraft:  { type: Boolean, default: false },

  status: { type: String, enum: STATUSES, default: 'draft', index: true },
  /* Scheduling. Serverless has no dependable cron, so a page's live state is
     computed on read — the same decision the promotion engine made and for the
     same reason. publishAt in the future means "not yet"; unpublishAt in the
     past means "expired". */
  publishAt:   { type: Date, default: null },
  unpublishAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },

  seo: { type: seoSchema, default: () => ({}) },

  /* ---- Placement ------------------------------------------------------ */
  showInFooter: { type: Boolean, default: false },
  showInHeader: { type: Boolean, default: false },
  navLabel:     { type: String, default: '' },
  sortOrder:    { type: Number, default: 100 },
  /* NAVIGATION GROUP.
     A heading to file this link under — "Help", "Company", "Guides". Empty
     means ungrouped, which is what every page created before this field
     existed will read as, so nothing moves when this ships.

     Deliberately a free-text STRING and not a reference to a Group model:
     a merchant with four footer links does not need a second screen to manage
     three headings, and typing the same word twice is how the grouping is
     expressed. The server groups by exact string. A model here would be the
     kind of technical debt that looks like architecture. */
  navGroup:     { type: String, default: '', trim: true, maxlength: 40 },

  /* ---- Audit ---------------------------------------------------------- */
  createdBy: { type: String, default: '' },
  updatedBy: { type: String, default: '' },
  /* A page the merchant cannot delete, because a route in the app points at
     it. Set by the seeder, never by the API. */
  locked: { type: Boolean, default: false },
}, { timestamps: true, minimize: false });

cmsPageSchema.index({ status: 1, publishAt: 1, unpublishAt: 1 });
cmsPageSchema.index({ type: 1, sortOrder: 1 });
cmsPageSchema.index({ showInFooter: 1, sortOrder: 1 });
cmsPageSchema.index({ showInHeader: 1, sortOrder: 1 });

/**
 * Is this page actually live right now?
 *
 * Returns the REASON as well as the answer, so an admin list can distinguish
 * "draft" from "scheduled for Friday" from "expired last week". A bare boolean
 * makes those three look identical, which is the same mistake the promotion
 * list avoided by returning liveState().
 */
cmsPageSchema.methods.liveState = function liveState(at = new Date()) {
  if (this.status === 'archived') return { live: false, reason: 'archived' };
  if (this.status === 'draft') return { live: false, reason: 'draft' };
  if (this.publishAt && at < this.publishAt) return { live: false, reason: 'scheduled' };
  if (this.unpublishAt && at > this.unpublishAt) return { live: false, reason: 'expired' };
  if (this.status === 'scheduled' && !this.publishAt) return { live: false, reason: 'scheduled' };
  return { live: true, reason: 'live' };
};

module.exports = mongoose.model('CmsPage', cmsPageSchema);
module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
