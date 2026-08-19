import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import EditorialHero from '../components/EditorialHero';
import SaleBanner from '../components/SaleBanner';
import NewArrivals3DBanner from '../components/NewArrivals3DBanner';
import SaleSplitBanner from '../components/SaleSplitBanner';
import NewArrivalsHero from '../components/NewArrivalsHero';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { SIZES, COLORS, PRICE_BANDS } from './shop/FilterPanel';
import { fetchCats, fetchCollections } from '../lib/catalogue';
import { PRODUCT_GRID_INNER } from '../lib/productGrid';

/* ============================================================================
 * HUSHAE SHOP / CATEGORY — exact client reference ("CK Style Collection Layout").
 *   · container: 0 40px 60px (15px mobile)
 *   · sub-category top bar (13px links, hover underline)
 *   · filter PILLS bar (Category / Price / Color / Size / Collection /
 *     All Filters) + item count + sort pill — each pill opens a dropdown
 *   · grid: 4 cols gap 16 → 3 cols ≤1024 → 2 cols ≤768 gap 10
 *   · cards: CollectionCard (crossfade, badge bottom-left, arrows,
 *     Quick View, dash indicators)
 * Functionality preserved: URL filters, sort, FilterSheet (All Filters),
 * LOAD MORE, empty / skeleton states, SEO.
 * ========================================================================== */

const TITLES = { women: 'Women', men: 'Men', new: 'New Arrivals', best: 'Best Sellers', sale: 'Sale', all: 'Shop All' };

const SORT_LABELS = { popular: 'Featured', 'price-asc': 'Price: Low to High', 'price-desc': 'Price: High to Low', newest: 'Newest Arrivals' };

/* Category banner copy per route (client reference register). */
const BANNER_META = {
  women: {
    tag: 'Spring / Summer Edition', title: "Women's Essentials",
    desc: 'Engineered for second-skin comfort. Soft touch fabrics crafted with minimalist precision.',
    strip: ['Spring / Summer Edition', 'Second Skin', 'Soft Touch', 'Delivered Worldwide'],
  },
  men: {
    tag: 'The Essentials Edit', title: "Men's Essentials",
    desc: 'Everyday essentials engineered for comfort — soft-touch fabrics with a clean finish.',
    strip: ['The Essentials Edit', 'Everyday Comfort', 'Clean Finish', 'Delivered Worldwide'],
  },
  new: { tag: 'New Season', title: 'New Arrivals', desc: 'Fresh from the studio — the latest drops, here first.' },
  best: {
    tag: 'Most Loved', title: 'Best Sellers',
    desc: 'The pieces our community reaches for again and again.',
    strip: ['Most Loved', 'Community Picks', 'Loved Again & Again', 'Delivered Worldwide'],
  },
  sale: { tag: 'Seasonal Edit', title: 'Sale', desc: 'Seasonal savings on signature pieces.' },
  all: {
    tag: 'The Collection', title: 'Shop All',
    desc: 'Premium innerwear made in Pakistan, finished to an international standard.',
    strip: ['The Collection', 'Full Catalogue', 'All Pieces', 'Delivered Worldwide'],
  },
};

