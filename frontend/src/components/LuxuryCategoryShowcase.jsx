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
    <section className="w-full bg-white px-4 pb-12 md:px-8 md:pb-16">
      <div className="mx-auto max-w-[1600px]">
        {/* Minimal section title */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">Curated Collections</span>
            <h2 className="mt-3 text-2xl font-light uppercase tracking-[0.18em] text-[#111111] md:text-[34px]">Essential Categories</h2>
          </div>
          <Link to="/shop" className="hidden min-h-[44px] items-center gap-1 border-b border-black/40 pb-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-600 transition-colors hover:border-black hover:text-black sm:inline-flex">
            View All <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>

        {/* Studio canvas grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {CATEGORIES.map((cat) => (
            <Link key={cat.title} to={cat.href} className="group flex cursor-pointer flex-col">
              {/* MEASURED at 390px: the image painted 125x183 inside a
                  173x231 tile — 48px of dead space on both axes, so every
                  category tile read as a small floating picture in a beige
                  box while every other grid on the site is edge to edge.

                  Cause was `object-contain` + `mix-blend-multiply` + p-6/p-10.
                  That combination is the correct treatment for transparent
                  PNG cutouts on a white studio ground; these sources
                  (bras/panties/briefs/boxers.jpg, 558x1000 and 747x1000) are
                  full-frame PHOTOGRAPHS of folded product on linen. Contained
                  and multiplied, a photograph just shrinks and dirties its own
                  background.

                  Now object-cover with no padding and no blend mode: the tile
                  fills, and the aspect-[3/4] box still fixes the height so
                  there is no layout shift. */}
              <div className="relative aspect-[3/4] overflow-hidden bg-[#f2f0ec]">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* The chip used to sit on flat beige; over a photograph
                    bg-black/5 is invisible. White ground, dark glyph. */}
                <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow-sm">
                    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pb-2 pt-4">
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#111111] md:text-[12px]">{cat.title}</h3>
                  {/* 9px was the smallest type on the storefront and this is
                      product information, not an eyebrow. 11px floor, and
                      neutral-400 (3.1:1 on alabaster) -> neutral-500. */}
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.15em] text-neutral-500">{cat.itemCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
