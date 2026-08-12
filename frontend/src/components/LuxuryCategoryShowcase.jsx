import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/* ============================================================================
 * LuxuryCategoryShowcase — exact client reference (Givenchy studio canvas).
 * 3/4 canvas `#eeece7` → hover `#e7e4dd`, image mix-blend-multiply + scale,
 * hover arrow icon top-right, title 11/12px tracking 0.22em + item count.
 * ========================================================================== */

const CATEGORIES = [
  { title: "Women's Bras", itemCount: '12 Pieces', image: '/images/categories/bras.jpg', href: '/category/bras' },
  { title: "Women's Panties", itemCount: '18 Pieces', image: '/images/categories/panties.jpg', href: '/category/panties' },
  { title: "Men's Briefs", itemCount: '9 Pieces', image: '/images/categories/briefs.jpg', href: '/category/briefs' },
  { title: "Men's Boxers", itemCount: '14 Pieces', image: '/images/categories/boxers.jpg', href: '/category/boxers' },
];

export default function LuxuryCategoryShowcase() {
  return (
    <section className="w-full bg-[#fcfbf9] px-4 py-20 md:px-8">
      <div className="mx-auto max-w-[1600px]">
        {/* Minimal section title — Second Skin Studio register */}
        <div data-reveal className="mb-10 flex items-end justify-between border-b border-neutral-200/80 pb-6">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400">01 · The Collections</span>
            <h2 className="mt-3 font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">Curated for Skin</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-1 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition hover:opacity-60 sm:flex">
            View All <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {/* Studio canvas grid */}
        <div data-reveal-group className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {CATEGORIES.map((cat) => (
            <Link key={cat.title} to={cat.href} data-reveal-item className="group flex cursor-pointer flex-col">
              <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#eeece7] p-6 transition-colors duration-500 group-hover:bg-[#e7e4dd] md:p-10">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="h-full w-full object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black">
                    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pb-2 pt-4">
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111] md:text-[12px]">{cat.title}</h3>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.15em] text-neutral-400">{cat.itemCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
