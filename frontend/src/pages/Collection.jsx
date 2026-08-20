import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';
import { PRODUCT_GRID } from '../lib/productGrid';

/* ============================================================================
 * Public /collection/:slug — same quiet-luxury register as the catalog pages:
 * typographic header (title + count), one hairline control row (sort), grid.
 *
 * The previous version wired a "Filters" button to a sheet that was never
 * rendered (runtime crash) and carried a 45-line facet-pill config that
 * nothing displayed. A curated collection is a small, hand-picked list —
 * sort is enough; full facets live on /shop.
 * ========================================================================== */

export default function Collection() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    setData(null); setErr(false); setSort('popular');
    api(`/collections/${slug}`)
      .then(setData)
      .catch(() => setErr(true));
  }, [slug]);

  const products = data?.products || [];
  const c = data?.collection;

  const visible = useMemo(() => {
    const list = [...products];
    if (sort === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === 'newest') list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
    return list;
  }, [products, sort]);

  if (err) {
    return (
      <div className="container-page pt-[130px] pb-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F0F0F0] text-[#696969]"><Boxes size={22} /></span>
        <h1 className="mt-6 text-3xl font-medium uppercase tracking-[0.04em] text-[#111111]">Collection Not Found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#696969]">The collection you're looking for may have been renamed or removed.</p>
        <Link to="/shop" className="btn-primary mt-8">Browse all products</Link>
      </div>
    );
  }
  if (!data) return (
    <div className="px-5 pt-[130px] pb-10 md:px-10">
      <div className="skeleton mb-6 h-10 w-full max-w-md" />
      <ProductGridSkeleton count={8} />
    </div>
  );

  const count = visible.length;

  return (
    <div className="min-h-screen w-full bg-white pt-[120px] font-sans text-[#111111] antialiased">
      <Seo
        title={c.name}
        description={c.description || `Shop the ${c.name} collection at HUSHAE — curated pieces for every moment.`}
        image={c.image}
        canonical={`/collection/${c.slug}`}
      />

      {/* ═══ 1. CENTERED MAISON HEADER ═════════════════════════════════ */}
      <header className="mx-auto max-w-[1600px] px-5 pt-10 pb-8 text-center md:px-10 md:pt-14 md:pb-10">
        <h1 className="text-[24px] font-medium uppercase tracking-[0.14em] text-[#111111] sm:text-[28px] md:text-[32px]">
          {c.name}
        </h1>
        {c.description && (
          <p className="mx-auto mt-3 max-w-xl text-[13px] font-light leading-relaxed text-neutral-500">{c.description}</p>
        )}
      </header>

      {/* ═══ 2. CONTROL BAR — count + sort ═════════════════════════════ */}
      <LuxuryFilterBar
        count={count}
        f={{ sort, setOne: (k, v) => { if (k === 'sort') setSort(v); } }}
      />

      {/* ═══ 3. PRODUCT GRID ═══════════════════════════════════════════ */}
      <div className="py-8">
        {count === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Boxes size={26} className="mb-3 text-neutral-300" />
            <p className="text-sm text-[#696969]">This collection is empty right now.</p>
            <Link to="/shop" className="btn-outline mt-6">Browse all products</Link>
          </div>
        ) : (
          <div className={PRODUCT_GRID}>
            {visible.map((p) => <CollectionCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="mt-12 pb-16 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition hover:text-[#111111]">
            <ArrowLeft size={13} /> Continue browsing all
          </Link>
        </div>
      </div>
    </div>
  );
}
