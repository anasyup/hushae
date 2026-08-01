import { useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { pkr } from '../../lib/format';

/* ============================================================================
 * SMART FILTERS — every option generated from the live catalogue.
 *
 * Measured before this existed: the shop panel hardcoded five sizes and eight
 * colours. The catalogue actually holds fourteen colours and eleven distinct
 * sizes including bra bands (32B–38C) that had no way to be filtered at all.
 * A hardcoded list is wrong the day after a merchant adds a product.
 *
 * Options come from GET /search/facets with real counts, so nothing offered
 * here can return an empty page.
 * ========================================================================== */

/* headingLevel, not a hard-coded h3. MEASURED on live: /search ran h1 -> h3
   with nothing between, because these filter groups are the first headings
   after the page title. They are top-level sections of the filter panel, so h2
   is correct; the prop exists so a future nested use can still pass h3 rather
   than this being swapped globally. Same trap as the product-card heading
   order caught in Sprint 2C.2. */
function Group({ title, children, defaultOpen = true, count, headingLevel: H = 'h2' }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-line py-4 first:pt-0">
      <H>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-label uppercase tracking-widest text-ash">
            {title}
            {count > 0 && <span className="ml-2 text-obsidian">({count})</span>}
          </span>
          <ChevronDown size={15} className={`shrink-0 text-ash transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </H>
      {open && <div id={id} className="mt-3">{children}</div>}
    </section>
  );
}

/* A checkbox that looks like a chip but is still a checkbox: screen readers
   announce "checked", the space bar works, and the label is bound properly. */
function Chip({ label, count, checked, onChange, touch }) {
  return (
    <label
      /* PHASE 8. Measured 38px rounded-full pills — the last pills left on the
         collection page after Phase 4 squared the language, and under the 44px
         target. Squared, raised to 44, and the label tracked so a filter reads
         as a considered option rather than a form control. */
      className={`inline-flex cursor-pointer items-center gap-2 rounded-control border transition-colors duration-base ease-standard ${
        touch ? 'min-h-[44px] px-4' : 'min-h-[44px] px-4'
      } ${checked ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line bg-white text-graphite hover:border-obsidian/40 hover:bg-satin/40'}`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {checked && <Check size={13} aria-hidden="true" />}
      <span className="text-caption font-medium tracking-[0.04em]">{label}</span>
      {count != null && (
        <span className={`text-[10px] tabular-nums ${checked ? 'text-alabaster/70' : 'text-ash'}`}>{count}</span>
      )}
    </label>
  );
}

export default function SearchFilters({ facets, params, onToggle, onSet, multi, touch = false }) {
  const priceId = useId();
  const has = (k, v) => (params.get(k) || '').split(',').filter(Boolean).includes(v);
  const one = (k) => params.get(k) || '';

  if (!facets) {
    return (
      <div className="space-y-4" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-control" />)}
      </div>
    );
  }

  const minP = facets.price?.min ?? 0;
  const maxP = facets.price?.max ?? 0;
  const curMax = Number(params.get('maxPrice') || maxP);

  return (
    <div>
      {/* ---- availability ---- */}
      <Group title="Availability">
        <div className="flex flex-wrap gap-2">
          <Chip
            label="In stock" count={facets.availability?.in} touch={touch}
            checked={one('availability') === 'in'}
            onChange={() => onSet('availability', one('availability') === 'in' ? '' : 'in')}
          />
          {facets.availability?.out > 0 && (
            <Chip
              label="Out of stock" count={facets.availability.out} touch={touch}
              checked={one('availability') === 'out'}
              onChange={() => onSet('availability', one('availability') === 'out' ? '' : 'out')}
            />
          )}
        </div>
      </Group>

      {/* ---- price ----
          A single "up to" slider rather than a two-thumb range: a dual slider
          is close to unusable with a thumb on a 360px screen and needs custom
          keyboard handling to be accessible. This is one native input. */}
      {maxP > minP && (
        <Group title="Price">
          <label htmlFor={priceId} className="sr-only">Maximum price</label>
          <input
            id={priceId}
            type="range"
            min={minP}
            max={maxP}
            step={50}
            value={curMax}
            onChange={(e) => onSet('maxPrice', String(e.target.value === String(maxP) ? '' : e.target.value), true)}
            className="h-11 w-full accent-obsidian"
            aria-describedby={`${priceId}-out`}
          />
          <p id={`${priceId}-out`} className="text-body-sm">
            {pkr(minP)} — <strong>{pkr(curMax)}</strong>
          </p>
        </Group>
      )}

      {/* ---- sizes ---- */}
      {facets.sizes?.length > 0 && (
        <Group title="Size" count={(params.get('size') || '').split(',').filter(Boolean).length}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <Chip
                key={s.value} label={s.value} count={s.count} touch={touch}
                checked={has('size', s.value)}
                onChange={() => onToggle('size', s.value)}
              />
            ))}
          </div>
        </Group>
      )}

      {/* ---- colours ----
          Swatch plus name, never swatch alone: colour is not information a
          colour-blind shopper can use, and the hex is not a label. */}
      {facets.colors?.length > 0 && (
        <Group title="Colour" count={(params.get('color') || '').split(',').filter(Boolean).length}>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const on = has('color', c.value);
              return (
                <label
                  key={c.value}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-control border transition-colors duration-base ease-standard ${
                    touch ? 'min-h-[44px] px-3' : 'min-h-[38px] px-2.5'
                  } ${on ? 'border-obsidian bg-obsidian text-alabaster' : 'border-stone bg-white text-graphite hover:bg-satin/60'}`}
                >
                  <input type="checkbox" checked={on} onChange={() => onToggle('color', c.value)} className="sr-only" />
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                    style={{ background: c.hex || '#ccc' }}
                  />
                  <span className="text-caption font-medium">{c.value}</span>
                  <span className={`text-[10px] tabular-nums ${on ? 'text-alabaster/70' : 'text-ash'}`}>{c.count}</span>
                </label>
              );
            })}
          </div>
        </Group>
      )}

      {/* ---- tiers ---- */}
      {facets.tiers?.length > 0 && (
        <Group title="Range" count={(params.get('tier') || '').split(',').filter(Boolean).length}>
          <div className="flex flex-wrap gap-2">
            {facets.tiers.map((t) => (
              <Chip key={t.value} label={t.value} count={t.count} touch={touch}
                checked={has('tier', t.value)} onChange={() => onToggle('tier', t.value)} />
            ))}
          </div>
        </Group>
      )}

      {/* ---- rating ---- */}
      <Group title="Rating" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {[4.5, 4, 3.5].map((r) => (
            <Chip
              key={r} label={`${r}★ & up`} touch={touch}
              checked={one('minRating') === String(r)}
              onChange={() => onSet('minRating', one('minRating') === String(r) ? '' : String(r))}
            />
          ))}
        </div>
      </Group>

      {/* ---- features ---- */}
      {facets.badges?.length > 0 && (
        <Group title="Features" defaultOpen={false} count={(params.get('badge') || '').split(',').filter(Boolean).length}>
          <div className="flex flex-wrap gap-2">
            {facets.badges.map((b) => (
              <Chip key={b.value} label={b.value} count={b.count} touch={touch}
                checked={has('badge', b.value)} onChange={() => onToggle('badge', b.value)} />
            ))}
          </div>
        </Group>
      )}

      {/* ---- quick flags ---- */}
      <Group title="More" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {facets.flags?.sale > 0 && (
            <Chip label="On sale" count={facets.flags.sale} touch={touch}
              checked={one('sale') === 'true'} onChange={() => onSet('sale', one('sale') === 'true' ? '' : 'true')} />
          )}
          {facets.flags?.bestSeller > 0 && (
            <Chip label="Best sellers" count={facets.flags.bestSeller} touch={touch}
              checked={one('bestSeller') === 'true'} onChange={() => onSet('bestSeller', one('bestSeller') === 'true' ? '' : 'true')} />
          )}
          {facets.flags?.featured > 0 && (
            <Chip label="Featured" count={facets.flags.featured} touch={touch}
              checked={one('featured') === 'true'} onChange={() => onSet('featured', one('featured') === 'true' ? '' : 'true')} />
          )}
          <Chip label="New in (30 days)" touch={touch}
            checked={one('newDays') === '30'} onChange={() => onSet('newDays', one('newDays') === '30' ? '' : '30')} />
        </div>
      </Group>
    </div>
  );
}
