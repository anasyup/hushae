import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Filter,
  SlidersHorizontal,
  SearchX,
  Sparkles,
  ShieldCheck,
  Package,
  Layers,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import FilterSheet from './shop/FilterSheet';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import { fetchCats } from '../lib/catalogue';

/* ============================================================================
 * HUSHAE NEW ARRIVALS — High-Fashion Editorial Flagship (SSENSE × The Row × Calvin Klein)
 *
 * ARCHITECTURE:
 *   1. Full-Bleed Atelier Hero Banner with Responsive Campaign Photography & Discovery Pills
 *   2. The 3 Atelier Capsule Drops (The Second-Skin Series, The Core Foundation, The Silk-Touch Atelier)
 *   3. Minimalist Category Navigation & Dynamic Control Strip (Filters + Sort + Item Count)
 *   4. 100% Full-Bleed Edge-to-Edge Architectural Product Grid (3:4 Box Canvas)
 *   5. Embedded High-Fashion Editorial Campaign Interstitials (Balmain / CK Standard)
 *   6. "The Second-Skin Standard" Provenance & Craftsmanship Strip
 *   7. Atelier Drop Alerts Newsletter
 * ========================================================================== */

const CAPSULES = [
  {
    id: 'second-skin',
    badge: 'DROP 01 · CAPSULE',
    title: 'The Second-Skin Series',
    subtitle: 'Weightless Modal Bras, Briefs & Bralettes',
    desc: 'Engineered in ultra-fine Lenzing micro-modal with bonded seamless edges that disappear under clothing.',
    image: '/images/campaign/ck-tile-4.jpg',
    gender: 'women',
    tag: 'bras',
  },
  {
    id: 'core-foundation',
    badge: 'DROP 02 · CAPSULE',
    title: 'The Core Foundation',
    subtitle: 'Precision Combed-Cotton & Ribbed Briefs',
    desc: 'No-roll waistbands, breathable contoured pouches, and stay-true flatlock seams designed for everyday ease.',
    image: '/images/campaign/ck-feature-campus.jpg',
    gender: 'men',
    tag: 'briefs',
  },
  {
    id: 'silk-touch',
    badge: 'DROP 03 · CAPSULE',
    title: 'The Silk-Touch Atelier',
    subtitle: 'Fluid Loungewear, Robes & Relaxed Sets',
    desc: 'Featherweight draping modal blends and cloud-soft knit sets tailored for slow mornings and quiet evenings.',
    image: '/images/campaign/ck-tile-2.jpg',
    gender: 'women',
    tag: 'sleepwear-loungewear',
  },
];

