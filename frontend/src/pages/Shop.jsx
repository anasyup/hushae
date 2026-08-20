import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX } from 'lucide-react';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { fetchCats } from '../lib/catalogue';

/* ============================================================================
 * HUSHAE Catalog / Category — Maison PLP anatomy (Versace / Gucci / CK)
 *
 *   1. Centered category title — confident weight, generous whitespace
 *   2. Centered hairline-bordered category chips (square, wrap to rows)
 *   3. Three-zone control bar: FILTERS · count · SORT BY
 *   4. Product grid with editorial vertical rhythm
 *
 * No marketing eyebrows, no promotional blurbs, no photo banners — the
 * page is a utility framed with couture typography.
 * ========================================================================== */

const TITLES = {
  women: "Women's Collection",
  men: "Men's Collection",
  new: 'New Arrivals',
  best: 'Best Sellers',
  sale: 'Sale',
  all: 'The Collection',
};

const GENDER_TABS = [
  { key: '', label: 'All' },
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
];

const REVEAL = 12;

const CHIP =
  'inline-flex items-center whitespace-nowrap border px-4 py-2 text-[10.5px] uppercase tracking-[0.12em] transition-colors duration-200 min-h-[36px]';
const CHIP_ON = 'border-[#111111] text-[#111111] font-medium';
const CHIP_OFF = 'border-[#DDDDDD] text-[#555555] font-normal hover:border-[#111111] hover:text-[#111111]';

export default function Shop({ preset = {} }) {
  const f = useShopFilters(preset);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(REVEAL);
  const filterBtnRef = useRef(null);

  useEffect(() => { fetchCats().then(setCats); }, []);

  useEffect(() => {
    let alive = true;
    setPending(true);
    setShown(REVEAL);
    api(`/products?${f.queryString}${preset.key === 'new' ? '&newArrival=true' : ''}${preset.key === 'sale' ? '&sale=true' : ''}`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]);

  const visible = useMemo(() => applyClientFacets(products, f), [products, f]);
  const activeCat = cats.find((c) => c.slug === f.category);
  const fallbackCategoryName = f.category ? f.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const title = activeCat ? activeCat.name : TITLES[preset.key] || fallbackCategoryName || (f.get('q') ? `"${f.get('q')}"` : TITLES.all);
  const count = visible?.length ?? null;

  const showGenderTabs = preset.key === 'sale' && !preset.gender;
  const navCats = useMemo(() => (f.gender ? cats.filter((c) => c.gender === f.gender) : cats), [cats, f.gender]);
  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="min-h-screen bg-white pt-[120px] pb-24 font-sans text-[#111111] antialiased">
      <Seo
        title={`${title} — HUSHAE`}
        description={`Shop premium ${title.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 1. CENTERED MAISON HEADER ════════════════════════════════════ */}
      <header className="mx-auto max-w-[1600px] px-5 pt-10 pb-8 text-center md:px-10 md:pt-14 md:pb-10">
        <h1 className="text-[24px] font-medium uppercase tracking-[0.14em] text-[#111111] sm:text-[28px] md:text-[32px]">
          {title}
        </h1>

        {/* Gender switch (/sale) — centered hairline chips above categories */}
        {showGenderTabs && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5" role="group" aria-label="Department">
            {GENDER_TABS.map((t) => {
              const on = (f.get('gender') || '') === t.key;
              return (
                <button
                  key={`g-${t.key}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => f.setOne('gender', t.key)}
                  className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Category chips — centered, wrapping, hairline-bordered (Versace) */}
        {navCats.length > 0 && (
          <nav
            aria-label="Categories"
            className={`no-scrollbar -mx-5 flex items-center gap-2.5 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 ${showGenderTabs ? 'mt-3' : 'mt-7'}`}
          >
            <button
              type="button"
              onClick={() => f.setOne('category', '')}
              className={`${CHIP} ${!f.category ? CHIP_ON : CHIP_OFF}`}
            >
              View All
            </button>
            {navCats.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => f.setOne('category', f.category === c.slug ? '' : c.slug)}
                className={`${CHIP} ${f.category === c.slug ? CHIP_ON : CHIP_OFF}`}
              >
                {c.name}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* ═══ 2. THREE-ZONE CONTROL BAR ════════════════════════════════════ */}
      <LuxuryFilterBar
        count={count}
        f={f}
        onOpenFilters={() => setSheetOpen(true)}
        filterBtnRef={filterBtnRef}
      />

      {/* ═══ 3. PRODUCT GRID ══════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1600px] px-4 pt-10 pb-16 sm:px-6 md:px-10">
        {products === null ? (
          <ProductGridSkeleton count={8} />
        ) : count === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={SearchX}
              title="No pieces found"
              description="Try adjusting your filters or browse the complete collection."
              onAction={f.clearAll}
              actionLabel="View all products"
            />
          </div>
        ) : (
          <>
            <div
              aria-busy={pending || undefined}
              className={`grid grid-cols-2 gap-x-3 gap-y-8 transition-opacity duration-300 sm:gap-x-4 md:grid-cols-3 md:gap-y-12 lg:grid-cols-4 lg:gap-x-6 ${
                pending ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {visibleSlice.map((p) => (
                <CollectionCard key={p._id || p.slug} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="flex w-full justify-center pt-16 pb-4">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + REVEAL)}
                  className="flex h-12 w-full max-w-xs items-center justify-center border border-[#111111] bg-white text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white disabled:opacity-50"
                >
                  {pending ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Side Sheet (Full Facets Modal) */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={f.clearAll}
        catList={f.gender ? cats.filter((c) => c.gender === f.gender) : cats}
        f={f}
        resultCount={count ?? 0}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
