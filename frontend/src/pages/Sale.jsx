import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import { isOnSale, salePercent } from '../lib/sale';
import Tx from '../components/Tx';

export default function Sale() {
  const [tab, setTab] = useState('');
  const [products, setProducts] = useState(null);
  useEffect(() => {
    setProducts(null);
    const sp = new URLSearchParams({ sale: 'true', limit: '200', sort: 'newest' });
    if (tab) sp.set('gender', tab);
    api(`/products?${sp}`).then((d) => setProducts(d.products)).catch(() => setProducts([]));
  }, [tab]);
  const sorted = useMemo(() => {
    const list = [...(products || [])].filter(isOnSale);
    list.sort((a, b) => salePercent(b) - salePercent(a));
    return list;
  }, [products]);
  const count = sorted.length;
  return (
    <div style={{ fontFamily: "'Family Klein', 'Helvetica Neue', Helvetica, Arial, sans-serif", background: '#F7F5F1', minHeight: '100vh' }}>
      <div className="px-4 md:px-8 lg:px-12">
        <div className="flex items-baseline justify-between pt-8 pb-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] md:text-[32px] font-light text-obsidian tracking-tight">Sale</h1>
            <span className="text-[13px] text-ash tabular-nums">{count} product{count === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 border-b border-line pb-3 mb-6 text-[12px] font-medium uppercase tracking-[0.10em]">
          {[{ v: '', l: 'All' }, { v: 'women', l: 'Women' }, { v: 'men', l: 'Men' }].map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`pb-3 -mb-[3px] border-b-2 ${tab === t.v ? 'border-obsidian text-obsidian' : 'border-transparent text-ash hover:text-obsidian'}`}>
              {t.l}
            </button>
          ))}
        </div>
        {products === null ? <ProductGridSkeleton count={8} /> : count > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
            {sorted.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Sparkles size={28} className="mx-auto text-ash" />
            <p className="mt-4 text-[18px] font-medium uppercase tracking-[0.06em]"><Tx k="emptySale" /></p>
            <p className="mt-2 text-[13px] text-ash"><Tx k="emptySaleSub" /></p>
            <Link to="/new" className="mt-6 inline-flex min-h-[44px] items-center bg-obsidian px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-white"><Tx k="newArrivals" /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
