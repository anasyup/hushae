import { Link } from 'react-router-dom';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';

/* ============================================================================
 * THE SIGNATURE PIECE — one real product given the editorial plate.
 * A composed two-column moment: photography owns the left, the words keep
 * the right quiet. Uses the actual best-selling product (name, price, stock,
 * link) so the section is always true — never a placeholder.
 * ========================================================================== */

const displayName = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function SignaturePiece({ product }) {
  if (!product) return null;
  const img = product.images?.[0]?.url || product.images?.[0];
  const name = displayName(product.name);
  const desc =
    product.shortDescription ||
    'The piece that defines the edit — cut, finished and engineered for a barely-there, second-skin feel.';

  return (
    <section className="w-full bg-[#fcfbf9] px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1600px]">
        {/* Chapter header — a hairline closes the line of type */}
        <header className="flex items-end justify-between border-b border-neutral-200/80 pb-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              The Signature
            </p>
            <h2 className="mt-4 font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">
              One Piece, Perfected
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-2 border-b border-black/30 pb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black sm:inline-flex"
          >
            View the Edit <span aria-hidden="true">&rarr;</span>
          </Link>
        </header>

        <div className="mt-12 grid items-center gap-10 md:grid-cols-12 md:gap-14">
          {/* Photography plate */}
          <div className="md:col-span-7">
            <Link
              to={`/product/${product.slug}`}
              className="group block overflow-hidden bg-[#f2f0ec]"
              tabIndex={-1}
            >
              <img
                src={img}
                alt={name}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </Link>
          </div>

          {/* Quiet type */}
          <div className="md:col-span-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              New Signature
            </p>
            <h3 className="mt-5 font-display text-3xl font-light uppercase leading-[1.2] tracking-[0.12em] text-[#111111] md:text-4xl">
              {name}
            </h3>

            <div className="mt-8 h-px w-12 bg-[#111111]/60" aria-hidden="true" />

            <p className="mt-8 max-w-sm text-[14px] font-light leading-[2] text-neutral-600">{desc}</p>

            <div className="mt-8 flex items-center gap-4">
              <span className="text-[18px] font-light tracking-[0.06em] text-[#111111]">{pkr(product.price)}</span>
              <span className="h-4 w-px bg-neutral-300" aria-hidden="true" />
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                {product.stock > 0 ? 'In Stock' : 'By Order'}
              </span>
            </div>

            <Link
              to={`/product/${product.slug}`}
              className="mt-10 inline-flex items-center justify-center border border-black px-10 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-black hover:text-white"
            >
              Discover the Piece
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
