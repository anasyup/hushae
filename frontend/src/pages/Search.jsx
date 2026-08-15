import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search as SearchIcon, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { searchConfig, pushHistory, sessionId, highlight } from '../lib/searchConfig';
import ProductCard from '../components/ProductCard';
import { usePromotions, useProductBadges, promosForProduct } from '../lib/usePromotions';
import EmptyState from '../components/ui/EmptyState';
import SearchFilters from '../components/search/SearchFilters';
import ShoppingAssistant from '../components/search/ShoppingAssistant';
import CollectionBanner from '../components/collection/CollectionBanner';
import Seo from '../components/Seo';

/* ============================================================================
 * SEARCH RESULTS
 *
 * Everything that decides WHAT is shown lives in the URL: the query, every
 * facet, the sort, the page. That is what makes a result set shareable, what
 * makes the Back button undo one filter instead of leaving the page, and what
 * lets the server own ranking without the client holding a second opinion.
 *
 * Mobile first: one column of cards, filters in a bottom sheet, and the
 * "load more" button is a button — infinite scroll alone traps keyboard users
 * above the footer and breaks the back button.
 * ========================================================================== */

const SORTS = [
  ['relevance', 'Best match'],
  ['popular', 'Most popular'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Highest rated'],
  ['bestselling', 'Best selling'],
  ['featured', 'Featured'],
];

/* Facets that hold several values at once, stored comma-separated in the URL.
   Mirrors useShopFilters so the two pages behave identically. */
const MULTI = ['category', 'tier', 'size', 'color', 'badge', 'tag'];

export default function Search() {
  const promo = usePromotions();
  const [params, setParams] = useSearchParams();
  const { settings } = useApp();
  const q = params.get('q') || '';

  const [cfgRaw, setCfgRaw] = useState(null);
  const cfg = useMemo(() => searchConfig(cfgRaw), [cfgRaw]);

  const [data, setData] = useState(null);
  const [pages, setPages] = useState([]);      // accumulated product pages
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [facets, setFacets] = useState(null);
  const [assistOpen, setAssistOpen] = useState(false);

  const seq = useRef(0);
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));

  useEffect(() => {
    api('/search/config').then(setCfgRaw).catch(() => setCfgRaw({}));
    api('/search/facets').then(setFacets).catch(() => setFacets(null));
  }, []);

  /* Build the request from the URL, so there is exactly one source of truth.
     Anything not listed here is not a filter and must not reach the server. */
  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    for (const k of [...MULTI, 'gender', 'availability', 'minPrice', 'maxPrice', 'minRating', 'sale', 'featured', 'bestSeller', 'sort', 'newDays']) {
      const v = params.get(k);
      if (v) sp.set(k, v);
    }
    sp.set('limit', String(cfg.perPage));
    sp.set('sid', sessionId());
    return sp.toString();
  }, [params, q, cfg.perPage]);

  /* Page 1 replaces; later pages append. Sequence-guarded, because a slow
     page-1 response landing after page 2 would wipe the appended results. */
  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    api(`/search?${queryString}&page=1`)
      .then((d) => {
        if (mine !== seq.current) return;
        setData(d);
        setPages([d.products || []]);
        if (q) pushHistory(q, cfg.history.maxItems);
      })
      .catch(() => { if (mine === seq.current) { setData(null); setPages([]); } })
      .finally(() => { if (mine === seq.current) setLoading(false); });
  }, [queryString, q, cfg.history.maxItems]);

  const loadMore = useCallback(() => {
    if (!data?.hasMore || loadingMore) return;
    const next = pages.length + 1;
    setLoadingMore(true);
    const mine = seq.current;
    api(`/search?${queryString}&page=${next}`)
      .then((d) => {
        if (mine !== seq.current) return;
        setPages((p) => [...p, d.products || []]);
        setData((prev) => ({ ...prev, hasMore: d.hasMore, page: d.page }));
      })
      .catch(() => {})
      .finally(() => { if (mine === seq.current) setLoadingMore(false); });
  }, [data, loadingMore, pages.length, queryString]);

  const products = useMemo(() => pages.flat(), [pages]);
  const badgeMap = useProductBadges(products);

  /* Facet writes push a history entry so Back undoes one filter; the sort
     replaces, because re-ordering the same results is not a new place. */
  const setOne = useCallback((k, v, replace = false) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.delete('page');
    setParams(next, { replace });
  }, [params, setParams]);

  const toggleMany = useCallback((k, v) => {
    const next = new URLSearchParams(params);
    const cur = (next.get(k) || '').split(',').filter(Boolean);
    const after = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (after.length) next.set(k, after.join(',')); else next.delete(k);
    next.delete('page');
    setParams(next);
  }, [params, setParams]);

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    setParams(next);
  }, [q, setParams]);

  const activeCount = useMemo(() => {
    let n = 0;
    for (const [k, v] of params.entries()) {
      if (k === 'q' || k === 'page' || k === 'sort' || !v) continue;
      n += MULTI.includes(k) ? v.split(',').filter(Boolean).length : 1;
    }
    return n;
  }, [params]);

  const onCardClick = useCallback((p, index) => {
    if (!q) return;
    api('/search/click', {
      method: 'POST',
      body: { term: q, product: p._id || p.id, position: index + 1, sid: sessionId() },
    }).catch(() => {});
  }, [q]);

  const heading = q ? `Results for “${q}”` : 'All products';

  return (
    <div className="container-page pt-[190px] pb-6 md:pb-10"><Seo title={q ? `Results for “${q}”` : 'Search'} description="Search HUSHAE — innerwear made in Pakistan, finished to an international standard." />
      {/* ---------------- header ----------------
          MEASURED, Phase 2E: this page opened with a bare 24px h1 on flat
          alabaster while /shop opened with a 30px h1 inside a 168px editorial
          masthead — the same store in two different registers depending on how
          the shopper arrived.
          The SAME CollectionBanner component is reused, not a copy: one
          masthead in the codebase, one place to change it.

          The h1 stays inside the banner and keeps its italic query treatment,
          because the query IS the page title here. The live status line stays
          BELOW the banner rather than being passed as `count`: it carries
          three states (searching / n pieces / could not load) that a plain
          number prop cannot express, and it must remain an aria-live region
          that announces when results change. */}
      <CollectionBanner
        eyebrow={q ? 'HUSHAE — Search' : 'HUSHAE — All'}
        title={q
          ? <>Results for{' '}
            <span className="italic">
              {highlight(q, q).map((part, i) => <span key={i}>{part.text}</span>)}
            </span>
          </>
          : 'All products'}
        blurb={q ? 'Everything matching your search, across men and women.' : 'The complete HUSHAE edit.'}
      />

      <div className="mb-5">
        <p className="text-body-sm text-ash" aria-live="polite">
          {loading
            ? 'Searching…'
            : data
              ? `${data.total} ${data.total === 1 ? 'piece' : 'pieces'}${data.fuzzy ? ' — showing close matches' : ''}`
              : 'Could not load results'}
        </p>

        {/* A corrected spelling must be visible, or the shopper thinks the
            store simply does not stock what they asked for. */}
        {data?.fuzzy && data.total > 0 && (
          <p className="mt-2 rounded-control bg-cream px-4 py-2.5 text-body-sm">
            No exact match for <strong>{q}</strong> — these are the closest pieces we have.
          </p>
        )}
      </div>

      {/* ---------------- controls ---------------- */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="btn btn-sm inline-flex items-center gap-2 border border-bronze bg-white text-graphite hover:bg-satin/60 lg:hidden"
          aria-expanded={sheetOpen}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-obsidian px-1 text-[10px] font-bold text-alabaster">
              {activeCount}
            </span>
          )}
        </button>

        {cfg.assistant?.enabled && cfg.assistant?.showOnShop && (
          <button
            type="button"
            onClick={() => setAssistOpen(true)}
            className="btn btn-sm inline-flex items-center gap-2 border border-bronze bg-white text-graphite hover:bg-satin/60"
          >
            <Sparkles size={14} aria-hidden="true" />
            {cfg.assistant.buttonLabel || 'Help me choose'}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="search-sort" className="sr-only">Sort results</label>
          <select
            id="search-sort"
            value={params.get('sort') || (q ? 'relevance' : 'newest')}
            onChange={(e) => setOne('sort', e.target.value, true)}
            className="min-h-[44px] rounded-control border border-bronze bg-white px-3 text-body-sm text-graphite"
          >
            {SORTS.filter(([v]) => v !== 'relevance' || q).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[...params.entries()]
            .filter(([k, v]) => k !== 'q' && k !== 'page' && k !== 'sort' && v)
            .flatMap(([k, v]) => (MULTI.includes(k) ? v.split(',').filter(Boolean).map((x) => [k, x]) : [[k, v]]))
            .map(([k, v]) => (
              <button
                key={`${k}-${v}`}
                type="button"
                onClick={() => (MULTI.includes(k) ? toggleMany(k, v) : setOne(k, ''))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-bronze bg-white px-3.5 text-caption font-medium text-graphite transition hover:bg-satin/60"
              >
                {v}
                <X size={13} aria-hidden="true" />
                <span className="sr-only">Remove {k} filter {v}</span>
              </button>
            ))}
          <button
            type="button"
            onClick={clearAll}
            className="min-h-[44px] px-2 text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-12 2xl:grid-cols-[268px_minmax(0,1fr)] 2xl:gap-16 3xl:grid-cols-[288px_minmax(0,1fr)]">
        {/* ---------------- filters, desktop ---------------- */}
        <aside className="hidden min-w-0 lg:block">
          <SearchFilters
            facets={facets}
            params={params}
            onToggle={toggleMany}
            onSet={setOne}
            multi={MULTI}
          />
        </aside>

        {/* ---------------- results ---------------- */}
        <div className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 xl:grid-cols-4 2xl:gap-x-8 2xl:gap-y-14" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[3/4] w-full rounded-card" />
              ))}
            </div>
          ) : !products.length ? (
            <div>
              <EmptyState
                icon={SearchIcon}
                title={q ? `Nothing matched “${q}”` : 'Nothing here yet'}
                description={data?.recovery?.message || 'Try a different word, or remove a filter.'}
                onAction={activeCount ? clearAll : undefined}
                actionLabel="Clear filters"
                action={activeCount ? undefined : { label: 'Browse everything', to: '/shop' }}
              />

              {data?.recovery?.terms?.length > 0 && (
                <div className="mt-2 text-center">
                  <p className="text-label uppercase tracking-widest text-ash">Try one of these</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {data.recovery.terms.map((t) => (
                      <Link
                        key={t}
                        to={`/search?q=${encodeURIComponent(t)}`}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-bronze bg-white px-4 text-body-sm text-graphite transition hover:bg-satin/60"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {data?.recovery?.products?.length > 0 && (
                <section className="mt-10" aria-labelledby="rec-popular">
                  <h2 id="rec-popular" className="text-label uppercase tracking-widest text-ash">Popular right now</h2>
                  <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 xl:grid-cols-4 2xl:gap-x-8 2xl:gap-y-14">
                    {data.recovery.products.slice(0, 8).map((p) => (
                      <ProductCard key={p._id} product={p} headingLevel="h3" />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 xl:grid-cols-4 2xl:gap-x-8 2xl:gap-y-14">
                {products.map((p, i) => (
                  <div key={`${p._id}-${i}`} onClick={() => onCardClick(p, i)}>
                    <ProductCard
                      product={p}
                      headingLevel="h2"
                      marketingBadges={badgeMap[p.slug]}
                      promos={promosForProduct(promo.scope, promo.promotions, p)}
                      maxBadges={promo.badges?.maxPerCard || 2}
                    />
                  </div>
                ))}
              </div>

              {data?.hasMore && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="btn-primary min-w-[200px] disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                  <p className="mt-3 text-caption text-ash" aria-live="polite">
                    Showing {products.length} of {data.total}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ShoppingAssistant cfg={cfg} open={assistOpen} onClose={() => setAssistOpen(false)} />

      {/* ---------------- filters, mobile sheet ---------------- */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="flex max-h-[85svh] w-full flex-col rounded-t-panel bg-alabaster"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-h5">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="btn-icon-sm text-ash hover:text-obsidian"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <SearchFilters
                facets={facets}
                params={params}
                onToggle={toggleMany}
                onSet={setOne}
                multi={MULTI}
                touch
              />
            </div>
            <div className="shrink-0 border-t border-line p-4">
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary w-full">
                Show {data?.total ?? 0} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
