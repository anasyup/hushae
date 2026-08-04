import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME v2 — Quiet editorial. 7 sections, no decoration.
 *
 * Palette: #F7F6F4 paper, #0E0E0E ink, #6E6E6B ash, #E3E2DF line
 * Type: Archivo (UI), Instrument Serif (editorial, sparingly)
 * Grid: 2px gap, no card borders, no shadows, no radius
 * Motion: one easing curve, opacity/translate only, 300-500ms
 * ========================================================================== */

export default function Home() {
  const { settings } = useApp();
  const [best, setBest] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
    api('/products?featured=true&limit=8').then((d) => setFeatured(d.products || [])).catch(() => setFeatured([]));
  }, []);

  return (
    <div style={{ background: '#F7F6F4', color: '#0E0E0E', fontFamily: "'Archivo', system-ui, sans-serif" }}>
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 1. HERO — Full bleed, bottom-left caption ═══════════ */}
      <section className="relative w-full overflow-hidden bg-[#E3E2DF]" style={{ minHeight: '85vh' }}>
        <img src="/images/collection/band-neutral.jpg" alt="" fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E]/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">Premium innerwear · Made in Pakistan</p>
            <h1 className="mt-3 text-[36px] md:text-[64px] font-normal uppercase tracking-[0.01em] text-white leading-[1.05]">Second skin,<br />first choice.</h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/women" className="inline-flex min-h-[44px] items-center justify-center bg-white px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] transition-opacity hover:opacity-80">Shop Women</Link>
              <Link to="/men" className="inline-flex min-h-[44px] items-center justify-center border border-white/40 px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-white hover:bg-white hover:text-[#0E0E0E]">Shop Men</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. CATEGORY SPLIT ═══════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {[{ to: '/women', img: '/images/categories/bras.jpg', label: 'Women', sub: 'Bras, panties, shapewear & more' },
          { to: '/men', img: '/images/categories/briefs.jpg', label: 'Men', sub: 'Briefs, boxers, trunks & vests' }]
          .map(({ to, img, label, sub }) => (
            <Link key={to} to={to} className="group relative block overflow-hidden bg-[#E3E2DF]" style={{ aspectRatio: '4/5' }}>
              <img src={img} alt={label} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
              <div className="absolute inset-0 bg-[#0E0E0E]/20 group-hover:bg-[#0E0E0E]/30 transition-colors duration-500" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">{label}</p>
                <p className="mt-1 text-[13px] text-white/60">{sub}</p>
              </div>
            </Link>
          ))}
      </section>

      {/* ═══ 3. BEST SELLERS ════════════════════════════════════ */}
      {best && best.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="mb-10 flex items-end justify-between">
              <div><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">Loved</p><h2 className="mt-2 h2">Best sellers</h2></div>
              <Link to="/best" className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.10em] text-[#6E6E6B] hover:text-[#0E0E0E]">View all <ArrowRight size={12} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-[2px] md:grid-cols-4">{best.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}</div>
          </div>
        </section>
      )}

      {/* ═══ 4. BRAND STORY ════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#0E0E0E] text-white" style={{ minHeight: '65vh' }}>
        <img src="/images/hero/editorial-signature.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E0E0E]/80 via-[#0E0E0E]/40 to-transparent" />
        <div className="relative flex items-center" style={{ minHeight: '65vh' }}>
          <div className="container py-20"><div className="max-w-lg">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">The house</p>
            <h2 className="mt-4 h2 !text-white">Made to be forgotten.</h2>
            <p className="mt-5 body-sm text-white/70 max-w-md">The best innerwear is the piece you stop noticing by ten in the morning. We cut for that moment — modal that moves, seams that sit flat, elastics that hold without pressing.</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.10em] text-white/50">Designed and made in Pakistan · finished to an international standard</p>
            <Link to="/about" className="mt-6 inline-flex items-center gap-1.5 border-b border-white/30 pb-2 text-[12px] font-medium uppercase tracking-[0.10em] text-white hover:border-white">Our standards <ArrowRight size={12} /></Link>
          </div></div>
        </div>
      </section>

      {/* ═══ 5. FEATURED ═══════════════════════════════════════ */}
      {featured && featured.length > 0 && (
        <section className="section" style={{ background: '#FFFFFF' }}>
          <div className="container">
            <div className="mb-10 flex items-end justify-between">
              <div><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">The edit</p><h2 className="mt-2 h2">Signature pieces</h2></div>
              <Link to="/shop?tier=Premium" className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.10em] text-[#6E6E6B] hover:text-[#0E0E0E]">Shop all <ArrowRight size={12} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-[2px] md:grid-cols-4">{featured.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}</div>
          </div>
        </section>
      )}

      {/* ═══ 6. FIT FINDER ═════════════════════════════════════ */}
      <section className="section text-center" style={{ background: '#0E0E0E' }}>
        <div className="container">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">Size guide</p>
          <h2 className="mt-3 h2 !text-white">Find your exact fit</h2>
          <p className="mt-3 body-sm text-white/60 max-w-md mx-auto">Four questions. No tape measure. Our Fit Finder calculates your true size.</p>
          <Link to="/fit-finder" className="mt-6 inline-flex min-h-[44px] items-center justify-center bg-white px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] transition-opacity hover:opacity-80">Start Fit Finder <ArrowRight size={12} className="ml-1" /></Link>
        </div>
      </section>

      {/* ═══ 7. NEWSLETTER ═════════════════════════════════════ */}
      <section className="section text-center border-t border-[#E3E2DF]">
        <div className="container">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">Stay in touch</p>
          <h2 className="mt-2 h3">Join the circle</h2>
          <p className="mt-2 text-[13px] text-[#6E6E6B] max-w-sm mx-auto">Early access to new drops. No spam, ever.</p>
          {nlDone ? (
            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E]">You&apos;re on the list.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (nl.trim()) { setNlDone(true); setNl(''); } }} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="flex-1 min-h-[44px] border-b border-[#E3E2DF] bg-transparent px-2 text-[13px] outline-none focus:border-[#0E0E0E] placeholder:text-[#6E6E6B]" />
              <button type="submit" className="min-h-[44px] bg-[#0E0E0E] px-6 text-[12px] font-medium uppercase tracking-[0.10em] text-white transition-opacity hover:opacity-80">Subscribe</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
