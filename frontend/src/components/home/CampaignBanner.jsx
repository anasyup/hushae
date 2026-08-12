import { Link } from 'react-router-dom';

/* ============================================================================
 * CAMPAIGN BANNER — the cinematic mid-page beat.
 * A full-bleed campaign photograph with the house headline set in light,
 * widely-tracked caps — the Louis Vuitton register the client approved.
 * One dark moment in the page rhythm; everything else stays quiet and light.
 * ========================================================================== */

export default function CampaignBanner({
  img = '/images/campaign/qa/editorial-modern.jpg',
  eyebrow = 'The Edit',
  title = 'A New\nSilhouette',
  cta = 'Explore the Edit',
  href = '/shop',
}) {
  return (
    <section className="relative w-full overflow-hidden bg-[#111111]">
      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]">
        <img
          src={img}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        {/* Left-weighted scrim — type sits on a quiet ground */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(17,17,17,0.68) 0%, rgba(17,17,17,0.28) 45%, rgba(17,17,17,0.04) 100%)',
          }}
        />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1600px] px-5 md:px-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/70">{eyebrow}</p>
            <h2 className="mt-6 max-w-2xl whitespace-pre-line font-display text-4xl font-light uppercase leading-[1.12] tracking-[0.1em] text-white md:text-6xl">
              {title}
            </h2>
            <Link
              to={href}
              className="group mt-10 inline-flex items-center gap-3 border-b border-white/50 pb-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:border-white"
            >
              {cta}
              <span className="transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden="true">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
