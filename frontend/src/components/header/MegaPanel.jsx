import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

/* ============================================================================
 * HUSHAE MEGA PANEL — Calvin Klein / High-Fashion Luxury Register
 *
 * Design Spec:
 *   - Jet Black (#000000) typography throughout
 *   - Balanced 4-column layout: Featured / Categories / Dual Campaign Cards
 *   - Smooth GPU Framer Motion dropdown animation
 *   - Interactive image cards with elegant hover zoom and minimal micro-links
 * ========================================================================== */

const EDITORIAL_PROMOS = {
  women: [
    {
      to: '/category/bras',
      title: 'Second Skin Studio',
      subtitle: 'Ultralight modal & wireless support',
      cta: 'Explore Bras',
      image: '/images/campaign/qa/cat-women.jpg',
    },
    {
      to: '/new',
      title: 'The New Arrivals',
      subtitle: 'Sculpted essentials for everyday wear',
      cta: 'Shop New In',
      image: '/images/campaign/qa/hero-women.jpg',
    },
  ],
  men: [
    {
      to: '/category/briefs',
      title: 'Engineered Precision',
      subtitle: 'Breathable modal & no-ride briefs',
      cta: 'Explore Briefs',
      image: '/images/campaign/qa/cat-men.jpg',
    },
    {
      to: '/category/boxers',
      title: 'Relaxed Loungewear',
      subtitle: 'Soft cotton boxers & sleep shirts',
      cta: 'Shop Boxers',
      image: '/images/campaign/qa/hero-men.jpg',
    },
  ],
  sale: [
    {
      to: '/sale',
      title: 'Signature Sale Edit',
      subtitle: 'Up to 30% off timeless collections',
      cta: 'Shop All Sale',
      image: '/images/campaign/qa/hero-slide-4.jpg',
    },
    {
      to: '/best',
      title: 'Curated Best Sellers',
      subtitle: 'Most coveted everyday foundations',
      cta: 'View Curated',
      image: '/images/campaign/qa/editorial-modern.jpg',
    },
  ],
};

const FEATURED_LINKS = {
  women: [
    { label: 'New Arrivals', href: '/new' },
    { label: 'Best Sellers', href: '/best' },
    { label: 'The Second Skin Edit', href: '/category/bras' },
    { label: 'Seamless Essentials', href: '/category/panties' },
    { label: 'Silk & Loungewear', href: '/category/sleepwear-loungewear' },
    { label: 'The Sale Edit', href: '/sale' },
  ],
  men: [
    { label: 'New Arrivals', href: '/new' },
    { label: 'Best Sellers', href: '/best' },
    { label: 'Modal Briefs Series', href: '/category/briefs' },
    { label: 'Classic Cotton Boxers', href: '/category/boxers' },
    { label: 'Ribbed Vests & Tanks', href: '/category/vests-undershirts' },
    { label: 'The Sale Edit', href: '/sale' },
  ],
  sale: [
    { label: 'All Sale Styles', href: '/sale' },
    { label: 'Women’s Sale', href: '/sale?gender=women' },
    { label: 'Men’s Sale', href: '/sale?gender=men' },
    { label: 'Best Value Packs', href: '/best' },
    { label: 'New Markdowns', href: '/new' },
  ],
};

export default function MegaPanel({ open, cats = [], collections = [], onClose }) {
  const kind = open;
  if (!kind) return null;

  const promos = EDITORIAL_PROMOS[kind] || EDITORIAL_PROMOS.women;
  const featured = FEATURED_LINKS[kind] || FEATURED_LINKS.women;
  const genderCats = (cats || []).filter((c) => (kind === 'sale' ? true : c.gender === kind));

  return (
    <AnimatePresence>
      {kind && (
        <motion.div
          key="megapanel"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 right-0 top-full z-50 w-full overflow-hidden border-b border-neutral-200/90 bg-[#FFFFFF] shadow-2xl"
          onMouseEnter={() => {}}
          onMouseLeave={onClose}
        >
          <div className="mx-auto max-w-[1600px] px-8 py-10 lg:px-14 lg:py-12">
            <div className="grid grid-cols-12 gap-8 lg:gap-12">

              {/* ── COLUMN 1: FEATURED EDITS ───────────────────────────────── */}
              <div className="col-span-3 space-y-4 border-r border-neutral-100 pr-6">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#000000] pb-2 border-b border-neutral-200">
                  Featured
                </h4>
                <ul className="space-y-2.5 pt-1">
                  {featured.map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className="group flex items-center justify-between text-[13px] font-normal text-[#000000] transition-opacity hover:opacity-60"
                      >
                        <span>{item.label}</span>
                        <ArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[#000000]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── COLUMN 2: CATEGORIES DIRECTORY ────────────────────────── */}
              <div className="col-span-3 space-y-4 border-r border-neutral-100 pr-6">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#000000] pb-2 border-b border-neutral-200">
                  {kind === 'sale' ? 'Sale Departments' : 'Categories'}
                </h4>
                <ul className="space-y-2.5 pt-1">
                  {genderCats.length > 0 ? (
                    genderCats.slice(0, 6).map((c) => (
                      <li key={c.slug}>
                        <Link
                          to={`/category/${c.slug}`}
                          onClick={onClose}
                          className="group flex items-center justify-between text-[13px] font-normal text-[#000000] transition-opacity hover:opacity-60"
                        >
                          <span>{c.name}</span>
                          <ArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[#000000]" />
                        </Link>
                      </li>
                    ))
                  ) : (
                    <>
                      <li>
                        <Link to={`/${kind}`} onClick={onClose} className="text-[13px] text-[#000000] hover:opacity-60">
                          Bras & Bralettes
                        </Link>
                      </li>
                      <li>
                        <Link to={`/${kind}`} onClick={onClose} className="text-[13px] text-[#000000] hover:opacity-60">
                          Panties & Briefs
                        </Link>
                      </li>
                      <li>
                        <Link to={`/${kind}`} onClick={onClose} className="text-[13px] text-[#000000] hover:opacity-60">
                          Camisoles & Slips
                        </Link>
                      </li>
                      <li>
                        <Link to={`/${kind}`} onClick={onClose} className="text-[13px] text-[#000000] hover:opacity-60">
                          Loungewear & Knits
                        </Link>
                      </li>
                    </>
                  )}
                  <li className="pt-2">
                    <Link
                      to={kind === 'sale' ? '/sale' : `/${kind}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 border-b border-black pb-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#000000] transition-opacity hover:opacity-60"
                    >
                      <span>View All {kind === 'women' ? 'Women' : kind === 'men' ? 'Men' : 'Sale'}</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  </li>
                </ul>
              </div>

              {/* ── COLUMN 3 & 4: DUAL EDITORIAL CAMPAIGN CARDS ───────────── */}
              <div className="col-span-6 grid grid-cols-2 gap-5">
                {promos.map((p) => (
                  <Link
                    key={p.title}
                    to={p.to}
                    onClick={onClose}
                    className="group relative flex flex-col overflow-hidden bg-[#fafafa] cursor-pointer"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f4f4f4]">
                      <img
                        src={p.image}
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:bg-black/0"
                      />
                    </div>

                    {/* Metadata below image */}
                    <div className="pt-3.5 pb-1">
                      <h5 className="text-[13px] font-medium tracking-tight text-[#000000] leading-snug">
                        {p.title}
                      </h5>
                      <p className="mt-0.5 text-[11px] text-[#666666] leading-relaxed">
                        {p.subtitle}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 border-b border-black pb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#000000] transition-opacity group-hover:opacity-60">
                        {p.cta} <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
