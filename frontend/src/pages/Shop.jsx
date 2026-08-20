import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { SearchX, Sparkles, ShieldCheck, Feather, Truck, ArrowRight } from 'lucide-react';
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
 * HUSHAE Catalog / Category — 100% Full-Bleed Edge-to-Edge Grid
 *
 * SPECIFICATION:
 *   - Cards connect directly to the left and right screen boundaries (w-full px-0).
 *   - Zero dead side margins on desktop and mobile viewports.
 *   - Top Atelier innovation ribbon & clean minimalist header.
 *   - Sub-category navigation & filter controls.
 *   - In-Grid 2-column editorial storytelling moments.
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
    moment1: {
      image: '/images/campaign/ck-feature-indigo.jpg',
      tag: 'STUDIO SERIES · 2026',
      title: 'The Second-Skin Series',
      desc: 'Seamless microfibre and modal silhouettes designed to feel weightless.',
      linkTo: '/category/bras',
      linkLabel: 'Shop Bras & Tops',
    },
    moment2: {
      image: '/images/campaign/ck-tile-1.jpg',
      tag: 'SILK-TOUCH ATELIER',
      title: 'The Silk-Touch Edit',
      desc: 'Fluid drapery and breathable nightwear finished to an international standard.',
      linkTo: '/category/sleepwear-loungewear',
      linkLabel: 'Shop Loungewear',
    },
  },
  men: {
    tag: "MEN'S ESSENTIALS",
    title: "Men's Collection",
    desc: 'Breathable modal briefs, combed cotton boxers, and ribbed undershirts tailored to stay in place all day.',
    moment1: {
      image: '/images/campaign/ck-feature-campus.jpg',
      tag: 'ENGINEERED PRECISION',
      title: 'The Core Foundation',
      desc: 'No-ride waistbands and breathable modal tailored for everyday ease.',
      linkTo: '/category/briefs',
      linkLabel: 'Shop Briefs & Trunks',
    },
    moment2: {
      image: '/images/campaign/ck-feature-underwear.jpg',
      tag: 'SECOND SKIN CRAFT',
      title: 'The Pure Modal Series',
      desc: 'Combed cotton ribs and contour pouches that hold their shape.',
      linkTo: '/category/boxers',
      linkLabel: 'Shop Boxers',
    },
  },
  new: {
    tag: 'THE STUDIO DROPS · SEASON 2026',
    title: 'New Arrivals',
    desc: 'Newly engineered silhouettes, second-skin fabrics, and fresh seasonal colorways.',
    moment1: {
      image: '/images/campaign/ck-feature-indigo.jpg',
      tag: 'STUDIO DROP 01',
      title: 'The Second-Skin Drop',
      desc: 'Deep tonal hues and second-skin fits engineered for transitional days.',
      linkTo: '/women',
      linkLabel: 'Explore Women',
    },
    moment2: {
      image: '/images/campaign/ck-feature-campus.jpg',
      tag: 'STUDIO DROP 02',
      title: 'The Essential Edit',
      desc: 'Precision cuts in breathable Lenzing micro-modal and combed cotton.',
      linkTo: '/men',
      linkLabel: 'Explore Men',
    },
  },
  best: {
    tag: 'HOUSE ICONS & CULT CLASSICS',
    title: 'Best Sellers',
    desc: 'The signature modal and combed cotton pieces our community reaches for, reorders, and covets daily.',
    moment1: {
      image: '/images/campaign/ck-feature-underwear.jpg',
      tag: 'HOUSE ICONS',
      title: 'The Cult Classics',
      desc: 'Rated 4.9 by verified clients across Pakistan.',
      linkTo: '/shop',
      linkLabel: 'Shop Icons',
    },
  },
  sale: {
    tag: 'THE SEASONAL ARCHIVE',
    title: 'The Archive Sale',
    desc: 'Curated seasonal reductions on signature modal, combed cotton, and luxury loungewear. Limited units remaining.',
    moment1: {
      image: '/images/campaign/qa/hero-fabric.jpg',
      tag: 'ARCHIVE SERIES',
      title: 'The Seasonal Archive',
      desc: 'Exclusive seasonal reductions while limited studio units last.',
      linkTo: '/sale',
      linkLabel: 'Shop Archive',
    },
  },
  all: {
    tag: 'COMPLETE EDIT',
    title: 'The Full Collection',
    desc: 'Premium innerwear and apparel crafted in Pakistan, finished to an international standard.',
    moment1: {
      image: '/images/campaign/ck-feature-indigo.jpg',
      tag: 'ATELIER EDIT',
      title: 'The Second-Skin Craft',
      desc: 'Crafted in Pakistan, finished to an international luxury standard.',
      linkTo: '/women',
      linkLabel: 'Explore Women',
    },
  },
};

const REVEAL = 12;

