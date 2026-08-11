import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import FilterPills from '../components/FilterPills';
import CategoryBanner from '../components/CategoryBanner';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { SIZES, COLORS, PRICE_BANDS } from './shop/FilterPanel';
import { fetchCats, fetchCollections } from '../lib/catalogue';

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
  women: { tag: 'Spring / Summer Edition', title: "Women's Essentials", desc: 'Engineered for second-skin comfort. Soft touch fabrics crafted with minimalist precision.' },
  men: { tag: 'The Essentials Edit', title: "Men's Essentials", desc: 'Everyday essentials engineered for comfort — soft-touch fabrics with a clean finish.' },
  new: { tag: 'New Season', title: 'New Arrivals', desc: 'Fresh from the studio — the latest drops, here first.' },
  best: { tag: 'Most Loved', title: 'Best Sellers', desc: 'The pieces our community reaches for again and again.' },
  sale: { tag: 'Seasonal Edit', title: 'Sale', desc: 'Seasonal savings on signature pieces.' },
  all: { tag: 'The Collection', title: 'Shop All', desc: 'Premium innerwear made in Pakistan, finished to an international standard.' },
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

  /* ── Category hero banner (client reference) ──────────────────────── */
  const banner = useMemo(() => {
    if (f.category) {
      const cat = activeCat;
      return {
        img: `/images/categories/${f.category}.jpg`,
        tag: cat ? (cat.gender === 'men' ? "Men's Collection" : "Women's Collection") : 'Collection',
        title: meta,
        desc: cat?.description || BANNER_META.all.desc,
      };
    }
    const m = BANNER_META[preset.key] || BANNER_META.all;
    const img = preset.key === 'new' || preset.key === 'best' ? '/images/campaign/qa/editorial-modern.jpg'
      : preset.key === 'sale' ? '/images/campaign/qa/hero-fabric.jpg'
      : preset.gender === 'women' ? '/images/campaign/qa/hero-women.jpg'
      : preset.gender === 'men' ? '/images/campaign/qa/hero-men.jpg'
      : '/images/campaign/qa/hero-fabric.jpg';
    return { img, tag: m.tag, title: m.title, desc: m.desc };
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
        title={`${meta}${f.gender ? ' — ' + f.gender.charAt(0).toUpperCase() + f.gender.slice(1) : ''} | HUSHAE`}
        description={`Shop premium ${meta.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 0. HERO BANNER — dark Best Sellers banner on /best, image banner elsewhere ═══ */}
      {preset.key === 'best' ? (
        <BestSellersBanner />
      ) : (
        <CategoryBanner img={banner.img} tag={banner.tag} title={banner.title} description={banner.desc} />
      )}

      <div className="px-5 pb-10 md:px-10 md:pb-[60px]">
        {preset.key === 'best' ? (
          /* Clean select dropdown bar — Best Sellers reference (categories removed) */
          <BestSellersFilterBar f={f} cats={cats} />
        ) : (
          <>
            {/* ═══ 1. SUB-CATEGORY TOP BAR ═════════════════════════════ */}
            {navCats.length > 0 && (
              <nav aria-label="Categories" className="flex flex-wrap items-center gap-x-7 gap-y-2 py-5 pb-[25px]">
                {navCats.map((c) => {
                  const on = f.category === c.slug;
                  return (
                    <a
                      key={c.slug}
                      href={`/category/${c.slug}`}
                      onClick={(e) => { e.preventDefault(); f.setOne('category', on ? '' : c.slug); }}
                      className={`text-[13px] text-[#111111] no-underline ${on ? 'underline underline-offset-4' : 'hover:underline underline-offset-4'}`}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </nav>
            )}

            {/* ═══ 2. FILTER PILLS BAR ═════════════════════════════════ */}
            <FilterPills
              countLabel={count !== null ? `${count} Item${count === 1 ? '' : 's'}` : '—'}
              sortValue={f.sort}
              sortLabel={SORT_LABELS[f.sort] || 'Featured'}
              onSortChange={(v) => f.setOne('sort', v, { replace: true })}
              pills={pills}
              onAllFilters={() => setSheetOpen(true)}
            />
          </>
        )}

        {/* ═══ 3. GRID ═════════════════════════════════════════════════ */}
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
              className={`grid grid-cols-2 gap-2.5 transition-opacity duration-300 md:grid-cols-3 md:gap-4 lg:grid-cols-4 ${pending ? 'opacity-50' : 'opacity-100'}`}
            >
              {visibleSlice.map((p) => (
                <CollectionCard key={p._id} product={p} />
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


/* ═══ BEST SELLERS — dark banner (reference) ═══════════════════════════ */
function BestSellersBanner() {
  return (
    <div className="relative flex h-64 items-center justify-start overflow-hidden bg-neutral-900 px-8 text-white md:h-80 md:px-16">
      <div className="relative z-10 max-w-lg">
        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Most Loved</span>
        <h1 className="my-2 font-serif text-3xl font-light uppercase tracking-wider md:text-5xl">Best Sellers</h1>
        <p className="text-xs font-light text-neutral-300">The pieces our community reaches for again and again.</p>
      </div>
    </div>
  );
}

/* ═══ BEST SELLERS — clean select filter bar (reference; categories removed) ═══ */
function BestSellersFilterBar({ f, cats }) {
  const priceBandKey = (() => {
    const b = PRICE_BANDS.find((x) => x.min === f.get('minPrice') && x.max === f.get('maxPrice'));
    return b ? b.key : '';
  })();
  const sel = (k) => f.list(k)[0] || '';
  const selectCls = 'cursor-pointer rounded-none border border-neutral-300 bg-white px-3 py-2 focus:outline-none';

  return (
    <div className="my-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 text-xs">
      <div className="flex flex-wrap items-center gap-4">
        <select value={f.category} onChange={(e) => f.setOne('category', e.target.value)} className={selectCls} aria-label="Category">
          <option value="">Category</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select
          value={priceBandKey}
          onChange={(e) => {
            const b = PRICE_BANDS.find((x) => x.key === e.target.value);
            f.setMany(b ? { minPrice: b.min, maxPrice: b.max } : { minPrice: '', maxPrice: '' });
          }}
          className={selectCls}
          aria-label="Price"
        >
          <option value="">Price</option>
          {PRICE_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
        <select value={sel('color')} onChange={(e) => f.setOne('color', e.target.value)} className={selectCls} aria-label="Color">
          <option value="">Color</option>
          {COLORS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={sel('size')} onChange={(e) => f.setOne('size', e.target.value)} className={selectCls} aria-label="Size">
          <option value="">Size</option>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="text-neutral-500">
        <span>Sort By: </span>
        <select value={f.sort} onChange={(e) => f.setOne('sort', e.target.value, { replace: true })} className="cursor-pointer border-none bg-transparent font-semibold text-black focus:outline-none" aria-label="Sort">
          <option value="popular">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="newest">Newest Arrivals</option>
        </select>
      </div>
    </div>
  );
}
