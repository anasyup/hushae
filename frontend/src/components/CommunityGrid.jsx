import { Link } from 'react-router-dom';
import { ArrowRight, Instagram } from 'lucide-react';
import Img from './Img';

/* ============================================================================
 * COMMUNITY / INSTAGRAM
 *
 * MEASURED BEFORE WRITING THIS
 *   Probing the live home page at 390 and 1440:
 *     /^instagram|@hushae|follow us|community/i  →  NO MATCH anywhere
 *   The home page runs 14 sections and ends trust badges → newsletter. There
 *   is no social proof of a real audience anywhere on the site.
 *
 *   settings.integrations.social.instagram = ""  (measured on /api/settings)
 *   There is no Instagram token, no feed endpoint, and no embed. So this does
 *   NOT pretend to be a live feed — a fake feed is worse than none, and an
 *   embed would ship a third-party script through a CSP that currently allows
 *   none.
 *
 * WHY THIS IS NOT A 3x3 INSTAGRAM GRID
 *   A uniform square grid is the one layout every Shopify theme already has,
 *   and squares crop garment photography at exactly the wrong ratio. This is
 *   an EDITORIAL mosaic: one tall lead frame carrying the invitation, then a
 *   run of portrait frames. It reads as a magazine spread that happens to link
 *   to Instagram, which is the brief's "not a normal Instagram grid".
 *
 * ASSETS — REUSED, NOTHING NEW
 *   The ten `hushae-*` lifestyle photographs already in public/images/products,
 *   all present in the AVIF manifest. No new file was added to the repo.
 *
 * CLS
 *   Every frame is an explicit aspect ratio, so the boxes are reserved before
 *   any image decodes. The section is below the fold on every viewport, so the
 *   images are lazy — they must never compete with the hero for bandwidth.
 *
 * MERCHANT CONTROL
 *   Handle, heading, blurb and the tiles are all props with defaults, and the
 *   CTA falls back to a plain /about-style link when no Instagram URL is set —
 *   so filling in Settings → Integrations → Social turns the button into a
 *   real profile link with no deploy.
 * ========================================================================== */

/* Chosen for subject variety rather than category coverage: a stack, a fold, a
   hanger, a fanned run. All ten are in the manifest; these six read as a
   spread. */
/* FIVE, not six, and the count is load-bearing.
   MEASURED with six: the lead spans 2 rows and the remaining five flow into
   the other 3 columns — which needs 2 rows, so the fifth tile opened a THIRD
   row and the grid ran to 1,130px with a hole beside the lead. Four trailing
   tiles fill exactly two rows next to a row-span-2 lead. */
const DEFAULT_TILES = [
  { src: '/images/products/hushae-women-sleepwear-fold.jpg', alt: 'Folded HUSHAE sleepwear on linen' },
  { src: '/images/products/hushae-women-bras-stack.jpg', alt: 'A stack of HUSHAE bras' },
  { src: '/images/products/hushae-men-boxer-trio.jpg', alt: 'Three pairs of HUSHAE boxers' },
  { src: '/images/products/hushae-women-camisole-pair.jpg', alt: 'A pair of HUSHAE camisoles' },
  { src: '/images/products/hushae-men-briefs-stack.jpg', alt: 'A stack of HUSHAE briefs' },
];

