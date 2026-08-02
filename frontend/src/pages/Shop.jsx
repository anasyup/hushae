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
import CollectionBanner from '../components/collection/CollectionBanner';

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

      {/* MEASURED: probing /shop, /women, /sale and /search at 390px returned
          hasBanner:false on every one. Each opened with an eyebrow, an h1 and
          a sentence on flat alabaster, then went straight into the grid —
          precisely the default Shopify collection template.
          Replaced with an editorial masthead. Copy is unchanged and still
          comes from the TITLES map above; only the setting is new. */}
      <CollectionBanner
        eyebrow={`HUSHAE — ${f.gender || 'all'}`}
        title={meta[0]}
        blurb={meta[1]}
      />

      <div className="sticky top-[56px] z-[var(--z-sticky)] mb-6 flex items-center justify-between gap-3 border-y border-line bg-alabaster/90 py-3 backdrop-blur supports-[backdrop-filter]:bg-alabaster/75 lg:static lg:z-auto lg:mb-6 lg:border-y lg:py-3.5 lg:backdrop-blur-0">
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-line bg-white/70 px-4 text-btn-sm font-semibold uppercase text-obsidian transition-colors duration-base hover:border-obsidian/40 lg:hidden"
        >
          <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />
          Filter &amp; Sort
          {f.activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-obsidian px-1 text-[10px] font-bold text-alabaster">
              {f.activeCount}
            </span>
          )}
        </button>

        {/* The count is a live region so a filter change is announced rather
            than silently re-rendering the grid. Visible on mobile (primary
            experience) and desktop (kept as before). */}
        <p aria-live="polite" className="text-label uppercase text-ash lg:flex">
          {count === null ? 'Loading…' : `${count} piece${count === 1 ? '' : 's'}`}{pending && count !== null ? ' · updating' : ''}
        </p>

        <div className="relative">
          <label htmlFor="shop-sort" className="sr-only">Sort products</label>
          <select
            id="shop-sort"
            value={f.sort}
            /* Sorting reorders the same set — it replaces rather than pushes,
               so Back still undoes the last real filter. */
            onChange={(e) => f.setOne('sort', e.target.value, { replace: true })}
            className="min-h-[44px] appearance-none rounded-control border border-line bg-white/70 py-2.5 pl-3 pr-9 text-caption font-medium uppercase tracking-[0.1em] outline-none transition-colors duration-base ease-standard hover:border-obsidian/40 lg:pl-4"
          >
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ash" />
        </div>
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
              className={`grid grid-cols-2 gap-x-3 gap-y-8 transition-opacity duration-base sm:gap-x-gap-md sm:gap-y-gap-xl md:grid-cols-3 xl:grid-cols-4 2xl:gap-x-8 2xl:gap-y-14 ${
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
