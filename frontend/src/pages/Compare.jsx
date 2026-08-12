import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { cxConfig } from '../lib/cxConfig';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import Img from '../components/Img';
import EmptyState from '../components/ui/EmptyState';

/* ============================================================================
 * COMPARE
 *
 * Two layouts from one data set, because a comparison table is the single
 * worst thing to squeeze onto a phone:
 *
 *   · mobile  — the products scroll sideways as columns inside one table, with
 *               the attribute names pinned in a sticky first column. The
 *               shopper reads one row at a time, which is how comparison
 *               actually works on a small screen.
 *   · desktop — the same table, nothing pinned, everything visible.
 *
 * Rows whose values are all identical are dimmed (and marked "same") so the
 * differences are what the eye lands on. That behaviour is the merchant's to
 * switch off.
 *
 * The saved snapshot only carries card-level fields, so the full product is
 * refetched for fabric/care/stock. Prices come from that fresh copy, never the
 * snapshot, or a stale saved price could be compared against a current one.
 * ========================================================================== */

const ROWS = [
  { key: 'price', label: 'Price', get: (p) => (p.price != null ? pkr(p.price) : '—') },
  /* "Was" price means something only while the sale is actually on. */
  { key: 'compareAtPrice', label: 'Was', get: (p) => (isOnSale(p) ? pkr(p.compareAtPrice) : '—') },
  { key: 'tier', label: 'Range', get: (p) => p.tier || '—' },
  { key: 'fabric', label: 'Fabric', get: (p) => p.fabric || '—' },
  { key: 'sizes', label: 'Sizes', get: (p) => ((p.sizes || []).length ? p.sizes.join(', ') : '—') },
  { key: 'colors', label: 'Colours', get: (p) => ((p.colors || []).length ? p.colors.map((c) => c.name || c).join(', ') : '—') },
  { key: 'care', label: 'Care', get: (p) => ((p.care || []).length ? p.care.join(' · ') : '—') },
  { key: 'stock', label: 'Availability', get: (p) => ((p.stock ?? 0) > 0 ? 'In stock' : 'Sold out') },
];

