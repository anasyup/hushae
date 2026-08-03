import { SIZES, pictureSources } from '../../lib/responsiveImage';

/* ============================================================================
 * COLLECTION BANNER
 *
 * MEASURED BEFORE WRITING THIS
 *   Probing /shop, /women, /sale and /search on a 390px viewport:
 *
 *     hasBanner: false   on every single one
 *
 *   Every collection page opened with an eyebrow, an h1 and a sentence on flat
 *   alabaster, then went straight into the product grid. That is the exact
 *   layout a default Shopify collection template produces. Nothing about it is
 *   wrong — it is simply not a fashion house.
 *
 * WHAT THIS IS NOT
 *   Not a hero. A hero competes with the products and pushes the grid below
 *   the fold, which on a 390px phone means a shopper scrolls before seeing a
 *   single garment. Measured: the home hero is 844px tall; this band is 168px
 *   on mobile and 232px from md.
 *
 *   It is a MASTHEAD — the strip a magazine puts above a section. Enough to
 *   establish register and give the typography somewhere to sit, then out of
 *   the way.
 *
 * WHY THE TYPE SITS BOTTOM-LEFT
 *   The artwork is composed with its subject on the right and empty plaster on
 *   the left, the same discipline as the home hero. The title lands in that
 *   negative space rather than on top of the fabric.
 *
 * NO DUPLICATION
 *   Copy comes from the TITLES map Shop.jsx already owns — this takes `title`
 *   and `blurb` as props and invents nothing. Images go through the existing
 *   responsiveImage manifest, so the band is 12 kB as AVIF.
 * ========================================================================== */

const BAND = '/images/collection/band-neutral.jpg';

export default function CollectionBanner({ title, blurb, eyebrow = 'HUSHAE', count, showCount = false }) {
  return (
    <section
      aria-labelledby="collection-title"
      /* PHASE 4. Was a rounded, inset, tinted band — a hero banner. A magazine
         masthead is FULL-BLEED and square: the photograph runs to the paper
         edge and the title sits in it, not on a card above it.
         Breaking out of the container with negative margins rather than moving
         the component: every page that renders it keeps its own layout, and
         mobile keeps the inset card because a full-bleed band on a 390px screen
         has no negative space for the type to live in. */
      className="relative isolate mb-8 overflow-hidden rounded-panel bg-cream md:mb-12 xl:-mx-10 xl:rounded-none 2xl:-mx-14 3xl:-mx-16"
    >
      {/* Fixed aspect on each breakpoint so the band NEVER changes height when
          the image decodes. Sprint 2L measured three different placeholder
          heights and every one of them produced a layout shift. */}
      <div className="relative h-[168px] w-full md:h-[232px] xl:h-[320px] 2xl:h-[380px]">
        <picture className="contents">
          {pictureSources(BAND).map((s) => (
            <source key={s.type} type={s.type} srcSet={s.srcSet} sizes="100vw" />
          ))}
          <img
            src={BAND}
            alt=""
            aria-hidden="true"
            sizes="100vw"
            /* Above the fold on every collection page, so it is the LCP
               candidate here: eager and decoded synchronously, the same
               reasoning as the home hero. */
            loading="eager"
            fetchpriority="high"
            decoding="sync"
            className="absolute inset-0 h-full w-full object-cover object-right"
          />
        </picture>

        {/* Scrim on the reading edge only. The artwork is pale, so this is a
            light-to-transparent wash rather than the dark one the home hero
            needs — the type here is ink, not ivory. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(247,245,241,0.97) 0%, rgba(247,245,241,0.94) 46%, rgba(247,245,241,0.62) 72%, rgba(247,245,241,0.10) 100%)',
          }}
        />

        {/* MEASURED AA FAILURE, and the fix.
            The blurb ran to x=354 of a 390px viewport — straight across the
            folded fabric. Sampling 4,231 background pixels beneath it found
            the darkest at rgb(161,147,131), giving `ash` text 1.86:1 against
            a 4.5:1 requirement.
            The scrim is strongest on the left, so the text column is now
            CONSTRAINED to the region the scrim actually protects rather than
            the scrim being darkened until it hides the artwork. */}
        <div className="relative flex h-full max-w-[68%] flex-col justify-end px-5 pb-5 sm:max-w-[60%] md:max-w-[52%] md:px-9 md:pb-7 xl:max-w-[46%] xl:px-20 xl:pb-12 2xl:px-24 2xl:pb-14">
          <p className="text-label uppercase tracking-[0.22em] text-sagedeep">{eyebrow}</p>
          <h1
            id="collection-title"
            className="mt-1.5 font-display text-h1 leading-[1.06] text-obsidian"
          >
            {title}
          </h1>
          {/* Blurb colour: `ash` measured 3.30:1 over the lightest part of the
              artwork, under the 4.5:1 floor, even after constraining the
              column. Darkening the scrim further would wash the photograph
              out, so the TEXT moved instead — graphite is 8.24:1 on that same
              pixel and still reads a clear step lighter than the obsidian
              headline, so the hierarchy survives. On flat alabaster the
              change is barely perceptible; over the image it is the
              difference between legible and not. */}
          {blurb && (
            <p className="mt-1.5 text-body-sm leading-relaxed text-graphite">
              {blurb}
            </p>
          )}
          {/* MEASURED CLS on /sale: the count arrives with the product fetch,
              so this line appeared AFTER first paint. The band's height is
              locked but its text block is bottom-aligned, so a third line
              pushed the h1 and blurb up 21px — 0.0177 of shift inside a
              component built to have none.
              The row is now always present and only its TEXT is conditional,
              so the box is reserved from the first frame. `showCount` lets a
              caller that will never have a count opt the row out entirely at
              build time rather than reserving space for nothing. */}
          {showCount && (
            <p className="mt-1 min-h-[1.125rem] text-caption tabular-nums text-ash" aria-live="polite">
              {typeof count === 'number' && count > 0
                ? `${count} ${count === 1 ? 'piece' : 'pieces'}`
                : '\u00A0'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
