import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, X } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr, snap } from '../lib/format';

/* ============================================================================
 * Bundle Builder — build your own multi-pack.
 *
 * The catalog sells 3-packs and 5-packs. Let shoppers build their own:
 * pick a base style, choose sizes and colours per unit, get tiered pricing.
 * ========================================================================== */

const BUNDLE_TIERS = [
  { qty: 3, label: '3-Pack', discount: 10 },
  { qty: 5, label: '5-Pack', discount: 20 },
  { qty: 8, label: '8-Pack', discount: 30 },
];

export default function BundleBuilder() {
  const { addToCart, toast } = useApp();
  const [cats, setCats] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [products, setProducts] = useState([]);
  const [bundle, setBundle] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCat) { setProducts([]); return; }
    setLoading(true);
    api(`/products?category=${selectedCat}&limit=20`)
      .then((d) => setProducts((d.products || []).map(snap)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [selectedCat]);

  const tiers = BUNDLE_TIERS;
  const currentTier = tiers.find((t) => t.qty === bundle.length) || null;

  const subtotal = bundle.reduce((s, p) => s + (p.price || 0), 0);
  const discount = currentTier ? Math.round(subtotal * (currentTier.discount / 100)) : 0;
  const total = subtotal - discount;

  const add = (product) => {
    setBundle((b) => [...b, product]);
    toast(`Added ${product.name}`);
  };

  const remove = (idx) => {
    setBundle((b) => b.filter((_, i) => i !== idx));
  };

  const sizes = bundle.map((p) => p.sizes?.[0] || 'M');
  const unified = sizes.every((s) => s === sizes[0]) ? sizes[0] : 'Mixed';

  const buyAll = () => {
    bundle.forEach((p) => addToCart(p, { size: p.sizes?.[0] || 'M', quantity: 1 }));
    toast(`Added ${bundle.length} items to your bag`);
  };

  return (
    <div style={{ background: '#FFFFFF' }}>
      <div className="container section pt-[130px]">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Bundle & save</p>
          <h1 className="mt-2 h1">Build your pack</h1>
          <p className="mt-3 body-sm text-ash max-w-lg">
            Pick {tiers[0].qty} or more pieces from the same category and save up to {tiers[tiers.length - 1].discount}%.
          </p>
        </div>

        {/* Tier indicator */}
        <div className="mb-8 flex items-center gap-4 border-b border-line pb-4">
          {tiers.map((t, i) => {
            const reached = bundle.length >= t.qty;
            const next = !reached && (i === 0 || bundle.length >= tiers[i - 1].qty);
            return (
              <div key={t.qty} className="flex items-center gap-3">
                {i > 0 && <div className={`h-px w-6 ${bundle.length >= tiers[i - 1].qty ? 'bg-obsidian' : 'bg-line'}`} />}
                <span className={`text-[12px] font-medium uppercase tracking-[0.10em] ${reached ? 'text-obsidian' : next ? 'text-obsidian' : 'text-line'}`}>
                  {t.label} <span className="text-[10px]">({t.discount}% off)</span>
                </span>
              </div>
            );
          })}
          <span className="ml-auto text-[13px] tabular-nums text-ash">{bundle.length}/{tiers[tiers.length - 1].qty}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr_280px]">
          {/* Category selector */}
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.10em] text-ash">Category</p>
            <div className="space-y-1">
              {cats.slice(0, 12).map((c) => (
                <button key={c.slug} onClick={() => { setSelectedCat(c.slug); setBundle([]); }}
                  className={`block w-full px-3 py-2.5 text-left text-[13px] transition-colors ${selectedCat === c.slug ? 'bg-obsidian text-white' : 'text-obsidian hover:bg-line'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div>
            {loading && <p className="py-8 text-center text-[13px] text-ash">Loading...</p>}
            {!loading && !selectedCat && (
              <p className="py-16 text-center text-[13px] text-ash">Select a category to browse products.</p>
            )}
            {!loading && products.length > 0 && (
              <div className="grid grid-cols-2 gap-[2px] sm:grid-cols-3">
                {products.slice(0, 15).map((p) => (
                  <button key={p._id} onClick={() => add(p)}
                    className="product-tile group relative text-left">
                    <img src={p.image || p.images?.[0]?.url} alt={p.name} className="w-full aspect-[4/5] object-cover bg-line" />
                    <div className="absolute inset-0 flex items-center justify-center bg-obsidian/0 opacity-0 transition-all duration-300 group-hover:bg-obsidian/50 group-hover:opacity-100">
                      <Plus size={24} className="text-white" />
                    </div>
                    <div className="mt-2 px-0">
                      <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-obsidian leading-snug">{p.name}</p>
                      <p className="mt-0.5 text-[12px] tabular-nums text-ash">{pkr(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bundle summary */}
          <div className="border border-line p-5" style={{ alignSelf: 'start', position: 'sticky', top: '100px' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Your bundle</p>
            {bundle.length === 0 ? (
              <p className="mt-4 text-[13px] text-ash">Click products to add them.</p>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  {bundle.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[12px] font-medium tabular-nums text-ash">{i + 1}.</span>
                      <span className="flex-1 text-[12px] font-medium uppercase tracking-[0.04em] text-obsidian truncate">{p.name}</span>
                      <span className="text-[12px] tabular-nums text-ash">{pkr(p.price)}</span>
                      <button onClick={() => remove(i)} className="text-ash hover:text-obsidian"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-line pt-4">
                  <div className="flex justify-between text-[12px]"><span className="text-ash">Subtotal</span><span className="tabular-nums">{pkr(subtotal)}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[12px]"><span className="text-obsidian font-medium">Bundle discount ({currentTier?.discount}%)</span><span className="tabular-nums text-obsidian">−{pkr(discount)}</span></div>
                  )}
                  <div className="flex justify-between text-[14px] font-medium pt-2 border-t border-line"><span>Total</span><span className="tabular-nums">{pkr(total)}</span></div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] text-ash">Sizes: <span className="font-medium text-obsidian">{unified}</span></p>
                  <button onClick={buyAll}
                    className="w-full min-h-[44px] bg-obsidian text-[12px] font-medium uppercase tracking-[0.10em] text-white transition-opacity hover:opacity-80">
                    Add bundle to bag
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {bundle.length === 0 && selectedCat && products.length > 0 && (
          <p className="mt-4 text-center text-[13px] text-ash">Click any product to start building your bundle.</p>
        )}
      </div>
    </div>
  );
}
