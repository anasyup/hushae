import { Link } from 'react-router-dom';
import Seam from './Seam';

/* ============================================================================
 * THE MAISON — brand manifesto (Hermès / Armani register, HUSHAE voice).
 * The one point on the home page where the house speaks instead of selling.
 * Signature: warm skin-tone ground, light tracked-caps headline, an oversized
 * ghost chapter number behind the type, and the seam drawing itself in.
 * ========================================================================== */

export default function BrandManifesto() {
  return (
    <section className="relative w-full overflow-hidden bg-[#fcfbf9] px-4 py-24 md:px-8 md:py-36">
      {/* Ghost chapter number — the quiet editorial mark */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 select-none font-display text-[200px] font-light leading-none tracking-[0.05em] text-[#111111]/[0.045] md:text-[340px]"
      >
        00
      </span>

      <div className="relative mx-auto max-w-4xl text-center">
        <p data-reveal className="text-[11px] font-medium uppercase tracking-[0.32em] text-neutral-400">
          The Maison · Est. Pakistan
        </p>

        <h2
          data-reveal
          data-delay="0.08"
          className="mt-8 font-display text-3xl font-light uppercase leading-[1.18] tracking-[0.12em] text-[#111111] md:text-5xl md:leading-[1.14]"
        >
          Second Skin,
          <br />
          First Choice.
        </h2>

        {/* The seam — the house mark, drawn on scroll */}
        <Seam className="mx-auto mt-10 w-16 text-[#111111]/70" />

        <p
          data-reveal
          data-delay="0.15"
          className="mx-auto mt-10 max-w-xl text-[15px] font-light leading-[1.95] text-neutral-600"
        >
          The best innerwear is the piece you stop noticing by ten in the morning.
          We cut for that moment — modal that moves, seams that sit flat, elastics
          that hold without pressing. Designed in Pakistan, finished to an
          international standard.
        </p>

        <div data-reveal data-delay="0.22" className="mt-12">
          <Link
            to="/about"
            className="group inline-flex items-center gap-3 border-b border-black/40 pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-[#111111] transition-colors hover:border-black"
          >
            Our Standards
            <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
