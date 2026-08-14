import { Link } from 'react-router-dom';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';

/* ============================================================================
 * RunwayCard — the "FROM THE RUNWAY" reference card, used on the Sale page.
 *   · bordered grid tile (1px #ddd), 4-up on desktop
 *   · 516px image on #f1f1f1, hover scale 1.025
 *   · vertical 'FROM THE RUNWAY' label (vertical-rl, rotated), top-left
 *   · info: UPPERCASE name (15px semibold), colour dots, and — because this
 *     is the SALE page — the price (bold current + struck original)
 * Whole tile links to the product page. Home/global cards untouched.
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '').toUpperCase();

export default function RunwayCard({ product: p }) {
  if (!p) return null;
  const images = (p.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  const img = images[0] || '';
  const name = displayName(p.name) || 'Untitled';
  const slug = p.slug;
  const onSale = isOnSale(p);
  const colors = (p.colors || []).filter((c) => c && c.hex).slice(0, 4);

  const FALLBACK =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="100%" height="100%" fill="#f1f1f1"/></svg>');

  return (
    <article className="min-w-0 cursor-pointer border-r border-[#ddd] bg-white first:border-l first:border-[#ddd]">
      <Link to={`/product/${slug}`} tabIndex={-1} aria-label={name} className="block">
        {/* Product image */}
        <div className="relative h-[516px] w-full overflow-hidden bg-[#f1f1f1]">
          <img
            src={img || FALLBACK}
            alt={name}
            loading="lazy"
            onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
            className="block h-full w-full object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-[1.025]"
          />

          {/* Vertical label */}
          <span
            className="absolute left-[9px] top-[15px] select-none text-[10px] uppercase tracking-[0.3px] text-[#555]"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            From the Runway
          </span>
        </div>

        {/* Product info */}
        <div className="min-h-[100px] bg-white p-4 pb-[18px] pr-4 pl-4">
          <h2 className="mb-3.5 text-[15px] font-semibold leading-[1.25] text-[#111]">
            {name}
          </h2>

          {/* Colour dots */}
          {colors.length > 0 && (
            <div className="flex items-center gap-[9px]">
              {colors.map((c) => (
                <span
                  key={c.name || c.hex}
                  className="inline-block h-[13px] w-[13px] rounded-full border border-[#aaa]"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Price — sale page essential, kept quiet */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#111]">{pkr(p.price)}</span>
            {onSale && p.compareAtPrice > p.price && (
              <span className="text-[12px] font-normal text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