const DEPARTMENT_TABS = [
  { id: 'all', label: 'All New In', gender: '', category: '' },
  { id: 'women', label: "Women's Studio", gender: 'women', category: '' },
  { id: 'men', label: "Men's Essentials", gender: 'men', category: '' },
  { id: 'bras', label: 'Bras & Tops', gender: 'women', category: 'bras' },
  { id: 'panties', label: 'Seamless Panties', gender: 'women', category: 'panties' },
  { id: 'briefs', label: 'Briefs & Boxers', gender: 'men', category: 'briefs' },
  { id: 'loungewear', label: 'Silk-Touch Lounge', gender: '', category: 'sleepwear-loungewear' },
  { id: 'shapewear', label: 'Contour & Shapers', gender: 'women', category: 'shapewear' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Drops' },
  { value: 'featured', label: 'Featured First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

const REVEAL_COUNT = 16;

export default function NewArrivals() {
  const f = useShopFilters({ key: 'new', sort: 'newest' });
  const [products, setProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [activeCapsule, setActiveCapsule] = useState(null);
  const [shown, setShown] = useState(REVEAL_COUNT);
  const [sortOpen, setSortOpen] = useState(false);
  const filterBtnRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    fetchCats().then(setCats).catch(() => {});
  }, []);

  // Fetch New Arrival products
  useEffect(() => {
    let alive = true;
    setPending(true);
    setShown(REVEAL_COUNT);

    api(`/products?newArrival=true&limit=60&sort=${f.sort || 'newest'}`)
      .then((d) => {
        if (alive) {
          setProducts(d.products || []);
          setPending(false);
        }
      })
      .catch(() => {
        if (alive) setPending(false);
      });

    return () => { alive = false; };
  }, [f.sort]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Tab Switch
  const handleTabSelect = (tab) => {
    setActiveTab(tab.id);
    setActiveCapsule(null);
    if (tab.gender) f.setOne('gender', tab.gender);
    else f.setOne('gender', '');

    if (tab.category) f.setOne('category', tab.category);
    else f.setOne('category', '');
  };

  // Handle Capsule Selection
  const handleCapsuleSelect = (cap) => {
    if (activeCapsule === cap.id) {
      setActiveCapsule(null);
      f.setOne('gender', '');
      f.setOne('category', '');
      setActiveTab('all');
    } else {
      setActiveCapsule(cap.id);
      if (cap.gender) f.setOne('gender', cap.gender);
      if (cap.tag) f.setOne('category', cap.tag);
      const matchingTab = DEPARTMENT_TABS.find((t) => t.category === cap.tag || (t.gender === cap.gender && !t.category));
      if (matchingTab) setActiveTab(matchingTab.id);
    }
  };

  // Filter products by client facets
  const visible = useMemo(() => applyClientFacets(products, f), [products, f]);
  const count = visible?.length ?? 0;
  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === (f.sort || 'newest'))?.label || 'Newest Drops';

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] font-sans text-[#111111] antialiased selection:bg-black selection:text-white">
      <Seo
        title="New Arrivals — Season 2026 Atelier Collection — HUSHAE"
        description="Explore newly engineered silhouettes, weightless modal underwear, and silk-touch loungewear. Made in Pakistan, finished to an international standard."
        canonical="/new"
      />

      {/* ══════════════════════════════════════════════════════════════════════
          1. FULL-BLEED EDITORIAL CAMPAIGN HERO BANNER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-black text-white font-sans">
        <div className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] min-h-[500px] sm:min-h-[540px] md:min-h-[580px] w-full">
          {/* Dual Responsive Campaign Photography */}
          <picture className="block h-full w-full">
            <source media="(max-width: 767px)" srcSet="/images/campaign/qa/hero-m-1.jpg" />
            <img
              src="/images/campaign/qa/hero-new-1.jpg"
              alt="HUSHAE Season 2026 New Arrivals Campaign"
              fetchpriority="high"
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          </picture>

          {/* Luxury Scrim Gradient */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 md:bg-gradient-to-r md:from-black/85 md:via-black/40 md:to-transparent"
          />

          {/* Hero Content & "GOL" Discovery Pills */}
          <div className="absolute inset-0 flex items-end md:items-center px-6 sm:px-12 md:px-16 lg:px-24 pb-12 sm:pb-16 md:pb-0">
            <div className="max-w-xl sm:max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 border border-white/15">
                <Sparkles size={13} className="text-white" />
                <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white">
                  ATELIER DROP · SEASON 2026
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase tracking-tight text-white leading-[1.08]">
                New Arrivals
              </h1>

              <p className="max-w-md sm:max-w-lg text-xs sm:text-sm text-white/90 font-normal leading-relaxed">
                Newly engineered silhouettes, buttery micro-modal weaves, and refined architectural foundations crafted for weightless all-day ease.
              </p>

              {/* Quick Jump Action Pills */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleTabSelect(DEPARTMENT_TABS[1]); // Women
                    document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#FFFFFF] px-6 text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:bg-neutral-200 transition-colors shadow-md"
                >
                  Shop Women&apos;s New In &rarr;
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabSelect(DEPARTMENT_TABS[2]); // Men
                    document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/40 bg-black/20 backdrop-blur-md px-6 text-xs font-medium uppercase tracking-[0.18em] text-[#FFFFFF] hover:bg-white hover:text-black transition-all"
                >
                  Shop Men&apos;s New In
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Provenance Bar */}
        <div className="border-t border-white/10 bg-[#0A0A0A] px-6 py-3.5 text-white/80">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10.5px] font-medium uppercase tracking-[0.24em] md:justify-between">
            <span className="flex items-center gap-2">
              <Package size={13} className="text-white/60" /> Handcrafted in Pakistan
            </span>
            <span className="hidden sm:inline text-white/30">·</span>
            <span>Second-Skin Micro-Modal Innovation</span>
            <span className="hidden sm:inline text-white/30">·</span>
            <span>{count} Freshly Engineered Pieces</span>
            <span className="hidden sm:inline text-white/30">·</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-white/60" /> Complimentary Express COD
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. THE 3 ATELIER CAPSULE DROPS (Interactive Showcase)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-[#FAF8F5] py-14 sm:py-16 md:py-20 border-b border-[#EAEAEA]" aria-label="Curated Capsule Drops">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 md:mb-10">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
                CURATED EDITS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-[0.12em] text-[#000000] mt-1">
                The 2026 Capsule Series
              </h2>
            </div>
            <p className="text-xs text-neutral-500 font-light max-w-sm">
              Tap any capsule to filter and explore its signature pieces directly in the catalog below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {CAPSULES.map((cap) => {
              const isSelected = activeCapsule === cap.id;
              return (
                <div
                  key={cap.id}
                  onClick={() => {
                    handleCapsuleSelect(cap);
                    document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`group relative rounded-3xl overflow-hidden bg-black text-white cursor-pointer transition-all duration-300 min-h-[360px] sm:min-h-[400px] flex flex-col justify-end p-7 sm:p-8 shadow-sm ${
                    isSelected
                      ? 'ring-2 ring-black ring-offset-4 ring-offset-[#FAF8F5]'
                      : 'hover:shadow-md'
                  }`}
                >
                  <img
                    src={cap.image}
                    alt={cap.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-medium uppercase tracking-[0.26em] text-white/80">
                        {cap.badge}
                      </span>
                      {isSelected && (
                        <span className="rounded-full bg-white text-black px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          Active Filter
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-white leading-tight">
                      {cap.title}
                    </h3>

                    <p className="text-xs text-white/80 font-light leading-relaxed line-clamp-2">
                      {cap.desc}
                    </p>

                    <div className="pt-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-white group-hover:underline underline-offset-4">
                      <span>{isSelected ? 'Reset Filter' : 'Explore Capsule'}</span>
                      <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. MINIMALIST CATEGORY TABS & DYNAMIC CONTROL STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <div id="catalog-grid" className="sticky top-[96px] z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#EAEAEA] scroll-mt-28">
        {/* Horizontal Department Filter Tabs */}
        <div className="w-full px-6 sm:px-10 lg:px-12 overflow-x-auto no-scrollbar border-b border-neutral-100">
          <div className="flex items-center gap-6 sm:gap-8 py-3 whitespace-nowrap">
            {DEPARTMENT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSelect(tab)}
                  className={`text-xs uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${
                    isActive
                      ? 'border-black font-semibold text-black'
                      : 'border-transparent font-normal text-neutral-400 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action & Filter Bar (Mixtas standard) */}
        <div className="w-full px-6 sm:px-10 lg:px-12 py-3 flex items-center justify-between gap-4">
          {/* Left: Filter Trigger Button */}
          <div className="flex items-center gap-3">
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex h-[38px] items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-xs font-medium uppercase tracking-[0.18em] text-black hover:border-black transition-colors shadow-xs"
            >
              <SlidersHorizontal size={13} strokeWidth={1.6} />
              <span>Filters {f.activeCount > 0 && `(${f.activeCount})`}</span>
            </button>

            {f.activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  f.clearAll();
                  setActiveTab('all');
                  setActiveCapsule(null);
                }}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-neutral-400 hover:text-black transition-colors"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Count & Sort Dropdown */}
          <div className="flex items-center gap-4">
            <span className="text-[11.5px] font-normal uppercase tracking-[0.2em] text-neutral-400">
              {count} {count === 1 ? 'Piece' : 'Pieces'}
            </span>

            {/* Luxury Sort Dropdown */}
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="inline-flex h-[38px] items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-xs font-medium uppercase tracking-[0.16em] text-black hover:border-black transition-colors shadow-xs"
              >
                <span>{currentSortLabel}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl z-50"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          f.setOne('sort', opt.value);
                          setSortOpen(false);
                        }}
                        className={`w-full rounded-xl px-3.5 py-2 text-left text-xs uppercase tracking-wider transition-colors ${
                          (f.sort || 'newest') === opt.value
                            ? 'bg-neutral-100 font-semibold text-black'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. 100% FULL-BLEED EDGE-TO-EDGE ARCHITECTURAL PRODUCT GRID
      ══════════════════════════════════════════════════════════════════════ */}
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
              description="No new arrivals match your selected criteria. Reset filters to see the full atelier collection."
              onAction={() => {
                f.clearAll();
                setActiveTab('all');
                setActiveCapsule(null);
              }}
              actionLabel="View all new arrivals"
            />
          </div>
        ) : (
          <>
            {/* Edge-to-Edge Grid touching boundaries */}
            <div
              aria-busy={pending || undefined}
              className={`w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-1.5 md:gap-2 transition-opacity duration-300 ${
                pending ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {visibleSlice.map((p, i) => {
                // Interspersed High-Fashion Editorial Break at item 4
                if (i === 4 && visibleSlice.length > 4) {
                  return (
                    <div key="editorial-break-1" className="col-span-2 relative aspect-[3/4] sm:aspect-[16/9] md:aspect-[3/4] lg:aspect-auto lg:row-span-2 overflow-hidden bg-black text-white flex flex-col justify-end p-8 sm:p-10">
                      <img
                        src="/images/campaign/qa/editorial-performance.jpg"
                        alt="The Fabric Innovation"
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="relative z-10 space-y-2.5 max-w-sm">
                        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">
                          ATELIER CRAFTSMANSHIP
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-white leading-tight">
                          The Second-Skin Feel
                        </h3>
                        <p className="text-xs text-white/90 font-light leading-relaxed">
                          3x softer than conventional cotton. Naturally breathable micro-modal fibers engineered for weightless all-day ease.
                        </p>
                        <div className="pt-2">
                          <Link
                            to="/fit-finder"
                            className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white px-6 text-xs font-medium uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors shadow-sm"
                          >
                            Find Your Fit &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <CollectionCard
                    key={p._id || p.slug}
                    product={p}
                  />
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex w-full justify-center pt-16 pb-4 px-6">
                <button
                  type="button"
                  onClick={() => setShown((s) => s + REVEAL_COUNT)}
                  className="flex h-[48px] w-full max-w-xs items-center justify-center rounded-full border border-neutral-300 bg-white text-xs font-medium uppercase tracking-[0.2em] text-black hover:border-black hover:bg-black hover:text-white transition-all shadow-xs disabled:opacity-50"
                >
                  {pending ? 'Loading…' : `Load More (${visible.length - shown} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. THE INNER CIRCLE DROP ALERTS (Newsletter)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-[#EAEAEA] bg-[#FAF8F5] px-6 py-20 md:py-28 text-center font-sans">
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            PRIVATE ACCESS
          </p>
          <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-[0.14em] text-[#000000]">
            Atelier Drop Alerts
          </h2>
          <p className="text-xs sm:text-[13px] text-neutral-500 font-light leading-relaxed">
            Be the first to know when new seasonal silhouettes and limited-run colorways release.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.target.elements.email;
              if (input && input.value) {
                api('/subscribers', { method: 'POST', body: { email: input.value } }).catch(() => {});
                alert('Thank you for subscribing to HUSHAE Atelier Drop Alerts.');
                input.value = '';
              }
            }}
            className="mx-auto flex max-w-sm items-end justify-center gap-3 pt-3"
          >
            <input
              name="email"
              type="email"
              placeholder="Enter your email address"
              required
              className="w-full border-0 border-b border-black/30 bg-transparent px-0 py-2 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="shrink-0 border-b border-black pb-1 text-xs font-medium uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-60"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

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
