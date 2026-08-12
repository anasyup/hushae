import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import LuxuryCategoryShowcase from '../components/LuxuryCategoryShowcase';
import CollectionCard from '../components/CollectionCard';

/* ============================================================================
 * HUSHAE HOME — luxury homepage, exact client reference.
 *   1  HERO            full-bleed "Second Skin Edit" (CK, approved)
 *   2  CATEGORY GRID   Tom Ford style — 2/4 cols, 4/5 images, tracking 0.2em
 *   3  PRODUCT CAROUSEL "The New Collection" — serif title + EXPLORE NOW
 *   4  EDITORIAL SPLIT Loro Piana — 2 cards, serif headings + ArrowRight
 *   5  PRODUCT CAROUSEL "Objects of Desire" — curated selection
 *   6  NEWSLETTER      Subscribe to the Newsletter
 * ========================================================================== */

const IMG = '/images/campaign/qa';

/* ── Category tiles (real HUSHAE category images) ──────────────────────── */
const CATEGORIES = [
  { title: "Women's Bras", image: '/images/categories/bras.jpg', href: '/category/bras' },
  { title: "Women's Panties", image: '/images/categories/panties.jpg', href: '/category/panties' },
  { title: "Men's Briefs", image: '/images/categories/briefs.jpg', href: '/category/briefs' },
  { title: "Men's Boxers", image: '/images/categories/boxers.jpg', href: '/category/boxers' },
];

