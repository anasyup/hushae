import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME v4 — Pure CK editorial. Hero → Categories → Fit Finder.
 * No product grids. Clean, quiet, luxury.
 * ========================================================================== */

export default function Home() {
  return (
    <div style={{ background: '#F7F5F1', color: '#0E0E0E', fontFamily: "'Archivo', system-ui, sans-serif" }}>
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* 1. HERO */}
      <section className="relative w-full overflow-hidden bg-[#E3E2DF]" style={{ minHeight: '100svh' }}>
        <img src="/images/collection/band-neutral.jpg" alt="" fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E]/55 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16">
          <div className="max-w-xl">
            <h1 className="text-[32px] md:text-[56px] font-light uppercase tracking-[0.02em] text-white leading-[1.08]">
              HUSHAE
            </h1>
            <p className="mt-3 text-[13px] md:text-[15px] text-white/70 font-light max-w-sm">
              Premium innerwear. Made in Pakistan, finished to an international standard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/women" className="inline-flex min-h-[44px] items-center justify-center bg-white px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] transition-opacity hover:opacity-80">
                Shop Women
              </Link>
              <Link to="/men" className="inline-flex min-h-[44px] items-center justify-center border border-white/40 px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-white transition-colors hover:bg-white hover:text-[#0E0E0E]">
                Shop Men
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SPLIT */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {[
          { to: '/women', img: '/images/categories/bras.jpg', label: 'Women', sub: 'Bras, panties, shapewear & more' },
          { to: '/men', img: '/images/categories/briefs.jpg', label: 'Men', sub: 'Briefs, boxers, trunks & vests' },
        ].map(({ to, img, label, sub }) => (
          <Link key={to} to={to} className="group relative block overflow-hidden bg-[#E3E2DF]" style={{ aspectRatio: '4/5' }}>
            <img src={img} alt={label} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
            <div className="absolute inset-0 bg-[#0E0E0E]/20 group-hover:bg-[#0E0E0E]/30 transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <p className="text-[18px] md:text-[24px] font-light uppercase tracking-[0.04em] text-white">{label}</p>
              <p className="mt-1 text-[12px] text-white/60 font-light">{sub}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* 3. FIT FINDER */}
      <section className="px-4 md:px-8 lg:px-12 py-20 md:py-24 text-center" style={{ background: '#0E0E0E' }}>
        <h2 className="text-[22px] md:text-[28px] font-light tracking-[0.02em] text-white">Find your exact fit</h2>
        <p className="mt-3 text-[14px] text-white/50 font-light max-w-md mx-auto">
          Four questions. No tape measure. Your true size, calculated.
        </p>
        <Link to="/fit-finder" className="mt-7 inline-flex min-h-[44px] items-center justify-center bg-white px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] transition-opacity hover:opacity-80">
          Start Fit Finder <ArrowRight size={12} className="ml-1" />
        </Link>
      </section>
    </div>
  );
}
