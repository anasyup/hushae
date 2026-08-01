import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { snap } from '../lib/format';
import ProductCard from './ProductCard';
import { ProductGridSkeleton } from './Skeletons';

/* ============================================================================
 * ProductListSection — one fully admin-configurable product grid / carousel.
 *
 * Every knob the merchant sees in the Theme Editor lives in `cfg`, a single
 * entry of settings.productSections. Nothing is hard-coded, so adding another
 * product row to the storefront never requires a code change again.
 *
 * cfg shape → backend/src/models/Settings.js › productSections
 * ========================================================================== */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || lo));

const RATIO = {
  square:   'aspect-square',
  portrait: 'aspect-[4/5]',
  tall:     'aspect-[3/4]',
};

// Translate the chosen source into an API call
function queryFor(cfg) {
  const limit = clamp(cfg.productCount, 2, 24);
  if (cfg.source === 'trending') return `/products/trending?limit=${limit}`;

  const p = new URLSearchParams();
  p.set('limit', String(limit));
  if (cfg.sort) p.set('sort', cfg.sort);
  if (cfg.gender) p.set('gender', cfg.gender);

  switch (cfg.source) {
    case 'bestSeller': p.set('bestSeller', 'true'); break;
    case 'sale':       p.set('sale', 'true'); break;
    case 'newest':     p.set('sort', 'newest'); break;
    case 'category':   if (cfg.categorySlug) p.set('category', cfg.categorySlug); break;
    case 'manual':     if (cfg.productIds?.length) p.set('ids', cfg.productIds.join(',')); break;
    case 'featured':
    default:           p.set('featured', 'true'); break;
  }
  return `/products?${p.toString()}`;
}

export default function ProductListSection({ cfg }) {
  const [products, setProducts] = useState(null);

  const url = useMemo(() => queryFor(cfg), [
    cfg.source, cfg.categorySlug, cfg.gender, cfg.sort, cfg.productCount,
    Array.isArray(cfg.productIds) ? cfg.productIds.join(',') : '',
  ]);

  useEffect(() => {
    let alive = true;
    api(url)
      .then((d) => { if (alive) setProducts(d.products || []); })
      .catch(() => { if (alive) setProducts([]); });
    return () => { alive = false; };
  }, [url]);

  if (cfg.enabled === false) return null;

  const cols       = clamp(cfg.columns, 2, 6);
  const mobileCols = clamp(cfg.mobileColumns, 1, 2);
  const gapX       = clamp(cfg.gapX, 0, 64);
  const gapY       = clamp(cfg.gapY, 0, 96);
  const full       = cfg.width === 'full';
  const align      = cfg.headingAlign || 'left';
  const isCarousel = cfg.layout === 'carousel';
  const mobCarousel = !isCarousel && !!cfg.carouselOnMobile;

  const sectionStyle = {
    paddingTop: `${clamp(cfg.paddingTop, 0, 200)}px`,
    paddingBottom: `${clamp(cfg.paddingBottom, 0, 200)}px`,
    ...(cfg.background ? { background: cfg.background } : null),
  };

  const gridStyle = {
    '--ps-cols': cols,
    '--ps-mcols': mobileCols,
    columnGap: `${gapX}px`,
    rowGap: `${gapY}px`,
  };

  const wrap = full ? 'px-4 md:px-8' : 'container-page';

  if (products === null) {
    return (
      <section data-section={cfg.id} style={sectionStyle}>
        <div className={wrap}><ProductGridSkeleton count={Math.min(4, clamp(cfg.productCount, 2, 24))} /></div>
      </section>
    );
  }
  if (!products.length) return null;

  const cards = products.map(snap);
  const card = (p, i) => (
    <ProductCard
      key={p.id || p._id || p.slug || i}
      product={p}
      ratio={RATIO[cfg.imageRatio] || RATIO.portrait}
      showPrice={cfg.showPrice !== false}
      showSaleBadge={cfg.showSaleBadge !== false}
      showQuickAdd={cfg.showQuickAdd !== false}
      showWishlist={cfg.showWishlist !== false}
    />
  );

  const headerAlignCls = align === 'center' ? 'items-center text-center'
    : align === 'right' ? 'items-end text-right' : 'items-start text-left';

  return (
    <section data-section={cfg.id} style={sectionStyle}>
      <div className={wrap}>
        {/* ── Header ───────────────────────────────────────────────────── */}
        {(cfg.heading || cfg.eyebrow || cfg.showViewAll || cfg.note) && (
          <div data-section={`${cfg.id}.header`} className={`mb-6 flex flex-wrap items-end gap-3 ${align === 'center' ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex flex-col ${headerAlignCls}`}>
              {cfg.eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">{cfg.eyebrow}</p>}
              {cfg.heading && <h2 className="mt-1 font-display text-2xl md:text-3xl">{cfg.heading}</h2>}
            </div>
            <div className="flex items-center gap-4">
              {cfg.note && <p className="hidden text-xs uppercase tracking-widest text-ash md:block">{cfg.note}</p>}
              {cfg.showViewAll && (
                <Link to={cfg.viewAllHref || '/shop'}
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-obsidian hover:underline">
                  {cfg.viewAllLabel || 'View all'} <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Products ─────────────────────────────────────────────────── */}
        {isCarousel && (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
            style={{ gap: `${gapX}px` }}>
            {cards.map((p, i) => (
              <div key={p.id || p._id || p.slug || i} className="ps-slide shrink-0 snap-start"
                style={{ '--ps-cols': cols, '--ps-gap': `${gapX}px` }}>
                {card(p, i)}
              </div>
            ))}
          </div>
        )}

        {mobCarousel && (
          <>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-2 md:hidden"
              style={{ gap: `${gapX}px` }}>
              {cards.map((p, i) => (
                <div key={p.id || p._id || p.slug || i} className="w-[68%] shrink-0 snap-start">{card(p, i)}</div>
              ))}
            </div>
            <div className="ps-grid hidden md:grid" style={gridStyle}>{cards.map(card)}</div>
          </>
        )}

        {!isCarousel && !mobCarousel && (
          <div className="ps-grid" style={gridStyle}>{cards.map(card)}</div>
        )}
      </div>
    </section>
  );
}

/* Animated wrapper — kept separate so the grid itself stays cheap to re-render */
export function AnimatedProductListSection({ cfg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
    >
      <ProductListSection cfg={cfg} />
    </motion.div>
  );
}
