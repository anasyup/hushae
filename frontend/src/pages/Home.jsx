import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { snap } from '../lib/format';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — Luxury editorial redesign.
 *
 * Inspired by: Calvin Klein, RUADH, Estudio Niksen, Urban Outfitters
 * Key patterns:
 *   - Full-bleed hero with editorial caption
 *   - Category entry diptych with hover-reveal text
 *   - Curated product rows with image-swap cards
 *   - Brand story spread
 *   - Newsletter editorial signoff
 * ========================================================================== */

export default function Home() {
  const { settings } = useApp();
  const [best, setBest] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);
  const s = settings || {};

  useEffect(() => {
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
    api('/products?featured=true&limit=8').then((d) => setFeatured(d.products || [])).catch(() => setFeatured([]));
  }, []);

  const handleSubscribe = (e) => { e.preventDefault(); if (nl.trim()) { setNlDone(true); setNl(''); } };

  return (
    <div className="bg-white text-neutral-900 font-sans antialiased">
      <Seo
        title="HUSHAE — Premium Innerwear"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />

      {/* ═══ 1. EDITORIAL HERO — Full bleed with bottom-left caption ═══ */}
      <section className="relative w-full overflow-hidden bg-neutral-100" style={{ minHeight: '85vh' }}>
        <img
          src="/images/collection/band-neutral.jpg"
          alt="HUSHAE"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-16">
          <div className="max-w-xl">
            <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
              Premium innerwear · Made in Pakistan
            </p>
            <h1 className="mt-3 text-3xl md:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.05]">
              Engineered for the body.<br />Designed for the eye.
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/women" className="inline-flex min-h-[44px] items-center justify-center bg-white px-7 text-xs font-bold uppercase tracking-[0.15em] text-neutral-900 transition hover:bg-neutral-100">
                Shop Women
              </Link>
              <Link to="/men" className="inline-flex min-h-[44px] items-center justify-center border border-white/40 bg-transparent px-7 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-neutral-900">
                Shop Men
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. CATEGORY ENTRY POINTS — Editorial diptych ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {[
          { href: '/women', img: '/images/categories/bras.jpg', label: 'Women', subtitle: 'Bras, panties, shapewear & more' },
          { href: '/men', img: '/images/categories/briefs.jpg', label: 'Men', subtitle: 'Briefs, boxers, trunks & vests' },
        ].map(({ href, img, label, subtitle }) => (
          <Link key={href} to={href} className="group relative block overflow-hidden bg-neutral-100" style={{ aspectRatio: '4/5' }}>
            <img src={img} alt={label} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{label}</p>
              <p className="mt-1 text-xs text-white/60">{subtitle}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white">
                Explore <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* ═══ 3. BEST SELLERS — Product row with editorial header ═══ */}
      {best && best.length > 0 && (
        <section className="px-4 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mb-10 flex flex-col items-start gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Best sellers</p>
              <h2 className="mt-2 text-xl md:text-2xl font-light tracking-tight text-neutral-900">Loved by Pakistan</h2>
            </div>
            <Link to="/best" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 hover:text-neutral-900">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {best.slice(0, 8).map((p) => <ProductCard key={p._id} product={snap(p)} headingLevel="h3" />)}
          </div>
        </section>
      )}

      {/* ═══ 4. FULL-BLEED BRAND STORY ═══ */}
      <section className="relative overflow-hidden bg-neutral-900 text-white" style={{ minHeight: '70vh' }}>
        <img src="/images/hero/editorial-signature.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/80 via-neutral-900/40 to-transparent" />
        <div className="relative flex items-center" style={{ minHeight: '70vh' }}>
          <div className="px-6 py-20 md:px-12 lg:px-16 max-w-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">The house</p>
            <h2 className="mt-4 text-2xl md:text-3xl lg:text-4xl font-light tracking-tight leading-[1.1]">
              Designed in Pakistan.<br />Finished to an international standard.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/70 max-w-md">
              Every HUSHAE piece is cut, stitched, and inspected in our own workshops. 
              We use combed cotton and precision elastics chosen for how they behave after 
              a hundred washes — not how they feel in a showroom.
            </p>
            <Link to="/about" className="mt-6 inline-flex items-center gap-1.5 border-b border-white/30 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:border-white">
              Our story <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 5. FEATURED PRODUCTS ═══ */}
      {featured && featured.length > 0 && (
        <section className="px-4 py-16 md:px-8 md:py-24 lg:px-12 bg-neutral-50">
          <div className="mb-10 flex flex-col items-start gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Featured</p>
              <h2 className="mt-2 text-xl md:text-2xl font-light tracking-tight text-neutral-900">The signature edit</h2>
            </div>
            <Link to="/shop?tier=Premium" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 hover:text-neutral-900">
              Shop all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {featured.slice(0, 8).map((p) => <ProductCard key={p._id} product={snap(p)} headingLevel="h3" />)}
          </div>
        </section>
      )}

      {/* ═══ 6. FIT FINDER CTA ═══ */}
      <section className="px-4 py-20 md:px-8 md:py-28 bg-neutral-900 text-white text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Size guide</p>
        <h2 className="mt-3 text-2xl md:text-3xl font-light tracking-tight">Find your exact fit</h2>
        <p className="mt-3 text-sm text-white/60 max-w-md mx-auto">
          Four questions. No tape measure. Our Fit Finder calculates your true size across every piece.
        </p>
        <Link to="/fit-finder" className="mt-6 inline-flex min-h-[44px] items-center justify-center bg-white px-8 text-xs font-bold uppercase tracking-[0.15em] text-neutral-900 transition hover:bg-neutral-100">
          Start Fit Finder <ArrowRight size={12} className="ml-1" />
        </Link>
      </section>

      {/* ═══ 7. NEWSLETTER ═══ */}
      <section className="px-4 py-20 md:px-8 md:py-24 text-center border-t border-neutral-100">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-400">Stay in touch</p>
        <h2 className="mt-3 text-xl md:text-2xl font-light tracking-tight">Join the circle</h2>
        <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
          Early access to new drops. No spam, ever.
        </p>
        {nlDone ? (
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-900">✓ You're on the list.</p>
        ) : (
          <form onSubmit={handleSubscribe} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required
              placeholder="Your email"
              className="flex-1 min-h-[44px] border-b border-neutral-200 bg-transparent px-2 text-sm outline-none focus:border-neutral-900 placeholder:text-neutral-400" />
            <button type="submit" className="min-h-[44px] bg-neutral-900 px-6 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-black">
              Subscribe
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
