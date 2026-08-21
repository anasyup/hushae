import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import CollectionCard from '../components/CollectionCard';

/* ============================================================================
 * HUSHAE HOME — Mixtas × Quiet Luxury Flagship Standard
 *
 * SECTIONS:
 *   1. Clean Top Hero Banner (4-Slide Campaign Carousel with pill CTA)
 *   2. Seamless 4-Panel Unified Category Strip (Zero Gap, Full Bleed)
 *   3. Interactive "New Arrivals" Showcase with Dynamic Department Filter Tabs
 *   4. Asymmetric Luxury Bento Campaign Grid ("Where Comfort Meets Luxury")
 *   5. Curated Edit: Women's Collection (#women-section)
 *   6. Curated Edit: Men's Collection (#men-section)
 *   7. Curated Edit: The Seasonal Archive (#sale-section)
 *   8. Minimalist "The Inner Circle" Newsletter Block
 * ========================================================================== */

const IMG = '/images/campaign/qa';

/* ── 1. HERO SLIDES (4 Slides linked to Sections) ─────────────────────────── */
const HERO_SLIDES = [
  {
    id: 'new-arrivals',
    eyebrow: 'STUDIO SERIES · 2026',
    title: 'Second-Skin Essentials for Everyday Ease',
    description: 'Engineered in pure Lenzing micro-modal and fluid silk-touch fabrics for weightless comfort.',
    cta: 'Discover Collection',
    landscape: `${IMG}/hero-new-1.jpg`,
    portrait: `${IMG}/hero-m-1.jpg`,
    linkTo: '/new',
  },
  {
    id: 'women-section',
    eyebrow: 'WOMEN’S ATELIER',
    title: 'Weightless Support & Second-Skin Silhouettes',
    description: 'Wireless bras, seamless panties, and luxury silk-touch loungewear.',
    cta: 'Explore Women',
    landscape: `${IMG}/hero-new-2.jpg`,
    portrait: `${IMG}/hero-m-2.jpg`,
    linkTo: '/women',
  },
  {
    id: 'men-section',
    eyebrow: 'MEN’S ESSENTIALS',
    title: 'Engineered Precision & Natural Breathability',
    description: 'Breathable modal briefs, premium boxers, and ribbed undershirts.',
    cta: 'Explore Men',
    landscape: `${IMG}/hero-new-3.jpg`,
    portrait: `${IMG}/hero-m-3.jpg`,
    linkTo: '/men',
  },
  {
    id: 'sale-section',
    eyebrow: 'SEASONAL ARCHIVE',
    title: 'The Archive Studio Reductions',
    description: 'Exclusive seasonal reductions on signature modal, combed cotton, and luxury loungewear.',
    cta: 'Shop The Archive',
    landscape: `${IMG}/hero-new-4.jpg`,
    portrait: `${IMG}/hero-m-4.jpg`,
    linkTo: '/sale',
  },
];

