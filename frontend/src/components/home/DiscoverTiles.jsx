import { Link } from 'react-router-dom';

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
    <section className="w-full bg-[#fcfbf9] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-10 flex items-end justify-between border-b border-neutral-200/80 pb-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">Discover</p>
            <h2 className="mt-3 font-display text-2xl font-light uppercase tracking-[0.14em] text-[#111111] md:text-3xl">
              Shop the Edit
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition hover:opacity-60 sm:flex"
          >
            View All <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

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
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111]">
                  {t.label}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#111111]"
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
