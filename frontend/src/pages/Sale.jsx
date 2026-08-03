import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import { isOnSale, salePercent } from '../lib/sale';
import Tx from '../components/Tx';

const TABS = [
  ['', 'allItems'],
  ['women', 'women'],
  ['men', 'men'],
];

// Dedicated Sale page — biggest discount first, offer hero driven by Settings.
export default function Sale() {
  const { settings, toast } = useApp();
  const [tab, setTab] = useState('');
  const [products, setProducts] = useState(null);

  useEffect(() => {
    setProducts(null);
    const sp = new URLSearchParams({ sale: 'true', limit: '200', sort: 'newest' });
    if (tab) sp.set('gender', tab);
    api(`/products?${sp}`).then((d) => setProducts(d.products)).catch(() => setProducts([]));
  }, [tab]);

  /* v2 — sale windows. The API already filters with the exact same rule, but
     a client-side pass keeps the page honest if a window closes between the
     fetch and the render (a sale that ended at midnight should not still be
     listed at 00:01). */
  const sorted = useMemo(() => {
    const list = [...(products || [])].filter(isOnSale);
    const disc = (p) => salePercent(p);
    list.sort((a, b) => disc(b) - disc(a));
    return list;
  }, [products]);

  const maxDisc = sorted.length ? salePercent(sorted[0]) : 0;
  const offer = settings?.offerBar;

  return (
    <div className="container-page py-8 md:py-10">
      {/* NIK SEN masthead — same quiet register as the other collections */}
      <header className="py-8 md:py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
          HUSHAE — Sale
        </p>
        <h1 className="mt-3 font-display text-3xl md:text-5xl lg:text-6xl font-light uppercase tracking-[0.04em] text-neutral-900 leading-[1.05]">
          Season Sale
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-500">
          {offer?.enabled && offer.messageEn
            ? offer.messageEn
            : 'Quiet luxury, gentler prices — while stock lasts.'}
          {sorted.length > 0 && <span className="text-neutral-400"> · {sorted.length} pieces</span>}
        </p>
      </header>

      {/* Sale sub-tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 pb-5 mb-8">
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-[11px] uppercase tracking-[0.2em] font-medium text-neutral-400">
          <button
            onClick={() => setTab('')}
            className={`hover:text-[#000000] transition-colors ${tab === '' ? 'text-[#000000] underline underline-offset-8 decoration-2' : ''}`}
          >
            All Sale
          </button>
          <button
            onClick={() => setTab('women')}
            className={`hover:text-[#000000] transition-colors ${tab === 'women' ? 'text-[#000000] underline underline-offset-8 decoration-2' : ''}`}
          >
            Women's Sale
          </button>
          <button
            onClick={() => setTab('men')}
            className={`hover:text-[#000000] transition-colors ${tab === 'men' ? 'text-[#000000] underline underline-offset-8 decoration-2' : ''}`}
          >
            Men's Sale
          </button>
          <button
            onClick={() => {
              setTab('');
              toast('Final Sale activated — showing deepest clearance markdowns first!');
            }}
            className="hover:text-[#000000] transition-colors"
          >
            Final Sale
          </button>
        </div>
        <p className="text-[11px] uppercase tracking-widest text-neutral-400 font-mono">
          {sorted.length > 0 && <>{sorted.length} pieces on sale</>}
        </p>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {products === null ? (
          <ProductGridSkeleton count={8} />
        ) : sorted.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {/* MEASURED: /sale and /shop both render 101 cards and both settle
                at ~3,737 DOM nodes, yet Lighthouse gave /shop TBT 110ms and
                /sale 840ms — Perf 79 vs 59. The difference is this wrapper:
                every card was a motion.div with its own initial/animate and a
                staggered delay, so 101 framer-motion instances mounted, each
                scheduling work on the main thread. /shop renders plain
                children and is 7x cheaper.
                The stagger also capped at 0.4s, so the last ~90 cards shared
                one delay and did not read as a stagger anyway — it was paying
                for an effect nobody could see.

                h2 matches Shop.jsx: this page ran h1 -> h3 on live because
                ProductCard defaults to h3 and Sale never passed a level. */}
            {sorted.map((p) => (
              <ProductCard key={p._id} product={p} headingLevel="h2" />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-satin/40 px-6 py-20 text-center">
            <Sparkles size={28} className="mx-auto text-sagedeep" />
            <p className="mt-4 font-display text-2xl"><Tx k="emptySale" /></p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ash"><Tx k="emptySaleSub" /></p>
            <Link to="/new" className="btn-primary mt-7 inline-flex"><Tx k="newArrivals" /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
