/* ============================================================================
 * CMS ENGINE
 *
 * Everything the CMS routes need that is not an HTTP concern: slug handling,
 * document validation, the section registry, SEO resolution and the schedule
 * check.
 *
 * MEASURED BEFORE WRITING THIS
 *
 *   /api/cms /api/pages /api/content /api/redirects   -> all 404
 *   settings.cms / settings.seo                       -> absent
 *   Theme model                                       -> exists, but is a
 *     SINGLE document keyed 'main' with one draft slot; every call site
 *     assumes one homepage
 *   /privacy /terms /returns /shipping-policy         -> render from a
 *     hardcoded DOCS object in frontend/src/pages/Legal.jsx, so the merchant
 *     cannot edit their own returns policy
 *
 * The section tree shape is deliberately identical to the Theme editor's, so
 * the existing client registry, renderer and inspector work on a CMS page
 * without a line of new rendering code.
 * ========================================================================== */

const DEFAULTS = {
  enabled: true,

  // ---- Publishing ------------------------------------------------------
  defaultStatus: 'draft',        // never publish on create
  requireSeoTitle: false,
  autoRedirectOnRename: true,    // the whole point of the slug manager
  maxVersions: 30,               // per page, oldest pruned on publish

  // ---- Slugs -----------------------------------------------------------
  slug: {
    lowercase: true,
    maxLength: 80,
    // Slugs that would shadow a real application route. Serving a CMS page at
    // /cart would break the shop in a way that looks like a caching bug.
    reserved: [
      'admin', 'api', 'cart', 'checkout', 'account', 'shop', 'search', 'product',
      'category', 'collection', 'wishlist', 'compare', 'rewards', 'track',
      'order', 'sale', 'new', 'best', 'men', 'women', 'fit-finder',
      'reset-password', 'verify-email', '__theme-preview',
    ],
  },

  // ---- SEO defaults ----------------------------------------------------
  seo: {
    titleTemplate: '%s · HUSHAE',
    defaultDescription: '',
    defaultOgImage: '',
    twitterHandle: '',
    // A page with no explicit robots directive inherits this.
    defaultNoIndex: false,
  },

  // ---- Structured data -------------------------------------------------
  structuredData: {
    enabled: true,
    organisation: true,   // emit an Organization block site-wide
    breadcrumbs: true,
  },
};

/* Settings are read on every page fetch, so they are cached the same way the
   search and promotion engines cache theirs — measured there at ~600ms for an
   uncached settings read. */
const CACHE_MS = 60000;
let _cache = { at: 0, doc: null };

