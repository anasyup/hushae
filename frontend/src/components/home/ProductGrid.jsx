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
      {/* V2.1. MEASURED at 1440: 204px between the end of the blurb and the
          top of the grid. `items-end` pins the CTA to the bottom of a header
          block whose height is set by a two-line 49px title plus a two-line
          blurb, and mt-14 was then added on top of that.
          CORRECTION: re-measured from the right element. The gap from the
          BLURB to the grid is only 40px — my first probe measured from the
          eyebrow and counted the whole header block as dead space. And
          `items-baseline` was worse: it lifted the CTA to y=4465, ABOVE the
          49px title, so the action floated beside the eyebrow. Reverted to
          items-end, which aligns it with the foot of the copy.
          The genuine problem here is the opposite of what I assumed: 40px
          between a 49px title block and its products is too TIGHT, not too
          loose — every other section on this page opens at 56px or more.

          1. Better: the grid gets the same opening interval as its peers.
          2. HUSHAE: content, card count and order are untouched.
          3. Not a copy: the value is our own ed-* rhythm. */}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-2xl">
          <p className="text-label uppercase tracking-[0.24em] text-sagedeep">{eyebrow}</p>
          <h2 id="grid-title" className="mt-3 whitespace-pre-line font-display text-h1 leading-[1.02] text-obsidian">
            {title}
          </h2>
          {blurb && <p className="mt-4 max-w-md text-body-sm leading-[1.6] text-ash">{blurb}</p>}
        </div>
        <Link to={href} className="cta-editorial shrink-0">
          {ctaLabel}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* 2 up on phones, 3 up from md and never more. The gap widens with the
          shell so the plates keep air around them at 1,840px instead of
          crowding into a contact sheet. */}
      <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 xl:mt-16 xl:gap-x-8 xl:gap-y-20 2xl:gap-x-10">
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