export default function CommunityGrid({
  handle = '@hushae.pk',
  href = '',
  eyebrow = 'The community',
  title = 'Worn quietly, everywhere',
  blurb = 'Real wardrobes across Pakistan. Tag us and your fit may appear here.',
  tiles = DEFAULT_TILES,
}) {
  const external = Boolean(href);
  const list = tiles.slice(0, 5);
  const [lead, ...rest] = list;
  if (!lead) return null;

  /* An external profile opens in a new tab and says so; with no handle
     configured the CTA stays in-app and points at the shop rather than
     dead-ending on a link the merchant has not set up yet. */
  const cta = external
    ? {
      as: 'a',
      props: {
        href,
        target: '_blank',
        rel: 'noreferrer noopener',
        'aria-label': `Follow HUSHAE on Instagram, ${handle} (opens in a new tab)`,
      },
      label: `Follow ${handle}`,
    }
    : {
      as: Link,
      /* NO aria-label. MEASURED: Lighthouse flagged
         label-content-name-mismatch because the visible text read "Shop the
         edit" while the accessible name was "Shop the HUSHAE edit" — WCAG
         2.5.3 requires the accessible name to CONTAIN the visible label, and
         voice-control users say what they see. The link text is already a
         complete, unambiguous name, so the attribute was pure harm.
         The external branch keeps its aria-label because that one leads with
         the visible words "Follow @handle" and only adds the new-tab warning. */
      props: { to: '/shop' },
      label: 'Shop the edit',
    };
  const Cta = cta.as;

  return (
    /* V2.1. MEASURED: 80px top gap. The page's rhythm scale is 72 / 120 / 176
       (ed-sm / ed-md / ed-lg) and 80 is on none of them — it was a raw mt-20
       left over from before the scale existed. This is a movement change
       (testimonials to photography), so it takes ed-md. */
    <section aria-labelledby="community-title" className="container-page mt-ed-sm md:mt-ed-md">
      {/* Header sits left, matching every other section header on this page
          rather than inventing a centred variant. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <p className="text-label uppercase tracking-[0.24em] text-sagedeep">{eyebrow}</p>
          <h2 id="community-title" className="mt-1.5 font-display text-obsidian" style={{ fontSize: 'clamp(1.5rem, 4.81vw - 1.577rem, 2.75rem)' }}>{title}</h2>
          <p className="mt-2 text-body-sm leading-relaxed text-ash">{blurb}</p>
        </div>

        <Cta
          {...cta.props}
          className="btn btn-outline shrink-0 gap-2"
        >
          <Instagram size={15} strokeWidth={1.7} aria-hidden="true" />
          {cta.label}
          {external
            ? <ArrowRight size={14} aria-hidden="true" />
            : <ArrowRight size={14} aria-hidden="true" />}
        </Cta>
      </div>

      {/* ── The mosaic ──────────────────────────────────────────────────────
          Mobile: the lead frame full width, then a two-up run. A six-across
          strip on a 390px phone would render 60px thumbnails — unreadable, and
          six wasted requests.
          md and up: the lead spans two rows on the left, the rest flow beside
          it. Grid areas, not absolute positioning, so nothing can overlap when
          a tile is missing. */}
      {/* MEASURED twice before settling on this.
          Six tiles in 4 columns left a hole and a third row (grid 1,130px).
          Five tiles with a 1-column row-span-2 lead squeezed the lead to a
          397x1005 slot — a 0.40 ratio, a letterbox on its side.
          Four columns, lead spanning 2x2, four portraits filling the rest:
          the lead lands near 1/1 and every other frame keeps its 4/5 crop. */}
      {/* V2.1. MEASURED at 1440: gutters were 12px between 311px frames — a
          3.8% ratio. That is a contact sheet: the photographs touch, so they
          read as one texture rather than five separate moments. Every other
          composition on this page breathes at 24-32px.
          Opened to 16/20/24px with the shell. The frames and the 2x2 lead are
          unchanged; only the air between them moves.

          1. Better: five photographs read as five, not as a tiled surface.
          2. HUSHAE: the page already spaces its plates this way — this section
             was the one exception.
          3. Not a copy: values come from our own gap-* scale. */}
      <div className="mt-7 grid grid-cols-2 gap-3 md:mt-9 md:grid-cols-4 md:gap-4 xl:gap-5 2xl:gap-6">
        <Frame tile={lead} lead className="col-span-2 md:row-span-2" ratio="aspect-[4/5] md:h-full md:aspect-auto" />
        {rest.map((t) => (
          <Frame key={t.src} tile={t} ratio="aspect-[4/5]" />
        ))}
      </div>
    </section>
  );
}

/* One frame. Kept in this file rather than exported: it has no meaning outside
   the mosaic and a second importable component would be the duplication the
   brief warns about. */
function Frame({ tile, className = '', ratio = 'aspect-[4/5]', lead = false }) {
  return (
    <figure className={`group relative overflow-hidden rounded-card bg-cream ${className}`}>
      <div className={ratio}>
        <Img
          src={tile.src}
          alt={tile.alt}
          /* MEASURED rendered widths: the lead is 358 CSS px on a 390 phone and
             ~400 from md; the small frames are 174 and ~295. `lead` gets its
             own string because a shared 25vw promised the browser 295px for a
             frame that renders 400 — the same wrong-sizes upscale caught on
             the product gallery in C1. */
          sizes={lead ? '(max-width: 767px) 92vw, 46vw' : '(max-width: 767px) 48vw, 24vw'}
          className="h-full w-full object-cover transition-transform duration-slow ease-standard group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      {/* A wash on hover only — the photographs carry the section, and a
          permanent overlay would flatten them. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-obsidian/0 transition-colors duration-base ease-standard group-hover:bg-obsidian/5 motion-reduce:transition-none"
      />
    </figure>
  );
}