async function cmsConfig() {
  try {
    const now = Date.now();
    if (!_cache.doc || now - _cache.at >= CACHE_MS) {
      const Settings = require('../models/Settings');
      _cache = { at: now, doc: (await Settings.findOne({ key: 'store' }).lean()) || {} };
    }
    const saved = _cache.doc.cms || {};
    const out = { ...DEFAULTS, ...saved };
    for (const g of ['slug', 'seo', 'structuredData']) out[g] = { ...DEFAULTS[g], ...(saved[g] || {}) };
    if (!Array.isArray(out.slug.reserved)) out.slug.reserved = DEFAULTS.slug.reserved;
    return out;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function invalidateCache() { _cache = { at: 0, doc: null }; }

/* ---------------------------------------------------------------------------
 * SLUGS
 * ------------------------------------------------------------------------- */

/** Fold a title into a URL-safe slug. Accents stripped, not dropped. */
function slugify(input, max = 80) {
  return String(input || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)
    .replace(/-$/, '');
}

/**
 * Is this slug allowed?
 *
 * Reserved words are checked on the FIRST SEGMENT only: "shop" is refused
 * because /shop is a real route, but "shop-guide" is fine and refusing it
 * would be baffling.
 */
function checkSlug(slug, cfg) {
  const raw = String(slug || '').trim();
  if (!raw) return { ok: false, message: 'A page needs a web address' };

  /* MEASURED BUG: this lowercased BEFORE testing, so the case rule could never
     fire — "Privacy" was silently accepted and stored as "privacy". Harmless
     for the stored value, but the merchant pastes the address they typed into
     an ad, and any redirect they set up for "Privacy" would never match. A URL
     that quietly differs from what was entered is worth one sentence. */
  if (/[A-Z]/.test(raw)) {
    return { ok: false, message: `Web addresses are lowercase — use "${raw.toLowerCase()}"`, suggestion: raw.toLowerCase() };
  }

  const s = raw.toLowerCase();
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(s)) {
    return { ok: false, message: 'Use lowercase letters, numbers and hyphens only' };
  }
  if (s.length > (cfg.slug.maxLength || 80)) {
    return { ok: false, message: `Keep the address under ${cfg.slug.maxLength} characters` };
  }
  const first = s.split('/')[0];
  if ((cfg.slug.reserved || []).includes(first)) {
    return { ok: false, message: `"${first}" is used by the shop itself — choose another address` };
  }
  return { ok: true, slug: s };
}

/** Find a free slug by appending -2, -3… Used when a title collides. */
async function uniqueSlug(base, cfg, excludeId = null) {
  const CmsPage = require('../models/CmsPage');
  let candidate = slugify(base, cfg.slug.maxLength);
  if (!candidate) candidate = 'page';
  for (let i = 1; i < 100; i += 1) {
    const test = i === 1 ? candidate : `${candidate}-${i}`;
    const where = { slug: test };
    if (excludeId) where._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const clash = await CmsPage.exists(where);
    if (!clash) return test;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}

/* ---------------------------------------------------------------------------
 * DOCUMENT VALIDATION
 *
 * The tree is Mixed in the schema because its shape is owned by the client
 * registry. That does NOT mean anything goes: an unbounded nested object from
 * a request is a denial-of-service waiting to happen, and a section with no
 * type crashes the renderer.
 * ------------------------------------------------------------------------- */
const MAX_SECTIONS = 60;
const MAX_BLOCKS_PER_SECTION = 40;
const MAX_DEPTH = 6;
const MAX_DOC_BYTES = 512 * 1024;

function validateDoc(doc) {
  if (doc == null) return { ok: true };
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, message: 'Page content must be an object' };
  }

  let bytes = 0;
  try { bytes = Buffer.byteLength(JSON.stringify(doc)); } catch {
    return { ok: false, message: 'Page content could not be read — it may contain a loop' };
  }
  if (bytes > MAX_DOC_BYTES) {
    return { ok: false, message: `Page content is too large (${Math.round(bytes / 1024)} KB, limit ${MAX_DOC_BYTES / 1024} KB)` };
  }

  const sections = doc.sections;
  if (sections !== undefined) {
    if (!Array.isArray(sections)) return { ok: false, message: 'Page sections must be a list' };
    if (sections.length > MAX_SECTIONS) {
      return { ok: false, message: `Too many sections (${sections.length}, limit ${MAX_SECTIONS})` };
    }
    for (const s of sections) {
      if (!s || typeof s !== 'object') return { ok: false, message: 'A section is malformed' };
      if (!s.type || typeof s.type !== 'string') return { ok: false, message: 'Every section needs a type' };
      if (Array.isArray(s.blocks) && s.blocks.length > MAX_BLOCKS_PER_SECTION) {
        return { ok: false, message: `Section "${s.type}" has too many blocks (limit ${MAX_BLOCKS_PER_SECTION})` };
      }
    }
  }

  // Depth guard: a deeply nested payload can blow the stack during render.
  const depthOf = (node, d = 0) => {
    if (d > MAX_DEPTH || !node || typeof node !== 'object') return d;
    let max = d;
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') max = Math.max(max, depthOf(v, d + 1));
      if (max > MAX_DEPTH) return max;
    }
    return max;
  };
  if (depthOf(doc) > MAX_DEPTH) {
    return { ok: false, message: 'Page content is nested too deeply' };
  }

  return { ok: true };
}

