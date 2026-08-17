import { isOnSale } from './sale';
import { pkr } from './format';

/* ============================================================================
 * PRODUCT-CARD TYPOGRAPHY — the house register (client spec).
 *
 * One source of truth for every product card on the site (grids, rails,
 * PDP related, wishlist, cart recommendations). Rules:
 *
 *   · name     14px / weight 500 / #22335A ink-navy / line-height 1.4
 *              no underline by default — underline only on hover (clickable)
 *   · subtitle 14px / weight 400 / #111111 / line-height 1.4 — material,
 *              collection or attribution line, never a marketing phrase
 *   · price    14px — regular #5B5B5B (weight 400); discounted: strike
 *              #6F6D6A + current #111111 weight 600
 *              (strike was #8A8886 — measured 3.33:1 on the #FAF8F5 page
 *              ground, under the 4.5:1 AA floor. #6F6D6A clears it at 4.7:1
 *              while staying visibly recessive against the #111111 sale price.)
 *   · font     site primary sans only (no serif, no decorative)
 *   · spacing  12px swatches→name · 3px between name/subtitle/price
 *              · 16–20px card padding on all sides
 * ========================================================================== */

export const CARD_NAME = 'text-[14px] font-medium leading-[1.4] text-[#22335A]';
/* Underline only on hover — names are links on cards. */
export const CARD_NAME_LINK = 'transition-colors hover:underline hover:underline-offset-2';
export const CARD_SUBTITLE = 'text-[14px] font-normal leading-[1.4] text-[#111111]';
export const CARD_PRICE_REGULAR = 'text-[14px] font-normal text-[#5B5B5B]';
export const CARD_PRICE_WAS = 'text-[14px] font-normal text-[#6F6D6A] line-through';
export const CARD_PRICE_SALE = 'text-[14px] font-semibold text-[#111111]';
/* Swatch row sits above the name with a 12px gap (mb-3). */
export const CARD_SWATCH_GAP = 'mb-3';

/* Subtitle source: fabric (material) → humanised collection slug.
   Never a marketing phrase — the client spec forbids promo microcopy on cards. */
export function cardSubtitle(p) {
  if (p?.fabric && String(p.fabric).trim()) return String(p.fabric).trim();
  const slug = p?.categorySlug;
  if (slug && String(slug).trim()) {
    return String(slug).split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  }
  return '';
}

/* Price row — one shared renderer so every card discounts identically. */
export function PriceRow({ product: p, soldOut = false }) {
  if (soldOut) return <span className={CARD_PRICE_REGULAR}>Sold out</span>;
  const discounted = isOnSale(p);
  if (!discounted) return <span className={CARD_PRICE_REGULAR}>{pkr(p.price)}</span>;
  return (
    <>
      <span className={CARD_PRICE_WAS}>{pkr(p.compareAtPrice)}</span>
      <span className={CARD_PRICE_SALE}>{pkr(p.price)}</span>
    </>
  );
}

/* Swatch row — sits above the name with a 12px gap (client spec). */
export function SwatchRow({ product: p, onPick }) {
  const colors = (p?.colors || []).filter((c) => c && (c.hex || c.name)).slice(0, 5);
  if (colors.length === 0) return null;
  return (
    /* MEASURED: the swatch buttons were 15x15px — below the WCAG 2.5.8 (AA)
       24px minimum target size, and awkward to hit on a phone. The DOT stays
       15px so the card design is untouched; the BUTTON is now a 24px hit area
       centred on it. Container gap drops to 0 because each button carries its
       own 4.5px of padding, which keeps the visible spacing between dots at
       ~9px, within a hair of the original 7px. */
    <div className={`${CARD_SWATCH_GAP} flex items-center`}>
      {colors.map((c, idx) => (
        <button
          key={`${c.name}-${idx}`}
          type="button"
          title={c.name || c.hex}
          aria-label={c.name || `Colour ${idx + 1}`}
          onClick={(e) => { e.preventDefault(); onPick?.(c, idx, e); }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110"
        >
          <span
            aria-hidden="true"
            className="block h-[15px] w-[15px] rounded-full border border-black/15 shadow-[inset_0_0_0_2px_#fff]"
            style={{ backgroundColor: c.hex || '#EEEEEE' }}
          />
        </button>
      ))}
    </div>
  );
}

