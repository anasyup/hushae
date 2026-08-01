import { Link } from 'react-router-dom';
import { pictureSources, SIZES } from '../../lib/responsiveImage';

/* ============================================================================
 * DIPTYCH — the gendered entry.
 *
 * WHAT IT REPLACES, AND WHY
 * The homepage ran THREE consecutive editorial blocks: a split hero, a "Women
 * highlight" (image right, copy left) and a "Men highlight" (image left, copy
 * right). Measured 1000 + 960 + 960 = 2,920px — nearly three full screens — to
 * communicate one idea: HUSHAE makes innerwear for women and for men.
 *
 * The alternating image-left / image-right pattern is the single most common
 * layout in every ecommerce theme ever shipped. It is also weak: it reads as a
 * list of features, each one asking to be read left-to-right, so the eye never
 * gets a moment of composition.
 *
 * A diptych is how a fashion house presents two halves of a collection: two
 * plates, edge to edge, sharing one horizon, with the type set INSIDE the
 * photograph rather than beside it. One glance carries the whole idea.
 *
 * DESKTOP-FIRST, MOBILE UNCHANGED IN SPIRIT
 * Below md the two plates stack full-width, which is the correct behaviour on
 * a phone and is what the three blocks it replaces already did — so the mobile
 * experience gains brevity without losing anything.
 *
 * NO NEW ASSETS. It reuses the two category photographs already in the AVIF
 * manifest, and the copy comes from props so the merchant can drive it.
 * ========================================================================== */

const PLATES = [
  {
    href: '/women',
    img: '/images/categories/bras.jpg',
    eyebrow: 'For her',
    title: 'Quiet,\nconsidered.',
    body: 'Second-skin bras, briefs and layers cut to disappear under everything.',
  },
  {
    href: '/men',
    img: '/images/categories/briefs.jpg',
    eyebrow: 'For him',
    title: 'Everyday,\nrefined.',
    body: 'The daily rotation — briefs, trunks and base layers built to last.',
  },
];

export default function Diptych({ plates = PLATES }) {
  return (
    /* Full-bleed: breaking the container is the point. An editorial spread that
       stops at a 1,360px column is a card, not a spread. The negative margins
       exactly cancel .container-page's padding at each tier. */
    /* MEASURED BUG in the first attempt: `xl:-mx-10 2xl:-mx-14` assumed the
       only thing between this section and the viewport edge was the container's
       padding. It is not — .container-page is ALSO centred, so above its cap
       there is an auto margin as well, and the negative margin overshot by
       exactly that amount. Overflow measured 40px at 1440, 56 at 1600, 64 at
       1920, growing with the screen, which is the signature of a centring
       margin being ignored.
       `w-screen` + a 50% translate is anchored to the VIEWPORT rather than to
       the parent, so it bleeds correctly at any width and cannot drift. */
    <section
      aria-label="Shop by gender"
      className="mt-ed-md grid grid-cols-1 md:grid-cols-2 xl:relative xl:left-1/2 xl:w-screen xl:-translate-x-1/2"
    >
      {plates.map((pl) => (
        <Link
          key={pl.href}
          to={pl.href}
          className="group relative block overflow-hidden bg-cream focus-visible:outline-none"
        >
          {/* A tall portrait plate. 3/4 on desktop gives the figure room to
              stand; a 16/9 band would crop it to a strip and lose the garment. */}
          <div className="relative aspect-[4/5] w-full md:aspect-[3/4] xl:aspect-[4/5]">
            <picture>
              {pictureSources(pl.img).map((s) => (
                <source key={s.type} type={s.type} srcSet={s.srcSet} sizes="(max-width: 767px) 100vw, 50vw" />
              ))}
              <img
                src={pl.img}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 767px) 100vw, 50vw"
                /* The plate itself moves, not a zoom on the subject: 1.04 over
                   1.2s reads as a slow push-in on film. */
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-standard group-hover:scale-[1.04] motion-reduce:transition-none"
              />
            </picture>

            {/* Vertical scrim, weighted to the foot where the type sits. Strong
                enough for AA on ivory type, light enough that the upper two
                thirds of the photograph are untouched. */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(17,17,17,0.72) 0%, rgba(17,17,17,0.42) 28%, rgba(17,17,17,0.06) 58%, rgba(17,17,17,0) 100%)',
              }}
            />

            {/* Type sits IN the plate, bottom-left, on the page grid. */}
            <div className="absolute inset-x-0 bottom-0 p-7 md:p-10 xl:p-14">
              <p className="text-label uppercase tracking-[0.24em] text-alabaster/80">{pl.eyebrow}</p>
              <h2 className="mt-3 whitespace-pre-line font-display text-h1 leading-[0.98] text-alabaster">
                {pl.title}
              </h2>
              <p className="mt-3 max-w-sm text-body-sm leading-relaxed text-alabaster/85">
                {pl.body}
              </p>
              {/* Rendered as a span, not a link: the whole plate is already the
                  link, and a nested anchor would be invalid and would give a
                  screen reader two targets for one destination. */}
              <span className="cta-image mt-6 inline-flex group-hover:after:scale-x-100">
                Explore
                <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
