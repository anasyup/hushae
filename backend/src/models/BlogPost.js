const mongoose = require('mongoose');

/**
 * A blog article.
 *
 * WHY A SEPARATE MODEL RATHER THAN A CMS PAGE
 *
 * CmsPage is a section-tree page builder — it exists so a merchant can
 * assemble homepage-style layouts without a developer. A blog post is the
 * opposite shape: one title, one body of text, one cover image, one author.
 * Forcing an article into the section-tree model would make the merchant
 * build every paragraph as a "block", which is hostile to writing.
 *
 * So the post body is Markdown. The storefront renders it with a small
 * dependency-free renderer (headings, bold, lists, links, images, quotes).
 *
 * Status flow mirrors products: draft → published (+ scheduled via publishAt)
 * → archived. Scheduled posts are not readable before publishAt, exactly like
 * CmsPage.liveState(), so a scheduled article can never leak early.
 */

const STATUSES = ['draft', 'published', 'scheduled', 'archived'];

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },

  /* URL slug. Unique. Auto-generated from the title if the merchant leaves it
     blank (the admin editor autofills it but lets them override). */
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

  /* One-line summary — shown in the /blog list and used as the meta
     description fallback when the SEO description is blank. */
  excerpt: { type: String, default: '' },

  /* Markdown body. Rendered by the storefront's tiny renderer. */
  content: { type: String, default: '' },

  /* Cover image — an upload id (/api/uploads/<id>) or a full URL. */
  coverImage: { type: String, default: '' },
  coverAlt: { type: String, default: '' },

  author: { type: String, default: '' },
  tags: { type: [String], default: [] },

  status: { type: String, enum: STATUSES, default: 'draft', index: true },
  publishAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },

  /* SEO block — same shape CmsPage uses, so the storefront Seo component can
     consume it without adaptation. */
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    canonical: { type: String, default: '' },
    noIndex: { type: Boolean, default: false },
    ogImage: { type: String, default: '' },
  },

  viewCount: { type: Number, default: 0 },

  /* The admin who last edited — free-text name snapshot, not a FK, so
     deleting a staff account never orphan-crashes an article list. */
  updatedByName: { type: String, default: '' },
}, { timestamps: true });

blogPostSchema.index({ status: 1, publishAt: -1, createdAt: -1 });
blogPostSchema.index({ tags: 1 });

/**
 * Is this post live right now? Mirrors CmsPage.liveState() so the public
 * route, the sitemap and the /blog list can never disagree with each other.
 */
blogPostSchema.methods.liveState = function liveState(now = new Date()) {
  if (this.status === 'archived') return { live: false, reason: 'archived' };
  if (this.publishAt && now < new Date(this.publishAt)) return { live: false, reason: 'scheduled' };
  if (this.status === 'published') return { live: true };
  if (this.status === 'scheduled') return { live: false, reason: 'scheduled' };
  return { live: false, reason: 'draft' };
};

module.exports = mongoose.model('BlogPost', blogPostSchema);
module.exports.BLOG_STATUSES = STATUSES;
