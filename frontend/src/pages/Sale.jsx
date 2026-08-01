import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Tx from '../components/Tx';
import CollectionBanner from '../components/collection/CollectionBanner';

const TABS = [
  ['', 'allItems'],
  ['women', 'women'],
  ['men', 'men'],
];

// Dedicated Sale page — biggest discount first, offer hero driven by Settings.
export default function Sale() {
  const { settings } = useApp();
  const [tab, setTab] = useState('');
  const [products, setProducts] = useState(null);

  useEffect(() => {
    setProducts(null);
    const sp = new URLSearchParams({ sale: 'true', limit: '200', sort: 'newest' });
    if (tab) sp.set('gender', tab);
    api(`/products?${sp}`).then((d) => setProducts(d.products)).catch(() => setProducts([]));
  }, [tab]);

  const sorted = useMemo(() => {
    const list = [...(products || [])];
    const disc = (p) => Math.round((1 - p.price / p.compareAtPrice) * 100);
    list.sort((a, b) => disc(b) - disc(a));
    return list;
  }, [products]);

  const maxDisc = sorted.length ? Math.round((1 - sorted[0].price / sorted[0].compareAtPrice) * 100) : 0;
  const offer = settings?.offerBar;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      {/* MEASURED, Phase 2E: this was a 640px black slab on a 390px phone —
          a full-height promotional hero with two blurred sage orbs, a 48px
          headline and four staggered framer-motion entrances. /shop, /women,
          /men, /new and /best all open with the 168px CollectionBanner
          masthead instead. Sale was the one collection page shouting.
          A discount page does not need to be loud to be understood: the grid
          underneath already carries a "% off" chip on every card and the
          strike-through price on all 101.
          Reusing CollectionBanner rather than restyling this block, so there
          is exactly one masthead component in the codebase. The live offer
          message still drives the blurb, so the merchant's Settings copy is
          not lost. */}
      <CollectionBanner
        title="Season Sale"
        blurb={offer?.enabled && offer.messageEn
          ? offer.messageEn
          : 'Quiet luxury, gentler prices — while stock lasts.'}
        eyebrow={maxDisc > 0 ? `HUSHAE — up to ${maxDisc}% off` : 'HUSHAE — Sale'}
        count={sorted.length}
      />

      {/* Gender tabs + count */}
      <div className="flex flex-wrap items-center gap-2.5">
        {TABS.map(([v, k]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`rounded-full border px-5 py-2.5 text-[12px] font-semibold uppercase tracking-widest transition ${tab === v ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/40 hover:text-obsidian'}`}>
            <Tx k={k} />
          </button>
        ))}
        <p className="ml-auto text-xs uppercase tracking-widest text-ash">
          {sorted.length > 0 && <>{sorted.length} <Tx k="piecesOnSale" /></>}
        </p>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {products === null ? (
          <ProductGridSkeleton count={8} />
        ) : sorted.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {sorted.map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                {/* h2, matching Shop.jsx. MEASURED on live: the page ran
                    h1 -> h3 with nothing between, because ProductCard defaults
                    to h3 and Sale never passed a level. Shop passes h2 and has
                    no skip; this page now agrees with it. */}
                <ProductCard product={p} headingLevel="h2" />
              </motion.div>
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
