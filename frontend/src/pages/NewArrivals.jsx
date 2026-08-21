import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  SearchX,
  Sparkles,
  ShieldCheck,
  Package,
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
 * HUSHAE NEW ARRIVALS — Calvin Klein (CK) Luxury Flagship Architecture
 *
 * ARCHITECTURE (Matches CK Global Flagship Aesthetic):
 *   1. Full-Bleed Editorial Campaign Hero ("For Your Transitional Wardrobe")
 *   2. Seamless 4-Panel Unified Category Strip (Zero-Gap Edge-to-Edge)
 *   3. Editorial Drop 01: "The Second-Skin Series" (Full-Bleed Campaign + Product Grid)
 *   4. Editorial Drop 02: "The Core Foundation" (Full-Bleed Studio Craft + Product Grid)
 *   5. Editorial Drop 03: "The Silk-Touch Atelier" (Full-Bleed Loungewear + Product Grid)
 *   6. Interactive Full Catalog Explorer (Sticky Filter & Sort Control Strip)
 *   7. Ethereal Atelier Provenance & Rewards Ribbon (Sage / Soft Alabaster)
 *   8. Minimalist 4-Column Department Navigation Strip (CK Standard)
 *   9. VIP Inner Circle Newsletter Block
 * ========================================================================== */

const CK_CATEGORY_TILES = [
  {
    title: 'Bralettes & Tops',
    image: '/images/campaign/ck-tile-1.jpg',
    womenHref: '/category/bras',
    menHref: '/category/vests-undershirts',
  },
  {
    title: 'Silk-Touch Lounge',
    image: '/images/campaign/ck-tile-2.jpg',
    womenHref: '/category/sleepwear-loungewear',
    menHref: '/category/thermal-sports',
  },
  {
    title: 'Thermal Layers',
    image: '/images/campaign/ck-tile-3.jpg',
    womenHref: '/category/sleepwear-loungewear',
    menHref: '/category/thermal-sports',
    reverse: true,
  },
  {
    title: 'Signature Underwear',
    image: '/images/campaign/ck-tile-4.jpg',
    womenHref: '/category/panties',
    menHref: '/category/briefs',
  },
];

