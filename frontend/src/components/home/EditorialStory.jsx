import { Link } from 'react-router-dom';
import { pictureSources } from '../../lib/responsiveImage';

/* ============================================================================
 * EDITORIAL STORY — the brand chapter.
 *
 * WHY IT EXISTS
 * MEASURED on the live homepage: twelve sections, and every one of them was
 * either selling a product or asking for an action. There was no point on the
 * page where the brand simply SPOKE. That absence is a large part of why the
 * page still read as a store rather than a house — a fashion brand earns its
 * price by telling you what it believes before it tells you what it costs.
 *
 * ARCHITECTURE
 * A full-bleed photograph with the copy set into its lower third, over a
 * bottom-weighted scrim. Deliberately NOT the two-column "image beside text"
 * block this page used to have three of: that layout makes the words compete
 * with the picture for the same horizontal band. Setting type INTO the image
 * makes the photograph the page and the words its caption.
 *
 * The measure is capped at ~46ch. Long-form copy running the full 1,840px
 * shell is unreadable, and a narrow column inside a wide image is exactly the
 * proportion a magazine uses for a standfirst.
 *
 * NO NEW ASSETS — reuses an existing hero photograph from the AVIF manifest.
 * Copy is props, so the merchant can drive it from the CMS later without a
 * component change.
 * ========================================================================== */

export default function EditorialStory({
  image = '/images/hero/editorial-signature.jpg',
  eyebrow = 'The house',
  title = 'Made to be\nforgotten.',
  body = 'The best innerwear is the piece you stop noticing by ten in the morning. We cut for that moment — modal that moves, seams that sit flat, elastics that hold without pressing. Everything else is noise.',
  note = 'Designed and made in Pakistan · finished to an international standard',
  ctaLabel = 'Our standards',
  ctaHref = '/about',
}) {
  return (
    <section
      aria-labelledby="story-title"
      /* Viewport-anchored bleed, not negative margins. `-mx` overshoots
         whenever the container is also centred — measured 40/56/64px of
         overflow growing with the screen when the Diptych first tried it. */
      className="relative mt-ed-md xl:left-1/2 xl:mt-ed-lg xl:w-screen xl:-translate-x-1/2"
    >
      {/* Tall on desktop so the photograph has real presence; a 16/9 band would
          reduce a brand statement to a header image. */}
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] xl:aspect-[21/9] xl:min-h-[620px]">
        <picture>
          {pictureSources(image).map((s) => (
            <source key={s.type} type={s.type} srcSet={s.srcSet} sizes="100vw" />
          ))}
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>

        {/* Bottom-weighted scrim. Strong at the foot where the type sits, clear
            across the upper half so the image is not flattened into a texture. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(17,17,17,0.80) 0%, rgba(17,17,17,0.55) 26%, rgba(17,17,17,0.14) 56%, rgba(17,17,17,0) 100%)',
          }}
        />

        {/* V2.1 — ACCESSIBILITY FIX, measured not assumed.
            At 1440 this photograph is bright exactly where the copy sits.
            Sampling the real ground behind each line of type against ivory:
              eyebrow  1.77:1     h2  3.05:1     body  2.68:1
            All three fail WCAG (4.5 for body, 3.0 for large). The existing
            scrim is weighted to the FOOT, but on the 21/9 desktop crop the
            text block sits in the upper-middle of the frame, so it received
            almost none of it.
            This adds a left-edge wash — the reading column only. It is
            horizontal, so it darkens where the words are without flattening
            the photograph, and it fades out completely by 62% so the subject
            on the right keeps its light.

            1. Better: the copy becomes legible; today it is not.
            2. HUSHAE: the picture is still the page — this protects one
               column rather than dimming the whole image.
            3. Not a copy: it is the same left-edge treatment we already use on
               the hero, applied here because the same problem was measured. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(17,17,17,0.72) 0%, rgba(17,17,17,0.58) 22%, rgba(17,17,17,0.22) 44%, rgba(17,17,17,0) 62%)',
          }}
        />

        {/* Copy on the page grid, so it lines up with every section above and
            below even though the image itself is full-bleed. */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-page pb-10 md:pb-14 xl:pb-20">
            <div className="max-w-[46ch]">
              <p className="text-label uppercase tracking-[0.24em] text-alabaster/75">{eyebrow}</p>
              <h2
                id="story-title"
                className="mt-4 whitespace-pre-line font-display text-display-2 leading-[0.96] text-alabaster"
              >
                {title}
              </h2>
              <p className="mt-5 text-body leading-relaxed text-alabaster/85">{body}</p>
              {note && (
                <p className="mt-5 text-caption uppercase tracking-[0.18em] text-alabaster/60">{note}</p>
              )}
              <Link to={ctaHref} className="cta-image mt-8">
                {ctaLabel}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
