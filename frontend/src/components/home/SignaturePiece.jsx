import { Link } from 'react-router-dom';
import { pictureSources } from '../../lib/responsiveImage';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';
import Seam from './Seam';

/* ============================================================================
 * THE SIGNATURE — one product given the plate, like a house campaign.
 * The best-selling piece is composed as a full-bleed editorial: the
 * photograph owns the frame, the type sits in the quiet corner (tracked
 * caps, light weight). A GSAP parallax keeps the image alive. When no
 * product is loaded it falls back to the campaign still, so the section
 * never collapses.
 * ========================================================================== */

const displayName = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function SignaturePiece({ product }) {
  const img = product?.images?.[0] || '/images/campaign/qa/editorial-modern.jpg';
  const name = displayName(product?.name) || 'The Signature Piece';
  const href = product?.slug ? `/product/${product.slug}` : '/shop';

  return (
    <section className="relative w-full overflow-hidden bg-[#111111]">
      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]">
        {/* Photography — parallax drift */}
        <div className="absolute inset-0" data-parallax="0.08" aria-hidden="true">
          {product?.images?.[0] ? (
            <picture>
              {pictureSources(img).map((s) => (
                <source key={s.type} type={s.type} srcSet={s.srcSet} />
              ))}
              <img
                src={img}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>
          ) : (
            <img
              src={img}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Bottom-weighted scrim — type sits on a quiet ground */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(17,17,17,0.72) 0%, rgba(17,17,17,0.38) 34%, rgba(17,17,17,0.08) 62%, rgba(17,17,17,0) 100%)',
          }}
        />

        {/* Type — the quiet corner */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-[1600px] px-5 pb-12 md:px-10 md:pb-16">
            <div data-reveal className="max-w-xl">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/60">
                The Signature
              </p>
              <h2 className="mt-4 font-display text-2xl font-light uppercase leading-[1.18] tracking-[0.14em] text-white md:text-4xl">
                {name}
              </h2>
              {product && (
                <div className="mt-5 flex items-center gap-4">
                  <span className="text-[15px] font-light tracking-[0.08em] text-white/90">
                    {pkr(product.price)}
                  </span>
                  <Seam className="w-8 text-white/40" />
                  <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-white/50">
                    {product.stock > 0 ? 'In Stock' : 'By Order'}
                  </span>
                </div>
              )}
              <Link
                to={href}
                className="group mt-8 inline-flex items-center gap-3 border-b border-white/50 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:border-white"
              >
                Discover
                <span className="transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
