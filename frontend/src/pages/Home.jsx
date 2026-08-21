import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, ShieldCheck, Package } from 'lucide-react';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import CollectionCard from '../components/CollectionCard';

/* ============================================================================
 * HUSHAE HOME — Calvin Klein (CK) Global Flagship Register
 *
 * LUXURY ARCHITECTURE:
 *   1. Full-Bleed CK Editorial Campaign Hero with Dual "GOL" Action Pills
 *   2. The 4-Panel Category Campaign Showcase (CK Tile Standard)
 *   3. CK "New In" Studio Showcase with Dynamic Department Switcher (Women / Men / All)
 *   4. Calvin Klein Dual Campaign Split Spotlight (The Second-Skin Series × The Core Foundation)
 *   5. Curated Women's Atelier Collection (4-Column 3:4 Studio Cards)
 *   6. Curated Men's Essentials Collection (4-Column 3:4 Studio Cards)
 *   7. House Provenance & Discreet Packaging Bar
 *   8. "The Inner Circle" Minimalist VIP Newsletter Block
 * ========================================================================== */

/* ── 1. CALVIN KLEIN STYLE EDITORIAL HERO BANNER ─────────────────────────── */
function CkHeroBanner() {
  return (
    <section
      className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] min-h-[520px] sm:min-h-[560px] md:min-h-[620px] w-full overflow-hidden bg-black text-white font-sans"
      aria-label="Campaign Hero"
    >
      {/* Dual Responsive Campaign Photography */}
      <picture className="block h-full w-full">
        <source media="(max-width: 767px)" srcSet="/images/campaign/qa/hero-m-1.jpg" />
        <img
          src="/images/campaign/qa/hero-new-1.jpg"
          alt="HUSHAE Season 2026 Collection"
          fetchpriority="high"
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </picture>

      {/* Multi-Stop CK Luxury Gradient Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 md:bg-gradient-to-r md:from-black/80 md:via-black/30 md:to-transparent"
      />

      {/* Typography & "GOL" Action Pills */}
      <div className="absolute inset-0 flex items-end md:items-center px-6 sm:px-12 md:px-16 lg:px-24 pb-14 sm:pb-16 md:pb-0">
        <div className="max-w-md sm:max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 border border-white/15">
            <Sparkles size={13} className="text-white" />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white">
              SEASON 2026 · ATELIER DROP
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase tracking-tight text-white leading-[1.08]">
            Second-Skin Essentials
          </h1>

          <p className="max-w-xs sm:max-w-md text-xs sm:text-sm font-normal text-white/90 leading-relaxed">
            Engineered in pure Lenzing micro-modal and fluid silk-touch fabrics for weightless everyday ease.
          </p>

          {/* Dual "GOL" Smooth Action Pills */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/women"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#FFFFFF] px-7 text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:bg-neutral-200 transition-colors shadow-md"
            >
              <span>Shop Women &rarr;</span>
            </Link>

            <Link
              to="/men"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-white/40 bg-black/20 backdrop-blur-md px-7 text-xs font-medium uppercase tracking-[0.18em] text-[#FFFFFF] hover:bg-white hover:text-black transition-all"
            >
              <span>Shop Men</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 2. CALVIN KLEIN 4-PANEL CATEGORY CAMPAIGN STRIP ─────────────────────── */
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

function CkCategorySection() {
  return (
    <section className="w-full bg-black font-sans" aria-label="Featured Categories">
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
  );
}

/* ── 3. CALVIN KLEIN STYLE "NEW IN" STUDIO SHOWCASE ──────────────────────── */
function CkNewInShowcase({ products }) {
  const [filter, setFilter] = useState('all');

  const items = useMemo(() => {
    if (!products || !products.length) return [];
    if (filter === 'women') return products.filter((p) => p.gender === 'women').slice(0, 8);
    if (filter === 'men') return products.filter((p) => p.gender === 'men').slice(0, 8);
    return products.slice(0, 8);
  }, [products, filter]);

  return (
    <section className="w-full bg-[#FFFFFF] py-16 sm:py-20 md:py-24 font-sans">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
        {/* CK Style Centered Editorial Header */}
        <div className="text-center space-y-2">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            SEASON 2026 ATELIER
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.14em] text-[#000000]">
            New Arrivals
          </h2>
        </div>

        {/* Minimalist Department Filter Pills */}
        <div className="mt-7 flex items-center justify-center gap-3 border-b border-neutral-100 pb-5">
          {[
            { id: 'all', label: 'All Pieces' },
            { id: 'women', label: "Women's Drop" },
            { id: 'men', label: "Men's Drop" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.18em] transition-all ${
                filter === tab.id
                  ? 'bg-[#000000] text-[#FFFFFF] font-medium shadow-xs'
                  : 'border border-neutral-300 bg-white text-neutral-600 hover:border-black hover:text-black font-normal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Full-Bleed 4-Column 3:4 Studio Cards Grid */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {items.map((product) => (
            <CollectionCard key={product._id || product.slug} product={product} />
          ))}
        </div>

        {/* Explore All CTA Pill */}
        <div className="mt-12 text-center">
          <Link
            to="/new"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-neutral-300 bg-white px-9 text-xs font-medium uppercase tracking-[0.2em] text-black hover:border-black hover:bg-black hover:text-white transition-all shadow-xs"
          >
            <span>Explore All New Arrivals &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── 4. CALVIN KLEIN CAMPAIGN SPLIT SPOTLIGHT ─────────────────────────────── */
function CkSplitCampaignSection() {
  return (
    <section className="w-full bg-black font-sans" aria-label="Campaign Spotlight">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 w-full">
        {/* Left: The Second-Skin Series (Women) */}
        <div className="group relative aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/5] lg:aspect-[1/1] w-full overflow-hidden bg-black text-white flex flex-col justify-end p-8 sm:p-12 lg:p-16">
          <img
            src="/images/campaign/ck-feature-indigo.jpg"
            alt="The Second-Skin Series"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="relative z-10 space-y-3 max-w-md">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">
              WOMEN’S ATELIER
            </p>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-tight text-white leading-tight">
              The Second-Skin Series
            </h3>
            <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed">
              Weightless micro-modal wireless bras, seamless contour wear, and second-skin underwear.
            </p>
            <div className="pt-2">
              <Link
                to="/women"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#FFFFFF] px-7 text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:bg-neutral-200 transition-colors shadow-md"
              >
                <span>Shop Women &rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: The Core Foundation (Men) */}
        <div className="group relative aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/5] lg:aspect-[1/1] w-full overflow-hidden bg-black text-white flex flex-col justify-end p-8 sm:p-12 lg:p-16">
          <img
            src="/images/campaign/ck-feature-campus.jpg"
            alt="The Core Foundation"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="relative z-10 space-y-3 max-w-md">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">
              MEN’S ESSENTIALS
            </p>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-tight text-white leading-tight">
              The Core Foundation
            </h3>
            <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed">
              Precision-cut combed cotton briefs, no-roll trunks, and ribbed undershirts tailored to stay in place.
            </p>
            <div className="pt-2">
              <Link
                to="/men"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#FFFFFF] px-7 text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:bg-neutral-200 transition-colors shadow-md"
              >
                <span>Shop Men &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 5. CURATED EDITORIAL COLLECTION ROW ─────────────────────────────────── */
function CkCuratedRow({ eyebrow, title, products, viewAllHref, viewAllText = 'View All' }) {
  const items = (products || []).slice(0, 4);
  if (!items.length) return null;

  return (
    <section className="w-full bg-[#FFFFFF] py-16 sm:py-20 font-sans border-b border-neutral-100 last:border-b-0">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
        <div className="flex flex-col justify-between sm:flex-row sm:items-end gap-3 pb-6 border-b border-neutral-100 mb-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-light uppercase tracking-[0.14em] text-[#111111]">
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

        {/* 4-Column Studio Product Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {items.map((product) => (
            <CollectionCard key={product._id || product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 6. CALVIN KLEIN TRUST & PROVENANCE STRIP ─────────────────────────────── */
function CkProvenanceStrip() {
  return (
    <section className="border-y border-neutral-200/80 bg-[#FAF8F5] py-8 px-6 font-sans">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-600 md:justify-between">
        <span className="flex items-center gap-2">
          <Package size={14} className="text-black" /> Discreet Luxury Packaging Always
        </span>
        <span className="hidden md:inline text-neutral-300">·</span>
        <span>Lenzing Micro-Modal Innovation</span>
        <span className="hidden md:inline text-neutral-300">·</span>
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-black" /> Complimentary Nationwide COD
        </span>
        <span className="hidden md:inline text-neutral-300">·</span>
        <span>Handcrafted in Pakistan</span>
      </div>
    </section>
  );
}

/* ── 7. VIP INNER CIRCLE NEWSLETTER ───────────────────────────────────────── */
function CkNewsletter() {
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
    <section className="bg-white px-6 py-20 md:py-28 text-center font-sans">
      <div className="mx-auto max-w-md space-y-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
          PRIVATE ACCESS
        </p>
        <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-[0.14em] text-[#000000]">
          The Inner Circle
        </h2>
        <p className="text-xs sm:text-[13px] text-neutral-500 font-light leading-relaxed">
          First access to atelier drops, private sales, and seasonal previews.
        </p>

        {done ? (
          <p className="pt-4 text-xs font-medium uppercase tracking-[0.2em] text-[#000000]">
            You&apos;re on the list.
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto flex max-w-sm items-end justify-center gap-3 pt-4" noValidate>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
              placeholder="Enter your email"
              className="w-full border-0 border-b border-black/30 bg-transparent px-0 py-2 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
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

  useEffect(() => {
    api('/products?newArrival=true&sort=newest&limit=8')
      .then((d) => setNewArrivals(d.products || []))
      .catch(() => {});

    api('/products?gender=women&limit=4')
      .then((d) => setWomenProducts(d.products || []))
      .catch(() => {});

    api('/products?gender=men&limit=4')
      .then((d) => setMenProducts(d.products || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen w-full bg-white font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo
        title="Premium Innerwear & Apparel — HUSHAE"
        description="Calvin Klein aesthetic luxury innerwear and apparel crafted in Pakistan, finished to an international standard. COD nationwide, discreet packaging."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />

      <h1 className="sr-only">
        HUSHAE — Premium innerwear and apparel for men and women
      </h1>

      {/* 01 — FULL-BLEED CK EDITORIAL CAMPAIGN HERO */}
      <CkHeroBanner />

      {/* 02 — CALVIN KLEIN 4-PANEL CATEGORY CAMPAIGN STRIP */}
      <CkCategorySection />

      {/* 03 — CALVIN KLEIN STYLE "NEW IN" STUDIO SHOWCASE */}
      <CkNewInShowcase products={newArrivals} />

      {/* 04 — CALVIN KLEIN DUAL CAMPAIGN SPLIT SPOTLIGHT */}
      <CkSplitCampaignSection />

      {/* 05 — WOMEN'S STUDIO EDIT */}
      <CkCuratedRow
        eyebrow="SECOND-SKIN SILHOUETTES"
        title="Women's Collection"
        products={womenProducts}
        viewAllHref="/women"
      />

      {/* 06 — MEN'S ESSENTIALS EDIT */}
      <CkCuratedRow
        eyebrow="ENGINEERED PRECISION"
        title="Men's Essentials"
        products={menProducts}
        viewAllHref="/men"
      />

      {/* 07 — PROVENANCE & DISCREET PACKAGING STRIP */}
      <CkProvenanceStrip />

      {/* 08 — VIP NEWSLETTER */}
      <CkNewsletter />
    </div>
  );
}
