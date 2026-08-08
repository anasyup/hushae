import { Link } from 'react-router-dom';
import { AlertCircle, BookmarkPlus, Heart, Truck, X } from 'lucide-react';
import Img from '../../components/Img';
import QuantityStepper from '../../components/ui/QuantityStepper';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';

/* QA — brand name lives in the header; strip it from bag names. */
const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

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
      className={`grid grid-cols-[80px_minmax(0,1fr)] gap-5 py-5 transition-opacity duration-300 ${removing ? 'opacity-0' : 'opacity-100'}`}
      aria-busy={removing || undefined}
    >
      {/* ---- Image — 80px square, bleeds to the edge ---- */}
      <Link
        to={`/product/${line.slug}`}
        className={`group relative block overflow-hidden bg-sand ${blocked ? 'opacity-55' : ''}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Img
          src={line.image}
          alt=""
          className="aspect-square w-full object-cover transition-transform duration-media ease-standard group-hover:scale-[1.02] motion-reduce:transition-none"
        />
      </Link>

      {/* ---- Detail ---- */}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[13px] font-normal leading-snug normal-case text-charcoal">
              <Link
                to={`/product/${line.slug}`}
                className="inline-flex min-h-[44px] items-center transition hover:text-smoke"
              >
                {nameOf(line.name)}
              </Link>
            </h3>
            <p className="mt-0.5 text-[11px] text-smoke">
              {[line.size && `Size ${line.size}`, line.color].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>

          {/* Remove — X, quiet */}
          <button
            type="button"
            onClick={onRemove}
            className="-mr-1 -mt-1 grid h-10 w-10 shrink-0 place-items-center text-smoke transition hover:text-charcoal"
            aria-label={`Remove ${line.name} from your bag`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* ---- Stock / delivery signal ---- */}
        {meta?.label && (
          <p
            className={`mt-2 inline-flex w-fit items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${
              meta.tone === 'bad' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <AlertCircle size={11} aria-hidden="true" />
            {meta.label}
          </p>
        )}
        {low && (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-amber-800">
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
                className="grid h-10 w-10 shrink-0 place-items-center text-smoke transition hover:text-charcoal"
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
              className={`grid h-10 w-10 shrink-0 place-items-center transition ${
                wished ? 'text-bronze' : 'text-smoke hover:text-charcoal'
              }`}
              aria-label={wished ? `Remove ${line.name} from wishlist` : `Add ${line.name} to wishlist`}
              title="Wishlist"
            >
              <Heart size={15} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          <div className={`text-right ${blocked ? 'opacity-55' : ''}`}>
            <p className="text-[13px] font-medium tabular-nums text-charcoal">{pkr(line.price * line.qty)}</p>
            {line.qty > 1 && <p className="mt-0.5 text-[11px] text-smoke tabular-nums">{pkr(line.price)} each</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
