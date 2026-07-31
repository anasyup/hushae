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

  /* TWO DOCUMENT SHAPES REACH THIS FUNCTION.
   *
   *   { sections: [...] }                        the CMS's own flat shape
   *   { template, header[], body[], footer[] }   the Theme editor's shape,
   *                                              which the section builder
   *                                              produces because it reuses
   *                                              theme-editor/core/registry.ts
   *
   * MEASURED BUG, Sprint 2L P2B: this only ever read `doc.sections`, so every
   * theme-shaped document skipped section validation entirely — a section with
   * no `type` (which crashes the renderer) and 61 sections in one group both
   * came back { ok: true }. The byte, depth and circular guards still fired,
   * which is why it looked like validation was working.
   *
   * Collect the sections from whichever shape arrived, then apply one set of
   * rules to all of them. */
  const groups = [];
  if (doc.sections !== undefined) {
    if (!Array.isArray(doc.sections)) return { ok: false, message: 'Page sections must be a list' };
    groups.push(['sections', doc.sections]);
  }
  for (const g of ['header', 'body', 'footer']) {
    if (doc[g] === undefined) continue;
    if (!Array.isArray(doc[g])) return { ok: false, message: `Page ${g} must be a list` };
    groups.push([g, doc[g]]);
  }

  /* The limit is on the PAGE, not per group: 60 header + 60 body + 60 footer
     is 180 sections however it is counted. */
  const total = groups.reduce((n, [, list]) => n + list.length, 0);
  if (total > MAX_SECTIONS) {
    return { ok: false, message: `Too many sections (${total}, limit ${MAX_SECTIONS})` };
  }

  const countBlocks = (list) => (Array.isArray(list) ? list.length : 0);
  for (const [group, list] of groups) {
    for (const s of list) {
      if (!s || typeof s !== 'object') return { ok: false, message: 'A section is malformed' };
      if (!s.type || typeof s.type !== 'string') return { ok: false, message: 'Every section needs a type' };
      if (countBlocks(s.blocks) > MAX_BLOCKS_PER_SECTION) {
        return { ok: false, message: `Section "${s.type}" has too many blocks (limit ${MAX_BLOCKS_PER_SECTION})` };
      }
      /* Nested blocks carry the same requirement — a child with no type is the
         same crash one level down. Bounded by MAX_DEPTH below. */
      const walk = (blocks, depth) => {
        if (depth > MAX_DEPTH || !Array.isArray(blocks)) return null;
        for (const bnode of blocks) {
          if (!bnode || typeof bnode !== 'object') return 'A block is malformed';
          if (!bnode.type || typeof bnode.type !== 'string') return 'Every block needs a type';
          if (countBlocks(bnode.blocks) > MAX_BLOCKS_PER_SECTION) {
            return `A block in "${s.type}" has too many children (limit ${MAX_BLOCKS_PER_SECTION})`;
          }
          const deeper = walk(bnode.blocks, depth + 1);
          if (deeper) return deeper;
        }
        return null;
      };
      const blockProblem = walk(s.blocks, 0);
      if (blockProblem) return { ok: false, message: blockProblem };
      void group;
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
 * DIFF
 *
 * WHAT A MERCHANT NEEDS FROM A COMPARISON
 *   Not a character-level patch. "The heading changed" and "you deleted the
 *   product row" are the two questions actually being asked, and a red/green
 *   character diff of a JSON tree answers neither.
 *
 * So this reports CHANGES AS EVENTS, at the level a person edits at:
 *   section added / removed / moved / edited
 *   the writing changed (with a line count)
 *   an SEO field changed (with both values)
 *
 * Computed here rather than in the browser so the same answer is available to
 * anything else that needs it, and so a 1 MB pair of section trees is never
 * shipped to a phone just to render "1 section removed".
 * ------------------------------------------------------------------------- */

/** Pull sections out of either document shape, tagged with their group. */
function flattenSections(doc) {
  if (!doc || typeof doc !== 'object') return [];
  const out = [];
  if (Array.isArray(doc.sections)) doc.sections.forEach((s, i) => out.push({ ...s, __group: 'sections', __i: i }));
  for (const g of ['header', 'body', 'footer']) {
    if (Array.isArray(doc[g])) doc[g].forEach((s, i) => out.push({ ...s, __group: g, __i: i }));
  }
  return out;
}

const stable = (v) => { try { return JSON.stringify(v); } catch { return ''; } };

/** Human label for a section, best effort from its settings. */
function sectionLabel(s) {
  if (!s) return 'section';
  const t = sectionByType(s.type);
  const named = s.name || s.settings?.heading || s.settings?.title || s.settings?.text;
  const base = t?.label || s.type || 'Section';
  return named ? `${base} — "${String(named).slice(0, 40)}"` : base;
}

function diffContent(from, to) {
  const changes = [];

  /* ---- sections, matched by id where possible ---- */
  const a = flattenSections(from.doc);
  const b = flattenSections(to.doc);
  const byId = (list) => new Map(list.filter((s) => s.id).map((s) => [s.id, s]));
  const aMap = byId(a);
  const bMap = byId(b);

  for (const s of a) {
    if (!s.id) continue;
    if (!bMap.has(s.id)) changes.push({ kind: 'section-removed', label: sectionLabel(s), type: s.type });
  }
  for (const s of b) {
    if (!s.id) continue;
    const before = aMap.get(s.id);
    if (!before) { changes.push({ kind: 'section-added', label: sectionLabel(s), type: s.type }); continue; }
    if (before.__group !== s.__group || before.__i !== s.__i) {
      changes.push({ kind: 'section-moved', label: sectionLabel(s), type: s.type, from: before.__i + 1, to: s.__i + 1 });
    }
    if (stable({ ...before, __group: 0, __i: 0 }) !== stable({ ...s, __group: 0, __i: 0 })) {
      const hiddenChanged = !!before.hidden !== !!s.hidden;
      changes.push({
        kind: hiddenChanged ? (s.hidden ? 'section-hidden' : 'section-shown') : 'section-edited',
        label: sectionLabel(s), type: s.type,
      });
    }
  }

  /* Documents with no ids at all (hand-written JSON) still deserve an answer. */
  if (!a.some((s) => s.id) && !b.some((s) => s.id) && a.length !== b.length) {
    changes.push({ kind: 'section-count', from: a.length, to: b.length });
  }

  /* ---- the writing ---- */
  const ab = String(from.body || '');
  const bb = String(to.body || '');
  if (ab !== bb) {
    const lines = (t) => t.split('\n').filter((l) => l.trim()).length;
    changes.push({
      kind: 'body-changed',
      fromChars: ab.length, toChars: bb.length,
      fromLines: lines(ab), toLines: lines(bb),
    });
  }

  /* ---- SEO, field by field, because "SEO changed" is not actionable ---- */
  const SEO_LABELS = {
    title: 'Search title', description: 'Search description', canonical: 'Main address',
    noIndex: 'Hidden from Google', noFollow: 'Links not followed',
    ogTitle: 'Sharing title', ogDescription: 'Sharing description', ogImage: 'Sharing picture',
    ogType: 'Sharing kind', twitterCard: 'Twitter card', keywords: 'Keywords',
    structuredData: 'Extra information for Google',
  };
  const as = from.seo || {};
  const bs = to.seo || {};
  for (const [k, label] of Object.entries(SEO_LABELS)) {
    const av = as[k]; const bv = bs[k];
    if (stable(av ?? null) === stable(bv ?? null)) continue;
    const show = (v) => {
      if (v === undefined || v === null || v === '') return '(empty)';
      if (typeof v === 'boolean') return v ? 'yes' : 'no';
      if (Array.isArray(v)) return v.join(', ') || '(empty)';
      if (typeof v === 'object') return '(a block of data)';
      return String(v).slice(0, 80);
    };
    changes.push({ kind: 'seo-changed', field: k, label, from: show(av), to: show(bv) });
  }

  return changes;
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
  diffContent, flattenSections,
  MAX_SECTIONS, MAX_BLOCKS_PER_SECTION, MAX_DOC_BYTES,
};
