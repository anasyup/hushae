import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SectionHeader from './SectionHeader';

/* ============================================================================
 * LuxuryCategoryShowcase — exact client reference (Givenchy studio canvas).
 * 3/4 canvas, hover arrow icon top-right, title 11/12px tracking-label +
 * item count. Migrated to SectionHeader primitive for token discipline.
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
        <SectionHeader
          eyebrow="Curated Collections"
          title="Essential Categories"
          href="/shop"
          cta="View All"
        />

        {/* Studio canvas grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {CATEGORIES.map((cat) => (
            <Link key={cat.title} to={cat.href} className="group flex cursor-pointer flex-col">
              <div className="relative aspect-[3/4] overflow-hidden bg-[#f2f0ec]">
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow-sm">
                    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pb-2 pt-4">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-label text-black">{cat.title}</h3>
                  <p className="mt-0.5 text-xs uppercase tracking-label text-neutral-500">{cat.itemCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}