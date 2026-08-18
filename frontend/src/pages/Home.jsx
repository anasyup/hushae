import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import LuxuryCategoryShowcase from '../components/LuxuryCategoryShowcase';
import CollectionCard from '../components/CollectionCard';
import NewArrivalsSection from '../components/home/NewArrivalsSection';
import DiscoverTiles from '../components/home/DiscoverTiles';
import HeroWithOverlay from '../components/home/HeroWithOverlay';
import BrandStory from '../components/home/BrandStory';
import CustomerTestimonial from '../components/home/CustomerTestimonial';
import TrustStrip from '../components/home/TrustStrip';
import FitFinderBanner from '../components/home/FitFinderBanner';
import JournalTeaser from '../components/home/JournalTeaser';
import FeaturedStory from '../components/home/FeaturedStory';
import ScrollReveal from '../components/ScrollReveal';
import SectionHeader from '../components/SectionHeader';
import { ProductRowSkeleton } from '../components/ProductSkeleton';
import { PRODUCT_GRID } from '../lib/productGrid';

/* ============================================================================
 * HUSHAE HOME — luxury homepage composition.
 *
 * Section rhythm (13 sections, 5 archetypes):
 *   Full-bleed:     Hero · Editorial Split · Fit Finder (black)
 *   Photo + Copy:   Brand Story · Featured Story
 *   Grid:           Discover · Categories · New Arrivals · Objects Desire · Journal
 *   Editorial:      Testimonial · Newsletter
 *   Utility:        Trust Strip
 *
 * Composition rules:
 *   - No two grids back to back
 *   - No two photo+copy back to back
 *   - Full-bleed black (Fit Finder) never twice in a row
 *   - Each section wrapped in ScrollReveal with cascading delay so the
 *     page reads as a composed cadence, not a list dump
 * ========================================================================== */

const IMG = '/images/campaign/qa';

