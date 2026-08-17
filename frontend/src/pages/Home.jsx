import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import LuxuryCategoryShowcase from '../components/LuxuryCategoryShowcase';
import CollectionCard from '../components/CollectionCard';
import NewArrivalsSection from '../components/home/NewArrivalsSection';
import DiscoverTiles from '../components/home/DiscoverTiles';

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

/* ── HERO SLIDER — 4 slides (image + optional video), same size/text/buttons ──
   Each slide: `image` (poster / photo) and optional `video` (mp4/webm path).
   If `video` is set the slide plays it (muted, loop, autoplay) with the
   image as poster; otherwise it shows the photo. To change slides, swap the
   paths below or add a video file under public/images/campaign/qa/.
   Auto-advances every 4s, pauses on hover/focus; thin dots for manual
   selection. No new action buttons, no filters — everything else unchanged. */
const HERO_SLIDES = [
  { image: `${IMG}/hero-women.jpg`, video: '' },
  { image: `${IMG}/hero-men.jpg`, video: '' },
  { image: `${IMG}/editorial-modern.jpg`, video: '' },
  { image: `${IMG}/hero-fabric.jpg`, video: '' },
];

function HeroSlides() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-white">
      {/* Slides — crossfade */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.image}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          {s.video ? (
            <video
              src={s.video}
              poster={s.image}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={s.image}
              alt=""
              fetchpriority={i === 0 ? 'high' : 'auto'}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}

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
          {/* Hero actions use the shared .btn + .hero-cta primitives. They were
              bespoke 25px pills at 40px tall: the pill radius contradicts the
              design tokens (card:0 / control:2px) that the rest of the store
              follows, and 40px sat under the 44px tap-target minimum. */}
          <Link to="/women" className="btn hero-cta bg-white text-black hover:bg-[#f0f0f0]">
            Shop Women
          </Link>
          <Link to="/men" className="btn hero-cta bg-white text-black hover:bg-[#f0f0f0]">
            Shop Men
          </Link>
        </div>
      </div>

      {/* Slide arrows — plain ‹ › chevrons, no circle */}
      <button
        type="button"
        onClick={() => setIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 p-2 text-white/90 transition-all hover:scale-110 hover:text-white md:left-6"
      >
        <ChevronLeft size={34} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => setIdx((i) => (i + 1) % HERO_SLIDES.length)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 p-2 text-white/90 transition-all hover:scale-110 hover:text-white md:right-6"
      >
        <ChevronRight size={34} strokeWidth={1.5} />
      </button>

      {/* Slide dots — thin, bottom centre */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.image}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === idx}
            className={`hit-44 h-1.5 rounded-full transition-all duration-300 ${
              i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
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
        <h2 className="section-title">
          {title}
        </h2>
        {/* 18px tall as a bare link — raised to the 44px minimum via padding.
            Kept as a centred inline-flex so the section header still centres. */}
        <Link
          to={href || '/shop'}
          className="inline-flex min-h-[44px] items-center border-b border-black/30 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-black"
        >
          {subtitle}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-px border-y border-[#e7e5e0] bg-[#e7e5e0] min-[560px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
            <h3 className="font-display text-xl font-light uppercase tracking-[0.1em] md:text-2xl">Spring / Summer Silhouette</h3>
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
            <h3 className="font-display text-xl font-light uppercase tracking-[0.1em] md:text-2xl">Uncompromising Craftsmanship</h3>
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
        <h2 className="section-title">
          Subscribe to the Newsletter
        </h2>
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
            {/* A placeholder is not an accessible name (WCAG 4.1.2): it is dropped
                by most screen readers once the field has a value. Real label,
                visually hidden so the layout is unchanged. */}
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
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
    api('/products?newArrival=true&sort=newest&limit=12').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* 01 — HERO (CK) */}
      <HeroSlides />

      {/* 02 — DISCOVER — editorial gateway (Chanel / Hermès / CK pattern) */}
      <DiscoverTiles />

      {/* 03 — STUDIO CATEGORY SHOWCASE (Givenchy canvas) */}
      <LuxuryCategoryShowcase />

      {/* 04 — NEW ARRIVALS — luxury grid (editorial header + tabs) */}
      <NewArrivalsSection products={fresh} />

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
