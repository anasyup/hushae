import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — "REDEFINE MODERN" (Calvin Klein–style luxury edit), v2.
 *
 * v2 — no box buttons. Every action is a quiet hairline text-link with a
 * sliding arrow (the luxury register). Typography is lighter and more
 * tracked — space is the luxury. Imagery breathes with a slow Ken Burns.
 * ========================================================================== */

/* Hero slides — rotating full-bleed (5s crossfade) */
const HERO_SLIDES = [
  'https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=1920&q=80',
  'https://images.pexels.com/photos/20238948/pexels-photo-20238948.jpeg?w=1920&q=80',
  'https://images.pexels.com/photos/20228980/pexels-photo-20228980.jpeg?w=1920&q=80',
];

/* Shop By Category — 4 tiles, HUSHAE routes */
const CATS = [
  { label: 'Women', img: 'https://images.pexels.com/photos/6487416/pexels-photo-6487416.jpeg?w=800&q=80', href: '/women' },
  { label: 'Men', img: 'https://images.unsplash.com/photo-1552393700-42696fb89bfa?w=800&q=80', href: '/men' },
  { label: 'Underwear', img: 'https://images.pexels.com/photos/25194063/pexels-photo-25194063.jpeg?w=800&q=80', href: '/shop' },
  { label: 'New Arrivals', img: 'https://images.pexels.com/photos/6764706/pexels-photo-6764706.jpeg?w=800&q=80', href: '/new' },
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

/* ── Hero slideshow — crossfade + dots ──────────────────────────────────── */
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
      <div className="absolute inset-0 bg-black/30" />
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

/* ── Editorial banner — full-bleed image, centered quiet type ───────────── */
function EditorialBanner({ img, eyebrow, title, body, cta, href }) {
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
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/70">{eyebrow}</p>
            <h3 className="mt-5 text-[clamp(28px,4vw,48px)] font-light uppercase leading-[1.08] tracking-[0.14em] [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
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

      {/* ═══ HERO — THE SPRING EDIT / REDEFINE MODERN ═══════════════════ */}
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

      {/* ═══ SHOP BY CATEGORY — 4 editorial tiles ═════════════════════ */}
      <section className="bg-stone py-20 md:py-28">
        <div className="container">
          <div className="text-center">
            <h2 className="text-[24px] font-light uppercase tracking-[0.14em] text-charcoal md:text-[32px]">
              Shop By Category
            </h2>
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
                  <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-hover group-hover:bg-charcoal/10" />
                </div>
                <div className="mt-5 text-center">
                  <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-charcoal">{c.label}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 border-b border-charcoal/20 pb-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-smoke transition-colors duration-300 group-hover:border-charcoal group-hover:text-charcoal">
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
        img="https://images.unsplash.com/photo-1698206107850-41f6dd710043?w=1600&q=80"
        eyebrow="The Icon Edit"
        title="Modern Classics"
        body="The pieces that define the season. Timeless silhouettes, elevated fabrics."
        cta="Discover"
        href="/women"
      />

      {/* ═══ HUSHAE PERFORMANCE — Move With Purpose ═══════════════════ */}
      <EditorialBanner
        img="https://images.pexels.com/photos/33549240/pexels-photo-33549240.jpeg?w=1600&q=80"
        eyebrow="Hushae Performance"
        title="Move With Purpose"
        body="Engineered essentials for every moment."
        cta="Shop Now"
        href="/new"
      />

      {/* ═══ BEST SELLERS ════════════════════════════════════════════ */}
      {fresh && fresh.length > 0 && (
        <section className="bg-stone py-20 md:py-28">
          <div className="container">
            <SecTitle
              eyebrow="Trending Now"
              right={
                <Link to="/best" className="group inline-flex items-center gap-1.5 border-b border-charcoal/20 pb-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-smoke transition-colors duration-300 hover:border-charcoal hover:text-charcoal">
                  View All <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              }
            >
              Best Sellers
            </SecTitle>
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
              {fresh.slice(0, 8).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Admin banner slot — only shows if a merchant publishes one */}
      <Banner slot="homepage-below" className="w-full bg-sand" fallback={null} />

      {/* ═══ #HUSHAE ═════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-stone">
        <div className="relative aspect-[16/9] min-h-[440px] overflow-hidden md:aspect-[21/8]">
          <img
            src="https://images.pexels.com/photos/20228980/pexels-photo-20228980.jpeg?w=1920&q=80"
            alt="Share your look"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover animate-[kenburns_24s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-charcoal/50" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <h2 className="text-[clamp(28px,5vw,44px)] font-light uppercase tracking-[0.2em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
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
