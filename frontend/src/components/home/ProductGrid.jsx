import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';

/* ============================================================================
 * PRODUCT GRID — a static run of large plates.
 *
 * WHY IT IS NOT A CAROUSEL
 * The homepage carried four horizontal carousels; three have already been
 * replaced by TheEdit compositions. This is the fourth shape the page needs: a
 * plain, generous, STATIC grid for a run of pieces where no single item is the
 * subject.
 *
 * TheEdit answers "here is one piece we chose, and four beside it".
 * This answers "here is what just arrived" — six equals, all visible at once,
 * nothing hidden behind a scrub gesture.
 *
 * Using TheEdit for both would be wrong: its whole point is asymmetry, and
 * asymmetry applied to new arrivals would imply an editor's pick that does not
 * exist.
 *
 * SIZE IS THE POINT
 * Three across a 1,840px shell puts each plate near 570px wide — roughly twice
 * the 316px a Phase 3 collection card renders at. Large photography was the
 * brief; three-up is what delivers it. Two rows of three reads as a spread;
 * six across would be a filmstrip.
 *
 * Reuses ProductCard verbatim, so wishlist, compare, quick add, badges and
 * click analytics all keep working.
 * ========================================================================== */

export default function ProductGrid({
  eyebrow,
  title,
  blurb,
  products = [],
  href = '/shop',
  ctaLabel = 'View all',
  limit = 6,
}) {
  const list = (products || []).filter(Boolean).slice(0, limit);
  if (list.length < 3) return null;

  return (
    <section aria-labelledby="grid-title" className="container-page mt-ed-md xl:mt-ed-lg">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-2xl">
          <p className="text-label uppercase tracking-[0.24em] text-sagedeep">{eyebrow}</p>
          <h2 id="grid-title" className="mt-3 whitespace-pre-line font-display text-h1 leading-[1.02] text-obsidian">
            {title}
          </h2>
          {blurb && <p className="mt-3 max-w-md text-body-sm leading-relaxed text-ash">{blurb}</p>}
        </div>
        <Link to={href} className="cta-editorial shrink-0">
          {ctaLabel}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* 2 up on phones, 3 up from md and never more. The gap widens with the
          shell so the plates keep air around them at 1,840px instead of
          crowding into a contact sheet. */}
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 xl:mt-14 xl:gap-x-8 xl:gap-y-20 2xl:gap-x-10">
        {list.map((pr) => (
          <ProductCard
            key={pr.id || pr._id || pr.slug}
            product={pr}
            headingLevel="h3"
            /* 4/5 rather than the card default: at ~570px wide a taller crop
               gives the garment the room that makes this read as photography
               rather than a thumbnail. */
            ratio="aspect-[4/5]"
          />
        ))}
      </div>
    </section>
  );
}
