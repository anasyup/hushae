import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import LuxuryCategoryShowcase from '../components/LuxuryCategoryShowcase';
import CollectionCard from '../components/CollectionCard';
import BrandManifesto from '../components/home/BrandManifesto';
import CraftPillars from '../components/home/CraftPillars';
import WorldStrip from '../components/home/WorldStrip';
import SignaturePiece from '../components/home/SignaturePiece';
import LookbookGallery from '../components/home/LookbookGallery';
import LuxuryEffects from '../components/home/LuxuryEffects';
import Seam from '../components/home/Seam';

/* ============================================================================
 * HUSHAE HOME — the house's own ultra-luxury register.
 *   HERO            full-bleed campaign (untouched)
 *   THE HOUSE       split editorial — photography + brand statement
 *   THE COLLECTIONS "Curated for Skin" — 4 named edits
 *   THE NEW COLLECTION — product chapter (fine seam header)
 *   THE SIGNATURE   the best-selling piece, given the campaign plate
 *   THE EDIT        campaign split with parallax photography
 *   THE LOOKBOOK    horizontal editorial gallery with measuring seam
 *   THE CRAFT       "Why Hushae" — three quiet pillars
 *   OBJECTS OF DESIRE — product chapter
 *   WORLD OF HUSHAE — international strip (counters)
 *   NEWSLETTER
 *   Motion: GSAP reveals / parallax / counters / pinned lookbook (subtle,
 *   once, respects prefers-reduced-motion). Restraint is the luxury.
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
        {/* Cover line — LOUIS VUITTON register: one geometric sans (Jost, the
            free twin of LV Web), light weight, UPPERCASE with open tracking.
            LV never uses a serif — the air between the caps is the luxury. */}
        <h1 className="font-display text-[42px] font-light uppercase leading-[1.1] tracking-[0.1em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.2)] md:text-[64px] md:tracking-[0.12em]">
          Second
          <br />
          Skin
          <br />
          Edit
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
    <section className="mx-auto max-w-[1600px] border-t border-neutral-200/60 px-4 py-24 md:px-8">
      <div data-reveal className="mb-14 flex flex-col items-center gap-5 text-center">
        {/* Seam — the house mark, drawn on scroll */}
        <Seam className="w-12 text-[#111111]/60" />
        <h2 className="font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">
          {title}
        </h2>
        <Link
          to={href || '/shop'}
          className="group inline-flex items-center gap-2 border-b border-black/30 pb-1 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-black"
        >
          {subtitle}
          <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div data-reveal-group className="grid grid-cols-2 gap-x-1 gap-y-12 md:grid-cols-4">
        {(products || []).slice(0, 4).map((item) => (
          <div key={item._id} data-reveal-item>
            <CollectionCard product={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── SECTION 6: Editorial split banner — parallax photography ───────────── */
function EditorialSplitSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8">
      <div data-reveal-group className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Link
          to="/new"
          data-reveal-item
          className="group relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#f2f0ec] md:aspect-[3/4]"
        >
          {/* Parallax wrapper — the drift never reveals an edge (scale 1.12) */}
          <div className="absolute inset-0" data-parallax="0.1" aria-hidden="true">
            <img
              src={`${IMG}/editorial-modern.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/20" aria-hidden="true" />
          <div className="absolute bottom-8 left-8 right-8 space-y-3 text-white" data-reveal data-delay="0.1">
            <h3 className="font-display text-xl font-light uppercase leading-[1.2] tracking-[0.1em] md:text-2xl">Spring / Summer Silhouette</h3>
            <span className="inline-flex items-center gap-2 border-b border-white pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition hover:text-neutral-200">
              Explore Collection <ArrowRight size={14} aria-hidden="true" />
            </span>
          </div>
        </Link>

        <Link
          to="/about"
          data-reveal-item
          className="group relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#f2f0ec] md:aspect-[3/4]"
        >
          <div className="absolute inset-0" data-parallax="0.1" aria-hidden="true">
            <img
              src={`${IMG}/hero-fabric.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/20" aria-hidden="true" />
          <div className="absolute bottom-8 left-8 right-8 space-y-3 text-white" data-reveal data-delay="0.15">
            <h3 className="font-display text-xl font-light uppercase leading-[1.2] tracking-[0.1em] md:text-2xl">Uncompromising Craftsmanship</h3>
            <span className="inline-flex items-center gap-2 border-b border-white pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition hover:text-neutral-200">
              Read The Story <ArrowRight size={14} aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ── NEWSLETTER — the house's private line ─────────────────────────────── */
function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section className="border-t border-neutral-200/80 bg-[#f7f6f2] px-4 py-24 text-center md:py-32">
      <div className="mx-auto max-w-xl space-y-6">
        <p data-reveal className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
          The Private Line
        </p>
        <h3 data-reveal data-delay="0.06" className="font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">
          Join the House
        </h3>
        <p data-reveal data-delay="0.12" className="mx-auto max-w-sm text-[12px] font-light leading-[2] tracking-wide text-neutral-500">
          Receive private previews of new collections, seasonal edits and members-only offers.
        </p>
        {done ? (
          <p className="pt-2 text-[12px] font-medium uppercase tracking-[0.2em] text-[#111111]">You&apos;re on the list.</p>
        ) : (
          <form
            className="mx-auto mt-2 flex max-w-md items-end justify-center gap-3"
            onSubmit={(e) => { e.preventDefault(); if (email.trim()) { api('/subscribers', { method: 'POST', body: { email: email.trim() } }).catch(() => {}); setDone(true); } }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              className="h-12 w-full border-b border-neutral-400 bg-transparent px-1 pb-2 text-[12px] tracking-[0.05em] text-black transition focus:border-black focus:outline-none placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="whitespace-nowrap border border-black bg-transparent px-8 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-black hover:text-white"
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

      <LuxuryEffects>
        {/* 01 — HERO (untouched) */}
        <HeroSlides />

        {/* 02 — THE HOUSE — split editorial: photography + statement */}
        <BrandManifesto />

        {/* 03 — THE COLLECTIONS — named edits */}
        <LuxuryCategoryShowcase />

        {/* 04 — THE NEW COLLECTION — product chapter */}
        <ProductCarouselSection title="The New Collection" subtitle="EXPLORE NOW" products={fresh} href="/new" />

        {/* 05 — THE SIGNATURE — the best-selling piece on the campaign plate */}
        <SignaturePiece product={best[0]} />

        {/* 06 — THE EDIT — campaign split (parallax photography) */}
        <EditorialSplitSection />

        {/* 07 — THE LOOKBOOK — horizontal editorial gallery with measuring seam */}
        <LookbookGallery />

        {/* 08 — THE CRAFT — three quiet pillars */}
        <CraftPillars />

        {/* 09 — OBJECTS OF DESIRE — product chapter */}
        <ProductCarouselSection title="Objects of Desire" subtitle="CURATED SELECTION" products={best} href="/best" />

        {/* 10 — WORLD OF HUSHAE — international strip */}
        <WorldStrip />

        {/* 11 — NEWSLETTER */}
        <NewsletterSection />
      </LuxuryEffects>
    </div>
  );
}
