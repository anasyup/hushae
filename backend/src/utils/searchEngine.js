/* ============================================================================
 * SEARCH ENGINE
 *
 * Why this exists, measured on the live catalogue before a line was written:
 *
 *   q=cotton  -> 14 results
 *   q=coton   ->  0 results   (one missing letter)
 *   q=black   ->  0 results   (49 products have a black colourway)
 *   q=modal   ->  7 results   (23 products are modal by fabric)
 *
 * The old query was `{$or:[{name:rx},{sku:rx},{categorySlug:rx}]}`. It could
 * not see colours, fabrics, tags or badges, and a single typo returned an
 * empty page.
 *
 * The approach here is deliberately NOT Mongo's $text index:
 *
 *   · $text cannot weight a colour match differently from a description match
 *   · $text has no typo tolerance at all
 *   · $text ignores arrays of sub-documents, which is where colours live
 *   · the catalogue is ~100 products; scoring them in memory costs under a
 *     millisecond and buys full control
 *
 * So the shape is: narrow in Mongo with an indexed $or (cheap, uses the
 * database), then score the survivors in JS (precise, uses the merchant's
 * weights). If the catalogue ever reaches tens of thousands of products the
 * scoring stays the same and only the narrowing step needs to change.
 * ========================================================================== */

const DEFAULTS = {
  enabled: true,
  placeholder: 'Search bras, trunks, vests…',
  minChars: 2,
  debounceMs: 220,
  perPage: 24,
  fields: { name: true, sku: true, category: true, tags: true, colors: true, sizes: false, fabric: true, badges: true, description: true },
  weights: {
    name: 100, sku: 90, category: 40, tags: 35, colors: 30, sizes: 20,
    fabric: 25, badges: 20, description: 10,
    exactBonus: 60, prefixBonus: 30, inStockBonus: 15, featuredBonus: 10, ratingWeight: 4,
  },
  fuzzy: { enabled: true, minTermLen: 4, maxDistance: 2, penalty: 25 },
  suggest: { enabled: true, maxProducts: 6, maxCategories: 4, maxTerms: 4, showImages: true, showPrices: true, highlightMatch: true },
  history: { enabled: true, maxItems: 8 },
  trending: { enabled: true, windowDays: 14, maxItems: 6, minCount: 2, manual: [] },
  /* MEASURED BUG: these were left empty while the Mongoose schema seeded 12
     synonyms. settings.search has never been SAVED, so .lean() reads a raw
     document with no `search` key and the engine falls back to DEFAULTS —
     where the table was empty. Live proof: q=panty returned 1 fuzzy match
     instead of the whole brief category, while stopWords worked fine because
     DEFAULTS happened to carry them.

     Same class of failure as gotcha 45/53 (schema defaults are materialised on
     the next save, not on read) and the same contract every other resolver in
     this codebase follows: DEFAULTS must be byte-identical to the schema. */
  synonyms: [
    { from: 'panty', to: 'brief', both: true },
    { from: 'panties', to: 'brief', both: true },
    { from: 'underwear', to: 'brief', both: true },
    { from: 'boxer', to: 'trunk', both: true },
    { from: 'banyan', to: 'vest', both: true },
    { from: 'baniyan', to: 'vest', both: true },
    { from: 'sando', to: 'vest', both: true },
    { from: 'nighty', to: 'nightdress', both: true },
    { from: 'night suit', to: 'pyjama', both: true },
    { from: 'pajama', to: 'pyjama', both: true },
    { from: 'brassiere', to: 'bra', both: true },
    { from: 'shalwar', to: 'lounge', both: false },
  ],
  stopWords: ['the', 'a', 'an', 'for', 'and', 'or', 'of', 'with', 'in', 'on', 'to', 'my', 'me', 'ka', 'ki', 'ke', 'wala', 'wali'],
  blockedTerms: [],
  noResults: { showSuggestions: true, showTrending: true, showPopular: true, message: 'No matches for that. Try one of these instead.' },
  analytics: { enabled: true, logQueries: true, logClicks: true, retainDays: 180, minLogLen: 2 },
  voice: { enabled: false, lang: 'en-PK' },
};

