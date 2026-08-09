import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import ActiveChips from './shop/ActiveChips';

/* ============================================================================
 * HUSHAE SHOP / CATEGORY — Zara-level editorial listing.
 *
 * Everything the brief asks for, wired to the existing API:
 *   · Category hero: full-width banner (category image when available,
 *     gradient fallback), category name, "X products", breadcrumbs.
 *   · Sticky toolbar: count + sort, solid bg, sticks below the header.
 *   · Filters: desktop sidebar (FilterSheet panel) + mobile bottom sheet —
 *     instant apply, CLEAR ALL, active chips.
 *   · Grid: 3 columns desktop / 2 mobile, staggered fade-in per card.
 *   · LOAD MORE: reveals the next batch with a fade (data already fetched,
 *     so client-side filters keep working perfectly — no page reload).
 *   · States: skeleton, empty ("No results"), error-safe.
 * ========================================================================== */

const TITLES = { women: 'Women', men: 'Men', new: 'New Arrivals', best: 'Best Sellers', sale: 'Sale', all: 'Shop All' };

/* Editorial hero imagery per route. Category pages use the real category
   photography when it exists, otherwise a quiet gradient. */
function heroFor({ preset, category, gender }) {
  if (category) {
    const img = `/images/categories/${category}.jpg`;
    return { img, gradient: false };
  }
  if (gender === 'women') return { img: '/images/campaign/hushae-hero-women.jpg', gradient: false };
  if (gender === 'men') return { img: '/images/campaign/hushae-hero-men.jpg', gradient: false };
  if (preset.key === 'sale') return { img: '/images/campaign/hushae-fabric.jpg', gradient: false };
  if (preset.key === 'new' || preset.key === 'best') return { img: '/images/campaign/hushae-fabric.jpg', gradient: false };
  return { img: '', gradient: true };
}

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
  const count = visible?.length ?? null;
  const activeFilterCount = f.activeCount;
  const hero = heroFor({ preset, category: f.category, gender: f.gender });
  const isCategory = !!f.category;
  const breadcrumbName = meta;

  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="bg-white text-neutral-900 font-sans" style={{ minHeight: '100vh' }}>
      <Seo
        title={`${meta}${f.gender ? ' — ' + f.gender.charAt(0).toUpperCase() + f.gender.slice(1) : ''} | HUSHAE`}
        description={`Shop premium ${meta.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 1. CATEGORY HERO ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-neutral-900">
        {hero.img ? (
          <img src={hero.img} alt={meta} loading="eager"
            className="absolute inset-0 h-full w-full object-cover object-center" />
        ) : null}
        {/* Veil — keeps text legible over any image */}
        <div className={`absolute inset-0 ${hero.img ? 'bg-gradient-to-t from-black/70 via-black/20 to-black/30' : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900'}`} />

        <div className="relative px-5 py-20 md:px-14 md:py-32 lg:px-20">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
            <Link to="/" className="transition hover:text-white">Home</Link>
            <ChevronRight size={11} aria-hidden="true" />
            <span aria-current="page" className="text-white/90">{breadcrumbName}</span>
          </nav>

          <h1 className="font-sans text-4xl font-bold uppercase tracking-[0.05em] text-white md:text-6xl"
            >
            {meta}
          </h1>
          <p className="mt-3 text-[13px] font-medium uppercase tracking-[0.2em] text-white/60">
            {count !== null ? `${count} product${count === 1 ? '' : 's'}` : 'Loading…'}
            {isCategory && activeCat ? ` · ${activeCat.name}` : ''}
          </p>
        </div>
      </section>

      {/* ═══ 2. TOOLBAR — sticky below header ═══════════════════════ */}
      <div className="sticky top-[44px] z-20 border-b border-neutral-200 bg-white/95 backdrop-blur lg:top-[80px]">
        <div className="px-5 md:px-12 lg:px-16">
          <div className="flex items-center justify-between py-3">
            <button
              ref={filterBtnRef}
              onClick={() => setSheetOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-900 hover:opacity-60"
            >
              <SlidersHorizontal size={14} /> Filter &amp; Sort
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-4">
              {activeFilterCount > 0 && (
                <button onClick={f.clearAll} className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.10em] text-neutral-500 hover:text-neutral-900">
                  Clear all <X size={12} />
                </button>
              )}
              <label className="sr-only" htmlFor="sort">Sort products</label>
              <select
                id="sort"
                value={f.sort}
                onChange={(e) => f.setOne('sort', e.target.value, { replace: true })}
                className="appearance-none cursor-pointer bg-transparent pr-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-900 outline-none"
              >
                {[['popular', 'Featured'], ['newest', 'Newest'], ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 3. MAIN — quick-nav pills + chips + grid ══════════════ */}
      <div className="px-5 py-8 md:px-14 lg:px-20 lg:py-12">
        {/* Subcategory quick-nav pills — CK-style horizontal scroll */}
        {isCategory && cats.length > 0 && (
          <div className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-12 md:px-12 lg:-mx-16 lg:px-16">
            {cats
              .filter((c) => c.gender === f.gender || !f.gender)
              .map((c) => {
                const on = f.category === c.slug;
                return (
                  <Link
                    key={c.slug}
                    to={on ? `/${f.gender || 'shop'}` : `/category/${c.slug}`}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 ${
                      on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900'
                    }`}
                  >
                    {c.name}
                  </Link>
                );
              })}
          </div>
        )}

        <ActiveChips chips={f.chips} onRemove={f.removeChip} onClearAll={f.clearAll} className="mb-5" />

        {/* Featured collection banners — CK 3-column shop cards */}
        {isCategory && (
          <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Shop Bras', sub: 'Support that disappears', img: '/images/categories/bras.jpg', href: '/category/bras' },
              { label: 'Shop Panties', sub: 'Everyday essentials', img: '/images/categories/panties.jpg', href: '/category/panties' },
              { label: 'The Fabric Guide', sub: 'Modal · Cotton · Stretch', img: '/images/campaign/hushae-fabric.jpg', href: '/about' },
            ].map((b) => (
              <Link key={b.label} to={b.href} className="group relative block overflow-hidden bg-neutral-100" style={{ aspectRatio: '4/3' }}>
                <img src={b.img} alt={b.label} loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1A12]/55 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-sans text-[17px] font-light uppercase tracking-[0.14em] text-white" >{b.label}</p>
                  <p className="mt-1 text-[10px] font-light uppercase tracking-[0.18em] text-white/70">{b.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

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
            {/* Grid — 2 mobile, 3 desktop, staggered fade */}
            <div
              aria-busy={pending || undefined}
              className={`grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6 transition-opacity duration-300 ${pending ? 'opacity-50' : 'opacity-100'}`}
            >
              {visibleSlice.map((p, i) => (
                <div
                  key={p._id}
                  className="animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ animationDelay: `${Math.min(i, 11) * 50}ms` }}
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            {/* LOAD MORE — appends next batch with fade */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + REVEAL)}
                  className="inline-flex min-h-[48px] items-center justify-center bg-charcoal px-12 text-[12px] font-medium uppercase tracking-[0.16em] text-pearl transition-colors duration-300 hover:bg-graphite"
                >
                  Load More ({visible.length - shown} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ 4. FILTER PANEL (mobile bottom sheet / desktop drawer) ═══ */}
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