/* ── SECTION: Editorial split banner (Loro Piana style) ─────────────────── */
function EditorialSplitSection() {
  const panels = [
    {
      to: '/new',
      img: `${IMG}/cat-women.jpg`,
      alt: 'Spring Summer collection',
      title: 'Spring / Summer Silhouette',
      cta: 'Explore Collection',
      pos: 'object-[50%_22%] md:object-center',
    },
    {
      to: '/about',
      img: `${IMG}/hero-fabric.jpg`,
      alt: 'Craftsmanship',
      title: 'Uncompromising Craftsmanship',
      cta: 'Read The Story',
      pos: 'object-center',
    },
  ];

  return (
    <section className="w-full">
      <div className="grid h-[100svh] grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
        {panels.map((p, i) => (
          <Link
            key={p.to}
            to={p.to}
            className="group relative block h-full w-full cursor-pointer overflow-hidden bg-[#f2f0ec]"
          >
            <img
              src={p.img}
              alt={p.alt}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`absolute inset-0 h-full w-full object-cover ${p.pos} transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
            />
            {/* Bottom-weighted scrim — type sits in the lower third */}
            <div
              aria-hidden="true"
              className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.45) 22%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0) 72%)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 p-8 text-white md:p-12 lg:p-16"
              style={i === panels.length - 1 ? { paddingBottom: 'calc(var(--nav-h, 0px) + 2rem)' } : undefined}
            >
              <h3 className="max-w-[22ch] font-display text-2xl font-light uppercase leading-[1.15] tracking-heading md:text-3xl lg:text-3xl">
                {p.title}
              </h3>
              <span className="mt-5 inline-flex items-center gap-2 border-b border-white pb-1 text-xs font-medium uppercase tracking-label transition-colors group-hover:border-white/60">
                {p.cta} <ArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── SECTION: Objects of Desire (centred header pattern) ───────────────── */
function ProductCarouselSection({ title, subtitle, products, href }) {
  return (
    <section className="px-4 pt-20 pb-10 md:px-8 md:pt-28 md:pb-14">
      <SectionHeader
        eyebrow={subtitle}
        title={title}
        href={href || '/shop'}
        cta="View All"
        variant="centered"
      />

      <div className={PRODUCT_GRID}>
        {(products || []).slice(0, 4).map((item) => (
          <CollectionCard key={item._id} product={item} />
        ))}
      </div>
    </section>
  );
}

/* ── SECTION: Newsletter sign-up ────────────────────────────────────────── */
function NewsletterSection() {
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
    <section className="bg-white px-4 pt-20 pb-16 text-center md:pt-28 md:pb-20">
      <div className="mx-auto max-w-md space-y-5">
        <p className="text-xs font-medium uppercase tracking-eyebrow text-neutral-500">
          Stay in touch
        </p>
        <h2 className="text-2xl font-light uppercase tracking-heading text-black">
          The Newsletter
        </h2>
        <p className="text-sm font-normal leading-relaxed tracking-body text-neutral-500">
          New arrivals, private sales and seasonal previews — first.
        </p>
        {done ? (
          <p className="pt-4 text-xs font-medium uppercase tracking-label text-black">
            You&apos;re on the list.
          </p>
        ) : (
          <form
            className="mx-auto flex max-w-sm items-end justify-center gap-3 pt-4"
            onSubmit={submit}
            noValidate
          >
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
              required
              aria-invalid={err ? 'true' : undefined}
              aria-describedby={err ? 'home-nl-err' : undefined}
              placeholder="Email address"
              className="w-full border-0 border-b border-black/30 bg-transparent px-0 py-2.5 text-sm text-black transition focus:border-black focus:outline-none placeholder:text-xs placeholder:tracking-label placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="min-h-[44px] shrink-0 border-b border-black/30 pb-1 text-xs font-medium uppercase tracking-label text-black transition-colors hover:border-black"
            >
              Sign Up
            </button>
          </form>
        )}
        {err && <p id="home-nl-err" role="alert" className="pt-2 text-xs text-red-700">{err}</p>}
      </div>
    </section>
  );
}

/* ═══ PAGE ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [fresh, setFresh] = useState(null); // null = loading
  const [best, setBest] = useState(null);

  useEffect(() => {
    api('/products?newArrival=true&sort=newest&limit=12').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
  }, []);

  return (
    <div className="min-h-screen w-full bg-white font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo
        title="Premium Innerwear for Men & Women — HUSHAE"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />

      {/* Single H1 lives inside HeroWithOverlay (the visual H1). No
          duplicate sr-only fallback — search engines and screen readers
          see exactly one H1 per page. */}

      {/* 01 — HERO with cinematic overlay + serif H1 moment */}
      <HeroWithOverlay />

      {/* 02 — TRUST STRIP — permanent brand promises */}
      <TrustStrip />

      {/* 03 — DISCOVER — editorial gateway */}
      <ScrollReveal delay={100}>
        <DiscoverTiles />
      </ScrollReveal>

      {/* 04 — STUDIO CATEGORY SHOWCASE */}
      <ScrollReveal delay={150}>
        <LuxuryCategoryShowcase />
      </ScrollReveal>

      {/* 05 — FIT FINDER BANNER — full-bleed black band */}
      <ScrollReveal delay={170}>
        <FitFinderBanner />
      </ScrollReveal>

      {/* 06 — NEW ARRIVALS — luxury grid (SectionHeader already inside) */}
      <ScrollReveal delay={200}>
        <NewArrivalsSection products={fresh} />
        {fresh === null && <ProductRowSkeleton count={8} />}
      </ScrollReveal>

      {/* 07 — EDITORIAL SPLIT (Loro Piana) */}
      <ScrollReveal delay={300}>
        <EditorialSplitSection />
      </ScrollReveal>

      {/* 08 — BRAND STORY — HUSHAE's origin editorial moment */}
      <ScrollReveal delay={350}>
        <BrandStory />
      </ScrollReveal>

      {/* 09 — FEATURED STORY — Modal Series signature campaign */}
      <ScrollReveal delay={360}>
        <FeaturedStory />
      </ScrollReveal>

      {/* 10 — OBJECTS OF DESIRE (centred header pattern) */}
      <ScrollReveal delay={380}>
        <ProductCarouselSection
          title="Objects of Desire"
          subtitle="CURATED SELECTION"
          products={best || []}
          href="/best"
        />
        {best === null && <ProductRowSkeleton count={4} />}
      </ScrollReveal>

      {/* 11 — CUSTOMER TESTIMONIAL */}
      <ScrollReveal delay={420}>
        <CustomerTestimonial />
      </ScrollReveal>

      {/* 12 — JOURNAL TEASER (SectionHeader already inside) */}
      <JournalTeaser limit={3} />

      {/* 13 — NEWSLETTER */}
      <ScrollReveal delay={460}>
        <NewsletterSection />
      </ScrollReveal>
    </div>
  );
}