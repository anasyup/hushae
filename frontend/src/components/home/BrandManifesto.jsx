import { Link } from 'react-router-dom';

/* ============================================================================
 * THE MAISON — brand manifesto (Hermès / Armani register, HUSHAE voice).
 * The one point on the home page where the house speaks instead of selling.
 * Signature: warm skin-tone ground, light tracked-caps headline, a single
 * seam hairline under the line of type.
 * ========================================================================== */

export default function BrandManifesto() {
  return (
    <section className="w-full bg-[#fcfbf9] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1600px]">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400">
            The Maison · Est. Pakistan
          </p>
          <h2 className="mt-7 font-display text-3xl font-light uppercase leading-[1.15] tracking-[0.12em] text-[#111111] md:text-5xl md:leading-[1.12]">
            Second Skin,
            <br />
            First Choice.
          </h2>
          {/* The seam — the house mark: a line that places, never encloses */}
          <div className="mx-auto mt-9 h-px w-14 bg-[#111111]/70" aria-hidden="true" />
          <p className="mx-auto mt-9 max-w-xl text-[15px] font-light leading-[1.9] text-neutral-600">
            The best innerwear is the piece you stop noticing by ten in the morning.
            We cut for that moment — modal that moves, seams that sit flat, elastics
            that hold without pressing. Designed in Pakistan, finished to an
            international standard.
          </p>
          <Link
            to="/about"
            className="mt-10 inline-block border-b border-black/40 pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-[#111111] transition hover:opacity-60"
          >
            Our Standards
          </Link>
        </div>
      </div>
    </section>
  );
}
