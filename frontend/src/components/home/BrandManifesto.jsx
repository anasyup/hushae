import { Link } from 'react-router-dom';
import { pictureSources } from '../../lib/responsiveImage';
import Seam from './Seam';

/* ============================================================================
 * THE HOUSE — the brand statement, composed like a fashion editorial.
 * Left: photography (responsive AVIF/WebP, subtle parallax drift).
 * Right: the house's words — eyebrow, light tracked-caps headline, a fine
 * seam rule, quiet body copy, an underlined CTA. The composition is
 * deliberately quiet: photography owns the page, the type whispers.
 * ========================================================================== */

export default function BrandManifesto() {
  const img = '/images/hero/editorial-signature.jpg';
  return (
    <section className="w-full bg-[#fcfbf9] px-4 py-20 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
        {/* ── Image plate ─────────────────────────────────────────── */}
        <div data-reveal className="relative aspect-[4/5] overflow-hidden bg-[#f2f0ec]">
          <div className="absolute inset-0" data-parallax="0.08" aria-hidden="true">
            <picture>
              {pictureSources(img).map((s) => (
                <source key={s.type} type={s.type} srcSet={s.srcSet} />
              ))}
              <img
                src={img}
                alt="HUSHAE atelier craftsmanship"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>
          </div>
          {/* Caption chip — the quiet editorial signature */}
          <div className="absolute bottom-5 left-5 bg-white/90 px-4 py-2 backdrop-blur-sm">
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#111111]">
              The Maison · Est. Pakistan
            </p>
          </div>
        </div>

        {/* ── Statement ───────────────────────────────────────────── */}
        <div className="md:pl-2 lg:pl-6">
          <p data-reveal className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            The House
          </p>

          <h2
            data-reveal
            data-delay="0.08"
            className="mt-7 font-display text-3xl font-light uppercase leading-[1.16] tracking-[0.1em] text-[#111111] md:text-4xl lg:text-[42px]"
          >
            Second Skin,
            <br />
            First Choice.
          </h2>

          {/* Fine seam rule — the house mark */}
          <Seam className="mt-9 w-14 text-[#111111]/60" />

          <p
            data-reveal
            data-delay="0.16"
            className="mt-9 max-w-md text-[14px] font-light leading-[2] text-neutral-600"
          >
            The best innerwear is the piece you stop noticing by ten in the morning.
            We cut for that moment — modal that moves, seams that sit flat, elastics
            that hold without pressing. Designed in Pakistan, finished to an
            international standard.
          </p>

          <div data-reveal data-delay="0.24" className="mt-11">
            <Link
              to="/about"
              className="group inline-flex items-center gap-3 border-b border-black/40 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-[#111111] transition-colors duration-300 hover:border-black"
            >
              Our Standards
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
