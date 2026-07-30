import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import Img from './Img';
import Tx from './Tx';

/* CartDrawer — slide-out mini cart with live stock verification.
 * Same rules as Cart page: OOS items get a red banner and disable checkout.
 */
export default function CartDrawer() {
  const { drawerOpen, setDrawerOpen, cart, updateQty, removeLine, cartSubtotal, settings } = useApp();
  const threshold = settings?.freeShippingThreshold ?? 4999;
  const progress = Math.min(100, (cartSubtotal / threshold) * 100);
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    if (!drawerOpen || cart.length === 0) return;
    const ids = cart.map((l) => l.id).filter(Boolean).join(',');
    api(`/products?ids=${ids}&limit=50`).then((d) => {
      const m = {};
      (d.products || []).forEach((p) => {
        m[String(p._id)] = { stock: p.stock ?? 0, sizes: p.sizes || [], isActive: p.isActive !== false };
      });
      setStockMap(m);
    }).catch(() => {});
  }, [drawerOpen, cart.length]);

  const statusFor = (l) => {
    const m = stockMap[String(l.id)];
    if (!m) return 'ok';
    if (!m.isActive || m.stock <= 0) return 'oos';
    if (l.size && m.sizes.length && !m.sizes.includes(l.size)) return 'size-gone';
    if (l.qty > m.stock) return 'low';
    return 'ok';
  };

  const linesWithStatus = useMemo(() => cart.map((l) => ({ line: l, status: statusFor(l) })), [cart, stockMap]);
  const hasBlockingIssue = linesWithStatus.some((x) => x.status === 'oos' || x.status === 'size-gone');
  const problemCount = linesWithStatus.filter((x) => x.status !== 'ok').length;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-obsidian/30" onClick={() => setDrawerOpen(false)}>
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-alabaster shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-widest"><Tx k="cart" /> ({cart.reduce((n, l) => n + l.qty, 0)})</p>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-satin/60"><X size={18} /></button>
            </div>

            {/* Warning banner when there are stock issues */}
            {problemCount > 0 && (
              <div className="border-b border-red-200 bg-red-50 px-6 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                  <p className="text-[12px] leading-relaxed text-red-800">
                    <b>{problemCount} item{problemCount === 1 ? '' : 's'}</b> {problemCount === 1 ? 'has' : 'have'} a stock issue. Please review below.
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="empty-state-icon h-14 w-14" aria-hidden="true"><ShoppingBag size={22} strokeWidth={1.6} /></span>
                  <p className="mt-4 font-display text-h4">Your bag is empty</p>
                  <p className="mt-1 text-body-sm">Discover pieces that feel like nothing at all.</p>
                  <Link to="/shop" onClick={() => setDrawerOpen(false)} className="btn-primary mt-6">Start Shopping</Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {linesWithStatus.map(({ line: l, status }, i) => {
                    const isOOS = status === 'oos' || status === 'size-gone';
                    const isLow = status === 'low';
                    return (
                      <div key={`${l.id}-${l.size}-${l.color}`} className={`flex gap-4 rounded-xl p-2 ${isOOS ? 'bg-red-50/50 ring-1 ring-red-200' : isLow ? 'bg-amber-50/50 ring-1 ring-amber-200' : ''}`}>
                        <Link to={`/product/${l.slug}`} onClick={() => setDrawerOpen(false)} className={isOOS ? 'opacity-60' : ''}>
                          <Img src={l.image} alt={l.name} className="h-24 w-20 rounded-xl object-cover" />
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`clamp-2 text-sm font-medium leading-snug ${isOOS ? 'opacity-60' : ''}`}>{l.name}</p>
                            <button onClick={() => removeLine(i)} aria-label="Remove" className="text-ash transition hover:text-obsidian"><Trash2 size={15} /></button>
                          </div>
                          <p className="mt-0.5 text-xs text-ash">{l.size}{l.color ? ` · ${l.color}` : ''}</p>

                          {isOOS && <p className="mt-1 text-[10.5px] font-semibold text-red-700">{status === 'size-gone' ? `Size ${l.size} unavailable` : 'Out of stock'}</p>}
                          {isLow && <p className="mt-1 text-[10.5px] font-semibold text-amber-700">Low stock — qty will be capped</p>}

                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className={`inline-flex items-center rounded-full border border-line ${isOOS ? 'opacity-40' : ''}`}>
                              <button onClick={() => updateQty(i, l.qty - 1)} disabled={isOOS} className="p-2 text-ash hover:text-obsidian disabled:cursor-not-allowed" aria-label="Decrease"><Minus size={13} /></button>
                              <span className="min-w-6 text-center text-xs font-semibold">{l.qty}</span>
                              <button onClick={() => updateQty(i, l.qty + 1)} disabled={isOOS} className="p-2 text-ash hover:text-obsidian disabled:cursor-not-allowed" aria-label="Increase"><Plus size={13} /></button>
                            </div>
                            <p className={`text-sm font-semibold ${isOOS ? 'line-through opacity-60' : ''}`}>{pkr(l.price * l.qty)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-line px-6 py-5">
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-ash">
                    <span>{cartSubtotal >= threshold ? 'Free shipping unlocked' : 'Free shipping progress'}</span>
                    <span>{pkr(Math.min(cartSubtotal, threshold))} / {pkr(threshold)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-satin">
                    <motion.div className="h-full rounded-full bg-sage" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  {cartSubtotal < threshold && <p className="mt-2 text-xs text-ash">{pkr(threshold - cartSubtotal)} away from free shipping</p>}
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ash"><Tx k="subtotal" /></span>
                  <span className="font-display text-xl">{pkr(cartSubtotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/cart" onClick={() => setDrawerOpen(false)} className="btn-outline !px-4 !py-3 !text-[11px]">View Bag</Link>
                  {hasBlockingIssue ? (
                    <Link to="/cart" onClick={() => setDrawerOpen(false)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-red-700 hover:bg-red-200">
                      <AlertCircle size={12} /> Fix Issues
                    </Link>
                  ) : (
                    <Link to="/checkout" onClick={() => setDrawerOpen(false)} className="btn-primary !px-4 !py-3 !text-[11px]"><Tx k="checkout" /></Link>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
