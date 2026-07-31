/* ============================================================================
 * SEARCH CONFIG
 *
 * Same contract as cartConfig / checkoutConfig / accountConfig / cxConfig /
 * reviewsConfig / loyaltyConfig: these defaults are byte-identical to the
 * `search` block in backend/src/models/Settings.js AND to DEFAULTS in
 * backend/src/utils/searchEngine.js.
 *
 * That third copy is not redundancy for its own sake. This sprint shipped a
 * live bug because the engine's DEFAULTS had an empty synonym table while the
 * schema seeded twelve: settings.search had never been saved, the engine read
 * with .lean(), and "panty" returned one fuzzy match instead of the whole
 * brief category. Defaults that drift are silent.
 *
 * Everything here is PRESENTATION. No ranking or matching happens in the
 * browser — the server scores every result. If this file goes stale the
 * shopper sees a wrong placeholder, never a wrong result.
 * ========================================================================== */

export const SEARCH_DEFAULTS = {
  enabled: true,
  placeholder: 'Search bras, trunks, vests…',
  minChars: 2,
  debounceMs: 220,
  perPage: 24,
  suggest: {
    enabled: true,
    maxProducts: 6,
    maxCategories: 4,
    maxTerms: 4,
    showImages: true,
    showPrices: true,
    highlightMatch: true,
  },
  history: { enabled: true, maxItems: 8 },
  trending: { enabled: true, maxItems: 6 },
  noResults: {
    showSuggestions: true,
    showTrending: true,
    showPopular: true,
    message: 'No matches for that. Try one of these instead.',
  },
  voice: { enabled: false, lang: 'en-PK' },
  assistant: { enabled: false },
};

const GROUPS = ['suggest', 'history', 'trending', 'noResults', 'voice', 'assistant'];

export function searchConfig(cfg) {
  const src = cfg || {};
  const out = { ...SEARCH_DEFAULTS };
  for (const k of Object.keys(SEARCH_DEFAULTS)) {
    if (GROUPS.includes(k)) continue;
    const v = src[k];
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  for (const g of GROUPS) out[g] = { ...SEARCH_DEFAULTS[g], ...(src[g] || {}) };
  return out;
}

/* ---------------------------------------------------------------------------
 * SEARCH HISTORY — on the device, never on the server.
 *
 * What someone searched for in an underwear shop is sensitive. Keeping it in
 * localStorage means it is theirs to clear, it works for guests, and the store
 * never holds a per-person search profile. The anonymous session id below is a
 * random token used only to join a query to the click that followed it.
 * ------------------------------------------------------------------------- */
const HISTORY_KEY = 'hushae.searchHistory';
const SID_KEY = 'hushae.sid';

export function getHistory(max = 8) {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw.slice(0, max) : [];
  } catch { return []; }
}

export function pushHistory(term, max = 8) {
  const t = String(term || '').trim();
  if (!t) return getHistory(max);
  try {
    const cur = getHistory(50).filter((x) => x.toLowerCase() !== t.toLowerCase());
    const next = [t, ...cur].slice(0, Math.max(1, max));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch { return getHistory(max); }
}

export function removeHistory(term) {
  try {
    const next = getHistory(50).filter((x) => x !== term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

export function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* denied */ }
  return [];
}

/** Anonymous, per-device. Used to join a search to the click that followed. */
export function sessionId() {
  try {
    let id = localStorage.getItem(SID_KEY);
    if (!id) {
      id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch { return ''; }
}

/* ---------------------------------------------------------------------------
 * Highlighting
 *
 * Returns [{ text, hit }] rather than an HTML string, so the caller renders
 * real elements. Building markup here would mean dangerouslySetInnerHTML on
 * text the shopper typed — an XSS hole for a visual flourish.
 * ------------------------------------------------------------------------- */
export function highlight(text, query) {
  const src = String(text || '');
  const terms = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  if (!terms.length) return [{ text: src, hit: false }];

  const lower = src.toLowerCase();
  const marks = new Array(src.length).fill(false);
  for (const t of terms) {
    let from = 0;
    for (;;) {
      const i = lower.indexOf(t, from);
      if (i === -1) break;
      for (let j = i; j < i + t.length; j += 1) marks[j] = true;
      from = i + t.length;
    }
  }

  const out = [];
  let buf = ''; let cur = marks[0] || false;
  for (let i = 0; i < src.length; i += 1) {
    if (marks[i] === cur) { buf += src[i]; continue; }
    out.push({ text: buf, hit: cur });
    buf = src[i]; cur = marks[i];
  }
  if (buf) out.push({ text: buf, hit: cur });
  return out.filter((p) => p.text);
}
