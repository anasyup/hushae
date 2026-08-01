import { Check } from 'lucide-react';

/* ============================================================================
 * The facet list, shared by the desktop rail and the mobile sheet.
 *
 * Accessibility was the weakest part of the previous panel: the eleven colour
 * swatches were unlabelled buttons, nothing carried aria-pressed, and the
 * groups were unlabelled divs. Each group is now a fieldset with a legend and
 * every control reports its own state.
 * ========================================================================== */

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const TIERS = ['Economy', 'Standard', 'Premium'];
export const BADGES = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Silk-Touch', 'Quick Dry'];
export const FITS = ['Regular', 'Relaxed', 'Slim', 'Seamless'];
export const COLORS = [
  { name: 'Black', hex: '#1A1A1A' }, { name: 'Soft White', hex: '#FFFFFF' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'Nude', hex: '#E3C9B3' }, { name: 'Blush', hex: '#E8C7C8' }, { name: 'Sage', hex: '#8F9C8B' },
  { name: 'Slate', hex: '#6B7280' }, { name: 'Navy', hex: '#1F2A44' }, { name: 'Charcoal', hex: '#3A3A3A' },
  { name: 'Heather Grey', hex: '#9AA0A6' }, { name: 'Olive', hex: '#6B7252' },
];
export const PRICE_BANDS = [
  { key: '0-1000', label: 'Under PKR 1,000', min: '', max: '1000' },
  { key: '1000-2500', label: 'PKR 1,000 – 2,500', min: '1000', max: '2500' },
  { key: '2500-5000', label: 'PKR 2,500 – 5,000', min: '2500', max: '5000' },
  { key: '5000-', label: 'PKR 5,000 +', min: '5000', max: '' },
];

function Group({ title, children }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-3 text-label font-bold uppercase text-ash">{title}</legend>
      {children}
    </fieldset>
  );
}

/* PHASE 9 — the chip shape.
   MEASURED on live: /shop, /women and /men each rendered 30 elements at
   border-radius 9999px. Phase 8 squared the chips on /search, but that page
   uses a DIFFERENT component (components/search/SearchFilters.jsx) — this one,
   which serves every collection page and the mobile sheet, was never touched.
   So the two filter UIs in the same store disagreed with each other and with
   the Phase 4 `rounded-control` token.
   One base string now drives every chip, so the shape cannot drift again. */
const CHIP_BASE = 'rounded-control border text-caption font-semibold transition-colors duration-fast';
const CHIP_OFF  = 'border-line text-ash hover:border-obsidian/40';
const CHIP_ON   = 'border-obsidian bg-obsidian text-alabaster';

