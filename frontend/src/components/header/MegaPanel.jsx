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
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 top-full z-50 w-full overflow-hidden border-b border-neutral-200 bg-[#FAF9F6] shadow-2xl"
        >
          <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-8 px-6 py-10 lg:px-12">
            {/* Promo card */}
            {promo && (
              <Link to={`/${kind}`} onClick={onClose} className="group relative col-span-4 overflow-hidden rounded-sm bg-neutral-200" style={{ aspectRatio: '4 / 3' }}>
                <img
                  src={promo.image}
                  alt={promo.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 transition-colors duration-300 group-hover:bg-black/35" aria-hidden="true" />
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="mb-2 text-base font-light normal-case tracking-wide">{promo.title}</p>
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest underline underline-offset-4">
                    {promo.cta} <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            )}

            {/* Featured */}
            <div className="col-span-3 pl-4">
              <h4 className={HEAD}>Featured</h4>
              <ul className="space-y-3">
                {featured.map((c) => (
                  <li key={c.href}>
                    <Link to={c.href} onClick={onClose} className={LINK}>{c.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Shop {kind} */}
            <div className="col-span-3">
              <h4 className={HEAD}>Shop {kind === 'women' ? 'Women' : 'Men'}</h4>
              <ul className="space-y-3">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link to={`/category/${c.slug}`} onClick={onClose} className={LINK}>{c.name}</Link>
                  </li>
                ))}
                <li>
                  <Link to={`/${kind}`} onClick={onClose} className={LINK}>View all {kind === 'women' ? 'Women' : 'Men'}</Link>
                </li>
              </ul>
            </div>

            {/* More */}
            {more.length > 0 && (
              <div className="col-span-2">
                <h4 className={HEAD}>More</h4>
                <ul className="space-y-3">
                  {more.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/category/${c.slug}`} onClick={onClose} className={LINK}>{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