/** Structured data must be valid JSON-LD-ish, not an arbitrary blob. */
function validateStructuredData(sd) {
  if (sd == null || sd === '') return { ok: true, value: null };
  let obj = sd;
  if (typeof sd === 'string') {
    try { obj = JSON.parse(sd); } catch { return { ok: false, message: 'Structured data is not valid JSON' }; }
  }
  if (typeof obj !== 'object') return { ok: false, message: 'Structured data must be a JSON object' };
  const bytes = Buffer.byteLength(JSON.stringify(obj));
  if (bytes > 32 * 1024) return { ok: false, message: 'Structured data is too large' };
  if (!Array.isArray(obj) && !obj['@type'] && !obj['@graph']) {
    return { ok: false, message: 'Structured data needs an @type (e.g. "FAQPage")' };
  }
  return { ok: true, value: obj };
}

/* ---------------------------------------------------------------------------
 * SEO RESOLUTION
 *
 * OG fields fall back to the SEO fields, which fall back to the page title and
 * the store defaults. Resolved at READ time, never copied on save — a merchant
 * who edits the title should not have to remember to edit the OG title too.
 * ------------------------------------------------------------------------- */
function resolveSeo(page, cfg, storeSettings = {}) {
  const s = page.seo || {};
  const title = s.title || page.title || '';
  const template = cfg.seo?.titleTemplate || '%s';
  const description = s.description || page.excerpt || cfg.seo?.defaultDescription || '';

  return {
    title,
    fullTitle: template.includes('%s') ? template.replace('%s', title) : title,
    description,
    keywords: s.keywords || [],
    canonical: s.canonical || `/${page.slug}`,
    robots: [
      s.noIndex || cfg.seo?.defaultNoIndex ? 'noindex' : 'index',
      s.noFollow ? 'nofollow' : 'follow',
    ].join(','),
    og: {
      title: s.ogTitle || title,
      description: s.ogDescription || description,
      image: s.ogImage || cfg.seo?.defaultOgImage || storeSettings.ogImage || '',
      type: s.ogType || 'website',
      url: s.canonical || `/${page.slug}`,
    },
    twitter: {
      card: s.twitterCard || 'summary_large_image',
      site: cfg.seo?.twitterHandle || '',
    },
    structuredData: s.structuredData || null,
  };
}

/* ---------------------------------------------------------------------------
 * SECTION REGISTRY (server side)
 *
 * The client registry in frontend/src/theme-editor/core/registry.ts is the
 * source of truth for how a section RENDERS. This is the server's list of what
 * a section IS — used to validate a saved tree and to tell the admin which
 * sections exist without shipping the whole editor bundle.
 *
 * Kept as data, not code, so adding a section is one entry.
 * ------------------------------------------------------------------------- */
const SECTION_TYPES = [
  { type: 'hero', label: 'Hero banner', category: 'Header', maxPerPage: 2 },
  { type: 'richText', label: 'Text block', category: 'Content', maxPerPage: 0 },
  { type: 'imageText', label: 'Image with text', category: 'Content', maxPerPage: 0 },
  { type: 'productList', label: 'Product row', category: 'Products', maxPerPage: 0 },
  { type: 'collectionGrid', label: 'Collection tiles', category: 'Products', maxPerPage: 0 },
  { type: 'faq', label: 'Questions', category: 'Content', maxPerPage: 0 },
  { type: 'gallery', label: 'Image gallery', category: 'Media', maxPerPage: 0 },
  { type: 'banner', label: 'Promo banner', category: 'Marketing', maxPerPage: 0 },
  { type: 'newsletter', label: 'Newsletter signup', category: 'Marketing', maxPerPage: 1 },
  { type: 'trustRow', label: 'Trust badges', category: 'Marketing', maxPerPage: 1 },
  { type: 'spacer', label: 'Spacer', category: 'Layout', maxPerPage: 0 },
];

const sectionByType = (t) => SECTION_TYPES.find((s) => s.type === t) || null;

module.exports = {
  DEFAULTS, cmsConfig, invalidateCache,
  slugify, checkSlug, uniqueSlug,
  validateDoc, validateStructuredData, resolveSeo,
  SECTION_TYPES, sectionByType,
  MAX_SECTIONS, MAX_BLOCKS_PER_SECTION, MAX_DOC_BYTES,
};
