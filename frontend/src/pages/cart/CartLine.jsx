import { Link } from 'react-router-dom';
import { AlertCircle, BookmarkPlus, Heart, Truck, Trash2, Check } from 'lucide-react';
import Img from '../../components/Img';
import QuantityStepper from '../../components/ui/QuantityStepper';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

/* ============================================================================
 * HUSHAE CartLine — Ultra-Luxury Shopping Bag Line Row (Calvin Klein / The Row)
 * ========================================================================== */

const STATUS = {
  oos: { tone: 'bad', label: 'Out of stock', help: 'This piece has sold out. Remove it to proceed.' },
  unavailable: { tone: 'bad', label: 'No longer available', help: 'This piece is no longer available. Remove it to proceed.' },
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
  const onSale = line.onSale === true;

  const thumb = (
    <Link
      to={`/product/${line.slug}`}
      className={`group relative block aspect-[3/4] w-24 sm:w-28 md:w-32 shrink-0 rounded-2xl overflow-hidden bg-[#F8F8F8] border border-[#EAEAEA] transition-opacity ${
        blocked ? 'opacity-50' : 'hover:opacity-90'
      }`}
      tabIndex={-1}
      aria-hidden="true"
    >
      <Img
        src={line.image}
        alt=""
        className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
      />
    </Link>
  );

  const details = (
    <div className="min-w-0 flex-1 space-y-1.5">
      <h3 className="text-[15px] sm:text-[16px] font-normal text-[#000000] leading-snug truncate">
        <Link to={`/product/${line.slug}`} className="hover:text-neutral-500 transition-colors">
          {nameOf(line.name)}
        </Link>
      </h3>

      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-light">
        {line.size && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-black">
            Size {line.size}
          </span>
        )}
        {line.color && (
          <span className="text-[11.5px] text-neutral-600">
            {line.color}
          </span>
        )}
      </div>

      {/* Reassurance state */}
      {!blocked && !low && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-light pt-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>In Stock · Dispatched in 24 Hours</span>
        </div>
      )}

      {meta?.label && (
        <p className={`mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
          meta.tone === 'bad' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          <AlertCircle size={10} aria-hidden="true" /> {meta.label}
        </p>
      )}

      {low && (
        <p className="text-[11px] text-amber-700 font-light pt-0.5">
          Only {available} remaining in studio
        </p>
      )}

      {status === 'size-gone' && (
        <p className="text-[11px] text-red-600 font-light">
          <Link to={`/product/${line.slug}`} className="underline underline-offset-2">Choose another size</Link> or remove.
        </p>
      )}

      {/* Desktop understated actions */}
      <div className="hidden md:flex items-center gap-4 text-xs text-neutral-400 font-light pt-1">
        {cfg.saveForLater && !blocked && (
          <button
            type="button"
            onClick={onSave}
            className="hover:text-black transition-colors underline underline-offset-4"
          >
            Save for later
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-red-600 transition-colors underline underline-offset-4"
        >
          Remove
        </button>
      </div>

      {/* Mobile view controls */}
      <div className="mt-3 flex items-center justify-between gap-3 md:hidden pt-2 border-t border-[#F0F0F0]">
        <QuantityStepper
          value={line.qty}
          onChange={onQty}
          min={1}
          max={max}
          size="sm"
          disabled={blocked}
          label={`Quantity for ${line.name}`}
        />

        <span className="text-[15px] font-medium tabular-nums text-[#000000]">
          {pkr(line.price * line.qty)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400 font-light md:hidden">
        {cfg.saveForLater && !blocked && (
          <button
            type="button"
            onClick={onSave}
            className="hover:text-black transition-colors underline underline-offset-4"
          >
            Save for later
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-red-600 transition-colors underline underline-offset-4"
        >
          Remove
        </button>
      </div>
    </div>
  );

  return (
    <li
      className={`grid grid-cols-1 items-start gap-4 py-6 transition-opacity duration-300 md:grid-cols-[minmax(0,1fr)_120px_140px_120px_40px] md:items-center md:gap-4 ${
        removing ? 'opacity-0' : 'opacity-100'
      }`}
      aria-busy={removing || undefined}
    >
      {/* Cell 1: thumb + details */}
      <div className="flex items-start gap-4 sm:gap-5">
        {thumb}
        {details}
      </div>

      {/* Cell 2: Unit Price (Desktop) */}
      <div className="hidden text-[14px] tabular-nums md:block">
        {onSale && line.compareAtPrice > line.price ? (
          <div className="space-y-0.5">
            <span className="font-medium text-[#000000]">{pkr(line.price)}</span>
            <span className="block text-[11px] text-neutral-400 line-through">{pkr(line.compareAtPrice)}</span>
          </div>
        ) : (
          <span className="font-normal text-neutral-800">{pkr(line.price)}</span>
        )}
      </div>

      {/* Cell 3: Quantity Stepper (Desktop) */}
      <div className="hidden md:block">
        <QuantityStepper
          value={line.qty}
          onChange={onQty}
          min={1}
          max={max}
          size="sm"
          disabled={blocked}
          label={`Quantity for ${line.name}`}
        />
      </div>

      {/* Cell 4: Line Total (Desktop) */}
      <div className={`hidden text-right text-[15px] font-medium tabular-nums text-[#000000] md:block ${blocked ? 'opacity-50 line-through' : ''}`}>
        {pkr(line.price * line.qty)}
      </div>

      {/* Cell 5: Delete Icon (Desktop) */}
      <div className="hidden justify-end md:flex">
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          aria-label={`Remove ${line.name} from your bag`}
        >
          <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