const DISCOVERY_DEFAULTS = {
  enabled: true,
  similar: { enabled: true, title: 'You may also like', count: 8, sameCategory: 50, sameGender: 30, sameTier: 15, sharedTag: 10, sharedColor: 8, priceBandPct: 35, priceBonus: 12 },
  boughtTogether: { enabled: true, title: 'Often bought together', count: 4, windowDays: 180, minCoOccur: 2 },
  popular: { enabled: true, title: 'Popular right now', count: 8, windowDays: 30 },
  personalized: { enabled: true, title: 'Picked for you', count: 8, useRecentlyViewed: true, useOrderHistory: true },
  /* Same contract as search.synonyms above: byte-identical to the Mongoose
     schema. Empty prompt/occasion/budget lists here would leave the assistant
     unable to read "for summer" or "under 2000" until the merchant happened
     to press Save on the settings page. */
  assistant: {
    enabled: true,
    title: 'Shopping assistant',
    intro: 'Tell me what you need and I will find it.',
    buttonLabel: 'Help me choose',
    showOnShop: true,
    showOnHome: false,
    maxResults: 6,
    prompts: [
      { id: 'budget', label: 'Under PKR 1,500', query: 'budget under 1500' },
      { id: 'gift', label: 'A gift', query: 'gift' },
      { id: 'summer', label: 'For summer', query: 'summer breathable' },
      { id: 'daily', label: 'Everyday basics', query: 'everyday cotton basics' },
      { id: 'bridal', label: 'Bridal / wedding', query: 'bridal wedding' },
    ],
    occasions: [
      { id: 'summer', label: 'Summer', terms: ['cooling', 'breathable', 'cotton', 'mesh'], gender: '' },
      { id: 'winter', label: 'Winter', terms: ['thermal', 'warm', 'full sleeve'], gender: '' },
      { id: 'bridal', label: 'Bridal', terms: ['premium', 'silk-touch', 'lace', 'shapewear'], gender: 'women' },
      { id: 'sports', label: 'Sports & gym', terms: ['sports', 'quick dry', 'sweat control', 'active'], gender: '' },
      { id: 'office', label: 'Office', terms: ['seamless', 'smooth', 'no-show'], gender: '' },
      { id: 'sleep', label: 'Sleep & lounge', terms: ['sleepwear', 'loungewear', 'soft'], gender: '' },
      { id: 'gift', label: 'Gifting', terms: ['gift', 'premium', 'set', 'pack'], gender: '' },
    ],
    budgets: [
      { id: 'b1', label: 'Under 1,000', min: 0, max: 1000 },
      { id: 'b2', label: '1,000 – 2,000', min: 1000, max: 2000 },
      { id: 'b3', label: '2,000 – 4,000', min: 2000, max: 4000 },
      { id: 'b4', label: '4,000+', min: 4000, max: 0 },
    ],
  },
};

const GROUPS = ['fields', 'weights', 'fuzzy', 'suggest', 'history', 'trending', 'noResults', 'analytics', 'voice'];
const D_GROUPS = ['similar', 'boughtTogether', 'popular', 'personalized', 'assistant'];

/* ---------------------------------------------------------------------------
 * SETTINGS CACHE
 *
 * MEASURED: /api/search/config, which does nothing but read settings, averaged
 * 599ms — the same as a full search. So the cost was never the scoring, it was
 * the database round-trip, and every search paid it twice (searchConfig plus
 * discoveryConfig are two separate findOne calls).
 *
 * The settings document is ~19 KB and changes only when the merchant presses
 * Save. Holding it for a few seconds removes one to two round-trips from every
 * search and suggestion without any risk of serving badly stale config: the
 * worst case is a merchant seeing their own change take effect a moment late,
 * and invalidate() is called from the settings route the instant they save.
 *
 * Deliberately in-process and tiny. A shared cache (Redis) would be a second
 * service to run and fail; this is one variable.
 * ------------------------------------------------------------------------- */
const CACHE_MS = 8000;
let _cache = { at: 0, doc: null };

async function rawSettings() {
  const now = Date.now();
  if (_cache.doc && now - _cache.at < CACHE_MS) return _cache.doc;
  const Settings = require('../models/Settings');
  // .lean() is intentional: this is a read for config resolution, and the
  // resolvers below supply every default. See the parity guard — the schema
  // defaults are NOT materialised on a lean read.
  const doc = await Settings.findOne({ key: 'store' }).lean();
  _cache = { at: now, doc: doc || {} };
  return _cache.doc;
}

