import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale, salePercent } from '../lib/sale';

/* Quick view — opens from grid cards. Gallery, size scale, add to bag. */

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');

export default function QuickView({ product: p, onClose }) {
  const { addToCart, inWishlist, toggleWish, toast } = useApp();
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const currentImg = images[imgIdx] || '';
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const off = salePercent(p);
  const wished = inWishlist(p);
  const needsSize = sizes.length > 0;

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const tryAdd = () => {
    if (needsSize && !size) return;
    addToCart(p, { size, quantity: qty });
    setAdded(true);
    setTimeout(onClose, 800);
  };

  const prev = () => setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setImgIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white" onClick={onClose}>
      <div className="flex h-full w-full max-w-6xl flex-col md:flex-row md:h-auto md:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Gallery */}
        <div className="relative flex-1 bg-line flex items-center justify-center" style={{ minHeight: '50vh' }}>
          <img src={failed ? '' : currentImg} alt={p.name}
            onError={() => setFailed(true)}
            className="max-h-full max-w-full object-contain" />
          {images.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center bg-white/90 text-obsidian"><ChevronLeft size={20} /></button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center bg-white/90 text-obsidian"><ChevronRight size={20} /></button>
            </>
          )}
          <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center bg-white/90 text-obsidian"><X size={18} /></button>
        </div>

        {/* Info panel */}
        <div className="flex flex-col justify-center p-6 md:w-[380px] md:p-10 space-y-4 overflow-y-auto">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">{p.gender}</p>
          <h2 className="text-[28px] font-normal uppercase tracking-[0.02em] text-obsidian leading-[1.1]">{p.name}</h2>

          <div className="flex items-baseline gap-2">
            <span className="text-[18px] font-medium tabular-nums text-obsidian">{pkr(p.price)}</span>
            {onSale && <span className="text-[13px] text-ash line-through tabular-nums">{pkr(p.compareAtPrice)}</span>}
          </div>

          {/* Size selector */}
          {needsSize && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.10em] text-ash">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`min-h-[44px] min-w-[48px] border text-[12px] font-medium uppercase tracking-[0.05em] transition-colors ${size === s ? 'border-obsidian bg-obsidian text-white' : 'border-line text-obsidian hover:border-obsidian'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + Add */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-line">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-[44px] w-[44px] place-items-center text-obsidian">−</button>
              <span className="w-10 text-center text-[13px] tabular-nums">{qty}</span>
              <button onClick={() => setQty(Math.min(10, qty + 1))} className="grid h-[44px] w-[44px] place-items-center text-obsidian">+</button>
            </div>
            <button onClick={tryAdd} disabled={soldOut || added}
              className="flex-1 min-h-[44px] bg-obsidian text-[12px] font-medium uppercase tracking-[0.10em] text-white transition-opacity hover:opacity-80 disabled:opacity-40">
              {added ? 'Added ✓' : soldOut ? 'Sold out' : 'Add to bag'}
            </button>
            <button onClick={() => toggleWish(p)}
              className={`grid h-[44px] w-[44px] shrink-0 place-items-center border ${wished ? 'border-obsidian bg-obsidian text-white' : 'border-line text-ash'}`}>
              <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>

          <Link to={`/product/${p.slug}`} onClick={onClose}
            className="text-center text-[12px] font-medium uppercase tracking-[0.10em] text-ash hover:text-obsidian pt-2">
            View full details →
          </Link>
        </div>
      </div>
    </div>
  );
}
