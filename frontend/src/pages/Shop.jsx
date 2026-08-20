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
 * HUSHAE Catalog / Category — Quiet Luxury Architecture (The Row / CK / SSENSE)
 *
 * PHILOSOPHY — the listing page is a UTILITY, not a campaign:
 *   - Pure typographic header: title + piece count. No marketing eyebrows,
 *     no promotional blurbs, no photo banners. Photography belongs to the
 *     home page and the products themselves.
 *   - ONE control row: category tabs left, filter/sort right, one hairline.
 *     (Previously three stacked bands: header block + tab row + filter bar.)
 *   - Products above the fold on every viewport.
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

const TAB_BASE =
  'inline-flex items-center whitespace-nowrap border-b pb-2 pt-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors';
const TAB_ON = 'border-black font-medium text-black';
const TAB_OFF = 'border-transparent font-normal text-neutral-400 hover:text-black';

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
  const count = visible?.length ?? 0;

  /* /sale carries both departments, so it gets a typographic gender switch
     inside the same control row — same register as the category tabs, not a
     separate pill bar. */
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

      {/* ═══ 1. TYPOGRAPHIC HEADER — title + count, nothing else ══════════ */}
      <div className="mx-auto max-w-[1600px] px-6 pt-8 pb-6 md:px-12 md:pt-10">
        <h1 className="text-[22px] font-light uppercase tracking-[0.14em] text-black sm:text-[26px] md:text-[30px]">
          {title}
          <span className="ml-3 align-middle text-[12px] font-normal normal-case tracking-normal text-neutral-400 tabular-nums md:text-[13px]">
            {products === null ? '' : `${count} ${count === 1 ? 'piece' : 'pieces'}`}
          </span>
        </h1>
      </div>

      {/* ═══ 2. SINGLE CONTROL ROW — tabs left · filter/sort right ════════ */}
      <div className="border-y border-[#EAEAEA] bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-6 md:px-12">
          <nav
            aria-label="Categories"
            className="no-scrollbar flex min-w-0 flex-1 items-center gap-5 overflow-x-auto md:gap-7"
          >
            {showGenderTabs && (
              <>
                {GENDER_TABS.map((t) => (
                  <button
                    key={`g-${t.key}`}
                    type="button"
                    aria-pressed={(f.get('gender') || '') === t.key}
                    onClick={() => f.setOne('gender', t.key)}
                    className={`${TAB_BASE} ${(f.get('gender') || '') === t.key ? TAB_ON : TAB_OFF}`}
                  >
                    {t.label}
                  </button>
                ))}
                <span aria-hidden="true" className="h-4 w-px shrink-0 bg-[#EAEAEA]" />
              </>
            )}

            {!showGenderTabs && (
              <button
                type="button"
                onClick={() => f.setOne('category', '')}
                className={`${TAB_BASE} ${!f.category ? TAB_ON : TAB_OFF}`}
              >
                All
              </button>
            )}
            {navCats.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => f.setOne('category', f.category === c.slug ? '' : c.slug)}
                className={`${TAB_BASE} ${f.category === c.slug ? TAB_ON : TAB_OFF}`}
              >
                {c.name}
              </button>
            ))}
          </nav>

          <LuxuryFilterBar
            f={f}
            onOpenFilters={() => setSheetOpen(true)}
            filterBtnRef={filterBtnRef}
          />
        </div>
      </div>

      {/* ═══ 3. PRODUCT GRID ══════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8 pb-16 sm:px-6 md:px-12">
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
              className={`grid grid-cols-2 gap-4 transition-opacity duration-300 sm:gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-4 ${
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
                  className="flex h-12 w-full max-w-xs items-center justify-center border border-black bg-white text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
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
        resultCount={count}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
