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
    <div style={{ fontFamily: "'Archivo', system-ui, sans-serif", background: '#FFFFFF', minHeight: '100vh' }}>
      <div className="px-4 md:px-8 lg:px-12">
        <div className="flex items-baseline justify-between pt-8 pb-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] md:text-[32px] font-light text-[#0E0E0E] tracking-tight">Sale</h1>
            <span className="text-[13px] text-[#6E6E6B] tabular-nums">{count} product{count === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 border-b border-[#E3E2DF] pb-3 mb-6 text-[12px] font-medium uppercase tracking-[0.10em]">
          {[{ v: '', l: 'All' }, { v: 'women', l: 'Women' }, { v: 'men', l: 'Men' }].map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`pb-3 -mb-[3px] border-b-2 ${tab === t.v ? 'border-[#0E0E0E] text-[#0E0E0E]' : 'border-transparent text-[#6E6E6B] hover:text-[#0E0E0E]'}`}>
              {t.l}
            </button>
          ))}
        </div>
        {products === null ? <ProductGridSkeleton count={8} /> : count > 0 ? (
          <div className="grid grid-cols-2 gap-px md:gap-[2px] md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Sparkles size={28} className="mx-auto text-[#6E6E6B]" />
            <p className="mt-4 text-[18px] font-medium uppercase tracking-[0.06em]"><Tx k="emptySale" /></p>
            <p className="mt-2 text-[13px] text-[#6E6E6B]"><Tx k="emptySaleSub" /></p>
            <Link to="/new" className="mt-6 inline-flex min-h-[44px] items-center bg-[#0E0E0E] px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-white"><Tx k="newArrivals" /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
