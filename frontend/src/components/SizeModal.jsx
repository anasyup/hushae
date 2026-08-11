import { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';

/* ============================================================================
 * SizeModal — luxury quick-add (exact client reference).
 * Centered: "Quick Selection" header · product snapshot (image + serif title
 * + price) · 5-col size grid · "Add To Cart • {size}" · blur backdrop.
 * Esc / backdrop / × close.
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const nameOf = (p) => titleCase(displayName(p?.name));

export default function SizeModal({ product: p, onClose }) {
  const { addToCart } = useApp();
  const [size, setSize] = useState('');
  const [err, setErr] = useState(false);
  const sizes = p.sizes || [];

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const add = () => {
    if (sizes.length && !size) { setErr(true); return; }
    addToCart(p, size ? { size } : {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-sans">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden border border-neutral-200/80 bg-[#fcfbf9] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Quick selection"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200/60 bg-white px-6 py-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-400">Quick Selection</span>
          <button type="button" onClick={onClose} aria-label="Close modal" className="rounded-full p-1 text-black transition-colors hover:bg-neutral-100">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Product snapshot */}
          <div className="flex items-center gap-4 border-b border-neutral-200/60 pb-4">
            <div className="h-20 w-16 flex-shrink-0 overflow-hidden bg-[#f2f0ec]">
              <img src={p.images?.[0]?.url || p.image || ''} alt={nameOf(p)} className="h-full w-full object-cover" />
            </div>
            <div>
              <h3 className="font-serif text-[13px] font-normal tracking-wide text-[#111111]">{nameOf(p)}</h3>
              <p className="mt-1 text-[12px] font-semibold text-black">{pkr(p.price)}</p>
            </div>
          </div>

          {/* Size selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              <span>Select Size</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sizes.map((s) => {
                const on = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSize(s); setErr(false); }}
                    aria-pressed={on}
                    className={`flex h-11 items-center justify-center text-[11px] font-medium tracking-wider transition-all duration-200 ${
                      on ? 'border border-black bg-black text-white shadow-sm' : 'border border-neutral-200 bg-white text-neutral-800 hover:border-black'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {err && <p className="text-[10px] uppercase tracking-wider text-red-600">Please select a size first.</p>}
          </div>

          {/* Action */}
          <button
            type="button"
            onClick={add}
            className="flex w-full items-center justify-center gap-2 bg-black py-4 text-[10px] font-medium uppercase tracking-[0.25em] text-white shadow-md transition-all duration-300 hover:bg-neutral-800"
          >
            <span>Add To Cart{size ? ` • ${size}` : ''}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