/* ── In-Grid Editorial Storytelling Card ── */
function InGridEditorialCard({ moment }) {
  if (!moment) return null;
  return (
    <div className="col-span-2 group relative overflow-hidden bg-[#111111] text-white flex flex-col justify-end p-6 sm:p-8 md:p-12 min-h-[360px] sm:min-h-[440px] aspect-[16/10] sm:aspect-[4/3] lg:aspect-auto">
      <img
        src={moment.image}
        alt={moment.title}
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="relative z-10 space-y-2.5 max-w-md">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">
          {moment.tag}
        </p>
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-tight text-white leading-tight">
          {moment.title}
        </h3>
        <p className="text-xs text-white/90 font-light leading-relaxed">
          {moment.desc}
        </p>
        <div className="pt-2">
          <Link
            to={moment.linkTo || '/shop'}
            className="inline-flex items-center gap-1.5 border-b border-white pb-0.5 text-xs font-medium uppercase tracking-wider text-white hover:text-neutral-200 transition-colors"
          >
            <span>{moment.linkLabel || 'Explore Edit'}</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

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
        moment1: BANNER_META[cat?.gender || 'women']?.moment1,
        moment2: BANNER_META[cat?.gender || 'women']?.moment2,
      };
    }
    return BANNER_META[preset.key] || BANNER_META.all;
  }, [f.category, activeCat, preset.key, meta]);

  const navCats = useMemo(() => (f.gender ? cats.filter((c) => c.gender === f.gender) : cats), [cats, f.gender]);
  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] pt-[120px] pb-28 font-sans text-[#111111] antialiased">
      <Seo
        title={`${meta} — HUSHAE`}
        description={`Shop premium ${meta.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 1. ATELIER INNOVATION & FABRIC RIBBON (TOP LUXURY TICKER) ═════ */}
      <div className="w-full bg-[#FBFBFB] border-b border-[#EAEAEA] py-2.5 px-6 md:px-12 text-[11px] text-neutral-600 font-light overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between gap-8 whitespace-nowrap">
          <span className="inline-flex items-center gap-2">
            <Feather size={13} className="text-black" />
            <span>95% Lenzing Modal &bull; Second-Skin Breathability</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-2">
            <Sparkles size={13} className="text-black" />
            <span>Zero-Chafe Bonded Flatlock Seams</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-2">
            <ShieldCheck size={13} className="text-black" />
            <span>100% Plain Discreet Parcel</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck size={13} className="text-black" />
            <span>Express Delivery Across Pakistan</span>
          </span>
        </div>
      </div>

      {/* ═══ 2. MINIMALIST LUXURY CATALOG HEADER ══════════════════════════ */}
      <div className="w-full px-6 md:px-12 pt-6 pb-6 border-b border-[#EAEAEA]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              {headerInfo.tag}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.1em] text-[#000000]">
              {headerInfo.title}
            </h1>
            <p className="text-xs sm:text-[13px] text-neutral-500 font-light leading-relaxed pt-1">
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

      {/* ═══ 3. SUB-CATEGORY NAVIGATION TABS (Clean & Smooth) ═════════════ */}
      {navCats.length > 0 && (
        <div className="w-full bg-[#FFFFFF] border-b border-[#EAEAEA] px-6 md:px-12 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 md:gap-8 py-3">
            <button
              type="button"
              onClick={() => f.setOne('category', '')}
              className={`inline-flex items-center text-[11.5px] uppercase tracking-[0.2em] transition-colors whitespace-nowrap pb-1 border-b-2 ${
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
                className={`inline-flex items-center text-[11.5px] uppercase tracking-[0.2em] transition-colors whitespace-nowrap pb-1 border-b-2 ${
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

      {/* ═══ 4. SINGLE CLEAN FILTER & SORT CONTROL ROW ═══════════════════ */}
      <LuxuryFilterBar count={count} f={f} onOpenFilters={() => setSheetOpen(true)} />

      {/* ═══ 5. FULL-BLEED EDGE-TO-EDGE PRODUCT GRID (ATTACHED TO BOUNDARIES) ═ */}
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
            {/* Grid connecting 100% to screen boundaries */}
            <div
              aria-busy={pending || undefined}
              className={`w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-1.5 md:gap-2 transition-opacity duration-300 ${
                pending ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {visibleSlice.map((p, i) => (
                <Fragment key={p._id || p.slug}>
                  {/* Insert 1st Editorial Storytelling Moment after Product 4 */}
                  {i === 4 && headerInfo?.moment1 && !f.hasActiveFilters && (
                    <InGridEditorialCard moment={headerInfo.moment1} />
                  )}

                  {/* Insert 2nd Editorial Storytelling Moment after Product 10 */}
                  {i === 10 && headerInfo?.moment2 && !f.hasActiveFilters && (
                    <InGridEditorialCard moment={headerInfo.moment2} />
                  )}

                  <CollectionCard
                    product={p}
                    rank={preset.key === 'best' && i < 4 ? i + 1 : null}
                  />
                </Fragment>
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
