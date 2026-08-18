import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/* ============================================================================
 * MEGA PANEL — exact client reference v2. Rendered as a DIRECT CHILD of the
 * header (absolute top-full, full-width). One AnimatePresence panel driven by
 * the header's `mega` state; the header's onMouseLeave closes it.
 *   · #FAF9F6 bg, border-b, shadow-xl, 0.25s easeOut entrance
 *   · 12-col grid: promo card (4/3, rounded-sm, hover zoom + overlay) |
 *     Featured | Shop {kind} | More
 *   · links: text-xs neutral-800, hover translate-x-1
 * ========================================================================== */

const HEAD = 'mb-5 text-[11px] font-semibold uppercase tracking-widest text-neutral-400';
const LINK = 'inline-block text-xs text-neutral-800 transition-all duration-200 hover:translate-x-1 hover:text-black';

const PROMO = {
  men: { image: '/images/campaign/qa/hero-men.jpg', title: 'Essential Comfort', cta: 'Shop Men' },
  women: { image: '/images/campaign/qa/hero-women.jpg', title: 'Cloud Lounge Collection', cta: 'Explore Women' },
};

export default function MegaPanel({ open, cats, collections, onClose }) {
  const kind = open;
  if (!kind) return null;
  const promo = PROMO[kind];
  const items = cats || [];
  const categories = items.slice(0, 3);
  const more = items.slice(3);
  const featured = kind === 'women' ? collections.slice(0, 3) : collections.slice(0, 2);

  return (
    <AnimatePresence>
      {kind && (
        <motion.div
          key="megapanel"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.18 }}
          className="absolute left-0 right-0 top-full z-50 w-full overflow-hidden border-b border-neutral-200 bg-white shadow-xl"
        >
          <div className="mx-auto max-w-[1440px] px-10 py-10">
            {kind === 'sale' ? (
              /* ── TOMMY HILFIGER STYLE SALE LAYOUT ─────────────────── */
              <div className="grid grid-cols-12 items-center gap-10">
                {/* Black offer box */}
                <Link to="/sale" onClick={onClose} className="col-span-3 flex h-64 flex-col items-center justify-center border-4 border-black bg-black p-8 text-center text-white">
                  <h2 className="mb-2 text-3xl font-bold tracking-tight">Up to 70% Off</h2>
                  <p className="text-sm font-light uppercase tracking-widest">Sale Styles</p>
                </Link>

                {/* Men's Sale */}
                <div className="col-span-3">
                  <h4 className="mb-4 text-sm font-bold text-black">Men's Sale</h4>
                  <ul className="space-y-2 text-xs">
                    <li><Link to="/sale?gender=men" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Shop All</Link></li>
                    <li><Link to="/men" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Clothing</Link></li>
                    <li><Link to="/category/briefs" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Underwear</Link></li>
                    <li><Link to="/shop" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Accessories</Link></li>
                  </ul>
                </div>

                {/* Women's Sale */}
                <div className="col-span-3">
                  <h4 className="mb-4 text-sm font-bold text-black">Women's Sale</h4>
                  <ul className="space-y-2 text-xs">
                    <li><Link to="/sale?gender=women" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Shop All</Link></li>
                    <li><Link to="/women" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Clothing</Link></li>
                    <li><Link to="/category/panties" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Underwear</Link></li>
                    <li><Link to="/shop" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Accessories</Link></li>
                  </ul>
                </div>

                {/* New Season */}
                <div className="col-span-3">
                  <h4 className="mb-4 text-sm font-bold text-black">New Season</h4>
                  <ul className="space-y-2 text-xs">
                    <li><Link to="/new" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">New Arrivals</Link></li>
                    <li><Link to="/best" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Best Sellers</Link></li>
                    <li><Link to="/sale" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">Sale</Link></li>
                    <li><Link to="/collection/new-arrivals" onClick={onClose} className="text-neutral-700 hover:text-black hover:underline">The Collection</Link></li>
                  </ul>
                </div>
              </div>
            ) : (
              /* ── STANDARD MEN / WOMEN MEGA MENU (4/4/4) ───────────── */
              <div className="grid grid-cols-12 gap-8">
                {/* Promo */}
                {promo && (
                  <Link to={`/${kind}`} onClick={onClose} className="group relative col-span-4 aspect-[4/3] overflow-hidden">
                    <img src={promo.image} alt={promo.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-sm font-semibold">{promo.title}</p>
                      <span className="mt-1 block text-xs underline">{promo.cta}</span>
                    </div>
                  </Link>
                )}

                {/* Featured */}
                <div className="col-span-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">Featured</h4>
                  <ul className="space-y-2">
                    {featured.map((c) => (
                      <li key={c.href}>
                        <Link to={c.href} onClick={onClose} className="text-xs text-neutral-800 hover:text-black">{c.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Categories */}
                <div className="col-span-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">Categories</h4>
                  <ul className="space-y-2">
                    {categories.map((c) => (
                      <li key={c.slug}>
                        <Link to={`/category/${c.slug}`} onClick={onClose} className="text-xs text-neutral-800 hover:text-black">{c.name}</Link>
                      </li>
                    ))}
                    <li>
                      <Link to={`/${kind}`} onClick={onClose} className="inline-flex min-h-[44px] items-center text-xs font-medium text-black underline underline-offset-4">View all {kind === 'women' ? 'Women' : 'Men'}</Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
