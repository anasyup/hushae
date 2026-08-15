import { Link } from 'react-router-dom';

/* ============================================================================
 * SaleSplitBanner — one editorial banner split into two halves:
 * Men on the left, Women on the right. Visually it reads as a single
 * full-bleed banner (no gap, one hairline between the halves), each side
 * with its own campaign image, tracked eyebrow, serif title and shop link.
 * Placed inside the Sale grid after the first 8 products.
 * ========================================================================== */

export default function SaleSplitBanner() {
  return (
    <section className="col-span-1 mt-4 sm:col-span-2 md:col-span-4">
      <div className="grid w-full grid-cols-1 sm:grid-cols-2">
        {/* MEN */}
        <Link
          to="/men"
          className="group relative aspect-[3/2] overflow-hidden bg-[#111] sm:aspect-[4/5] lg:aspect-[3/4]"
        >
          <img
            src="/images/campaign/qa/hero-men.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.66) 0%, rgba(17,17,17,0.1) 55%, rgba(17,17,17,0) 100%)' }}
          />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
            <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/70">The Edit</p>
            <h3 className="mt-2 font-serif text-2xl font-normal uppercase tracking-[0.12em] md:text-3xl">For Him</h3>
            <span className="mt-4 inline-block border-b border-white/60 pb-1 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors group-hover:border-white">
              Shop Men
            </span>
          </div>
        </Link>

        {/* WOMEN */}
        <Link
          to="/women"
          className="group relative aspect-[3/2] overflow-hidden border-t border-white/20 bg-[#111] sm:aspect-[4/5] sm:border-l sm:border-t-0 lg:aspect-[3/4]"
        >
          <img
            src="/images/campaign/qa/hero-women.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.66) 0%, rgba(17,17,17,0.1) 55%, rgba(17,17,17,0) 100%)' }}
          />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
            <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/70">The Edit</p>
            <h3 className="mt-2 font-serif text-2xl font-normal uppercase tracking-[0.12em] md:text-3xl">For Her</h3>
            <span className="mt-4 inline-block border-b border-white/60 pb-1 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors group-hover:border-white">
              Shop Women
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
