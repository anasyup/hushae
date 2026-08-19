import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import CollectionCard from '../components/CollectionCard';

/* ============================================================================
 * HUSHAE HOME — Calvin Klein Luxury Editorial Register (Exact Reference)
 *
 * SECTIONS:
 *   1. Clean Top Hero Banner (4-Slide Campaign Carousel with Direct Scroll Jumps)
 *   2. Seamless 4-Panel Unified Category Strip (Zero Gap, Flush)
 *   3. Curated Edit: New Arrivals (#new-arrivals)
 *   4. Full-Bleed Editorial Campaign: "New Iconic Indigo"
 *   5. Curated Edit: Women's Collection (#women-section)
 *   6. Full-Bleed Editorial Campaign: "Signature Underwear"
 *   7. Curated Edit: Men's Collection (#men-section)
 *   8. Full-Bleed Editorial Campaign: "The Campus Edit"
 *   9. Curated Edit: The Sale Edit (#sale-section)
 * ========================================================================== */

const IMG = '/images/campaign/qa';

/* ── 1. HERO SLIDES (4 Slides linked to 4 Sections) ───────────────────────── */
const HERO_SLIDES = [
  {
    id: 'new-arrivals',
    title: 'For Your Transitional Wardrobe',
    description: 'Polished outerwear and lightweight layers made for cool, unexpected days.',
    landscape: `${IMG}/hero-new-1.jpg`,
    portrait: `${IMG}/hero-m-1.jpg`,
    targetId: 'new-arrivals',
  },
  {
    id: 'women-section',
    title: 'The Women’s Collection',
    description: 'Second-skin bras, seamless panties, and luxury silk-touch loungewear.',
    landscape: `${IMG}/hero-new-2.jpg`,
    portrait: `${IMG}/hero-m-2.jpg`,
    targetId: 'women-section',
  },
  {
    id: 'men-section',
    title: 'The Men’s Collection',
    description: 'Breathable modal briefs, premium boxers, and ribbed undershirts.',
    landscape: `${IMG}/hero-new-3.jpg`,
    portrait: `${IMG}/hero-m-3.jpg`,
    targetId: 'men-section',
  },
  {
    id: 'sale-section',
    title: 'The Autumn Sale Edit',
    description: 'Exclusive seasonal discounts and signature value multipacks.',
    landscape: `${IMG}/hero-new-4.jpg`,
    portrait: `${IMG}/hero-m-4.jpg`,
    targetId: 'sale-section',
  },
];