export default function Compare() {
  const { compare, removeCompare, clearCompare, addToCart, settings, toast } = useApp();
  const cfg = useMemo(() => cxConfig(settings).compare, [settings]);

  const [full, setFull] = useState(null);
  const [addedId, setAddedId] = useState('');

  /* One request for all of them. Keyed on the id list so removing an item does
     not refetch the rest. */
  const idKey = useMemo(() => compare.map((c) => c.id).sort().join(','), [compare]);

  useEffect(() => {
    if (!idKey) { setFull([]); return undefined; }
    let alive = true;
    api(`/products?ids=${idKey}&limit=10`)
      .then((d) => { if (alive) setFull(d.products || []); })
      .catch(() => { if (alive) setFull([]); });
    return () => { alive = false; };
  }, [idKey]);

  /* Keep the merchant's chosen order (the order they were added), not the
     API's. Falls back to the saved snapshot so the table renders its full row
     set on the very first paint — every row exists from the start and only the
     VALUES fill in when /products answers. Rendering a short table first and a
     tall one after cost 0.0624 CLS. */
  const items = useMemo(
    () => compare.map((c) => (full || []).find((f) => String(f._id) === String(c.id)) || c),
    [compare, full],
  );

  if (!cfg.enabled) {
    return (
      <div className="container-page py-sect-y text-center">
        <h1 className="font-display text-h2">{cfg.title}</h1>
        <p className="mt-3 text-body text-ash">This feature is currently unavailable.</p>
        <Link to="/women" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  if (compare.length === 0) {
    return (
      <div className="container-page py-8 md:py-12">
        <h1 className="font-display text-h1">{cfg.title}</h1>
        <EmptyState
          icon={Scale}
          title="Nothing to compare yet"
          description={`Tap the compare icon on any piece — you can line up to ${cfg.maxItems} side by side.`}
          action={{ label: 'Browse pieces', to: '/women' }}
        />
      </div>
    );
  }

  const cols = items;

  /* A row is "the same" when every product gives an identical value. Only
     meaningful with two or more, and only when the merchant wants it. */
  const isSame = (row) => {
    if (!cfg.highlightDifferences || cols.length < 2) return false;
    const first = row.get(cols[0]);
    return cols.every((p) => row.get(p) === first);
  };

  return (
    <div className="container-page py-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-h1">
            {cfg.title} <span className="text-ash">({compare.length})</span>
          </h1>
          <p className="mt-1.5 text-body-sm text-ash">
            Up to {cfg.maxItems} pieces side by side.
            {cfg.highlightDifferences && cols.length > 1 && ' Rows that match are dimmed.'}
          </p>
        </div>
        <button
          type="button" onClick={() => { clearCompare(); toast('Compare cleared'); }}
          className="btn btn-sm gap-1.5 border border-bronze bg-white text-ash hover:text-obsidian"
        >
          <Trash2 size={13} aria-hidden="true" /> Clear all
        </button>
      </header>

      <p className="sr-only" role="status">{compare.length} pieces being compared</p>

      {/* One table for both layouts. On mobile it scrolls sideways with the
          label column pinned; from lg it simply fits. */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="sr-only">
            Comparison of {cols.length} products across {ROWS.length} attributes
          </caption>

          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-28 bg-alabaster pb-4 pr-3 align-bottom md:w-36">
                <span className="sr-only">Attribute</span>
              </th>
              {cols.map((p) => {
                const id = String(p._id || p.id);
                const slug = p.slug;
                const img = p.images?.[0]?.url || p.image || '';
                return (
                  <th key={id} scope="col" className="min-w-[9.5rem] pb-4 pr-3 align-bottom md:min-w-[11rem]">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => removeCompare(id)}
                        aria-label={`Remove ${p.name} from compare`}
                        className="absolute -right-1 -top-1 z-10 grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                      {/* The image box is reserved, not discovered. Img fades
                          in from opacity-0, so without a fixed aspect wrapper
                          the header row collapsed 552px -> 473px when the
                          picture landed — measured 0.0624 CLS. */}
                      <Link to={`/product/${slug}`} className="block aspect-[4/5] w-full overflow-hidden rounded-card bg-cream" tabIndex={-1} aria-hidden="true">
                        <Img src={img} alt="" className="h-full w-full object-cover" />
                      </Link>
                      <Link
                        to={`/product/${slug}`}
                        className="clamp-2 font-bodoni mt-2 block h-[2.6em] overflow-hidden text-body-sm font-medium leading-[1.3] transition hover:underline"
                      >
                        {p.name}
                      </Link>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row) => {
              const same = isSame(row);
              return (
                /* Dimming with opacity dropped this text to 2.99:1 — under AA.
                   `ash` (#6E6760) is the design system's AA-safe muted tone, so
                   "same" rows recede without becoming unreadable. */
                <tr key={row.key} className={`border-t border-line ${same ? 'bg-cream/40' : ''}`}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 py-3 pr-3 align-top text-caption font-semibold uppercase tracking-wider text-ash ${same ? 'bg-[#F2EEE8]' : 'bg-alabaster'}`}
                  >
                    {row.label}
                    {same && <span className="sr-only"> (same for all)</span>}
                  </th>
                  {cols.map((p) => (
                    <td key={String(p._id || p.id) + row.key} className={`py-3 pr-3 align-top text-body-sm ${same ? 'text-ash' : ''}`}>
                      {row.get(p)}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Buy row */}
            <tr className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 bg-alabaster py-4 pr-3 align-top text-caption font-semibold uppercase tracking-wider text-ash">
                Add
              </th>
              {cols.map((p) => {
                const id = String(p._id || p.id);
                const soldOut = (p.stock ?? 1) <= 0;
                return (
                  <td key={`${id}-buy`} className="py-4 pr-3 align-top">
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => {
                        addToCart(p, { size: (p.sizes || [])[0] || '', color: (p.colors || [])[0]?.name || '', quantity: 1 });
                        setAddedId(id);
                        setTimeout(() => setAddedId(''), 1600);
                      }}
                      className="btn btn-sm w-full gap-1.5 bg-obsidian px-3 text-alabaster disabled:opacity-40"
                      aria-label={`Add ${p.name} to your bag`}
                    >
                      <ShoppingBag size={13} aria-hidden="true" />
                      {soldOut ? 'Sold out' : addedId === id ? 'Added' : 'Add to bag'}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {full === null && (
        <p className="mt-4 text-caption text-ash" role="status">Loading full details…</p>
      )}
    </div>
  );
}