/** Called by the settings route so a merchant's save is visible immediately. */
function invalidateSettingsCache() {
  _cache = { at: 0, doc: null };
}

async function searchConfig() {
  try {
    const st = await rawSettings();
    const saved = (st && st.search) || {};
    const out = { ...DEFAULTS, ...saved };
    for (const g of GROUPS) out[g] = { ...DEFAULTS[g], ...(saved[g] || {}) };
    if (!Array.isArray(out.synonyms)) out.synonyms = DEFAULTS.synonyms;
    if (!Array.isArray(out.stopWords)) out.stopWords = DEFAULTS.stopWords;
    if (!Array.isArray(out.blockedTerms)) out.blockedTerms = [];
    return out;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

async function discoveryConfig() {
  try {
    const st = await rawSettings();
    const saved = (st && st.discovery) || {};
    const out = { ...DISCOVERY_DEFAULTS, ...saved };
    for (const g of D_GROUPS) out[g] = { ...DISCOVERY_DEFAULTS[g], ...(saved[g] || {}) };
    return out;
  } catch {
    return JSON.parse(JSON.stringify(DISCOVERY_DEFAULTS));
  }
}

/* ---------------------------------------------------------------------------
 * Text helpers
 * ------------------------------------------------------------------------- */

/** Fold to a comparable form: lowercase, strip accents and punctuation. */
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Levenshtein distance, bailing out as soon as it exceeds `max`.
 *
 * The early exit matters: without it every query would compare every term
 * against every word of every description. With it, most comparisons stop
 * after two rows.
 */
function editDistance(a, b, max = 2) {
  if (a === b) return 0;
  const al = a.length; const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (!al) return bl;
  if (!bl) return al;

  let prev = new Array(bl + 1);
  let cur = new Array(bl + 1);
  for (let j = 0; j <= bl; j += 1) prev[j] = j;

  for (let i = 1; i <= al; i += 1) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= bl; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;   // nothing in this row can recover
    const t = prev; prev = cur; cur = t;
  }
  return prev[bl];
}

/**
 * Turn what the shopper typed into the terms actually searched.
 *
 * Stop words are removed, but never all of them: a search for "for me" would
 * otherwise become an empty query and return the whole catalogue.
 */
function tokenize(query, cfg) {
  const stop = new Set((cfg.stopWords || []).map(norm));
  const raw = norm(query).split(' ').filter(Boolean);
  const kept = raw.filter((t) => !stop.has(t) && t.length > 1);
  return kept.length ? kept : raw;
}

/**
 * Expand each term through the merchant's synonym table.
 * Returns [{ term, synonyms: [...] }] so scoring can tell an original term
 * from a synonym hit and rank the original higher.
 */
function expand(terms, cfg) {
  const table = (cfg.synonyms || []).filter((s) => s && s.from && s.to);
  return terms.map((term) => {
    const syns = new Set();
    for (const s of table) {
      const from = norm(s.from); const to = norm(s.to);
      if (from === term) syns.add(to);
      else if (s.both !== false && to === term) syns.add(from);
    }
    return { term, synonyms: [...syns] };
  });
}

/* ---------------------------------------------------------------------------
 * Scoring
 * ------------------------------------------------------------------------- */

/** Every searchable string on a product, paired with its field weight. */
function haystack(p, cfg) {
  const f = cfg.fields || {};
  const w = cfg.weights || {};
  const out = [];
  const add = (on, weight, value) => {
    if (!on || !value) return;
    const text = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    if (text.trim()) out.push({ text: norm(text), weight: Number(weight) || 0 });
  };

  add(f.name, w.name, p.name);
  add(f.sku, w.sku, p.sku);
  add(f.category, w.category, p.categorySlug);
  add(f.tags, w.tags, p.tags);
  add(f.colors, w.colors, (p.colors || []).map((c) => c && c.name));
  add(f.sizes, w.sizes, p.sizes);
  add(f.fabric, w.fabric, p.fabric);
  add(f.badges, w.badges, p.badges);
  add(f.description, w.description, `${p.shortDescription || ''} ${p.description || ''}`);
  return out;
}

/**
 * Score one product against one expanded term.
 * Returns { score, fuzzy, synonym } — 0 score means no match at all.
 */
function scoreTerm(hay, { term, synonyms }, cfg, allowFuzzy) {
  const w = cfg.weights || {};
  const fz = cfg.fuzzy || {};
  let best = 0; let usedFuzzy = false; let usedSyn = false;

  const tryWord = (needle, fields, isSyn) => {
    for (const { text, weight } of fields) {
      if (!weight) continue;
      const idx = text.indexOf(needle);
      if (idx === -1) continue;

      let s = weight;
      // A whole-word hit is worth far more than a substring: "bra" inside
      // "brand" is not what the shopper meant.
      const before = idx === 0 ? ' ' : text[idx - 1];
      const after = text[idx + needle.length] || ' ';
      const wholeWord = !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
      if (wholeWord) s += Number(w.exactBonus) || 0;
      if (idx === 0) s += Number(w.prefixBonus) || 0;
      // A synonym is a weaker signal than the word actually typed.
      if (isSyn) s = Math.round(s * 0.7);
      if (s > best) { best = s; usedSyn = isSyn; usedFuzzy = false; }
    }
  };

  tryWord(term, hay, false);
  for (const s of synonyms) tryWord(s, hay, true);

  // Fuzzy is a fallback, never a first pass — it would make "bra" match "bran".
  if (!best && allowFuzzy && fz.enabled && term.length >= (Number(fz.minTermLen) || 4)) {
    const maxD = Number(fz.maxDistance) || 2;
    for (const { text, weight } of hay) {
      if (!weight) continue;
      for (const word of text.split(' ')) {
        if (!word || Math.abs(word.length - term.length) > maxD) continue;
        const d = editDistance(term, word, maxD);
        if (d <= maxD && d > 0) {
          const s = Math.max(1, weight - d * (Number(fz.penalty) || 25));
          if (s > best) { best = s; usedFuzzy = true; usedSyn = false; }
        }
      }
    }
  }

  return { score: best, fuzzy: usedFuzzy, synonym: usedSyn };
}

/**
 * Score a whole product against the whole query.
 *
 * EVERY term must match something. A two-word search is an AND, not an OR:
 * "black brief" must not return every black item plus every brief.
 */
function scoreProduct(p, expanded, cfg, allowFuzzy) {
  const hay = haystack(p, cfg);
  const w = cfg.weights || {};
  let total = 0; let fuzzy = false; let synonym = false;

  for (const e of expanded) {
    const r = scoreTerm(hay, e, cfg, allowFuzzy);
    if (!r.score) return null;              // one miss disqualifies the product
    total += r.score;
    if (r.fuzzy) fuzzy = true;
    if (r.synonym) synonym = true;
  }

  // Quality signals, applied after relevance so they break ties rather than
  // decide the order. An out-of-stock product can still be the best match.
  if ((p.stock || 0) > 0) total += Number(w.inStockBonus) || 0;
  if (p.isFeatured) total += Number(w.featuredBonus) || 0;
  total += (Number(p.ratingAvg) || 0) * (Number(w.ratingWeight) || 0);

  return { score: Math.round(total), fuzzy, synonym };
}

/**
 * A cheap Mongo pre-filter so scoring never sees the whole catalogue.
 *
 * Intentionally loose — it only has to avoid missing a product that scoring
 * would have matched. Precision is scoring's job.
 */
function narrowQuery(terms, cfg) {
  const f = cfg.fields || {};
  const or = [];
  for (const t of terms) {
    const rx = new RegExp(escapeRx(t), 'i');
    if (f.name) or.push({ name: rx });
    if (f.sku) or.push({ sku: rx });
    if (f.category) or.push({ categorySlug: rx });
    if (f.tags) or.push({ tags: rx });
    if (f.colors) or.push({ 'colors.name': rx });
    if (f.sizes) or.push({ sizes: rx });
    if (f.fabric) or.push({ fabric: rx });
    if (f.badges) or.push({ badges: rx });
    if (f.description) or.push({ shortDescription: rx }, { description: rx });
  }
  return or.length ? { $or: or } : {};
}

/**
 * Run a search.
 *
 * Two passes, and the second only when the first found nothing:
 *   1. strict — exact and substring matches, scored and ranked
 *   2. fuzzy  — the whole active catalogue, edit-distance matched
 *
 * The second pass is the expensive one, which is exactly why it is reserved
 * for the case where the shopper would otherwise see an empty page.
 */
async function runSearch({ query, filters = {}, cfg, limit = 24, skip = 0 }) {
  const Product = require('../models/Product');
  const terms = tokenize(query, cfg);
  if (!terms.length) return { products: [], total: 0, terms: [], fuzzy: false, synonym: false };

  const blocked = new Set((cfg.blockedTerms || []).map(norm));
  if (terms.some((t) => blocked.has(t))) {
    return { products: [], total: 0, terms, fuzzy: false, synonym: false, blocked: true };
  }

  const expanded = expand(terms, cfg);
  // Synonyms must be visible to the pre-filter too, or "panty" narrows to
  // nothing and the synonym never gets a chance to score.
  const allTerms = [...new Set(expanded.flatMap((e) => [e.term, ...e.synonyms]))];

  const base = { isActive: true, status: { $ne: 'draft' }, ...filters };
  const SELECT = 'name slug sku price compareAtPrice stock images gender categorySlug tier '
    + 'ratingAvg ratingCount sizes colors fabric badges tags isFeatured isBestSeller '
    + 'shortDescription createdAt';

  let docs = await Product.find({ ...base, ...narrowQuery(allTerms, cfg) }).select(SELECT).lean();

  let scored = docs
    .map((p) => { const r = scoreProduct(p, expanded, cfg, false); return r ? { p, ...r } : null; })
    .filter(Boolean);

  let usedFuzzy = false;
  if (!scored.length && cfg.fuzzy?.enabled) {
    docs = await Product.find(base).select(SELECT).lean();
    scored = docs
      .map((p) => { const r = scoreProduct(p, expanded, cfg, true); return r ? { p, ...r } : null; })
      .filter(Boolean);
    usedFuzzy = scored.length > 0;
  }

  scored.sort((a, b) => b.score - a.score
    || (b.p.stock > 0) - (a.p.stock > 0)
    || new Date(b.p.createdAt) - new Date(a.p.createdAt));

  const total = scored.length;
  const page = scored.slice(skip, skip + limit);

  return {
    products: page.map((s) => ({ ...s.p, _score: s.score, _fuzzy: s.fuzzy, _synonym: s.synonym })),
    total,
    terms,
    fuzzy: usedFuzzy || page.some((s) => s.fuzzy),
    synonym: page.some((s) => s.synonym),
  };
}

/* ---------------------------------------------------------------------------
 * Similar products — content-based, no third-party service.
 * ------------------------------------------------------------------------- */
async function similarProducts(product, dcfg, limit) {
  const Product = require('../models/Product');
  const s = dcfg.similar || {};
  const n = limit || s.count || 8;

  const pool = await Product.find({
    _id: { $ne: product._id },
    isActive: true,
    status: { $ne: 'draft' },
    $or: [
      { categorySlug: product.categorySlug },
      { gender: product.gender, tier: product.tier },
      ...(product.tags?.length ? [{ tags: { $in: product.tags } }] : []),
    ],
  }).select('name slug price compareAtPrice stock images gender categorySlug tier ratingAvg ratingCount sizes colors tags badges isBestSeller').lean();

  const myColors = new Set((product.colors || []).map((c) => norm(c.name)));
  const myTags = new Set((product.tags || []).map(norm));
  const band = (Number(s.priceBandPct) || 35) / 100;

  const scored = pool.map((c) => {
    let score = 0;
    if (c.categorySlug === product.categorySlug) score += Number(s.sameCategory) || 0;
    if (c.gender === product.gender) score += Number(s.sameGender) || 0;
    if (c.tier === product.tier) score += Number(s.sameTier) || 0;
    for (const t of c.tags || []) if (myTags.has(norm(t))) score += Number(s.sharedTag) || 0;
    for (const col of c.colors || []) if (myColors.has(norm(col.name))) score += Number(s.sharedColor) || 0;
    const diff = Math.abs((c.price || 0) - (product.price || 0)) / Math.max(1, product.price || 1);
    if (diff <= band) score += Number(s.priceBonus) || 0;
    if ((c.stock || 0) > 0) score += 5;
    score += (Number(c.ratingAvg) || 0);
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((x) => x.c);
}

module.exports = {
  DEFAULTS, DISCOVERY_DEFAULTS, searchConfig, discoveryConfig, invalidateSettingsCache,
  norm, escapeRx, editDistance, tokenize, expand,
  haystack, scoreTerm, scoreProduct, narrowQuery, runSearch, similarProducts,
};
