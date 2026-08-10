import { Link } from 'react-router-dom';
import { AlertCircle, BookmarkPlus, Heart, Truck, X } from 'lucide-react';
import Img from '../../components/Img';
import QuantityStepper from '../../components/ui/QuantityStepper';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';

/* QA — brand name lives in the header; strip it from bag names. */
const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

/* ============================================================================
 * One line in the bag — Winterella register.
 *
 * Desktop: 5-column grid — [small thumb + name] [price] [qty] [total] [x]
 * The thumbnail is small (96px) — product text is the primary signal.
 * Mobile: small thumb + name, qty/price row, actions below.
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
  const onSale = line.onSale === true;

  const thumb = (
    <Link to={`/product/${line.slug}`}
      className={`group relative block w-[84px] shrink-0 overflow-hidden bg-[#F5F5F5] md:w-[96px] ${blocked ? 'opacity-55' : ''}`}
      tabIndex={-1} aria-hidden="true">
      <Img src={line.image} alt=""
        className="aspect-[3/4] w-full object-cover transition-transform duration-media ease-standard group-hover:scale-[1.02] motion-reduce:transition-none" />
    </Link>
  );

  const details = (
    <div className="min-w-0 flex-1">
      <h3 className="text-[14px] font-medium leading-snug normal-case text-[#111111]">
        <Link to={`/product/${line.slug}`} className="inline-flex min-h-[44px] items-center transition hover:text-[#696969]">
          {nameOf(line.name)}
        </Link>
      </h3>
      <p className="mt-0.5 text-[12px] text-[#696969]">
        {[line.size && `Size ${line.size}`, line.color].filter(Boolean).join(' · ') || '—'}
      </p>

      {meta?.label && (
        <p className={`mt-2 inline-flex w-fit items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${meta.tone === 'bad' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          <AlertCircle size={11} aria-hidden="true" /> {meta.label}
        </p>
      )}
      {low && (
        <p className="mt-2 inline-flex w-fit items-center gap-1.5 bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-amber-800">
          <AlertCircle size={11} aria-hidden="true" /> Only {available} left
        </p>
      )}
      {status === 'size-gone' && (
        <p className="mt-1.5 text-[11px] text-red-700">
          <Link to={`/product/${line.slug}`} className="underline">Choose another size</Link> or remove it.
        </p>
      )}
      {meta?.help && <p className="mt-1.5 text-[11px] text-red-700">{meta.help}</p>}
      {!blocked && !low && cfg.showDelivery && delivery && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#696969]">
          <Truck size={11} aria-hidden="true" /> Arrives {delivery}
        </p>
      )}

      {/* MOBILE: qty + price + actions */}
      <div className="mt-4 flex items-center justify-between gap-3 md:hidden">
        <QuantityStepper value={line.qty} onChange={onQty} min={1} max={max} size="sm" disabled={blocked} label={`Quantity for ${line.name}`} />
        <span className="text-[15px] font-medium tabular-nums text-[#111111]">{pkr(line.price * line.qty)}</span>
      </div>
      <div className="mt-3 flex items-center gap-1 md:hidden">
        {cfg.saveForLater && !blocked && (
          <button type="button" onClick={onSave}
            className="grid h-10 w-10 place-items-center text-[#696969] transition hover:text-[#111111]"
            aria-label={`Save ${line.name} for later`} title="Save for later">
            <BookmarkPlus size={15} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={onWish} aria-pressed={wished}
          className={`grid h-10 w-10 place-items-center transition ${wished ? 'text-[#C9A96E]' : 'text-[#696969] hover:text-[#111111]'}`}
          aria-label={wished ? `Remove ${line.name} from wishlist` : `Add ${line.name} to wishlist`} title="Wishlist">
          <Heart size={15} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <button type="button" onClick={onRemove}
          className="grid h-10 w-10 place-items-center text-[#696969] transition hover:text-[#C41610]"
          aria-label={`Remove ${line.name} from your bag`}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <li
      className={`grid grid-cols-1 items-start gap-5 py-6 transition-opacity duration-300 md:grid-cols-[minmax(0,1fr)_110px_150px_110px_40px] md:items-center md:gap-6 ${removing ? 'opacity-0' : 'opacity-100'}`}
      aria-busy={removing || undefined}
    >
      {/* Cell 1: thumb + details side by side */}
      <div className="flex items-start gap-4">
        {thumb}
        {details}
      </div>

      {/* Cells 2-5 (desktop) */}
      <div className="hidden text-[13px] tabular-nums md:block">
        {onSale && line.compareAtPrice > line.price ? (
          <span className="text-[#C41610]">{pkr(line.price)} <span className="text-[#696969] line-through">{pkr(line.compareAtPrice)}</span></span>
        ) : (
          <span className="text-[#111111]">{pkr(line.price)}</span>
        )}
      </div>
      <div className="hidden md:block">
        <QuantityStepper value={line.qty} onChange={onQty} min={1} max={max} size="sm" disabled={blocked} label={`Quantity for ${line.name}`} />
      </div>
      <div className={`hidden text-right text-[14px] font-medium tabular-nums text-[#111111] md:block ${blocked ? 'opacity-55' : ''}`}>
        {pkr(line.price * line.qty)}
      </div>
      <div className="hidden justify-end md:flex">
        <button type="button" onClick={onRemove}
          className="grid h-10 w-10 place-items-center text-[#696969] transition hover:text-[#C41610]"
          aria-label={`Remove ${line.name} from your bag`}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