const REVEAL = 12; // initial batch shown; LOAD MORE reveals +12

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
    let alive = true; setPending(true); setShown(REVEAL);
    api(`/products?${f.queryString}${preset.key === 'new' ? '&newArrival=true&limit=12' : ''}${preset.key === 'sale' ? '&sale=true' : ''}`)
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

  /* ── Category hero banner (client reference) ──────────────────────── */
  const banner = useMemo(() => {
    if (f.category) {
      const cat = activeCat;
      return {
        img: `/images/categories/${f.category}.jpg`,
        tag: cat ? (cat.gender === 'men' ? "Men's Collection" : "Women's Collection") : 'Collection',
        title: meta,
        desc: cat?.description || BANNER_META.all.desc,
        strip: BANNER_META.all.strip,
      };
    }
    const m = BANNER_META[preset.key] || BANNER_META.all;
    const img = preset.key === 'new' || preset.key === 'best' ? '/images/campaign/qa/editorial-modern.jpg'
      : preset.key === 'sale' ? '/images/campaign/qa/hero-fabric.jpg'
      : preset.gender === 'women' ? '/images/campaign/qa/hero-women.jpg'
      : preset.gender === 'men' ? '/images/campaign/qa/hero-men.jpg'
      : '/images/campaign/qa/hero-fabric.jpg';
    return { img, tag: m.tag, title: m.title, desc: m.desc, strip: m.strip || [] };
  }, [f.category, activeCat, preset.key, preset.gender, meta]);

  const navCats = useMemo(() => (f.gender ? cats.filter((c) => c.gender === f.gender) : cats), [cats, f.gender]);

  const priceBandKey = (() => {
    const b = PRICE_BANDS.find((x) => x.min === f.get('minPrice') && x.max === f.get('maxPrice'));
    return b ? b.key : '';
  })();

  const pills = [
    {
      key: 'category',
      label: 'Category',
      multi: false,
      options: navCats.map((c) => ({ value: c.slug, label: c.name })),
      selected: f.category ? [f.category] : [],
      onPick: (slug) => f.setOne('category', f.category === slug ? '' : slug),
    },
    {
      key: 'price',
      label: 'Price',
      multi: false,
      options: PRICE_BANDS.map((b) => ({ value: b.key, label: b.label })),
      selected: priceBandKey ? [priceBandKey] : [],
      onPick: (key) => {
        const b = PRICE_BANDS.find((x) => x.key === key);
        if (!b) return;
        if (priceBandKey === key) f.setMany({ minPrice: '', maxPrice: '' });
        else f.setMany({ minPrice: b.min, maxPrice: b.max });
      },
    },
    {
      key: 'color',
      label: 'Color',
      multi: true,
      options: COLORS.map((c) => ({ value: c.name, label: c.name })),
      selected: f.list('color'),
      onPick: (name) => f.toggleMany('color', name),
    },
    {
      key: 'size',
      label: 'Size',
      multi: true,
      options: SIZES.map((s) => ({ value: s, label: s })),
      selected: f.list('size'),
      onPick: (s) => f.toggleMany('size', s),
    },
    {
      key: 'collection',
      label: 'Collection',
      multi: false,
      options: collections.map((c) => ({ value: c.slug, label: c.name })),
      selected: [],
      onPick: (slug) => navigate(`/collection/${slug}`),
    },
  ];

  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="bg-white font-sans text-black" style={{ minHeight: '100vh' }}>
      <Seo
        title={meta}
        description={`Shop premium ${meta.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 0. HERO BANNER ═══════════════════════════════════════════ */}
      {preset.key === 'sale' ? (
        <>
          <SaleBanner />
          <SalePageHeader f={f} count={count} onOpenFilters={() => setSheetOpen(true)} />
        </>
      ) : preset.key === 'new' ? (
        <NewArrivalsHero count={count || 0} />
      ) : (
        <EditorialHero
          img={banner.img}
          tag={banner.tag}
          title={banner.title}
          description={banner.desc}
          count={count || 0}
          strip={banner.strip}
        />
      )}

      {/* ═══ SUB-CATEGORY QUICK PILL BAR (Luxury Horizontal Navigation) ═══ */}
      {navCats.length > 0 && (
        <div className="w-full bg-[#FFFFFF] border-b border-neutral-100 px-4 py-3 md:px-8 overflow-x-auto no-scrollbar">
          <div className="mx-auto flex max-w-[1600px] items-center gap-2">
            <button
              type="button"
              onClick={() => f.setOne('category', '')}
              className={`inline-flex min-h-[36px] items-center px-4 text-xs font-medium uppercase tracking-[0.14em] transition-all whitespace-nowrap ${
                !f.category
                  ? 'bg-black text-white'
                  : 'bg-neutral-100/80 text-neutral-800 hover:bg-black hover:text-white'
              }`}
            >
              All Pieces
            </button>
            {navCats.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => f.setOne('category', f.category === c.slug ? '' : c.slug)}
                className={`inline-flex min-h-[36px] items-center px-4 text-xs font-medium uppercase tracking-[0.14em] transition-all whitespace-nowrap ${
                  f.category === c.slug
                    ? 'bg-black text-white'
                    : 'bg-neutral-100/80 text-neutral-800 hover:bg-black hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 1. SINGLE CLEAN FILTER BAR (exact reference) ═══════════════ */}
      <LuxuryFilterBar count={count || 0} f={f} onOpenFilters={() => setSheetOpen(true)} />

      <div className="pb-10 md:pb-[60px]">
        {/* ═══ 2. GRID ═════════════════════════════════════════════════ */}
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
              className={`grid transition-opacity duration-300 ${pending ? 'opacity-50' : 'opacity-100'} ${
                /* Hairline grid: 1px gaps let the --line background show
                   through as the only divider. Full-bleed everywhere.
                   Shared with every other product list — see lib/productGrid. */
                PRODUCT_GRID_INNER
              }`}
            >
              {visibleSlice.map((p, i) => (
                <Fragment key={p._id}>
                  <CollectionCard product={p} variant="minimal" />
                  {preset.key === 'sale' && i === 7 && <SaleSplitBanner />}
                  {preset.key === 'new' && i === 7 && <NewArrivals3DBanner />}
                </Fragment>
              ))}
            </div>

            {hasMore && (
              <div className="flex w-full justify-center py-12">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + REVEAL)}
                  className="h-14 w-full max-w-xs border border-black bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-black hover:text-white disabled:opacity-50"
                >
                  {pending ? 'Loading...' : `Load More (${visible.length - shown} left)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ FILTER SHEET (All Filters) ═══════════════════════════════ */}
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



/* ═══ SALE PAGE HEADER — exact client reference (SalePageHeader) ═══════ */
function SalePageHeader({ f }) {
  const gender = f.get('gender');
  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 pb-8 font-klein-body">
      <span className="mb-2 block text-xs text-neutral-400">Sale</span>
      <h1 className="mb-6 text-4xl font-light uppercase tracking-[0.12em]">Sale</h1>

      {/* Gender sub-tabs.
          MEASURED 54x20 / 27x20 / 42x20 — these are the Sale page's primary
          filter controls and "Men" was a 27px-wide target. min-h-11 makes each
          a 44px row; the underline stays on the text via underline-offset, so
          the tab bar looks the same. role=tablist/tab so a screen reader
          announces them as a set with a selected state rather than three
          unrelated buttons. */}
      <div role="tablist" aria-label="Filter by gender" className="flex gap-6 border-b border-neutral-200 text-sm">
        {[
          { key: '', label: 'Shop All' },
          { key: 'men', label: 'Men' },
          { key: 'women', label: 'Women' },
        ].map((t) => {
          const active = (gender || '') === t.key;
          return (
            <button
              key={t.key || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => f.setOne('gender', t.key)}
              className={`inline-flex min-h-11 items-center pb-4 ${
                active ? 'font-semibold text-black underline underline-offset-8' : 'text-neutral-500 hover:text-black'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

    </div>
  );
}
