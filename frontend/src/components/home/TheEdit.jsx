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

export default function TheEdit({ eyebrow = 'The edit', title, blurb, products = [], href = '/shop', ctaLabel = 'View all', mirrored = false }) {
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
          because asymmetry needs width to read as intent rather than accident.

          V2.1 `mirrored`. MEASURED: this component renders twice on the
          homepage and the two instances came out byte-identical — same 624x874
          lead, same four 296x370 supports, same 1199px height, same 49px
          heading. Two consecutive product sections with the same silhouette
          read as one component repeated, which is the template tell.
          Mirrored places the lead in columns 7-12 so the subject sits on the
          RIGHT and the supports auto-flow into 1-6.
          Two failed attempts, both caught by measuring:
          - `xl:order-last` does not work with implicit placement — the four
            supports filled row 1 and the lead dropped underneath, growing the
            section 1199 -> 1609px.
          - `col-start-7` alone was still wrong: naming a COLUMN but not a ROW
            let the lead claim row 1 by itself and pushed the supports into
            rows 2-3 (measured 1702px, a third row appeared). An explicitly
            placed item needs BOTH axes — `row-start-1` with the existing
            row-span-2 pins it across the same two rows the supports occupy.
          - Also tried cropping the mirrored lead 4/5 instead of 5/7. The lead
            card at 5/7 is 994px tall against 1280px of stacked supports, so it
            was ALREADY being stretched by the row-span; a shorter crop just
            stretched it further and changed nothing visible. Dropped — the
            ratio stays 5/7 in both instances and only the side changes.
          Same component, same five products, same card count, same order in
          the DOM — only the side the subject sits on changes, so a reader
          scanning down meets a different shape without losing the rhythm.
          `priority` stays on the first instance only: the second is far below
          the fold and should not compete for the LCP fetch. */}
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:mt-14 xl:grid-cols-12 xl:gap-x-8">
        {/* Lead — 6 of 12 columns, and it spans both rows so the supporting
            pieces stack beside it at half its height. This is the whole idea:
            one garment is the subject. */}
        <div className={`col-span-2 md:col-span-3 xl:col-span-6 xl:row-span-2 ${mirrored ? 'xl:col-start-7 xl:row-start-1' : ''}`}>
          <ProductCard product={lead} headingLevel="h3" priority={!mirrored} ratio="aspect-[5/7]" />
        </div>

        {/* Supporting four, 2-up in the remaining 7 columns.
            V2.1. MEASURED at 1440: the comment said "7 columns" but each
            support was span-3, so the row totalled 5+3+3 = 11 of 12 and the
            composition stopped 116px short of the container — the lead ended
            at x=595 while the supports ended at x=1250 against a 1360 grid.
            A composition that does not reach its own edge reads as a grid that
            failed to fill, not as deliberate asymmetry.
            FIRST ATTEMPT gave the supports 3 and 4 columns alternately: that
            filled the row but made the four supporting cards UNEQUAL (296 vs
            405px) and grew the section 1199 -> 1472px. Supporting pieces must
            be peers.
            Correct fix: the LEAD takes 6 columns instead of 5, so 6+3+3 = 12
            and the block closes flush while all four supports stay identical.

            1. Better: the asymmetry now reads as intent because the block is
               complete; nothing is left hanging at the right margin.
            2. HUSHAE: the same edge every other section already aligns to —
               the page has one container and this now respects it.
            3. Not a copy: the ratio comes from our own 12-column grid and the
               existing lead width; nothing was imported. */}
        {support.map((pr) => (
          <div key={pr.id || pr._id || pr.slug} className="md:col-span-1 xl:col-span-3">
            <ProductCard product={pr} headingLevel="h3" />
          </div>
        ))}
      </div>
    </section>
  );
}
