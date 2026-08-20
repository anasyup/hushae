import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import Img from '../../components/Img';
import QuantityStepper from '../../components/ui/QuantityStepper';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

/* ============================================================================
 * HUSHAE CartLine — Pure Quiet Luxury Manifest Line (The Row / Toteme)
 * ========================================================================== */

export default function CartLine({
  line, status = 'ok', available = null, cfg,
  onQty, onRemove, removing = false,
}) {
  const blocked = status === 'oos' || status === 'unavailable' || status === 'size-gone';
  const max = Math.min(cfg.maxQty, available ?? cfg.maxQty) || 1;
  const onSale = line.onSale === true;

  const thumb = (
    <Link
      to={`/product/${line.slug}`}
      className={`group relative block aspect-[3/4] w-20 sm:w-24 shrink-0 overflow-hidden bg-[#F8F8F8] transition-opacity ${
        blocked ? 'opacity-40' : 'hover:opacity-90'
      }`}
      tabIndex={-1}
      aria-hidden="true"
    >
      <Img
        src={line.image}
        alt=""
        className="h-full w-full object-cover object-center transition-opacity duration-300"
      />
    </Link>
  );

  const details = (
    <div className="min-w-0 flex-1 space-y-1">
      <h3 className="text-sm font-normal text-[#000000] leading-snug truncate">
        <Link to={`/product/${line.slug}`} className="hover:text-neutral-500 transition-colors">
          {nameOf(line.name)}
        </Link>
      </h3>

      <p className="text-xs text-neutral-500 font-light">
        {[line.size && `Size ${line.size}`, line.color].filter(Boolean).join(' · ')}
      </p>

      {blocked && (
        <p className="text-[11px] text-red-600 font-light pt-0.5">
          {status === 'size-gone' ? `Size ${line.size} unavailable` : 'Sold out'}
        </p>
      )}

      {/* Desktop subtle remove action */}
      <div className="hidden md:block pt-1">
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] text-neutral-400 hover:text-black transition-colors underline underline-offset-4"
        >
          Remove
        </button>
      </div>

      {/* Mobile view: stepper & line total */}
      <div className="mt-3 flex items-center justify-between gap-3 md:hidden pt-1">
        <QuantityStepper
          value={line.qty}
          onChange={onQty}
          min={1}
          max={max}
          size="sm"
          disabled={blocked}
          label={`Quantity for ${line.name}`}
        />

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums text-[#000000]">
            {pkr(line.price * line.qty)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-neutral-400 hover:text-black p-1 transition-colors"
            aria-label={`Remove ${line.name}`}
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <li
      className={`grid grid-cols-1 items-start gap-4 py-6 transition-opacity duration-200 md:grid-cols-[minmax(0,1fr)_120px_120px_100px_32px] md:items-center md:gap-6 ${
        removing ? 'opacity-0' : 'opacity-100'
      }`}
      aria-busy={removing || undefined}
    >
      {/* Cell 1: Thumbnail + Details */}
      <div className="flex items-start gap-4 sm:gap-5">
        {thumb}
        {details}
      </div>

      {/* Cell 2: Unit Price (Desktop) */}
      <div className="hidden text-xs text-neutral-600 tabular-nums md:block font-light">
        {onSale && line.compareAtPrice > line.price ? (
          <div className="space-y-0.5">
            <span className="text-black font-normal">{pkr(line.price)}</span>
            <span className="block text-[11px] text-neutral-400 line-through">{pkr(line.compareAtPrice)}</span>
          </div>
        ) : (
          <span>{pkr(line.price)}</span>
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
      <div className={`hidden text-right text-xs font-normal tabular-nums text-[#000000] md:block ${blocked ? 'opacity-40 line-through' : ''}`}>
        {pkr(line.price * line.qty)}
      </div>

      {/* Cell 5: Delete (Desktop) */}
      <div className="hidden justify-end md:flex">
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-300 hover:text-black p-1 transition-colors"
          aria-label={`Remove ${line.name} from your bag`}
        >
          <X size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
