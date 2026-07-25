import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, snap } from '../lib/format';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import Tx from '../components/Tx';

/* ============================================================================
 * Shopping bag — with live stock verification.
 * On mount (and whenever cart changes) we fetch fresh product data for every
 * item so we can:
 *   - flag items that are OUT OF STOCK
 *   - flag items whose stock is LESS than the cart qty
 *   - flag items whose selected size is no longer available
 *   - disable the checkout button until issues are resolved
 * ========================================================================== */
export default function Cart() {
  const { cart, updateQty, removeLine, cartSubtotal, settings } = useApp();
  const [suggest, setSuggest] = useState([]);
  const [stockMap, setStockMap] = useState({}); // { productId: { stock, sizes, isActive } }
  const [checking, setChecking] = useState(false);

  const flat = settings?.shippingFlatRate ?? 350;
  const threshold = settings?.freeShippingThreshold ?? 4999;

  /* -------------- Live stock check -------------- */
  useEffect(() => {
    if (cart.length === 0) { setStockMap({}); return; }
    setChecking(true);
    const ids = cart.map((l) => l.id).filter(Boolean).join(',');
    api(`/products?ids=${ids}&limit=50`)
      .then((d) => {
        const map = {};
        (d.products || []).forEach((p) => {
          map[String(p._id)] = {
            stock: p.stock ?? 0,
            sizes: p.sizes || [],
            isActive: p.isActive !== false,
          };
        });
        setStockMap(map);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [cart.length, cart.map((l) => `${l.id}-${l.qty}`).join(',')]); // eslint-disable-line

  /* -------------- Categorize each line -------------- */
  const linesWithStatus = useMemo(() => cart.map((l, i) => {
    const meta = stockMap[String(l.id)];
    // If we haven't loaded stock yet, treat as OK (avoid false negatives)
    if (!meta) return { line: l, index: i, status: 'ok', available: null };
    if (!meta.isActive) return { line: l, index: i, status: 'unavailable', available: 0 };
    if (meta.stock <= 0) return { line: l, index: i, status: 'oos', available: 0 };
    if (l.size && meta.sizes.length && !meta.sizes.includes(l.size)) {
      return { line: l, index: i, status: 'size-gone', available: meta.stock };
    }
    if (l.qty > meta.stock) return { line: l, index: i, status: 'low', available: meta.stock };
    return { line: l, index: i, status: 'ok', available: meta.stock };
  }), [cart, stockMap]);

  const availableLines = linesWithStatus.filter((x) => x.status === 'ok' || x.status === 'low');
  const problemLines = linesWithStatus.filter((x) => x.status !== 'ok');
  const hasBlockingIssue = linesWithStatus.some((x) => ['oos', 'unavailable', 'size-gone'].includes(x.status));

  // Subtotal recomputed from ONLY available lines (cap qty to available for 'low')
  const effectiveSubtotal = availableLines.reduce((n, { line, status, available }) => {
    const qty = status === 'low' ? Math.min(line.qty, available) : line.qty;
    return n + line.price * qty;
  }, 0);
  const shipping = availableLines.length === 0 ? 0 : effectiveSubtotal >= threshold ? 0 : flat;
  const progress = Math.min(100, (effectiveSubtotal / threshold) * 100);

  // Smart bundle suggestions
  useEffect(() => {
    if (cart.length === 0) return setSuggest([]);
    const inCart = new Set(cart.map((l) => l.slug));
    const need = (cart.some((l) => l.slug.includes('bra') || l.slug.includes('bralette')) && 'panties')
      || (cart.some((l) => /brief|trunk|boxer/.test(l.slug)) && 'vests-undershirts')
      || (cart.some((l) => l.slug.includes('vest') || l.slug.includes('undershirt')) && 'briefs')
      || 'bras';
    api(`/products?category=${need}&limit=8`).then((d) => setSuggest(d.products.filter((p) => !inCart.has(p.slug)).slice(0, 4))).catch(() => {});
  }, [cart]);

  /* -------------- Empty state -------------- */
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

  /* Auto-remove problem lines helper */
  const removeAllProblems = () => {
    // Remove from the highest index down so indices stay stable
    const idxs = problemLines.map((x) => x.index).sort((a, b) => b - a);
    idxs.forEach((i) => removeLine(i));
  };

  /* -------------- Line renderer -------------- */
  const renderLine = ({ line: l, index: i, status, available }) => {
    const isOOS = status === 'oos' || status === 'unavailable';
    const isSizeGone = status === 'size-gone';
    const isLow = status === 'low';

    return (
      <motion.div
        key={`${l.id}-${l.size}-${l.color}`}
        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`card relative flex gap-5 p-4 ${isOOS || isSizeGone ? 'border-red-200 bg-red-50/40' : isLow ? 'border-amber-200 bg-amber-50/40' : ''}`}
      >
        {/* Status ribbon */}
        {(isOOS || isSizeGone || isLow) && (
          <span className={`absolute -top-2 left-4 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isOOS ? 'bg-red-600 text-white'
            : isSizeGone ? 'bg-red-500 text-white'
            : 'bg-amber-500 text-white'
          }`}>
            {isOOS ? <><AlertCircle size={10} /> Out of stock</>
              : isSizeGone ? <><AlertCircle size={10} /> Size unavailable</>
              : <><AlertCircle size={10} /> Only {available} left</>}
          </span>
        )}

        <Link to={`/product/${l.slug}`} className={isOOS ? 'opacity-60' : ''}>
          <Img src={l.image} alt={l.name} className="h-32 w-24 rounded-2xl object-cover" />
        </Link>

        <div className="flex flex-1 flex-col py-1">
          <div className="flex items-start justify-between gap-3">
            <div className={isOOS ? 'opacity-60' : ''}>
              <Link to={`/product/${l.slug}`} className="text-[15px] font-medium leading-snug hover:underline">{l.name}</Link>
              <p className="mt-1 text-xs text-ash">{l.size}{l.color ? ` · ${l.color}` : ''}</p>
              {l.tier && <span className="badge-sage mt-2 !text-[9px]">{l.tier}</span>}
            </div>
            <button onClick={() => removeLine(i)} aria-label="Remove" className="rounded-full p-2 text-ash transition hover:bg-satin/60 hover:text-obsidian"><Trash2 size={16} /></button>
          </div>

          {/* Actionable hint for problem lines */}
          {isOOS && (
            <div className="mt-2 rounded-xl border border-red-200 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-red-800">
              This item is <b>sold out</b> right now. Please remove it to continue — we&apos;ll email you when it&apos;s back.
            </div>
          )}
          {isSizeGone && (
            <div className="mt-2 rounded-xl border border-red-200 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-red-800">
              Size <b>{l.size}</b> is no longer available. <Link to={`/product/${l.slug}`} className="underline">Change size</Link> or remove the item.
            </div>
          )}
          {isLow && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              Only <b>{available}</b> in stock. Your quantity will be reduced at checkout.
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className={`inline-flex items-center rounded-full border border-line ${isOOS || isSizeGone ? 'opacity-40' : ''}`}>
              <button onClick={() => updateQty(i, l.qty - 1)} disabled={isOOS || isSizeGone} className="p-2.5 text-ash hover:text-obsidian disabled:cursor-not-allowed" aria-label="Decrease"><Minus size={13} /></button>
              <span className="min-w-7 text-center text-sm font-semibold">{l.qty}</span>
              <button onClick={() => updateQty(i, l.qty + 1)} disabled={isOOS || isSizeGone || (isLow && l.qty >= available)} className="p-2.5 text-ash hover:text-obsidian disabled:cursor-not-allowed" aria-label="Increase"><Plus size={13} /></button>
            </div>
            <div className={`text-right ${isOOS ? 'opacity-60 line-through' : ''}`}>
              <p className="text-sm font-semibold">{pkr(l.price * l.qty)}</p>
              <p className="text-xs text-ash">{pkr(l.price)} each</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Your Bag <span className="text-ash">({cart.reduce((n, l) => n + l.qty, 0)})</span></h1>
        {checking && <p className="text-[11px] text-ash">Checking availability…</p>}
      </div>

      {/* Global stock issue banner */}
      {problemLines.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-600 text-white">
              <AlertCircle size={16} />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-red-900">
                {problemLines.length} item{problemLines.length === 1 ? ' has' : 's have'} availability issue{problemLines.length === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-red-800">
                Please review the highlighted items below. Out-of-stock items must be removed before checkout.
                {problemLines.some((x) => x.status === 'low') && ' Low-stock quantities will be capped automatically.'}
              </p>
              {hasBlockingIssue && (
                <button
                  onClick={removeAllProblems}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-red-700"
                >
                  <X size={11} /> Remove unavailable items
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Lines */}
        <div className="space-y-6">
          {/* Problem lines first (so customer sees them immediately) */}
          {problemLines.map((x) => renderLine(x))}
          {problemLines.length > 0 && availableLines.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <span className="h-px flex-1 bg-line" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-ash">Available items</p>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
          {availableLines.map((x) => renderLine(x))}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Order summary</p>

            <div className="mt-5">
              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-ash">
                <span>{effectiveSubtotal >= threshold ? 'Free shipping unlocked' : 'Free shipping progress'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-satin">
                <motion.div className="h-full rounded-full bg-sage" animate={{ width: `${progress}%` }} />
              </div>
              {effectiveSubtotal < threshold && effectiveSubtotal > 0 && <p className="mt-2 text-xs text-ash">Add {pkr(threshold - effectiveSubtotal)} more for free shipping</p>}
            </div>

            <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between"><span className="text-ash">Subtotal ({availableLines.length} item{availableLines.length === 1 ? '' : 's'})</span><span className="font-medium">{pkr(effectiveSubtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ash"><Tx k="shipping" /></span><span className={`font-medium ${shipping === 0 ? 'text-sagedeep' : ''}`}>{shipping === 0 ? 'Free' : pkr(shipping)}</span></div>
              <div className="flex justify-between border-t border-line pt-3 text-base"><span className="font-semibold"><Tx k="total" /></span><span className="font-display text-2xl">{pkr(effectiveSubtotal + shipping)}</span></div>
            </div>

            {hasBlockingIssue ? (
              <button
                disabled
                className="mt-6 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-red-100 px-6 py-3.5 text-[13px] font-semibold uppercase tracking-widest text-red-700"
                title="Remove out-of-stock items to proceed"
              >
                <AlertCircle size={14} /> Fix issues to checkout
              </button>
            ) : (
              <Link to="/checkout" className="btn-primary mt-6 w-full"><Tx k="checkout" /></Link>
            )}
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
