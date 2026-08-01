import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';

/* ============================================================================
 * THE EDIT — one composed product statement.
 *
 * WHAT IT REPLACES, AND WHY
 * MEASURED on the live homepage: FOUR horizontal carousels — "Signature
 * Pieces" (623px), "Premium, perfected" (483px), "Best Sellers" (483px) and
 * "Trending Now" (483px). Three of them were the identical component with a
 * different heading, 2,072px of scroll delivering the same interaction three
 * times.
 *
 * A horizontal carousel is a merchandising device, not an editorial one. It
 * says "here is a shelf, please scrub through it". It hides most of its own
 * content behind a gesture, it gives every product exactly equal weight, and
 * four of them in a row is the clearest possible signal that a page was
 * assembled from CMS modules rather than composed.
 *
 * A luxury house does the opposite: it CHOOSES. One piece is given the plate,
 * the rest are set around it in a static grid the eye can take in at once. The
 * asymmetry is the editorial act — a composition has a subject.
 *
 * ARCHITECTURE
 *   desktop  a 12-column field: the lead runs 5 columns and full height, the
 *            supporting four sit 2-up beside it. Nothing scrolls sideways.
 *   mobile   a plain 2-up grid, which is what a phone should do and what the
 *            carousels already degraded to.
 *
 * It reuses ProductCard verbatim — the card redesign, wishlist, compare, quick
 * add, badges and analytics all keep working, because the composition is the
 * thing being redesigned, not the tile.
 * ========================================================================== */

export default function TheEdit({ eyebrow = 'The edit', title, blurb, products = [], href = '/shop', ctaLabel = 'View all' }) {
  const list = (products || []).filter(Boolean);
  if (list.length < 3) return null;

  const [lead, ...rest] = list;
  const support = rest.slice(0, 4);

  return (
    <section aria-labelledby="edit-title" className="container-page mt-ed-md xl:mt-ed-lg">
      {/* Header on the page grid, CTA aligned to the baseline of the title so
          the two read as one line of type rather than a heading plus a button. */}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-2xl">
          <p className="text-label uppercase tracking-[0.24em] text-sagedeep">{eyebrow}</p>
          <h2 id="edit-title" className="mt-3 font-display text-h1 leading-[1.02] text-obsidian">
            {title}
          </h2>
          {blurb && <p className="mt-3 max-w-md text-body-sm leading-relaxed text-ash">{blurb}</p>}
        </div>
        <Link to={href} className="cta-editorial shrink-0">
          {ctaLabel}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* The composition. 12 columns from xl; below that a straightforward grid,
          because asymmetry needs width to read as intent rather than accident. */}
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:mt-14 xl:grid-cols-12 xl:gap-x-8">
        {/* Lead — 5 of 12 columns, and it spans both rows so the supporting
            pieces stack beside it at half its height. This is the whole idea:
            one garment is the subject. */}
        <div className="col-span-2 md:col-span-3 xl:col-span-5 xl:row-span-2">
          <ProductCard product={lead} headingLevel="h3" priority ratio="aspect-[5/7]" />
        </div>

        {/* Supporting four, 2-up in the remaining 7 columns. */}
        {support.map((pr) => (
          <div key={pr.id || pr._id || pr.slug} className="md:col-span-1 xl:col-span-3">
            <ProductCard product={pr} headingLevel="h3" />
          </div>
        ))}
      </div>
    </section>
  );
}
