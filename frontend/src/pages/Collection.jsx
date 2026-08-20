import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';

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

      {/* ═══ 1. HEADER — campaign hero when the collection has artwork,
              centered typographic header otherwise ══════════════════════ */}
      {c.image ? (
        <section className="relative h-[220px] w-full overflow-hidden sm:h-[280px] md:h-[360px]">
          <img src={c.image} alt="" aria-hidden="true" loading="eager" fetchpriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center" />
          <div aria-hidden="true" className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.05) 40%, rgba(0,0,0,.38) 100%)' }} />
          <div className="absolute inset-x-0 bottom-7 text-center text-white md:bottom-10">
            <p className="text-[10px] font-normal uppercase tracking-[0.34em] opacity-90 md:text-[11px]">HUSHAE</p>
            <h1 className="mt-2.5 px-4 text-[22px] font-normal uppercase leading-tight tracking-[0.18em] sm:text-[30px] md:text-[38px]">
              {c.name}
            </h1>
          </div>
        </section>
      ) : (
        <header className="mx-auto max-w-[1600px] px-5 pt-10 pb-2 text-center md:px-10 md:pt-14">
          <h1 className="text-[24px] font-normal uppercase tracking-[0.18em] text-[#111111] sm:text-[28px] md:text-[32px]">
            {c.name}
          </h1>
        </header>
      )}

      <div className="bg-[#FBFAF8]">
      {c.description && (
        <p className="mx-auto max-w-xl px-6 pt-7 pb-1 text-center text-[13px] font-light leading-relaxed text-[#6E6A63]">{c.description}</p>
      )}
      <div className="pt-7" />

      {/* ═══ 2. CONTROL BAR — count + sort ═════════════════════════════ */}
      <LuxuryFilterBar
        count={count}
        f={{ sort, setOne: (k, v) => { if (k === 'sort') setSort(v); } }}
      />

      {/* ═══ 3. PRODUCT GRID ═══════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 md:px-12">
        {count === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Boxes size={26} className="mb-3 text-neutral-300" />
            <p className="text-sm text-[#696969]">This collection is empty right now.</p>
            <Link to="/shop" className="btn-outline mt-6">Browse all products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14">
            {visible.map((p) => <CollectionCard key={p._id} product={p} align="center" ground="#F1EFEA" />)}
          </div>
        )}

        <div className="mt-12 pb-16 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition hover:text-[#111111]">
            <ArrowLeft size={13} /> Continue browsing all
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