const DEPARTMENT_TABS = [
  { id: 'all', label: 'All New In', gender: '', category: '' },
  { id: 'women', label: "Women's Drop", gender: 'women', category: '' },
  { id: 'men', label: "Men's Drop", gender: 'men', category: '' },
  { id: 'bras', label: 'Bras & Tops', gender: 'women', category: 'bras' },
  { id: 'panties', label: 'Seamless Panties', gender: 'women', category: 'panties' },
  { id: 'briefs', label: 'Briefs & Boxers', gender: 'men', category: 'briefs' },
  { id: 'lounge', label: 'Silk-Touch Lounge', gender: '', category: 'sleepwear-loungewear' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Drops' },
  { value: 'featured', label: 'Featured First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function NewArrivals() {
  const f = useShopFilters({ key: 'new', sort: 'newest' });
  const [allProducts, setAllProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [sortOpen, setSortOpen] = useState(false);
  const filterBtnRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    fetchCats().then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setPending(true);
    api(`/products?newArrival=true&limit=60&sort=${f.sort || 'newest'}`)
      .then((d) => {
        if (alive) {
          setAllProducts(d.products || []);
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

  // Filtered products for the catalog explorer
  const visible = useMemo(() => applyClientFacets(allProducts, f), [allProducts, f]);
  const count = visible?.length ?? 0;

  // Curated Drop Slices
  const drop01Products = useMemo(() => {
    return (allProducts || []).filter((p) => p.gender === 'women' || p.categorySlug === 'bras' || p.categorySlug === 'panties').slice(0, 4);
  }, [allProducts]);

  const drop02Products = useMemo(() => {
    return (allProducts || []).filter((p) => p.gender === 'men' || p.categorySlug === 'briefs' || p.categorySlug === 'boxers').slice(0, 4);
  }, [allProducts]);

  const drop03Products = useMemo(() => {
    return (allProducts || []).filter((p) => p.categorySlug === 'sleepwear-loungewear' || p.categorySlug === 'camisoles-slips').slice(0, 4);
  }, [allProducts]);

  const handleTabSelect = (tab) => {
    setActiveTab(tab.id);
    if (tab.gender) f.setOne('gender', tab.gender);
    else f.setOne('gender', '');

    if (tab.category) f.setOne('category', tab.category);
    else f.setOne('category', '');
  };

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === (f.sort || 'newest'))?.label || 'Newest Drops';

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] font-sans text-[#111111] antialiased selection:bg-black selection:text-white">
      <Seo
        title="New Arrivals — Season 2026 Atelier Collection — HUSHAE"
        description="Explore newly engineered silhouettes, weightless modal underwear, and silk-touch loungewear. Made in Pakistan, finished to an international standard."
        canonical="/new"
      />

      {/* ══════════════════════════════════════════════════════════════════════
          1. FULL-BLEED CK EDITORIAL CAMPAIGN HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] min-h-[520px] sm:min-h-[560px] md:min-h-[620px] w-full overflow-hidden bg-black text-white font-sans"
        aria-label="New Arrivals Campaign Hero"
      >
        <picture className="block h-full w-full">
          <source media="(max-width: 767px)" srcSet="/images/campaign/qa/hero-m-1.jpg" />
          <img
            src="/images/campaign/qa/hero-new-1.jpg"
            alt="For Your Transitional Wardrobe"
            fetchpriority="high"
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </picture>

        {/* Calvin Klein Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 md:bg-gradient-to-r md:from-black/80 md:via-black/30 md:to-transparent"
        />

        {/* Clean Editorial Typography & Links */}
        <div className="absolute inset-0 flex items-end md:items-center px-6 sm:px-12 md:px-16 lg:px-24 pb-14 sm:pb-16 md:pb-0">
          <div className="max-w-md sm:max-w-xl space-y-3.5">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase tracking-tight text-white leading-[1.08]">
              For Your Transitional Wardrobe
            </h1>

            <p className="max-w-xs sm:max-w-md text-xs sm:text-sm font-normal text-white/90 leading-relaxed">
              Polished silhouettes and lightweight second-skin layers made for cool, unexpected days.
            </p>

            {/* Direct Calvin Klein Editorial Links */}
            <div className="flex items-center gap-8 pt-3 text-xs sm:text-sm font-medium text-white">
              <button
                type="button"
                onClick={() => {
                  handleTabSelect(DEPARTMENT_TABS[1]); // Women
                  document.getElementById('catalog-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-200"
              >
                <span>Shop Women</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabSelect(DEPARTMENT_TABS[2]); // Men
                  document.getElementById('catalog-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-200"
              >
                <span>Shop Men</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. SEAMLESS 4-PANEL UNIFIED CATEGORY STRIP (ZERO GAP)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-black font-sans" aria-label="Featured Category Drops">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 w-full">
          {CK_CATEGORY_TILES.map((tile) => (
            <div
              key={tile.title}
              className="group relative aspect-[3/4] sm:aspect-[4/5] md:aspect-[3/4] lg:aspect-[10/14] w-full overflow-hidden bg-[#111111] cursor-pointer"
            >
              <img
                src={tile.image}
                alt={tile.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300"
              />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6 lg:p-7 text-white z-10">
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold tracking-tight text-white">
                  {tile.title}
                </h3>

                <div className="mt-2 sm:mt-2.5 flex items-center gap-3.5 sm:gap-4 text-[11px] sm:text-xs font-normal text-white">
                  {tile.reverse ? (
                    <>
                      <Link
                        to={tile.menHref}
                        className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                      >
                        <span>Shop Men</span>
                        <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                      </Link>
                      <Link
                        to={tile.womenHref}
                        className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                      >
                        <span>Shop Women</span>
                        <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to={tile.womenHref}
                        className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                      >
                        <span>Shop Women</span>
                        <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                      </Link>
                      <Link
                        to={tile.menHref}
                        className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                      >
                        <span>Shop Men</span>
                        <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. FULL-BLEED EDITORIAL 01: "The Second-Skin Series"
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-black text-white" aria-label="The Second-Skin Series">
        <div className="relative min-h-[540px] sm:min-h-[660px] md:min-h-[780px] lg:min-h-[880px] w-full flex items-center">
          <img
            src="/images/campaign/ck-feature-indigo.jpg"
            alt="The Second-Skin Series Campaign"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"
          />

          <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 py-20">
            <div className="max-w-md sm:max-w-lg space-y-4 md:space-y-6">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.02] drop-shadow-md">
                The<br />Second-Skin<br />Series
              </h2>

              <p className="max-w-xs sm:max-w-sm text-xs sm:text-sm font-normal text-white/95 leading-relaxed drop-shadow">
                Second-skin modal bralettes, weightless contour wear, and bonded seamless edges engineered to vanish under any fit.
              </p>

              <div className="flex items-center gap-8 pt-3 text-xs sm:text-sm font-medium text-white drop-shadow">
                <Link
                  to="/women"
                  className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-100"
                >
                  <span>Shop Women</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </Link>
                <Link
                  to="/men"
                  className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-100"
                >
                  <span>Shop Men</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Drop 01 Gallery */}
      {drop01Products.length > 0 && (
        <section className="w-full bg-[#FFFFFF] py-14 sm:py-18 border-b border-neutral-100">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
            <div className="flex items-end justify-between pb-6 border-b border-neutral-100 mb-8">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
                  WOMEN’S ATELIER
                </p>
                <h3 className="mt-1 text-2xl sm:text-3xl font-light uppercase tracking-[0.14em] text-[#111111]">
                  Signature Soft Cups & Tops
                </h3>
              </div>
              <Link
                to="/women"
                className="group inline-flex items-center gap-1.5 border-b border-black/40 pb-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111] hover:border-black"
              >
                <span>View All Women</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {drop01Products.map((p) => (
                <CollectionCard key={p._id || p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          4. FULL-BLEED EDITORIAL 02: "The Core Foundation"
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-[#ECE8E1]" aria-label="The Core Foundation">
        <div className="relative min-h-[540px] sm:min-h-[660px] md:min-h-[780px] lg:min-h-[880px] w-full flex items-center">
          <img
            src="/images/campaign/ck-feature-underwear.jpg"
            alt="The Core Foundation Campaign"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent md:from-white/85 md:via-white/40 md:to-transparent"
          />

          <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 py-20">
            <div className="max-w-md sm:max-w-lg space-y-4 md:space-y-6">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-[#111111] leading-[1.02]">
                The<br />Core<br />Foundation
              </h2>

              <p className="max-w-xs sm:max-w-sm text-xs sm:text-sm font-normal text-neutral-800 leading-relaxed">
                Contoured pouches, no-roll waistbands, and flatlock seams designed to feel invisible under anything.
              </p>

              <div className="flex items-center gap-8 pt-3 text-xs sm:text-sm font-medium text-[#111111]">
                <Link
                  to="/category/panties"
                  className="group inline-flex items-center gap-1.5 border-b border-black pb-1 transition-all hover:opacity-60"
                >
                  <span>Shop Women</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </Link>
                <Link
                  to="/category/briefs"
                  className="group inline-flex items-center gap-1.5 border-b border-black pb-1 transition-all hover:opacity-60"
                >
                  <span>Shop Men</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Drop 02 Gallery */}
      {drop02Products.length > 0 && (
        <section className="w-full bg-[#FFFFFF] py-14 sm:py-18 border-b border-neutral-100">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
            <div className="flex items-end justify-between pb-6 border-b border-neutral-100 mb-8">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
                  MEN’S ESSENTIALS
                </p>
                <h3 className="mt-1 text-2xl sm:text-3xl font-light uppercase tracking-[0.14em] text-[#111111]">
                  Precision Modal Briefs & Trunks
                </h3>
              </div>
              <Link
                to="/men"
                className="group inline-flex items-center gap-1.5 border-b border-black/40 pb-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111] hover:border-black"
              >
                <span>View All Men</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {drop02Products.map((p) => (
                <CollectionCard key={p._id || p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          5. FULL-BLEED EDITORIAL 03: "The Silk-Touch Atelier"
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-black text-white" aria-label="The Silk-Touch Atelier">
        <div className="relative min-h-[540px] sm:min-h-[660px] md:min-h-[780px] lg:min-h-[880px] w-full flex items-center justify-center">
          <img
            src="/images/campaign/ck-feature-campus.jpg"
            alt="The Silk-Touch Atelier Campaign"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/30 md:bg-black/25"
          />

          <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 sm:px-12 py-20 text-center flex flex-col items-center">
            <div className="max-w-xs sm:max-w-md md:max-w-lg space-y-4 md:space-y-6">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.02] drop-shadow-lg">
                The<br />Silk-Touch<br />Atelier
              </h2>

              <p className="mx-auto max-w-xs sm:max-w-sm text-xs sm:text-sm font-normal text-white/95 leading-relaxed drop-shadow">
                Fluid slips, loungewear sets, and breathable nightwear crafted for effortless transitions from studio to home.
              </p>

              <div className="flex items-center justify-center gap-8 pt-3 text-xs sm:text-sm font-medium text-white drop-shadow">
                <Link
                  to="/category/sleepwear-loungewear"
                  className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-100"
                >
                  <span>Shop Loungewear</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </Link>
                <Link
                  to="/category/camisoles-slips"
                  className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-100"
                >
                  <span>Shop Slips</span>
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. INTERACTIVE FULL CATALOG EXPLORER (Sticky Control Bar)
      ══════════════════════════════════════════════════════════════════════ */}
      <div id="catalog-explorer" className="w-full bg-[#FFFFFF] pt-14 pb-16 scroll-mt-24">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.32em] text-neutral-400">
              SEASON 2026 ATELIER
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.14em] text-[#000000]">
              The Complete New In Edit
            </h2>
          </div>

          {/* Department Switcher Tabs */}
          <div className="flex items-center justify-center overflow-x-auto no-scrollbar border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-6 sm:gap-8 whitespace-nowrap">
              {DEPARTMENT_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSelect(tab)}
                    className={`text-xs uppercase tracking-[0.2em] transition-all pb-1.5 border-b-2 ${
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

          {/* Filter & Sort Action Strip */}
          <div className="py-4 flex items-center justify-between gap-4">
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
                  }}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-neutral-400 hover:text-black transition-colors"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>

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

          {/* Full-Bleed 4-Column Product Grid */}
          <div className="w-full pt-2">
            {allProducts === null ? (
              <ProductGridSkeleton count={8} />
            ) : count === 0 ? (
              <div className="py-20 text-center">
                <EmptyState
                  icon={SearchX}
                  title="No pieces found"
                  description="No new arrivals match your selected criteria. Reset filters to see the full atelier collection."
                  onAction={() => {
                    f.clearAll();
                    setActiveTab('all');
                  }}
                  actionLabel="View all pieces"
                />
              </div>
            ) : (
              <div
                aria-busy={pending || undefined}
                className={`grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 transition-opacity duration-300 ${
                  pending ? 'opacity-50' : 'opacity-100'
                }`}
              >
                {visible.map((product) => (
                  <CollectionCard key={product._id || product.slug} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          7. ETHEREAL ATELIER PROVENANCE & REWARDS RIBBON (Sage Tone)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-[#8E9F90] text-white py-16 sm:py-20 px-6 text-center font-sans">
        <div className="mx-auto max-w-2xl space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/90">
            THE ATELIER EXPERIENCE
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light uppercase tracking-tight text-white leading-tight">
            Crafted for Second-Skin Ease.
          </h2>
          <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed max-w-lg mx-auto">
            Experience luxury innerwear engineered in Pakistan. 100% discreet packaging, 14-day seamless size exchanges, and complimentary express delivery nationwide.
          </p>
          <div className="pt-2">
            <Link
              to="/rewards"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/70 bg-white/10 backdrop-blur-md px-8 text-xs font-medium uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all shadow-sm"
            >
              Learn More &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. MINIMALIST 4-COLUMN DEPARTMENT NAVIGATION STRIP (CK Register)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-white py-14 sm:py-16 px-6 border-b border-neutral-100 font-sans">
        <div className="mx-auto max-w-[1400px] grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-black">New Arrivals</h4>
            <div className="flex items-center justify-center gap-3 text-xs text-neutral-500">
              <Link to="/women" className="hover:text-black hover:underline">Women</Link>
              <span>·</span>
              <Link to="/men" className="hover:text-black hover:underline">Men</Link>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-black">Bras & Tops</h4>
            <div className="flex items-center justify-center gap-3 text-xs text-neutral-500">
              <Link to="/category/bras" className="hover:text-black hover:underline">Women</Link>
              <span>·</span>
              <Link to="/category/vests-undershirts" className="hover:text-black hover:underline">Men</Link>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-black">Underwear</h4>
            <div className="flex items-center justify-center gap-3 text-xs text-neutral-500">
              <Link to="/category/panties" className="hover:text-black hover:underline">Women</Link>
              <span>·</span>
              <Link to="/category/briefs" className="hover:text-black hover:underline">Men</Link>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-black">Loungewear</h4>
            <div className="flex items-center justify-center gap-3 text-xs text-neutral-500">
              <Link to="/category/sleepwear-loungewear" className="hover:text-black hover:underline">Women</Link>
              <span>·</span>
              <Link to="/category/thermal-sports" className="hover:text-black hover:underline">Men</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          9. VIP INNER CIRCLE NEWSLETTER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-6 py-20 text-center font-sans">
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            STAY CONNECTED
          </p>
          <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-[0.14em] text-[#000000]">
            The Inner Circle
          </h2>
          <p className="text-xs sm:text-[13px] text-neutral-500 font-light leading-relaxed">
            First access to studio drops, private sales, and seasonal previews.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.target.elements.email;
              if (input && input.value) {
                api('/subscribers', { method: 'POST', body: { email: input.value } }).catch(() => {});
                alert('Thank you for subscribing to HUSHAE Inner Circle.');
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
