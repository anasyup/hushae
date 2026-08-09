import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — "REDEFINE MODERN" (Calvin Klein–style luxury edit), v3.
 *
 * v3 — warm ivory pass. HERO UNTOUCHED. Every other section was refined:
 * editorial eyebrows + mono indexes, warm gradient overlays (no flat black),
 * alternating stone/sand warm bands, hairline clay dividers, gold-tinted
 * hovers, hairline text-link CTAs. The whole site palette warmed to the
 * Veloura ivory register (stone #F6F2EB / sand #EFE8DC / clay #D8CCB8).
 * ========================================================================== */

/* Hero slides — rotating full-bleed (5s crossfade). Own campaign series. */
const HERO_SLIDES = [
  '/images/campaign/qa/hero-women.jpg',
  '/images/campaign/qa/hero-men.jpg',
  '/images/campaign/qa/hero-fabric.jpg',
];

/* Shop By Category — 4 tiles, HUSHAE routes + own campaign imagery */
const CATS = [
  { label: 'Women', img: '/images/campaign/qa/cat-women.jpg', href: '/women' },
  { label: 'Men', img: '/images/campaign/qa/cat-men.jpg', href: '/men' },
  { label: 'Underwear', img: '/images/campaign/qa/cat-underwear.jpg', href: '/shop' },
  { label: 'New Arrivals', img: '/images/campaign/qa/hero-fabric.jpg', href: '/new' },
];

/* ── Luxury hairline text-link — no box, underline + sliding arrow ────────
   light = for use on imagery (white hairline); dark = on light surfaces. */
function TextLink({ to, light = false, children }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 border-b pb-1 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
        light
          ? 'border-white/40 text-white hover:border-white'
          : 'border-charcoal/25 text-charcoal hover:border-charcoal'
      }`}
    >
      {children}
      <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}

/* ── Hero slideshow — crossfade + dots (UNTOUCHED) ──────────────────────── */
function HeroSlides({ slides }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  return (
    <div className="absolute inset-0">
      {slides.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={idx === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out ${
            idx === i ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-[#1F1A12]/35" />
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1 rounded-full transition-all duration-300 ${idx === i ? 'w-7 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Editorial banner — warm gradient, centered or left editorial spread ── */
function EditorialBanner({ img, eyebrow, title, body, cta, href, align = 'center', index }) {
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  return (
    <section className="w-full overflow-hidden bg-stone">
      <div className="relative aspect-[16/10] overflow-hidden md:aspect-[21/9]">
        {/* slow Ken Burns — the one motion luxury houses allow on imagery */}
        <img
          src={img}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover animate-[kenburns_24s_ease-in-out_infinite_alternate]"
        />
        {/* warm gradient — never flat black */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1F1A12]/60 via-[#1F1A12]/10 to-transparent" />
        <div className={`absolute inset-0 flex ${alignCls} px-6 text-white md:px-20`}>
          <div className={align === 'left' ? 'max-w-lg' : ''}>
            {index && (
              <span className="font-mono text-[10px] tracking-[0.24em] text-white/60">{index}</span>
            )}
            <p className={`text-[10px] font-medium uppercase tracking-[0.32em] text-white/70 ${index ? 'mt-4' : ''}`}>
              {eyebrow}
            </p>
            <h3 className="mt-5 text-[clamp(28px,4vw,46px)] font-light uppercase leading-[1.08] tracking-[0.14em] [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
              {title}
            </h3>
            {body && (
              <p className="mx-auto mt-5 max-w-md text-[13px] font-light leading-[1.8] tracking-[0.04em] text-white/85">
                {body}
              </p>
            )}
            <div className="mt-9">
              <TextLink to={href} light>{cta}</TextLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Section heading — light, tracked caps, charcoal ────────────────────── */
const SecTitle = ({ eyebrow, children, right }) => (
  <div className="flex items-end justify-between gap-6">
    <div>
      {eyebrow && <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-smoke">{eyebrow}</p>}
      <h2 className="mt-3 text-[24px] font-light uppercase tracking-[0.14em] text-charcoal md:text-[32px]">{children}</h2>
    </div>
    {right}
  </div>
);

export default function Home() {
  const [fresh, setFresh] = useState(null);

  /* Best Sellers — bestsellers first, new arrivals as fallback. */
  useEffect(() => {
    api('/products?bestSeller=true&limit=8')
      .then((d) => {
        const list = d.products || [];
        if (list.length) { setFresh(list); return; }
        api('/products?newArrival=true&limit=8').then((d2) => setFresh(d2.products || [])).catch(() => setFresh([]));
      })
      .catch(() => api('/products?newArrival=true&limit=8').then((d2) => setFresh(d2.products || [])).catch(() => setFresh([])));
  }, []);

  return (
    <div className="bg-stone font-sans text-charcoal">
      <Seo
        title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />

      {/* ═══ HERO — THE SPRING EDIT / REDEFINE MODERN (UNTOUCHED) ═══════ */}
      <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-stone">
        <HeroSlides slides={HERO_SLIDES} />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/70 [text-shadow:0_1px_16px_rgba(0,0,0,0.4)]">
            The Spring Edit
          </p>
          <h1 className="mt-6 text-[clamp(40px,7vw,84px)] font-light uppercase leading-[1.04] tracking-[0.16em] [text-shadow:0_2px_32px_rgba(0,0,0,0.45)]">
            Redefine
            <br />
            Modern
          </h1>
          <p className="mt-6 text-[13px] font-light tracking-[0.12em] text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
            New Season Essentials
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
            <TextLink to="/women" light>Shop Women</TextLink>
            <TextLink to="/men" light>Shop Men</TextLink>
          </div>
        </div>
      </section>

      {/* ═══ SHOP BY CATEGORY — editorial tiles, warm hover ═══════════ */}
      <section className="bg-stone py-24 md:py-32">
        <div className="container">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-smoke">The Edit</p>
              <h2 className="mt-3 text-[24px] font-light uppercase tracking-[0.14em] text-charcoal md:text-[32px]">
                Shop By Category
              </h2>
            </div>
            <span className="hidden font-mono text-[10px] tracking-[0.2em] text-smoke md:block">01 — 04</span>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
            {CATS.map((c, idx) => (
              <Link key={c.label} to={c.href} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                  <img
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-hover ease-luxury group-hover:scale-[1.03]"
                  />
                  {/* quiet mono index — editorial */}
                  <span className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] tracking-[0.2em] text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {/* warm gold-tinted hover — multiply, never grey */}
                  <div className="pointer-events-none absolute inset-0 bg-gold/0 mix-blend-multiply transition-colors duration-hover group-hover:bg-gold/20" />
                  {/* warm base gradient for legibility */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1F1A12]/25 to-transparent" />
                </div>
                <div className="mt-5 text-center">
                  <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-charcoal">{c.label}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 border-b border-charcoal/20 pb-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-smoke transition-colors duration-300 group-hover:border-gold group-hover:text-gold">
                    Shop Now <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE ICON EDIT — Modern Classics ═════════════════════════ */}
      <EditorialBanner
        img="/images/campaign/qa/editorial-modern.jpg"
        eyebrow="The Icon Edit"
        title="Modern Classics"
        body="The pieces that define the season. Timeless silhouettes, elevated fabrics."
        cta="Discover"
        href="/women"
        index="01"
      />

      {/* ═══ HUSHAE PERFORMANCE — Move With Purpose ═══════════════════ */}
      <EditorialBanner
        img="/images/campaign/qa/editorial-performance.jpg"
        eyebrow="Hushae Performance"
        title="Move With Purpose"
        body="Engineered essentials for every moment."
        cta="Shop Now"
        href="/new"
        index="02"
        align="left"
      />

      {/* ═══ BEST SELLERS — warm band ════════════════════════════════ */}
      {fresh && fresh.length > 0 && (
        <section className="border-y border-clay/40 bg-sand/40 py-24 md:py-32">
          <div className="container">
            <SecTitle
              eyebrow="Trending Now"
              right={
                <Link to="/best" className="group inline-flex items-center gap-1.5 border-b border-charcoal/20 pb-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-smoke transition-colors duration-300 hover:border-gold hover:text-gold">
                  View All <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              }
            >
              Best Sellers
            </SecTitle>
            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
              {fresh.slice(0, 8).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Admin banner slot — only shows if a merchant publishes one */}
      <Banner slot="homepage-below" className="w-full bg-sand" fallback={null} />

      {/* ═══ #HUSHAE — warm gradient ═════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-stone">
        <div className="relative aspect-[16/9] min-h-[440px] overflow-hidden md:aspect-[21/8]">
          <img
            src="/images/campaign/qa/hero-women.jpg"
            alt="Share your look"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover animate-[kenburns_24s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1F1A12]/75 via-[#1F1A12]/25 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <span className="font-mono text-[10px] tracking-[0.24em] text-white/60">03</span>
              <h2 className="mt-4 text-[clamp(28px,5vw,44px)] font-light uppercase tracking-[0.2em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
                #HUSHAE
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[13px] font-light leading-[1.8] tracking-[0.04em] text-white/85">
                Share your look. Tag @hushae and #HUSHAE on Instagram for a chance to be featured.
              </p>
              <div className="mt-9">
                <TextLink to="/new" light>Explore</TextLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