export default function FilterPanel({ catList, f, touch = false }) {
  const { get, list, setOne, setMany, toggleMany } = f;
  /* Touch surfaces get 44px targets; the desktop rail can be tighter, but not
     as tight as it was — py-1.5 gave a 32px chip, well under the 36px the
     desktop sort control next to it uses. */
  const chipPad = touch ? 'px-4 py-2.5 min-h-[44px]' : 'px-3.5 py-2 min-h-[36px]';
  const sizePad = touch ? 'min-w-[46px] min-h-[44px]' : 'min-w-10 min-h-[36px] py-2';

  const band = PRICE_BANDS.find((b) => b.min === get('minPrice') && b.max === get('maxPrice'));

  return (
    <div className="space-y-7">
      <Group title="Category">
        {/* The category list arrives from /api/categories after first paint.
            Without a reserved box the group grew from 57px and pushed every
            facet below it down — measured as the whole page's remaining CLS.
            Ten rows is the real catalogue size; the box shrinks to fit if a
            merchant has fewer. */}
        <div className="space-y-1" style={{ minHeight: catList.length ? undefined : `${10 * 36}px` }}>
          {catList.map((c) => {
            const on = get('category') === c.slug;
            return (
              <button
                key={c.slug} type="button" aria-pressed={on}
                onClick={() => setOne('category', on ? '' : c.slug)}
                className={`block w-full rounded-control px-3 text-left text-body-sm transition-colors duration-fast ${touch ? 'py-3' : 'py-2'} ${
                  on ? 'bg-obsidian text-alabaster' : 'text-ink hover:bg-satin/60'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Availability">
        <button
          type="button" aria-pressed={get('availability') === 'in'}
          onClick={() => setOne('availability', get('availability') === 'in' ? '' : 'in')}
          className={`inline-flex items-center gap-2 ${CHIP_BASE} ${chipPad} ${get('availability') === 'in' ? CHIP_ON : CHIP_OFF}`}
        >
          {get('availability') === 'in' && <Check size={12} aria-hidden="true" />} In stock only
        </button>
      </Group>

      <Group title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map((b) => {
            const on = band?.key === b.key;
            return (
              <button
                key={b.key} type="button" aria-pressed={on}
                onClick={() => setMany(on
                  ? { minPrice: '', maxPrice: '' }
                  : { minPrice: b.min, maxPrice: b.max })}
                className={`${CHIP_BASE} ${chipPad} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Tier">
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => {
            const on = list('tier').includes(t);
            return (
              <button
                key={t} type="button" aria-pressed={on} onClick={() => toggleMany('tier', t)}
                className={`${CHIP_BASE} ${chipPad} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => {
            const on = list('size').includes(s);
            return (
              <button
                key={s} type="button" aria-pressed={on} onClick={() => toggleMany('size', s)}
                aria-label={`Size ${s}`}
                className={`${CHIP_BASE} px-2.5 ${sizePad} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Colour">
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => {
            const on = list('color').includes(c.name);
            return (
              <button
                key={c.name} type="button" aria-pressed={on} onClick={() => toggleMany('color', c.name)}
                /* These were unlabelled buttons — a screen reader announced
                   eleven identical "button"s. */
                aria-label={c.name}
                title={c.name}
                /* PHASE 9. Squared with everything else. A circle reads as a
                   UI dot; a square reads as a fabric swatch, which is what it
                   actually is. Scale-on-hover replaced by a ring — a control
                   that grows on hover is the one motion the rest of the store
                   removed in Phase 4. */
                className={`grid place-items-center rounded-control border transition-[box-shadow,border-color] duration-fast ${
                  touch ? 'h-11 w-11' : 'h-8 w-8'
                } ${on ? 'border-transparent ring-2 ring-obsidian ring-offset-2 ring-offset-alabaster' : 'border-line hover:ring-1 hover:ring-obsidian/30'}`}
                style={{ backgroundColor: c.hex }}
              >
                {on && (
                  <Check
                    size={touch ? 15 : 13} strokeWidth={3} aria-hidden="true"
                    className={['#FFFFFF', '#E3C9B3', '#E8C7C8', '#9AA0A6'].includes(c.hex) ? 'text-obsidian' : 'text-white'}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Fit">
        <div className="flex flex-wrap gap-2">
          {FITS.map((t) => {
            const on = list('fit').includes(t);
            return (
              <button
                key={t} type="button" aria-pressed={on} onClick={() => toggleMany('fit', t)}
                className={`${CHIP_BASE} ${chipPad} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Fabric technology">
        <div className="flex flex-wrap gap-2">
          {BADGES.map((bTech) => {
            const on = list('badge').includes(bTech);
            return (
              <button
                key={bTech} type="button" aria-pressed={on} onClick={() => toggleMany('badge', bTech)}
                className={`rounded-control border text-caption font-medium transition-colors duration-fast ${chipPad} ${
                  on ? 'border-sagedeep bg-sage/25 text-sagedeep' : 'border-line text-ash hover:border-sage'
                }`}
              >
                {bTech}
              </button>
            );
          })}
        </div>
      </Group>
    </div>
  );
}
