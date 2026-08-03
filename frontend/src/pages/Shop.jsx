import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, SearchX, SlidersHorizontal } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { usePromotions, useProductBadges, promosForProduct } from '../lib/usePromotions';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterPanel from './shop/FilterPanel';
import FilterSheet from './shop/FilterSheet';
import ActiveChips from './shop/ActiveChips';

const SORTS = [
  ['popular', 'Most Popular'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: Low to High'],
  ['price-desc', 'Price: High to Low'],
];

const TITLES = {
  women: ['Women', 'Second-skin essentials — bras, panties, shapewear, sleepwear and layers.'],
  men: ['Men', 'The everyday rotation, perfected — briefs, boxers, trunks, vests and base layers.'],
  new: ['New Arrivals', 'Fresh from the studio — the latest additions to the edit.'],
  best: ['Best Sellers', 'The pieces Pakistan keeps reordering.'],
  sale: ['Sale', 'Quiet luxury, gentler prices — while stock lasts.'],
  all: ['Shop All', 'The complete HUSHAE edit for men and women.'],
};

export default function Shop({ preset = {} }) {
  /* Marketing badges. One request for the whole grid, not one per card, and
     both hooks no-op when the merchant has marketing switched off. */
  const promo = usePromotions();
  const f = useShopFilters(preset);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  /* NIK SEN "View :" selector — desktop columns 2 / 3 / 4. Persisted in the
     URL (?view=4) so a refresh keeps the shopper's choice. */
  const [view, setView] = useState(() => {
    const v = Number(new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('view'));
    return [2, 3, 4].includes(v) ? v : 4;
  });
  const filterBtnRef = useRef(null);
  const firstLoad = useRef(true);

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  useEffect(() => {
    let alive = true;
    // The previous version set products back to null on every filter change,
    // which unmounted the grid and left the screen blank for a measured
    // 753ms. The old results now stay on screen, dimmed, until the new set
    // lands — so the page never collapses and cannot shift.
    setPending(true);
    api(`/products?${f.queryString}`)
      .then((d) => { if (alive) setProducts(d.products); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setPending(false); });
    // Only jump to the top when a filter changes, never on first paint.
    if (!firstLoad.current) window.scrollTo({ top: 0, behavior: 'smooth' });
    firstLoad.current = false;
    return () => { alive = false; };
  }, [f.queryString]);

  // Facets the API cannot express (second and later values in a multi-select,
  // availability) are applied here so the count and the grid always agree.
  const visible = useMemo(() => applyClientFacets(products, f), [products, f]);
  // Keyed on the rendered set, so a filter change re-asks for exactly the
  // cards on screen rather than the whole unfiltered fetch.
  const badgeMap = useProductBadges(visible);

  const activeCat = cats.find((c) => c.slug === f.category);
  const meta = activeCat
    ? [activeCat.name, activeCat.description]
    : TITLES[preset.key] || (f.get('q') ? [`“${f.get('q')}”`, 'Search results'] : TITLES.all);

  const catList = f.gender ? cats.filter((c) => c.gender === f.gender) : cats;
  const count = visible?.length ?? null;

  return (
    <div className="container-page py-8 md:py-10">
      <Seo
        title={`${meta[0]}${f.gender ? ' — ' + f.gender.charAt(0).toUpperCase() + f.gender.slice(1) : ''}`}
        description={meta[1] || 'Shop premium innerwear — bras, briefs, shapewear and more. Made in Pakistan.'}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ── NIK SEN collection masthead ──
          A fashion house names the collection and steps back: small eyebrow,
          one big title, one quiet line. No banner image, no cards. */}
      <header className="py-8 md:py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
          HUSHAE — {f.gender || 'all'}
        </p>
        <h1 className="mt-3 font-display text-3xl md:text-5xl lg:text-6xl font-light uppercase tracking-[0.04em] text-neutral-900 leading-[1.05]">
          {meta[0]}
        </h1>
        {meta[1] && (
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-500">{meta[1]}</p>
        )}
      </header>

      {/* ── NIK SEN toolbar: sub-category links · View : 2/4/8 · Sort by ── */}
      {(() => {
        const pk = preset.key;
        let quickLinks = [];
        if (pk === 'women') {
          quickLinks = [
            { label: 'All Women', val: '', field: 'category' },
            { label: 'Bras', val: 'bras', field: 'category' },
            { label: 'Panties', val: 'panties', field: 'category' },
            { label: 'Shapewear', val: 'shapewear', field: 'category' },
            { label: 'Sleepwear', val: 'sleepwear-loungewear', field: 'category' },
            { label: 'Camisoles', val: 'camisoles-slips', field: 'category' },
          ];
        } else if (pk === 'men') {
          quickLinks = [
            { label: 'All Men', val: '', field: 'category' },
            { label: 'Boxers', val: 'boxers', field: 'category' },
            { label: 'Briefs', val: 'briefs', field: 'category' },
            { label: 'Trunks', val: 'trunks', field: 'category' },
            { label: 'Vests', val: 'vests-undershirts', field: 'category' },
            { label: 'Sports', val: 'thermal-sports-innerwear', field: 'category' },
          ];
        } else if (pk === 'new' || pk === 'best') {
          const labelPrefix = pk === 'new' ? 'New' : 'Loved';
          quickLinks = [
            { label: pk === 'new' ? 'New In' : 'Best Sellers', val: '', field: 'gender' },
            { label: `${labelPrefix} Women`, val: 'women', field: 'gender' },
            { label: `${labelPrefix} Men`, val: 'men', field: 'gender' },
          ];
        }
        const hasLinks = quickLinks.length > 0;
        return (
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-neutral-200 pb-5 mb-8">
            <div className="flex flex-wrap gap-x-7 gap-y-2 text-[11px] uppercase tracking-[0.2em] font-medium text-neutral-400">
              {hasLinks ? quickLinks.map((ql) => {
                const currentVal = ql.field === 'category' ? f.category : f.get('gender');
                const on = currentVal === ql.val || (!currentVal && ql.val === '');
                return (
                  <button
                    key={ql.label}
                    onClick={() => {
                      if (ql.field === 'category') f.setOne('category', ql.val);
                      else f.setOne('gender', ql.val);
                    }}
                    className={`transition-colors hover:text-neutral-900 ${on ? 'text-neutral-900 underline underline-offset-8 decoration-1' : ''}`}
                  >
                    {ql.label}
                  </button>
                );
              }) : (
                <span aria-live="polite">{count === null ? '…' : `${count} piece${count === 1 ? '' : 's'}`}</span>
              )}
            </div>

            <div className="flex items-center gap-6">
              {/* View : 2 / 4 / 8 — NIK SEN grid selector */}
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-neutral-400">
                <span className="hidden sm:inline">View</span>
                {[2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => {
                      setView(v);
                      const u = new URL(window.location.href);
                      u.searchParams.set('view', String(v));
                      window.history.replaceState(null, '', u.toString());
                    }}
                    className={`transition-colors ${view === v ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-900'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Sort by */}
              <div className="relative">
                <label htmlFor="shop-sort" className="sr-only">Sort products</label>
                <select
                  id="shop-sort"
                  value={f.sort}
                  onChange={(e) => f.setOne('sort', e.target.value, { replace: true })}
                  className="appearance-none border-0 border-b border-neutral-300 bg-transparent py-1.5 pr-7 text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-900 outline-none transition-colors hover:border-neutral-900 focus:border-neutral-900 cursor-pointer"
                >
                  <option value="popular">Sort by · Best selling</option>
                  {SORTS.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile filter button + count row */}
      <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          className="inline-flex min-h-[40px] items-center gap-2 text-btn-sm font-semibold uppercase text-obsidian"
        >
          <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />
          Filters
          {f.activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-obsidian px-1 text-[10px] font-bold text-alabaster">
              {f.activeCount}
            </span>
          )}
        </button>
        <p aria-live="polite" className="text-label uppercase text-ash">
          {count === null ? 'Loading…' : `${count} piece${count === 1 ? '' : 's'}`}{pending && count !== null ? ' · updating' : ''}
        </p>
      </div>

      <ActiveChips chips={f.chips} onRemove={f.removeChip} onClearAll={f.clearAll} className="mb-7" />

      {/* PHASE 3. MEASURED: the sidebar stayed 236px and the grid 940px at
          1440, 1920 AND 2560 — the filter rail took a larger share of a wider
          screen while the products it filters did not grow at all. The rail now
          widens slightly and the gap opens, so the grid gains most of the extra
          width rather than the chrome. */}
      <div className="grid gap-10 lg:grid-cols-[236px_1fr] xl:gap-12 2xl:grid-cols-[268px_1fr] 2xl:gap-16 3xl:grid-cols-[288px_1fr]">
        <aside className="hidden lg:block" aria-label="Product filters">
          {/* top-24 clears the sticky header; the rail scrolls on its own so a
              long facet list never traps the page. */}
          <div className="sticky top-24 max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain pr-1">
            <FilterPanel catList={catList} f={f} />
          </div>
        </aside>

        <div>
          {products === null ? (
            <ProductGridSkeleton />
          ) : count === 0 ? (
            <div>
              <EmptyState
                icon={SearchX}
                title="Nothing matches those filters"
                description={
                  f.list('size').length && f.category === 'bras'
                    // Bras are sized 32B / 34C, not S / M, so a letter size can
                    // never match one. Say so rather than leaving a dead end.
                    ? 'Bras are sized by band and cup (32B, 34C), so letter sizes will not match. Remove the size filter to see them.'
                    : 'Try removing one — or clear them all and start again.'
                }
                onAction={f.clearAll}
                actionLabel="Clear all filters"
              />
              {/* The filters that produced nothing, still removable one by one
                  — clearing everything should not be the only way out. */}
              <ActiveChips chips={f.chips} onRemove={f.removeChip} onClearAll={f.clearAll} className="justify-center" />
            </div>
          ) : (
            <div
              /* Dimmed while a new result set is in flight. The grid keeps its
                 height, so refining a filter cannot shift the page. */
              aria-busy={pending || undefined}
              className={`grid grid-cols-2 gap-[2px] transition-opacity duration-base ${
                view === 2 ? 'md:grid-cols-2 xl:grid-cols-2' : view === 3 ? 'md:grid-cols-3 xl:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-4'
              } ${
                pending ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {visible.map((p) => (
                // Deliberately NOT eager. The source images are 1024x1024 PNGs
                // of ~2MB; marking the first row high-priority made them the
                // LCP element and pushed desktop LCP from 4.8s to 13.1s.
                <ProductCard
                  key={p._id}
                  product={p}
                  headingLevel="h2"
                  marketingBadges={badgeMap[p.slug]}
                  promos={promosForProduct(promo.scope, promo.promotions, p)}
                  maxBadges={promo.badges?.maxPerCard || 2}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={f.clearAll}
        catList={catList}
        f={f}
        resultCount={count}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
