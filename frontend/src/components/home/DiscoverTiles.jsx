import { Link } from 'react-router-dom';
import SectionHeader from '../SectionHeader';

/* ============================================================================
 * DISCOVER — the luxury-brand editorial gateway.
 * The exact pattern Chanel / Hermès / Calvin Klein use under their hero:
 * four clean editorial photographs, each with a small tracked-caps label
 * beneath and a quiet "Shop" affordance on hover. No gimmicks — photography
 * and air do the work.
 * ========================================================================== */

const TILES = [
  { label: 'Women', href: '/women', img: '/images/campaign/qa/cat-women.jpg' },
  { label: 'Men', href: '/men', img: '/images/campaign/qa/cat-men.jpg' },
  { label: 'New Arrivals', href: '/new', img: '/images/campaign/qa/editorial-modern.jpg' },
  { label: 'The Edit', href: '/shop', img: '/images/campaign/qa/hero-fabric.jpg' },
];

export default function DiscoverTiles() {
  return (
    <section className="w-full bg-white px-4 pt-20 pb-10 md:px-8 md:pt-28 md:pb-14">
      <div className="mx-auto max-w-[1600px]">
        <SectionHeader
          eyebrow="Discover"
          title="Shop the Edit"
          href="/shop"
          cta="View All"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {TILES.map((t) => (
            <Link key={t.label} to={t.href} className="group block">
              <div className="overflow-hidden bg-[#f2f0ec]">
                <img
                  src={t.img}
                  alt={t.label}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs font-medium uppercase tracking-label text-black">
                  {t.label}
                </span>
                <span
                  aria-hidden="true"
                  className="text-xs font-medium uppercase tracking-label text-neutral-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-black"
                >
                  Shop
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}