import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import ActiveChips from './shop/ActiveChips';

/* ============================================================================
 * HUSHAE SHOP / CATEGORY — exact client reference ("Hushae - Women Collection").
 *   · 1600px container, 40/30 padding
 *   · simple header: 32px/400/-0.5px UPPERCASE title + 13px #666 subtitle
 *   · sticky filter bar (top 65px, white, hairline borders):
 *       left  = Filter & Refine (14px sliders icon) + item count
 *       right = native sort select (12px/500/0.5px UPPERCASE)
 *   · grid: 4 cols (30/20) → 3 cols ≤1024 → 2 cols ≤768 (20/12)
 *   · cards: CollectionCard (black badge, white heart, + Quick Add, swatches)
 * Functionality preserved: FilterSheet drawer, sort, active chips, LOAD MORE,
 * empty / skeleton states, SEO.
 * ========================================================================== */

const TITLES = { women: 'Women', men: 'Men', new: 'New Arrivals', best: 'Best Sellers', sale: 'Sale', all: 'Shop All' };

const SUBTITLES = {
  women: 'Essential silhouettes engineered for pure comfort and modern style.',
  men: 'Everyday essentials, engineered in Pakistan. Comfort that moves with you.',
  new: 'Fresh from the studio — the latest drops, here first.',
  best: 'Most-loved pieces, restocked and ready.',
  sale: 'Seasonal savings on signature pieces.',
  all: 'Premium innerwear made in Pakistan, finished to an international standard.',
};

/* Filter & Refine icon — exact SVG from the client reference (14px, stroke 2). */
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const REVEAL = 12; // initial batch shown; LOAD MORE reveals +12

export default function Shop({ preset = {} }) {
  const f = useShopFilters(preset);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(REVEAL);
  const filterBtnRef = useRef(null);

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  useEffect(() => {
    let alive = true; setPending(true); setShown(REVEAL);
    api(`/products?${f.queryString}${preset.key === 'new' ? '&newArrival=true&limit=12' : ''}`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]); // eslint-disable-line

  const visible = useMemo(() => applyClientFacets(products, f), [products, f]);
  const activeCat = cats.find((c) => c.slug === f.category);
  const fallbackCategoryName = f.category ? f.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const meta = activeCat ? activeCat.name : TITLES[preset.key] || fallbackCategoryName || (f.get('q') ? `"${f.get('q')}"` : TITLES.all);
  const subtitle = activeCat ? (activeCat.description || SUBTITLES.all) : SUBTITLES[preset.key] || SUBTITLES.all;
  const count = visible?.length ?? null;
  const activeFilterCount = f.activeCount;

  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="bg-white font-sans text-[#111111]" style={{ minHeight: '100vh' }}>
      <Seo
        title={`${meta}${f.gender ? ' — ' + f.gender.charAt(0).toUpperCase() + f.gender.slice(1) : ''} | HUSHAE`}
        description={`Shop premium ${meta.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      <div className="mx-auto max-w-[1600px] px-5 pb-20 pt-10 md:px-[30px]">
        {/* ═══ 1. HEADER — title + subtitle ═════════════════════════════ */}
        <div className="mb-[30px]">
          <h1 className="mb-2 text-[26px] font-normal uppercase leading-tight tracking-[-0.5px] text-[#111111] md:text-[32px]">
            {meta}
          </h1>
          <p className="text-[13px] text-[#666666]">{subtitle}</p>
        </div>

        {/* ═══ 2. FILTER BAR — sticky below header ═════════════════════ */}
        <div className="sticky top-[44px] z-[90] -mx-5 mb-10 border-y border-[#e5e5e5] bg-white px-5 lg:top-[65px] md:-mx-[30px] md:px-[30px]">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-5">
              <button
                ref={filterBtnRef}
                onClick={() => setSheetOpen(true)}
                className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.5px] text-[#111111] hover:opacity-60"
              >
                <FilterIcon />
                Filter &amp; Refine
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <span className="text-[12px] text-[#777777]">
                {count !== null ? `${count} Item${count === 1 ? '' : 's'}` : '—'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {activeFilterCount > 0 && (
                <button onClick={f.clearAll} className="hidden items-center gap-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[#777777] hover:text-[#111111] sm:flex">
                  Clear all <X size={12} />
                </button>
              )}
              <label className="sr-only" htmlFor="sort">Sort products</label>
              <select
                id="sort"
                value={f.sort}
                onChange={(e) => f.setOne('sort', e.target.value, { replace: true })}
                className="cursor-pointer bg-transparent text-[12px] font-medium uppercase tracking-[0.5px] text-[#111111] outline-none"
              >
                <option value="popular">Sort By: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* ═══ 3. ACTIVE CHIPS ════════════════════════════════════════ */}
        <ActiveChips chips={f.chips} onRemove={f.removeChip} onClearAll={f.clearAll} className="mb-6" />

        {/* ═══ 4. GRID ════════════════════════════════════════════════ */}
        {products === null ? (
          <ProductGridSkeleton count={9} />
        ) : count === 0 ? (
          <div>
            <EmptyState
              icon={SearchX}
              title="No results found"
              description="Try adjusting your filters or browse all products."
              onAction={f.clearAll}
              actionLabel="View all products"
            />
          </div>
        ) : (
          <>
            <div
              aria-busy={pending || undefined}
              className={`grid grid-cols-2 gap-x-3 gap-y-5 transition-opacity duration-300 md:grid-cols-3 md:gap-x-5 md:gap-y-[30px] lg:grid-cols-4 lg:gap-x-5 ${pending ? 'opacity-50' : 'opacity-100'}`}
            >
              {visibleSlice.map((p) => (
                <CollectionCard key={p._id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + REVEAL)}
                  className="inline-flex min-h-[48px] items-center justify-center bg-[#111111] px-12 text-[12px] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:bg-[#333333]"
                >
                  Load More ({visible.length - shown} left)
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══ 5. BOTTOM LINK ═════════════════════════════════════════ */}
        {preset.key === 'women' || preset.key === 'men' || preset.key === 'all' ? (
          <div className="mt-12 text-center">
            <Link to={preset.key === 'women' ? '/men' : '/women'} className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition hover:text-[#111111]">
              {preset.key === 'women' ? 'Shop Men' : 'Shop Women'}
            </Link>
          </div>
        ) : null}
      </div>

      {/* ═══ FILTER PANEL (mobile bottom sheet / desktop drawer) ═══ */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={f.clearAll}
        catList={f.gender ? cats.filter((c) => c.gender === f.gender) : cats}
        f={f}
        resultCount={count}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
