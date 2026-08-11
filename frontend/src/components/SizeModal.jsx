import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';

/* ============================================================================
 * SizeModal — exact client reference ("Fashion Product Grid").
 * Centered modal: Select Size · product name · 4-col size grid · price ·
 * ADD TO CART · inline error when no size picked. Esc / backdrop / × close.
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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Select size"
    >
      <div className="w-full max-w-[400px] translate-y-[15px] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="text-[16px] font-bold">Select Size</div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[23px] leading-none text-black">×</button>
        </div>

        <p className="mb-5 text-[14px] font-medium text-black">{nameOf(p)}</p>

        {sizes.length > 0 && (
          <>
            <label className="mb-2 block text-[12px] font-semibold text-black">SIZE</label>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSize(s); setErr(false); }}
                  aria-pressed={size === s}
                  className={`border bg-white py-[11px] text-[12px] text-black transition-colors ${
                    size === s ? 'border-black bg-black text-white' : 'border-[#cccccc] hover:border-black'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mb-[18px] text-[14px] font-semibold text-black">{pkr(p.price)}</p>

        <button
          type="button"
          onClick={add}
          className="w-full bg-black py-3.5 text-[12px] font-bold uppercase tracking-[0.5px] text-white transition-colors hover:bg-[#222222]"
        >
          Add To Cart
        </button>

        {err && <p className="mt-2.5 text-[12px] text-[#d00000]">Please select a size first.</p>}
      </div>
    </div>
  );
}
