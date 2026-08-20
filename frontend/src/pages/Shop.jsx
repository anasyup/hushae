import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { fetchCats, fetchCollections } from '../lib/catalogue';

/* ============================================================================
 * HUSHAE Catalog / Category — Clean Luxury Architectural Standard
 * ========================================================================== */

const TITLES = {
  women: "Women's Collection",
  men: "Men's Collection",
  new: 'New Arrivals',
  best: 'Best Sellers',
  sale: 'The Archive Sale',
  all: 'The Full Collection',
};

const BANNER_META = {
  women: {
    tag: "WOMEN'S STUDIO",
    title: "Women's Collection",
    desc: 'Second-skin bras, seamless panties, and silk-touch loungewear engineered for weightless everyday comfort.',
  },
  men: {
    tag: "MEN'S ESSENTIALS",
    title: "Men's Collection",
    desc: 'Breathable modal briefs, combed cotton boxers, and ribbed undershirts tailored to stay in place all day.',
  },
  new: {
    tag: 'SEASON 2026',
    title: 'New Arrivals',
    desc: 'Newly engineered silhouettes, second-skin fabrics, and fresh seasonal colorways.',
  },
  best: {
    tag: 'HOUSE ICONS',
    title: 'Best Sellers',
    desc: 'The signature modal and combed cotton pieces our community reaches for, reorders, and covets daily.',
  },
  sale: {
    tag: 'THE ARCHIVE',
    title: 'The Archive Sale',
    desc: 'Curated seasonal reductions on signature modal, combed cotton, and luxury loungewear. Limited units remaining.',
  },
  all: {
    tag: 'ALL PIECES',
    title: 'The Full Collection',
    desc: 'Premium innerwear and apparel crafted in Pakistan, finished to an international standard.',
  },
};

const REVEAL = 12;

export default function Shop({ preset = {} }) {
  const f = useShopFilters(preset);
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(REVEAL);
  const filterBtnRef = useRef(null);

  useEffect(() => { fetchCats().then(setCats); }, []);
  useEffect(() => { fetchCollections().then(setCollections); }, []);

  useEffect(() => {
    let alive = true;
    setPending(true);
    setShown(REVEAL);
    api(`/products?${f.queryString}${preset.key === 'new' ? '&newArrival=true&limit=12' : ''}${preset.key === 'sale' ? '&sale=true' : ''}`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]);

  const visible = useMemo(() => applyClientFacets(products, f), [products, f]);
  const activeCat = cats.find((c) => c.slug === f.category);
  const fallbackCategoryName = f.category ? f.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const meta = activeCat ? activeCat.name : TITLES[preset.key] || fallbackCategoryName || (f.get('q') ? `"${f.get('q')}"` : TITLES.all);
  const count = visible?.length ?? 0;

  const headerInfo = useMemo(() => {
    if (f.category) {
      const cat = activeCat;
      return {
        tag: cat ? (cat.gender === 'men' ? "MEN'S ESSENTIALS" : "WOMEN'S STUDIO") : 'CATEGORY',
        title: meta,
        desc: cat?.description || BANNER_META.all.desc,
      };
    }
    return BANNER_META[preset.key] || BANNER_META.all;
  }, [f.category, activeCat, preset.key, meta]);

  const navCats = useMemo(() => (f.gender ? cats.filter((c) => c.gender === f.gender) : cats), [cats, f.gender]);
  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] pt-[110px] pb-24 font-sans text-[#111111] antialiased">
      <Seo
        title={`${meta} — HUSHAE`}
        description={`Shop premium ${meta.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 1. MINIMALIST LUXURY CATALOG HEADER ══════════════════════════ */}
      <div className="w-full px-6 md:px-12 pt-6 pb-6 border-b border-[#EAEAEA]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-neutral-400">
              {headerInfo.tag}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.1em] text-[#000000]">
              {headerInfo.title}
            </h1>
            <p className="text-xs sm:text-[13px] text-neutral-500 font-light leading-relaxed pt-0.5">
              {headerInfo.desc}
            </p>
          </div>

          {/* Department Quick Switch for /sale */}
          {preset.key === 'sale' && (
            <div className="flex items-center gap-2 text-xs">
              {[{ key: '', label: 'Shop All' }, { key: 'women', label: 'Women' }, { key: 'men', label: 'Men' }].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => f.setOne('gender', t.key)}
                  className={`rounded-full px-4 py-1.5 uppercase tracking-wider text-[11px] transition-colors ${
                    (f.get('gender') || '') === t.key
                      ? 'bg-black text-white'
                      : 'border border-neutral-200 bg-white text-neutral-600 hover:border-black'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 2. SUB-CATEGORY NAVIGATION TABS (Clean & Smooth) ═════════════ */}
      {navCats.length > 0 && (
        <div className="w-full bg-[#FFFFFF] border-b border-[#EAEAEA] px-6 md:px-12 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 md:gap-8 py-3">
            <button
              type="button"
              onClick={() => f.setOne('category', '')}
              className={`inline-flex items-center text-[11.5px] uppercase tracking-[0.18em] transition-colors whitespace-nowrap pb-1 border-b-2 ${
                !f.category
                  ? 'border-black font-medium text-[#000000]'
                  : 'border-transparent font-normal text-neutral-400 hover:text-black'
              }`}
            >
              All {f.gender ? (f.gender === 'women' ? 'Women' : 'Men') : 'Pieces'}
            </button>
            {navCats.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => f.setOne('category', f.category === c.slug ? '' : c.slug)}
                className={`inline-flex items-center text-[11.5px] uppercase tracking-[0.18em] transition-colors whitespace-nowrap pb-1 border-b-2 ${
                  f.category === c.slug
                    ? 'border-black font-medium text-[#000000]'
                    : 'border-transparent font-normal text-neutral-400 hover:text-black'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 3. SINGLE CLEAN FILTER & SORT CONTROL ROW ═══════════════════ */}
      <LuxuryFilterBar count={count} f={f} onOpenFilters={() => setSheetOpen(true)} />

      {/* ═══ 4. FULL-BLEED EDGE-TO-EDGE PRODUCT GRID ═══════════════════════ */}
      <div className="w-full px-0 pt-0 pb-16">
        {products === null ? (
          <div className="px-6 md:px-12 pt-8">
            <ProductGridSkeleton count={8} />
          </div>
        ) : count === 0 ? (
          <div className="py-24 text-center px-6">
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
            {/* Edge-to-Edge Grid connected to left & right screen boundaries */}
            <div
              aria-busy={pending || undefined}
              className={`w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-1.5 md:gap-2 transition-opacity duration-300 ${
                pending ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {visibleSlice.map((p, i) => (
                <CollectionCard
                  key={p._id || p.slug}
                  product={p}
                  rank={preset.key === 'best' && i < 4 ? i + 1 : null}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex w-full justify-center pt-16 pb-4 px-6">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + REVEAL)}
                  className="flex h-[48px] w-full max-w-xs items-center justify-center rounded-full border border-neutral-300 bg-white text-xs font-medium uppercase tracking-[0.2em] text-black hover:border-black hover:bg-black hover:text-white transition-all shadow-xs disabled:opacity-50"
                >
                  {pending ? 'Loading…' : `Load More (${visible.length - shown} remaining)`}
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
