/* ============================================================================
 * CMS PAGE TYPE REGISTRY
 *
 * The same pattern as admin/promotions/promoTypes.js: one table that both the
 * list and the editor read, so the label a merchant sees in the table is the
 * label they see in the builder. Two hardcoded copies of "Landing page" drift
 * within a sprint — measured on the Toggle component, which had five.
 * ========================================================================== */

export const PAGE_TYPES = [
  {
    type: 'page',
    label: 'Standard page',
    short: 'Page',
    blurb: 'About us, size guide, care instructions — anything with a web address.',
    // Prose pages default to the writing box; layout pages default to sections.
    prefersBody: true,
  },
  {
    type: 'legal',
    label: 'Policy page',
    short: 'Policy',
    blurb: 'Returns, privacy, terms. Plain writing, no layout needed.',
    prefersBody: true,
  },
  {
    type: 'landing',
    label: 'Landing page',
    short: 'Landing',
    blurb: 'A campaign page built from sections — hero, product row, banner.',
    prefersBody: false,
  },
  {
    type: 'home',
    label: 'Home page',
    short: 'Home',
    blurb: 'An alternative home page built from sections.',
    prefersBody: false,
  },
];

export const typeOf = (t) => PAGE_TYPES.find((x) => x.type === t) || PAGE_TYPES[0];

/* ---------------------------------------------------------------------------
 * STATE PILLS
 *
 * The server returns liveState() = { live, reason }. "Draft" and "scheduled
 * for Friday" and "expired last week" are three different situations that a
 * bare Published/Unpublished badge renders identically — which is exactly the
 * mistake the promotions list avoided.
 * ------------------------------------------------------------------------- */
export const STATE_STYLE = {
  live:      'text-black',
  scheduled: 'text-[#777777]',
  draft:     'text-[#999999]',
  expired:   'text-[#AAAAAA]',
  archived:  'text-[#AAAAAA]',
};

export const STATE_LABEL = {
  live: 'Live',
  scheduled: 'Scheduled',
  draft: 'Draft',
  expired: 'Finished',
  archived: 'Archived',
};

/** A blank page, merged over whatever the server returns so a document saved
 *  before a field existed still opens with every control present. */
export const EMPTY_PAGE = {
  title: '',
  slug: '',
  type: 'page',
  doc: null,
  body: '',
  draft: null,
  draftBody: '',
  excerpt: '',
  status: 'draft',
  publishAt: null,
  unpublishAt: null,
  showInFooter: false,
  showInHeader: false,
  navLabel: '',
  navGroup: '',
  sortOrder: 100,
  seo: {
    title: '',
    description: '',
    keywords: [],
    canonical: '',
    noIndex: false,
    noFollow: false,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    structuredData: null,
  },
};

/** Merge a server page onto EMPTY_PAGE, group by group. A shallow spread would
 *  leave `seo` missing half its keys on an older document and every SEO input
 *  would flip from controlled to uncontrolled mid-edit. */
export function hydratePage(server) {
  const merged = { ...EMPTY_PAGE, ...(server || {}) };
  merged.seo = { ...EMPTY_PAGE.seo, ...(server?.seo || {}) };
  if (!Array.isArray(merged.seo.keywords)) merged.seo.keywords = [];
  return merged;
}