function HeroSlides() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const current = HERO_SLIDES[idx];

  return (
    <section
      className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/9] w-full overflow-hidden bg-black text-white font-sans"
      aria-roledescription="carousel"
      aria-label="Campaign Highlights"
    >
      {/* Background Campaign Slides with Zero-Lag CSS GPU Crossfade */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.landscape}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-[800ms] ease-in-out ${
            i === idx ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
          }`}
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
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 md:bg-gradient-to-r md:from-black/75 md:via-black/30 md:to-transparent"
          />

          {/* Clean Editorial Typography & Discovery Pill (Mixtas Inspired) */}
          <div className="absolute inset-0 flex items-end md:items-center px-6 sm:px-12 md:px-16 lg:px-24 pb-14 sm:pb-16 md:pb-0">
            <div className="max-w-md sm:max-w-xl space-y-3">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-white/80">
                {s.eyebrow}
              </p>

              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.08]">
                {s.title}
              </h2>

              <p className="max-w-xs sm:max-w-md text-xs sm:text-sm font-normal text-white/90 leading-relaxed">
                {s.description}
              </p>

              <div className="pt-2">
                <Link
                  to={s.linkTo}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-white px-7 text-xs font-medium uppercase tracking-[0.18em] text-black hover:bg-neutral-200 transition-colors shadow-md"
                >
                  <span>{s.cta} &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Sleek, Borderless Hairline Slide Arrows */}
      <button
        type="button"
        onClick={() => setIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        aria-label="Previous slide"
        className="absolute left-3 sm:left-5 md:left-7 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center p-2 text-white/70 transition-all duration-200 hover:text-white hover:-translate-x-1 drop-shadow-md"
      >
        <ChevronLeft size={38} strokeWidth={1.2} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setIdx((i) => (i + 1) % HERO_SLIDES.length)}
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
            onClick={() => setIdx(i)}
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
    title: 'Bralettes & Tops',
    image: '/images/campaign/ck-tile-1.jpg',
    alt: 'Bralettes and Camisoles collection',
    womenHref: '/category/bras',
    menHref: '/category/vests-undershirts',
  },
  {
    title: 'Silk-Touch Lounge',
    image: '/images/campaign/ck-tile-2.jpg',
    alt: 'Silk-Touch Loungewear collection',
    womenHref: '/category/sleepwear-loungewear',
    menHref: '/category/thermal-sports',
  },
  {
    title: 'Thermal Layers',
    image: '/images/campaign/ck-tile-3.jpg',
    alt: 'Thermal and Base Layer collection',
    menHref: '/category/thermal-sports',
    womenHref: '/category/sleepwear-loungewear',
    reverseLinks: true,
  },
  {
    title: 'Signature Underwear',
    image: '/images/campaign/ck-tile-4.jpg',
    alt: 'Signature Modal Underwear collection',
    womenHref: '/category/panties',
    menHref: '/category/briefs',
  },
];

function SeamlessCategoryStripSection() {
  return (
    <section className="w-full overflow-hidden bg-black font-sans" aria-label="Featured Categories">
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

/* ── 3. INTERACTIVE "NEW ARRIVALS" SHOWCASE (MIXTAS INSPIRATION) ─────────── */
const NEW_ARRIVALS_TABS = [
  { id: 'all', label: 'All Pieces' },
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'bras', label: 'Bras & Tops' },
  { id: 'boxers', label: 'Briefs & Boxers' },
  { id: 'lounge', label: 'Loungewear' },
];

function InteractiveNewArrivalsSection({ products }) {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = useMemo(() => {
    if (!products || !products.length) return [];
    if (activeTab === 'all') return products.slice(0, 8);
    if (activeTab === 'women') return products.filter((p) => p.gender === 'women').slice(0, 8);
    if (activeTab === 'men') return products.filter((p) => p.gender === 'men').slice(0, 8);
    if (activeTab === 'bras') return products.filter((p) => p.categorySlug === 'bras' || p.categorySlug === 'camisoles-slips').slice(0, 8);
    if (activeTab === 'boxers') return products.filter((p) => p.categorySlug === 'briefs' || p.categorySlug === 'boxers' || p.categorySlug === 'trunks').slice(0, 8);
    if (activeTab === 'lounge') return products.filter((p) => p.categorySlug === 'sleepwear-loungewear' || p.categorySlug === 'thermal-sports').slice(0, 8);
    return products.slice(0, 8);
  }, [products, activeTab]);

  return (
    <section id="new-arrivals" className="w-full bg-[#FFFFFF] py-16 sm:py-20 md:py-24 font-sans">
      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
        {/* Centered Heading */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.14em] text-[#000000]">
            New Arrivals
          </h2>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-light">
            Season 2026 Atelier Collection
          </p>
        </div>

        {/* Centered Department Filter Tabs (Mixtas Register) */}
        <div className="mt-8 flex items-center justify-center overflow-x-auto no-scrollbar border-b border-[#EAEAEA] pb-3">
          <div className="flex items-center gap-6 sm:gap-8 whitespace-nowrap">
            {NEW_ARRIVALS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs uppercase tracking-[0.2em] transition-all pb-1.5 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-black font-semibold text-black'
                    : 'border-transparent font-normal text-neutral-400 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Column Product Grid (Clean Studio Canvas) */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {filtered.map((product) => (
            <CollectionCard key={product._id || product.slug} product={product} />
          ))}
        </div>

        {/* Bottom View All Link */}
        <div className="mt-12 text-center">
          <Link
            to="/new"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-neutral-300 bg-white px-8 text-xs font-medium uppercase tracking-[0.2em] text-black hover:border-black hover:bg-black hover:text-white transition-all shadow-xs"
          >
            <span>Explore All New Arrivals &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── 4. ASYMMETRIC LUXURY BENTO CAMPAIGN GRID (MIXTAS REGISTER) ──────────── */
function AsymmetricLuxuryBentoSection() {
  return (
    <section className="w-full bg-[#FAF8F5] py-16 sm:py-20 md:py-24 font-sans" aria-label="Atelier Stories">
      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">

          {/* Panel 1: Left Tall (5 Cols) — "Where Comfort Meets Luxury" */}
          <div className="lg:col-span-5 group relative rounded-3xl overflow-hidden bg-black text-white min-h-[460px] lg:min-h-[580px] flex flex-col justify-end p-8 sm:p-10 shadow-sm">
            <img
              src="/images/campaign/ck-feature-indigo.jpg"
              alt="Where Comfort Meets Luxury"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="relative z-10 space-y-2.5 max-w-sm">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">
                ETHEREAL ELEGANCE
              </p>
              <h3 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-white leading-tight">
                Where Comfort Meets Luxury
              </h3>
              <p className="text-xs text-white/90 font-light leading-relaxed">
                Second-skin modal silhouettes engineered to feel weightless throughout the day.
              </p>
              <div className="pt-2">
                <Link
                  to="/women"
                  className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-white px-6 text-xs font-medium uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors shadow-sm"
                >
                  Shop Women &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Right Bento Cluster (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">

            {/* Panel 2: Top Wide Span (2 Cols) — "Engineered for Every Move" */}
            <div className="sm:col-span-2 group relative rounded-3xl overflow-hidden bg-black text-white min-h-[260px] sm:min-h-[280px] flex flex-col justify-end p-7 sm:p-8 shadow-sm">
              <img
                src="/images/campaign/ck-feature-campus.jpg"
                alt="Engineered for Every Move"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="relative z-10 space-y-2 max-w-md">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">
                  ENGINEERED PRECISION
                </p>
                <h3 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-white">
                  Tailored Daily Essentials for Men
                </h3>
                <div className="pt-1">
                  <Link
                    to="/men"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white px-6 text-xs font-medium uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors"
                  >
                    Shop Men &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Panel 3: Bottom Left — "Silk-Touch Loungewear" */}
            <div className="group relative rounded-3xl overflow-hidden bg-[#1A1A1A] text-white min-h-[260px] flex flex-col justify-end p-6 sm:p-7 shadow-sm">
              <img
                src="/images/campaign/ck-tile-2.jpg"
                alt="Silk-Touch Loungewear"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="relative z-10 space-y-2">
                <p className="text-[9.5px] font-medium uppercase tracking-[0.24em] text-white/80">
                  SILK-TOUCH ATELIER
                </p>
                <h4 className="text-lg font-light uppercase tracking-tight text-white leading-tight">
                  Fluid Loungewear & Slips
                </h4>
                <div className="pt-1">
                  <Link
                    to="/category/sleepwear-loungewear"
                    className="text-xs font-medium uppercase tracking-wider text-white underline underline-offset-4 hover:text-neutral-300 transition-colors"
                  >
                    Explore &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Panel 4: Bottom Right — "The Seasonal Archive" (Accent Card) */}
            <div className="group relative rounded-3xl overflow-hidden bg-[#111111] text-white min-h-[260px] flex flex-col justify-between p-6 sm:p-7 shadow-sm border border-neutral-800">
              <div className="space-y-1">
                <p className="text-[9.5px] font-medium uppercase tracking-[0.24em] text-white/70">
                  THE ARCHIVE
                </p>
                <p className="text-xs font-light text-neutral-300">
                  Signature Studio Reductions
                </p>
              </div>

              <div className="space-y-3">
                <p className="font-sans text-4xl sm:text-5xl font-light text-white tracking-tight">
                  30% <span className="text-xl font-light tracking-widest text-neutral-400 uppercase">Off</span>
                </p>
                <Link
                  to="/sale"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white px-5 text-xs font-medium uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors"
                >
                  Shop Archive &rarr;
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

/* ── 5. PRISTINE CURATED GALLERY ROW ─────────────────────────────────────── */
function CuratedGallerySection({ id, eyebrow, title, products, viewAllHref, viewAllText = 'Explore All' }) {
  const items = (products || []).slice(0, 4);
  if (!items.length) return null;

  return (
    <section id={id} className="w-full bg-white py-16 sm:py-20 md:py-24 scroll-mt-20 font-sans">
      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
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

        {/* Clean 4-Column Product Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {items.map((product) => (
            <CollectionCard key={product._id || product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 6. LUXURY NEWSLETTER SECTION ─────────────────────────────────────────── */
function LuxuryNewsletterSection() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) { setErr('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('Please enter a valid email address.'); return; }
    setErr('');
    api('/subscribers', { method: 'POST', body: { email: v } }).catch(() => {});
    setDone(true);
  };

  return (
    <section className="bg-white px-6 py-24 md:py-32 text-center border-t border-neutral-100 font-sans">
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

        {done ? (
          <p className="pt-4 text-xs font-medium uppercase tracking-[0.2em] text-[#000000]">
            You&apos;re on the list.
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto flex max-w-sm items-end justify-center gap-3 pt-4" noValidate>
            <label htmlFor="home-nl-email" className="sr-only">Email address</label>
            <input
              id="home-nl-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
              placeholder="Enter your email"
              className="w-full border-0 border-b border-black/30 bg-transparent px-0 py-2.5 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="shrink-0 border-b border-black pb-1 text-xs font-medium uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-60"
            >
              Subscribe
            </button>
          </form>
        )}
        {err && <p className="pt-2 text-xs text-red-600 font-light">{err}</p>}
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
    api('/products?newArrival=true&sort=newest&limit=12')
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

      <h1 className="sr-only">
        HUSHAE — Premium innerwear and apparel for men and women
      </h1>

      {/* 01 — TOP HERO CAROUSEL WITH DISCOVERY PILL */}
      <HeroSlides />

      {/* 02 — SEAMLESS UNIFIED 4-PANEL CATEGORY STRIP */}
      <SeamlessCategoryStripSection />

      {/* 03 — INTERACTIVE "NEW ARRIVALS" SHOWCASE (MIXTAS REGISTER) */}
      <InteractiveNewArrivalsSection products={newArrivals} />

      {/* 04 — ASYMMETRIC LUXURY BENTO CAMPAIGN GRID */}
      <AsymmetricLuxuryBentoSection />

      {/* 05 — WOMEN'S STUDIO COLLECTION */}
      <CuratedGallerySection
        id="women-section"
        eyebrow="SECOND SKIN SILHOUETTES"
        title="Women's Collection"
        products={womenProducts}
        viewAllHref="/women"
      />

      {/* 06 — MEN'S ESSENTIALS COLLECTION */}
      <CuratedGallerySection
        id="men-section"
        eyebrow="ENGINEERED FIT & COMFORT"
        title="Men's Collection"
        products={menProducts}
        viewAllHref="/men"
      />

      {/* 07 — THE SEASONAL ARCHIVE */}
      <CuratedGallerySection
        id="sale-section"
        eyebrow="CURATED VALUE OFFERS"
        title="The Archive Sale"
        products={saleProducts}
        viewAllHref="/sale"
      />

      {/* 08 — THE INNER CIRCLE NEWSLETTER */}
      <LuxuryNewsletterSection />
    </div>
  );
}
