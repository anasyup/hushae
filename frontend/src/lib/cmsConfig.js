/* ============================================================================
 * CMS CONFIG
 *
 * Same contract as cartConfig / checkoutConfig / loyaltyConfig / searchConfig /
 * marketingConfig: the defaults below must stay byte-identical to the `cms`
 * block in backend/src/models/Settings.js AND to DEFAULTS in
 * backend/src/utils/cmsEngine.js.
 *
 * WHY THAT MATTERS, MEASURED
 *   Sprint 2J shipped a live bug from breaking exactly this contract — the
 *   search engine's synonym table was empty while the schema seeded twelve, so
 *   "panty" returned one fuzzy match instead of a category. tests/cmsparity.mjs
 *   compares all three files field by field and fails the build on drift.
 *
 * Everything here is PRESENTATION ONLY. No page is authorised in the browser:
 * /api/cms decides what is live, what is a draft and what is scheduled. If
 * this file goes stale the merchant sees a wrong hint, never a leaked draft.
 * ========================================================================== */

export const CMS_DEFAULTS = {
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
    defaultNoIndex: false,
  },

  // ---- Structured data -------------------------------------------------
  structuredData: {
    enabled: true,
    organisation: true,
    breadcrumbs: true,
  },
};

/** Merge saved settings over the defaults, one level deep per group — the same
 *  shape cmsConfig() uses on the server, so both sides agree on a half-saved
 *  document. */
export function resolveCms(settings) {
  const saved = settings?.cms || {};
  const out = { ...CMS_DEFAULTS, ...saved };
  for (const g of ['slug', 'seo', 'structuredData']) {
    out[g] = { ...CMS_DEFAULTS[g], ...(saved[g] || {}) };
  }
  if (!Array.isArray(out.slug.reserved)) out.slug.reserved = CMS_DEFAULTS.slug.reserved;
  return out;
}

/* ---------------------------------------------------------------------------
 * SLUG HELPERS — a mirror of the server's, used for instant feedback while the
 * merchant types. The server still decides; this only saves a round trip.
 * ------------------------------------------------------------------------- */

/** Fold a title into a URL-safe slug. Identical rules to cmsEngine.slugify. */
export function slugify(input, max = 80) {
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
 * Would the server accept this address?
 *
 * Reserved words are checked on the FIRST SEGMENT only: "shop" is refused
 * because /shop is a real route, "shop-guide" is fine. Refusing the second
 * would be baffling to a merchant who just wants a sizing guide.
 */
export function checkSlugLocal(slug, cfg = CMS_DEFAULTS) {
  const raw = String(slug || '').trim();
  if (!raw) return { ok: false, message: 'A page needs a web address' };

  /* Order and wording mirror cmsEngine.checkSlug exactly. Two different
     messages for one rule is how a merchant learns to distrust the form. */
  if (/[A-Z]/.test(raw)) {
    return { ok: false, message: `Web addresses are lowercase — use "${raw.toLowerCase()}"`, suggestion: raw.toLowerCase() };
  }
  const s = raw.toLowerCase();
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(s)) {
    return { ok: false, message: 'Use lowercase letters, numbers and hyphens only', suggestion: slugify(s) };
  }
  if (s.length > (cfg.slug?.maxLength || 80)) {
    return { ok: false, message: `Keep the address under ${cfg.slug?.maxLength || 80} characters` };
  }
  const first = s.split('/')[0];
  if ((cfg.slug?.reserved || []).includes(first)) {
    return { ok: false, message: `"${first}" is used by the shop itself — choose another address` };
  }
  return { ok: true, slug: s };
}

/** Preview the <title> a shopper's browser tab will show. */
export function previewTitle(pageTitle, cfg = CMS_DEFAULTS) {
  const t = String(pageTitle || '').trim();
  if (!t) return '';
  const tpl = cfg.seo?.titleTemplate || '%s · HUSHAE';
  return tpl.includes('%s') ? tpl.replace('%s', t) : `${t} ${tpl}`.trim();
}