/* ── Hero — full-bleed image + left content (CK reference) ───────────────── */
function HeroSlides() {
  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-white">
      <img src={`${IMG}/hero-women.jpg`} alt="New Edit" fetchpriority="high"
        className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
      <div className="absolute bottom-[12%] left-[32px] z-10 max-w-[480px] text-white md:left-[60px]">
        {/* Cover line in the house register: CK/LV geometric sans (Jost) for
            the opening lines, open tracking — caps need air — and the final
            word set in the editorial serif italic (Bodoni Moda, the free twin
            of BurberrySerif), the Burberry / Gucci campaign accent. */}
        <h1 className="font-display text-[42px] font-normal uppercase leading-[1.05] tracking-[0.02em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.2)] md:text-[58px]">
          Second
          <br />
          Skin
          <br />
          <em className="font-editorial font-normal italic tracking-normal">Edit</em>
        </h1>
        <p className="mt-5 max-w-[380px] text-[13px] font-normal leading-[1.6] text-[#f0f0f0]">
          New season essentials, engineered in Pakistan. Featherweight layers with a barely-there finish.
        </p>
        <div className="mt-7 flex gap-3">
          <Link to="/women"
            className="inline-block rounded-[25px] bg-white px-6 py-[10px] text-[13px] font-medium tracking-[0.02em] text-black transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0]">
            Shop Women
          </Link>
          <Link to="/men"
            className="inline-block rounded-[25px] bg-white px-6 py-[10px] text-[13px] font-medium tracking-[0.02em] text-black transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0]">
            Shop Men
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── SECTION 1: Minimalist category grid (Tom Ford style) ───────────────── */
function CategoryGridSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {CATEGORIES.map((cat) => (
          <Link key={cat.title} to={cat.href} className="group flex cursor-pointer flex-col">
            <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f0ec]">
              <img
                src={cat.image}
                alt={cat.title}
                loading="lazy"
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div className="bg-transparent pb-2 pt-4">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111] md:text-[12px]">
                {cat.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── SECTION 2 & 4: Product carousel (Givenchy style) ───────────────────── */
function ProductCarouselSection({ title, subtitle, products, href }) {
  return (
    <section className="mx-auto max-w-[1600px] border-t border-neutral-200/60 px-4 py-16 md:px-8">
      <div className="mb-10 space-y-1 text-center">
        <h2 className="font-display text-2xl font-normal tracking-wide text-[#111111] md:text-3xl">
          {title}
        </h2>
        <Link
          to={href || '/shop'}
          className="inline-block border-b border-black/30 pb-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-black"
        >
          {subtitle}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-1 gap-y-10 md:grid-cols-4">
        {(products || []).slice(0, 4).map((item) => (
          <CollectionCard key={item._id} product={item} />
        ))}
      </div>
    </section>
  );
}

/* ── SECTION 3: Editorial split banner (Loro Piana style) ───────────────── */
function EditorialSplitSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-12 md:px-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to="/new" className="group relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#f2f0ec] md:aspect-[3/4]">
          <img
            src={`${IMG}/editorial-modern.jpg`}
            alt="Spring Summer Collection"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" aria-hidden="true" />
          <div className="absolute bottom-8 left-8 right-8 space-y-2 text-white">
            <h3 className="font-display text-xl tracking-wide md:text-2xl">Spring / Summer Silhouette</h3>
            <span className="inline-flex items-center gap-2 border-b border-white pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition hover:text-neutral-200">
              Explore Collection <ArrowRight size={14} aria-hidden="true" />
            </span>
          </div>
        </Link>

        <Link to="/about" className="group relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#f2f0ec] md:aspect-[3/4]">
          <img
            src={`${IMG}/hero-fabric.jpg`}
            alt="Craftsmanship"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" aria-hidden="true" />
          <div className="absolute bottom-8 left-8 right-8 space-y-2 text-white">
            <h3 className="font-display text-xl tracking-wide md:text-2xl">Uncompromising Craftsmanship</h3>
            <span className="inline-flex items-center gap-2 border-b border-white pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition hover:text-neutral-200">
              Read The Story <ArrowRight size={14} aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ── SECTION 5: Luxury newsletter sign-up ───────────────────────────────── */
function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section className="border-t border-neutral-200/80 bg-[#f7f6f2] px-4 py-20 text-center">
      <div className="mx-auto max-w-xl space-y-4">
        <h3 className="font-display text-2xl font-normal tracking-wide text-[#111111] md:text-3xl">
          Subscribe to the Newsletter
        </h3>
        <p className="text-[12px] font-normal leading-relaxed tracking-wide text-neutral-500">
          Be the first to receive updates on new arrivals, private sales, and seasonal collection previews.
        </p>
        {done ? (
          <p className="pt-4 text-[12px] font-medium uppercase tracking-[0.2em] text-[#111111]">You&apos;re on the list.</p>
        ) : (
          <form
            className="mx-auto flex max-w-md items-center justify-center gap-2 pt-4"
            onSubmit={(e) => { e.preventDefault(); if (email.trim()) { api('/subscribers', { method: 'POST', body: { email: email.trim() } }).catch(() => {}); setDone(true); } }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-[12px] text-black transition focus:border-black focus:outline-none placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="whitespace-nowrap bg-black px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800"
            >
              Sign Up
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/* ═══ PAGE ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [fresh, setFresh] = useState([]);
  const [best, setBest] = useState([]);

  useEffect(() => {
    api('/products?newArrival=true&limit=8').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
  }, []);

  return (
    <div className="w-full bg-[#fcfbf9] font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* 01 — HERO (CK) */}
      <HeroSlides />

      {/* 02 — STUDIO CATEGORY SHOWCASE (Givenchy canvas) */}
      <LuxuryCategoryShowcase />

      {/* 03 — THE NEW COLLECTION (Givenchy) */}
      <ProductCarouselSection title="The New Collection" subtitle="EXPLORE NOW" products={fresh} href="/new" />

      {/* 04 — VIEW MORE (reference button) */}
      <div className="flex w-full justify-center">
        <Link to="/shop" className="my-8 cursor-pointer border border-black bg-transparent px-10 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 ease-in-out hover:bg-black hover:text-white">
          View More
        </Link>
      </div>

      {/* 05 — EDITORIAL SPLIT (Loro Piana) */}
      <EditorialSplitSection />

      {/* 05 — OBJECTS OF DESIRE */}
      <ProductCarouselSection title="Objects of Desire" subtitle="CURATED SELECTION" products={best} href="/best" />

      {/* 06 — NEWSLETTER */}
      <NewsletterSection />
    </div>
  );
}
