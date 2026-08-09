import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — "REDEFINE MODERN" (Calvin Klein–style luxury edit).
 *
 * Rebuilt to the exact reference structure (luxury-apparel-copy):
 *   01  Announcement (OfferBar — handled by Header)
 *   02  Hero — rotating full-bleed images, eyebrow + huge tracked caps,
 *       "SHOP WOMEN / SHOP MEN" buttons
 *   03  Shop By Category — 4 tiles
 *   04  Editorial — THE ICON EDIT / Modern Classics / DISCOVER
 *   05  Editorial — HUSHAE PERFORMANCE / Move With Purpose / SHOP NOW
 *   06  Best Sellers — 4-col grid, hover image swap, New badges
 *   07  #HUSHAE — social proof call-out + EXPLORE
 *
 * HUSHAE branding, PKR prices, real products — the layout is the reference.
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
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out ${idx === i ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1 rounded-full transition-all duration-300 ${idx === i ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Editorial banner — full-bleed image, centered white type ───────────── */
function EditorialBanner({ img, eyebrow, title, body, cta, href }) {
  return (
    <section className="w-full overflow-hidden bg-stone">
      <div className="relative aspect-[16/10] overflow-hidden md:aspect-[21/9]">
        <img src={img} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/80">{eyebrow}</p>
            <h3 className="mt-4 text-[clamp(28px,4vw,52px)] font-bold uppercase leading-[1.05] tracking-[0.06em]">{title}</h3>
            {body && <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-white/85">{body}</p>}
            <Link
              to={href}
              className="mt-8 inline-block border border-white px-10 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 hover:bg-white hover:text-charcoal"
            >
              {cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Section heading — tracked caps, HUSHAE charcoal ────────────────────── */
const SecTitle = ({ eyebrow, children, right }) => (
  <div className="flex items-end justify-between gap-6">
    <div>
      {eyebrow && <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-smoke">{eyebrow}</p>}
      <h2 className="mt-2 text-[26px] font-medium uppercase tracking-[0.08em] text-charcoal md:text-[34px]">{children}</h2>
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
          <p className="text-[11px] font-medium uppercase tracking-[0.3em]">The Spring Edit</p>
          <h1 className="mt-5 text-[clamp(40px,7vw,86px)] font-bold uppercase leading-[1.02] tracking-[0.06em]">
            Redefine
            <br />
            Modern
          </h1>
          <p className="mt-5 text-[14px] font-light tracking-[0.08em] text-white/85">New Season Essentials</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/women"
              className="bg-white px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-charcoal transition-colors duration-300 hover:bg-charcoal hover:text-white"
            >
              Shop Women
            </Link>
            <Link
              to="/men"
              className="border border-white px-9 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:bg-white hover:text-charcoal"
            >
              Shop Men
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SHOP BY CATEGORY — 4 tiles ═══════════════════════════════ */}
      <section className="bg-stone py-16 md:py-24">
        <div className="container">
          <div className="text-center">
            <h2 className="text-[26px] font-medium uppercase tracking-[0.08em] text-charcoal md:text-[34px]">Shop By Category</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {CATS.map((c) => (
              <Link key={c.label} to={c.href} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                  <img
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-hover ease-luxury group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-[15px] font-semibold uppercase tracking-[0.14em] text-charcoal">{c.label}</p>
                  <span className="mt-1 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-smoke underline underline-offset-4 transition-colors duration-300 group-hover:text-charcoal">
                    Shop Now
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
        <section className="bg-stone py-16 md:py-24">
          <div className="container">
            <SecTitle
              eyebrow="Trending Now"
              right={
                <Link to="/best" className="text-[12px] font-medium uppercase tracking-[0.16em] text-smoke underline underline-offset-4 transition-colors duration-300 hover:text-charcoal">
                  View All
                </Link>
              }
            >
              Best Sellers
            </SecTitle>
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
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
        <div className="relative aspect-[16/9] min-h-[420px] overflow-hidden md:aspect-[21/8]">
          <img
            src="https://images.pexels.com/photos/20228980/pexels-photo-20228980.jpeg?w=1920&q=80"
            alt="Share your look"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-charcoal/45" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <h2 className="text-[clamp(30px,5vw,48px)] font-bold uppercase tracking-[0.1em]">#HUSHAE</h2>
              <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-white/85">
                Share your look. Tag @hushae and #HUSHAE on Instagram for a chance to be featured.
              </p>
              <Link
                to="/new"
                className="mt-8 inline-block border border-white px-10 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 hover:bg-white hover:text-charcoal"
              >
                Explore
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
