import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgePercent, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Tx from '../components/Tx';

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
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      {/* Offer hero */}
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-obsidian px-6 py-14 text-center text-alabaster md:px-12 md:py-20">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-sage/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-sage/10 blur-3xl" />

        <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="pill mx-auto w-fit bg-sage text-obsidian">
          <BadgePercent size={12} /> {maxDisc > 0 ? <><Tx k="upToOff" /> {maxDisc}%</> : <Tx k="limitedTime" />}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="mt-5 font-display text-5xl leading-none tracking-tight md:text-7xl">
          Season <span className="italic text-sage">Sale</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
          className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-alabaster/70 md:text-base">
          {offer?.enabled && offer.messageEn ? offer.messageEn : 'Gentler prices on the pieces you love — same signature fabrics, same quiet luxury.'}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }}
          className="mt-5 text-[10px] font-bold uppercase tracking-widest2 text-sage">
          <Tx k="whileStock" />
        </motion.p>
      </motion.section>

      {/* Gender tabs + count */}
      <div className="mt-10 flex flex-wrap items-center gap-2.5">
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
                <ProductCard product={p} />
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