function HeroSlides() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const scrollToSection = (targetId) => {
    const el = document.getElementById(targetId);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/9] w-full overflow-hidden bg-black text-white"
      aria-roledescription="carousel"
      aria-label="Campaign Highlights"
    >
      {/* Background Campaign Slides with Zero-Lag CSS GPU Crossfade */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.landscape}
          aria-hidden={i !== idx}
          onClick={() => scrollToSection(s.targetId)}
          className={`absolute inset-0 cursor-pointer transition-opacity duration-[800ms] ease-in-out ${i === idx ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}
        >
          {/* Static High-Res Background Image */}
          <picture className="block h-full w-full">
            <source media="(max-width: 767px)" srcSet={s.portrait} />
            <img
              src={s.landscape}
              alt={s.title}
              fetchpriority={i === 0 ? 'high' : 'auto'}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          </picture>

          {/* Multi-Stop Gradient Scrim */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20 md:bg-gradient-to-r md:from-black/75 md:via-black/30 md:to-transparent"
          />

          {/* Clean Editorial Typography */}
          <div className="absolute inset-0 flex items-end md:items-center px-6 sm:px-12 md:px-16 lg:px-24 pb-12 sm:pb-16 md:pb-0">
            <div className="max-w-md sm:max-w-xl space-y-2 sm:space-y-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.08]">
                {s.title}
              </h2>

              <p className="max-w-xs sm:max-w-md text-xs sm:text-sm font-normal text-white/90 leading-relaxed">
                {s.description}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Sleek, Borderless Hairline Slide Arrows */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
        }}
        aria-label="Previous slide"
        className="absolute left-3 sm:left-5 md:left-7 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center p-2 text-white/70 transition-all duration-200 hover:text-white hover:-translate-x-1 drop-shadow-md"
      >
        <ChevronLeft size={38} strokeWidth={1.2} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIdx((i) => (i + 1) % HERO_SLIDES.length);
        }}
        aria-label="Next slide"
        className="absolute right-3 sm:right-5 md:right-7 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center p-2 text-white/70 transition-all duration-200 hover:text-white hover:translate-x-1 drop-shadow-md"
      >
        <ChevronRight size={38} strokeWidth={1.2} aria-hidden="true" />
      </button>

      {/* Slide Indicator Line Ticks on Bottom */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1 transition-all duration-300 rounded-full ${i === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </section>
  );
}

/* ── 2. SEAMLESS UNIFIED 4-PANEL CATEGORY STRIP (ZERO GAP) ───────────────── */
const CATEGORY_CARDS = [
  {
    title: 'T-Shirts + Tanks',
    image: '/images/campaign/ck-tile-1.jpg',
    alt: 'T-Shirts and Tanks collection',
    womenHref: '/category/camisoles-slips',
    menHref: '/category/vests-undershirts',
  },
  {
    title: 'Jackets',
    image: '/images/campaign/ck-tile-2.jpg',
    alt: 'Jackets and outer layers',
    womenHref: '/category/sleepwear-loungewear',
    menHref: '/category/thermal-sports',
  },
  {
    title: 'Sweaters',
    image: '/images/campaign/ck-tile-3.jpg',
    alt: 'Knitwear and sweaters',
    menHref: '/category/thermal-sports',
    womenHref: '/category/sleepwear-loungewear',
    reverseLinks: true,
  },
  {
    title: 'Underwear',
    image: '/images/campaign/ck-tile-4.jpg',
    alt: 'Signature luxury underwear',
    womenHref: '/category/panties',
    menHref: '/category/briefs',
  },
];

function SeamlessCategoryStripSection() {
  return (
    <section className="w-full overflow-hidden bg-black" aria-label="Featured Categories">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 w-full">
        {CATEGORY_CARDS.map((card) => (
          <div
            key={card.title}
            className="group relative aspect-[3/4] sm:aspect-[4/5] md:aspect-[3/4] lg:aspect-[10/14] w-full overflow-hidden bg-[#1a1a1a] cursor-pointer"
          >
            <img
              src={card.image}
              alt={card.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center transition-opacity duration-300 group-hover:opacity-95"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-300"
            />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6 lg:p-7 text-white z-10">
              <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold tracking-tight text-white">
                {card.title}
              </h3>

              <div className="mt-2 sm:mt-2.5 flex items-center gap-3.5 sm:gap-4 text-[11px] sm:text-xs font-normal text-white">
                {card.reverseLinks ? (
                  <>
                    <Link
                      to={card.menHref}
                      className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                    >
                      <span>Shop Men</span>
                      <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                    </Link>
                    <Link
                      to={card.womenHref}
                      className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                    >
                      <span>Shop Women</span>
                      <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to={card.womenHref}
                      className="group/link inline-flex items-center gap-0.5 border-b border-white/70 pb-0.5 transition-all hover:border-white hover:text-white"
                    >
                      <span>Shop Women</span>
                      <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                    </Link>
                    <Link
                      to={card.menHref}
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
  );
}

/* ── 3. PRISTINE CURATED GALLERY ROW ─────────────────────────────────────── */
function CuratedGallerySection({ id, eyebrow, title, products, viewAllHref, viewAllText = 'Explore All' }) {
  const items = (products || []).slice(0, 4);
  if (!items.length) return null;

  return (
    <section id={id} className="w-full bg-white py-16 sm:py-20 md:py-24 scroll-mt-20">
      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
        {/* Minimalist Section Header */}
        <div className="flex flex-col justify-between sm:flex-row sm:items-end gap-3 pb-6 md:pb-8 border-b border-neutral-100 mb-8 md:mb-10">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.14em] text-[#111111]">
              {title}
            </h2>
          </div>

          <Link
            to={viewAllHref}
            className="group inline-flex items-center gap-1.5 border-b border-black/40 pb-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111] transition-colors hover:border-black"
          >
            <span>{viewAllText}</span>
            <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* Clean, High-Spaced 4-Column Product Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {items.map((product) => (
            <CollectionCard key={product._id || product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. FULL-BLEED FEATURE 01: "New Iconic Indigo" ────────────────────────── */
function FeatureIndigoSection() {
  return (
    <section className="relative w-full overflow-hidden bg-black text-white" aria-label="New Iconic Indigo">
      <div className="relative min-h-[540px] sm:min-h-[660px] md:min-h-[780px] lg:min-h-[880px] w-full flex items-center">
        <img
          src="/images/campaign/ck-feature-indigo.jpg"
          alt="New Iconic Indigo Campaign"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent md:from-black/75 md:via-black/25"
        />

        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 py-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md sm:max-w-lg space-y-4 md:space-y-6"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.02]">
              New<br />Iconic<br />Indigo
            </h2>

            <p className="max-w-xs sm:max-w-sm text-xs sm:text-sm font-normal text-neutral-300 leading-relaxed">
              Denim reinvented in a deep, tonal hue for fall. The wardrobe staples with staying power.
            </p>

            <div className="flex items-center gap-8 pt-3 text-xs sm:text-sm font-medium text-white">
              <Link
                to="/category/bras"
                className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-400 hover:text-neutral-200"
              >
                <span>Shop Women</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </Link>
              <Link
                to="/category/briefs"
                className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-400 hover:text-neutral-200"
              >
                <span>Shop Men</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── 5. FULL-BLEED FEATURE 02: "Signature Underwear" ──────────────────────── */
function FeatureUnderwearSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#f4f2ee] text-[#111111]" aria-label="Signature Underwear">
      <div className="relative min-h-[540px] sm:min-h-[660px] md:min-h-[780px] lg:min-h-[880px] w-full flex items-center">
        <img
          src="/images/campaign/ck-feature-underwear.jpg"
          alt="Signature Underwear Campaign"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/30 to-transparent md:from-white/60 md:via-transparent"
        />

        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 py-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md sm:max-w-lg space-y-4 md:space-y-6"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-[#111111] leading-[1.02]">
              Signature<br />Underwear
            </h2>

            <p className="max-w-xs sm:max-w-sm text-xs sm:text-sm font-normal text-neutral-800 leading-relaxed">
              Feel confident under anything. Smooth silhouettes with the updated logo waistband.
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
                to="/category/boxers"
                className="group inline-flex items-center gap-1.5 border-b border-black pb-1 transition-all hover:opacity-60"
              >
                <span>Shop Men</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── 6. FULL-BLEED FEATURE 03: "The Campus Edit" ──────────────────────────── */
function FeatureCampusSection() {
  return (
    <section className="relative w-full overflow-hidden bg-black text-white" aria-label="The Campus Edit">
      <div className="relative min-h-[540px] sm:min-h-[660px] md:min-h-[780px] lg:min-h-[880px] w-full flex items-center justify-center">
        <img
          src="/images/campaign/ck-feature-campus.jpg"
          alt="The Campus Edit Campaign"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/30 md:bg-black/25"
        />

        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 sm:px-12 py-20 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xs sm:max-w-md md:max-w-lg space-y-4 md:space-y-6"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.02] drop-shadow-lg">
              The<br />Campus<br />Edit
            </h2>

            <p className="mx-auto max-w-xs sm:max-w-sm text-xs sm:text-sm font-normal text-white/95 leading-relaxed drop-shadow">
              Start the year fresh in casual essentials. Made to transition seamlessly from class to after.
            </p>

            <div className="flex items-center justify-center gap-8 pt-3 text-xs sm:text-sm font-medium text-white drop-shadow">
              <Link
                to="/category/bras"
                className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-100"
              >
                <span>Shop Women</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </Link>
              <Link
                to="/category/vests-undershirts"
                className="group inline-flex items-center gap-1.5 border-b border-white pb-1 transition-all hover:border-neutral-300 hover:text-neutral-100"
              >
                <span>Shop Men</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══ PAGE ROOT ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const [newArrivals, setNewArrivals] = useState([]);
  const [womenProducts, setWomenProducts] = useState([]);
  const [menProducts, setMenProducts] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);

  useEffect(() => {
    api('/products?newArrival=true&sort=newest&limit=4')
      .then((d) => setNewArrivals(d.products || []))
      .catch(() => {});

    api('/products?gender=women&limit=4')
      .then((d) => setWomenProducts(d.products || []))
      .catch(() => {});

    api('/products?gender=men&limit=4')
      .then((d) => setMenProducts(d.products || []))
      .catch(() => {});

    api('/products?bestSeller=true&limit=4')
      .then((d) => setSaleProducts(d.products || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen w-full bg-white font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo
        title="Premium Innerwear & Apparel — HUSHAE"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />

      {/* Visually hidden H1 for SEO */}
      <h1 className="sr-only">
        HUSHAE — Premium innerwear and apparel for men and women
      </h1>

      {/* 01 — TOP HERO CAROUSEL */}
      <HeroSlides />

      {/* 02 — SEAMLESS UNIFIED 4-PANEL CATEGORY STRIP */}
      <SeamlessCategoryStripSection />

      {/* 03 — CURATED EDIT: NEW ARRIVALS (#new-arrivals) */}
      <CuratedGallerySection
        id="new-arrivals"
        eyebrow="NEW SEASON ESSENTIALS"
        title="New Arrivals"
        products={newArrivals}
        viewAllHref="/new"
      />

      {/* 04 — EDITORIAL CAMPAIGN 01: "New Iconic Indigo" */}
      <FeatureIndigoSection />

      {/* 05 — CURATED EDIT: WOMEN'S COLLECTION (#women-section) */}
      <CuratedGallerySection
        id="women-section"
        eyebrow="SECOND SKIN SILHOUETTES"
        title="Women's Collection"
        products={womenProducts}
        viewAllHref="/shop?gender=women"
      />

      {/* 06 — EDITORIAL FEATURE 02: "Signature Underwear" */}
      <FeatureUnderwearSection />

      {/* 07 — CURATED EDIT: MEN'S COLLECTION (#men-section) */}
      <CuratedGallerySection
        id="men-section"
        eyebrow="ENGINEERED FIT & COMFORT"
        title="Men's Collection"
        products={menProducts}
        viewAllHref="/shop?gender=men"
      />

      {/* 08 — EDITORIAL FEATURE 03: "The Campus Edit" */}
      <FeatureCampusSection />

      {/* 09 — CURATED EDIT: THE SALE ARCHIVE (#sale-section) */}
      <CuratedGallerySection
        id="sale-section"
        eyebrow="CURATED VALUE OFFERS"
        title="The Sale Edit"
        products={saleProducts}
        viewAllHref="/sale"
      />
    </div>
  );
}
