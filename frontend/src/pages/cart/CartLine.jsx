import { Link } from 'react-router-dom';
import { AlertCircle, BookmarkPlus, Heart, Trash2, Truck } from 'lucide-react';
import Img from '../../components/Img';
import QuantityStepper from '../../components/ui/QuantityStepper';
import { pkr } from '../../lib/format';

/* ============================================================================
 * One line in the bag.
 *
 * Layout is a fixed two-column grid: a locked-width image and a flexible
 * detail column. Locking the image column is what keeps every row exactly the
 * same height regardless of how long the product name is — the same "level
 * rows" rule the product card uses.
 *
 * The row never unmounts itself. Removal is driven by the parent so it can
 * play the collapse animation and offer Undo; this component only reports the
 * intent.
 * ========================================================================== */

const STATUS = {
  oos: { tone: 'bad', label: 'Out of stock', help: 'This piece has just sold out. Remove it to continue.' },
  unavailable: { tone: 'bad', label: 'No longer available', help: 'This piece is no longer sold. Remove it to continue.' },
  'size-gone': { tone: 'bad', label: 'Size unavailable', help: null },
  low: { tone: 'warn', label: null, help: null },
};

export default function CartLine({
  line, status = 'ok', available = null, cfg, delivery,
  onQty, onRemove, onSave, onWish, wished, removing = false,
}) {
  const meta = STATUS[status];
  const blocked = status === 'oos' || status === 'unavailable' || status === 'size-gone';
  const low = status === 'low';
  const max = Math.min(cfg.maxQty, available ?? cfg.maxQty) || 1;

  return (
    <li
      className={`grid grid-cols-[76px_minmax(0,1fr)] gap-4 py-5 transition-opacity duration-300 sm:grid-cols-[100px_minmax(0,1fr)] ${removing ? 'opacity-0' : 'opacity-100'}`}
      aria-busy={removing || undefined}
    >
      {/* ---- Image ---- */}
      <Link
        to={`/product/${line.slug}`}
        className={`group relative block overflow-hidden rounded-card bg-cream ${blocked ? 'opacity-55' : ''}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Img
          src={line.image}
          alt=""
          className="aspect-[4/5] w-full object-cover transition-transform duration-media ease-standard group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </Link>

      {/* ---- Detail ---- */}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-widest text-ash">HUSHAE</p>
            {/* min-h keeps the tap target at 44px even for a one-line title —
                the text stays where it is, only the hit area grows. */}
            <h3 className="text-body font-medium leading-snug">
              <Link
                to={`/product/${line.slug}`}
                className="inline-flex min-h-[44px] items-center transition hover:text-graphite hover:underline"
              >
                {line.name}
              </Link>
            </h3>
            <p className="mt-1.5 text-body-sm text-ash">
              {[line.size && `Size ${line.size}`, line.color].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>

          {/* Remove — 44px target, always reachable */}
          <button
            type="button"
            onClick={onRemove}
            className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
            aria-label={`Remove ${line.name} from your bag`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>

        {/* ---- Stock / delivery signal ---- */}
        {meta?.label && (
          <p
            className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${
              meta.tone === 'bad' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <AlertCircle size={11} aria-hidden="true" />
            {meta.label}
          </p>
        )}
        {low && (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-caption font-semibold text-amber-800">
            <AlertCircle size={11} aria-hidden="true" />
            Only {available} left
          </p>
        )}
        {status === 'size-gone' && (
          <p className="mt-1.5 text-caption text-red-700">
            <Link to={`/product/${line.slug}`} className="underline">Choose another size</Link> or remove it.
          </p>
        )}
        {meta?.help && <p className="mt-1.5 text-caption text-red-700">{meta.help}</p>}
        {!blocked && !low && cfg.showDelivery && delivery && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-caption text-ash">
            <Truck size={11} aria-hidden="true" /> Arrives {delivery}
          </p>
        )}

        {/* ---- Controls ---- */}
        {/* At 320px the stepper + save + wishlist row measured 222px, which
            could not sit beside the price inside a 208px column — it pushed the
            document 22px wide. min-w-0 lets the group shrink and the price
            drops onto its own line instead of overflowing. */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-4">
          <div className="flex min-w-0 items-center gap-0.5">
            <QuantityStepper
              value={line.qty}
              onChange={onQty}
              min={1}
              max={max}
              size="sm"
              disabled={blocked}
              label={`Quantity for ${line.name}`}
            />
            {cfg.saveForLater && !blocked && (
              <button
                type="button"
                onClick={onSave}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
                aria-label={`Save ${line.name} for later`}
                title="Save for later"
              >
                <BookmarkPlus size={15} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onWish}
              aria-pressed={wished}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-satin/60 ${
                wished ? 'text-bronze' : 'text-ash hover:text-obsidian'
              }`}
              aria-label={wished ? `Remove ${line.name} from wishlist` : `Add ${line.name} to wishlist`}
              title="Wishlist"
            >
              <Heart size={15} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          <div className={`text-right ${blocked ? 'opacity-55' : ''}`}>
            <p className="text-body font-semibold tabular-nums">{pkr(line.price * line.qty)}</p>
            {line.qty > 1 && <p className="text-caption text-ash tabular-nums">{pkr(line.price)} each</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
