import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, snap } from '../lib/format';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import Tx from '../components/Tx';

export default function Cart() {
  const { cart, updateQty, removeLine, cartSubtotal, settings } = useApp();
  const [suggest, setSuggest] = useState([]);
  const flat = settings?.shippingFlatRate ?? 350;
  const threshold = settings?.freeShippingThreshold ?? 4999;
  const shipping = cart.length === 0 ? 0 : cartSubtotal >= threshold ? 0 : flat;
  const progress = Math.min(100, (cartSubtotal / threshold) * 100);

  // Smart bundle suggestions: based on categories present in cart
  useEffect(() => {
    if (cart.length === 0) return setSuggest([]);
    const inCart = new Set(cart.map((l) => l.slug));
    const need = (cart.some((l) => l.slug.includes('bra') || l.slug.includes('bralette')) && 'panties')
      || (cart.some((l) => /brief|trunk|boxer/.test(l.slug)) && 'vests-undershirts')
      || (cart.some((l) => l.slug.includes('vest') || l.slug.includes('undershirt')) && 'briefs')
      || 'bras';
    api(`/products?category=${need}&limit=8`).then((d) => setSuggest(d.products.filter((p) => !inCart.has(p.slug)).slice(0, 4))).catch(() => {});
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-satin/70 text-ash"><ShoppingBag size={24} /></span>
        <h1 className="mt-6 font-display text-3xl">Your bag is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ash">Beautiful foundations are waiting. Start with our best sellers.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/women" className="btn-primary">Shop Women</Link>
          <Link to="/men" className="btn-outline">Shop Men</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <h1 className="font-display text-4xl">Your Bag <span className="text-ash">({cart.reduce((n, l) => n + l.qty, 0)})</span></h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Lines */}
        <div className="space-y-6">
          {cart.map((l, i) => (
            <motion.div key={`${l.id}-${l.size}-${l.color}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card flex gap-5 p-4">
              <Link to={`/product/${l.slug}`}><Img src={l.image} alt={l.name} className="h-32 w-24 rounded-2xl object-cover" /></Link>
              <div className="flex flex-1 flex-col py-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/product/${l.slug}`} className="text-[15px] font-medium leading-snug hover:underline">{l.name}</Link>
                    <p className="mt-1 text-xs text-ash">{l.size}{l.color ? ` · ${l.color}` : ''}</p>
                    {l.tier && <span className="badge-sage mt-2 !text-[9px]">{l.tier}</span>}
                  </div>
                  <button onClick={() => removeLine(i)} aria-label="Remove" className="rounded-full p-2 text-ash transition hover:bg-satin/60 hover:text-obsidian"><Trash2 size={16} /></button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-full border border-line">
                    <button onClick={() => updateQty(i, l.qty - 1)} className="p-2.5 text-ash hover:text-obsidian" aria-label="Decrease"><Minus size={13} /></button>
                    <span className="min-w-7 text-center text-sm font-semibold">{l.qty}</span>
                    <button onClick={() => updateQty(i, l.qty + 1)} className="p-2.5 text-ash hover:text-obsidian" aria-label="Increase"><Plus size={13} /></button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{pkr(l.price * l.qty)}</p>
                    <p className="text-xs text-ash">{pkr(l.price)} each</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Order summary</p>

            <div className="mt-5">
              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-ash">
                <span>{cartSubtotal >= threshold ? 'Free shipping unlocked' : 'Free shipping progress'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-satin">
                <motion.div className="h-full rounded-full bg-sage" animate={{ width: `${progress}%` }} />
              </div>
              {cartSubtotal < threshold && <p className="mt-2 text-xs text-ash">Add {pkr(threshold - cartSubtotal)} more for free shipping</p>}
            </div>

            <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between"><span className="text-ash"><Tx k="subtotal" /></span><span className="font-medium">{pkr(cartSubtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ash"><Tx k="shipping" /></span><span className={`font-medium ${shipping === 0 ? 'text-sagedeep' : ''}`}>{shipping === 0 ? 'Free' : pkr(shipping)}</span></div>
              <div className="flex justify-between border-t border-line pt-3 text-base"><span className="font-semibold"><Tx k="total" /></span><span className="font-display text-2xl">{pkr(cartSubtotal + shipping)}</span></div>
            </div>

            <Link to="/checkout" className="btn-primary mt-6 w-full"><Tx k="checkout" /></Link>
            <p className="mt-4 text-center text-[11px] uppercase tracking-widest text-ash">Discreet, unmarked packaging on every order</p>
          </div>
        </div>
      </div>

      {/* Smart bundle suggestions */}
      {suggest.length > 0 && (
        <div className="mt-20">
          <ProductRow eyebrow="Complete the set" title="You may also need" products={suggest.map(snap)} />
        </div>
      )}
    </div>
  );
}
